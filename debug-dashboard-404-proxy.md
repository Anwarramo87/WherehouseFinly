# Debug Session: dashboard-404-proxy

Status: OPEN

## Symptom
- Frontend dashboard fetch returns `GET /api/dashboard 404`.

## Hypotheses
1. Frontend requests `/dashboard`, while backend only exposes `/dashboard/home`.
2. Next API proxy forwards correctly, but to a backend path that does not exist.
3. Dashboard hook is the only broken caller; auth/proxy are no longer the main cause for this symptom.
4. A stale frontend build could still be calling the old path after previous fixes.

## Evidence
- `hooks/useDashboard.ts` currently calls `apiClient.get('/dashboard')`.
- `src/dashboard/dashboard.controller.ts` exposes `@Get('home')` under `@Controller('dashboard')`.
- Backend route therefore resolves to `/api/v1/dashboard/home`.

## Next Step
- Patch the dashboard hook to request `/dashboard/home`.
