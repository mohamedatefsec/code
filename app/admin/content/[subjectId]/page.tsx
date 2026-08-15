"use client";

import { useEffect, useState, FormEvent, use } from "react";
import Link from "next/link";

type Unit = {
  id: string;
  title: string;
  description: string | null;
  status: "draft" | "published";
  order: number;
  _count: { lessons: number };
};

export default function AdminUnitsPage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const { subjectId } = use(params);
  const [units, setUnits] = useState<Unit[] | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  function reload() {
    fetch(`/api/units?subjectId=${subjectId}`)
      .then((r) => r.json())
      .then((d) => setUnits(d.units));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    const res = await fetch("/api/units", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectId, title, order: units?.length ?? 0 }),
    });
    setCreating(false);
    if (res.ok) {
      setTitle("");
      reload();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "تعذّر إنشاء الوحدة.");
    }
  }

  async function toggleStatus(unit: Unit) {
    const newStatus = unit.status === "published" ? "draft" : "published";
    const res = await fetch(`/api/units/${unit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) reload();
  }

  async function handleDelete(id: string) {
    if (!confirm("متأكد من حذف هذه الوحدة؟")) return;
    const res = await fetch(`/api/units/${id}`, { method: "DELETE" });
    if (res.ok) reload();
    else {
      const data = await res.json().catch(() => null);
      alert(data?.error ?? "تعذّر الحذف.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/content" className="text-sm text-ink-soft hover:text-ink">
          ← رجوع للمواد
        </Link>
        <h1 className="text-xl font-bold text-ink mt-2">الوحدات</h1>
      </div>

      <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4 shadow-elevated">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-ink mb-1.5">عنوان الوحدة</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثال: أساسيات Python"
            className="w-full rounded-lg border border-border px-3 py-2 transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
          />
        </div>
        <button
          type="submit"
          disabled={creating}
          className="rounded-lg bg-gradient-brand px-5 py-2 font-semibold text-white hover:opacity-90 shadow-glow transition-all active:scale-[0.98] disabled:opacity-60"
        >
          {creating ? "جارٍ الإضافة..." : "إضافة وحدة"}
        </button>
      </form>

      {error && <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger">{error}</div>}

      <div className="space-y-3">
        {units === null && <p className="text-sm text-ink-soft">جارٍ التحميل...</p>}
        {units?.length === 0 && <p className="text-sm text-ink-soft">لا توجد وحدات بعد.</p>}
        {units?.map((u) => (
          <div key={u.id} className="rounded-xl border border-border bg-surface p-5 flex items-center justify-between shadow-elevated">
            <div>
              <Link href={`/admin/content/${subjectId}/${u.id}`} className="font-semibold text-ink hover:text-primary">
                {u.title}
              </Link>
              <p className="text-sm text-ink-soft mt-1">{u._count.lessons} درس</p>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <button
                onClick={() => toggleStatus(u)}
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  u.status === "published" ? "border border-accent/40 bg-accent/10 text-accent" : "bg-canvas text-ink-soft"
                }`}
              >
                {u.status === "published" ? "منشورة" : "مسودة"}
              </button>
              <button onClick={() => handleDelete(u.id)} className="text-danger hover:underline">
                حذف
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
