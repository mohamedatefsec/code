"use client";

import { useEffect, useState, FormEvent, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Subject = { id: string; name: string };
type Quiz = {
  id: string;
  title: string;
  subjectId: string;
  durationMinutes: number;
  maxAttempts: number;
  startAt: string | null;
  endAt: string | null;
  status: "draft" | "published" | "closed";
};

// يحوّل تاريخ ISO لصيغة input[type=datetime-local]، ويرجّع فاضي لو مفيش تاريخ
function toLocalInputValue(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EditQuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(20);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/subjects")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setSubjects(d.subjects ?? []);
      })
      .catch(() => {});

    fetch(`/api/quizzes/${id}`)
      .then(async (r) => {
        const data = await r.json().catch(() => null);
        if (!r.ok) throw new Error(data?.error ?? `تعذّر تحميل بيانات الاختبار (خطأ ${r.status}).`);
        if (!data?.quiz) throw new Error("تعذّر تحميل بيانات الاختبار: استجابة غير متوقعة.");
        return data.quiz as Quiz;
      })
      .then((q) => {
        if (cancelled) return;
        setQuiz(q);
        setTitle(q.title);
        setSubjectId(q.subjectId);
        setDurationMinutes(q.durationMinutes);
        setMaxAttempts(q.maxAttempts);
        setStartAt(toLocalInputValue(q.startAt));
        setEndAt(toLocalInputValue(q.endAt));
      })
      .catch((err: Error) => {
        if (!cancelled) setLoadError(err.message || "تعذّر تحميل بيانات الاختبار.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const res = await fetch(`/api/quizzes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        subjectId,
        durationMinutes,
        maxAttempts,
        startAt: startAt ? new Date(startAt).toISOString() : null,
        endAt: endAt ? new Date(endAt).toISOString() : null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      router.push("/admin/quizzes");
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "تعذّر حفظ التعديلات.");
    }
  }

  if (loading) {
    return <p className="text-sm text-ink-soft">جارٍ التحميل...</p>;
  }

  if (loadError || !quiz) {
    return (
      <div className="max-w-lg space-y-4">
        <Link href="/admin/quizzes" className="text-sm text-ink-soft hover:text-ink">
          ← رجوع للاختبارات
        </Link>
        <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {loadError ?? "تعذّر تحميل بيانات الاختبار."}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <Link href="/admin/quizzes" className="text-sm text-ink-soft hover:text-ink">
          ← رجوع للاختبارات
        </Link>
        <h1 className="text-xl font-bold text-ink mt-2">تعديل الاختبار</h1>
        <p className="text-sm text-ink-soft mt-1">
          عدّل بيانات الاختبار الأساسية زي الوقت والمدة. لتعديل الأسئلة والاستهداف روح لصفحة الإعداد.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-surface p-6 shadow-elevated">
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">عنوان الاختبار</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-border px-4 py-2.5 transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">المادة</label>
          <select
            required
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="w-full rounded-lg border border-border px-4 py-2.5 transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
          >
            <option value="">اختر</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">مدة الاختبار (دقيقة)</label>
            <input
              type="number"
              min={1}
              max={600}
              required
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="w-full rounded-lg border border-border px-4 py-2.5 transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">عدد المحاولات المسموحة</label>
            <input
              type="number"
              min={1}
              max={20}
              required
              value={maxAttempts}
              onChange={(e) => setMaxAttempts(Number(e.target.value))}
              className="w-full rounded-lg border border-border px-4 py-2.5 transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">وقت بداية الإتاحة (اختياري)</label>
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2.5 text-sm transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">وقت نهاية الإتاحة (اختياري)</label>
            <input
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2.5 text-sm transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
            />
          </div>
        </div>
        <p className="text-xs text-ink-soft -mt-2">
          لو سيبت وقت البداية/النهاية فاضي، الاختبار يفضل متاح طول الوقت (حسب حالة النشر).
        </p>

        {error && <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger">{error}</div>}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-gradient-brand py-2.5 font-semibold text-white hover:opacity-90 shadow-glow transition-all active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? "جارٍ الحفظ..." : "حفظ التعديلات"}
        </button>
      </form>
    </div>
  );
}
