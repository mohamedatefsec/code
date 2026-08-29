"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type AvailableQuiz = {
  id: string;
  title: string;
  subject: string;
  durationMinutes: number;
  questionsCount: number;
  maxAttempts: number;
  inProgressAttemptId: string | null;
  eligible: boolean;
  reason?: string;
  attemptsUsed?: number;
  attemptsRemaining?: number;
};

export default function StudentQuizzesPage() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<AvailableQuiz[] | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/quizzes/available")
      .then((r) => r.json())
      .then((d) => setQuizzes(d.quizzes));
  }, []);

  async function handleStart(quiz: AvailableQuiz) {
    if (quiz.inProgressAttemptId) {
      router.push(`/quizzes/${quiz.id}/attempt`);
      return;
    }
    setError(null);
    setStartingId(quiz.id);
    const res = await fetch(`/api/quizzes/${quiz.id}/start`, { method: "POST" });
    setStartingId(null);
    if (res.ok) {
      router.push(`/quizzes/${quiz.id}/attempt`);
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "تعذّر بدء الاختبار.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">الاختبارات</h1>
        <p className="text-sm text-ink-soft mt-1">الاختبارات المتاحة لك حاليًا.</p>
      </div>

      {error && <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger">{error}</div>}

      {quizzes === null && <p className="text-sm text-ink-soft">جارٍ التحميل...</p>}
      {quizzes?.length === 0 && (
        <div className="rounded-xl border border-border bg-surface p-6 text-sm text-ink-soft shadow-elevated">
          لا توجد اختبارات متاحة حاليًا.
        </div>
      )}

      <div className="space-y-3">
        {quizzes?.map((q) => (
          <div key={q.id} className="rounded-xl border border-border bg-surface p-5 flex items-center justify-between flex-wrap gap-3 shadow-elevated card-hover">
            <div>
              <p className="font-semibold text-ink">{q.title}</p>
              <p className="text-sm text-ink-soft mt-1">
                {q.subject} · {q.durationMinutes} دقيقة · {q.questionsCount} سؤال
                {q.eligible && typeof q.attemptsRemaining === "number" && (
                  <> · {q.attemptsRemaining} محاولة متبقية</>
                )}
              </p>
              {!q.eligible && q.reason && <p className="text-sm text-danger mt-1">{q.reason}</p>}
            </div>
            <button
              onClick={() => handleStart(q)}
              disabled={!q.eligible || startingId === q.id}
              className="rounded-lg bg-gradient-brand px-5 py-2 text-sm font-semibold text-white hover:opacity-90 shadow-glow transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {startingId === q.id
                ? "جارٍ البدء..."
                : q.inProgressAttemptId
                ? "متابعة الاختبار"
                : "ابدأ الاختبار"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
