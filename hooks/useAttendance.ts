import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import axios from "axios";
import apiClient from "@/lib/api-client";
import { getApiErrorMessage } from "@/lib/http/error";
import { HH_MM_REGEX, normalizeHHmm } from "@/lib/attendance-time";
import { toLocalDateString } from "@/lib/date-time";
import { QUERY_GC_TIME, QUERY_STALE_TIME } from "@/lib/query-cache";
import { queryKeys } from "@/lib/query-keys";

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
  period?: string; // YYYY-MM format
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

const normalizeSource = (source?: string): AttendanceSource =>
  source === "device" ? "device" : "manual";

const inDateRange = (date: string, startDate?: string, endDate?: string) => {
  if (!startDate && !endDate) return true;
  if (startDate && date < startDate) return false;
  if (endDate && date > endDate) return false;
  return true;
};

const toDailyRecords = (
  records: AttendanceRecord[],
  startDate?: string,
  endDate?: string,
): AttendanceDailyRecord[] => {
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
    const sorted = [...events].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

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

  return rows.sort((a, b) =>
    `${b.date}-${b.employeeId}`.localeCompare(`${a.date}-${a.employeeId}`),
  );
};

export const useAttendance = (params?: AttendanceQueryParams) => {
  const queryClient = useQueryClient();
  const fallbackToday = useMemo(toLocalDateString, []);
  const safeLimit = Math.min(Math.max(params?.limit ?? 50, 1), 100);

  // Calculate date range from period (YYYY-MM) if provided
  const { periodStart, periodEnd } = useMemo(() => {
    const period = params?.period;
    if (!period) return { periodStart: undefined, periodEnd: undefined };
    const [year, month] = period.split("-").map(Number);
    const start = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDay = new Date(year, month, 0).getDate();
    const end = `${year}-${String(month).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;
    return { periodStart: start, periodEnd: end };
  }, [params?.period]);

  const singleDayFromRange = useMemo(() => {
    return !params?.date &&
      Boolean(params?.startDate && params?.endDate) &&
      params?.startDate === params?.endDate
      ? params?.startDate
      : undefined;
  }, [params?.date, params?.startDate, params?.endDate]);

  const requestDate = useMemo(() => {
    return (
      params?.date ??
      singleDayFromRange ??
      (!params?.startDate && !params?.endDate && !params?.period ? fallbackToday : undefined)
    );
  }, [params?.date, singleDayFromRange, params?.startDate, params?.endDate, params?.period, fallbackToday]);

  const resolvedStartDate = useMemo(
    () => params?.startDate ?? periodStart ?? requestDate,
    [params?.startDate, periodStart, requestDate],
  );
  const resolvedEndDate = useMemo(
    () => params?.endDate ?? periodEnd ?? requestDate,
    [params?.endDate, periodEnd, requestDate],
  );

  // Build query key including period for proper caching
  const queryKey = useMemo(
    () => [
      "attendance",
      params?.employeeId || "all-employees",
      params?.period || requestDate || "all-dates",
      resolvedStartDate || "no-start",
      resolvedEndDate || "no-end",
      params?.page || 1,
      safeLimit,
    ],
    [
      params?.employeeId,
      params?.period,
      requestDate,
      resolvedStartDate,
      resolvedEndDate,
      params?.page,
      safeLimit,
    ],
  );

  const query = useQuery<AttendanceListResponse>({
    queryKey,
    queryFn: async () => {
      const requestList = async (requestParams: {
        employeeId?: string;
        date?: string;
        startDate?: string;
        endDate?: string;
        page?: number;
        limit: number;
      }) => {
        return apiClient.get("/attendance", {
          params: requestParams,
        });
      };

      const requestParams: {
        employeeId?: string;
        date?: string;
        startDate?: string;
        endDate?: string;
        page?: number;
        limit: number;
      } = {
        employeeId: params?.employeeId,
        page: params?.page,
        limit: safeLimit,
      };

      if (requestDate && resolvedStartDate === requestDate && resolvedEndDate === requestDate) {
        requestParams.date = requestDate;
      } else {
        requestParams.startDate = resolvedStartDate;
        requestParams.endDate = resolvedEndDate;
      }

      try {
        const res = await requestList(requestParams);
        let records: AttendanceRecord[] = Array.isArray(res.data?.records) ? res.data.records : [];
        const pagination = res.data;

        // عند عدم تحديد صفحة: حمّل جميع الصفحات — بحد أقصى 10 صفحات لمنع الـ loop.
        const MAX_AUTO_PAGES = 10;
        if (!params?.page && pagination?.pages && pagination.pages > 1) {
          const totalPages = Math.min(pagination.pages, MAX_AUTO_PAGES);
          for (let page = 2; page <= totalPages; page += 1) {
            const pageRes = await requestList({ ...requestParams, page });
            const pageRecords: AttendanceRecord[] = Array.isArray(pageRes.data?.records)
              ? pageRes.data.records
              : [];
            records = records.concat(pageRecords);
          }
        }

        return {
          records,
          pagination,
          dailyRecords: toDailyRecords(records, resolvedStartDate, resolvedEndDate),
        };
      } catch (error: unknown) {
        console.error("❌ Attendance API Error:", error);
        const status = axios.isAxiosError(error) ? error.response?.status : undefined;

        // Fallback: بعض بيئات الخادم ترفض date في list endpoint
        if (status === 400 && requestDate) {
          const fallbackParams = {
            employeeId: params?.employeeId,
            page: params?.page,
            limit: safeLimit,
          };

          const retryRes = await requestList(fallbackParams);
          let retryRecords: AttendanceRecord[] = Array.isArray(retryRes.data?.data)
            ? retryRes.data.data
            : [];
          const retryPagination = retryRes.data;

          if (!params?.page && retryPagination?.pages && retryPagination.pages > 1) {
            const totalRetryPages = Math.min(retryPagination.pages, 10);
            for (let page = 2; page <= totalRetryPages; page += 1) {
              const pageRes = await requestList({ ...fallbackParams, page });
              const pageRecords: AttendanceRecord[] = Array.isArray(pageRes.data?.records)
                ? pageRes.data.records
                : [];
              retryRecords = retryRecords.concat(pageRecords);
            }
          }

          return {
            records: retryRecords,
            pagination: retryPagination,
            dailyRecords: toDailyRecords(retryRecords, resolvedStartDate, resolvedEndDate),
          };
        }

        throw new Error(
          axios.isAxiosError(error)
            ? (error.response?.data?.message ?? error.message ?? "فشل تحميل بيانات الحضور")
            : String(error ?? "فشل تحميل بيانات الحضور"),
        );
      }
    },
    staleTime: QUERY_STALE_TIME.FAST,
    gcTime: QUERY_GC_TIME.RELAXED,
    refetchOnWindowFocus: false,
  });

  const createAttendance = useMutation({
    mutationFn: async (payload: AttendancePayload) => {
      const cleanPayload = {
        ...payload,
        source: payload.source || "manual",
      };
      return await apiClient.post("/attendance", cleanPayload);
    },
    onSuccess: (_data, variables) => {
      // نُلغي فقط اليوم المتأثر بدل كل attendance queries
      const date = variables.timestamp?.slice(0, 10);
      if (date) {
        queryClient.invalidateQueries({ queryKey: queryKeys.attendance.dailyView(date) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all, exact: true });
    },
  });

  const updateAttendance = useMutation({
    mutationFn: async ({
      recordId,
      data,
    }: {
      recordId: string;
      data: Partial<AttendancePayload>;
    }) => {
      const cleanPayload = {
        ...data,
        source: data.source || "manual",
      };
      return await apiClient.put(`/attendance/${recordId}`, cleanPayload);
    },
    onSuccess: (_data, variables) => {
      const date = variables.data?.timestamp?.slice(0, 10);
      if (date) {
        queryClient.invalidateQueries({ queryKey: queryKeys.attendance.dailyView(date) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all, exact: true });
    },
  });

  const markAttendance = useMutation({
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.attendance.all, exact: false });

      const previousEntries = queryClient.getQueriesData<AttendanceListResponse>({
        queryKey: queryKeys.attendance.all,
        exact: false,
      });

      const attendanceDate = input.date || toLocalDateString();
      const source = input.source || "manual";

      const normalizedCheckIn = normalizeHHmm(input.checkIn);
      const normalizedCheckOut = normalizeHHmm(input.checkOut);

      queryClient.setQueriesData<AttendanceListResponse>(
        { queryKey: queryKeys.attendance.all, exact: false },
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

          const nextRow: AttendanceDailyRecord =
            rowIndex >= 0
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
            dailyRecords: nextDaily.sort((a, b) =>
              `${b.date}-${b.employeeId}`.localeCompare(`${a.date}-${a.employeeId}`),
            ),
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

      let lastResponse: unknown = null;

      // دائماً نضيف بصمات جديدة (POST) لدعم الورديات المتعددة والإجازات الساعية
      // Backend validation سيمنع التسلسلات الخاطئة (IN→IN, OUT→OUT بدون معاكس بينهما)
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
        lastResponse = await apiClient.post("/attendance", payload);
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
        lastResponse = await apiClient.post("/attendance", payload);
      }

      return lastResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all, exact: false });
      toast.success("تم تسجيل الحضور بنجاح");
    },
    onError: (error: unknown, _variables, context) => {
      if (context?.previousEntries?.length) {
        for (const [queryKey, previousData] of context.previousEntries) {
          queryClient.setQueryData(queryKey, previousData);
        }
      }

      const message = getApiErrorMessage(error, "فشل تسجيل الحضور");
      toast.error(message);
    },
    onSettled: (_data, _error, variables) => {
      // نُلغي فقط daily-view لليوم المتأثر + قائمة الحضور الأساسية
      const date = variables?.date || toLocalDateString();
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.dailyView(date) });
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all, exact: true });
    },
  });

  return {
    ...query,
    createAttendance,
    updateAttendance,
    markAttendance,
  };
};
