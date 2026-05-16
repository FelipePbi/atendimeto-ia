import { env, requireOpenAiEnv } from "../../config/env.js";
import { AppError } from "../../lib/errors.js";

export interface OpenAiToolDefinition {
  type: "function";
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  strict?: boolean;
}

export interface ResponsesRequest {
  instructions: string;
  input: unknown[];
  tools: OpenAiToolDefinition[];
}

export interface OpenAiFunctionCall {
  type: "function_call";
  id?: string;
  call_id: string;
  name: string;
  arguments: string;
}

export interface ResponsesApiResponse {
  id: string;
  output?: unknown[];
  output_text?: string;
}

export class OpenAiResponsesClient {
  async createResponse(request: ResponsesRequest): Promise<ResponsesApiResponse> {
    requireOpenAiEnv();

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL,
        instructions: request.instructions,
        input: request.input,
        tools: request.tools,
        max_output_tokens: env.OPENAI_MAX_OUTPUT_TOKENS,
        store: false
      })
    });

    const text = await response.text();
    if (!response.ok) {
      throw new AppError(`OpenAI request failed with HTTP ${response.status}`, {
        statusCode: response.status,
        code: "OPENAI_REQUEST_FAILED",
        details: text
      });
    }

    return JSON.parse(text) as ResponsesApiResponse;
  }
}

export function extractFunctionCalls(response: ResponsesApiResponse): OpenAiFunctionCall[] {
  return (response.output ?? []).filter(isFunctionCall);
}

export function extractOutputText(response: ResponsesApiResponse): string {
  if (response.output_text) return response.output_text.trim();

  const chunks: string[] = [];
  for (const item of response.output ?? []) {
    if (!item || typeof item !== "object") continue;
    const typed = item as { type?: string; content?: unknown[] };
    if (typed.type !== "message" || !Array.isArray(typed.content)) continue;

    for (const content of typed.content) {
      if (!content || typeof content !== "object") continue;
      const typedContent = content as { type?: string; text?: string };
      if ((typedContent.type === "output_text" || typedContent.type === "text") && typedContent.text) {
        chunks.push(typedContent.text);
      }
    }
  }

  return chunks.join("\n").trim();
}

function isFunctionCall(item: unknown): item is OpenAiFunctionCall {
  if (!item || typeof item !== "object") return false;
  const typed = item as Partial<OpenAiFunctionCall>;
  return typed.type === "function_call" && typeof typed.name === "string" && typeof typed.call_id === "string";
}
