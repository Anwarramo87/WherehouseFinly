import axios from "axios";
import apiClient from "@/lib/api-client";

const SUCCESS_TTL_MS = 30_000; // increased from 10s
const FAILURE_TTL_MS = 1_500;
const RATE_LIMIT_COOLDOWN_MS = 15_000;

type VerifyResult = {
  authorized: boolean;
  status?: number;
  rateLimited?: boolean;
  fromCache?: boolean;
};

// Simplified cache: single entry + single in-flight request
const cache: { result: VerifyResult | null; expiresAt: number; blockedUntil: number } = {
  result: null,
  expiresAt: 0,
  blockedUntil: 0,
};
let inFlight: Promise<VerifyResult> | null = null;

const AUTH_COOKIE_CANDIDATES = [
  process.env.NEXT_PUBLIC_AUTH_COOKIE_NAME,
  "warehouse_access_token",
  "auth_access_token",
  "access_token",
  "token",
].filter((value): value is string => Boolean(value && value.trim()));

const now = () => Date.now();

const hasSessionHints = () => {
  if (typeof document === "undefined") return false;
  const cookie = document.cookie || "";
  if (!cookie.trim()) return false;
  return AUTH_COOKIE_CANDIDATES.some((cookieName) => {
    const escaped = cookieName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?:^|;\\s*)${escaped}=`).test(cookie);
  });
};

const isFresh = () => Boolean(cache.result) && cache.expiresAt > now();

export const resetAuthVerificationCache = () => {
  cache.result = null;
  cache.expiresAt = 0;
  cache.blockedUntil = 0;
  inFlight = null;
};

export const verifyAuthSession = async (options?: { force?: boolean }) => {
  const force = options?.force === true;
  const currentTime = now();

  if (!force && !hasSessionHints()) {
    return { authorized: false, status: 401, fromCache: true };
  }

  if (!force && cache.blockedUntil > currentTime) {
    return { authorized: false, status: 429, rateLimited: true, fromCache: true };
  }

  if (!force && isFresh()) {
    return { ...cache.result!, fromCache: true };
  }

  // Dedupe: return existing in-flight request
  if (!force && inFlight) {
    return inFlight;
  }

  const request = (async (): Promise<VerifyResult> => {
    try {
      await apiClient.get("/auth/me", {
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });

      cache.result = { authorized: true };
      cache.expiresAt = now() + SUCCESS_TTL_MS;
      cache.blockedUntil = 0;
      return { authorized: true };
    } catch (error: unknown) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      const isRateLimited = status === 429;

      cache.result = { authorized: false, status, rateLimited: isRateLimited || undefined };
      cache.expiresAt = now() + FAILURE_TTL_MS;
      if (isRateLimited) cache.blockedUntil = now() + RATE_LIMIT_COOLDOWN_MS;

      return cache.result;
    } finally {
      inFlight = null;
    }
  })();

  inFlight = request;
  return request;
};
