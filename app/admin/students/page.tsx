"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PaymentModal } from "@/components/PaymentModal";

type Student = {
  id: string;
  fullName: string;
  studentCode: string;
  phone: string | null;
  grade: string | null;
  group: { id: string; name: string } | null;
  user: { status: "active" | "disabled"; loginIdentifier: string };
  payments: { id: string; amount: number; paidAt: string; forMonth: string | null; note: string | null }[];
  attendanceStartDate: string | null;
  attendedSessionsCount: number;
  totalSessionsCount: number;
  totalPaid: number;
  subscriptionActive: boolean;
  subscriptionPaidUntil: string | null;
  subscriptionOverride: boolean;
  effectiveAccessActive: boolean;
};

type Group = { id: string; name: string };

export default function AdminStudentsPage() {
  return (
    <Suspense fallback={null}>
      <AdminStudentsPageInner />
    </Suspense>
  );
}

function AdminStudentsPageInner() {
  const searchParams = useSearchParams();
  const [students, setStudents] = useState<Student[] | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [groupFilter, setGroupFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentStudent, setPaymentStudent] = useState<Student | null>(null);

  const loadStudents = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (groupFilter) params.set("groupId", groupFilter);
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/students?${params.toString()}`);
    const data = await res.json();
    setStudents(data.students);
  }, [search, groupFilter, statusFilter]);

  useEffect(() => {
    fetch("/api/groups")
      .then((r) => r.json())
      .then((d) => setGroups(d.groups));
  }, []);

  useEffect(() => {
    const t = setTimeout(loadStudents, 300);
    return () => clearTimeout(t);
  }, [loadStudents]);

  async function handleToggleStatus(id: string) {
    const res = await fetch(`/api/students/${id}/toggle-status`, { method: "POST" });
    if (res.ok) loadStudents();
  }

  async function handleToggleOverride(id: string, name: string, currentlyOn: boolean) {
    if (
      !currentlyOn &&
      !confirm(`هتفتح الدروس لـ "${name}" يدويًا بغضّ النظر عن حالة الدفع - هيفضل يشوف تنبيه بسيط إنه لسه ما سدّدش. متابعة؟`)
    ) {
      return;
    }
    const res = await fetch(`/api/students/${id}/toggle-override`, { method: "POST" });
    if (res.ok) loadStudents();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`متأكد من حذف الطالب "${name}"؟ هذا الإجراء لا يمكن التراجع عنه.`)) return;
    const res = await fetch(`/api/students/${id}`, { method: "DELETE" });
    if (res.ok) loadStudents();
  }

  return (
    <div className="space-y-6">
      {/* اتجاه الورقة أفقي عشان أعمدة الجدول تتسع (بيسري وقت الطباعة فقط) */}
      <style>{`@page { size: A4 landscape; margin: 12mm; }`}</style>

      <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-ink">الطلاب</h1>
          <p className="text-sm text-ink-soft mt-1">إدارة حسابات الطلاب.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            disabled={!students || students.length === 0}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-canvas transition disabled:opacity-50"
          >
            🖨️ طباعة تقرير الطلاب
          </button>
          <Link
            href="/admin/students/new"
            className="rounded-lg bg-gradient-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 shadow-glow transition-all active:scale-[0.98]"
          >
            + إضافة طالب
          </Link>
        </div>
      </div>

      {/* رأس مختصر يظهر في الطباعة بس، عشان الورقة تبقى واضحة لوحدها */}
      <div className="hidden print:block border-b border-black pb-3">
        <h2 className="text-lg font-bold text-black">تقرير الطلاب - الحضور والاشتراكات</h2>
        <p className="text-sm text-black mt-1">
          تاريخ الطباعة: {new Date().toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" })}
          {" · "}عدد الطلاب: {students?.length ?? 0}
        </p>
      </div>

      <div className="flex flex-wrap gap-3 print:hidden">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث بالاسم أو كود الطالب..."
          className="flex-1 min-w-[200px] rounded-lg border border-border px-3 py-2 text-sm"
        />
        <select
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
          className="rounded-lg border border-border px-3 py-2 text-sm"
        >
          <option value="">كل المجموعات</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-border px-3 py-2 text-sm"
        >
          <option value="">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="disabled">معطّل</option>
        </select>
      </div>

      <div className="rounded-xl border border-border bg-surface overflow-hidden overflow-x-auto shadow-elevated">
        <table className="w-full text-sm">
          <thead className="bg-canvas text-ink-soft">
            <tr>
              <th className="text-start px-4 py-3 font-medium">الاسم</th>
              <th className="text-start px-4 py-3 font-medium">الكود</th>
              <th className="text-start px-4 py-3 font-medium">المجموعة</th>
              <th className="text-start px-4 py-3 font-medium">الحضور</th>
              <th className="text-start px-4 py-3 font-medium">غاب</th>
              <th className="text-start px-4 py-3 font-medium">الاشتراك</th>
              <th className="text-start px-4 py-3 font-medium print:hidden">الحالة</th>
              <th className="px-4 py-3 print:hidden"></th>
            </tr>
          </thead>
          <tbody>
            {students === null && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-ink-soft">
                  جارٍ التحميل...
                </td>
              </tr>
            )}
            {students?.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-ink-soft">
                  لا يوجد طلاب مطابقون.
                </td>
              </tr>
            )}
            {students?.map((s) => {
              const lastPayment = s.payments[0] ?? null;
              return (
              <tr key={s.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium text-ink">{s.fullName}</td>
                <td className="px-4 py-3 font-mono text-xs text-ink-soft">{s.studentCode}</td>
                <td className="px-4 py-3 text-ink-soft">{s.group?.name ?? "—"}</td>
                <td className="px-4 py-3 text-ink-soft print:text-black whitespace-nowrap">
                  <span className="stat-figure">
                    {s.attendedSessionsCount} / {s.totalSessionsCount}
                  </span>{" "}
                  حصة
                  {s.attendanceStartDate && (
                    <span className="block text-xs text-ink-soft/80 print:text-black mt-0.5">
                      من {new Date(s.attendanceStartDate).toLocaleDateString("ar-EG")}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-ink-soft print:text-black whitespace-nowrap">
                  {/* غاب = إجمالي الحصص لحد النهاردة ناقص اللي حضرها فعليًا
                      (حاضر أو متأخر) - نفس الرقمين المعروضين في عمود
                      الحضور، محسوبين من السيرفر أصلًا فمفيش استعلام إضافي. */}
                  <span className="stat-figure font-semibold">
                    {Math.max(s.totalSessionsCount - s.attendedSessionsCount, 0)}
                  </span>{" "}
                  حصة
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setPaymentStudent(s)}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition hover:opacity-80 ${
                      lastPayment
                        ? "border border-accent/40 bg-accent/10 text-accent"
                        : "border border-warn/40 bg-warn-soft text-warn"
                    }`}
                  >
                    {lastPayment ? (
                      <>
                        إجمالي {s.totalPaid} جنيه
                        <span className="block text-[10px] font-normal opacity-80">
                          {lastPayment.forMonth
                            ? `بداية من ${new Date(lastPayment.forMonth).toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" })}`
                            : `آخر دفعة ${new Date(lastPayment.paidAt).toLocaleDateString("ar-EG")}`}
                        </span>
                      </>
                    ) : (
                      "لسه ما دفعش"
                    )}
                  </button>
                  {/* حالة الاشتراك الشهري الفعلية (بتتحكم في قفل/فتح الدروس
                      للطالب) - محسوبة في السيرفر من أبعد شهر مدفوع فعليًا،
                      منفصلة عن إجمالي المدفوع اللي هو مجرد سجل تاريخي. */}
                  <span
                    className={`block mt-1 text-[10px] font-medium ${
                      s.effectiveAccessActive ? "text-accent" : "text-danger"
                    }`}
                  >
                    {s.subscriptionOverride
                      ? "🔓 مفتوحة يدويًا من الإدارة"
                      : s.subscriptionActive && s.subscriptionPaidUntil
                        ? `🔓 الدروس مفتوحة لحد ${new Date(s.subscriptionPaidUntil).toLocaleDateString("ar-EG")}`
                        : "🔒 الدروس مقفولة (اشتراك منتهي)"}
                  </span>
                  <button
                    onClick={() => handleToggleOverride(s.id, s.fullName, s.subscriptionOverride)}
                    className={`block mt-1 text-[10px] font-medium underline decoration-dotted hover:opacity-80 print:hidden ${
                      s.subscriptionOverride ? "text-danger" : "text-primary"
                    }`}
                  >
                    {s.subscriptionOverride ? "إلغاء الفتح اليدوي" : "افتح الدروس يدويًا (بدون دفع)"}
                  </button>
                </td>
                <td className="px-4 py-3 print:hidden">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      s.user.status === "active"
                        ? "border border-accent/40 bg-accent/10 text-accent"
                        : "border border-danger/40 bg-danger/10 text-danger"
                    }`}
                  >
                    {s.user.status === "active" ? "نشط" : "معطّل"}
                  </span>
                </td>
                <td className="px-4 py-3 text-end whitespace-nowrap print:hidden">
                  <div className="flex items-center gap-3 justify-end text-sm">
                    <Link href={`/admin/students/${s.id}/edit`} className="text-primary hover:underline">
                      تعديل
                    </Link>
                    <button onClick={() => handleToggleStatus(s.id)} className="text-ink-soft hover:underline">
                      {s.user.status === "active" ? "تعطيل" : "تفعيل"}
                    </button>
                    <button onClick={() => handleDelete(s.id, s.fullName)} className="text-danger hover:underline">
                      حذف
                    </button>
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {paymentStudent && (
        <PaymentModal
          studentId={paymentStudent.id}
          studentName={paymentStudent.fullName}
          onClose={() => setPaymentStudent(null)}
          onChanged={loadStudents}
        />
      )}
    </div>
  );
}
