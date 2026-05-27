import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import type { ChannelInboundMessage } from "../channel/domain/ChannelMessage.js";

export class IdempotencyStore {
  constructor(private readonly prisma: PrismaClient) {}

  async remember(message: ChannelInboundMessage): Promise<boolean> {
    try {
      await this.prisma.processedEvent.create({
        data: {
          eventKey: buildEventKey(message),
          provider: message.provider,
          instanceId: message.instanceId,
          messageId: message.messageId,
          rawPayload: message.raw as object
        }
      });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return false;
      }
      throw error;
    }
  }
}

export function buildEventKey(message: Pick<ChannelInboundMessage, "provider" | "instanceId" | "messageId">): string {
  return `${message.provider}:${message.instanceId}:${message.messageId}`;
}
