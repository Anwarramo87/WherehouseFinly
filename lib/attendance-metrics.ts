import type { Employee } from "@/types/employee";

export type TableStatus = "present" | "late" | "absent";

export interface DailyRecordInput {
  employeeId: string;
  checkIn?: string;
  checkOut?: string;
}

export interface AttendanceMetrics {
  present: number;
  late: number;
  absent: number;
  active: number;
  totalEmployees: number;
  totalLateMinutes: number;
  totalOvertimeMinutes: number;
}

export const EMPLOYEE_ID_REGEX = /^EMP[0-9]{3,}$/;

export const toMinutes = (time?: string) => {
  if (!time) return null;
  const normalized = time.slice(0, 5);
  const [h, m] = normalized.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return (h * 60) + m;
};

export const getStatus = (checkIn?: string, scheduledStart?: string): TableStatus => {
  if (!checkIn) return "absent";

  const checkInMinutes = toMinutes(checkIn);
  const scheduledMinutes = toMinutes(scheduledStart || "08:00");

  if (checkInMinutes === null || scheduledMinutes === null) return "present";
  if (checkInMinutes > (scheduledMinutes + 15)) return "late";

  return "present";
};

export const calculateAttendanceMetrics = (
  employees: Employee[],
  dailyRecords: DailyRecordInput[],
): AttendanceMetrics => {
  const safeEmployees = Array.isArray(employees) ? employees : [];
  const safeDailyRecords = Array.isArray(dailyRecords) ? dailyRecords : [];

  const eligibleEmployees = safeEmployees.filter(
    (employee) =>
      employee?.employeeId &&
      EMPLOYEE_ID_REGEX.test(employee.employeeId) &&
      employee.status !== "terminated",
  );


  const employeeById = new Map(eligibleEmployees.map((employee) => [employee.employeeId, employee]));

  const employeeIds = new Set<string>();
  for (const employee of eligibleEmployees) {
    if (employee?.employeeId) {
      employeeIds.add(employee.employeeId);
    }
  }

  const dailyByEmployee = new Map<string, DailyRecordInput>();
   for (const record of safeDailyRecords) {
    if (!record?.employeeId || !EMPLOYEE_ID_REGEX.test(record.employeeId)) continue;
    if (!employeeIds.has(record.employeeId)) continue;
    if (!dailyByEmployee.has(record.employeeId)) {
      dailyByEmployee.set(record.employeeId, record);
    }
  }

  const counts: Record<TableStatus, number> = { present: 0, late: 0, absent: 0 };
  let totalLateMinutes = 0;
  let totalOvertimeMinutes = 0;

  for (const employeeId of employeeIds) {
    const employee = employeeById.get(employeeId);
    const daily = dailyByEmployee.get(employeeId);
    const scheduledStart = employee?.scheduledStart || "08:00";
    const scheduledEnd = employee?.scheduledEnd || "16:00";

    const status = getStatus(daily?.checkIn, scheduledStart);
    counts[status] += 1;

    const checkInMinutes = toMinutes(daily?.checkIn);
    const scheduledStartMinutes = toMinutes(scheduledStart);
    if (
      checkInMinutes !== null &&
      scheduledStartMinutes !== null &&
      checkInMinutes > (scheduledStartMinutes + 15)
    ) {
      totalLateMinutes += Math.max(0, checkInMinutes - scheduledStartMinutes);
    }

    const checkOutMinutes = toMinutes(daily?.checkOut);
    const scheduledEndMinutes = toMinutes(scheduledEnd);
    if (
      checkOutMinutes !== null &&
      scheduledEndMinutes !== null &&
      checkOutMinutes > scheduledEndMinutes
    ) {
      totalOvertimeMinutes += Math.max(0, checkOutMinutes - scheduledEndMinutes);
    }
  }

  return {
    present: counts.present,
    late: counts.late,
    absent: counts.absent,
    active: counts.present + counts.late,
    totalEmployees: employeeIds.size,
    totalLateMinutes,
    totalOvertimeMinutes,
  };
};

