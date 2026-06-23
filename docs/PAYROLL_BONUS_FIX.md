# Payroll Page - Bonus Integration & Calculation Fixes

## Summary of Changes

### ✅ Issue Fixed: Bonuses Not Displaying in Payroll

The bonuses added in the "Bonuses Page" were not being integrated into the "Payroll Page" calculations due to multiple issues.

---

## 1. **Period Filtering** ✓

**File:** `app/(dashboard)/salaries/payroll/page.tsx` (Line 281)

```typescript
const { data: bonuses = [], isLoading: bonusesLoading } = useBonuses({ period: month });
```

- ✅ Already filtering by `period: month` (e.g., "2026-06")
- ✅ Backend filters by `period` column in the database

---

## 2. **Pagination Fix** ✓

**File:** `hooks/useBonuses.ts` (Lines 18-57)

### Changes Made:
1. **Increased limit** from default 50 to 500 to fetch all bonuses
2. **Reordered response extraction** to check `data.data` first (paginated response format)
3. **Added detailed logging** to track data flow

```typescript
const res = await apiClient.get("/bonuses", {
  params: {
    employeeId: params?.employeeId,
    period: params?.period,
    limit: 500, // ✅ Increased limit
  },
});

const data = res.data;

// ✅ Check paginated response first
if (data && Array.isArray(data.data)) {
  return data.data;
}

// Fallback to other formats
if (Array.isArray(data)) return data;
if (data && Array.isArray(data.rewards)) return data.rewards;
if (data && Array.isArray(data.bonuses)) return data.bonuses;
```

---

## 3. **Employee Mapping** ✓

**File:** `app/(dashboard)/salaries/payroll/page.tsx`

### Preview Data Mode (Lines 509-520)
```typescript
// Bonuses - filter by employee and calculate total
const employeeBonuses = bonuses.filter((b) => b.employeeId === employeeId);
const variableEarnings = employeeBonuses.reduce((sum, bonus) => {
  const bonusAmt = toNumber(bonus.bonusAmount);
  const assistAmt = toNumber((bonus as { assistanceAmount?: number }).assistanceAmount);
  return sum + bonusAmt + assistAmt;
}, 0);
```

### Backend Data Mode (Lines 675-686)
```typescript
const employeeBonuses = bonuses.filter((b) => b.employeeId === employeeId);
const variableEarnings = employeeBonuses.reduce((sum, bonus) => {
  const bonusAmt = toNumber(bonus.bonusAmount);
  const assistAmt = toNumber((bonus as { assistanceAmount?: number }).assistanceAmount);
  return sum + bonusAmt + assistAmt;
}, 0);
```

- ✅ Filters bonuses by `employeeId`
- ✅ Sums both `bonusAmount` and `assistanceAmount`
- ✅ Adds to `variableEarnings` for each employee

---

## 4. **Math Error Fixes** ✓

### 4.1 Insurance Double-Counting - FIXED ❌→✅

**Problem:** Insurance was being deducted twice:
1. Once from `earnedSalary` (line 507/672): `earnedSalary = rawEarned - insuranceAmount`
2. Again in `totalDeductions` (old line 547): `totalDeductions: variableDeductions + insuranceAmount`

**Solution:** Remove insurance from `totalDeductions` since it's already in `earnedSalary`

**Before:**
```typescript
totalDeductions: variableDeductions + toNumber(salaryConfig?.insuranceAmount),
```

**After:**
```typescript
// Preview mode (line 551)
const totalDeductionsAmount = variableDeductions + earlyLeaveDeductionAmount;

// Backend mode (line 713)
const totalDeductionsAmount = variableDeductions + earlyLeaveDedAmount;
```

---

### 4.2 Net Pay Formula - FIXED ❌→✅

**Problem:** Net pay wasn't accounting for early leave deductions

**Before:**
```typescript
const netPay = earnedSalary + variableEarnings - variableDeductions;
```

**After (Preview mode - line 545):**
```typescript
const netPay = earnedSalary + variableEarnings - variableDeductions - earlyLeaveDeductionAmount;
```

