import { describe, expect, it } from "vitest";
import type { Employee } from "@/types/employee";
import { calculateAttendanceMetrics } from "@/lib/attendance-metrics";

describe("calculateAttendanceMetrics", () => {
  it("excludes terminated employees and ignores daily records for unknown IDs", () => {
    const employees: Employee[] = [
      {
        employeeId: "EMP001",
        name: "Ali",
        status: "active",
        scheduledStart: "08:00",
        scheduledEnd: "16:00",
      },
      {
        employeeId: "EMP002",
        name: "Sara",
        status: "terminated",
        scheduledStart: "08:00",
        scheduledEnd: "16:00",
      },
    ];

    const metrics = calculateAttendanceMetrics(employees, [
      { employeeId: "EMP001", checkIn: "08:10", checkOut: "16:30" },
      { employeeId: "EMP002", checkIn: "08:00", checkOut: "16:00" },
      { employeeId: "EMP999", checkIn: "09:00", checkOut: "17:00" },
    ]);

    expect(metrics.totalEmployees).toBe(1);
    expect(metrics.present).toBe(0);
    expect(metrics.late).toBe(1);
    expect(metrics.absent).toBe(0);
    expect(metrics.active).toBe(1);
    expect(metrics.totalOvertimeMinutes).toBe(30);
  });

  it("counts active employee as absent when no daily record exists", () => {
    const employees: Employee[] = [
      {
        employeeId: "EMP003",
        name: "Omar",
        status: "active",
        scheduledStart: "08:00",
        scheduledEnd: "16:00",
      },
    ];

    const metrics = calculateAttendanceMetrics(employees, []);

    expect(metrics.totalEmployees).toBe(1);
    expect(metrics.absent).toBe(1);
    expect(metrics.active).toBe(0);
  });
});

