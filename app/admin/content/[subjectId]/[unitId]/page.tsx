"use client";

import { useEffect, useState, FormEvent, use } from "react";
import Link from "next/link";
import { unitLabel, lessonLabel } from "@/lib/unit-label";
import { splitLessonNumber } from "@/lib/lesson-title";

type Lesson = {
  id: string;
  title: string;
  status: "draft" | "published";
  order: number;
  publishAt?: string | null;
};

const iconBtn =
  "grid place-items-center w-9 h-9 rounded-lg border border-border text-ink-soft hover:text-primary hover:border-primary/40 hover:bg-primary-soft transition-colors disabled:opacity-30 disabled:pointer-events-none";

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
  const [savingOrder, setSavingOrder] = useState(false);

  // تعديل عنوان درس بسرعة من القايمة (درس واحد في نفس الوقت)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  /// الوحدة الحالية ومكانها في ترتيب المادة - عشان العنوان يقول "دروس الوحدة الثالثة"
  const [unitInfo, setUnitInfo] = useState<{ title: string; index: number } | null>(null);

  useEffect(() => {
    fetch(`/api/units?subjectId=${subjectId}`)
      .then((r) => r.json())
      .then((d: { units?: { id: string; title: string }[] }) => {
        const index = d.units?.findIndex((u) => u.id === unitId) ?? -1;
        if (d.units && index >= 0) setUnitInfo({ title: d.units[index].title, index });
      })
      .catch(() => {});
  }, [subjectId, unitId]);

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
      body: JSON.stringify({
        unitId,
        title,
        // الدرس الجديد بيتحط في آخر القايمة دايمًا
        order: lessons && lessons.length > 0 ? Math.max(...lessons.map((l) => l.order)) + 1 : 0,
      }),
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

  /// تحريك درس خطوة لفوق (-1) أو لتحت (+1). الشكل بيتغيّر فورًا، ولو الحفظ
  /// فشل بنرجّع الترتيب القديم ونوضّح السبب.
  async function move(index: number, direction: -1 | 1) {
    if (!lessons) return;
    const target = index + direction;
    if (target < 0 || target >= lessons.length) return;

    const previous = lessons;
    const next = [...lessons];
    [next[index], next[target]] = [next[target], next[index]];
    setLessons(next.map((l, i) => ({ ...l, order: i })));
    setError(null);
    setSavingOrder(true);

    const res = await fetch("/api/lessons/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unitId, ids: next.map((l) => l.id) }),
    }).catch(() => null);
    setSavingOrder(false);

    if (!res || !res.ok) {
      setLessons(previous);
      const data = await res?.json().catch(() => null);
      setError(data?.error ?? "تعذّر حفظ الترتيب. اتأكد من الإنترنت وجرّب تاني.");
    }
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    if (!editTitle.trim()) {
      setError("عنوان الدرس مطلوب.");
      return;
    }
    setSavingEdit(true);
    const res = await fetch(`/api/lessons/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle.trim() }),
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
        <Link href={`/admin/content/${subjectId}`} className="text-sm text-ink-soft hover:text-ink">
          ← رجوع للوحدات
        </Link>
        {unitInfo ? (
          <div className="mt-2 flex items-center gap-3">
            <span className="grid place-items-center w-11 h-11 shrink-0 rounded-xl bg-gradient-brand text-white text-lg font-bold shadow-glow">
              {unitInfo.index + 1}
            </span>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-ink">دروس {unitLabel(unitInfo.index)}</h1>
              <p className="text-sm text-ink-soft mt-0.5 truncate">{unitInfo.title}</p>
            </div>
          </div>
        ) : (
          <h1 className="text-xl font-bold text-ink mt-2">الدروس</h1>
        )}
        <p className="text-sm text-ink-soft mt-2">
          رقم كل درس عند الطلاب بيتحدد من ترتيبه هنا تلقائيًا، فمش محتاج تكتب رقم في العنوان. استخدم الأسهم لتغيير الترتيب.
        </p>
      </div>

      <form
        onSubmit={handleCreate}
        className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4 shadow-elevated"
      >
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-ink mb-1.5">
            عنوان الدرس {lessons && <span className="text-ink-soft font-normal">(هيتضاف كـ {lessonLabel(lessons.length)})</span>}
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثال: المتغيرات وأنواع البيانات"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
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
        {lessons?.map((l, index) => {
          // الرقم اللي الطالب بيشوفه = مكان الدرس في الترتيب. لو فيه رقم مكتوب
          // في أول العنوان بنعرض العنوان من غيره (زي ما الطالب بيشوفه بالظبط).
          const { number: typedNumber, text: cleanTitle } = splitLessonNumber(l.title);

          if (editingId === l.id) {
            return (
              <form
                key={l.id}
                onSubmit={saveEdit}
                className="rounded-xl border-2 border-primary/40 bg-surface p-5 shadow-elevated space-y-3"
              >
                <p className="text-sm font-semibold text-primary">تعديل عنوان {lessonLabel(index)}</p>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  autoFocus
                  maxLength={150}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
                />
                <p className="text-xs text-ink-soft">
                  محتوى الدرس (الشرح والفيديوهات والملفات) بيتعدّل من صفحة الدرس نفسه — دوس على اسم الدرس.
                </p>
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
            );
          }

          return (
            <div
              key={l.id}
              className="rounded-xl border border-border bg-surface p-4 sm:p-5 flex items-center gap-4 flex-wrap shadow-elevated"
            >
              {/* رقم الدرس حسب مكانه في الترتيب */}
              <span className="grid place-items-center w-11 h-11 shrink-0 rounded-xl bg-primary-soft text-primary text-lg font-bold">
                {index + 1}
              </span>

              <div className="flex-1 min-w-[12rem]">
                <p className="text-xs font-semibold text-primary">{lessonLabel(index)}</p>
                <Link
                  href={`/admin/content/${subjectId}/${unitId}/${l.id}`}
                  className="block font-semibold text-ink hover:text-primary mt-0.5"
                >
                  {l.title}
                </Link>
                {l.status === "draft" && l.publishAt && (
                  <p className="mt-1.5 inline-flex rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary">
                    ⏰ هيتنشر تلقائيًا{" "}
                    {new Date(l.publishAt).toLocaleString("ar-EG", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                )}
                {typedNumber && (
                  <p className="mt-1 text-xs text-ink-soft">
                    الطالب بيشوفه: «{cleanTitle}» برقم {index + 1}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm">
                <button
                  onClick={() => move(index, -1)}
                  disabled={index === 0 || savingOrder}
                  className={iconBtn}
                  aria-label={`تقديم ${lessonLabel(index)}`}
                  title="تقديم الدرس خطوة لفوق"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden="true">
                    <path d="m6 15 6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  onClick={() => move(index, 1)}
                  disabled={index === lessons.length - 1 || savingOrder}
                  className={iconBtn}
                  aria-label={`تأخير ${lessonLabel(index)}`}
                  title="تأخير الدرس خطوة لتحت"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden="true">
                    <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    setEditingId(l.id);
                    setEditTitle(l.title);
                    setError(null);
                  }}
                  className="rounded-lg border border-border px-3 py-1.5 font-medium text-ink hover:text-primary hover:border-primary/40 transition-colors"
                >
                  تعديل
                </button>
                <button
                  onClick={() => toggleStatus(l)}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    l.status === "published" ? "border border-accent/40 bg-accent/10 text-accent" : "bg-canvas text-ink-soft"
                  }`}
                >
                  {l.status === "published" ? "منشور" : "مسودة"}
                </button>
                <button onClick={() => handleDelete(l.id)} className="text-danger hover:underline px-1">
                  حذف
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
