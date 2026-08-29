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
      <div>
        <h1 className="text-xl font-bold text-ink">نتائجي</h1>
        <p className="text-sm text-ink-soft mt-1">كل الاختبارات اللي أديتها.</p>
      </div>

      {results === null && <p className="text-sm text-ink-soft">جارٍ التحميل...</p>}
      {results?.length === 0 && (
        <div className="rounded-xl border border-border bg-surface p-6 text-sm text-ink-soft shadow-elevated">
          لسه ما أديتش أي اختبار.
        </div>
      )}

      <div className="space-y-3">
        {results?.map((r) => (
          <Link
            key={r.id}
            href={`/results/${r.id}`}
            className="flex items-center justify-between rounded-xl border border-border bg-surface p-5 hover:border-primary transition shadow-elevated card-hover"
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
              <p className="stat-figure text-2xl font-semibold text-primary">{r.percentage}%</p>
              <p className="text-xs text-ink-soft">
                {r.score} / {r.maxScore}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
