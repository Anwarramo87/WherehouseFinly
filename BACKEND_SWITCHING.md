# Backend Switching Guide

This guide explains how to switch between local and uploaded (Railway) backends in development.

## Quick Start

### Option 1: Using NPM Scripts (Recommended)

The easiest way to switch backends and restart the dev server:

```bash
# Switch to local backend and start dev server
npm run dev:local

# Switch to remote backend and start dev server
npm run dev:remote

# Just switch without restarting (then restart dev server manually)
npm run backend:local
npm run backend:remote

# Check current backend status
npm run backend:status
```

### Option 2: Manual Configuration

Edit `.env.local` in the Factory folder and uncomment the backend you want:

```env
# For LOCAL backend (default):
NEXT_PUBLIC_API_URL=http://localhost:5001/api

# For REMOTE backend (Railway):
# NEXT_PUBLIC_API_URL=https://werehouse-production-f4f4.up.railway.app/api
```

Then restart your dev server:
```bash
npm run dev
```

## Configuration Details

**Local Backend:**
- URL: `http://localhost:5001/api`
- Requires: Backend running on port 5001 (`npm run start:dev` in backend folder)
- Best for: Development, testing, local changes
- Session timeout: 1.5 seconds (responsive)

**Remote Backend (Railway):**
- URL: `https://werehouse-production-f4f4.up.railway.app/api`
- No local backend required
- Best for: Testing against live data, production behavior
- Session timeout: 5 seconds (allows for network latency)

## How It Works

1. **Configuration**: The `NEXT_PUBLIC_API_URL` environment variable controls which backend is used
2. **API Client**: The [lib/api-url.ts](../lib/api-url.ts) module normalizes and validates the URL
3. **Proxy**: The [proxy.ts](../proxy.ts) middleware routes `/auth/me` checks to the configured backend
4. **Session Cache**: Successful auth sessions are cached for 10 minutes to reduce backend calls

## Switching Between Backends

When you need to switch:

1. **If dev server is running:**
   - Stop the dev server (Ctrl+C)
   - Run `npm run backend:local` or `npm run backend:remote`
   - Run `npm run dev` to restart

2. **Or use the combined command:**
   ```bash
   npm run dev:local    # Switch and restart in one command
   npm run dev:remote
   ```

3. **Or manually edit:** `.env.local` and restart dev server

## Troubleshooting

**Frontend can't reach local backend:**
- Make sure backend is running: `npm run start:dev` (in backend folder on port 5001)
- Check proxy.ts timeout (SESSION_CHECK_TIMEOUT_MS = 1500ms in dev)
- Check CORS configuration on backend

**Remote backend shows 401/403 errors:**
- Login credentials might be for a different backend
- Try logging out and back in
- Check if account exists on remote system

**Changes not taking effect:**
- After switching backends, **always restart the dev server**
- Environment variables are only read at startup
- Frontend needs at least one restart, backend might need multiple

**Check current status:**
```bash
npm run backend:status
```

## Performance Notes

- **Local backend**: Faster response times, 1.5s session timeout
- **Remote backend**: Network latency included, 5s session timeout
- **Session caching**: Auth results cached for 10 minutes (both backends)
  - First request will check backend
  - Subsequent requests use cache (instant)
  - Cache clears on 401 or when explicitly logging out

## Files Modified

- `.env.local` — Backend URL configuration
- `package.json` — Added npm scripts
- `scripts/switch-backend.js` — Automated backend switcher tool
- `proxy.ts` — Uses `NEXT_PUBLIC_API_URL` for auth checks
- `lib/api-url.ts` — Normalizes API URLs

