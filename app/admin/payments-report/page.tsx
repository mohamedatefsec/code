"use client";

import { useEffect, useMemo, useState } from "react";

type Group = { id: string; name: string };

type Stats = { attended: number; total: number; percentage: number | null };

type Row = {
  studentId: string;
  fullName: string;
  studentCode: string;
  groupName: string | null;
  isActive: boolean;
  registrationDate: string;
  payments: { amount: number; paidAt: string; note: string | null }[];
  paidTotal: number;
  period: Stats;
  sinceRegistration: Stats;
};

type Report = { from: string; to: string; count: number; totalAmount: number; rows: Row[] };

const TZ = "Africa/Cairo";
const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/// أول وآخر يوم في شهر (0 = الشهر الحالي، -1 = الشهر الماضي)
function monthRange(offset: number) {
  const now = new Date();
  return {
    from: ymd(new Date(now.getFullYear(), now.getMonth() + offset, 1)),
    to: ymd(new Date(now.getFullYear(), now.getMonth() + offset + 1, 0)),
  };
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("ar-EG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: TZ,
  });
}

/// تاريخ "YYYY-MM-DD" بدون تحويل توقيت (عشان ميتزحزحش يوم)
function fmtDay(day: string) {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("ar-EG", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

const money = (n: number) => n.toLocaleString("ar-EG", { maximumFractionDigits: 2 });

function AttendanceCell({ stats }: { stats: Stats }) {
  if (stats.total === 0) return <span className="text-ink-soft">لا توجد حصص</span>;
  return (
    <>
      <span className="stat-figure font-semibold text-ink">
        {stats.attended} / {stats.total}
      </span>{" "}
      حصة
      {stats.percentage !== null && (
        <span className="block text-xs text-ink-soft print:text-black">{stats.percentage}%</span>
      )}
    </>
  );
}

export default function PaymentsReportPage() {
  const initial = useMemo(() => monthRange(0), []);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [groupId, setGroupId] = useState("");
  // الفلاتر "المطبّقة" فعلًا (بتتغيّر بس لما الأدمن يضغط عرض)
  const [applied, setApplied] = useState({ from: initial.from, to: initial.to, groupId: "" });

  const [groups, setGroups] = useState<Group[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/groups")
      .then((r) => r.json())
      .then((d) => setGroups(d.groups ?? []))
      .catch(() => setGroups([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const qs = new URLSearchParams({ from: applied.from, to: applied.to });
    if (applied.groupId) qs.set("groupId", applied.groupId);

    fetch(`/api/reports/payments?${qs.toString()}`)
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error ?? "تعذّر تحميل التقرير.");
        return data as Report;
      })
      .then((data) => {
        if (cancelled) return;
        setReport(data);
        setError(null);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setReport(null);
        setError(err.message);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applied]);

  function apply() {
    setLoading(true);
    setApplied({ from, to, groupId });
  }

  function pickMonth(offset: number) {
    const r = monthRange(offset);
    setFrom(r.from);
    setTo(r.to);
    setLoading(true);
    setApplied({ from: r.from, to: r.to, groupId });
  }

  const groupName = groups.find((g) => g.id === applied.groupId)?.name;
  const inputCls =
    "rounded-lg border border-border px-3 py-2 text-sm transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15";

  return (
    <div className="space-y-6">
      {/* اتجاه الورقة أفقي عشان أعمدة الجدول تتسع (بيسري وقت الطباعة فقط) */}
      <style>{`@page { size: A4 landscape; margin: 12mm; }`}</style>

      <div className="print:hidden space-y-4">
        <div>
          <h1 className="text-xl font-bold text-ink">تقرير الاشتراكات</h1>
          <p className="text-sm text-ink-soft mt-1">
            الطلاب اللي سدّدوا الاشتراك خلال فترة، مع حضورهم في الفترة وحضورهم من بداية تسجيلهم — جاهز للطباعة.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4 shadow-elevated">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">من</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} suppressHydrationWarning />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">إلى</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} suppressHydrationWarning />
          </div>
          <div className="min-w-[160px]">
            <label className="block text-sm font-medium text-ink mb-1.5">المجموعة</label>
            <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className={inputCls + " w-full"}>
              <option value="">كل المجموعات</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={apply}
            disabled={loading || !from || !to}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-canvas transition disabled:opacity-50"
          >
            {loading ? "جارٍ التحميل..." : "عرض التقرير"}
          </button>
          <button
            onClick={() => pickMonth(0)}
            className="rounded-lg border border-border px-3 py-2 text-xs text-ink-soft hover:bg-canvas transition"
          >
            الشهر الحالي
          </button>
          <button
            onClick={() => pickMonth(-1)}
            className="rounded-lg border border-border px-3 py-2 text-xs text-ink-soft hover:bg-canvas transition"
          >
            الشهر الماضي
          </button>
          <button
            onClick={() => window.print()}
            disabled={!report || report.rows.length === 0}
            className="rounded-lg bg-gradient-brand px-5 py-2 text-sm font-semibold text-white hover:opacity-90 shadow-glow transition-all active:scale-[0.98] disabled:opacity-50 ms-auto"
          >
            🖨️ طباعة التقرير
          </button>
        </div>
      </div>

      {error && (
        <div className="print:hidden rounded-lg border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger">
          {error}
        </div>
      )}
      {loading && !error && <p className="print:hidden text-sm text-ink-soft">جارٍ التحميل...</p>}

      {report && (
        <div className="space-y-4">
          {/* رأس التقرير - بيظهر على الشاشة وفي الطباعة */}
          <div className="border-b border-border print:border-black pb-3">
            <h2 className="text-lg font-bold text-ink print:text-black">تقرير الطلاب المسدّدين للاشتراك</h2>
            <p className="text-sm text-ink-soft print:text-black mt-1">
              الفترة: من {fmtDay(report.from)} إلى {fmtDay(report.to)}
              {groupName ? ` · المجموعة: ${groupName}` : " · كل المجموعات"}
            </p>
            <p className="text-sm text-ink-soft print:text-black">
              عدد الطلاب: <span className="stat-figure font-semibold">{report.count}</span> · إجمالي المبالغ:{" "}
              <span className="stat-figure font-semibold">{money(report.totalAmount)}</span> جنيه
            </p>
          </div>

          {report.rows.length === 0 ? (
            <p className="text-sm text-ink-soft">مفيش أي طالب سدّد اشتراك في الفترة دي.</p>
          ) : (
            <div className="rounded-xl border border-border bg-surface overflow-x-auto shadow-elevated print:shadow-none print:border-black print:overflow-visible">
              <table className="w-full text-sm print:text-xs">
                <thead className="bg-canvas text-ink-soft print:bg-transparent print:text-black print:table-header-group">
                  <tr>
                    <th className="text-start px-3 py-3 font-medium">#</th>
                    <th className="text-start px-3 py-3 font-medium">الطالب</th>
                    <th className="text-start px-3 py-3 font-medium">المجموعة</th>
                    <th className="text-start px-3 py-3 font-medium">المبلغ المسدّد</th>
                    <th className="text-start px-3 py-3 font-medium">الحضور في الفترة</th>
                    <th className="text-start px-3 py-3 font-medium">الحضور من بداية التسجيل</th>
                    <th className="text-start px-3 py-3 font-medium">بداية التسجيل</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((r, i) => (
                    <tr key={r.studentId} className="border-t border-border print:border-black print:break-inside-avoid align-top">
                      <td className="px-3 py-3 text-ink-soft print:text-black stat-figure">{i + 1}</td>
                      <td className="px-3 py-3">
                        <p className="font-medium text-ink print:text-black">
                          {r.fullName}
                          {!r.isActive && <span className="text-xs text-danger ms-1">(معطّل)</span>}
                        </p>
                        <p className="text-xs text-ink-soft print:text-black font-mono">{r.studentCode}</p>
                      </td>
                      <td className="px-3 py-3 text-ink-soft print:text-black">{r.groupName ?? "—"}</td>
                      <td className="px-3 py-3">
                        <span className="stat-figure font-semibold text-ink print:text-black">{money(r.paidTotal)}</span> جنيه
                        <span className="block text-xs text-ink-soft print:text-black">
                          {r.payments.map((p) => fmtDate(p.paidAt)).join(" · ")}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-ink-soft print:text-black">
                        <AttendanceCell stats={r.period} />
                      </td>
                      <td className="px-3 py-3 text-ink-soft print:text-black">
                        <AttendanceCell stats={r.sinceRegistration} />
                      </td>
                      <td className="px-3 py-3 text-ink-soft print:text-black whitespace-nowrap">
                        {fmtDay(r.registrationDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="hidden print:block text-[10px] text-black">
            «الحضور» = عدد الحصص اللي حضرها الطالب (حاضر أو متأخر) من إجمالي الحصص المسجّلة له. تاريخ الطباعة:{" "}
            {new Date().toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric", timeZone: TZ })}
          </p>
        </div>
      )}
    </div>
  );
}
