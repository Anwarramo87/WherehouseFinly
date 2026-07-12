# Factory — Next.js Frontend

A Next.js 16 warehouse management frontend with TanStack Query, Zustand state management, and real-time attendance tracking.

## 📖 Full Documentation

Comprehensive documentation is available in the [`docs/`](./docs/) folder:

- [`docs/MAIN_README.md`](./docs/MAIN_README.md) — Full project overview
- [`docs/QUICK_START.md`](./docs/QUICK_START.md) — Quick start guide
- [`docs/QUICK_DEPLOYMENT_GUIDE.md`](./docs/QUICK_DEPLOYMENT_GUIDE.md) — Deployment guide
- [`docs/BACKEND_API_REQUIREMENTS.md`](./docs/BACKEND_API_REQUIREMENTS.md) — API contract reference
- [`docs/INTEGRATION_TESTING_GUIDE.md`](./docs/INTEGRATION_TESTING_GUIDE.md) — Integration testing guide
- [`docs/REFACTORING_RECOMMENDATIONS.md`](./docs/REFACTORING_RECOMMENDATIONS.md) — Code quality notes

---

## 🏗️ Architecture Overview

### Route Groups

The app uses Next.js App Router with route groups for layout separation:

- **`(auth)/`** — Public authentication pages (login, etc.)
  - No authentication required
  - Redirects to `/home` if already authenticated
  
- **`(dashboard)/`** — Protected application pages
  - Requires authentication via `proxy.ts` middleware
  - Role-based access control via `lib/route-access.ts`
  - All pages share a common dashboard layout

### API Proxy Pattern

**File:** `app/api/[...path]/route.ts`

All backend requests go through a Next.js API route that acts as a reverse proxy:

```
Frontend (browser) → /api/employees → Next.js proxy → http://backend:5003/api/v1/employees
```

**Why?**
- Centralizes CORS handling
- Hides backend URL from browser (security)
- Enables request/response transformation in one place
- Simplifies environment-based backend switching

**Caching:**
By default, **all responses have caching disabled** (`Cache-Control: no-store`) because most data is volatile (attendance, payroll, inventory):

```typescript
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
```

**Exception:** Low-volatility endpoints like `/departments` and `/roles` could benefit from short-lived caching (not yet implemented — see Phase 4 in refactoring plan).

---

## 🔧 Local Development Setup

### Prerequisites

- Node.js 20+
- npm or yarn
- Backend running at `http://localhost:5003` (or configure `NEXT_PUBLIC_API_URL`)

### Installation

```bash
npm install
```

### Backend Configuration

The app supports switching between **local** and **remote** (Railway) backends:

**Using the CLI helper:**
```bash
# Switch to local backend (http://localhost:5003)
npm run backend:local

# Switch to remote backend (Railway production)
npm run backend:remote

# Check current backend
npm run backend:status
```

**Manual configuration:**
Edit `.env.local` (create if missing):

```env
# Local backend
NEXT_PUBLIC_API_URL=http://localhost:5003/api/v1

# Or Railway backend
# NEXT_PUBLIC_API_URL=https://werehouse-production-f4f4.up.railway.app/api/v1
```

**Backend switcher script:** `scripts/switch-backend.js` automates this by commenting/uncommenting the correct line in `.env.local`.

### Run Development Server

```bash
npm run dev
```

Or with Webpack (instead of default Turbopack):
```bash
npm run dev:webpack
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### Combined shortcuts

```bash
# Start dev server with local backend
npm run dev:local

# Start dev server with remote backend
npm run dev:remote
```

---

## 🧪 Testing

```bash
# Run all tests once
npm run test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test -- --coverage
```

**Coverage thresholds:** 50% for lines/functions/branches/statements (enforced in `vitest.config.ts`).

**Test files:** `**/*.test.ts` and `**/*.test.tsx`

**Example test patterns:**
- `lib/financial-settlement-manager.test.ts` — Business logic unit tests
- `lib/employee-status-manager.test.ts` — State transition tests
- `hooks/useEmployees.test.ts` — React Query hook tests

---

## 🎨 Code Quality

### Linting

```bash
# Check for issues
npm run lint

