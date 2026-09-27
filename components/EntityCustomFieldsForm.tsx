"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";

type CustomFieldDefinition = {
  id?: string;
  key?: string;
  label?: string;
  fieldType?: string;
  type?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: unknown;
  validation?: Record<string, unknown>;
  visibleToRoles?: string[];
  visibleToModules?: string[];
};

type EntityCustomFieldsFormProps = {
  entity: string;
  recordId?: string | null;
  onChange?: (values: Record<string, unknown>) => void;
  initialValues?: Record<string, unknown>;
};

const normalizeFieldValue = (field: CustomFieldDefinition, value: unknown) => {
  if (value === undefined || value === null) {
    return field.defaultValue ?? "";
  }

  if (field.fieldType === "boolean") {
    return Boolean(value);
  }

  if (field.fieldType === "multi_select" && Array.isArray(value)) {
    return value;
  }

  if (field.fieldType === "number" || field.fieldType === "currency") {
    return value === "" ? "" : String(value);
  }

  return value;
};

// Module-scope stable empties. A `= {}` / `= []` default inside the component
// would create a NEW object each render, and `savedValues` feeds the merge
// effect's dependency array, which would loop setValues forever.
const EMPTY_CUSTOM_FIELDS: CustomFieldDefinition[] = [];
const EMPTY_VALUES: Record<string, unknown> = {};

export default function EntityCustomFieldsForm({
  entity,
  recordId,
  onChange,
  initialValues = {},
}: EntityCustomFieldsFormProps) {
  const [values, setValues] = useState<Record<string, unknown>>(initialValues);
  // initialValues prop identity must NOT be a dependency: callers that omit it
  // get a brand-new {} default object on every render, which previously sent
  // the effect below into a setState → re-render → new object → setState loop
  // ("Maximum update depth exceeded").
  const initialValuesRef = useRef(initialValues);
  useEffect(() => {
    initialValuesRef.current = initialValues;
  }, [initialValues]);

  // The current-tenant endpoints reject users without a tenant scope (super
  // admin) with 403 - those factory-bound fields do not exist for them.
  const hasTenantScope = useAuthStore((state) => Boolean(state.user?.tenantId));

  const { data: customFieldsData } = useQuery({
    queryKey: ["tenant-custom-fields", entity, recordId ?? "new"],
    enabled: Boolean(entity) && hasTenantScope,
    staleTime: 60_000,
    queryFn: async () => {
      const response = await apiClient.get("/customization/tenant/custom-fields", {
        params: { entity },
      });
      return Array.isArray(response.data) ? response.data : [];
    },
  });

  const { data: savedValuesData } = useQuery({
    queryKey: ["tenant-custom-values", entity, recordId ?? "new"],
    enabled: hasTenantScope && Boolean(entity) && Boolean(recordId),
    staleTime: 60_000,
    queryFn: async () => {
      const response = await apiClient.get(`/customization/tenant/custom-field-values/${entity}/${recordId}`);
      return (response.data && typeof response.data === "object") ? response.data : {};
    },
  });

  const customFields = customFieldsData ?? EMPTY_CUSTOM_FIELDS;
  const savedValues = savedValuesData ?? EMPTY_VALUES;

  useEffect(() => {
    const merged = { ...initialValuesRef.current, ...savedValues };
    setValues(merged);
  }, [savedValues]);

  useEffect(() => {
    onChange?.(values);
  }, [values, onChange]);

  const fieldSet = useMemo(() => customFields as CustomFieldDefinition[], [customFields]);

  if (!fieldSet.length) {
    return null;
  }

  return (
    <div className="md:col-span-2 bg-[#1a2530] p-6 rounded-2xl border border-[#263544] shadow-inner mt-2">
      <div className="flex items-center gap-2 border-b border-white/5 pb-4 mb-6">
        <span className="text-base font-bold text-white">حقول مخصصة</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fieldSet.map((field) => {
          const fieldKey = String(field.key ?? field.id ?? "custom_field");
          const value = normalizeFieldValue(field, values[fieldKey] ?? field.defaultValue ?? "");

          const handleChange = (nextValue: unknown) => {
            setValues((prev) => ({ ...prev, [fieldKey]: nextValue }));
          };

          if (field.fieldType === "boolean") {
            return (
              <label
                key={fieldKey}
                className="flex items-center justify-between rounded-xl border border-[#263544] bg-[#101720] px-4 py-3 text-white"
              >
                <span className="font-bold">{field.label ?? fieldKey}</span>
                <input
                  type="checkbox"
                  checked={Boolean(value)}
                  onChange={(event) => handleChange(event.target.checked)}
                  className="h-5 w-5 accent-[#C89355]"
                />
              </label>
            );
          }

          if (field.fieldType === "textarea") {
            return (
              <div key={fieldKey} className="md:col-span-2">
                <label className="mb-2 block text-xs font-bold text-[#C89355]">
                  {field.label ?? fieldKey}
                </label>
                <textarea
                  value={String(value ?? "")}
                  onChange={(event) => handleChange(event.target.value)}
                  placeholder={field.placeholder}
                  className="w-full rounded-xl border border-[#263544] bg-[#101720] p-4 text-white outline-none focus:border-[#C89355]"
                  rows={3}
                />
              </div>
            );
          }

          if (field.fieldType === "select" && Array.isArray((field.validation as { options?: unknown })?.options)) {
            const options = ((field.validation as { options?: unknown[] })?.options ?? []) as string[];
            return (
              <div key={fieldKey}>
                <label className="mb-2 block text-xs font-bold text-[#C89355]">
                  {field.label ?? fieldKey}
                </label>
                <select
                  value={String(value ?? "")}
                  onChange={(event) => handleChange(event.target.value)}
                  className="w-full rounded-xl border border-[#263544] bg-[#101720] p-4 text-white outline-none focus:border-[#C89355]"
                >
                  <option value="">--</option>
                  {options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            );
          }

          return (
            <div key={fieldKey}>
              <label className="mb-2 block text-xs font-bold text-[#C89355]">
                {field.label ?? fieldKey}
              </label>
              <input
                type={field.fieldType === "number" || field.fieldType === "currency" ? "number" : "text"}
                value={String(value ?? "")}
                onChange={(event) => handleChange(event.target.value)}
                placeholder={field.placeholder}
                className="w-full rounded-xl border border-[#263544] bg-[#101720] p-4 text-white outline-none focus:border-[#C89355]"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
