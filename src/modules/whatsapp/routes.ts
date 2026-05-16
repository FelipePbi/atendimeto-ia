import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { env } from "../../config/env.js";
import { toErrorMessage } from "../../lib/errors.js";
import { AssistantService } from "../assistant/assistant.service.js";
import { WhatsAppClient } from "./client.js";
import type { WhatsAppWebhookBody } from "./types.js";
import { parseWhatsAppMessages, verifyWhatsAppSignature } from "./webhook.js";

type RawBodyRequest = FastifyRequest & { rawBody?: Buffer };

export async function registerWhatsAppRoutes(app: FastifyInstance, prisma: PrismaClient): Promise<void> {
  const assistant = new AssistantService(prisma);
  const whatsapp = new WhatsAppClient();

  app.get("/webhooks/whatsapp", async (request, reply) => {
    const query = request.query as Record<string, string | undefined>;
    const mode = query["hub.mode"];
    const token = query["hub.verify_token"];
    const challenge = query["hub.challenge"];

    if (mode === "subscribe" && token === env.WHATSAPP_VERIFY_TOKEN && challenge) {
      return reply.type("text/plain").send(challenge);
    }

    return reply.code(403).send({ ok: false, error: "Invalid WhatsApp webhook verification token." });
  });

  app.post("/webhooks/whatsapp", async (request: RawBodyRequest, reply: FastifyReply) => {
    const signature = request.headers["x-hub-signature-256"];
    if (!verifyWhatsAppSignature(request.rawBody, Array.isArray(signature) ? signature[0] : signature)) {
      return reply.code(401).send({ ok: false, error: "Invalid WhatsApp signature." });
    }

    const body = request.body as WhatsAppWebhookBody;
    const messages = parseWhatsAppMessages(body);

    for (const message of messages) {
      const existing = await prisma.processedEvent.findUnique({
        where: { whatsappMessageId: message.id }
      });
      if (existing) continue;

      await prisma.processedEvent.create({
        data: {
          whatsappMessageId: message.id,
          rawPayload: message.raw as object
        }
      });

      if (message.type !== "text" || !message.text) {
        await createUnsupportedMessageHandoff(prisma, message.from, message.type);
        await whatsapp.sendText(message.from, "Recebi sua mensagem, mas vou pedir para a profissional continuar esse atendimento por aqui.");
        continue;
      }

      try {
        const responseText = await assistant.handleIncomingText({
          phone: message.from,
          text: message.text,
          whatsappMessageId: message.id,
          customerName: message.profileName,
          rawPayload: message.raw
        });
        await whatsapp.sendText(message.from, responseText);
      } catch (error) {
        app.log.error({ err: toErrorMessage(error), phone: message.from }, "Failed to handle WhatsApp message");
        await createUnsupportedMessageHandoff(prisma, message.from, `erro: ${toErrorMessage(error)}`);
        await whatsapp.sendText(message.from, "Tive um problema para consultar o sistema agora. Vou chamar a profissional para continuar seu atendimento.");
      }
    }

    return reply.send({ ok: true });
  });
}

async function createUnsupportedMessageHandoff(prisma: PrismaClient, phone: string, reason: string): Promise<void> {
  const conversation = await prisma.conversation.upsert({
    where: { whatsappPhone: phone },
    update: { humanHandoff: true, status: "HUMAN_HANDOFF" },
    create: {
      whatsappPhone: phone,
      humanHandoff: true,
      status: "HUMAN_HANDOFF",
      state: {}
    }
  });

  await prisma.handoff.create({
    data: {
      conversationId: conversation.id,
      phone,
      reason,
      status: "OPEN"
    }
  });
}
