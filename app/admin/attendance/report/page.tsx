"use client";

import { useEffect, useState } from "react";

type Group = { id: string; name: string };

type StudentReport = {
  studentId: string;
  fullName: string;
  studentCode: string;
  groupName: string | null;
  records: { date: string; label: string | null; status: "present" | "absent" | "late" }[];
  summary: { present: number; late: number; absent: number; total: number; attendancePercentage: number | null };
};

const STATUS_LABEL: Record<string, string> = {
  present: "حاضر",
  late: "متأخر",
  absent: "غائب",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
}

export default function AttendanceReportPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState("");
  const [report, setReport] = useState<StudentReport[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/groups")
      .then((r) => r.json())
      .then((d) => setGroups(d.groups));
  }, []);

  function loadReport() {
    setLoading(true);
    const query = groupId ? `?groupId=${groupId}` : "";
    fetch(`/api/attendance/report${query}`)
      .then((r) => r.json())
      .then((d) => {
        setReport(d.report);
        setLoading(false);
      });
  }

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      {/* عناصر التحكم دي بتتخفي وقت الطباعة، الطباعة بتاخد بس محتوى التقرير */}
      <div className="print:hidden space-y-4">
        <div>
          <h1 className="text-xl font-bold text-ink">تقرير الحضور</h1>
          <p className="text-sm text-ink-soft mt-1">تقرير حضور شامل لكل طالب، جاهز للطباعة.</p>
        </div>

        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4 shadow-elevated">
          <div className="min-w-[180px]">
            <label className="block text-sm font-medium text-ink mb-1.5">المجموعة</label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
            >
              <option value="">كل المجموعات</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={loadReport}
            disabled={loading}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-canvas transition disabled:opacity-50"
          >
            {loading ? "جارٍ التحميل..." : "تحديث"}
          </button>
          <button
            onClick={() => window.print()}
            disabled={!report || report.length === 0}
            className="rounded-lg bg-gradient-brand px-5 py-2 text-sm font-semibold text-white hover:opacity-90 shadow-glow transition-all active:scale-[0.98] disabled:opacity-50"
          >
            🖨️ طباعة التقرير
          </button>
        </div>
      </div>

      {loading && <p className="text-sm text-ink-soft">جارٍ التحميل...</p>}
      {report && report.length === 0 && (
        <p className="text-sm text-ink-soft">لا يوجد طلاب أو سجلات حضور لعرضها.</p>
      )}

      {report && report.length > 0 && (
        <div className="space-y-8">
          {/* عنوان يظهر فقط في نسخة الطباعة أعلى الصفحة */}
          <h1 className="hidden print:block text-2xl font-bold text-ink mb-2">تقرير الحضور</h1>

          {report.map((s) => (
            <div
              key={s.studentId}
              className="rounded-xl border border-border bg-surface p-5 shadow-elevated print:shadow-none print:border-black print:break-inside-avoid print:break-after-page"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3 mb-3">
                <div>
                  <p className="font-semibold text-ink">{s.fullName}</p>
                  <p className="text-xs text-ink-soft font-mono">
                    {s.studentCode} {s.groupName ? `· ${s.groupName}` : ""}
                  </p>
                </div>
                <div className="text-sm text-ink-soft text-end">
                  <p>
                    حاضر {s.summary.present} · متأخر {s.summary.late} · غائب {s.summary.absent} · إجمالي{" "}
                    {s.summary.total}
                  </p>
                  {s.summary.attendancePercentage !== null && (
                    <p className="font-medium text-ink">نسبة الحضور: {s.summary.attendancePercentage}%</p>
                  )}
                </div>
              </div>

              {s.records.length === 0 ? (
                <p className="text-sm text-ink-soft">لا توجد حصص مسجّلة لهذا الطالب بعد.</p>
              ) : (
                <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-sm">
                  <thead className="text-ink-soft">
                    <tr>
                      <th className="text-start py-1.5 font-medium">التاريخ</th>
                      <th className="text-start py-1.5 font-medium">الحصة</th>
                      <th className="text-start py-1.5 font-medium">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.records.map((r, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="py-1.5">{formatDate(r.date)}</td>
                        <td className="py-1.5">{r.label ?? "—"}</td>
                        <td className="py-1.5">{STATUS_LABEL[r.status]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