# Auto-fix where possible
npm run lint:fix
```

### Type Checking

```bash
npm run typecheck
```

### Formatting

```bash
# Format all files
npm run format

# Check formatting without changes
npm run format:check
```

### Full Verification

Run all checks before committing:

```bash
npm run verify
```

This runs: `lint && typecheck && build`

---

## 📦 Building for Production

```bash
npm run build
```

**Output:** `.next/` directory

**Start production server:**
```bash
npm run start
```

### Bundle Analysis

```bash
npm run analyze
```

Opens bundle analyzer on port 4010 to inspect bundle sizes.

---

## 🛡️ Security

### Dependency Auditing

```bash
npm run audit:deps
```

Checks for vulnerabilities at `high` severity or above.

**CI Integration:** This command runs automatically in CI (`.github/workflows/ci.yml`).

### Secret Scanning

The CI pipeline uses `gitleaks-action` to scan for accidentally committed secrets (API keys, tokens, connection strings). Fails the build if any are found.

---

## 🔐 Authentication & Authorization

### Authentication State

Managed by Zustand store: `stores/auth-store.ts`

- Persisted to `localStorage` as `auth-store-v1`
- Syncs with `lib/auth-session.ts` for cookie-based auth
- User object includes: `id`, `username`, `role`, `roles[]`, `permissions[]`

### Route Protection

**Middleware:** `proxy.ts` intercepts all requests and:
1. Checks for auth cookies/headers
2. Calls `GET /auth/me` to validate session (with caching)
3. Redirects to `/login` if unauthenticated
4. Checks role/permission requirements via `lib/route-access.ts`

**Protected routes:** Everything under `(dashboard)/` except `/login`.

**Permission checking:**
```typescript
import { usePermissions } from "@/lib/permissions/hooks";

const { hasPermission, hasAnyPermission } = usePermissions();

if (hasPermission("edit_employees")) {
  // ...
}
```

---

## 📁 Project Structure

```
Factory/
├── app/
│   ├── (auth)/              # Public pages (login)
│   ├── (dashboard)/         # Protected pages (home, salaries, employees, etc.)
│   ├── api/
│   │   └── [...path]/       # Backend proxy
│   ├── layout.tsx
│   └── page.tsx
├── components/              # Reusable UI components
├── hooks/                   # Custom React hooks (data fetching with TanStack Query)
├── lib/                     # Utility functions, API clients, business logic
│   ├── permissions/         # Role-based access control
│   ├── realtime/            # Socket.io attendance tracking
│   ├── api-client.ts        # Axios instance with auth headers
│   └── route-access.ts      # Route permission definitions
├── stores/                  # Zustand state management
│   └── auth-store.ts
├── types/                   # TypeScript type definitions
├── public/                  # Static assets
├── docs/                    # Additional documentation
├── scripts/
│   └── switch-backend.js    # Backend URL switcher
└── .github/workflows/       # CI/CD pipelines
```

---

## 🚀 Deployment

See [`docs/QUICK_DEPLOYMENT_GUIDE.md`](./docs/QUICK_DEPLOYMENT_GUIDE.md) for detailed deployment instructions.

**Environment Variables (Production):**

```env
NEXT_PUBLIC_API_URL=https://your-backend.example.com/api/v1
NEXT_PUBLIC_APP_URL=https://your-frontend.example.com
CORS_ORIGIN=https://your-frontend.example.com
```

---

## 🤝 Contributing

1. Run `npm run verify` before committing
2. Follow existing patterns:
   - Use TanStack Query for data fetching (hooks in `hooks/`)
   - Use Zustand for client state (stores in `stores/`)
   - Use Tailwind for styling
   - Keep components under ~300 lines (extract sub-components as needed)
3. Add tests for new business logic in `lib/`
4. Update types in `types/` when adding new API responses

---

## 🐛 Known Issues

See [`docs/REFACTORING_RECOMMENDATIONS.md`](./docs/REFACTORING_RECOMMENDATIONS.md) for current technical debt and improvement opportunities.

---

## 📜 License

Private project. All rights reserved.

---

## 🆘 Support

For issues or questions, contact the development team or refer to the full documentation in [`docs/MAIN_README.md`](./docs/MAIN_README.md).
