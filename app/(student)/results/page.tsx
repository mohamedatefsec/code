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

export default function StudentResultsPage() {
  const [results, setResults] = useState<ResultRow[] | null>(null);

  useEffect(() => {
    fetch("/api/results")
      .then((r) => r.json())
      .then((d) => setResults(d.attempts));
  }, []);

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-xl font-bold text-ink">نتائجي</h1>
        <p className="text-sm text-ink-soft mt-1">كل الاختبارات اللي أديتها.</p>
      </div>

      {results === null && (
        <div className="space-y-3">
          <div className="h-20 skeleton rounded-2xl" />
          <div className="h-20 skeleton rounded-2xl" />
        </div>
      )}
      {results?.length === 0 && (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center shadow-elevated animate-fade-in-up">
          <div className="mx-auto mb-3 grid place-items-center w-14 h-14 rounded-full bg-primary-soft text-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="w-7 h-7">
              <path d="M5 21V10M12 21V4M19 21v-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-sm text-ink-soft">لسه ما أديتش أي اختبار.</p>
        </div>
      )}

      <div className="space-y-3">
        {results?.map((r, i) => {
          const scoreColor =
            r.percentage === null
              ? "text-ink-soft"
              : r.percentage >= 85
              ? "text-accent"
              : r.percentage >= 50
              ? "text-primary"
              : "text-danger";
          return (
            <Link
              key={r.id}
              href={`/results/${r.id}`}
              className="flex items-center justify-between rounded-2xl border border-border bg-surface p-5 hover:border-primary transition shadow-elevated card-hover animate-fade-in-up"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div>
                <p className="font-medium text-ink">{r.quiz.title}</p>
                <p className="text-sm text-ink-soft mt-1">
                  {new Date(r.submittedAt).toLocaleDateString("ar-EG")}
                  {r.needsManualGrading && (
                    <span className="ms-2 text-primary">· ⏳ بانتظار التصحيح</span>
                  )}
                </p>
              </div>
              <div className="text-end">
                <p className={`stat-figure text-2xl font-semibold ${scoreColor}`}>{r.percentage}%</p>
                <p className="text-xs text-ink-soft">
                  {r.score} / {r.maxScore}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
