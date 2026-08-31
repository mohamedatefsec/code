"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { PaymentModal } from "@/components/PaymentModal";

type Student = {
  id: string;
  fullName: string;
  studentCode: string;
  phone: string | null;
  grade: string | null;
  group: { id: string; name: string } | null;
  user: { status: "active" | "disabled"; loginIdentifier: string };
  payments: { id: string; amount: number; paidAt: string; note: string | null }[];
};

type Group = { id: string; name: string };

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[] | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [search, setSearch] = useState("");
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

  async function handleDelete(id: string, name: string) {
    if (!confirm(`متأكد من حذف الطالب "${name}"؟ هذا الإجراء لا يمكن التراجع عنه.`)) return;
    const res = await fetch(`/api/students/${id}`, { method: "DELETE" });
    if (res.ok) loadStudents();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">الطلاب</h1>
          <p className="text-sm text-ink-soft mt-1">إدارة حسابات الطلاب — الإنشاء يكون من هنا فقط.</p>
        </div>
        <Link
          href="/admin/students/new"
          className="rounded-lg bg-gradient-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 shadow-glow transition-all active:scale-[0.98]"
        >
          + إضافة طالب
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
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
              <th className="text-start px-4 py-3 font-medium">الاشتراك</th>
              <th className="text-start px-4 py-3 font-medium">الحالة</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {students === null && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-ink-soft">
                  جارٍ التحميل...
                </td>
              </tr>
            )}
            {students?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-ink-soft">
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
                <td className="px-4 py-3">
                  <button
                    onClick={() => setPaymentStudent(s)}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition hover:opacity-80 ${
                      lastPayment
                        ? "border border-accent/40 bg-accent/10 text-accent"
                        : "border border-warn/40 bg-warn-soft text-warn"
                    }`}
                  >
                    {lastPayment
                      ? `${lastPayment.amount} جنيه · ${new Date(lastPayment.paidAt).toLocaleDateString("ar-EG")}`
                      : "لسه ما دفعش"}
                  </button>
                </td>
                <td className="px-4 py-3">
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
                <td className="px-4 py-3 text-end whitespace-nowrap">
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
