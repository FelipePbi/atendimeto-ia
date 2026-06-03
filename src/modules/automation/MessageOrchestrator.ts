import { env } from "../../config/env.js";
import {
  channelMessageLogContext,
  type DiagnosticLogger,
  noopDiagnosticLogger
} from "../../lib/diagnostic-log.js";
import { toErrorMessage } from "../../lib/errors.js";
import type { AssistantReply, AssistantService } from "../assistant/assistant.service.js";
import type { ChannelInboundMessage } from "../channel/domain/ChannelMessage.js";
import type { WhatsAppProvider } from "../channel/ports/WhatsAppProvider.js";
import type { HandoffService } from "../handoff/HandoffService.js";
import type { IdempotencyStore } from "../idempotency/IdempotencyStore.js";

const unsupportedMessageReply =
  "Recebi sua mensagem, mas vou pedir para a profissional continuar esse atendimento por aqui.";
const processingErrorReply =
  "Tive um problema para consultar o sistema agora. Vou chamar a profissional para continuar seu atendimento.";

export interface OrchestratorResult {
  ok: true;
  action:
    | "ignored_group"
    | "duplicate"
    | "ignored_bot_outbound"
    | "bot_resumed"
    | "bot_paused"
    | "bot_disabled"
    | "paused_conversation"
    | "unsupported_handoff"
    | "replied"
    | "error_handoff";
}

export interface AutomationPort {
  handleIncomingText(input: {
    phone: string;
    text: string;
    channelMessage: ChannelInboundMessage;
  }): Promise<AssistantReply>;
  markOutboundMessageSent(input: {
    messageRecordId: string;
    providerMessageId?: string;
    rawPayload?: unknown;
  }): Promise<void>;
}

export interface HandoffPort {
  isBotPaused(phone: string): Promise<boolean>;
  isBotOutboundMessage(messageId: string): Promise<boolean>;
  pauseForHuman(input: {
    phone: string;
    reason: string;
    summary?: string;
    pauseUntil?: Date | null;
  }): Promise<void>;
  pauseIndefinitely(phone: string, reason: string, summary?: string): Promise<void>;
  resumeBot(phone: string): Promise<void>;
}

export interface IdempotencyPort {
  remember(message: ChannelInboundMessage): Promise<boolean>;
}

export class MessageOrchestrator {
  constructor(
    private readonly automation: AutomationPort | AssistantService,
    private readonly provider: WhatsAppProvider,
    private readonly idempotency: IdempotencyPort | IdempotencyStore,
    private readonly handoff: HandoffPort | HandoffService,
    private readonly logger: DiagnosticLogger = noopDiagnosticLogger
  ) {}

  async handleInboundMessage(message: ChannelInboundMessage): Promise<OrchestratorResult> {
    this.logger.info(channelMessageLogContext(message), "Orchestrator started inbound message");

    if (message.isGroup && env.EVOLUTION_IGNORE_GROUPS) {
      this.logger.info(channelMessageLogContext(message), "Orchestrator ignored group message");
      return { ok: true, action: "ignored_group" };
    }

    this.logger.info(channelMessageLogContext(message), "Orchestrator checking idempotency");
    const firstDelivery = await this.idempotency.remember(message);
    this.logger.info(
      {
        ...channelMessageLogContext(message),
        firstDelivery
      },
      "Orchestrator idempotency result"
    );
    if (!firstDelivery) {
      return { ok: true, action: "duplicate" };
    }

    if (message.fromMe) {
      this.logger.info(channelMessageLogContext(message), "Orchestrator routing fromMe message");
      return this.handleFromMeMessage(message);
    }

    return this.processCustomerMessage(message);
  }

