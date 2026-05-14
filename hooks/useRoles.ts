import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import { QUERY_GC_TIME, QUERY_STALE_TIME } from "@/lib/query-cache";

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
    queryKey: ["roles"],
    queryFn: async () => {
      const response = await apiClient.get("/roles");
      return resolveRoles(response.data);
    },
    staleTime: QUERY_STALE_TIME.RELAXED,
    gcTime: QUERY_GC_TIME.RELAXED,
  });
};
