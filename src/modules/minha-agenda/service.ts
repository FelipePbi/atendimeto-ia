import { env, requireMinhaAgendaWriteEnv } from "../../config/env.js";
import { addDays, todayInTimeZone } from "../../lib/dates.js";
import { AppError } from "../../lib/errors.js";
import { normalizePhone, phoneMatches } from "../../lib/phone.js";
import { computeAvailableSlots, type AvailableSlot } from "./availability.js";
import { MinhaAgendaClient } from "./client.js";
import type {
  CreateAppointmentInput,
  MinhaAgendaAppointment,
  MinhaAgendaCustomer,
  MinhaAgendaService,
  UpdateAppointmentInput
} from "./types.js";

export interface ScheduleAppointmentInput {
  serviceId: number;
  date: string;
  startTime: string;
  customerName: string;
  customerPhone: string;
  comments?: string;
}

export interface RescheduleAppointmentInput {
  appointmentId: number;
  date: string;
  startTime: string;
}

export class MinhaAgendaServiceFacade {
  constructor(private readonly client = new MinhaAgendaClient()) {}

  async listActiveServices(): Promise<MinhaAgendaService[]> {
    const services = await this.client.listServices();
    return services.filter((service) => !service.deleted);
  }

  async findService(serviceId: number): Promise<MinhaAgendaService> {
    const service = (await this.listActiveServices()).find((item) => item.id === serviceId);
    if (!service) {
      throw new AppError("Servico nao encontrado no Minha Agenda.", {
        statusCode: 404,
        code: "SERVICE_NOT_FOUND"
      });
    }
    return service;
  }

  async findOrCreateCustomer(phone: string, name: string): Promise<MinhaAgendaCustomer> {
    const normalizedPhone = normalizePhone(phone);
    const customers = await this.client.searchCustomers(normalizedPhone);
    const exact = customers.find((customer) => phoneMatches(customer.phone1, normalizedPhone) || phoneMatches(customer.phone2, normalizedPhone));
    if (exact) return exact;

    requireMinhaAgendaWriteEnv();
    return this.client.createCustomer({
      name: name.trim() || normalizedPhone,
      phone1: normalizedPhone,
      phone2: "",
      birthDate: null,
      address: "",
      remarks: "",
      cpf: "",
      cnpj: null,
      comments: "",
      phoneInternational: "",
      email: "",
      isCnpj: false
    });
  }

  async getAvailableSlots(serviceId: number, startDate = todayInTimeZone(env.BUSINESS_TIMEZONE)): Promise<AvailableSlot[]> {
    const service = await this.findService(serviceId);
    const endDate = addDays(startDate, env.BUSINESS_AVAILABILITY_DAYS - 1);

    const [companySchedule, employeeSchedule, appointments, blockers] = await Promise.all([
      this.client.getCompanyWorkSchedule(),
      this.client.getEmployeeWorkScheduleByEmployeeId(env.MINHA_AGENDA_DEFAULT_EMPLOYEE_ID),
      this.client.findAppointmentsByDateRange({
        startDate,
        endDate,
        employeeId: env.MINHA_AGENDA_DEFAULT_EMPLOYEE_ID,
        isSlotBlocker: false
      }),
      this.client.findAppointmentsByDateRange({
        startDate,
        endDate,
        employeeId: env.MINHA_AGENDA_DEFAULT_EMPLOYEE_ID,
        isSlotBlocker: true
      })
    ]);

    return computeAvailableSlots({
      companySchedule,
      employeeSchedule,
      appointments,
      blockers,
      serviceDuration: service.duration,
      startDate,
      days: env.BUSINESS_AVAILABILITY_DAYS,
      stepMinutes: env.BUSINESS_SLOT_STEP_MINUTES,
      maxSlots: env.BUSINESS_MAX_SLOTS_TO_OFFER
    });
  }

  async createAppointment(input: ScheduleAppointmentInput): Promise<MinhaAgendaAppointment> {
    requireMinhaAgendaWriteEnv();
    const service = await this.findService(input.serviceId);
    await this.assertSlotAvailable(input.date, input.startTime, service.duration);
    const customer = await this.findOrCreateCustomer(input.customerPhone, input.customerName);

    const payload = this.buildCreateAppointmentPayload({
      date: input.date,
      startTime: input.startTime,
      customerId: customer.id,
      service,
      comments: input.comments ?? ""
    });

    return this.client.createAppointment(payload);
  }

  async findFutureAppointmentsForPhone(phone: string): Promise<MinhaAgendaAppointment[]> {
    const normalizedPhone = normalizePhone(phone);
    const customers = await this.client.searchCustomers(normalizedPhone);
    const customer = customers.find((item) => phoneMatches(item.phone1, normalizedPhone) || phoneMatches(item.phone2, normalizedPhone));
    if (!customer) return [];

    const startDate = todayInTimeZone(env.BUSINESS_TIMEZONE);
    const endDate = addDays(startDate, env.BUSINESS_APPOINTMENT_LOOKUP_DAYS);
    const appointments = await this.client.findAppointmentsByDateRange({
      startDate,
      endDate,
      employeeId: env.MINHA_AGENDA_DEFAULT_EMPLOYEE_ID,
      isSlotBlocker: false
    });

    return appointments
      .filter((appointment) => appointment.customerId === customer.id && !appointment.deleted)
      .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
  }

