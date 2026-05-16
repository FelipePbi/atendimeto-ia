import { env, requireWhatsAppEnv } from "../../config/env.js";
import { AppError } from "../../lib/errors.js";

export class WhatsAppClient {
  async sendText(to: string, body: string): Promise<void> {
    requireWhatsAppEnv();

    const url = `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: {
          preview_url: false,
          body
        }
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new AppError(`WhatsApp send failed with HTTP ${response.status}`, {
        statusCode: response.status,
        code: "WHATSAPP_SEND_FAILED",
        details: text
      });
    }
  }
}
