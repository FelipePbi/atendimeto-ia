import { describe, expect, it } from "vitest";
import { env } from "../../src/config/env.js";
import { MinhaAgendaClient } from "../../src/modules/minha-agenda/client.js";

const shouldRun = process.env.MINHA_AGENDA_RUN_INTEGRATION_TESTS === "true";

describe.skipIf(!shouldRun)("Minha Agenda read-only integration", () => {
  const client = new MinhaAgendaClient();

  it("authenticates and reads services, schedules and appointments", async () => {
    expect(env.MINHA_AGENDA_ENABLE_WRITES).toBe(false);

    const services = await client.listServices();
    expect(Array.isArray(services)).toBe(true);

    const companySchedule = await client.getCompanyWorkSchedule();
    expect(companySchedule).toBeTruthy();

    const employeeSchedule = await client.getEmployeeWorkScheduleByEmployeeId(env.MINHA_AGENDA_DEFAULT_EMPLOYEE_ID);
    expect(employeeSchedule).toBeTruthy();

    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: env.BUSINESS_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date());

    const appointments = await client.findAppointmentsByDateRange({
      startDate: today,
      endDate: today,
      employeeId: env.MINHA_AGENDA_DEFAULT_EMPLOYEE_ID,
      isSlotBlocker: false
    });
    expect(Array.isArray(appointments)).toBe(true);
  });
});
