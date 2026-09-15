"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { Loader2, UserPlus } from "lucide-react";
import apiClient from "@/lib/api-client";

interface FactoryUser {
  id: string;
  username: string;
  email: string | null;
  status: string;
  lastLogin: string | null;
  role: { id: string; name: string } | null;
}

interface Role {
  id: string;
  name: string;
  description?: string | null;
}

/**
 * The accounts that can sign in to one factory, and a way to add another.
 *
 * The factory is passed explicitly on create rather than inferred from the
 * session: the Super Admin belongs to no factory, so an unnamed create would
 * land at tenantId NULL and be invisible to everyone — the orphan-row failure
 * the tenant extension now refuses outright.
 */
export default function FactoryUsersPanel({
  tenantId,
  factoryName,
}: {
  tenantId: string;
  factoryName: string;
}) {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({ username: "", email: "", password: "", roleId: "" });

  const { data: users = [], isLoading } = useQuery<FactoryUser[]>({
    queryKey: ["super-admin", "users", tenantId],
    queryFn: async () =>
      (await apiClient.get(`/admin/tenants/${tenantId}/users`)).data as FactoryUser[],
  });

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ["super-admin", "roles"],
    queryFn: async () => (await apiClient.get("/auth/roles")).data as Role[],
  });

  const createUser = useMutation({
    mutationFn: async () =>
      apiClient.post("/auth/users", {
        username: form.username.trim(),
        email: form.email.trim() || undefined,
        password: form.password,
        roleId: form.roleId,
        tenantId,
      }),
    onSuccess: () => {
      toast.success("تم إنشاء الحساب");
      setForm({ username: "", email: "", password: "", roleId: "" });
      setIsAdding(false);
      void queryClient.invalidateQueries({ queryKey: ["super-admin", "users", tenantId] });
      void queryClient.invalidateQueries({ queryKey: ["super-admin", "factories"] });
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data
          ?.error?.message ?? "تعذّر إنشاء الحساب";
      toast.error(message);
    },
  });

  const canSubmit =
    form.username.trim().length > 0 && form.password.length >= 8 && form.roleId.length > 0;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-[#263544]">حسابات الدخول</h3>
          <p className="text-xs text-slate-500">من يستطيع الدخول إلى {factoryName}</p>
        </div>

        <button
          type="button"
          onClick={() => setIsAdding((open) => !open)}
          aria-expanded={isAdding}
          className="flex items-center gap-1.5 rounded-lg border border-[#263544] px-3 py-1.5 text-xs font-bold text-[#263544] transition-colors hover:bg-[#263544] hover:text-white"
        >
          <UserPlus size={14} aria-hidden="true" />
          {isAdding ? "إلغاء" : "إضافة حساب"}
        </button>
      </div>

      {isAdding && (
        <form
          className="mb-4 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (canSubmit) createUser.mutate();
          }}
        >
          <Field
            id="new-username"
            label="اسم المستخدم"
            value={form.username}
            onChange={(value) => setForm((f) => ({ ...f, username: value }))}
            autoComplete="off"
          />
          <Field
            id="new-email"
            label="الإيميل (اختياري)"
            type="email"
            value={form.email}
            onChange={(value) => setForm((f) => ({ ...f, email: value }))}
            autoComplete="off"
          />
          <Field
            id="new-password"
            label="كلمة المرور (8 أحرف على الأقل)"
            type="password"
            value={form.password}
            onChange={(value) => setForm((f) => ({ ...f, password: value }))}
            autoComplete="new-password"
          />

          <div className="flex flex-col gap-1">
            <label htmlFor="new-role" className="text-xs font-bold text-slate-600">
              الدور
            </label>
            <select
              id="new-role"
              value={form.roleId}
              onChange={(event) => setForm((f) => ({ ...f, roleId: event.target.value }))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#263544]"
            >
              <option value="">اختر دوراً…</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={!canSubmit || createUser.isPending}
              aria-busy={createUser.isPending}
              className="flex items-center gap-2 rounded-lg bg-[#263544] px-4 py-2 text-sm font-bold text-[#C89355] disabled:opacity-50"
            >
              {createUser.isPending && (
                <Loader2 className="animate-spin" size={14} aria-hidden="true" />
              )}
              إنشاء الحساب
            </button>
          </div>
        </form>
      )}

      {isLoading && (
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="animate-spin" size={15} aria-hidden="true" />
          جارٍ التحميل…
        </p>
      )}

      {!isLoading && users.length === 0 && (
        <p className="text-sm text-slate-500">لا توجد حسابات لهذا المصنع بعد.</p>
      )}

      {users.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2 text-right">المستخدم</th>
                <th className="py-2 text-right">الدور</th>
                <th className="py-2 text-right">الحالة</th>
                <th className="py-2 text-right">آخر دخول</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-slate-100">
                  <td className="py-2 font-bold text-[#263544]">
                    {user.username}
                    {user.email && (
                      <span className="block text-xs font-normal text-slate-400">{user.email}</span>
                    )}
                  </td>
                  <td className="py-2 text-slate-600">{user.role?.name ?? "—"}</td>
                  <td className="py-2">
                    <span
                      className={`rounded px-2 py-0.5 text-[11px] font-bold ${
                        user.status === "active"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="py-2 text-xs text-slate-500">
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString("ar") : "لم يدخل"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-bold text-slate-600">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#263544]"
      />
    </div>
  );
}
