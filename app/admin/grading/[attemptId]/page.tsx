"use client";

import { useEffect, useState, use, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type EssayAnswer = {
  questionId: string;
  questionText: string;
  maxPoints: number;
  textAnswer: string | null;
  pointsEarned: number;
};
type AttemptDetail = {
  id: string;
  quizTitle: string;
  studentName: string;
  studentCode: string;
  needsManualGrading: boolean;
  essayAnswers: EssayAnswer[];
};

export default function GradeAttemptPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = use(params);
  const router = useRouter();
  const [attempt, setAttempt] = useState<AttemptDetail | null>(null);
  const [points, setPoints] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/attempts/${attemptId}/grade-essays`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setError(d.error);
          return;
        }
        setAttempt(d.attempt);
        const initial: Record<string, number> = {};
        d.attempt.essayAnswers.forEach((a: EssayAnswer) => {
          initial[a.questionId] = a.pointsEarned;
        });
        setPoints(initial);
      });
  }, [attemptId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const res = await fetch(`/api/attempts/${attemptId}/grade-essays`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grades: Object.entries(points).map(([questionId, pointsEarned]) => ({
          questionId,
          pointsEarned,
        })),
      }),
    });
    setSaving(false);
    if (res.ok) {
      router.push("/admin/grading");
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "تعذّر حفظ التصحيح.");
    }
  }

  if (error && !attempt) {
    return <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>;
  }
  if (!attempt) {
    return <p className="text-sm text-ink-soft">جارٍ التحميل...</p>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/admin/grading" className="text-sm text-ink-soft hover:text-ink">
          ← رجوع لقائمة التصحيح
        </Link>
        <h1 className="text-xl font-bold text-ink mt-2">{attempt.quizTitle}</h1>
        <p className="text-sm text-ink-soft mt-1">
          {attempt.studentName} ({attempt.studentCode})
        </p>
      </div>

      {!attempt.needsManualGrading && (
        <div className="rounded-lg border border-accent/40 bg-accent/10 px-4 py-2.5 text-sm text-accent">
          تم تصحيح هذه المحاولة بالفعل — يمكنك تعديل الدرجات وإعادة الحفظ لو احتجت.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {attempt.essayAnswers.map((a) => (
          <div key={a.questionId} className="rounded-xl border border-border bg-surface p-5 space-y-3 shadow-elevated">
            <p className="font-medium text-ink">{a.questionText}</p>
            <div className="rounded-lg bg-canvas p-3 text-sm text-ink whitespace-pre-wrap leading-6">
              {a.textAnswer || <span className="text-ink-soft">(لم يكتب الطالب إجابة)</span>}
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-ink">الدرجة:</label>
              <input
                type="number"
                min={0}
                max={a.maxPoints}
                step="any"
                value={points[a.questionId] ?? 0}
                onChange={(e) => {
                  const v = e.target.value === "" ? 0 : parseFloat(e.target.value);
                  setPoints((p) => ({ ...p, [a.questionId]: Number.isNaN(v) ? 0 : v }));
                }}
                className="w-20 rounded-lg border border-border px-3 py-1.5 text-sm"
              />
              <span className="text-sm text-ink-soft">/ {a.maxPoints}</span>
            </div>
          </div>
        ))}

        {error && <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger">{error}</div>}

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-gradient-brand px-5 py-2.5 font-semibold text-white hover:opacity-90 shadow-glow transition-all active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? "جارٍ الحفظ..." : "حفظ التصحيح"}
        </button>
      </form>
    </div>
  );
}
