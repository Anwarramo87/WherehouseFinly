import axios from "axios";

type ApiErrorBody = {
  message?: string | string[];
  error?: { message?: string | string[] };
};

/**
 * Extracts a human-readable error message from an unknown error value.
 * Handles Axios HTTP errors (unwraps server response body), plain Errors,
 * and anything else by returning the provided `fallback`.
 */
export const getApiErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    const raw =
      error.response?.data?.error?.message ?? error.response?.data?.message;

    if (Array.isArray(raw)) return raw.join(" | ");
    if (typeof raw === "string" && raw.trim()) return raw.trim();

    // Axios network-level message (e.g. "Network Error", "timeout")
    if (typeof error.message === "string" && error.message.trim()) {
      return error.message.trim();
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return fallback;
};
