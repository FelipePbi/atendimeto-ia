import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { registerLegalRoutes } from "../../src/modules/legal/routes.js";

describe("legal routes", () => {
  it.each([
    ["/privacy", "Política de Privacidade"],
    ["/terms", "Termos de Uso"],
    ["/data-deletion", "Exclusão de Dados"]
  ])("serves %s as a public HTML page", async (url, title) => {
    const app = Fastify();
    await registerLegalRoutes(app);

    const response = await app.inject({ method: "GET", url });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html; charset=utf-8");
    expect(response.body).toContain(title);
    expect(response.body).toContain("camililash@outlook.com");

    await app.close();
  });
});
