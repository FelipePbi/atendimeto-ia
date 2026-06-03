import type { PrismaClient } from "@prisma/client";

export const BOT_OFF_PAUSE_UNTIL = new Date("9999-12-31T23:59:59.000Z");

export interface HandoffPauseInput {
  phone: string;
  reason: string;
  summary?: string;
  pauseUntil?: Date | null;
}

export interface BotPauseContext {
  phone: string;
  reason?: string;
  summary?: string | null;
  pauseUntil?: Date | null;
  handoffId?: string;
}

export class HandoffService {
  constructor(private readonly prisma: PrismaClient) {}

  async isBotPaused(phone: string, now = new Date()): Promise<boolean> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { whatsappPhone: phone }
    });

    if (!conversation?.humanHandoff) return false;
    if (!conversation.handoffPausedUntil) return true;
    if (conversation.handoffPausedUntil > now) return true;

    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        humanHandoff: false,
        status: "ACTIVE",
        handoffPausedUntil: null
      }
    });
    return false;
  }

  async getBotPauseContext(phone: string): Promise<BotPauseContext | null> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { whatsappPhone: phone },
      include: {
        handoffs: {
          where: { status: "OPEN" },
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    });

    if (!conversation?.humanHandoff) return null;

    const handoff = conversation.handoffs[0];
    return {
      phone,
      reason: handoff?.reason,
      summary: handoff?.summary,
      pauseUntil: conversation.handoffPausedUntil,
      handoffId: handoff?.id
    };
  }

  async isBotOutboundMessage(messageId: string): Promise<boolean> {
    const message = await this.prisma.message.findUnique({
      where: { whatsappMessageId: messageId }
    });

    return message?.direction === "OUTBOUND";
  }

  async pauseForHuman(input: HandoffPauseInput): Promise<void> {
    const conversation = await this.prisma.conversation.upsert({
      where: { whatsappPhone: input.phone },
      update: {
        humanHandoff: true,
        status: "HUMAN_HANDOFF",
        handoffPausedUntil: input.pauseUntil ?? null
      },
      create: {
        whatsappPhone: input.phone,
        humanHandoff: true,
        status: "HUMAN_HANDOFF",
        handoffPausedUntil: input.pauseUntil ?? null,
        state: {}
      }
    });

    await this.prisma.handoff.create({
      data: {
        conversationId: conversation.id,
        phone: input.phone,
        reason: input.reason,
        summary: input.summary ?? null,
        status: "OPEN"
      }
    });
  }

  async pauseIndefinitely(phone: string, reason: string, summary?: string): Promise<void> {
    await this.pauseForHuman({
      phone,
      reason,
      summary,
      pauseUntil: BOT_OFF_PAUSE_UNTIL
    });
  }

  async resumeBot(phone: string): Promise<void> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { whatsappPhone: phone }
    });

    if (!conversation) return;

    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        humanHandoff: false,
        status: "ACTIVE",
        handoffPausedUntil: null
      }
    });
  }
}
