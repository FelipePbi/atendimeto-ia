import { describe, expect, it } from "vitest";
import { computeAvailableSlots, resolveWorkIntervals } from "../../src/modules/minha-agenda/availability.js";
import type { MinhaAgendaAppointment, WorkSchedule } from "../../src/modules/minha-agenda/types.js";

const companySchedule: WorkSchedule = {
  monEnabled: true,
  monStartTime1: "08:00",
  monEndTime1: "12:00",
  monStartTime2: "13:00",
  monEndTime2: "19:00",
  tueEnabled: true,
  tueStartTime1: "08:00",
  tueEndTime1: "12:00",
  tueStartTime2: "13:00",
  tueEndTime2: "19:00",
  satEnabled: true,
  satStartTime1: "08:00",
  satEndTime1: "12:00",
  sunEnabled: false
};

const employeeSchedule: WorkSchedule = {
  monEnabled: true,
  monStartTime1: null,
  monEndTime1: null,
  tueEnabled: true,
  tueStartTime1: "10:00",
  tueEndTime1: "12:00",
  satEnabled: false,
  sunEnabled: false
};

describe("Minha Agenda availability", () => {
  it("inherits company hours when employee day is enabled but has no explicit hours", () => {
    const intervals = resolveWorkIntervals(companySchedule, employeeSchedule, "2026-05-11");
    expect(intervals).toEqual([
      { start: 480, end: 720 },
      { start: 780, end: 1140 }
    ]);
  });

  it("closes the day when employee day is disabled", () => {
    const intervals = resolveWorkIntervals(companySchedule, employeeSchedule, "2026-05-16");
    expect(intervals).toEqual([]);
  });

  it("removes appointments and blockers from generated slots", () => {
    const appointments = [
      appointment({ id: 1, date: "2026-05-11", startTime: "08:30", endTime: "09:30", duration: 60 })
    ];
    const blockers = [
      appointment({ id: 2, date: "2026-05-11", startTime: "10:00", endTime: "11:00", duration: 60, slotBlocker: true })
    ];

    const slots = computeAvailableSlots({
      companySchedule,
      employeeSchedule,
      appointments,
      blockers,
      serviceDuration: 60,
      startDate: "2026-05-11",
      days: 1,
      stepMinutes: 30,
      maxSlots: 10
    });

    expect(slots.map((slot) => slot.startTime)).toEqual(["11:00", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00"]);
  });

  it("can exclude the appointment being rescheduled from conflict calculation", () => {
    const appointments = [
      appointment({ id: 99, date: "2026-05-11", startTime: "08:00", endTime: "09:00", duration: 60 })
    ];

    const slots = computeAvailableSlots({
      companySchedule,
      employeeSchedule,
      appointments,
      blockers: [],
      serviceDuration: 60,
      startDate: "2026-05-11",
      days: 1,
      stepMinutes: 30,
      maxSlots: 1,
      excludeAppointmentId: 99
    });

    expect(slots[0]).toEqual({ date: "2026-05-11", startTime: "08:00", endTime: "09:00" });
  });
});

function appointment(input: Partial<MinhaAgendaAppointment> & Pick<MinhaAgendaAppointment, "id" | "date" | "startTime" | "endTime" | "duration">): MinhaAgendaAppointment {
  return {
    userId: 873242,
    customerId: 1,
    serviceId: 1,
    price: 100,
    deleted: false,
    ...input
  };
}
