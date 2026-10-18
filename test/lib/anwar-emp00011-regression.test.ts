/**
 * Regression + generalized coverage — frontend payroll formula
 * (calcEarnedSalaryHourly in lib/payroll-calc.ts), which must stay consistent
 * with backend computeEarnedSalaryFromData.
 *
 * The reported case (26 days, 0 absent, 7,200 early-leave minutes, earned
 * 423,077 of 1,000,000, schedule 08:00–16:00) is one data-driven case;
 * nothing here is employee-specific.
 */
import { describe, expect, it } from "vitest";
import { calcEarnedSalaryHourly } from "@/lib/payroll-calc";

const BASE = 1_000_000;
const WORK_DAYS = 26;
const HOURS_8 = 8;
const MAX_MINUTES_8 = WORK_DAYS * HOURS_8 * 60; // 12480

describe("report reproduction — 7,200 missing minutes, 08:00–16:00, 26 days", () => {
  it("26 days, 0 missing → full 1,000,000", () => {
    expect(calcEarnedSalaryHourly(BASE, WORK_DAYS, HOURS_8, MAX_MINUTES_8, 0)).toBe(BASE);
  });

  it("7,200 missing minutes → 423,076.92 (displayed 423,077)", () => {
    const result = calcEarnedSalaryHourly(BASE, WORK_DAYS, HOURS_8, MAX_MINUTES_8, 0, 0, 0, 0, 0, 7200);
    expect(result).toBeCloseTo(423076.92, 1);
    expect(Math.round(result)).toBe(423077);
  });

  it("15 IN-only days × 480 min explain the 7,200", () => {
    expect(15 * HOURS_8 * 60).toBe(7200);
  });

  it("9 h schedule would pay 487,179 — NOT the observed value", () => {
    const nineHourMax = WORK_DAYS * 9 * 60;
    const result = calcEarnedSalaryHourly(BASE, WORK_DAYS, 9, nineHourMax, 0, 0, 0, 0, 0, 7200);
    expect(Math.round(result)).toBe(487179);
  });
});

describe("generalized scenarios", () => {
  it("normal completed shift: full worked minutes, no defects → full salary", () => {
    expect(calcEarnedSalaryHourly(BASE, WORK_DAYS, HOURS_8, MAX_MINUTES_8, 0, 0, 0, 0, 0, 0)).toBe(BASE);
  });

  it("missing checkout: 480 min charged as one full day", () => {
    const result = calcEarnedSalaryHourly(BASE, WORK_DAYS, HOURS_8, MAX_MINUTES_8, 0, 0, 0, 0, 0, 480);
    expect(result).toBeCloseTo(BASE - BASE / WORK_DAYS, 2);
  });

  it("missing check-in: fewer present days reduce worked minutes proportionally", () => {
    // 24 of 26 days actually worked (2 days have no IN punch at all)
    const result = calcEarnedSalaryHourly(BASE, WORK_DAYS, HOURS_8, 24 * 8 * 60, 0);
    expect(result).toBeCloseTo((BASE * 24) / 26, 2);
  });

  it("late minutes are charged at 1.5×", () => {
    const result = calcEarnedSalaryHourly(BASE, WORK_DAYS, HOURS_8, MAX_MINUTES_8, 0, 0, 0, 0, 480, 0);
    expect(result).toBeCloseTo(BASE - 1.5 * (BASE / WORK_DAYS), 2);
  });

  it("different schedules: one missing hour costs salary/(26×hoursPerDay)", () => {
    const max9 = WORK_DAYS * 9 * 60;
    const e8 = calcEarnedSalaryHourly(BASE, WORK_DAYS, 8, MAX_MINUTES_8, 0, 0, 0, 0, 0, 60);
    const e9 = calcEarnedSalaryHourly(BASE, WORK_DAYS, 9, max9, 0, 0, 0, 0, 0, 60);
    expect(e8).toBeCloseTo(BASE - BASE / (WORK_DAYS * 8), 2);
    expect(e9).toBeCloseTo(BASE - BASE / (WORK_DAYS * 9), 2);
  });

  it("multiple employees with different salaries scale independently", () => {
    const a = calcEarnedSalaryHourly(1_000_000, WORK_DAYS, HOURS_8, MAX_MINUTES_8, 0, 0, 0, 0, 0, 480);
    const b = calcEarnedSalaryHourly(500_000, WORK_DAYS, HOURS_8, MAX_MINUTES_8, 0, 0, 0, 0, 0, 480);
    expect(a).toBeCloseTo(1_000_000 - 1_000_000 / 26, 2);
    expect(b).toBeCloseTo(500_000 - 500_000 / 26, 2);
    expect(a / b).toBeCloseTo(2, 6);
  });

  it("manual override recalculates: absenceDays=2 drops pay by 2 days", () => {
    const result = calcEarnedSalaryHourly(BASE, WORK_DAYS, HOURS_8, MAX_MINUTES_8, 0, 0, 0, 0, 0, 0, 0, {
      absenceDays: 2,
    });
    expect(result).toBeCloseTo((BASE * (WORK_DAYS - 2)) / WORK_DAYS, 2);
  });

  it("manual early-leave override replaces the automatic minutes", () => {
    const result = calcEarnedSalaryHourly(BASE, WORK_DAYS, HOURS_8, MAX_MINUTES_8, 0, 0, 0, 0, 0, 7200, 0, {
      earlyLeaveMinutes: 0,
    });
    expect(result).toBe(BASE);
  });

  it("earned salary never goes negative", () => {
    expect(calcEarnedSalaryHourly(BASE, WORK_DAYS, HOURS_8, MAX_MINUTES_8, 0, 0, 0, 0, 0, 100_000)).toBe(0);
  });

  it("hourly model with partial month (11 of 26 days) prorates correctly", () => {
    const result = calcEarnedSalaryHourly(BASE, WORK_DAYS, HOURS_8, 11 * 8 * 60, 0);
    expect(result).toBeCloseTo((BASE * 11) / 26, 2);
  });
});

