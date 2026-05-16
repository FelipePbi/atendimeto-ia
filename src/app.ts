import cors from "@fastify/cors";
import Fastify from "fastify";
import { prisma } from "./db/prisma.js";
import { AppError, toErrorMessage } from "./lib/errors.js";
import { redactSensitive } from "./lib/redact.js";
import { registerInternalRoutes } from "./modules/internal/routes.js";
import { registerLegalRoutes } from "./modules/legal/routes.js";
import { registerWhatsAppRoutes } from "./modules/whatsapp/routes.js";

export async function buildApp() {
  const app = Fastify({
    logger: {
      redact: ["req.headers.authorization", "req.headers.cookie", "body.password", "body.token"]
    }
  });

  app.addContentTypeParser("application/json", { parseAs: "buffer" }, (request, body, done) => {
    try {
      const rawBody = Buffer.isBuffer(body) ? body : Buffer.from(String(body));
      (request as typeof request & { rawBody?: Buffer }).rawBody = rawBody;
      const text = rawBody.toString("utf8");
      done(null, text.length > 0 ? JSON.parse(text) : {});
    } catch (error) {
      done(error as Error);
    }
  });

  await app.register(cors, { origin: false });

  app.get("/health", async () => ({ ok: true }));
  await registerLegalRoutes(app);
  await registerWhatsAppRoutes(app, prisma);
  await registerInternalRoutes(app, prisma);

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({
        ok: false,
        error: error.message,
        code: error.code,
        details: redactSensitive(error.details)
      });
    }

    app.log.error({ err: toErrorMessage(error) }, "Unhandled request error");
    return reply.code(500).send({
      ok: false,
      error: "Internal server error"
    });
  });

  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });

  return app;
}
