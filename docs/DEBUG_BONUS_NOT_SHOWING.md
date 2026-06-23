# Debug Guide: Bonus Not Showing in Payroll

## Problem
You added a bonus of 150,000 for employee "Doaa Ali" but the payroll page shows bonuses = 0.

## Step-by-Step Debugging

### 1. **Check Browser Console**

Open the payroll page and press **F12** to open Developer Tools → Console tab.

Look for these logs in order:

#### A. API Request
```
[useBonuses] Making API request with params: { employeeId: undefined, period: "2026-02", limit: 500 }
```
- ✅ Verify the `period` value matches the month you're viewing
- ✅ If period is wrong, change the month selector on the payroll page

#### B. API Response
```
[useBonuses] Full API response: { data: [...], total: 1, page: 1, limit: 500, totalPages: 1 }
[useBonuses] Response keys: [ 'data', 'total', 'page', 'limit', 'totalPages' ]
[useBonuses] data.data is array: true length: 1
[useBonuses] First bonus item: { id: "...", employeeId: "EMP001", bonusAmount: 150000, period: "2026-02", ... }
```

**Critical things to check:**
- ✅ Is `data.data` an array? (should be `true`)
- ✅ What is the `length`? (should be > 0 if bonus exists)
- ✅ Check the `First bonus item`:
  - `employeeId`: Does it match Doaa Ali's employee ID?
  - `bonusAmount`: Is it 150000?
  - `period`: Does it match the payroll month you're viewing?

#### C. Payroll Processing
```
[Payroll-Preview] Total bonuses fetched: 1 for month: 2026-02
[Payroll-Preview] Sample bonus: { id: "...", employeeId: "EMP001", ... }
[Payroll-Preview] Employee Doaa Ali (EMP001) has 1 bonus(es), total: 150000
```

**If you DON'T see the last log**, it means:
- The bonus employeeId doesn't match any employee in the payroll list
- The bonus period doesn't match the payroll month

---

### 2. **Verify Bonus Period Matches Payroll Month**

The most common issue is **period mismatch**:

#### Scenario 1: Bonus created in January, viewing January payroll ✅
- Bonus period: `"2026-01"`
- Payroll month: `"2026-01"`
- Result: **Bonus WILL show**

#### Scenario 2: Bonus created in January, viewing February payroll ❌
- Bonus period: `"2026-01"`
- Payroll month: `"2026-02"`
- Result: **Bonus will NOT show** (period mismatch)

#### Solution:
- Make sure the bonus period matches the payroll month you're viewing
- Or change the payroll month selector to match the bonus period

---

### 3. **Check Database Directly**

If console logs show 0 bonuses, check the database:

```sql
-- Check all bonuses for Doaa Ali
SELECT 
  id,
  "employeeId",
  "bonusAmount",
  "assistanceAmount",
  period,
  "createdAt"
FROM employee_bonuses
WHERE "employeeId" = (
  SELECT "employeeId" 
  FROM employees 
  WHERE name ILIKE '%Doaa Ali%'
)
ORDER BY "createdAt" DESC;
```

**Expected result:**
```
id | employeeId | bonusAmount | assistanceAmount | period   | createdAt
---|------------|-------------|------------------|----------|-------------------
1  | EMP001     | 150000.00   | 0.00             | 2026-02  | 2026-02-23 10:30:00
```

**If period is NULL or wrong:**
```sql
-- Fix the period
UPDATE employee_bonuses
SET period = '2026-02'
WHERE id = 1;
```

---

### 4. **Test API Directly**

Open browser console and run:

```javascript
// Test the bonuses API
fetch('/api/bonuses?period=2026-02&limit=500')
  .then(r => r.json())
  .then(data => console.log('API Response:', JSON.stringify(data, null, 2)));
```

**Expected response:**
```json
{
  "data": [
    {
      "id": "uuid-here",
      "employeeId": "EMP001",
      "bonusAmount": 150000,
      "bonusReason": "مكافأة",
      "assistanceAmount": 0,
      "period": "2026-02",
      "createdAt": "2026-02-23T10:30:00.000Z",
      "updatedAt": "2026-02-23T10:30:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 500,
  "totalPages": 1
}
```

---

### 5. **Common Issues & Solutions**

#### Issue 1: Bonus period is NULL
**Cause:** Bonus was created before period field was added or without period value

**Solution:** Update the bonus with correct period:
```sql
UPDATE employee_bonuses 
SET period = '2026-02' 
WHERE "employeeId" = 'EMP001' AND period IS NULL;
```

#### Issue 2: Viewing wrong month
**Cause:** Payroll page is showing a different month than the bonus period

**Solution:** 
- Check the month selector on the payroll page
- Make sure it matches the bonus period

#### Issue 3: Employee ID mismatch
**Cause:** Bonus employeeId doesn't match the employee's actual employeeId

**Solution:**
```sql
-- Find Doaa Ali's employeeId
SELECT "employeeId", name FROM employees WHERE name ILIKE '%Doaa Ali%';

-- Check bonus employeeId
SELECT "employeeId", "bonusAmount", period FROM employee_bonuses WHERE "bonusAmount" = 150000;

-- Fix if mismatched
UPDATE employee_bonuses 
SET "employeeId" = 'CORRECT_EMP_ID' 
WHERE id = bonus_id;
```

#### Issue 4: Bonus was soft-deleted
**Cause:** Bonus was deleted and moved to `deletedRecordHistory`

**Solution:**
```sql
-- Check if bonus was deleted
SELECT * FROM deletedRecordHistory 
WHERE "entityType" = 'bonus' 
AND "payload"->>'employeeId' = 'EMP001';
```

---

### 6. **Quick Fix: Manually Update Bonus Period**

If you find the bonus in database but period is wrong:

```sql
-- Find the bonus
SELECT id, "employeeId", "bonusAmount", period 
FROM employee_bonuses 
WHERE "bonusAmount" = 150000;

-- Update to correct period (e.g., current month)
UPDATE employee_bonuses 
SET period = '2026-02' 
WHERE "bonusAmount" = 150000;
```

---

## Expected Behavior After Fix

Once the period matches:

1. ✅ Console shows: `[useBonuses] ✅ Returning data.data array, count: 1`
2. ✅ Console shows: `[Payroll-Preview] Employee Doaa Ali (EMP001) has 1 bonus(es), total: 150000`
3. ✅ Payroll table shows: **المكافآت column = +150,000**
4. ✅ Net pay includes the bonus amount

---

## Still Not Working?

Share these console logs:
1. `[useBonuses] Making API request with params:`
2. `[useBonuses] Full API response:`
3. `[useBonuses] First bonus item:`
4. `[Payroll-Preview] Total bonuses fetched:`
5. Any errors in red

This will help identify the exact issue!
