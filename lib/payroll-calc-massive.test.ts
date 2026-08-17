/**
 * MASSIVE Payroll Calculation Test Suite
 *
 * Covers every scenario:
 *  1. Full month — no issues
 *  2. Overtime (extra hours beyond schedule)
 *  3. Late arrival (deducted × 1.5)
 *  4. Early leave (deducted × 1.0)
 *  5. Full day off (absent — no pay for that day)
 *  6. Left mid-day and did NOT come back
 *  7. Left mid-day and DID come back (split shift)
 *  8. Paid leave days
 *  9. Friday / weekend overtime (× 1.5)
 * 10. Salary from hire date to end of month (pro-rated)
 * 11. Combined: late + overtime same day
 * 12. Combined: early leave + overtime same day
 * 13. Zero / edge values
 *
 * Formula (day-based model):
 *   earnedSalary =
 *     (grossSalary / 26) × paidDays
 *     + overtimeMinutes × minuteRate × 1.5
 *     + weekendOvertimeMinutes × minuteRate × 1.5
 *     − lateMinutes × minuteRate × 1.5
 *     − earlyLeaveMinutes × minuteRate × 1.0
 *
 *   where:
 *     paidDays    = min(presentDays + paidLeaveDays, 26)
 *     dailyRate   = grossSalary / 26
 *     minuteRate  = dailyRate / (hoursPerDay × 60)
 */

import { describe, expect, it } from "vitest";
import { calcEarnedSalary, calcEarnedSalaryHourly, STANDARD_WORK_DAYS, HOURS_PER_DAY } from "./payroll-calc";

// ─── helpers ────────────────────────────────────────────────────────────────

/** Round to 2 decimal places for readable assertions */
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Build the shared rate values for a given salary */
const rates = (grossSalary: number, hoursPerDay = HOURS_PER_DAY) => {
  const dailyRate = grossSalary / STANDARD_WORK_DAYS;          // per day
  const minuteRate = dailyRate / (hoursPerDay * 60);           // per minute
  return { dailyRate, minuteRate };
};

// ─── constants used across tests ────────────────────────────────────────────

const SALARY = 5200;   // EGP — easy numbers: dailyRate = 200, minuteRate = 200/(8×60) ≈ 0.4167
const { dailyRate, minuteRate } = rates(SALARY);

// ============================================================================
// TABLE SUMMARY (printed in test names for quick reading)
//
// | # | Scenario                              | presentDays | paidLeave | late | earlyLeave | OT  | WeekendOT |
// |---|---------------------------------------|-------------|-----------|------|------------|-----|-----------|
// | 1 | Perfect month                         | 26          | 0         | 0    | 0          | 0   | 0         |
// | 2 | Overtime only                         | 26          | 0         | 0    | 0          | 120 | 0         |
// | 3 | Late only                             | 26          | 0         | 30   | 0          | 0   | 0         |
// | 4 | Early leave only                      | 26          | 0         | 0    | 60         | 0   | 0         |
// | 5 | Full day absent                       | 25          | 0         | 0    | 0          | 0   | 0         |
// | 6 | Left mid-day, did NOT return          | 25          | 0         | 0    | 240        | 0   | 0         |
// | 7 | Left mid-day, DID return (split)      | 26          | 0         | 0    | 60         | 0   | 0         |
// | 8 | Paid leave days                       | 22          | 4         | 0    | 0          | 0   | 0         |
// | 9 | Friday overtime                       | 26          | 0         | 0    | 0          | 0   | 120       |
// |10 | Pro-rated: joined day 16 (11 days)    | 11          | 0         | 0    | 0          | 0   | 0         |
// |11 | Late + overtime same day              | 26          | 0         | 30   | 0          | 90  | 0         |
// |12 | Early leave + overtime same day       | 26          | 0         | 0    | 60         | 60  | 0         |
// |13 | Zero salary                           | 26          | 0         | 0    | 0          | 0   | 0         |
// |14 | paidDays capped at 26                 | 26          | 5         | 0    | 0          | 0   | 0         |
// |15 | Massive overtime — still correct      | 26          | 0         | 0    | 0          | 480 | 0         |
// |16 | Late > full day (extreme)             | 26          | 0         | 480  | 0          | 0   | 0         |
// |17 | All deductions floor at 0             | 1           | 0         | 9999 | 9999       | 0   | 0         |
// ============================================================================

