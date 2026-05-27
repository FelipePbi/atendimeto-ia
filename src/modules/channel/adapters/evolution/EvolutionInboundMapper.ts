import { normalizePhone } from "../../../../lib/phone.js";
import type { ChannelInboundMessage, ChannelMessageKind } from "../../domain/ChannelMessage.js";
import type { EvolutionWebhookPayload } from "./EvolutionTypes.js";

const messageEvents = new Set(["Message", "SendMessage"]);

export function mapEvolutionInbound(payload: unknown): ChannelInboundMessage | null {
  if (!isRecord(payload)) return null;

  const event = stringValue(payload.event);
  if (!event || !messageEvents.has(event)) return null;

  const data = recordValue(payload.data);
  const info = recordValue(data?.Info);
  const message = recordValue(data?.Message);
  if (!info || !message) return null;

  const instanceId = stringValue(payload.instanceId);
  const messageId = stringValue(info.ID);
  const chatId = stringValue(info.Chat);
  if (!instanceId || !messageId || !chatId) return null;

  const mediaType = stringValue(info.MediaType);
  const infoType = stringValue(info.Type);
  const fromMe = booleanValue(info.IsFromMe);
  const kind = resolveKind(infoType, mediaType);
  const text = extractText(message);
  const customerJid = fromMe ? chatId : stringValue(info.Sender) || chatId;

  return {
    provider: "evolution-go",
    instanceId,
    messageId,
    chatId,
    customerPhone: normalizePhone(customerJid),
    customerName: stringValue(info.PushName),
    fromMe,
    isGroup: booleanValue(info.IsGroup) || chatId.endsWith("@g.us"),
    kind,
    text,
    timestamp: stringValue(info.Timestamp),
    raw: payload
  };
}

function resolveKind(infoType: string | undefined, mediaType: string | undefined): ChannelMessageKind {
  const normalizedMediaType = mediaType?.toLowerCase();
  if (normalizedMediaType === "audio") return "audio";
  if (normalizedMediaType === "image") return "image";
  if (normalizedMediaType === "document") return "document";

  const normalizedInfoType = infoType?.toLowerCase();
  if (!normalizedInfoType || normalizedInfoType === "text" || normalizedInfoType.includes("text")) return "text";
  if (normalizedInfoType.includes("audio")) return "audio";
  if (normalizedInfoType.includes("image")) return "image";
  if (normalizedInfoType.includes("document")) return "document";

  return "unknown";
}

function extractText(message: Record<string, unknown>): string | undefined {
  const conversation = stringValue(message.conversation);
  if (conversation) return conversation;

  const extendedTextMessage = recordValue(message.extendedTextMessage);
  const extendedText = stringValue(extendedTextMessage?.text);
  if (extendedText) return extendedText;

  const imageMessage = recordValue(message.imageMessage);
  const imageCaption = stringValue(imageMessage?.caption);
  if (imageCaption) return imageCaption;

  const documentMessage = recordValue(message.documentMessage);
  const documentCaption = stringValue(documentMessage?.caption);
  if (documentCaption) return documentCaption;

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function recordValue(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function booleanValue(value: unknown): boolean {
  return value === true;
}
