import axios from "axios";
import apiClient from "@/lib/api-client";

const SUCCESS_TTL_MS = 10_000;
const FAILURE_TTL_MS = 1_500;
const RATE_LIMIT_COOLDOWN_MS = 15_000;

type VerifyResult = {
  authorized: boolean;
  status?: number;
  rateLimited?: boolean;
  fromCache?: boolean;
};

let inFlightVerification: Promise<VerifyResult> | null = null;
let cachedResult: VerifyResult | null = null;
let cacheExpiresAt = 0;
let blockedUntil = 0;
let cacheGeneration = 0;
let latestVerificationId = 0;
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
    const pattern = new RegExp(`(?:^|;\\s*)${escaped}=`);
    return pattern.test(cookie);
  });
};

const hasFreshCache = () => Boolean(cachedResult) && cacheExpiresAt > now();

export const resetAuthVerificationCache = () => {
  inFlightVerification = null;
  cachedResult = null;
  cacheExpiresAt = 0;
  blockedUntil = 0;
  cacheGeneration += 1;
};

export const verifyAuthSession = async (options?: { force?: boolean }) => {
  const force = options?.force === true;
  const currentTime = now();

  if (!force && !hasSessionHints()) {
    return { authorized: false, status: 401, fromCache: true };
  }

  if (!force && blockedUntil > currentTime) {
    return { authorized: false, status: 429, rateLimited: true, fromCache: true };
  }

  if (!force && hasFreshCache()) {
    return {
      ...(cachedResult as VerifyResult),
      fromCache: true,
    };
  }

  if (!force && inFlightVerification) {
    return inFlightVerification;
  }

  const generationAtStart = cacheGeneration;
  const verificationId = ++latestVerificationId;

  const verificationPromise: Promise<VerifyResult> = (async () => {
    try {
      await apiClient.get("/auth/me", {
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      if (generationAtStart === cacheGeneration) {
        cachedResult = { authorized: true };
        cacheExpiresAt = now() + SUCCESS_TTL_MS;
        blockedUntil = 0;
      }

      return { authorized: true };
    } catch (error: unknown) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;

      if (generationAtStart === cacheGeneration) {
        cachedResult = { authorized: false, status };
        cacheExpiresAt = now() + FAILURE_TTL_MS;

        if (status === 429) {
          blockedUntil = now() + RATE_LIMIT_COOLDOWN_MS;
          cachedResult = { authorized: false, status, rateLimited: true };
        }
      }

      return status === 429
        ? { authorized: false, status, rateLimited: true }
        : { authorized: false, status };
    } finally {
      if (generationAtStart === cacheGeneration && verificationId === latestVerificationId) {
        inFlightVerification = null;
      }
    }
  })();

  inFlightVerification = verificationPromise;

  return verificationPromise;
};

