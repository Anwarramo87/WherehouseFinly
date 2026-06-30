/**
 * Kiosk / device attendance API client.
 * Sends X-Device-Api-Key for /attendance/public/* endpoints in production.
 */

const getDeviceApiKey = () =>
  process.env.NEXT_PUBLIC_DEVICE_API_KEY || process.env.DEVICE_API_KEY || "";

const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    return "/api";
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";
};

export type DeviceCheckPayload = {
  employeeId: string;
};

export async function deviceCheckIn(payload: DeviceCheckPayload) {
  return deviceRequest("POST", "/attendance/public/check-in", payload);
}

export async function deviceCheckOut(payload: DeviceCheckPayload) {
  return deviceRequest("POST", "/attendance/public/check-out", payload);
}

export async function deviceTodayAttendance(employeeId: string) {
  return deviceRequest("GET", `/attendance/public/employee/${encodeURIComponent(employeeId)}/today`);
}

async function deviceRequest(method: string, path: string, body?: unknown) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const apiKey = getDeviceApiKey();
  if (apiKey) {
    headers["X-Device-Api-Key"] = apiKey;
  }

  const response = await fetch(`${getBaseUrl()}${path}`, {
    method,
    headers,
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof data?.message === "string" ? data.message : `Device API error (${response.status})`,
    );
  }

  return data;
}
