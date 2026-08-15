"use client";

import { useEffect, useState, FormEvent, use } from "react";
import Link from "next/link";

type Lesson = {
  id: string;
  title: string;
  status: "draft" | "published";
  order: number;
};

export default function AdminLessonsPage({
  params,
}: {
  params: Promise<{ subjectId: string; unitId: string }>;
}) {
  const { subjectId, unitId } = use(params);
  const [lessons, setLessons] = useState<Lesson[] | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  function reload() {
    fetch(`/api/lessons?unitId=${unitId}`)
      .then((r) => r.json())
      .then((d) => setLessons(d.lessons));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) return;
    setCreating(true);
    const res = await fetch("/api/lessons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unitId, title, order: lessons?.length ?? 0 }),
    });
    setCreating(false);
    if (res.ok) {
      setTitle("");
      reload();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "تعذّر إنشاء الدرس.");
    }
  }

  async function toggleStatus(lesson: Lesson) {
    const newStatus = lesson.status === "published" ? "draft" : "published";
    const res = await fetch(`/api/lessons/${lesson.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) reload();
  }

  async function handleDelete(id: string) {
    if (!confirm("متأكد من حذف هذا الدرس؟")) return;
    const res = await fetch(`/api/lessons/${id}`, { method: "DELETE" });
    if (res.ok) reload();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/admin/content/${subjectId}`} className="text-sm text-ink-soft hover:text-ink">
          ← رجوع للوحدات
        </Link>
        <h1 className="text-xl font-bold text-ink mt-2">الدروس</h1>
      </div>

      <form
        onSubmit={handleCreate}
        className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4 shadow-elevated"
      >
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-ink mb-1.5">عنوان الدرس</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثال: المتغيرات وأنواع البيانات"
            className="w-full rounded-lg border border-border px-3 py-2 transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
          />
        </div>
        <button
          type="submit"
          disabled={creating}
          className="rounded-lg bg-gradient-brand px-5 py-2 font-semibold text-white hover:opacity-90 shadow-glow transition-all active:scale-[0.98] disabled:opacity-60"
        >
          {creating ? "جارٍ الإضافة..." : "إضافة درس"}
        </button>
      </form>

      {error && <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger">{error}</div>}

      <div className="space-y-3">
        {lessons === null && <p className="text-sm text-ink-soft">جارٍ التحميل...</p>}
        {lessons?.length === 0 && <p className="text-sm text-ink-soft">لا توجد دروس بعد.</p>}
        {lessons?.map((l) => (
          <div
            key={l.id}
            className="rounded-xl border border-border bg-surface p-5 flex items-center justify-between shadow-elevated"
          >
            <Link
              href={`/admin/content/${subjectId}/${unitId}/${l.id}`}
              className="font-semibold text-ink hover:text-primary"
            >
              {l.title}
            </Link>
            <div className="flex items-center gap-3 text-sm">
              <button
                onClick={() => toggleStatus(l)}
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  l.status === "published" ? "border border-accent/40 bg-accent/10 text-accent" : "bg-canvas text-ink-soft"
                }`}
              >
                {l.status === "published" ? "منشور" : "مسودة"}
              </button>
              <button onClick={() => handleDelete(l.id)} className="text-danger hover:underline">
                حذف
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
