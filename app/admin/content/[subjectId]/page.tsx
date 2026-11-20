"use client";

import { useEffect, useState, FormEvent, use } from "react";
import Link from "next/link";
import { unitLabel } from "@/lib/unit-label";

type Unit = {
  id: string;
  title: string;
  description: string | null;
  status: "draft" | "published";
  order: number;
  _count: { lessons: number };
};

function lessonsLabel(n: number) {
  if (n === 0) return "لسه مفيهاش دروس";
  if (n === 1) return "درس واحد";
  if (n === 2) return "درسين";
  return `${n} دروس`;
}

const iconBtn =
  "grid place-items-center w-9 h-9 rounded-lg border border-border text-ink-soft hover:text-primary hover:border-primary/40 hover:bg-primary-soft transition-colors disabled:opacity-30 disabled:pointer-events-none";

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
  const [savingOrder, setSavingOrder] = useState(false);

  // التعديل: وحدة واحدة بس بتتعدّل في نفس الوقت
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

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
    // الوحدة الجديدة بتتحط في آخر القايمة دايمًا
    const nextOrder = units && units.length > 0 ? Math.max(...units.map((u) => u.order)) + 1 : 0;
    const res = await fetch("/api/units", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectId, title, order: nextOrder }),
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

  /// تحريك وحدة خطوة لفوق (-1) أو لتحت (+1). الشكل بيتغيّر فورًا، ولو
  /// الحفظ فشل بنرجّع الترتيب القديم ونوضّح السبب.
  async function move(index: number, direction: -1 | 1) {
    if (!units) return;
    const target = index + direction;
    if (target < 0 || target >= units.length) return;

    const previous = units;
    const next = [...units];
    [next[index], next[target]] = [next[target], next[index]];
    setUnits(next.map((u, i) => ({ ...u, order: i })));
    setError(null);
    setSavingOrder(true);

    const res = await fetch("/api/units/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectId, ids: next.map((u) => u.id) }),
    }).catch(() => null);
    setSavingOrder(false);

    if (!res || !res.ok) {
      setUnits(previous);
      const data = await res?.json().catch(() => null);
      setError(data?.error ?? "تعذّر حفظ الترتيب. اتأكد من الإنترنت وجرّب تاني.");
    }
  }

  function startEdit(u: Unit) {
    setEditingId(u.id);
    setEditTitle(u.title);
    setEditDescription(u.description ?? "");
    setError(null);
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    if (!editTitle.trim()) {
      setError("عنوان الوحدة مطلوب.");
      return;
    }
    setSavingEdit(true);
    const res = await fetch(`/api/units/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle.trim(), description: editDescription.trim() || null }),
    });
    setSavingEdit(false);
    if (res.ok) {
      setEditingId(null);
      reload();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "تعذّر حفظ التعديل.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/content" className="text-sm text-ink-soft hover:text-ink">
          ← رجوع للمواد
        </Link>
        <h1 className="text-xl font-bold text-ink mt-2">الوحدات</h1>
        <p className="text-sm text-ink-soft mt-1">
          الترتيب هنا هو نفس الترتيب اللي الطالب بيشوفه. استخدم الأسهم عشان تقدّم أو تأخّر أي وحدة.
        </p>
      </div>

      <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4 shadow-elevated">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-ink mb-1.5">
            عنوان الوحدة {units && <span className="text-ink-soft font-normal">(هتتضاف كـ {unitLabel(units.length)})</span>}
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثال: أساسيات Python"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
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
        {units?.map((u, index) =>
          editingId === u.id ? (
            /* ===== وضع التعديل ===== */
            <form
              key={u.id}
              onSubmit={saveEdit}
              className="rounded-xl border-2 border-primary/40 bg-surface p-5 shadow-elevated space-y-3"
            >
              <p className="text-sm font-semibold text-primary">تعديل {unitLabel(index)}</p>
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">عنوان الوحدة</label>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  autoFocus
                  maxLength={150}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">
                  وصف مختصر <span className="text-ink-soft font-normal">(اختياري)</span>
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  maxLength={500}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="rounded-lg bg-gradient-brand px-5 py-2 text-sm font-semibold text-white shadow-glow disabled:opacity-60"
                >
                  {savingEdit ? "جارٍ الحفظ..." : "حفظ التعديل"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="rounded-lg border border-border px-5 py-2 text-sm font-semibold text-ink-soft hover:text-ink"
                >
                  إلغاء
                </button>
              </div>
            </form>
          ) : (
            /* ===== العرض العادي ===== */
            <div
              key={u.id}
              className="rounded-xl border border-border bg-surface p-4 sm:p-5 flex items-center gap-4 flex-wrap shadow-elevated"
            >
              {/* رقم الوحدة */}
              <span className="grid place-items-center w-12 h-12 shrink-0 rounded-xl bg-gradient-brand text-white text-xl font-bold shadow-glow">
                {index + 1}
              </span>

              <div className="flex-1 min-w-[12rem]">
                <p className="text-xs font-semibold text-primary">{unitLabel(index)}</p>
                <Link
                  href={`/admin/content/${subjectId}/${u.id}`}
                  className="block font-semibold text-ink hover:text-primary mt-0.5"
                >
                  {u.title}
                </Link>
                <p className="text-sm text-ink-soft mt-1">{lessonsLabel(u._count.lessons)}</p>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <button
                  onClick={() => move(index, -1)}
                  disabled={index === 0 || savingOrder}
                  className={iconBtn}
                  aria-label={`تقديم ${unitLabel(index)}`}
                  title="تقديم الوحدة خطوة لفوق"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden="true">
                    <path d="m6 15 6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  onClick={() => move(index, 1)}
                  disabled={index === units.length - 1 || savingOrder}
                  className={iconBtn}
                  aria-label={`تأخير ${unitLabel(index)}`}
                  title="تأخير الوحدة خطوة لتحت"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden="true">
                    <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                <button
                  onClick={() => startEdit(u)}
                  className="rounded-lg border border-border px-3 py-1.5 font-medium text-ink hover:text-primary hover:border-primary/40 transition-colors"
                >
                  تعديل
                </button>
                <button
                  onClick={() => toggleStatus(u)}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    u.status === "published" ? "border border-accent/40 bg-accent/10 text-accent" : "bg-canvas text-ink-soft"
                  }`}
                >
                  {u.status === "published" ? "منشورة" : "مسودة"}
                </button>
                <button onClick={() => handleDelete(u.id)} className="text-danger hover:underline px-1">
                  حذف
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
