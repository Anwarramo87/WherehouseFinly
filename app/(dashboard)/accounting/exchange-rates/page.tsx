"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, Plus, Save, Trash2, Pencil, X } from "lucide-react";
import { toast } from "react-hot-toast";
import WmsPageShell from "@/components/wms/WmsPageShell";
import {
  Panel,
  Stat,
  Pill,
  Button,
  Field,
  Loading,
  Empty,
  fmtInt,
  inputClass,
} from "@/components/wms/primitives";
import apiClient from "@/lib/api-client";
import { getApiErrorMessage as normalizeError } from "@/lib/http/error";

interface ExchangeRateRow {
  id: string;
  pair: string;
  rate: number;
  rateDate: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

const PAIR_LABEL: Record<string, string> = {
  USD_TO_SYP: "دولار → ليرة",
  SYP_TO_USD: "ليرة → دولار",
};

const today = () => new Date().toISOString().slice(0, 10);

export default function ExchangeRatesPage() {
  const queryClient = useQueryClient();

  const [pair, setPair] = useState("USD_TO_SYP");
  const [rate, setRate] = useState("");
  const [rateDate, setRateDate] = useState(today());
  const [editing, setEditing] = useState<string | null>(null);
  const [editRate, setEditRate] = useState("");

  const list = useQuery({
    queryKey: ["exchange-rates"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: ExchangeRateRow[] }>(
        "/accounting/exchange-rates",
      );
      return res.data?.data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post("/accounting/exchange-rates", {
        pair,
        rate: Number(rate),
        rateDate,
      });
      return res.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["exchange-rates"] });
      setRate("");
      toast.success("تمت إضافة سعر الصرف");
    },
    onError: (error: unknown) => {
      toast.error(normalizeError(error, "تعذّرت إضافة سعر الصرف"));
    },
  });

  const update = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.put(`/accounting/exchange-rates/${id}`, {
        rate: Number(editRate),
      });
      return res.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["exchange-rates"] });
      setEditing(null);
      setEditRate("");
      toast.success("تم تعديل سعر الصرف");
    },
    onError: (error: unknown) => {
      toast.error(normalizeError(error, "تعذّر تعديل سعر الصرف"));
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/accounting/exchange-rates/${id}`);
      return res.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["exchange-rates"] });
      toast.success("تم حذف سعر الصرف");
    },
    onError: (error: unknown) => {
      toast.error(normalizeError(error, "تعذّر حذف سعر الصرف"));
    },
  });

  const rows = list.data ?? [];
  const latestUsd = rows.find((r) => r.pair === "USD_TO_SYP");

  return (
    <WmsPageShell
      group="accounting"
      title="أسعار الصرف"
      subtitle="سجل يومي مؤرشف لأسعار الصرف — كل معاملة تحتفظ بسعر الصرف وتاريخه الذي استُخدم"
      actions={
        <div className="flex items-center gap-2 text-xs font-black text-[#263544]/60">
          <ArrowLeftRight size={15} className="text-[#C89355]" />
          العملة الأساسية: ليرة سورية (SYP)
        </div>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat
          label="عدد الأسعار المسجلة"
          value={fmtInt(rows.length)}
          tone="info"
          icon={<ArrowLeftRight size={16} />}
        />
        <Stat
          label="آخر سعر دولار"
          value={latestUsd ? latestUsd.rate.toLocaleString("en-US") : "—"}
          tone="success"
          icon={<ArrowLeftRight size={16} />}
        />
        <Stat
          label="تاريخ آخر سعر"
          value={latestUsd?.rateDate ?? "—"}
          tone="neutral"
          icon={<ArrowLeftRight size={16} />}
        />
        <Stat
          label="أزواج العملات"
          value={fmtInt(new Set(rows.map((r) => r.pair)).size)}
          tone="warning"
          icon={<ArrowLeftRight size={16} />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── add ── */}
        <Panel title="إضافة سعر صرف" icon={<Plus size={20} />}>
          <div className="p-5 space-y-4">
            <Field label="زوج العملات">
              <select
                value={pair}
                onChange={(e) => setPair(e.target.value)}
                className={inputClass}
              >
                <option value="USD_TO_SYP">دولار → ليرة (USD_TO_SYP)</option>
                <option value="SYP_TO_USD">ليرة → دولار (SYP_TO_USD)</option>
              </select>
            </Field>

            <Field label="سعر الصرف">
              <input
                type="number"
                min={0.0001}
                step="0.0001"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="13000"
                className={`${inputClass} tabular-nums`}
              />
            </Field>

            <Field label="تاريخ السعر">
              <input
                type="date"
                value={rateDate}
                onChange={(e) => setRateDate(e.target.value)}
                className={inputClass}
              />
            </Field>

            <Button
              onClick={() => add.mutate()}
              loading={add.isPending}
              disabled={!rate || Number(rate) <= 0}
              className="w-full justify-center"
            >
              <Save size={15} /> حفظ السعر
            </Button>

            <p className="text-[11px] font-bold text-[#263544]/50 leading-relaxed">
              سعر الصرف لا يُعدَّل إن كان هناك معاملات مسجّلة به — صحّح
              المعاملات المرتبطة أولاً، وكل تصحيح يُسجَّل في سجل التدقيق.
            </p>
          </div>
        </Panel>

        {/* ── list ── */}
        <div className="lg:col-span-2">
          <Panel title="سجل الأسعار" icon={<ArrowLeftRight size={20} />}>
            {list.isLoading ? (
              <Loading />
            ) : rows.length === 0 ? (
              <Empty message="لم تُسجَّل أسعار صرف بعد" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                  <thead className="bg-[#1a2530] text-[#C89355]">
                    <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:font-black [&>th]:text-xs">
                      <th>الزوج</th>
                      <th>السعر</th>
                      <th>التاريخ</th>
                      <th>أُضيف بواسطة</th>
                      <th>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/70">
                    {rows.map((row) => (
                      <tr key={row.id} className="text-[#263544]/85">
                        <td className="px-4 py-3">
                          <Pill tone="gold">{PAIR_LABEL[row.pair] ?? row.pair}</Pill>
                        </td>
                        <td className="px-4 py-3">
                          {editing === row.id ? (
                            <input
                              type="number"
                              min={0.0001}
                              step="0.0001"
                              value={editRate}
                              onChange={(e) => setEditRate(e.target.value)}
                              className={`${inputClass} w-32 tabular-nums`}
                            />
                          ) : (
                            <span className="font-black tabular-nums">
                              {row.rate.toLocaleString("en-US")}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 tabular-nums">{row.rateDate}</td>
                        <td className="px-4 py-3 text-xs text-[#263544]/55">
                          {row.createdBy ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {editing === row.id ? (
                              <>
                                <button
                                  onClick={() => update.mutate(row.id)}
                                  disabled={update.isPending || !editRate}
                                  className="text-emerald-600 hover:text-emerald-800 disabled:opacity-40"
                                >
                                  <Save size={16} />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditing(null);
                                    setEditRate("");
                                  }}
                                  className="text-[#263544]/40 hover:text-[#263544]"
                                >
                                  <X size={16} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    setEditing(row.id);
                                    setEditRate(String(row.rate));
                                  }}
                                  className="text-[#263544]/50 hover:text-[#8a5f26]"
                                >
                                  <Pencil size={15} />
                                </button>
                                <button
                                  onClick={() => remove.mutate(row.id)}
                                  disabled={remove.isPending}
                                  className="text-red-500 hover:text-red-700 disabled:opacity-40"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </WmsPageShell>
  );
}
