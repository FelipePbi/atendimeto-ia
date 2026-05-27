import { describe, expect, it } from "vitest";
import { mapEvolutionInbound } from "../../src/modules/channel/adapters/evolution/EvolutionInboundMapper.js";

describe("EvolutionInboundMapper", () => {
  it("normalizes a text message into the internal channel contract", () => {
    const message = mapEvolutionInbound({
      event: "Message",
      instanceId: "instance-1",
      data: {
        Info: {
          Chat: "5511999999999@s.whatsapp.net",
          Sender: "5511999999999@s.whatsapp.net",
          IsFromMe: false,
          IsGroup: false,
          ID: "3EB0C05FF2D3A0068B2A2D",
          Type: "text",
          PushName: "Maria",
          Timestamp: "2026-05-24T12:00:00-03:00",
          MediaType: ""
        },
        Message: {
          conversation: "quanto custa manicure?"
        }
      }
    });

    expect(message).toMatchObject({
      provider: "evolution-go",
      instanceId: "instance-1",
      messageId: "3EB0C05FF2D3A0068B2A2D",
      chatId: "5511999999999@s.whatsapp.net",
      customerPhone: "5511999999999",
      customerName: "Maria",
      fromMe: false,
      isGroup: false,
      kind: "text",
      text: "quanto custa manicure?",
      timestamp: "2026-05-24T12:00:00-03:00"
    });
  });

  it.each([
    ["audio", "audio"],
    ["image", "image"],
    ["document", "document"],
    ["video", "unknown"]
  ] as const)("classifies media type %s as %s", (mediaType, kind) => {
    const message = mapEvolutionInbound({
      event: "Message",
      instanceId: "instance-1",
      data: {
        Info: {
          Chat: "5511999999999@s.whatsapp.net",
          Sender: "5511999999999@s.whatsapp.net",
          IsFromMe: false,
          IsGroup: false,
          ID: `message-${mediaType}`,
          Type: "media",
          MediaType: mediaType
        },
        Message: {}
      }
    });

    expect(message?.kind).toBe(kind);
  });

  it("uses chat id as the customer phone for fromMe events", () => {
    const message = mapEvolutionInbound({
      event: "SendMessage",
      instanceId: "instance-1",
      data: {
        Info: {
          Chat: "5511888888888@s.whatsapp.net",
          Sender: "5511777777777@s.whatsapp.net",
          IsFromMe: true,
          IsGroup: false,
          ID: "sent-1",
          Type: "text"
        },
        Message: {
          conversation: "mensagem manual"
        }
      }
    });

    expect(message?.customerPhone).toBe("5511888888888");
    expect(message?.fromMe).toBe(true);
  });

  it("returns null for invalid or irrelevant payloads", () => {
    expect(mapEvolutionInbound({})).toBeNull();
    expect(mapEvolutionInbound({ event: "QRCode" })).toBeNull();
    expect(mapEvolutionInbound(null)).toBeNull();
  });
});
