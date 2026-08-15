"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Group = { id: string; name: string };

export default function NewStudentPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [form, setForm] = useState({
    fullName: "",
    studentCode: "",
    phone: "",
    grade: "",
    groupId: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/groups")
      .then((r) => r.json())
      .then((d) => setGroups(d.groups));
  }, []);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const res = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: form.fullName,
        studentCode: form.studentCode,
        phone: form.phone || null,
        grade: form.grade || null,
        groupId: form.groupId || null,
        password: form.password,
      }),
    });

    setSaving(false);
    if (res.ok) {
      router.push("/admin/students");
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "تعذّر إنشاء الحساب.");
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <Link href="/admin/students" className="text-sm text-ink-soft hover:text-ink">
          ← رجوع لقائمة الطلاب
        </Link>
        <h1 className="text-xl font-bold text-ink mt-2">إضافة طالب جديد</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-surface p-6 shadow-elevated">
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">الاسم الكامل</label>
          <input
            required
            value={form.fullName}
            onChange={(e) => update("fullName", e.target.value)}
            className="w-full rounded-lg border border-border px-4 py-2.5 transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">كود الطالب (لتسجيل الدخول)</label>
          <input
            required
            value={form.studentCode}
            onChange={(e) => update("studentCode", e.target.value)}
            placeholder="STU-1024"
            className="w-full rounded-lg border border-border px-4 py-2.5 font-mono transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">كلمة المرور الأولية</label>
          <input
            required
            type="text"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            placeholder="6 أحرف على الأقل"
            className="w-full rounded-lg border border-border px-4 py-2.5 transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">رقم الهاتف</label>
            <input
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              className="w-full rounded-lg border border-border px-4 py-2.5 transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">الصف الدراسي</label>
            <input
              value={form.grade}
              onChange={(e) => update("grade", e.target.value)}
              className="w-full rounded-lg border border-border px-4 py-2.5 transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">المجموعة</label>
          <select
            value={form.groupId}
            onChange={(e) => update("groupId", e.target.value)}
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

        {error && (
          <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger">{error}</div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-gradient-brand py-2.5 font-semibold text-white hover:opacity-90 shadow-glow transition-all active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? "جارٍ الإنشاء..." : "إنشاء الحساب"}
        </button>
      </form>
    </div>
  );
}
