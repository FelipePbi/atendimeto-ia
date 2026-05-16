import { AppError } from "./errors.js";
import { redactSensitive } from "./redact.js";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface JsonRequestOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
}

export interface HttpErrorDetails {
  url: string;
  method: string;
  status: number;
  responseText: string;
}

export async function fetchJson<T>(url: string, options: JsonRequestOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 10_000);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        accept: "application/json, text/plain, */*",
        ...(options.body === undefined ? {} : { "content-type": "application/json" }),
        ...options.headers
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal
    });

    const text = await response.text();
    if (!response.ok) {
      throw new AppError(`HTTP ${response.status} from ${method} ${url}`, {
        statusCode: response.status,
        code: "HTTP_ERROR",
        details: redactSensitive<HttpErrorDetails>({
          url,
          method,
          status: response.status,
          responseText: text
        })
      });
    }

    if (text.length === 0) return undefined as T;
    return JSON.parse(text) as T;
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new AppError(`HTTP timeout from ${method} ${url}`, {
        statusCode: 504,
        code: "HTTP_TIMEOUT"
      });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function buildUrl(baseUrl: string, path: string, query?: Record<string, string | number | boolean | null | undefined>): string {
  const url = new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}
