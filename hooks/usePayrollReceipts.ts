"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-hot-toast";
import apiClient from "@/lib/api-client";
import { QUERY_GC_TIME, QUERY_STALE_TIME } from "@/lib/query-cache";
import { getApiErrorMessage } from "@/lib/http/error";
import { queryKeys } from "@/lib/query-keys";
import type { PayrollReceipt } from "@/types/payroll";

type PayrollReceiptsQueryResult = {
  mode: "server" | "local";
  data: PayrollReceipt[];
};

type UpsertPayrollReceiptPayload = {
  employeeId: string;
  month: string;
  isReceived: boolean;
  receivedAt?: string | null;
};

type BulkUpsertPayrollReceiptsPayload = {
  employeeIds: string[];
  month: string;
  isReceived: boolean;
  receivedAt?: string | null;
};

type LegacyReceiptEntry = {
  isReceived?: boolean;
  receivedAt?: string;
  updatedAt?: string;
};

const RECEIPT_STORAGE_KEY = "factory:vouchers:receipt-status:v1";
const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

const toDateOnly = (value?: string | null) => (value ? value.slice(0, 10) : null);
const getReceiptKey = (month: string, employeeId: string) => `${month}::${employeeId}`;

const readLocalReceiptMap = (): Record<string, LegacyReceiptEntry> => {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(RECEIPT_STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return parsed as Record<string, LegacyReceiptEntry>;
  } catch {
    return {};
  }
};

const writeLocalReceiptMap = (map: Record<string, LegacyReceiptEntry>) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(RECEIPT_STORAGE_KEY, JSON.stringify(map));
};

const readLocalReceiptsForMonth = (month: string): PayrollReceipt[] => {
  const map = readLocalReceiptMap();

  return Object.entries(map)
    .filter(([key, entry]) => key.startsWith(`${month}::`) && Boolean(entry?.isReceived))
    .map(([key, entry]) => ({
      employeeId: key.split("::")[1] || "",
      month,
      isReceived: true,
      receivedAt: toDateOnly(entry?.receivedAt),
      updatedAt: entry?.updatedAt,
    }))
    .filter((entry) => Boolean(entry.employeeId))
    .sort((a, b) => a.employeeId.localeCompare(b.employeeId));
};

const upsertLocalReceipt = (payload: UpsertPayrollReceiptPayload): PayrollReceipt => {
  const map = readLocalReceiptMap();
  const key = getReceiptKey(payload.month, payload.employeeId);

  if (!payload.isReceived) {
    delete map[key];
    writeLocalReceiptMap(map);
    return {
      employeeId: payload.employeeId,
      month: payload.month,
      isReceived: false,
      receivedAt: null,
    };
  }

  map[key] = {
    isReceived: true,
    receivedAt: toDateOnly(payload.receivedAt) || new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString(),
  };
  writeLocalReceiptMap(map);

  return {
    employeeId: payload.employeeId,
    month: payload.month,
    isReceived: true,
    receivedAt: toDateOnly(map[key].receivedAt),
    updatedAt: map[key].updatedAt,
  };
};

const bulkUpsertLocalReceipts = (payload: BulkUpsertPayrollReceiptsPayload): PayrollReceipt[] => {
  const map = readLocalReceiptMap();
  const updatedAt = new Date().toISOString();
  const receivedAt = toDateOnly(payload.receivedAt) || new Date().toISOString().slice(0, 10);

  for (const employeeId of payload.employeeIds) {
    const key = getReceiptKey(payload.month, employeeId);
    if (!payload.isReceived) {
      delete map[key];
      continue;
    }

    map[key] = {
      isReceived: true,
      receivedAt,
      updatedAt,
    };
  }

  writeLocalReceiptMap(map);

  return payload.employeeIds.map((employeeId) => ({
    employeeId,
    month: payload.month,
    isReceived: payload.isReceived,
    receivedAt: payload.isReceived ? receivedAt : null,
    updatedAt,
  }));
};

const isCompatibilityFallbackError = (error: unknown) => {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  if (!error.response) {
    return true;
  }

  return [404, 405, 500, 501, 502, 503].includes(error.response.status);
};