describe("calcEarnedSalary — day-based model", () => {

  // ── 1. Perfect month ──────────────────────────────────────────────────────
  it("1 | Perfect month: 26 days, no deductions, no overtime → full salary", () => {
    const result = calcEarnedSalary(SALARY, 26, 0, 0, 0, 0, 0);
    expect(r2(result)).toBe(SALARY);
  });

  // ── 2. Overtime only ──────────────────────────────────────────────────────
  it("2 | Overtime 120 min → salary + 120 × minuteRate × 1.5", () => {
    const expected = r2(SALARY + 120 * minuteRate * 1.5);
    const result = calcEarnedSalary(SALARY, 26, 0, 0, 0, 120, 0);
    expect(r2(result)).toBe(expected);
  });

  // ── 3. Late only ──────────────────────────────────────────────────────────
  it("3 | Late 30 min → salary − 30 × minuteRate × 1.5", () => {
    const expected = r2(SALARY - 30 * minuteRate * 1.5);
    const result = calcEarnedSalary(SALARY, 26, 0, 30, 0, 0, 0);
    expect(r2(result)).toBe(expected);
  });

  // ── 4. Early leave only ───────────────────────────────────────────────────
  it("4 | Early leave 60 min → salary − 60 × minuteRate × 1.0", () => {
    const expected = r2(SALARY - 60 * minuteRate * 1.0);
    const result = calcEarnedSalary(SALARY, 26, 0, 0, 60, 0, 0);
    expect(r2(result)).toBe(expected);
  });

  // ── 5. Full day absent ────────────────────────────────────────────────────
  it("5 | 1 full day absent (25 present) → salary − 1 dailyRate", () => {
    const expected = r2(SALARY - dailyRate);
    const result = calcEarnedSalary(SALARY, 25, 0, 0, 0, 0, 0);
    expect(r2(result)).toBe(expected);
  });

  // ── 6. Left mid-day, did NOT come back ────────────────────────────────────
  it("6 | Left mid-day (4 h early), did NOT return → 25 days + 240 min earlyLeave deduction", () => {
    // Counted as 25 present days (absent for the rest of that day)
    // plus 240 min early-leave deduction for the partial day
    const expected = r2(SALARY - dailyRate - 240 * minuteRate);
    const result = calcEarnedSalary(SALARY, 25, 0, 0, 240, 0, 0);
    expect(r2(result)).toBe(expected);
  });

  // ── 7. Left mid-day, DID come back (split shift) ──────────────────────────
  it("7 | Left mid-day 1 h, came back → still 26 present days, 60 min earlyLeave deduction", () => {
    // Employee is counted present (came back), only the gap is deducted
    const expected = r2(SALARY - 60 * minuteRate);
    const result = calcEarnedSalary(SALARY, 26, 0, 0, 60, 0, 0);
    expect(r2(result)).toBe(expected);
  });

  // ── 8. Paid leave days ────────────────────────────────────────────────────
  it("8 | 22 present + 4 paid leave = 26 paidDays → full salary", () => {
    const result = calcEarnedSalary(SALARY, 22, 4, 0, 0, 0, 0);
    expect(r2(result)).toBe(SALARY);
  });

  // ── 9. Friday / weekend overtime ─────────────────────────────────────────
  it("9 | Friday overtime 120 min → salary + 120 × minuteRate × 1.5", () => {
    const expected = r2(SALARY + 120 * minuteRate * 1.5);
    const result = calcEarnedSalary(SALARY, 26, 0, 0, 0, 0, 120);
    expect(r2(result)).toBe(expected);
  });

  // ── 10. Pro-rated: joined day 16 of a 26-work-day month (11 days worked) ──
  it("10 | Joined mid-month: 11 days worked → 11 × dailyRate", () => {
    const expected = r2(11 * dailyRate);
    const result = calcEarnedSalary(SALARY, 11, 0, 0, 0, 0, 0);
    expect(r2(result)).toBe(expected);
  });

  // ── 11. Late + overtime same day ─────────────────────────────────────────
  it("11 | Late 30 min + overtime 90 min same day → net change = +90×1.5 − 30×1.5 minuteRate", () => {
    const expected = r2(SALARY + (90 - 30) * minuteRate * 1.5);
    const result = calcEarnedSalary(SALARY, 26, 0, 30, 0, 90, 0);
    expect(r2(result)).toBe(expected);
  });

  // ── 12. Early leave + overtime same day ──────────────────────────────────
  it("12 | Early leave 60 min + overtime 60 min → net = +60×1.5 − 60×1.0 minuteRate", () => {
    const expected = r2(SALARY + 60 * minuteRate * 1.5 - 60 * minuteRate);
    const result = calcEarnedSalary(SALARY, 26, 0, 0, 60, 60, 0);
    expect(r2(result)).toBe(expected);
  });

  // ── 13. Zero salary ───────────────────────────────────────────────────────
  it("13 | Zero gross salary → always 0", () => {
    expect(calcEarnedSalary(0, 26, 0, 0, 0, 120, 0)).toBe(0);
  });

  // ── 14. paidDays capped at 26 ────────────────────────────────────────────
  it("14 | 26 present + 5 paid leave → capped at 26 → full salary (no overpayment)", () => {
    const result = calcEarnedSalary(SALARY, 26, 5, 0, 0, 0, 0);
    expect(r2(result)).toBe(SALARY);
  });

  // ── 15. Massive overtime ─────────────────────────────────────────────────
  it("15 | Massive overtime 480 min (8 h extra) → salary + 480 × minuteRate × 1.5", () => {
    const expected = r2(SALARY + 480 * minuteRate * 1.5);
    const result = calcEarnedSalary(SALARY, 26, 0, 0, 0, 480, 0);
    expect(r2(result)).toBe(expected);
  });

  // ── 16. Extreme late (more than a full day in minutes) ───────────────────
  it("16 | Late 480 min (full day in minutes) → heavy deduction but still ≥ 0", () => {
    const result = calcEarnedSalary(SALARY, 26, 0, 480, 0, 0, 0);
    expect(result).toBeGreaterThanOrEqual(0);
    // Deduction = 480 × minuteRate × 1.5 = 480 × 0.4167 × 1.5 ≈ 300
    const expected = r2(Math.max(0, SALARY - 480 * minuteRate * 1.5));
    expect(r2(result)).toBe(expected);
  });

  // ── 17. Deductions never go below 0 ──────────────────────────────────────
  it("17 | Extreme deductions (9999 late + 9999 earlyLeave) → result is 0, never negative", () => {
    const result = calcEarnedSalary(SALARY, 1, 0, 9999, 9999, 0, 0);
    expect(result).toBe(0);
  });

  // ── 18. Both overtime types in same month ────────────────────────────────
  it("18 | Regular OT 60 min + Friday OT 60 min → both add × 1.5", () => {
    const expected = r2(SALARY + 60 * minuteRate * 1.5 + 60 * minuteRate * 1.5);
    const result = calcEarnedSalary(SALARY, 26, 0, 0, 0, 60, 60);
    expect(r2(result)).toBe(expected);
  });

  // ── 19. End-of-month: last day is day 26 ─────────────────────────────────
  it("19 | Exactly 26 work days in month → full salary", () => {
    const result = calcEarnedSalary(SALARY, 26, 0, 0, 0, 0, 0);
    expect(r2(result)).toBe(SALARY);
  });

  // ── 20. Salary state: day 1 to end of month with daily breakdown ─────────
  it("20 | Day-by-day accumulation: 26 days × dailyRate = full salary", () => {
    let accumulated = 0;
    for (let day = 1; day <= 26; day++) {
      accumulated += dailyRate;
    }
    expect(r2(accumulated)).toBe(SALARY);
  });
});

