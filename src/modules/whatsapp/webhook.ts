import crypto from "node:crypto";
import { env } from "../../config/env.js";
import type { ParsedWhatsAppMessage, WhatsAppWebhookBody } from "./types.js";

export function verifyWhatsAppSignature(rawBody: Buffer | undefined, signature: string | undefined): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET || env.WHATSAPP_APP_SECRET;
  if (!appSecret) return true;
  if (!rawBody || !signature?.startsWith("sha256=")) return false;

  const expected = `sha256=${crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
  return timingSafeEqual(expected, signature);
}

export function parseWhatsAppMessages(body: WhatsAppWebhookBody): ParsedWhatsAppMessage[] {
  const parsed: ParsedWhatsAppMessage[] = [];

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const contactsByWaId = new Map((value?.contacts ?? []).map((contact) => [contact.wa_id, contact.profile?.name ?? null]));

      for (const message of value?.messages ?? []) {
        parsed.push({
          id: message.id,
          from: message.from,
          type: message.type,
          text: message.text?.body,
          profileName: contactsByWaId.get(message.from) ?? null,
          raw: message
        });
      }
    }
  }

  return parsed;
}

function timingSafeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}
