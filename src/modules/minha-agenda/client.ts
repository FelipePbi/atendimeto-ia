import { env, requireMinhaAgendaReadEnv } from "../../config/env.js";
import { AppError } from "../../lib/errors.js";
import { buildUrl, fetchJson } from "../../lib/http.js";
import type {
  AppointmentRangeQuery,
  CreateAppointmentInput,
  CreateCustomerInput,
  MinhaAgendaAppointment,
  MinhaAgendaAuthResponse,
  MinhaAgendaCustomer,
  MinhaAgendaService,
  UpdateAppointmentInput,
  WorkSchedule
} from "./types.js";

interface TokenCache {
  accessToken: string;
  expiresAtMs: number;
}

export class MinhaAgendaClient {
  private tokenCache: TokenCache | null = null;

  constructor(
    private readonly config = {
      baseUrl: env.MINHA_AGENDA_BASE_URL,
      basicAuth: env.MINHA_AGENDA_BASIC_AUTH,
      username: env.MINHA_AGENDA_USERNAME,
      password: env.MINHA_AGENDA_PASSWORD,
      timeoutMs: env.MINHA_AGENDA_TIMEOUT_MS,
      refreshSkewSeconds: env.MINHA_AGENDA_TOKEN_REFRESH_SKEW_SECONDS
    }
  ) {}

  async listServices(): Promise<MinhaAgendaService[]> {
    return this.request<MinhaAgendaService[]>("/services");
  }

  async searchCustomers(query: string): Promise<MinhaAgendaCustomer[]> {
    return this.request<MinhaAgendaCustomer[]>("/customers/search", undefined, { query });
  }

  async createCustomer(input: CreateCustomerInput): Promise<MinhaAgendaCustomer> {
    return this.request<MinhaAgendaCustomer>("/customers", { method: "POST", body: input });
  }

  async findAppointmentsByDateRange(query: AppointmentRangeQuery): Promise<MinhaAgendaAppointment[]> {
    return this.request<MinhaAgendaAppointment[]>("/appointments/appsByDateRange", undefined, { ...query });
  }

  async appointmentExists(query: { employeeId: number; date: string; startTime: string; exceptForId?: number }): Promise<boolean> {
    return this.request<boolean>("/appointments/exists", undefined, query);
  }

  async getAppointment(id: number): Promise<MinhaAgendaAppointment> {
    return this.request<MinhaAgendaAppointment>(`/appointments/${id}`);
  }

  async createAppointment(input: CreateAppointmentInput): Promise<MinhaAgendaAppointment> {
    return this.request<MinhaAgendaAppointment>("/appointments", { method: "POST", body: input });
  }

  async updateAppointment(id: number, input: UpdateAppointmentInput): Promise<MinhaAgendaAppointment> {
    return this.request<MinhaAgendaAppointment>(`/appointments/${id}`, { method: "PUT", body: input });
  }

  async cancelWithComments(id: number, comments: string): Promise<void> {
    await this.request<void>(`/appointments/cancelWithComments/${id}`, { method: "PUT", body: { comments } });
  }

  async getCompanyWorkSchedule(): Promise<WorkSchedule> {
    return this.request<WorkSchedule>("/companyWorkSchedule");
  }

  async getEmployeeWorkScheduleByEmployeeId(employeeId: number): Promise<WorkSchedule> {
    return this.request<WorkSchedule>(`/employeeWorkScheduleByEmployeeId/${employeeId}`);
  }

  private async request<T>(
    path: string,
    options: { method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; body?: unknown } = {},
    query?: Record<string, string | number | boolean | null | undefined>
  ): Promise<T> {
    requireMinhaAgendaReadEnv();
    const url = buildUrl(this.config.baseUrl, path, query);
    const headers = await this.authHeaders();

    try {
      return await fetchJson<T>(url, {
        method: options.method,
        body: options.body,
        timeoutMs: this.config.timeoutMs,
        headers
      });
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 401) {
        this.tokenCache = null;
        return fetchJson<T>(url, {
          method: options.method,
          body: options.body,
          timeoutMs: this.config.timeoutMs,
          headers: await this.authHeaders(true)
        });
      }
      throw error;
    }
  }

  private async authHeaders(forceRefresh = false): Promise<Record<string, string>> {
    const token = await this.getAccessToken(forceRefresh);
    return {
      app_is_web: "true",
      authorization: `Bearer ${token}`
    };
  }

  private async getAccessToken(forceRefresh = false): Promise<string> {
    const now = Date.now();
    if (!forceRefresh && this.tokenCache && this.tokenCache.expiresAtMs > now) {
      return this.tokenCache.accessToken;
    }

    const auth = this.config.basicAuth.startsWith("Basic ")
      ? this.config.basicAuth
      : `Basic ${this.config.basicAuth}`;

    const body = new URLSearchParams({
      username: this.config.username,
      password: this.config.password,
      grant_type: "password"
    });

    const response = await fetch(buildUrl(this.config.baseUrl, "/oauth/token", { isWeb: true }), {
      method: "POST",
      headers: {
        accept: "application/json, text/plain, */*",
        authorization: auth,
        app_is_web: "true",
        "content-type": "application/x-www-form-urlencoded"
      },
      body,
      signal: AbortSignal.timeout(this.config.timeoutMs)
    });

    const text = await response.text();
    if (!response.ok) {
      throw new AppError(`Minha Agenda authentication failed with HTTP ${response.status}`, {
        statusCode: response.status,
        code: "MINHA_AGENDA_AUTH_FAILED"
      });
    }

    const parsed = JSON.parse(text) as MinhaAgendaAuthResponse;
    const refreshSkewMs = this.config.refreshSkewSeconds * 1000;
    const ttlMs = Math.max(0, parsed.expires_in * 1000 - refreshSkewMs);
    this.tokenCache = {
      accessToken: parsed.access_token,
      expiresAtMs: now + ttlMs
    };
    return parsed.access_token;
  }
}