const normalizeReceipt = (value: unknown): PayrollReceipt => {
  const record = (value || {}) as Record<string, unknown>;

  return {
    id: typeof record.id === "string" ? record.id : undefined,
    employeeId: typeof record.employeeId === "string" ? record.employeeId : "",
    month: typeof record.month === "string" ? record.month : "",
    payrollRunId: typeof record.payrollRunId === "string" ? record.payrollRunId : null,
    isReceived: Boolean(record.isReceived),
    receivedAt: typeof record.receivedAt === "string" ? toDateOnly(record.receivedAt) : null,
    receivedBy: typeof record.receivedBy === "string" ? record.receivedBy : null,
    createdAt: typeof record.createdAt === "string" ? record.createdAt : undefined,
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : undefined,
  };
};

export const usePayrollReceipts = (month: string) => {
  const queryClient = useQueryClient();

  const query = useQuery<PayrollReceiptsQueryResult>({
    queryKey: queryKeys.payroll.receipts(month),
    enabled: MONTH_REGEX.test(month),
    queryFn: async () => {
      try {
        const response = await apiClient.get("/payroll/receipts", { params: { month } });
        const records = Array.isArray(response.data?.data) ? response.data.data : [];
        return {
          mode: "server" as const,
          data: records.map(normalizeReceipt).filter((receipt: PayrollReceipt) => Boolean(receipt.employeeId)),
        };
      } catch (error) {
        if (isCompatibilityFallbackError(error)) {
          return {
            mode: "local" as const,
            data: readLocalReceiptsForMonth(month),
          };
        }
        throw error;
      }
    },
    staleTime: QUERY_STALE_TIME.RELAXED,
    gcTime: QUERY_GC_TIME.RELAXED,
  });

  const upsertReceipt = useMutation({
    mutationFn: async (payload: UpsertPayrollReceiptPayload) => {
      const preferredMode = query.data?.mode ?? "server";

      if (preferredMode === "local") {
        return upsertLocalReceipt(payload);
      }

      try {
        const response = await apiClient.put(`/payroll/receipts/${payload.employeeId}`, {
          month: payload.month,
          isReceived: payload.isReceived,
          receivedAt: payload.receivedAt ?? undefined,
        });
        return normalizeReceipt(
          response.data?.data ?? {
            employeeId: payload.employeeId,
            month: payload.month,
            isReceived: payload.isReceived,
            receivedAt: payload.receivedAt ?? null,
          },
        );
      } catch (error) {
        if (isCompatibilityFallbackError(error)) {
          return upsertLocalReceipt(payload);
        }
        throw error;
      }
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.payroll.receipts(variables.month) });
      toast.success(variables.isReceived ? "تم حفظ حالة القبض" : "تم إرجاع الحالة إلى غير مقبوض");
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, "فشل تحديث حالة القبض"));
    },
  });

  const bulkUpsertReceipts = useMutation({
    mutationFn: async (payload: BulkUpsertPayrollReceiptsPayload) => {
      const preferredMode = query.data?.mode ?? "server";

      if (preferredMode === "local") {
        return bulkUpsertLocalReceipts(payload);
      }

      try {
        const response = await apiClient.post("/payroll/receipts/bulk", {
          employeeIds: payload.employeeIds,
          month: payload.month,
          isReceived: payload.isReceived,
          receivedAt: payload.receivedAt ?? undefined,
        });
        const records = Array.isArray(response.data?.data) ? response.data.data : [];
        return records.map(normalizeReceipt);
      } catch (error) {
        if (isCompatibilityFallbackError(error)) {
          return bulkUpsertLocalReceipts(payload);
        }
        throw error;
      }
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.payroll.receipts(variables.month) });
      toast.success(
        variables.isReceived ? "تم حفظ حالة القبض للموظفين الظاهرين" : "تمت إعادة الموظفين الظاهرين إلى غير مقبوضين",
      );
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, "فشل تحديث حالات القبض الجماعية"));
    },
  });

  const receipts = useMemo(() => query.data?.data ?? [], [query.data?.data]);
  const receiptMap = useMemo(
    () => Object.fromEntries(receipts.map((receipt) => [receipt.employeeId, receipt])),
    [receipts],
  );

  return {
    ...query,
    receipts,
    receiptMap,
    storageMode: query.data?.mode ?? "server",
    upsertReceipt,
    bulkUpsertReceipts,
  };
};

export default usePayrollReceipts;
