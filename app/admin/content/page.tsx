"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";

type Subject = { id: string; name: string; slug: string; order: number; _count: { units: number } };

export default function AdminContentPage() {
  const [subjects, setSubjects] = useState<Subject[] | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

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
      body: JSON.stringify({ name }),
    });
    setCreating(false);
    if (res.ok) {
      setName("");
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

  function startEdit(s: Subject) {
    setEditingId(s.id);
    setEditingName(s.name);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingName("");
  }

  async function saveEdit(id: string) {
    if (!editingName.trim()) return;
    setSavingEdit(true);
    const res = await fetch(`/api/subjects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editingName.trim() }),
    });
    setSavingEdit(false);
    if (res.ok) {
      cancelEdit();
      reload();
    } else {
      const data = await res.json().catch(() => null);
      alert(data?.error ?? "تعذّر حفظ التعديل.");
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
            {editingId === s.id ? (
              <div className="flex-1 flex items-center gap-2">
                <input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit(s.id);
                    if (e.key === "Escape") cancelEdit();
                  }}
                  className="flex-1 rounded-lg border border-border px-3 py-1.5 text-sm transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
                />
                <button
                  onClick={() => saveEdit(s.id)}
                  disabled={savingEdit}
                  className="text-primary text-sm font-medium hover:underline disabled:opacity-60"
                >
                  {savingEdit ? "جارٍ الحفظ..." : "حفظ"}
                </button>
                <button onClick={cancelEdit} className="text-ink-soft text-sm hover:underline">
                  إلغاء
                </button>
              </div>
            ) : (
              <>
                <div>
                  <Link href={`/admin/content/${s.id}`} className="font-semibold text-ink hover:text-primary">
                    {s.name}
                  </Link>
                  <p className="text-sm text-ink-soft mt-1">{s._count.units} وحدة</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => startEdit(s)} className="text-primary text-sm hover:underline">
                    تعديل
                  </button>
                  <button onClick={() => handleDelete(s.id)} className="text-danger text-sm hover:underline">
                    حذف
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