// ============================================================================
// HOURLY MODEL TESTS
// ============================================================================

describe("calcEarnedSalaryHourly — hourly model", () => {
  const HOURLY_SALARY = 5200;
  const WORK_DAYS = 26;
  const HOURS = 8;
  const { dailyRate: hDailyRate, minuteRate: hMinuteRate } = rates(HOURLY_SALARY, HOURS);
  const maxMinutes = WORK_DAYS * HOURS * 60; // 12480 min

  // ── H1. Full month worked ─────────────────────────────────────────────────
  it("H1 | Full month worked (12480 min) → full salary", () => {
    const result = calcEarnedSalaryHourly(HOURLY_SALARY, WORK_DAYS, HOURS, maxMinutes, 0);
    expect(r2(result)).toBe(HOURLY_SALARY);
  });

  // ── H2. Overtime minutes ──────────────────────────────────────────────────
  it("H2 | Full month + 120 min overtime → salary + 120 × minuteRate × 1.5", () => {
    const expected = r2(HOURLY_SALARY + 120 * hMinuteRate * 1.5);
    const result = calcEarnedSalaryHourly(HOURLY_SALARY, WORK_DAYS, HOURS, maxMinutes, 0, 0, 0, 120);
    expect(r2(result)).toBe(expected);
  });

  // ── H3. Late deduction ────────────────────────────────────────────────────
  it("H3 | Full month + 30 min late → salary − 30 × minuteRate × 1.5", () => {
    const expected = r2(HOURLY_SALARY - 30 * hMinuteRate * 1.5);
    const result = calcEarnedSalaryHourly(HOURLY_SALARY, WORK_DAYS, HOURS, maxMinutes, 0, 0, 0, 0, 30);
    expect(r2(result)).toBe(expected);
  });

  // ── H4. Early leave deduction ─────────────────────────────────────────────
  it("H4 | Full month + 60 min early leave → salary − 60 × minuteRate × 1.0", () => {
    const expected = r2(HOURLY_SALARY - 60 * hMinuteRate);
    const result = calcEarnedSalaryHourly(HOURLY_SALARY, WORK_DAYS, HOURS, maxMinutes, 0, 0, 0, 0, 0, 60);
    expect(r2(result)).toBe(expected);
  });

  // ── H5. Absent one day (480 min less worked) ──────────────────────────────
  it("H5 | 1 day absent (worked 12000 min instead of 12480) → salary − 1 dailyRate", () => {
    const workedMinutes = maxMinutes - HOURS * 60; // 12000
    const expected = r2(HOURLY_SALARY - hDailyRate);
    const result = calcEarnedSalaryHourly(HOURLY_SALARY, WORK_DAYS, HOURS, workedMinutes, 0);
    expect(r2(result)).toBe(expected);
  });

  // ── H6. Left mid-day, did NOT return (4 h = 240 min missing) ─────────────
  it("H6 | Left mid-day (240 min missing), did NOT return → salary − 240 × minuteRate", () => {
    const workedMinutes = maxMinutes - 240;
    const expected = r2(HOURLY_SALARY - 240 * hMinuteRate);
    const result = calcEarnedSalaryHourly(HOURLY_SALARY, WORK_DAYS, HOURS, workedMinutes, 0);
    expect(r2(result)).toBe(expected);
  });

  // ── H7. Left mid-day, DID return (60 min gap = earlyLeave) ───────────────
  it("H7 | Left mid-day 60 min, came back → full worked minutes, 60 min earlyLeave deduction", () => {
    const expected = r2(HOURLY_SALARY - 60 * hMinuteRate);
    const result = calcEarnedSalaryHourly(HOURLY_SALARY, WORK_DAYS, HOURS, maxMinutes, 0, 0, 0, 0, 0, 60);
    expect(r2(result)).toBe(expected);
  });

  // ── H8. Paid leave days ───────────────────────────────────────────────────
  it("H8 | 4 paid leave days → adds 4 × dailyRate", () => {
    const workedMinutes = (WORK_DAYS - 4) * HOURS * 60; // 22 days worked
    const expected = r2(HOURLY_SALARY); // 22 days worked + 4 paid leave = full salary
    const result = calcEarnedSalaryHourly(HOURLY_SALARY, WORK_DAYS, HOURS, workedMinutes, 0, 0, 4);
    expect(r2(result)).toBe(expected);
  });

  // ── H9. Sick leave (half pay) ─────────────────────────────────────────────
  it("H9 | 2 sick leave days → adds 2 × dailyRate × 0.5", () => {
    const workedMinutes = (WORK_DAYS - 2) * HOURS * 60;
    const sickPay = 2 * hDailyRate * 0.5;
    const workedPay = workedMinutes * hMinuteRate;
    const expected = r2(workedPay + sickPay);
    const result = calcEarnedSalaryHourly(HOURLY_SALARY, WORK_DAYS, HOURS, workedMinutes, 0, 2);
    expect(r2(result)).toBe(expected);
  });

  // ── H10. workedMinutes capped at max contractual ──────────────────────────
  it("H10 | workedMinutes > max contractual → capped, no overpayment from worked time", () => {
    const overMinutes = maxMinutes + 9999;
    // Overtime is separate; worked pay is capped
    const result = calcEarnedSalaryHourly(HOURLY_SALARY, WORK_DAYS, HOURS, overMinutes, 0);
    expect(r2(result)).toBe(HOURLY_SALARY);
  });

  // ── H11. Friday overtime in hourly model ─────────────────────────────────
  it("H11 | Friday overtime 120 min → salary + 120 × minuteRate × 1.5", () => {
    const expected = r2(HOURLY_SALARY + 120 * hMinuteRate * 1.5);
    const result = calcEarnedSalaryHourly(HOURLY_SALARY, WORK_DAYS, HOURS, maxMinutes, 0, 0, 0, 0, 0, 0, 120);
    expect(r2(result)).toBe(expected);
  });

  // ── H12. Zero salary ──────────────────────────────────────────────────────
  it("H12 | Zero gross salary → always 0", () => {
    expect(calcEarnedSalaryHourly(0, WORK_DAYS, HOURS, maxMinutes, 0, 0, 0, 120)).toBe(0);
  });

  // ── H13. Floor at 0 ───────────────────────────────────────────────────────
  it("H13 | Extreme deductions → result is 0, never negative", () => {
    const result = calcEarnedSalaryHourly(HOURLY_SALARY, WORK_DAYS, HOURS, 0, 0, 0, 0, 0, 99999, 99999);
    expect(result).toBe(0);
  });
});

