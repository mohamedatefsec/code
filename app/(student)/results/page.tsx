"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ResultRow = {
  id: string;
  score: number | null;
  maxScore: number | null;
  percentage: number | null;
  submittedAt: string;
  needsManualGrading: boolean;
  quiz: { title: string };
};

/// حلقة دائرية صغيرة (donut) للنسبة المئوية - بديل مرئي أوضح وأسرع قراءة
/// من رقم مجرّد، ولونها يعكس مستوى الأداء بدل ما تكون بلون واحد ثابت
/// دايمًا زي ما كانت الصفحة قبل كده.
function ScoreRing({ percentage }: { percentage: number }) {
  const color =
    percentage >= 85
      ? "var(--color-success)"
      : percentage >= 60
      ? "var(--color-primary)"
      : "var(--color-danger)";
  return (
    <div
      className="relative grid place-items-center w-14 h-14 rounded-full shrink-0"
      style={{ background: `conic-gradient(${color} ${Math.max(0, Math.min(100, percentage))}%, var(--color-border) 0)` }}
    >
      <div className="absolute inset-[3px] rounded-full bg-surface grid place-items-center">
        <span className="stat-figure text-xs font-bold" style={{ color }}>
          {Math.round(percentage)}%
        </span>
      </div>
    </div>
  );
}

function ResultRowSkeleton({ delay }: { delay: number }) {
  return (
    <div
      className="rounded-xl border border-border bg-surface p-5 flex items-center gap-4 shadow-elevated animate-fade-in-up"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex-1 min-w-0 space-y-2">
        <div className="skeleton h-4 w-1/2 rounded" />
        <div className="skeleton h-3 w-1/3 rounded" />
      </div>
      <div className="skeleton w-14 h-14 rounded-full shrink-0" />
    </div>
  );
}

function EmptyResults() {
  return (
    <div className="rounded-xl border border-border bg-surface p-8 text-center shadow-elevated animate-fade-in-up">
      <span className="mx-auto grid place-items-center w-12 h-12 rounded-2xl bg-primary-soft text-primary mb-3">
        <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} className="w-6 h-6">
          <path d="M5 21V10M12 21V4M19 21v-7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <p className="text-sm text-ink-soft">لسه ما أديتش أي اختبار. أول نتيجة هتظهر هنا.</p>
    </div>
  );
}

export default function StudentResultsPage() {
  const [results, setResults] = useState<ResultRow[] | null>(null);

  useEffect(() => {
    fetch("/api/results")
      .then((r) => r.json())
      .then((d) => setResults(d.attempts));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">نتائجي</h1>
        <p className="text-sm text-ink-soft mt-1">كل الاختبارات اللي أديتها.</p>
      </div>

      {results === null && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <ResultRowSkeleton key={i} delay={i * 0.06} />
          ))}
        </div>
      )}

      {results?.length === 0 && <EmptyResults />}

      <div className="space-y-3">
        {results?.map((r, i) => (
          <Link
            key={r.id}
            href={`/results/${r.id}`}
            className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface p-5 hover:border-primary transition shadow-elevated card-hover animate-fade-in-up"
            style={{ animationDelay: `${Math.min(i, 8) * 0.06}s` }}
          >
            <div className="min-w-0">
              <p className="font-medium text-ink truncate">{r.quiz.title}</p>
              <p className="text-sm text-ink-soft mt-1">
                {new Date(r.submittedAt).toLocaleDateString("ar-EG")}
                {r.needsManualGrading && (
                  <span className="ms-2 text-primary">· ⏳ بانتظار التصحيح</span>
                )}
              </p>
              {r.score !== null && r.maxScore !== null && (
                <p className="stat-figure text-xs text-ink-soft mt-1">
                  {r.score} / {r.maxScore}
                </p>
              )}
            </div>
            {r.percentage !== null ? (
              <ScoreRing percentage={r.percentage} />
            ) : (
              <span className="text-xs text-ink-soft shrink-0">قيد التصحيح</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
