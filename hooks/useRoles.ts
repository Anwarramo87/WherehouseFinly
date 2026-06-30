import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import { QUERY_GC_TIME } from "@/lib/query-cache";
import { queryKeys } from "@/lib/query-keys";

// Roles rarely change — 10 minutes staleTime
const STALE_TIME = 10 * 60 * 1000;

export type RoleOption = {
  id: string;
  name: string;
};

type RolesResponse = {
  roles?: unknown;
};

const normalizeRole = (role: unknown): RoleOption | null => {
  if (!role || typeof role !== "object") return null;

  const record = role as Record<string, unknown>;
  const idValue =
    (record.id as string) ||
    (record._id as string) ||
    (record.roleId as string) ||
    (record.value as string);

  if (!idValue) return null;

  const nameValue =
    (record.name as string) ||
    (record.title as string) ||
    (record.label as string) ||
    (record.role as string) ||
    idValue;

  return {
    id: String(idValue),
    name: String(nameValue),
  };
};

const resolveRoles = (payload: unknown): RoleOption[] => {
  const rawRoles: unknown[] = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray((payload as RolesResponse).roles)
      ? ((payload as RolesResponse).roles as unknown[])
      : [];

  return rawRoles
    .map((role: unknown) => normalizeRole(role))
    .filter((role): role is RoleOption => Boolean(role));
};

export const useRoles = () => {
  return useQuery<RoleOption[]>({
    queryKey: queryKeys.roles.all,
    queryFn: async () => {
      const response = await apiClient.get("/auth/roles");
      return resolveRoles(response.data);
    },
    staleTime: STALE_TIME,
    gcTime: QUERY_GC_TIME.RELAXED,
  });
};
