import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { env } from "../../../config/env.js";
import { channelMessageLogContext } from "../../../lib/diagnostic-log.js";
import { toErrorMessage } from "../../../lib/errors.js";
import { AssistantService } from "../../assistant/assistant.service.js";
import { MessageOrchestrator } from "../../automation/MessageOrchestrator.js";
import { EvolutionProvider } from "../adapters/evolution/EvolutionProvider.js";
import { inspectEvolutionInboundPayload, mapEvolutionInbound } from "../adapters/evolution/EvolutionInboundMapper.js";
import { HandoffService } from "../../handoff/HandoffService.js";
import { IdempotencyStore } from "../../idempotency/IdempotencyStore.js";

export async function registerEvolutionWebhookRoutes(app: FastifyInstance, prisma: PrismaClient): Promise<void> {
  const assistant = new AssistantService(prisma, app.log);
  const provider = new EvolutionProvider(app.log);
  const idempotency = new IdempotencyStore(prisma);
  const handoff = new HandoffService(prisma);
  const orchestrator = new MessageOrchestrator(assistant, provider, idempotency, handoff, app.log);

  app.post("/webhooks/evolution", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!isValidWebhookToken(request)) {
      app.log.warn({ requestId: request.id }, "Evolution webhook rejected: invalid token");
      return reply.code(401).send({ ok: false, error: "Unauthorized" });
    }

    const inspection = inspectEvolutionInboundPayload(request.body);
    app.log.info({ requestId: request.id, ...inspection }, "Evolution webhook accepted");

    const message = mapEvolutionInbound(request.body);
    reply.code(200).send({ ok: true, received: true });

    if (!message) {
      app.log.warn(
        {
          requestId: request.id,
          ...inspection
        },
        "Evolution webhook ignored: payload did not map to inbound message"
      );
      return;
    }

    app.log.info(
      {
        requestId: request.id,
        ...channelMessageLogContext(message)
      },
      "Evolution webhook mapped to inbound message"
    );

    void orchestrator
      .handleInboundMessage(message)
      .then((result) => {
        app.log.info(
          {
            requestId: request.id,
            action: result.action,
            ...channelMessageLogContext(message)
          },
          "Evolution webhook processing completed"
        );
      })
      .catch((error) => {
        app.log.error(
          {
            requestId: request.id,
            err: toErrorMessage(error),
            ...channelMessageLogContext(message)
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
