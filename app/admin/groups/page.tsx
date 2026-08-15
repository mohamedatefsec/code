"use client";

import { useEffect, useState, FormEvent } from "react";

type Group = {
  id: string;
  name: string;
  grade: string | null;
  description: string | null;
  _count: { students: number };
};

export default function AdminGroupsPage() {
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadGroups() {
    const res = await fetch("/api/groups");
    const data = await res.json();
    setGroups(data.groups);
  }

  useEffect(() => {
    fetch("/api/groups")
      .then((r) => r.json())
      .then((d) => setGroups(d.groups));
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return;
    setCreating(true);
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, grade: grade || null }),
    });
    setCreating(false);
    if (res.ok) {
      setName("");
      setGrade("");
      loadGroups();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "تعذّر إنشاء المجموعة.");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("متأكد من حذف هذه المجموعة؟")) return;
    const res = await fetch(`/api/groups/${id}`, { method: "DELETE" });
    if (res.ok) {
      loadGroups();
    } else {
      const data = await res.json().catch(() => null);
      alert(data?.error ?? "تعذّر الحذف.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">المجموعات</h1>
        <p className="text-sm text-ink-soft mt-1">
          نظّم الطلاب في مجموعات لتسهيل الحضور والاختبارات المستهدفة.
        </p>
      </div>

      <form
        onSubmit={handleCreate}
        className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4 shadow-elevated"
      >
        <div className="flex-1 min-w-[160px]">
          <label className="block text-sm font-medium text-ink mb-1.5">اسم المجموعة</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثال: أولى ثانوي - أ"
            className="w-full rounded-lg border border-border px-3 py-2 transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
          />
        </div>
        <div className="w-40">
          <label className="block text-sm font-medium text-ink mb-1.5">الصف</label>
          <input
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            placeholder="أولى ثانوي"
            className="w-full rounded-lg border border-border px-3 py-2 transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
          />
        </div>
        <button
          type="submit"
          disabled={creating}
          className="rounded-lg bg-gradient-brand px-5 py-2 font-semibold text-white hover:opacity-90 shadow-glow transition-all active:scale-[0.98] disabled:opacity-60"
        >
          {creating ? "جارٍ الإضافة..." : "إضافة مجموعة"}
        </button>
      </form>

      {error && (
        <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger">{error}</div>
      )}

      <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-elevated">
        <table className="w-full text-sm">
          <thead className="bg-canvas text-ink-soft">
            <tr>
              <th className="text-start px-4 py-3 font-medium">الاسم</th>
              <th className="text-start px-4 py-3 font-medium">الصف</th>
              <th className="text-start px-4 py-3 font-medium">عدد الطلاب</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {groups === null && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-ink-soft">
                  جارٍ التحميل...
                </td>
              </tr>
            )}
            {groups?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-ink-soft">
                  لا توجد مجموعات بعد.
                </td>
              </tr>
            )}
            {groups?.map((g) => (
              <tr key={g.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium text-ink">{g.name}</td>
                <td className="px-4 py-3 text-ink-soft">{g.grade ?? "—"}</td>
                <td className="px-4 py-3 stat-figure text-primary">{g._count.students}</td>
                <td className="px-4 py-3 text-end">
                  <button
                    onClick={() => handleDelete(g.id)}
                    className="text-danger hover:underline text-sm"
                  >
                    حذف
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