// ============================================================================
// MATHEMATICAL EQUATION VERIFICATION TABLE
// Verifies each formula component in isolation
// ============================================================================

describe("Mathematical equation component verification", () => {
  const S = 5200;
  const { dailyRate: dr, minuteRate: mr } = rates(S);

  it("dailyRate = grossSalary / 26", () => {
    expect(r2(dr)).toBe(r2(S / 26));
  });

  it("minuteRate = dailyRate / (8 × 60)", () => {
    expect(r2(mr)).toBe(r2(dr / 480));
  });

  it("salaryFromDays = dailyRate × paidDays", () => {
    const paidDays = 20;
    const expected = r2(dr * paidDays);
    const result = calcEarnedSalary(S, 20, 0, 0, 0, 0, 0);
    expect(r2(result)).toBe(expected);
  });

  it("lateDeduction = lateMinutes × minuteRate × 1.5", () => {
    const lateMin = 45;
    const deduction = lateMin * mr * 1.5;
    const result = calcEarnedSalary(S, 26, 0, lateMin, 0, 0, 0);
    expect(r2(result)).toBe(r2(S - deduction));
  });

  it("earlyLeaveDeduction = earlyLeaveMinutes × minuteRate × 1.0", () => {
    const earlyMin = 90;
    const deduction = earlyMin * mr;
    const result = calcEarnedSalary(S, 26, 0, 0, earlyMin, 0, 0);
    expect(r2(result)).toBe(r2(S - deduction));
  });

  it("overtimePay = overtimeMinutes × minuteRate × 1.5", () => {
    const otMin = 60;
    const pay = otMin * mr * 1.5;
    const result = calcEarnedSalary(S, 26, 0, 0, 0, otMin, 0);
    expect(r2(result)).toBe(r2(S + pay));
  });

  it("weekendOvertimePay = weekendMinutes × minuteRate × 1.5", () => {
    const wMin = 60;
    const pay = wMin * mr * 1.5;
    const result = calcEarnedSalary(S, 26, 0, 0, 0, 0, wMin);
    expect(r2(result)).toBe(r2(S + pay));
  });

  it("full formula: all components together", () => {
    const presentDays = 24;
    const paidLeave = 1;
    const lateMin = 20;
    const earlyMin = 30;
    const otMin = 45;
    const wkMin = 30;

    const paidDays = Math.min(presentDays + paidLeave, 26); // 25
    const expected = r2(
      dr * paidDays
      + otMin * mr * 1.5
      + wkMin * mr * 1.5
      - lateMin * mr * 1.5
      - earlyMin * mr
    );

    const result = calcEarnedSalary(S, presentDays, paidLeave, lateMin, earlyMin, otMin, wkMin);
    expect(r2(result)).toBe(expected);
  });
});
