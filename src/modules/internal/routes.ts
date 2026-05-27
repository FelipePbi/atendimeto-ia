import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { env } from "../../config/env.js";
import { BOT_OFF_PAUSE_UNTIL } from "../handoff/HandoffService.js";

const createHandoffSchema = z.object({
  phone: z.string().min(6),
  reason: z.string().min(3),
  summary: z.string().optional()
});

export async function registerInternalRoutes(app: FastifyInstance, prisma: PrismaClient): Promise<void> {
  app.addHook("preHandler", async (request, reply) => {
    if (!request.url.startsWith("/internal/")) return;
    if (!isAuthorized(request)) {
      return reply.code(401).send({ ok: false, error: "Unauthorized" });
    }
  });

  app.get("/internal/handoffs", async () => {
    const handoffs = await prisma.handoff.findMany({
      where: { status: "OPEN" },
      orderBy: { createdAt: "desc" },
      take: 100
    });
    return { ok: true, handoffs };
  });

  app.post("/internal/handoffs", async (request, reply) => {
    const parsed = createHandoffSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ ok: false, error: parsed.error.flatten() });
    }

    const conversation = await prisma.conversation.upsert({
      where: { whatsappPhone: parsed.data.phone },
      update: {
        humanHandoff: true,
        status: "HUMAN_HANDOFF",
        handoffPausedUntil: BOT_OFF_PAUSE_UNTIL
      },
      create: {
        whatsappPhone: parsed.data.phone,
        humanHandoff: true,
        status: "HUMAN_HANDOFF",
        handoffPausedUntil: BOT_OFF_PAUSE_UNTIL,
        state: {}
      }
    });

    const handoff = await prisma.handoff.create({
      data: {
        conversationId: conversation.id,
        phone: parsed.data.phone,
        reason: parsed.data.reason,
        summary: parsed.data.summary ?? null,
        status: "OPEN"
      }
    });

    return reply.code(201).send({ ok: true, handoff });
  });

  app.patch("/internal/handoffs/:id/resolve", async (request, reply) => {
    const params = request.params as { id: string };
    const handoff = await prisma.handoff.update({
      where: { id: params.id },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date()
      }
    });

    if (handoff.conversationId) {
      await prisma.conversation.update({
        where: { id: handoff.conversationId },
        data: {
          humanHandoff: false,
          status: "ACTIVE",
          handoffPausedUntil: null
        }
      });
    }

    return reply.send({ ok: true, handoff });
  });
}

function isAuthorized(request: FastifyRequest): boolean {
  if (!env.ADMIN_API_TOKEN) return false;
  const authorization = request.headers.authorization;
  const adminToken = request.headers["x-admin-token"];

  if (authorization === `Bearer ${env.ADMIN_API_TOKEN}`) return true;
  if (adminToken === env.ADMIN_API_TOKEN) return true;
  return false;
}
