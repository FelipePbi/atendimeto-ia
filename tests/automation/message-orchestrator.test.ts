import { describe, expect, it, vi } from "vitest";
import { env } from "../../src/config/env.js";
import { MessageOrchestrator } from "../../src/modules/automation/MessageOrchestrator.js";
import type { ChannelInboundMessage } from "../../src/modules/channel/domain/ChannelMessage.js";

function baseMessage(overrides: Partial<ChannelInboundMessage> = {}): ChannelInboundMessage {
  return {
    provider: "evolution-go",
    instanceId: "instance-1",
    messageId: "message-1",
    chatId: "5511999999999@s.whatsapp.net",
    customerPhone: "5511999999999",
    customerName: "Maria",
    fromMe: false,
    isGroup: false,
    kind: "text",
    text: "Oi",
    raw: {},
    ...overrides
  };
}

function buildSubject() {
  const automation = {
    handleIncomingText: vi.fn().mockResolvedValue({
      text: "Resposta",
      conversationId: "conversation-1",
      messageRecordId: "outbound-1"
    }),
    markOutboundMessageSent: vi.fn().mockResolvedValue(undefined)
  };
  const provider = {
    sendText: vi.fn().mockResolvedValue({
      provider: "evolution-go",
      messageId: "sent-1",
      raw: { messageId: "sent-1" }
    })
  };
  const idempotency = {
    remember: vi.fn().mockResolvedValue(true)
  };
  const handoff = {
    isBotPaused: vi.fn().mockResolvedValue(false),
    isBotOutboundMessage: vi.fn().mockResolvedValue(false),
    getBotPauseContext: vi.fn().mockResolvedValue(null),
    pauseForHuman: vi.fn().mockResolvedValue(undefined),
    pauseIndefinitely: vi.fn().mockResolvedValue(undefined),
    resumeBot: vi.fn().mockResolvedValue(undefined)
  };

  return {
    automation,
    provider,
    idempotency,
    handoff,
    orchestrator: new MessageOrchestrator(automation, provider, idempotency, handoff)
  };
}

