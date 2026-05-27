import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("Evolution webhook route", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("rejects invalid webhook tokens", async () => {
    vi.stubEnv("EVOLUTION_WEBHOOK_TOKEN", "secret");
    vi.resetModules();

    const { registerEvolutionWebhookRoutes } = await import(
      "../../src/modules/channel/routes/evolutionWebhook.routes.js"
    );
    const app = Fastify();
    await registerEvolutionWebhookRoutes(app, {} as never);

    const response = await app.inject({
      method: "POST",
      url: "/webhooks/evolution?token=wrong",
      payload: {}
    });

    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it("accepts valid webhook tokens and returns before processing invalid payloads", async () => {
    vi.stubEnv("EVOLUTION_WEBHOOK_TOKEN", "secret");
    vi.resetModules();

    const { registerEvolutionWebhookRoutes } = await import(
      "../../src/modules/channel/routes/evolutionWebhook.routes.js"
    );
    const app = Fastify();
    await registerEvolutionWebhookRoutes(app, {} as never);

    const response = await app.inject({
      method: "POST",
      url: "/webhooks/evolution?token=secret",
      payload: {}
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ ok: true, received: true });
    await app.close();
  });
});
