import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import axios from "axios";
import apiClient from "@/lib/api-client";
import { HH_MM_REGEX, normalizeHHmm } from "@/lib/attendance-time";
import { toLocalDateString } from "@/lib/date-time";
import { QUERY_GC_TIME, QUERY_STALE_TIME } from "@/lib/query-cache";
import { getApiErrorMessage as getErrorMessage } from "@/lib/http/error";

export type AttendanceSource = "manual" | "device";
export type AttendanceType = "IN" | "OUT";

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  timestamp: string;
  date: string;
  type: AttendanceType;
  source?: string;
  verified?: boolean;
  deviceId?: string;
  location?: string;
  notes?: string;
}

export interface AttendanceDailyRecord {
  key: string;
  employeeId: string;
  date: string;
  checkIn: string;
  checkOut: string;
  source: AttendanceSource;
  checkInRecordId?: string;
  checkOutRecordId?: string;
  verified: boolean;
}

interface AttendanceListResponse {
  records: AttendanceRecord[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  dailyRecords: AttendanceDailyRecord[];
}

export interface AttendanceQueryParams {
  employeeId?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface AttendancePayload {
  employeeId: string;
  timestamp: string;
  type: AttendanceType;
  source?: AttendanceSource;
  deviceId?: string;
  location?: string;
  notes?: string;
  verified?: boolean;
}

export interface MarkAttendanceInput {
  employeeId: string;
  date?: string; // YYYY-MM-DD (defaults to local today)
  checkIn?: string; // HH:mm
  checkOut?: string; // HH:mm
  source?: AttendanceSource;
  deviceId?: string;
  location?: string;
  notes?: string;
}

const toDateKey = (value: string | Date) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return toLocalDateString(date);
};

const toHHmm = (value: string | Date) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
};

const buildTimestampFromDateAndTime = (date: string, hhmm: string) => {
  if (!HH_MM_REGEX.test(hhmm)) {
    throw new Error("الوقت يجب أن يكون بصيغة HH:mm");
  }

  // مهم: إرسال timezone offset المحلي يمنع انحراف الساعات عند خادم يعمل بتوقيت مختلف (مثل UTC).
  // المثال: 14:30 في GMT+3 تُرسل 2026-04-15T14:30:00+03:00 وتُعرض لاحقًا بنفس 14:30 محليًا.
  const localDateTime = new Date(`${date}T${hhmm}:00`);
  if (Number.isNaN(localDateTime.getTime())) {
    throw new Error("تعذر تكوين التاريخ والوقت");
  }

  const offsetMinutes = -localDateTime.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absOffset = Math.abs(offsetMinutes);
  const offsetHours = String(Math.floor(absOffset / 60)).padStart(2, "0");
  const offsetMins = String(absOffset % 60).padStart(2, "0");

  return `${date}T${hhmm}:00${sign}${offsetHours}:${offsetMins}`;
};

const normalizeSource = (source?: string): AttendanceSource => (source === "device" ? "device" : "manual");

const inDateRange = (date: string, startDate?: string, endDate?: string) => {
  if (!startDate && !endDate) return true;
  if (startDate && date < startDate) return false;
  if (endDate && date > endDate) return false;
  return true;
};

