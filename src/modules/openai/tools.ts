import type { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import { MinhaAgendaServiceFacade } from "../minha-agenda/service.js";
import type { MinhaAgendaAppointment } from "../minha-agenda/types.js";
import type { OpenAiToolDefinition } from "./openai-client.js";

export interface ToolExecutionContext {
  conversationId: string;
  phone: string;
  customerName?: string | null;
}

type PendingAction =
  | {
      type: "schedule";
      serviceId: number;
      date: string;
      startTime: string;
      customerName: string;
      customerPhone: string;
    }
  | {
      type: "cancel";
      appointmentId: number;
    }
  | {
      type: "reschedule";
      appointmentId: number;
      date: string;
      startTime: string;
    };

const noArgsSchema = z.object({}).strict();
const listServicesSchema = z.object({ includePrices: z.boolean().optional().default(false) }).strict();
const availableSlotsSchema = z
  .object({
    serviceId: z.number().int(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
  })
  .strict();
const prepareScheduleSchema = z
  .object({
    serviceId: z.number().int(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    customerName: z.string().min(1)
  })
  .strict();
const appointmentIdSchema = z.object({ appointmentId: z.number().int() }).strict();
const prepareRescheduleSchema = appointmentIdSchema
  .extend({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    startTime: z.string().regex(/^\d{2}:\d{2}$/)
  })
  .strict();
const handoffSchema = z
  .object({
    reason: z.string().min(3),
    summary: z.string().optional()
  })
  .strict();

export class AssistantToolRegistry {
  readonly definitions: OpenAiToolDefinition[] = [
    {
      type: "function",
      name: "listar_servicos",
      description: "Lista servicos reais cadastrados no Minha Agenda. Inclua precos apenas se a cliente perguntou por valores.",
      parameters: {
        type: "object",
        properties: {
          includePrices: { type: "boolean", description: "True somente quando a cliente pediu preco/valor." }
        },
        required: ["includePrices"],
        additionalProperties: false
      }
    },
    {
      type: "function",
      name: "buscar_horarios_disponiveis",
      description: "Busca horarios reais disponiveis para um unico servico.",
      parameters: {
        type: "object",
        properties: {
          serviceId: { type: "integer" },
          startDate: { type: "string", description: "Data inicial YYYY-MM-DD. Opcional." }
        },
        required: ["serviceId"],
        additionalProperties: false
      }
    },
    {
      type: "function",
      name: "preparar_agendamento",
      description: "Prepara um agendamento e registra uma acao pendente. Nao cria nada; depois peca confirmacao da cliente.",
      parameters: {
        type: "object",
        properties: {
          serviceId: { type: "integer" },
          date: { type: "string" },
          startTime: { type: "string" },
          customerName: { type: "string" }
        },
        required: ["serviceId", "date", "startTime", "customerName"],
        additionalProperties: false
      }
    },
    {
      type: "function",
      name: "confirmar_agendamento",
      description: "Cria o agendamento real no Minha Agenda apenas se houver acao pendente preparada.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false
      }
    },
    {
      type: "function",
      name: "buscar_agendamentos_cliente",
      description: "Busca agendamentos futuros da cliente pelo telefone do WhatsApp.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false
      }
    },
    {
      type: "function",
      name: "preparar_cancelamento",
      description: "Prepara o cancelamento de um agendamento futuro da cliente. Nao cancela; depois peca confirmacao.",
      parameters: {
        type: "object",
        properties: {
          appointmentId: { type: "integer" }
        },
        required: ["appointmentId"],
        additionalProperties: false
      }
    },
    {
      type: "function",
      name: "confirmar_cancelamento",
      description: "Cancela o agendamento real no Minha Agenda apenas se houver cancelamento pendente preparado.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false
      }
    },
    {
      type: "function",
      name: "preparar_remarcacao",
      description: "Prepara a remarcacao de um agendamento futuro. Nao altera a agenda; depois peca confirmacao.",
      parameters: {
        type: "object",
        properties: {
          appointmentId: { type: "integer" },
          date: { type: "string" },
          startTime: { type: "string" }
        },
        required: ["appointmentId", "date", "startTime"],
        additionalProperties: false
      }
    },
    {
      type: "function",
      name: "confirmar_remarcacao",
      description: "Remarca o agendamento real no Minha Agenda apenas se houver remarcacao pendente preparada.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false
      }
    },
    {
      type: "function",
      name: "acionar_humano",
      description: "Abre handoff para a profissional assumir a conversa.",
      parameters: {
        type: "object",
        properties: {
          reason: { type: "string" },
          summary: { type: "string" }
        },
        required: ["reason"],
        additionalProperties: false
      }
    }
  ];

  constructor(
    private readonly prisma: PrismaClient,
    private readonly agenda = new MinhaAgendaServiceFacade()
  ) {}

  async execute(name: string, rawArgs: unknown, context: ToolExecutionContext): Promise<unknown> {
    switch (name) {
      case "listar_servicos":
        return this.listServices(listServicesSchema.parse(rawArgs));
      case "buscar_horarios_disponiveis":
        return this.findAvailableSlots(availableSlotsSchema.parse(rawArgs));
      case "preparar_agendamento":
        return this.prepareSchedule(prepareScheduleSchema.parse(rawArgs), context);
      case "confirmar_agendamento":
        noArgsSchema.parse(rawArgs);
        return this.confirmSchedule(context);
      case "buscar_agendamentos_cliente":
        noArgsSchema.parse(rawArgs);
        return this.findCustomerAppointments(context);
      case "preparar_cancelamento":
        return this.prepareCancel(appointmentIdSchema.parse(rawArgs), context);
      case "confirmar_cancelamento":
        noArgsSchema.parse(rawArgs);
        return this.confirmCancel(context);
      case "preparar_remarcacao":
        return this.prepareReschedule(prepareRescheduleSchema.parse(rawArgs), context);
      case "confirmar_remarcacao":
        noArgsSchema.parse(rawArgs);
        return this.confirmReschedule(context);
      case "acionar_humano":
        return this.createHandoff(handoffSchema.parse(rawArgs), context);
      default:
        return { ok: false, error: `Unknown tool: ${name}` };
    }
  }

  private async listServices(args: z.infer<typeof listServicesSchema>) {
    const services = await this.agenda.listActiveServices();
    return {
      ok: true,
      services: services.map((service) => ({
        id: service.id,
        name: service.name,
        duration: service.duration,
        ...(args.includePrices ? { price: service.price } : {}),
        colorId: service.colorId
      }))
    };
  }

  private async findAvailableSlots(args: z.infer<typeof availableSlotsSchema>) {
    return {
      ok: true,
      slots: await this.agenda.getAvailableSlots(args.serviceId, args.startDate)
    };
  }

  private async prepareSchedule(args: z.infer<typeof prepareScheduleSchema>, context: ToolExecutionContext) {
    const pending: PendingAction = {
      type: "schedule",
      serviceId: args.serviceId,
      date: args.date,
      startTime: args.startTime,
      customerName: args.customerName,
      customerPhone: context.phone
    };
    await this.setPendingAction(context.conversationId, pending);
    return { ok: true, requiresConfirmation: true, pendingAction: pending };
  }

  private async confirmSchedule(context: ToolExecutionContext) {
    const pending = await this.getPendingAction(context.conversationId);
    if (!pending || pending.type !== "schedule") {
      return { ok: false, error: "Nao ha agendamento pendente para confirmar." };
    }

    const appointment = await this.agenda.createAppointment({
      serviceId: pending.serviceId,
      date: pending.date,
      startTime: pending.startTime,
      customerName: pending.customerName,
      customerPhone: pending.customerPhone,
      comments: "Criado via Atendente IA WhatsApp"
    });

    await this.clearPendingAction(context.conversationId);
    if (appointment.customerId) {
      await this.prisma.customerLink.upsert({
        where: { phone: context.phone },
        update: {
          minhaAgendaCustomerId: appointment.customerId,
          name: pending.customerName
        },
        create: {
          phone: context.phone,
          minhaAgendaCustomerId: appointment.customerId,
          name: pending.customerName
        }
      });
    }
    await this.saveExternalAppointment(context.conversationId, appointment, "SCHEDULED");
    return { ok: true, appointment: this.presentAppointment(appointment) };
  }

  private async findCustomerAppointments(context: ToolExecutionContext) {
    const appointments = await this.agenda.findFutureAppointmentsForPhone(context.phone);
    return {
      ok: true,
      appointments: appointments.map((appointment) => this.presentAppointment(appointment))
    };
  }

  private async prepareCancel(args: z.infer<typeof appointmentIdSchema>, context: ToolExecutionContext) {
    const appointments = await this.agenda.findFutureAppointmentsForPhone(context.phone);
    const appointment = appointments.find((item) => item.id === args.appointmentId);
    if (!appointment) {
      return { ok: false, error: "Agendamento nao encontrado para esse telefone." };
    }

    const pending: PendingAction = { type: "cancel", appointmentId: args.appointmentId };
    await this.setPendingAction(context.conversationId, pending);
    return { ok: true, requiresConfirmation: true, appointment: this.presentAppointment(appointment) };
  }

  private async confirmCancel(context: ToolExecutionContext) {
    const pending = await this.getPendingAction(context.conversationId);
    if (!pending || pending.type !== "cancel") {
      return { ok: false, error: "Nao ha cancelamento pendente para confirmar." };
    }

    const result = await this.agenda.cancelAppointment(pending.appointmentId);
    await this.clearPendingAction(context.conversationId);
    await this.prisma.externalAppointment.updateMany({
      where: { minhaAgendaAppointmentId: pending.appointmentId },
      data: { status: "CANCELLED" }
    });
    return { ok: true, ...result };
  }

  private async prepareReschedule(args: z.infer<typeof prepareRescheduleSchema>, context: ToolExecutionContext) {
    const appointments = await this.agenda.findFutureAppointmentsForPhone(context.phone);
    const appointment = appointments.find((item) => item.id === args.appointmentId);
    if (!appointment) {
      return { ok: false, error: "Agendamento nao encontrado para esse telefone." };
    }

    const pending: PendingAction = {
      type: "reschedule",
      appointmentId: args.appointmentId,
      date: args.date,
      startTime: args.startTime
    };
    await this.setPendingAction(context.conversationId, pending);
    return {
      ok: true,
      requiresConfirmation: true,
      currentAppointment: this.presentAppointment(appointment),
      newDate: args.date,
      newStartTime: args.startTime
    };
  }

  private async confirmReschedule(context: ToolExecutionContext) {
    const pending = await this.getPendingAction(context.conversationId);
    if (!pending || pending.type !== "reschedule") {
      return { ok: false, error: "Nao ha remarcacao pendente para confirmar." };
    }

    const appointment = await this.agenda.rescheduleAppointment({
      appointmentId: pending.appointmentId,
      date: pending.date,
      startTime: pending.startTime
    });

    await this.clearPendingAction(context.conversationId);
    await this.saveExternalAppointment(context.conversationId, appointment, "RESCHEDULED");
    return { ok: true, appointment: this.presentAppointment(appointment) };
  }

  private async createHandoff(args: z.infer<typeof handoffSchema>, context: ToolExecutionContext) {
    const handoff = await this.prisma.handoff.create({
      data: {
        conversationId: context.conversationId,
        phone: context.phone,
        reason: args.reason,
        summary: args.summary ?? null,
        status: "OPEN"
      }
    });

    await this.prisma.conversation.update({
      where: { id: context.conversationId },
      data: { humanHandoff: true, status: "HUMAN_HANDOFF" }
    });

    return { ok: true, handoffId: handoff.id };
  }

  private async getPendingAction(conversationId: string): Promise<PendingAction | null> {
    const conversation = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    const state = (conversation?.state ?? {}) as { pendingAction?: PendingAction };
    return state.pendingAction ?? null;
  }

  private async setPendingAction(conversationId: string, pendingAction: PendingAction): Promise<void> {
    const conversation = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    const state = (conversation?.state ?? {}) as Record<string, unknown>;
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { state: { ...state, pendingAction } as Prisma.InputJsonValue }
    });
  }

  private async clearPendingAction(conversationId: string): Promise<void> {
    const conversation = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    const state = { ...((conversation?.state ?? {}) as Record<string, unknown>) };
    delete state.pendingAction;
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { state: state as Prisma.InputJsonValue }
    });
  }

  private async saveExternalAppointment(
    conversationId: string,
    appointment: MinhaAgendaAppointment,
    status: "SCHEDULED" | "RESCHEDULED"
  ) {
    const serviceId = appointment.serviceId ?? appointment.serviceIds?.[0] ?? appointment.appHasServices?.[0]?.serviceId;
    if (!appointment.customerId || !serviceId) return;

    await this.prisma.externalAppointment.upsert({
      where: { minhaAgendaAppointmentId: appointment.id },
      update: {
        conversationId,
        customerId: appointment.customerId,
        serviceId,
        date: appointment.date,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        status,
        payload: appointment as object
      },
      create: {
        conversationId,
        minhaAgendaAppointmentId: appointment.id,
        customerId: appointment.customerId,
        serviceId,
        date: appointment.date,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        status,
        payload: appointment as object
      }
    });
  }

  private presentAppointment(appointment: MinhaAgendaAppointment) {
    return {
      id: appointment.id,
      date: appointment.date,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      serviceName: appointment.serviceName ?? appointment.service?.name ?? appointment.services?.map((service) => service.name).join(", "),
      customerName: appointment.customerName ?? appointment.customer?.name ?? null
    };
  }
}