  async cancelAppointment(appointmentId: number): Promise<{ appointmentId: number; cancelled: true }> {
    requireMinhaAgendaWriteEnv();
    const now = new Date().toISOString();
    await this.client.cancelWithComments(appointmentId, `Cancelado via Atendente IA WhatsApp em ${now}`);
    return { appointmentId, cancelled: true };
  }

  async rescheduleAppointment(input: RescheduleAppointmentInput): Promise<MinhaAgendaAppointment> {
    requireMinhaAgendaWriteEnv();
    const current = await this.client.getAppointment(input.appointmentId);
    const serviceId = this.extractSingleServiceId(current);
    const service = await this.findService(serviceId);
    await this.assertSlotAvailable(input.date, input.startTime, current.duration || service.duration, input.appointmentId);

    const payload = this.buildUpdateAppointmentPayload(current, service, input.date, input.startTime);
    return this.client.updateAppointment(input.appointmentId, payload);
  }

  private async assertSlotAvailable(date: string, startTime: string, duration: number, exceptForId?: number): Promise<void> {
    const appointments = await this.client.findAppointmentsByDateRange({
      startDate: date,
      endDate: date,
      employeeId: env.MINHA_AGENDA_DEFAULT_EMPLOYEE_ID,
      isSlotBlocker: false
    });
    const blockers = await this.client.findAppointmentsByDateRange({
      startDate: date,
      endDate: date,
      employeeId: env.MINHA_AGENDA_DEFAULT_EMPLOYEE_ID,
      isSlotBlocker: true
    });
    const companySchedule = await this.client.getCompanyWorkSchedule();
    const employeeSchedule = await this.client.getEmployeeWorkScheduleByEmployeeId(env.MINHA_AGENDA_DEFAULT_EMPLOYEE_ID);

    const slots = computeAvailableSlots({
      companySchedule,
      employeeSchedule,
      appointments,
      blockers,
      serviceDuration: duration,
      startDate: date,
      days: 1,
      stepMinutes: env.BUSINESS_SLOT_STEP_MINUTES,
      maxSlots: 100,
      excludeAppointmentId: exceptForId
    });

    const isLocallyAvailable = slots.some((slot) => slot.date === date && slot.startTime === startTime);
    if (!isLocallyAvailable) {
      throw new AppError("Horario indisponivel para a duracao do servico.", {
        statusCode: 409,
        code: "SLOT_UNAVAILABLE"
      });
    }

    const exists = await this.client.appointmentExists({
      employeeId: env.MINHA_AGENDA_DEFAULT_EMPLOYEE_ID,
      date,
      startTime,
      exceptForId
    });

    if (exists) {
      throw new AppError("Ja existe agendamento no inicio desse horario.", {
        statusCode: 409,
        code: "APPOINTMENT_EXISTS"
      });
    }
  }

  private buildCreateAppointmentPayload(input: {
    date: string;
    startTime: string;
    customerId: number;
    service: MinhaAgendaService;
    comments: string;
  }): CreateAppointmentInput {
    return {
      date: input.date,
      startTime: input.startTime,
      duration: input.service.duration,
      customerId: input.customerId,
      paymentMethod: env.MINHA_AGENDA_DEFAULT_PAYMENT_METHOD,
      comments: input.comments,
      colorId: input.service.colorId,
      materialCost: null,
      reminder: false,
      userId: env.MINHA_AGENDA_DEFAULT_EMPLOYEE_ID,
      roomId: "",
      modelVersion: env.MINHA_AGENDA_MODEL_VERSION,
      loyaltyCardCustomerId: null,
      items: [{ serviceId: input.service.id, price: input.service.price.toFixed(2) }],
      productItems: []
    };
  }

  private buildUpdateAppointmentPayload(
    current: MinhaAgendaAppointment,
    service: MinhaAgendaService,
    date: string,
    startTime: string
  ): UpdateAppointmentInput {
    return {
      id: current.id,
      date,
      startTime,
      duration: current.duration || service.duration,
      customerId: current.customerId ?? 0,
      accountsReceivableId: current.accountsReceivableId ?? null,
      paymentMethod: current.paymentMethod ?? env.MINHA_AGENDA_DEFAULT_PAYMENT_METHOD,
      comments: current.comments ?? "",
      colorId: current.colorId ?? service.colorId,
      materialCost: current.materialCost ?? null,
      reminder: current.reminder ?? false,
      userId: current.userId,
      roomId: current.roomId === undefined ? null : String(current.roomId ?? ""),
      appointmentRepeatInfoForm: null,
      discount: current.discount ?? null,
      discountInPercentage: current.discountInPercentage ?? false,
      tag: current.tag ?? null,
      modelVersion: current.modelVersion ?? env.MINHA_AGENDA_MODEL_VERSION,
      loyaltyCardCustomerId: current.loyaltyCardCustomerId ?? null,
      items: [{ serviceId: service.id, price: current.price ?? service.price }],
      productItems: []
    };
  }

  private extractSingleServiceId(appointment: MinhaAgendaAppointment): number {
    if (appointment.serviceId) return appointment.serviceId;
    const serviceIds = appointment.serviceIds?.filter(Boolean) ?? [];
    if (serviceIds.length === 1) return serviceIds[0];
    const appHasServiceIds = appointment.appHasServices?.map((item) => item.serviceId).filter(Boolean) ?? [];
    if (appHasServiceIds.length === 1) return appHasServiceIds[0];

    throw new AppError("Remarcacao automatica bloqueada para agendamento com multiplos servicos.", {
      statusCode: 409,
      code: "MULTI_SERVICE_APPOINTMENT"
    });
  }
}
