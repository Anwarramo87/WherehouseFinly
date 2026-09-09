"use client";

import { useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Timer,
  Target,
  CalendarClock,
  PackageOpen,
  ShoppingCart,
  AlertTriangle,
} from "lucide-react";
import WmsPageShell from "@/components/wms/WmsPageShell";
import {
  Empty,
  Loading,
  Panel,
  Pill,
  Stat,
  TableFrame,
  fmtInt,
  fmtMoney,
  fmtPercent,
  inputClass,
} from "@/components/wms/primitives";
import { useForecast, useSupplierScorecard, useWmsKpis } from "@/hooks/useWms";
import { toNum } from "@/types/wms";

export default function WmsAnalyticsPage() {
  const [days, setDays] = useState(90);
  const [leadTime, setLeadTime] = useState(14);
  const { data: kpis, isLoading } = useWmsKpis(days);
  const { data: forecast } = useForecast({ leadTimeDays: leadTime, horizonDays: 30 });
  const { data: suppliersRaw } = useSupplierScorecard(180);

  const suppliers = suppliersRaw as
    | {
        suppliers: Array<{
          supplierId: string;
          name: string;
          orders: number;
          spend: string;
          onTimeRate: number | null;
          fillRate: number | null;
        }>;
      }
    | undefined;

  return (
    <WmsPageShell
      group="analytics"
      title="مؤشرات أداء المخزن"
      subtitle="معدل الدوران، سرعة التجهيز، دقة الطلبات، التعرّض للصلاحية، والتنبؤ بالاحتياج."
      actions={
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className={`${inputClass} w-40`}>
          <option value={30}>آخر 30 يوم</option>
          <option value={90}>آخر 90 يوم</option>
          <option value={180}>آخر 180 يوم</option>
          <option value={365}>آخر سنة</option>
        </select>
      }
    >
      {isLoading || !kpis ? (
        <Loading />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Stat
              label="معدل دوران المخزون (سنوي)"
              value={kpis.turnover.turnoverRatio ? toNum(kpis.turnover.turnoverRatio).toFixed(2) : "—"}
              hint={
                kpis.turnover.averageDaysOnHand
                  ? `يعادل ${fmtInt(kpis.turnover.averageDaysOnHand)} يوم تغطية`
                  : undefined
              }
              tone="info"
              icon={<TrendingUp size={16} />}
            />
            <Stat
              label="متوسط وقت التجهيز"
              value={
                kpis.fulfillment.averageHoursToShip !== null
                  ? `${kpis.fulfillment.averageHoursToShip} س`
                  : "—"
              }
              hint={
                kpis.fulfillment.p90HoursToShip !== null
                  ? `الشريحة 90%: ${kpis.fulfillment.p90HoursToShip} س`
                  : undefined
              }
              tone="neutral"
              icon={<Timer size={16} />}
            />
            <Stat
              label="دقة الالتقاط"
              value={fmtPercent(kpis.accuracy.linePickAccuracy)}
              hint={`${fmtInt(kpis.accuracy.shortLines)} سطر ناقص من ${fmtInt(kpis.accuracy.pickedLines)}`}
              tone={
                (kpis.accuracy.linePickAccuracy ?? 100) >= 98
                  ? "success"
                  : (kpis.accuracy.linePickAccuracy ?? 100) >= 95
                    ? "warning"
                    : "danger"
              }
              icon={<Target size={16} />}
            />
            <Stat
              label="قيمة معرّضة للصلاحية"
              value={fmtMoney(kpis.expiry.totalAtRisk, 0)}
              hint={`${fmtInt(kpis.expiry.expiredCount)} منتهية، ${fmtInt(kpis.expiry.within30Count)} خلال 30 يوم`}
              tone={toNum(kpis.expiry.totalAtRisk) > 0 ? "danger" : "success"}
              icon={<CalendarClock size={16} />}
            />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Stat label="تكلفة البضاعة المباعة" value={fmtMoney(kpis.turnover.cogs, 0)} />
            <Stat label="قيمة المخزون الحالية" value={fmtMoney(kpis.turnover.inventoryValue, 0)} />
            <Stat
              label="مخزون راكد"
              value={fmtMoney(kpis.turnover.deadStock.value, 0)}
              hint={`${fmtInt(kpis.turnover.deadStock.count)} صنف بلا حركة`}
              tone={kpis.turnover.deadStock.count > 0 ? "warning" : "neutral"}
            />
            <Stat
              label="قبول اقتراح التخزين"
              value={fmtPercent(kpis.receiving.suggestionAcceptanceRate)}
              hint={`${fmtInt(kpis.receiving.pendingTasks)} مهمة معلّقة`}
              tone="info"
              icon={<PackageOpen size={16} />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Panel title="الأسرع دوراناً" icon={<TrendingUp size={20} />}>
              {kpis.turnover.fastMovers.length === 0 ? (
                <Empty message="لا توجد حركة في الفترة." />
              ) : (
                <TableFrame
                  head={
                    <>
                      <th>الصنف</th>
                      <th>خرج</th>
                      <th>الرصيد</th>
                      <th>الدوران</th>
                    </>
                  }
                >
                  {kpis.turnover.fastMovers.map((item) => (
                    <tr key={item.sku} className="bg-white/50 [&>td]:px-4 [&>td]:py-3">
                      <td>
                        <p className="font-black text-[#263544]">{item.name}</p>
                        <p className="text-[11px] font-bold text-[#263544]/50">{item.sku}</p>
                      </td>
                      <td className="tabular-nums">{fmtInt(item.unitsOut)}</td>
                      <td className="tabular-nums">{fmtInt(item.onHand)}</td>
                      <td>
                        <Pill tone="green">{item.turnover?.toFixed(1) ?? "—"}×</Pill>
                      </td>
                    </tr>
                  ))}
                </TableFrame>
              )}
            </Panel>

            <Panel title="مخزون راكد" icon={<AlertTriangle size={20} />}>
              {kpis.turnover.deadStock.items.length === 0 ? (
                <Empty message="لا يوجد مخزون راكد — كل صنف تحرّك في الفترة." />
              ) : (
                <TableFrame
                  head={
                    <>
                      <th>الصنف</th>
                      <th>الرصيد</th>
                      <th>القيمة المجمّدة</th>
                    </>
                  }
                >
                  {kpis.turnover.deadStock.items.map((item) => (
                    <tr key={item.sku} className="bg-white/50 [&>td]:px-4 [&>td]:py-3">
                      <td>
                        <p className="font-black text-[#263544]">{item.name}</p>
                        <p className="text-[11px] font-bold text-[#263544]/50">{item.sku}</p>
                      </td>
                      <td className="tabular-nums">{fmtInt(item.onHand)}</td>
                      <td className="tabular-nums font-bold text-red-700">{fmtMoney(item.value, 0)}</td>
                    </tr>
                  ))}
                </TableFrame>
              )}
            </Panel>
          </div>

          <Panel
            title="التنبؤ بالاحتياج واقتراح الشراء"
            icon={<ShoppingCart size={20} />}
            badge={
              forecast ? (
                <Pill tone="gold">
                  {fmtInt(forecast.summary.needingReorder)} صنف يحتاج طلباً
                </Pill>
              ) : null
            }
            actions={
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-[#263544]/60">مهلة التوريد</span>
                <select
                  value={leadTime}
                  onChange={(e) => setLeadTime(Number(e.target.value))}
                  className={`${inputClass} w-28`}
                >
                  <option value={7}>7 أيام</option>
                  <option value={14}>14 يوم</option>
                  <option value={30}>30 يوم</option>
                  <option value={60}>60 يوم</option>
                </select>
              </div>
            }
            className="mb-8"
          >
            {!forecast ? (
              <Loading />
            ) : forecast.needsReorder.length === 0 ? (
              <Empty message="لا يوجد صنف يحتاج إعادة طلب ضمن الأفق الحالي." />
            ) : (
              <>
                <TableFrame
                  head={
                    <>
                      <th>الصنف</th>
                      <th>ABC</th>
                      <th>المتاح</th>
                      <th>قيد الطلب</th>
                      <th>معدل يومي</th>
                      <th>أيام التغطية</th>
                      <th>نقطة الطلب الحالية</th>
                      <th>المقترحة</th>
                      <th>كمية مقترحة</th>
                      <th>الكلفة</th>
                      <th>الثقة</th>
                    </>
                  }
                >
                  {forecast.needsReorder.slice(0, 40).map((row) => (
                    <tr
                      key={row.sku}
                      className={`[&>td]:px-4 [&>td]:py-3 ${
                        (row.daysOfCover ?? 999) <= leadTime ? "bg-red-50/60" : "bg-white/50"
                      }`}
                    >
                      <td>
                        <p className="font-black text-[#263544]">{row.name}</p>
                        <p className="text-[11px] font-bold text-[#263544]/50">{row.sku}</p>
                      </td>
                      <td>
                        {row.abcClass ? (
                          <Pill tone={row.abcClass === "A" ? "gold" : row.abcClass === "B" ? "blue" : "slate"}>
                            {row.abcClass}
                          </Pill>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="tabular-nums font-black">{fmtInt(row.onHand)}</td>
                      <td className="tabular-nums text-xs">{fmtInt(row.onOrder)}</td>
                      <td className="tabular-nums text-xs">{row.dailyRate}</td>
                      <td>
                        {row.daysOfCover === null ? (
                          "—"
                        ) : (
                          <Pill
                            tone={
                              row.daysOfCover <= leadTime ? "red" : row.daysOfCover <= leadTime * 2 ? "amber" : "green"
                            }
                          >
                            {fmtInt(row.daysOfCover)} يوم
                          </Pill>
                        )}
                      </td>
                      <td className="tabular-nums text-xs">{fmtInt(row.currentReorderLevel)}</td>
                      <td className="tabular-nums text-xs font-black">
                        {fmtInt(row.suggestedReorderPoint)}
                        {row.reorderLevelIsStale ? (
                          <span className="text-red-700 mr-1" title="نقطة الطلب المسجّلة أقل من الواقع بكثير">
                            ⚠
                          </span>
                        ) : null}
                      </td>
                      <td className="tabular-nums font-black text-[#8a5f2a]">
                        {fmtInt(row.suggestedOrderQuantity)}
                      </td>
                      <td className="tabular-nums text-xs">{fmtMoney(row.estimatedCost, 0)}</td>
                      <td>
                        <Pill
                          tone={
                            row.confidence === "high" ? "green" : row.confidence === "medium" ? "amber" : "slate"
                          }
                        >
                          {row.confidence === "high" ? "عالية" : row.confidence === "medium" ? "متوسطة" : "منخفضة"}
                        </Pill>
                      </td>
                    </tr>
                  ))}
                </TableFrame>

                <div className="px-6 py-4 bg-white/30 border-t border-white/70 flex flex-wrap items-center justify-between gap-4">
                  <p className="text-[11px] font-bold text-[#263544]/50 max-w-2xl">
                    الطريقة: {forecast.method}. «الثقة» تعكس عدد الحركات المرصودة — صنف عمره أسبوعان يظهر
                    بثقة منخفضة ولا يُقرأ كإشارة مستقرة. العلامة ⚠ تعني أن نقطة إعادة الطلب المسجّلة على
                    الصنف أقل بكثير مما يبرّره الاستهلاك الفعلي.
                  </p>
                  <div className="text-left">
                    <p className="text-[11px] font-black text-[#263544]/60">القيمة التقديرية للشراء</p>
                    <p className="text-xl font-black tabular-nums text-[#8a5f2a]">
                      {fmtMoney(forecast.summary.estimatedPurchaseValue, 0)}
                    </p>
                  </div>
                </div>
              </>
            )}
          </Panel>

          {suppliers && suppliers.suppliers.length > 0 ? (
            <Panel title="بطاقة أداء الموردين (180 يوم)" icon={<BarChart3 size={20} />}>
              <TableFrame
                head={
                  <>
                    <th>المورد</th>
                    <th>أوامر الشراء</th>
                    <th>الإنفاق</th>
                    <th>التسليم في الموعد</th>
                    <th>نسبة التوريد الكامل</th>
                  </>
                }
              >
                {suppliers.suppliers.map((supplier) => (
                  <tr key={supplier.supplierId} className="bg-white/50 [&>td]:px-4 [&>td]:py-3">
                    <td className="font-black text-[#263544]">{supplier.name}</td>
                    <td className="tabular-nums">{fmtInt(supplier.orders)}</td>
                    <td className="tabular-nums font-bold">{fmtMoney(supplier.spend, 0)}</td>
                    <td>
                      <Pill
                        tone={
                          (supplier.onTimeRate ?? 0) >= 90
                            ? "green"
                            : (supplier.onTimeRate ?? 0) >= 70
                              ? "amber"
                              : "red"
                        }
                      >
                        {fmtPercent(supplier.onTimeRate)}
                      </Pill>
                    </td>
                    <td>
                      <Pill
                        tone={
                          (supplier.fillRate ?? 0) >= 95
                            ? "green"
                            : (supplier.fillRate ?? 0) >= 80
                              ? "amber"
                              : "red"
                        }
                      >
                        {fmtPercent(supplier.fillRate)}
                      </Pill>
                    </td>
                  </tr>
                ))}
              </TableFrame>
            </Panel>
          ) : null}
        </>
      )}
    </WmsPageShell>
  );
}