const toDailyRecords = (records: AttendanceRecord[], startDate?: string, endDate?: string): AttendanceDailyRecord[] => {
  const grouped = new Map<string, AttendanceRecord[]>();

  for (const record of records) {
    const date = record.date || toDateKey(record.timestamp);
    if (!date || !inDateRange(date, startDate, endDate)) continue;

    const key = `${record.employeeId}-${date}`;
    const current = grouped.get(key) || [];
    current.push({ ...record, date });
    grouped.set(key, current);
  }

  const rows: AttendanceDailyRecord[] = [];

  grouped.forEach((events, key) => {
    const sorted = [...events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const inEvents = sorted.filter((x) => x.type.toUpperCase() === "IN");
    const outEvents = sorted.filter((x) => x.type.toUpperCase() === "OUT");

    const firstIn = inEvents[0];
    const lastOut = outEvents[outEvents.length - 1];
    const sample = sorted[0];

    const source = sorted.some((x) => normalizeSource(x.source) === "device") ? "device" : "manual";
    const verified = sorted.every((x) => x.verified !== false);

    rows.push({
      key,
      employeeId: sample.employeeId,
      date: sample.date || toDateKey(sample.timestamp),
      checkIn: firstIn ? toHHmm(firstIn.timestamp) : "",
      checkOut: lastOut ? toHHmm(lastOut.timestamp) : "",
      source,
      checkInRecordId: firstIn?.id,
      checkOutRecordId: lastOut?.id,
      verified,
    });
  });

  return rows.sort((a, b) => `${b.date}-${b.employeeId}`.localeCompare(`${a.date}-${a.employeeId}`));
};

export const useAttendance = (params?: AttendanceQueryParams) => {
  const queryClient = useQueryClient();
  const fallbackToday = toLocalDateString();
  const safeLimit = Math.min(Math.max(params?.limit ?? 50, 1), 100);

  const singleDayFromRange =
    !params?.date &&
    Boolean(params?.startDate && params?.endDate) &&
    params?.startDate === params?.endDate
      ? params?.startDate
      : undefined;

  const requestDate =
    params?.date ??
    singleDayFromRange ??
    (!params?.startDate && !params?.endDate ? fallbackToday : undefined);
  const resolvedStartDate = params?.startDate ?? requestDate;
  const resolvedEndDate = params?.endDate ?? requestDate;

  const query = useQuery<AttendanceListResponse>({
    queryKey: [
      "attendance",
      params?.employeeId || "all-employees",
      requestDate || "all-dates",
      resolvedStartDate || "no-start",
      resolvedEndDate || "no-end",
      params?.page || 1,
      safeLimit,
    ],
    queryFn: async () => {
      const requestList = async (requestParams: {
        employeeId?: string;
        date?: string;
        page?: number;
        limit: number;
      }) => {
        return apiClient.get("/attendance", {
          params: requestParams,
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        });
      };

      const requestParams = {
        employeeId: params?.employeeId,
        date: requestDate,
        page: params?.page,
        limit: safeLimit,
      };

      try {
        const res = await requestList(requestParams);
        let records: AttendanceRecord[] = Array.isArray(res.data?.records) ? res.data.records : [];
        const pagination = res.data;

        // عند عدم تحديد صفحة: حمّل جميع الصفحات لتجنب نقصان السجلات بسبب pagination.
        if (!params?.page && pagination?.pages && pagination.pages > 1) {
          for (let page = 2; page <= pagination.pages; page += 1) {
            const pageRes = await requestList({ ...requestParams, page });
            const pageRecords: AttendanceRecord[] = Array.isArray(pageRes.data?.records) ? pageRes.data.records : [];
            records = records.concat(pageRecords);
          }
        }

        return {
          records,
          pagination,
          dailyRecords: toDailyRecords(records, resolvedStartDate, resolvedEndDate),
        };
      } catch (error: unknown) {
        const status = axios.isAxiosError(error) ? error.response?.status : undefined;

        // Fallback: بعض بيئات الخادم ترفض date في list endpoint
        if (status === 400 && requestDate) {
          const fallbackParams = {
            employeeId: params?.employeeId,
            page: params?.page,
            limit: safeLimit,
          };

          const retryRes = await requestList(fallbackParams);
          let retryRecords: AttendanceRecord[] = Array.isArray(retryRes.data?.data) ? retryRes.data.data : [];
          const retryPagination = retryRes.data;

          if (!params?.page && retryPagination?.pages && retryPagination.pages > 1) {
            for (let page = 2; page <= retryPagination.pages; page += 1) {
              const pageRes = await requestList({ ...fallbackParams, page });
              const pageRecords: AttendanceRecord[] = Array.isArray(pageRes.data?.records) ? pageRes.data.records : [];
              retryRecords = retryRecords.concat(pageRecords);
            }
          }

          return {
            records: retryRecords,
            pagination: retryPagination,
            dailyRecords: toDailyRecords(retryRecords, resolvedStartDate, resolvedEndDate),
          };
        }

        throw new Error(getErrorMessage(error, "فشل تحميل بيانات الحضور"));
      }
    },
    staleTime: QUERY_STALE_TIME.FAST,
    gcTime: QUERY_GC_TIME.RELAXED,
  });

  const createAttendance = useMutation({
    mutationFn: async (payload: AttendancePayload) => {
      const cleanPayload = {
        ...payload,
        source: payload.source || "manual",
      };
      return await apiClient.post("/attendance", cleanPayload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });

  const updateAttendance = useMutation({
    mutationFn: async ({ recordId, data }: { recordId: string; data: Partial<AttendancePayload> }) => {
      const cleanPayload = {
        ...data,
        source: data.source || "manual",
      };
      return await apiClient.put(`/attendance/${recordId}`, cleanPayload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"], exact: false });
    },
  });

  const markAttendance = useMutation({
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ["attendance"], exact: false });

      const previousEntries = queryClient.getQueriesData<AttendanceListResponse>({
        queryKey: ["attendance"],
        exact: false,
      });

      const attendanceDate = input.date || toLocalDateString();
      const source = input.source || "manual";

      const normalizedCheckIn = normalizeHHmm(input.checkIn);
      const normalizedCheckOut = normalizeHHmm(input.checkOut);


      queryClient.setQueriesData<AttendanceListResponse>(
        { queryKey: ["attendance"], exact: false },
        (old) => {
          if (!old) return old;

          const nextRecords = [...(old.records || [])];

          const upsertRecord = (type: AttendanceType, hhmm?: string, pickLatest = false) => {
            if (!hhmm) return;

            let timestamp: string;
            try {
              timestamp = buildTimestampFromDateAndTime(attendanceDate, hhmm);
            } catch {
              return;
            }

            const matchingIndexes = nextRecords
              .map((record, index) => ({
                record,
                index,
                dateKey: record.date || toDateKey(record.timestamp),
              }))
              .filter(
                ({ record, dateKey }) =>
                  record.employeeId === input.employeeId &&
                  record.type === type &&
                  dateKey === attendanceDate,
              )
              .map(({ index }) => index);

            const targetIndex =
              matchingIndexes.length === 0
                ? -1
                : pickLatest
                  ? matchingIndexes[matchingIndexes.length - 1]
                  : matchingIndexes[0];

            if (targetIndex >= 0) {
              nextRecords[targetIndex] = {
                ...nextRecords[targetIndex],
                employeeId: input.employeeId,
                type,
                timestamp,
                date: attendanceDate,
                source,
              };
              return;
            }

            nextRecords.push({
              id: `temp-${input.employeeId}-${attendanceDate}-${type}`,
              employeeId: input.employeeId,
              type,
              timestamp,
              date: attendanceDate,
              source,
            });
          };

          upsertRecord("IN", normalizedCheckIn, false);
          upsertRecord("OUT", normalizedCheckOut, true);

          const rowKey = `${input.employeeId}-${attendanceDate}`;
          const nextDaily = [...(old.dailyRecords || [])];
          const rowIndex = nextDaily.findIndex((row) => row.key === rowKey);

          const nextRow: AttendanceDailyRecord = rowIndex >= 0
            ? { ...nextDaily[rowIndex] }
            : {
                key: rowKey,
                employeeId: input.employeeId,
                date: attendanceDate,
                checkIn: "",
                checkOut: "",
                source,
                verified: true,
              };

          if (normalizedCheckIn) nextRow.checkIn = normalizedCheckIn;
          if (normalizedCheckOut) nextRow.checkOut = normalizedCheckOut;
          nextRow.source = source;

          if (rowIndex >= 0) {
            nextDaily[rowIndex] = nextRow;
          } else {
            nextDaily.push(nextRow);
          }

          return {
            ...old,
            records: nextRecords,
            dailyRecords: nextDaily.sort((a, b) => `${b.date}-${b.employeeId}`.localeCompare(`${a.date}-${a.employeeId}`)),
          };
        },
      );

      return { previousEntries };
    },
    mutationFn: async (input: MarkAttendanceInput) => {
      if (!input.checkIn && !input.checkOut) {
        throw new Error("يجب إدخال checkIn أو checkOut على الأقل");
      }

      const normalizedCheckIn = normalizeHHmm(input.checkIn);
      const normalizedCheckOut = normalizeHHmm(input.checkOut);

      if (input.checkIn && !normalizedCheckIn) {
        throw new Error("صيغة checkIn غير صحيحة. استخدم HH:mm");
      }

      if (input.checkOut && !normalizedCheckOut) {
        throw new Error("صيغة checkOut غير صحيحة. استخدم HH:mm");
      }

      const attendanceDate = input.date || toLocalDateString();
      const source = input.source || "manual";

      const existingRes = await apiClient.get(
        `/attendance/employee/${input.employeeId}/date/${attendanceDate}`
      );

      const existingRecords: AttendanceRecord[] = Array.isArray(existingRes.data?.records) ? existingRes.data.records : [];

      const inRecords = [...existingRecords]
        .filter((x) => x.type === "IN")
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      const outRecords = [...existingRecords]
        .filter((x) => x.type === "OUT")
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      let lastResponse: unknown = null;

      if (normalizedCheckIn) {
        const checkInTimestamp = buildTimestampFromDateAndTime(attendanceDate, normalizedCheckIn);
        const payload: AttendancePayload = {
          employeeId: input.employeeId,
          timestamp: checkInTimestamp,
          type: "IN",
          source,
          deviceId: input.deviceId,
          location: input.location,
          notes: input.notes,
        };

        if (inRecords[0]?.id) {
          lastResponse = await apiClient.put(`/attendance/${inRecords[0].id}`, payload);
        } else {
          lastResponse = await apiClient.post("/attendance", payload);
        }
      }

      if (normalizedCheckOut) {
        const checkOutTimestamp = buildTimestampFromDateAndTime(attendanceDate, normalizedCheckOut);
        const payload: AttendancePayload = {
          employeeId: input.employeeId,
          timestamp: checkOutTimestamp,
          type: "OUT",
          source,
          deviceId: input.deviceId,
          location: input.location,
          notes: input.notes,
        };

        // Biometric-ready upsert: if same employee+date exists, update existing OUT record instead of inserting duplicates.
        if (outRecords[outRecords.length - 1]?.id) {
          const outRecordId = outRecords[outRecords.length - 1].id;
          lastResponse = await apiClient.put(`/attendance/${outRecordId}`, payload);
        } else {
          // No OUT event exists yet for that date: create first OUT event.
          lastResponse = await apiClient.post("/attendance", payload);
        }
      }

      return lastResponse;
    },
    onSuccess: () => {
      toast.success("تم تسجيل الحضور بنجاح");
    },
    onError: (error: unknown, _variables, context) => {
      if (context?.previousEntries?.length) {
        for (const [queryKey, previousData] of context.previousEntries) {
          queryClient.setQueryData(queryKey, previousData);
        }
      }

      const message = getErrorMessage(error, "فشل تسجيل الحضور");
      toast.error(message);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["attendance"], exact: false });
      await queryClient.refetchQueries({ queryKey: ["attendance"], exact: false });

      // ── Invalidate deductions after a short delay to account for fire-and-forget
      //    aggregation on the backend (EARLY_LEAVE_MINUTES may not be written yet) ──
      await queryClient.invalidateQueries({ queryKey: ["attendance-deductions"], exact: false });
      // Schedule a delayed refetch so the aggregation engine has time to persist
      setTimeout(() => {
        void queryClient.refetchQueries({ queryKey: ["attendance-deductions"], exact: false });
      }, 1500);
    },
  });

  return {
    ...query,
    createAttendance,
    updateAttendance,
    markAttendance,
  };
};

