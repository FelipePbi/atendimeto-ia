const sensitiveKeys = new Set([
  "authorization",
  "access_token",
  "token",
  "password",
  "senha",
  "api_key",
  "apikey",
  "secret",
  "evolution_api_key",
  "evolution_webhook_token",
  "minha_agenda_password",
  "openai_api_key"
]);

export function redactSensitive<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitive(item)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => {
        const normalized = key.toLowerCase();
        if (sensitiveKeys.has(normalized) || normalized.includes("token") || normalized.includes("password")) {
          return [key, "[REDACTED]"];
        }
        return [key, redactSensitive(nested)];
      })
    ) as T;
  }

  return value;
}
