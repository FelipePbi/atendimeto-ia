import crypto from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { parseWhatsAppMessages, verifyWhatsAppSignature } from "../../src/modules/whatsapp/webhook.js";

describe("WhatsApp webhook helpers", () => {
  afterEach(() => {
    delete process.env.WHATSAPP_APP_SECRET;
  });

  it("extracts text messages and profile names", () => {
    const messages = parseWhatsAppMessages({
      entry: [
        {
          changes: [
            {
              value: {
                contacts: [{ wa_id: "5599999999999", profile: { name: "Maria" } }],
                messages: [
                  {
                    from: "5599999999999",
                    id: "wamid.1",
                    type: "text",
                    text: { body: "Oi" }
                  }
                ]
              }
            }
          ]
        }
      ]
    });

    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      id: "wamid.1",
      from: "5599999999999",
      text: "Oi",
      profileName: "Maria"
    });
  });

  it("accepts valid Meta signature when app secret is configured", async () => {
    process.env.WHATSAPP_APP_SECRET = "secret";
    const body = Buffer.from(JSON.stringify({ ok: true }));
    const signature = `sha256=${crypto.createHmac("sha256", "secret").update(body).digest("hex")}`;
    expect(verifyWhatsAppSignature(body, signature)).toBe(true);
  });

  it("rejects invalid Meta signature when app secret is configured", async () => {
    process.env.WHATSAPP_APP_SECRET = "secret";
    expect(verifyWhatsAppSignature(Buffer.from("{}"), "sha256=invalid")).toBe(false);
  });

  it("allows signatures when app secret is not configured", () => {
    delete process.env.WHATSAPP_APP_SECRET;
    expect(verifyWhatsAppSignature(Buffer.from("{}"), undefined)).toBe(true);
  });
});
