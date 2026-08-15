"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";

type Subject = { id: string; name: string; slug: string; order: number; _count: { units: number } };

export default function AdminContentPage() {
  const [subjects, setSubjects] = useState<Subject[] | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch("/api/subjects")
      .then((r) => r.json())
      .then((d) => setSubjects(d.subjects));
  }, []);

  function reload() {
    fetch("/api/subjects")
      .then((r) => r.json())
      .then((d) => setSubjects(d.subjects));
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    const res = await fetch("/api/subjects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug }),
    });
    setCreating(false);
    if (res.ok) {
      setName("");
      setSlug("");
      reload();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "تعذّر إنشاء المادة.");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("متأكد من حذف هذه المادة؟")) return;
    const res = await fetch(`/api/subjects/${id}`, { method: "DELETE" });
    if (res.ok) reload();
    else {
      const data = await res.json().catch(() => null);
      alert(data?.error ?? "تعذّر الحذف.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">المحتوى التعليمي</h1>
        <p className="text-sm text-ink-soft mt-1">المواد → الوحدات → الدروس.</p>
      </div>

      <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4 shadow-elevated">
        <div className="flex-1 min-w-[160px]">
          <label className="block text-sm font-medium text-ink mb-1.5">اسم المادة</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثال: البرمجة"
            className="w-full rounded-lg border border-border px-3 py-2 transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
          />
        </div>
        <div className="w-48">
          <label className="block text-sm font-medium text-ink mb-1.5">الرابط (slug)</label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="programming"
            className="w-full rounded-lg border border-border px-3 py-2 font-mono text-sm transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
          />
        </div>
        <button
          type="submit"
          disabled={creating}
          className="rounded-lg bg-gradient-brand px-5 py-2 font-semibold text-white hover:opacity-90 shadow-glow transition-all active:scale-[0.98] disabled:opacity-60"
        >
          {creating ? "جارٍ الإضافة..." : "إضافة مادة"}
        </button>
      </form>

      {error && <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger">{error}</div>}

      <div className="grid sm:grid-cols-2 gap-4">
        {subjects === null && <p className="text-sm text-ink-soft">جارٍ التحميل...</p>}
        {subjects?.length === 0 && <p className="text-sm text-ink-soft">لا توجد مواد بعد.</p>}
        {subjects?.map((s) => (
          <div key={s.id} className="rounded-xl border border-border bg-surface p-5 flex items-center justify-between shadow-elevated">
            <div>
              <Link href={`/admin/content/${s.id}`} className="font-semibold text-ink hover:text-primary">
                {s.name}
              </Link>
              <p className="text-sm text-ink-soft mt-1">{s._count.units} وحدة</p>
            </div>
            <button onClick={() => handleDelete(s.id)} className="text-danger text-sm hover:underline">
              حذف
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