  private async processCustomerMessage(message: ChannelInboundMessage): Promise<OrchestratorResult> {
    this.logger.info(
      {
        ...channelMessageLogContext(message),
        botEnabled: env.EVOLUTION_BOT_ENABLED
      },
      "Orchestrator processing customer message"
    );

    if (!env.EVOLUTION_BOT_ENABLED) {
      this.logger.warn(channelMessageLogContext(message), "Orchestrator stopped: bot disabled");
      return { ok: true, action: "bot_disabled" };
    }

    this.logger.info(channelMessageLogContext(message), "Orchestrator checking handoff pause");
    const botPaused = await this.handoff.isBotPaused(message.customerPhone);
    this.logger.info(
      {
        ...channelMessageLogContext(message),
        botPaused
      },
      "Orchestrator handoff pause result"
    );
    if (botPaused) {
      return { ok: true, action: "paused_conversation" };
    }

    if (message.kind !== "text" || !message.text?.trim()) {
      this.logger.warn(channelMessageLogContext(message), "Orchestrator unsupported message: creating handoff");
      await this.handoff.pauseIndefinitely(
        message.customerPhone,
        `Mensagem ${message.kind} nao suportada pelo bot`,
        "Cliente enviou mensagem fora do suporte textual do MVP."
      );
      this.logger.info(channelMessageLogContext(message), "Orchestrator sending unsupported-message reply");
      await this.provider.sendText({
        to: message.customerPhone,
        text: unsupportedMessageReply,
        quotedMessageId: message.messageId
      });
      this.logger.info(channelMessageLogContext(message), "Orchestrator unsupported-message reply sent");
      return { ok: true, action: "unsupported_handoff" };
    }

    try {
      this.logger.info(channelMessageLogContext(message), "Orchestrator calling assistant");
      const reply = await this.automation.handleIncomingText({
        phone: message.customerPhone,
        text: message.text,
        channelMessage: message
      });
      this.logger.info(
        {
          ...channelMessageLogContext(message),
          conversationId: reply.conversationId,
          messageRecordId: reply.messageRecordId,
          replyLength: reply.text.length
        },
        "Orchestrator assistant returned reply"
      );

      this.logger.info(
        {
          ...channelMessageLogContext(message),
          messageRecordId: reply.messageRecordId
        },
        "Orchestrator marking outbound message as prepared"
      );
      await this.automation.markOutboundMessageSent({
        messageRecordId: reply.messageRecordId,
        providerMessageId: reply.messageRecordId
      });

      this.logger.info(
        {
          ...channelMessageLogContext(message),
          messageRecordId: reply.messageRecordId
        },
        "Orchestrator sending assistant reply through provider"
      );
      const sent = await this.provider.sendText({
        to: message.customerPhone,
        text: reply.text,
        quotedMessageId: message.messageId,
        correlationId: reply.messageRecordId
      });
      this.logger.info(
        {
          ...channelMessageLogContext(message),
          providerMessageId: sent.messageId,
          messageRecordId: reply.messageRecordId
        },
        "Orchestrator provider sent assistant reply"
      );

      await this.automation.markOutboundMessageSent({
        messageRecordId: reply.messageRecordId,
        providerMessageId: sent.messageId ?? reply.messageRecordId,
        rawPayload: sent.raw
      });
      this.logger.info(
        {
          ...channelMessageLogContext(message),
          providerMessageId: sent.messageId,
          messageRecordId: reply.messageRecordId
        },
        "Orchestrator marked outbound message as sent"
      );

      return { ok: true, action: "replied" };
    } catch (error) {
      this.logger.error(
        {
          ...channelMessageLogContext(message),
          err: toErrorMessage(error)
        },
        "Orchestrator failed while processing customer message"
      );
      await this.handoff.pauseIndefinitely(
        message.customerPhone,
        `erro: ${toErrorMessage(error)}`,
        "Falha durante processamento automatico da mensagem."
      );

      this.logger.info(channelMessageLogContext(message), "Orchestrator sending processing-error reply");
      await this.provider.sendText({
        to: message.customerPhone,
        text: processingErrorReply,
        quotedMessageId: message.messageId
      });
      this.logger.info(channelMessageLogContext(message), "Orchestrator processing-error reply sent");

      return { ok: true, action: "error_handoff" };
    }
  }

  private async handleFromMeMessage(message: ChannelInboundMessage): Promise<OrchestratorResult> {
    this.logger.info(channelMessageLogContext(message), "Orchestrator checking fromMe message ownership");
    const botOutboundMessage = await this.handoff.isBotOutboundMessage(message.messageId);
    this.logger.info(
      {
        ...channelMessageLogContext(message),
        botOutboundMessage
      },
      "Orchestrator fromMe ownership result"
    );
    if (botOutboundMessage) {
      return { ok: true, action: "ignored_bot_outbound" };
    }

    const command = message.text?.trim().toLowerCase();
    if (command === "/bot on") {
      this.logger.info(channelMessageLogContext(message), "Orchestrator received /bot on command");
      await this.handoff.resumeBot(message.customerPhone);
      return { ok: true, action: "bot_resumed" };
    }

    if (command === "/bot off") {
      this.logger.info(channelMessageLogContext(message), "Orchestrator received /bot off command");
      await this.handoff.pauseIndefinitely(message.customerPhone, "Bot pausado por comando /bot off");
      return { ok: true, action: "bot_paused" };
    }

    if (env.EVOLUTION_ALLOW_SELF_CHAT && isSelfChatMessage(message)) {
      this.logger.info(channelMessageLogContext(message), "Orchestrator treating self-chat message as customer input");
      return this.processCustomerMessage(message);
    }

    this.logger.info(channelMessageLogContext(message), "Orchestrator pausing bot because human message was detected");
    const pauseUntil = new Date(Date.now() + env.HUMAN_HANDOFF_PAUSE_MINUTES * 60_000);
    await this.handoff.pauseForHuman({
      phone: message.customerPhone,
      reason: "Atendimento humano detectado pelo WhatsApp",
      summary: "Mensagem fromMe=true recebida do Evolution Go.",
      pauseUntil
    });
    return { ok: true, action: "bot_paused" };
  }
}

function isSelfChatMessage(message: ChannelInboundMessage): boolean {
  const info = readEvolutionInfo(message.raw);
  const chat = normalizeJid(info?.Chat) || normalizeJid(message.chatId);
  const sender = normalizeJid(info?.Sender);
  const senderAlt = normalizeJid(info?.SenderAlt);

  return Boolean(chat && (chat === sender || chat === senderAlt));
}

function readEvolutionInfo(raw: unknown): Record<string, unknown> | undefined {
  if (!isRecord(raw)) return undefined;
  const data = raw.data;
  if (!isRecord(data)) return undefined;
  return isRecord(data.Info) ? data.Info : undefined;
}

function normalizeJid(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  return normalized || undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
