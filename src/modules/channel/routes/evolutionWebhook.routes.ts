import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { env } from "../../../config/env.js";
import { toErrorMessage } from "../../../lib/errors.js";
import { AssistantService } from "../../assistant/assistant.service.js";
import { MessageOrchestrator } from "../../automation/MessageOrchestrator.js";
import { EvolutionProvider } from "../adapters/evolution/EvolutionProvider.js";
import { mapEvolutionInbound } from "../adapters/evolution/EvolutionInboundMapper.js";
import { HandoffService } from "../../handoff/HandoffService.js";
import { IdempotencyStore } from "../../idempotency/IdempotencyStore.js";

export async function registerEvolutionWebhookRoutes(app: FastifyInstance, prisma: PrismaClient): Promise<void> {
  const assistant = new AssistantService(prisma);
  const provider = new EvolutionProvider();
  const idempotency = new IdempotencyStore(prisma);
  const handoff = new HandoffService(prisma);
  const orchestrator = new MessageOrchestrator(assistant, provider, idempotency, handoff);

  app.post("/webhooks/evolution", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!isValidWebhookToken(request)) {
      return reply.code(401).send({ ok: false, error: "Unauthorized" });
    }

    const message = mapEvolutionInbound(request.body);
    reply.code(200).send({ ok: true, received: true });

    if (!message) return;

    console.log("Received Evolution webhook:", message);

    void orchestrator.handleInboundMessage(message).catch((error) => {
      app.log.error(
        {
          err: toErrorMessage(error),
          provider: message.provider,
          instanceId: message.instanceId,
          messageId: message.messageId,
          phone: message.customerPhone
        },
        "Failed to process Evolution webhook"
      );
    });
  });
}

function isValidWebhookToken(request: FastifyRequest): boolean {
  if (!env.EVOLUTION_WEBHOOK_TOKEN) return false;

  const query = request.query as Record<string, string | undefined>;
  return query.token === env.EVOLUTION_WEBHOOK_TOKEN;
}
