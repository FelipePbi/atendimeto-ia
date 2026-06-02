import { env } from "../../config/env.js";
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
    private readonly handoff: HandoffPort | HandoffService
  ) {}

  async handleInboundMessage(message: ChannelInboundMessage): Promise<OrchestratorResult> {
    if (message.isGroup && env.EVOLUTION_IGNORE_GROUPS) {
      return { ok: true, action: "ignored_group" };
    }

    const firstDelivery = await this.idempotency.remember(message);
    if (!firstDelivery) {
      return { ok: true, action: "duplicate" };
    }

    if (message.fromMe) {
      return this.handleFromMeMessage(message);
    }

    return this.processCustomerMessage(message);
  }

  private async processCustomerMessage(message: ChannelInboundMessage): Promise<OrchestratorResult> {
    if (!env.EVOLUTION_BOT_ENABLED) {
      return { ok: true, action: "bot_disabled" };
    }

    if (await this.handoff.isBotPaused(message.customerPhone)) {
      return { ok: true, action: "paused_conversation" };
    }

    if (message.kind !== "text" || !message.text?.trim()) {
      await this.handoff.pauseIndefinitely(
        message.customerPhone,
        `Mensagem ${message.kind} nao suportada pelo bot`,
        "Cliente enviou mensagem fora do suporte textual do MVP."
      );
      await this.provider.sendText({
        to: message.customerPhone,
        text: unsupportedMessageReply,
        quotedMessageId: message.messageId
      });
      return { ok: true, action: "unsupported_handoff" };
    }

    try {
      const reply = await this.automation.handleIncomingText({
        phone: message.customerPhone,
        text: message.text,
        channelMessage: message
      });

      await this.automation.markOutboundMessageSent({
        messageRecordId: reply.messageRecordId,
        providerMessageId: reply.messageRecordId
      });

      const sent = await this.provider.sendText({
        to: message.customerPhone,
        text: reply.text,
        quotedMessageId: message.messageId,
        correlationId: reply.messageRecordId
      });

      await this.automation.markOutboundMessageSent({
        messageRecordId: reply.messageRecordId,
        providerMessageId: sent.messageId ?? reply.messageRecordId,
        rawPayload: sent.raw
      });

      return { ok: true, action: "replied" };
    } catch (error) {
      await this.handoff.pauseIndefinitely(
        message.customerPhone,
        `erro: ${toErrorMessage(error)}`,
        "Falha durante processamento automatico da mensagem."
      );

      await this.provider.sendText({
        to: message.customerPhone,
        text: processingErrorReply,
        quotedMessageId: message.messageId
      });

      return { ok: true, action: "error_handoff" };
    }
  }

  private async handleFromMeMessage(message: ChannelInboundMessage): Promise<OrchestratorResult> {
    if (await this.handoff.isBotOutboundMessage(message.messageId)) {
      return { ok: true, action: "ignored_bot_outbound" };
    }

    const command = message.text?.trim().toLowerCase();
    if (command === "/bot on") {
      await this.handoff.resumeBot(message.customerPhone);
      return { ok: true, action: "bot_resumed" };
    }

    if (command === "/bot off") {
      await this.handoff.pauseIndefinitely(message.customerPhone, "Bot pausado por comando /bot off");
      return { ok: true, action: "bot_paused" };
    }

    if (env.EVOLUTION_ALLOW_SELF_CHAT && isSelfChatMessage(message)) {
      return this.processCustomerMessage(message);
    }

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