describe("MessageOrchestrator", () => {
  it("ignores group messages before touching idempotency or automation", async () => {
    const subject = buildSubject();

    await expect(subject.orchestrator.handleInboundMessage(baseMessage({ isGroup: true }))).resolves.toMatchObject({
      action: "ignored_group"
    });

    expect(subject.idempotency.remember).not.toHaveBeenCalled();
    expect(subject.automation.handleIncomingText).not.toHaveBeenCalled();
    expect(subject.provider.sendText).not.toHaveBeenCalled();
  });

  it("ignores duplicate deliveries", async () => {
    const subject = buildSubject();
    subject.idempotency.remember.mockResolvedValue(false);

    await expect(subject.orchestrator.handleInboundMessage(baseMessage())).resolves.toMatchObject({
      action: "duplicate"
    });

    expect(subject.automation.handleIncomingText).not.toHaveBeenCalled();
    expect(subject.provider.sendText).not.toHaveBeenCalled();
  });

  it("pauses the bot when a manual fromMe message is detected", async () => {
    const subject = buildSubject();

    await expect(
      subject.orchestrator.handleInboundMessage(baseMessage({ fromMe: true, text: "respondi pelo celular" }))
    ).resolves.toMatchObject({
      action: "bot_paused"
    });

    expect(subject.handoff.pauseForHuman).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: "5511999999999",
        reason: "Atendimento humano detectado pelo WhatsApp",
        pauseUntil: expect.any(Date)
      })
    );
    expect(subject.automation.handleIncomingText).not.toHaveBeenCalled();
  });

  it("processes fromMe self-chat messages when self-chat testing is enabled", async () => {
    const original = env.EVOLUTION_ALLOW_SELF_CHAT;
    env.EVOLUTION_ALLOW_SELF_CHAT = true;

    try {
      const subject = buildSubject();

      await expect(
        subject.orchestrator.handleInboundMessage(
          baseMessage({
            fromMe: true,
            chatId: "5511999999999@lid",
            customerPhone: "5511999999999",
            raw: {
              data: {
                Info: {
                  Chat: "5511999999999@lid",
                  Sender: "5511999999999@lid"
                }
              }
            }
          })
        )
      ).resolves.toMatchObject({
        action: "replied"
      });

      expect(subject.automation.handleIncomingText).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: "5511999999999",
          text: "Oi"
        })
      );
      expect(subject.handoff.pauseForHuman).not.toHaveBeenCalled();
      expect(subject.provider.sendText).toHaveBeenCalled();
    } finally {
      env.EVOLUTION_ALLOW_SELF_CHAT = original;
    }
  });

  it("still pauses manual fromMe messages to other chats when self-chat testing is enabled", async () => {
    const original = env.EVOLUTION_ALLOW_SELF_CHAT;
    env.EVOLUTION_ALLOW_SELF_CHAT = true;

    try {
      const subject = buildSubject();

      await expect(
        subject.orchestrator.handleInboundMessage(
          baseMessage({
            fromMe: true,
            chatId: "5511888888888@s.whatsapp.net",
            customerPhone: "5511888888888",
            raw: {
              data: {
                Info: {
                  Chat: "5511888888888@s.whatsapp.net",
                  Sender: "5511777777777@s.whatsapp.net"
                }
              }
            }
          })
        )
      ).resolves.toMatchObject({
        action: "bot_paused"
      });

      expect(subject.automation.handleIncomingText).not.toHaveBeenCalled();
      expect(subject.provider.sendText).not.toHaveBeenCalled();
    } finally {
      env.EVOLUTION_ALLOW_SELF_CHAT = original;
    }
  });

  it("reactivates the bot with /bot on", async () => {
    const subject = buildSubject();

    await expect(
      subject.orchestrator.handleInboundMessage(baseMessage({ fromMe: true, text: "/bot on" }))
    ).resolves.toMatchObject({
      action: "bot_resumed"
    });

    expect(subject.handoff.resumeBot).toHaveBeenCalledWith("5511999999999");
  });

  it("does not respond while the conversation is paused", async () => {
    const subject = buildSubject();
    subject.handoff.isBotPaused.mockResolvedValue(true);

    await expect(subject.orchestrator.handleInboundMessage(baseMessage())).resolves.toMatchObject({
      action: "paused_conversation"
    });

    expect(subject.automation.handleIncomingText).not.toHaveBeenCalled();
    expect(subject.provider.sendText).not.toHaveBeenCalled();
  });

  it("resumes and responds when a text arrives after an unsupported-message pause", async () => {
    const subject = buildSubject();
    subject.handoff.isBotPaused.mockResolvedValue(true);
    subject.handoff.getBotPauseContext.mockResolvedValue({
      phone: "5511999999999",
      reason: "Mensagem unknown nao suportada pelo bot",
      summary: "Cliente enviou mensagem fora do suporte textual do MVP.",
      pauseUntil: new Date("9999-12-31T23:59:59.000Z"),
      handoffId: "handoff-1"
    });

    await expect(subject.orchestrator.handleInboundMessage(baseMessage({ text: "Quero agendar" }))).resolves.toMatchObject({
      action: "replied"
    });

    expect(subject.handoff.resumeBot).toHaveBeenCalledWith("5511999999999");
    expect(subject.automation.handleIncomingText).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: "5511999999999",
        text: "Quero agendar"
      })
    );
    expect(subject.provider.sendText).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "5511999999999",
        text: "Resposta"
      })
    );
  });

  it("does not pause indefinitely for new unsupported messages", async () => {
    const subject = buildSubject();

    await expect(
      subject.orchestrator.handleInboundMessage(baseMessage({ kind: "unknown", text: undefined }))
    ).resolves.toMatchObject({
      action: "unsupported_message"
    });

    expect(subject.handoff.pauseIndefinitely).not.toHaveBeenCalled();
    expect(subject.automation.handleIncomingText).not.toHaveBeenCalled();
    expect(subject.provider.sendText).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "5511999999999"
      })
    );
  });

  it("sends assistant replies through the Evolution provider", async () => {
    const subject = buildSubject();

    await expect(subject.orchestrator.handleInboundMessage(baseMessage())).resolves.toMatchObject({
      action: "replied"
    });

    expect(subject.automation.handleIncomingText).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: "5511999999999",
        text: "Oi"
      })
    );
    expect(subject.provider.sendText).toHaveBeenCalledWith({
      to: "5511999999999",
      text: "Resposta",
      quotedMessageId: "message-1",
      correlationId: "outbound-1"
    });
    expect(subject.automation.markOutboundMessageSent).toHaveBeenNthCalledWith(1, {
      messageRecordId: "outbound-1",
      providerMessageId: "outbound-1"
    });
    expect(subject.automation.markOutboundMessageSent).toHaveBeenNthCalledWith(2, {
      messageRecordId: "outbound-1",
      providerMessageId: "sent-1",
      rawPayload: { messageId: "sent-1" }
    });
  });
});
