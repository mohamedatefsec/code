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

/// أيقونة اختبار صغيرة - نفس رمز الاختبار المستخدم في بطاقة إحصائية
/// "الاختبارات" بالداشبورد، عشان تفضل هوية الأيقونات موحّدة في الموقع كله.
function QuizGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} className="w-5 h-5">
      <path
        d="M9 3.5h6a1 1 0 0 1 1 1v.5h1a1 1 0 0 1 1 1V19a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a1 1 0 0 1 1-1h1v-.5a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="m9 12.5 2 2 4-4.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClockGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} className="w-3.5 h-3.5">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" />
      <path d="M12 7.5V12l3 2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} className="w-3.5 h-3.5">
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" stroke="currentColor" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="currentColor" strokeLinecap="round" />
    </svg>
  );
}

function QuizCardSkeleton({ delay }: { delay: number }) {
  return (
    <div
      className="rounded-xl border border-border bg-surface p-5 flex items-center gap-4 shadow-elevated animate-fade-in-up"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="skeleton w-11 h-11 rounded-xl shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="skeleton h-4 w-2/3 rounded" />
        <div className="skeleton h-3 w-1/3 rounded" />
      </div>
      <div className="skeleton h-9 w-24 rounded-lg shrink-0" />
    </div>
  );
}

function EmptyQuizzes() {
  return (
    <div className="rounded-xl border border-border bg-surface p-8 text-center shadow-elevated animate-fade-in-up">
      <span className="mx-auto grid place-items-center w-12 h-12 rounded-2xl bg-primary-soft text-primary mb-3">
        <QuizGlyph />
      </span>
      <p className="text-sm text-ink-soft">لا توجد اختبارات متاحة حاليًا. راجع لاحقًا.</p>
    </div>
  );
}

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

      {error && (
        <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger animate-fade-in-up">
          {error}
        </div>
      )}

      {quizzes === null && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <QuizCardSkeleton key={i} delay={i * 0.06} />
          ))}
        </div>
      )}

      {quizzes?.length === 0 && <EmptyQuizzes />}

      <div className="space-y-3">
        {quizzes?.map((q, i) => {
          const accent = i % 2 === 0 ? "primary" : "accent";
          const inProgress = Boolean(q.inProgressAttemptId);
          return (
            <div
              key={q.id}
              className={`group relative rounded-xl border bg-surface p-5 flex items-center justify-between flex-wrap gap-3 shadow-elevated card-hover animate-fade-in-up ${
                inProgress ? "border-primary/40" : "border-border"
              } ${!q.eligible && !inProgress ? "opacity-70" : ""}`}
              style={{ animationDelay: `${Math.min(i, 8) * 0.06}s` }}
            >
              {inProgress && (
                <span
                  className="absolute -top-2 start-4 inline-flex items-center gap-1.5 rounded-full bg-surface border border-primary/30 px-2.5 py-0.5 text-[11px] font-medium text-primary shadow-sm"
                  aria-hidden="true"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow" />
                  قيد التنفيذ
                </span>
              )}

              <div className="flex items-center gap-4 min-w-0">
                <span
                  className={`grid place-items-center w-11 h-11 rounded-xl shrink-0 transition-transform group-hover:scale-105 ${
                    accent === "accent" ? "bg-accent-soft text-accent" : "bg-primary-soft text-primary"
                  }`}
                >
                  <QuizGlyph />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-ink truncate">{q.title}</p>
                  <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-sm text-ink-soft mt-1">
                    <span>{q.subject}</span>
                    <span className="inline-flex items-center gap-1">
                      <ClockGlyph /> {q.durationMinutes} دقيقة
                    </span>
                    <span>{q.questionsCount} سؤال</span>
                  </div>
                  {q.eligible && typeof q.attemptsRemaining === "number" && (
                    <span
                      className={`inline-flex items-center mt-2 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                        q.attemptsRemaining <= 1
                          ? "bg-warn-soft text-warn"
                          : "bg-primary-soft text-primary"
                      }`}
                    >
                      {q.attemptsRemaining} محاولة متبقية
                    </span>
                  )}
                  {!q.eligible && !inProgress && q.reason && (
                    <span className="inline-flex items-center gap-1 mt-2 rounded-full bg-danger-soft px-2.5 py-0.5 text-[11px] font-medium text-danger">
                      <LockGlyph /> {q.reason}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleStart(q)}
                disabled={(!q.eligible && !inProgress) || startingId === q.id}
                className="rounded-lg bg-gradient-brand px-5 py-2 text-sm font-semibold text-white hover:opacity-90 shadow-glow transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {startingId === q.id ? "جارٍ البدء..." : inProgress ? "متابعة الاختبار" : "ابدأ الاختبار"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
