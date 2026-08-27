"use client";

import { useEffect, useState, FormEvent, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Group = { id: string; name: string };
type Student = {
  id: string;
  fullName: string;
  studentCode: string;
  phone: string | null;
  grade: string | null;
  groupId: string | null;
  attendanceStartDate: string | null;
  user: { status: "active" | "disabled"; loginIdentifier: string };
};

export default function EditStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [student, setStudent] = useState<Student | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    fetch("/api/groups")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setGroups(d.groups ?? []);
      })
      .catch(() => {
        // فشل تحميل المجموعات ليس خطأ حرج - النموذج يظل قابلاً للاستخدام بدونها.
      });

    fetch(`/api/students/${id}`)
      .then(async (r) => {
        const data = await r.json().catch(() => null);
        if (!r.ok) {
          throw new Error(data?.error ?? `تعذّر تحميل بيانات الطالب (خطأ ${r.status}).`);
        }
        if (!data?.student) {
          throw new Error("تعذّر تحميل بيانات الطالب: استجابة غير متوقعة من الخادم.");
        }
        return data.student as Student;
      })
      .then((student) => {
        if (!cancelled) setStudent(student);
      })
      .catch((err: Error) => {
        if (!cancelled) setLoadError(err.message || "تعذّر تحميل بيانات الطالب.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  function update<K extends keyof Student>(key: K, value: Student[K]) {
    setStudent((s) => (s ? { ...s, [key]: value } : s));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!student) return;
    setError(null);
    setMessage(null);
    setSaving(true);

    const res = await fetch(`/api/students/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: student.fullName,
        studentCode: student.studentCode,
        phone: student.phone,
        grade: student.grade,
        groupId: student.groupId,
        attendanceStartDate: student.attendanceStartDate || null,
      }),
    });

    setSaving(false);
    if (res.ok) {
      setMessage("تم حفظ التعديلات بنجاح.");
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "تعذّر الحفظ.");
    }
  }

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault();
    setResetMessage(null);
    setResetting(true);
    const res = await fetch(`/api/students/${id}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });
    setResetting(false);
    if (res.ok) {
      setResetMessage("تم تغيير كلمة المرور بنجاح.");
      setNewPassword("");
    } else {
      const data = await res.json().catch(() => null);
      setResetMessage(data?.error ?? "تعذّر تغيير كلمة المرور.");
    }
  }

  async function handleToggleStatus() {
    const res = await fetch(`/api/students/${id}/toggle-status`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setStudent((s) => (s ? { ...s, user: { ...s.user, status: data.status } } : s));
    }
  }

  async function handleDelete() {
    if (!student) return;
    if (!confirm(`متأكد من حذف الطالب "${student.fullName}"؟ هذا الإجراء لا يمكن التراجع عنه.`)) return;
    const res = await fetch(`/api/students/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/admin/students");
      router.refresh();
    }
  }

  if (loading) {
    return <p className="text-sm text-ink-soft">جارٍ التحميل...</p>;
  }

  if (loadError || !student) {
    return (
      <div className="max-w-lg space-y-4">
        <Link href="/admin/students" className="text-sm text-ink-soft hover:text-ink">
          ← رجوع لقائمة الطلاب
        </Link>
        <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {loadError ?? "تعذّر تحميل بيانات الطالب."}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/students" className="text-sm text-ink-soft hover:text-ink">
            ← رجوع لقائمة الطلاب
          </Link>
          <h1 className="text-xl font-bold text-ink mt-2">{student.fullName}</h1>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            student.user.status === "active" ? "border border-accent/40 bg-accent/10 text-accent" : "border border-danger/40 bg-danger/10 text-danger"
          }`}
        >
          {student.user.status === "active" ? "نشط" : "معطّل"}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-surface p-6 shadow-elevated">
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">الاسم الكامل</label>
          <input
            required
            value={student.fullName}
            onChange={(e) => update("fullName", e.target.value)}
            className="w-full rounded-lg border border-border px-4 py-2.5 transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">كود الطالب</label>
          <input
            required
            value={student.studentCode}
            onChange={(e) => update("studentCode", e.target.value)}
            className="w-full rounded-lg border border-border px-4 py-2.5 font-mono transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">رقم الهاتف</label>
            <input
              value={student.phone ?? ""}
              onChange={(e) => update("phone", e.target.value)}
              className="w-full rounded-lg border border-border px-4 py-2.5 transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">الصف الدراسي</label>
            <input
              value={student.grade ?? ""}
              onChange={(e) => update("grade", e.target.value)}
              className="w-full rounded-lg border border-border px-4 py-2.5 transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">المجموعة</label>
          <select
            value={student.groupId ?? ""}
            onChange={(e) => update("groupId", e.target.value || null)}
            className="w-full rounded-lg border border-border px-4 py-2.5 transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
          >
            <option value="">بدون مجموعة</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">تاريخ بداية الحضور (اختياري)</label>
          <input
            type="date"
            value={student.attendanceStartDate ? student.attendanceStartDate.slice(0, 10) : ""}
            onChange={(e) => update("attendanceStartDate", e.target.value || null)}
            className="w-full rounded-lg border border-border px-4 py-2.5 transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
          />
          <p className="text-xs text-ink-soft mt-1">
            حصص الحضور قبل هذا التاريخ لن تُحتسب على الطالب (لا حضور ولا غياب). اتركه فارغًا لعدم التقييد.
          </p>
        </div>

        {error && <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger">{error}</div>}
        {message && <div className="rounded-lg border border-accent/40 bg-accent/10 px-4 py-2.5 text-sm text-accent">{message}</div>}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-gradient-brand py-2.5 font-semibold text-white hover:opacity-90 shadow-glow transition-all active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? "جارٍ الحفظ..." : "حفظ التعديلات"}
        </button>
      </form>

      <form onSubmit={handleResetPassword} className="space-y-3 rounded-xl border border-border bg-surface p-6 shadow-elevated">
        <h2 className="font-semibold text-ink">إعادة تعيين كلمة المرور</h2>
        <input
          required
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="كلمة مرور جديدة (6 أحرف على الأقل)"
          className="w-full rounded-lg border border-border px-4 py-2.5 transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
        />
        {resetMessage && <p className="text-sm text-ink-soft">{resetMessage}</p>}
        <button
          type="submit"
          disabled={resetting}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-canvas disabled:opacity-60"
        >
          {resetting ? "جارٍ التغيير..." : "تغيير كلمة المرور"}
        </button>
      </form>

      <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-6 shadow-elevated">
        <div>
          <p className="font-medium text-ink">
            {student.user.status === "active" ? "تعطيل الحساب" : "تفعيل الحساب"}
          </p>
          <p className="text-sm text-ink-soft">
            {student.user.status === "active"
              ? "الحساب المعطّل لا يستطيع صاحبه تسجيل الدخول."
              : "سيتمكن الطالب من تسجيل الدخول مجددًا."}
          </p>
        </div>
        <button
          onClick={handleToggleStatus}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-canvas"
        >
          {student.user.status === "active" ? "تعطيل" : "تفعيل"}
        </button>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-danger/40 bg-danger/10 p-6">
        <div>
          <p className="font-medium text-danger">حذف الحساب نهائيًا</p>
          <p className="text-sm text-danger/80">لا يمكن التراجع عن هذا الإجراء.</p>
        </div>
        <button
          onClick={handleDelete}
          className="rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          حذف
        </button>
      </div>
    </div>
  );
}
