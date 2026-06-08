# Factory Frontend Testing Checklist

Run from project root:

```bash
npm run lint
npm run typecheck
npm run build
npm run dev
```

## 1. Auth Flow

1. Open `/` while logged out.
Expected: redirected to `/login`.

2. Login with valid credentials.
Expected: redirected to `/home`.

3. Refresh on any dashboard page like `/employees`.
Expected: still authenticated and page loads.

4. Click logout from sidebar.
Expected: redirected to `/login` and protected pages redirect back to login.

5. Try wrong credentials.
Expected: clear error message appears and no redirect.

## 2. Session Guard Behavior

1. Open `/login` while already authenticated.
Expected: redirected to `/home`.

2. Remove session manually from browser storage/cookies and open `/home`.
Expected: redirected to `/login`.

3. Open multiple protected tabs quickly.
Expected: no redirect loop and stable navigation to login if session is invalid.

## 3. Global App Boundaries

1. Visit an invalid route like `/unknown-page`.
Expected: custom not-found page appears with link back to home.

2. Trigger a runtime error in a page (temporary local test).
Expected: global error page appears with retry action.

3. Navigate between pages with slower network throttling.
Expected: global loading UI appears while route resolves.

## 4. Core Screens Smoke

1. Employees: add/edit/delete modal opens and closes correctly.
2. Salaries: manage salary modal and advances/bonuses modals open with correct prefilled data.
3. Inventory: add item and adjust stock modals open with expected defaults.
4. Import data: page opens and upload controls are responsive.
5. Import preview accepts `.xlsx` and `.csv` files and blocks `.xls` with a clear message.

## Notes

- All checks are local-only. No GitHub push is required.
- If backend is unavailable, auth and protected pages should show controlled redirects/errors, not blank crashes.
