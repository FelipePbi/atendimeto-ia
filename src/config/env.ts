import "dotenv/config";
import { z } from "zod";

const stringEnv = (defaultValue = "") =>
  z.preprocess((value) => {
    if (typeof value !== "string") return value;
    return value.trim();
  }, z.string().default(defaultValue));

const intEnv = (defaultValue: number) =>
  z.preprocess((value) => {
    if (value === undefined || value === null || value === "") return undefined;
    return Number(value);
  }, z.number().int().default(defaultValue));

const boolEnv = (defaultValue: boolean) =>
  z.preprocess((value) => {
    if (value === undefined || value === null || value === "") return undefined;
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      return ["1", "true", "yes", "on"].includes(value.toLowerCase());
    }
    return value;
  }, z.boolean().default(defaultValue));

const envSchema = z.object({
  NODE_ENV: stringEnv("development"),
  PORT: intEnv(3000),
  DATABASE_URL: stringEnv(),
  OPENAI_API_KEY: stringEnv(),
  OPENAI_MODEL: stringEnv("gpt-5.4-mini"),
  OPENAI_MAX_OUTPUT_TOKENS: intEnv(600),
  WHATSAPP_ACCESS_TOKEN: stringEnv(),
  WHATSAPP_PHONE_NUMBER_ID: stringEnv(),
  WHATSAPP_BUSINESS_ACCOUNT_ID: stringEnv(),
  WHATSAPP_VERIFY_TOKEN: stringEnv(),
  WHATSAPP_APP_SECRET: stringEnv(),
  WHATSAPP_API_VERSION: stringEnv("v23.0"),
  MINHA_AGENDA_BASE_URL: stringEnv("https://api.minhaagendaapp.com.br"),
  MINHA_AGENDA_BASIC_AUTH: stringEnv(),
  MINHA_AGENDA_USERNAME: stringEnv(),
  MINHA_AGENDA_PASSWORD: stringEnv(),
  MINHA_AGENDA_DEFAULT_EMPLOYEE_ID: intEnv(873242),
  MINHA_AGENDA_DEFAULT_PAYMENT_METHOD: stringEnv("CASH"),
  MINHA_AGENDA_MODEL_VERSION: intEnv(2),
  MINHA_AGENDA_TIMEOUT_MS: intEnv(10_000),
  MINHA_AGENDA_TOKEN_REFRESH_SKEW_SECONDS: intEnv(300),
  MINHA_AGENDA_ENABLE_WRITES: boolEnv(false),
  BUSINESS_TIMEZONE: stringEnv("America/Sao_Paulo"),
  BUSINESS_MAX_SLOTS_TO_OFFER: intEnv(3),
  BUSINESS_AVAILABILITY_DAYS: intEnv(14),
  BUSINESS_SLOT_STEP_MINUTES: intEnv(30),
  BUSINESS_APPOINTMENT_LOOKUP_DAYS: intEnv(90),
  BUSINESS_NAME: stringEnv(),
  BUSINESS_PROFESSIONAL_NAME: stringEnv(),
  BUSINESS_ADDRESS: stringEnv(),
  BUSINESS_DELAY_POLICY: stringEnv(),
  BUSINESS_CANCELLATION_POLICY: stringEnv(),
  BUSINESS_DEPOSIT_POLICY: stringEnv(),
  ADMIN_API_TOKEN: stringEnv()
});

export const env = envSchema.parse(process.env);
export type Env = typeof env;

export function requireEnv(keys: Array<keyof Env>): void {
  const missing = keys.filter((key) => {
    const value = env[key];
    return value === undefined || value === null || value === "";
  });

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

export function requireMinhaAgendaReadEnv(): void {
  requireEnv(["MINHA_AGENDA_BASE_URL", "MINHA_AGENDA_BASIC_AUTH", "MINHA_AGENDA_USERNAME", "MINHA_AGENDA_PASSWORD"]);
}

export function requireMinhaAgendaWriteEnv(): void {
  requireMinhaAgendaReadEnv();
  if (!env.MINHA_AGENDA_ENABLE_WRITES) {
    throw new Error("Minha Agenda writes are disabled. Set MINHA_AGENDA_ENABLE_WRITES=true to allow real writes.");
  }
}

export function requireOpenAiEnv(): void {
  requireEnv(["OPENAI_API_KEY", "OPENAI_MODEL"]);
}

export function requireWhatsAppEnv(): void {
  requireEnv(["WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_VERIFY_TOKEN"]);
}
