# Debug Session: login-500-error

Status: OPEN

## Symptom
- Login request returns HTTP 500 from `/api/auth/login` and `:5001/api/v1/auth/login`.

## Scope
- Frontend login flow
- Backend authentication endpoint
- Environment/config mismatch

## Initial Hypotheses
- Frontend is calling the wrong auth URL or route prefix.
- `NEXT_PUBLIC_API_URL` is misconfigured and causes requests to hit an invalid backend path.
- Frontend request payload shape does not match backend DTO expectations.
- Backend auth service is throwing at runtime because of missing env/database dependency.
- There is a duplicate proxy/route layer in frontend that returns 500 before the request reaches the backend correctly.

## Evidence Log
- `trae-debug-log-login-500-error.ndjson`
- Line 1: `AuthController.login` receives the request normally.
- Line 2: `AuthService.login` starts and normalizes the username.
- Line 3: `GlobalExceptionFilter` captures a `PrismaClientKnownRequestError` with message: `Authentication failed against the database server, the provided database credentials ... are not valid`.

## Hypothesis Status
- A. Frontend is calling the wrong auth URL or route prefix. -> Rejected. The backend controller receives `POST /api/v1/auth/login`.
- B. `NEXT_PUBLIC_API_URL` is misconfigured and causes requests to hit an invalid backend path. -> Rejected. The request reaches the correct backend route.
- C. Frontend request payload shape does not match backend DTO expectations. -> Rejected. The controller accepts the request body and enters `AuthService.login`.
- D. Backend auth service is throwing at runtime because of missing env/database dependency. -> Confirmed. Prisma throws a database authentication error on the first user lookup.
- E. There is a duplicate proxy/route layer in frontend that returns 500 before the request reaches the backend correctly. -> Rejected. The 500 originates after the request reaches Nest.

## Actions
- Inspect frontend auth page, API client, and route handlers.
- Locate backend project and inspect auth controller/service.
- Add runtime instrumentation only after hypotheses are refined.
