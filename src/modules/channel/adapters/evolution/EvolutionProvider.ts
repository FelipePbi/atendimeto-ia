import { env, requireEvolutionEnv } from "../../../../config/env.js";
import { AppError } from "../../../../lib/errors.js";
import type { SendTextInput, SendTextResult, WhatsAppProvider } from "../../ports/WhatsAppProvider.js";
import type { EvolutionSendTextResponse } from "./EvolutionTypes.js";

export class EvolutionProvider implements WhatsAppProvider {
  async sendText(input: SendTextInput): Promise<SendTextResult> {
    requireEvolutionEnv();

    const response = await fetch(joinUrl(env.EVOLUTION_BASE_URL, env.EVOLUTION_SEND_TEXT_PATH), {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify(buildSendTextBody(input))
    });

    const raw = await parseResponse(response);
    if (!response.ok) {
      throw new AppError(`Evolution Go send failed with HTTP ${response.status}`, {
        statusCode: response.status,
        code: "EVOLUTION_SEND_FAILED",
        details: raw
      });
    }

    return {
      provider: "evolution-go",
      messageId: extractMessageId(raw),
      raw
    };
  }
}

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "content-type": "application/json"
  };

  const sendApiKey = env.EVOLUTION_INSTANCE_TOKEN || env.EVOLUTION_API_KEY;
  if (sendApiKey) headers.apikey = sendApiKey;
  if (env.EVOLUTION_INSTANCE_ID) headers.instanceId = env.EVOLUTION_INSTANCE_ID;
  return headers;
}

function buildSendTextBody(input: SendTextInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
    number: input.to,
    text: input.text
  };

  if (input.correlationId) body.id = input.correlationId;
  if (input.quotedMessageId) {
    body.quoted = {
      messageId: input.quotedMessageId
    };
  }

  return body;
}

function joinUrl(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractMessageId(raw: unknown): string | undefined {
  if (!isRecord(raw)) return undefined;

  const response = raw as EvolutionSendTextResponse;
  return response.messageId ?? response.data?.Info?.ID ?? response.key?.id;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