**After (Backend mode - line 706):**
```typescript
const computedNetPay = earnedSalary + variableEarnings - variableDeductions - earlyLeaveDedAmount;
```

**Formula:**
```
netPay = earnedSalary (with insurance already deducted)
       + bonuses (variableEarnings)
       - advances & penalties (variableDeductions)
       - early leave deduction
```

---

### 4.3 Early Leave Deduction Tracking - FIXED ❌→✅

**Problem:** Early leave was calculated but hardcoded to 0 in the result

**Preview Mode (Lines 538-540, 569-570):**
```typescript
// Calculate early leave deduction amount
const dailyRate = calcGross / STANDARD_WORK_DAYS;
const minuteRate = dailyRate / (HOURS_PER_DAY * 60);
const earlyLeaveDeductionAmount = earlyLeaveMinutes * minuteRate;

// In return object:
totalEarlyLeaveMinutes: earlyLeaveMinutes,  // ✅ Was: 0
earlyLeaveDeduction: earlyLeaveDeductionAmount,  // ✅ Was: 0
```

**Backend Mode (Lines 691-698, 737-738):**
```typescript
const backendEarlyLeaveMinutes = Number(backendItem.earlyLeaveMinutes ?? 0);
const backendEarlyLeaveDeduction = toNumber(backendItem.earlyLeaveDeduction);

// Use backend value if available, otherwise calculate
const earlyLeaveDedAmount = backendEarlyLeaveDeduction > 0 
  ? backendEarlyLeaveDeduction 
  : (earlyLeaveMinutes * (calcGross / STANDARD_WORK_DAYS) / (HOURS_PER_DAY * 60));

// In return object:
totalEarlyLeaveMinutes: backendEarlyLeaveMinutes,
earlyLeaveDeduction: earlyLeaveDedAmount,
```

---

## 5. **Debug Logging Added** ✓

Added comprehensive console logging to track bonus data flow:

```typescript
// In useBonuses hook
console.log('[useBonuses] API response:', data);
console.log('[useBonuses] Period filter:', params?.period);
console.log('[useBonuses] Returning data.data array, count:', data.data.length);

// In payroll page
console.log('[Payroll-Preview] Total bonuses fetched:', bonuses.length, 'for month:', month);
console.log('[Payroll-Preview] Employee ${employeeName} has ${employeeBonuses.length} bonus(es), total: ${variableEarnings}');
```

---

## Testing Checklist

- [ ] Open browser console (F12)
- [ ] Navigate to payroll page
- [ ] Check console logs for:
  - `[useBonuses] API response:` - verify bonuses are fetched
  - `[useBonuses] Returning data.data array, count: X` - verify pagination handling
  - `[Payroll-Preview] Total bonuses fetched: X` - verify total count
  - `[Payroll-Preview] Employee ... has X bonus(es)` - verify per-employee mapping
- [ ] Verify bonuses column shows non-zero values for employees with bonuses
- [ ] Verify net pay calculation includes bonuses
- [ ] Verify insurance is not double-counted
- [ ] Verify early leave deductions are applied

---

## Files Modified

1. **`hooks/useBonuses.ts`**
   - Increased fetch limit to 500
   - Reordered response extraction logic
   - Added detailed logging

2. **`app/(dashboard)/salaries/payroll/page.tsx`**
   - Fixed insurance double-counting in both preview and backend modes
   - Fixed netPay formula to include early leave deductions
   - Fixed earlyLeaveDeduction from hardcoded 0 to actual calculated values
   - Added debug logging for bonus tracking
   - Fixed variable scope issue for `earlyLeaveMinutes` in backend mode

---

## Expected Behavior After Fix

1. ✅ Bonuses from "Bonuses Page" appear in "Payroll Page" for the correct month
2. ✅ Each employee's bonus total is correctly summed (bonusAmount + assistanceAmount)
3. ✅ Net pay calculation includes bonuses: `earnedSalary + bonuses - deductions - earlyLeave`
4. ✅ Insurance is only deducted once (in earnedSalary calculation)
5. ✅ Early leave deductions are tracked and applied to net pay
6. ✅ Console logs show complete data flow for debugging
