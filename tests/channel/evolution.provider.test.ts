import { afterEach, describe, expect, it, vi } from "vitest";

describe("EvolutionProvider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("sends text messages to the configured Evolution Go endpoint", async () => {
    vi.stubEnv("EVOLUTION_BASE_URL", "http://evolution-go:8080/");
    vi.stubEnv("EVOLUTION_API_KEY", "global-key");
    vi.stubEnv("EVOLUTION_INSTANCE_ID", "instance-1");
    vi.stubEnv("EVOLUTION_INSTANCE_TOKEN", "instance-token");
    vi.stubEnv("EVOLUTION_SEND_TEXT_PATH", "/send/text");
    vi.resetModules();

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ messageId: "message-1", message: "success" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const { EvolutionProvider } = await import(
      "../../src/modules/channel/adapters/evolution/EvolutionProvider.js"
    );

    const result = await new EvolutionProvider().sendText({
      to: "5511999999999",
      text: "resposta",
      quotedMessageId: "inbound-1",
      correlationId: "outbound-1"
    });

    expect(result).toMatchObject({
      provider: "evolution-go",
      messageId: "message-1"
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://evolution-go:8080/send/text",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "content-type": "application/json",
          apikey: "instance-token",
          instanceId: "instance-1"
        })
      })
    );

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({
      number: "5511999999999",
      text: "resposta",
      id: "outbound-1",
      quoted: {
        messageId: "inbound-1"
      }
    });
  });

  it("extracts message ids from nested Evolution Go responses", async () => {
    vi.stubEnv("EVOLUTION_BASE_URL", "http://evolution-go:8080");
    vi.stubEnv("EVOLUTION_API_KEY", "global-key");
    vi.resetModules();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: { Info: { ID: "nested-id" } } }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      )
    );

    const { EvolutionProvider } = await import(
      "../../src/modules/channel/adapters/evolution/EvolutionProvider.js"
    );

    await expect(new EvolutionProvider().sendText({ to: "5511999999999", text: "ok" })).resolves.toMatchObject({
      messageId: "nested-id"
    });
  });

  it("raises an application error when Evolution Go returns a non-2xx response", async () => {
    vi.stubEnv("EVOLUTION_BASE_URL", "http://evolution-go:8080");
    vi.stubEnv("EVOLUTION_API_KEY", "global-key");
    vi.resetModules();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "failed" }), {
          status: 500,
          headers: { "content-type": "application/json" }
        })
      )
    );

    const { EvolutionProvider } = await import(
      "../../src/modules/channel/adapters/evolution/EvolutionProvider.js"
    );

    await expect(new EvolutionProvider().sendText({ to: "5511999999999", text: "ok" })).rejects.toThrow(
      "Evolution Go send failed with HTTP 500"
    );
  });
});
