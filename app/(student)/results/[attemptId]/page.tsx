"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AnimatedNumber } from "@/components/AnimatedNumber";

type ResultOption = { id: string; text: string; isCorrect: boolean; order: number };
type ResultAnswer = {
  questionText: string;
  questionType: string;
  explanation: string | null;
  isCorrect: boolean | null;
  pointsEarned: number;
  maxPoints: number;
  selectedOptionIds: string[] | null;
  textAnswer: string | null;
  options: ResultOption[];
};
type Result = {
  quizTitle: string;
  score: number;
  maxScore: number;
  percentage: number;
  timeSpentSeconds: number;
  needsManualGrading: boolean;
  answers: ResultAnswer[];
};

export default function ResultDetailPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = use(params);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/attempts/${attemptId}/result`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setResult(d.result);
      });
  }, [attemptId]);

  if (error) return <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>;
  if (!result) return <p className="text-sm text-ink-soft">جارٍ التحميل...</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Link href="/results" className="text-sm text-ink-soft hover:text-ink">
          ← رجوع للنتائج
        </Link>
        <h1 className="text-xl font-bold text-ink mt-2">
          {result.quizTitle} {result.percentage >= 90 && !result.needsManualGrading && "🎉"}
        </h1>
      </motion.div>

      <div className="rounded-xl border border-border bg-surface p-6 flex items-center justify-around text-center shadow-elevated relative overflow-hidden">
        {result.percentage >= 90 && !result.needsManualGrading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 0.12, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0"
            style={{ background: "var(--gradient-brand)" }}
          />
        )}
        <div className="relative">
          <p className="stat-figure text-3xl font-semibold text-primary">
            <AnimatedNumber value={result.percentage} suffix="%" />
          </p>
          <p className="text-xs text-ink-soft mt-1">{result.needsManualGrading ? "النسبة (جزئية)" : "النسبة"}</p>
        </div>
        <div className="relative">
          <p className="stat-figure text-3xl font-semibold text-ink">
            {result.score}/{result.maxScore}
          </p>
          <p className="text-xs text-ink-soft mt-1">الدرجة</p>
        </div>
        <div className="relative">
          <p className="stat-figure text-3xl font-semibold text-ink">
            {Math.floor(result.timeSpentSeconds / 60)}د
          </p>
          <p className="text-xs text-ink-soft mt-1">الوقت المستغرق</p>
        </div>
      </div>

      {result.needsManualGrading && (
        <div className="rounded-lg bg-primary-soft px-4 py-3 text-sm text-primary">
          ⏳ فيه سؤال مقالي بانتظار تصحيح المدرّس — الدرجة والنسبة أعلاه لسه
          مش نهائية وهتتحدّث بعد التصحيح.
        </div>
      )}

      <div className="space-y-3">
        {result.answers.map((a, i) => (
          <div
            key={i}
            className={`rounded-xl border p-5 ${
              a.isCorrect === null
                ? "border-border bg-surface"
                : a.isCorrect
                ? "border-accent/40 bg-accent/10"
                : "border-danger/40 bg-danger/10"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium text-ink">{a.questionText}</p>
              <span
                className={`text-sm font-semibold shrink-0 ${
                  a.isCorrect === null ? "text-ink-soft" : a.isCorrect ? "text-accent" : "text-danger"
                }`}
              >
                {a.isCorrect === null
                  ? a.questionType === "essay" && a.pointsEarned === 0 && !a.textAnswer
                    ? "لم يُجب"
                    : `⏳ بانتظار التصحيح`
                  : a.isCorrect
                  ? "✓ صحيحة"
                  : "✗ خاطئة"}{" "}
                · {a.pointsEarned}/{a.maxPoints} د
              </span>
            </div>

            {a.questionType === "essay" ? (
              <div className="mt-3 text-sm">
                <p className="text-ink-soft mb-1">إجابتك:</p>
                <div className="rounded-lg bg-canvas p-3 whitespace-pre-wrap leading-6 text-ink">
                  {a.textAnswer || <span className="text-ink-soft">(لم تكتب إجابة)</span>}
                </div>
              </div>
            ) : a.questionType === "code_output" ? (
              <div className="mt-3 text-sm space-y-1">
                <p className="text-ink-soft">إجابتك: <span className="font-mono">{a.textAnswer || "—"}</span></p>
                {!a.isCorrect && (
                  <p className="text-ink-soft">
                    الناتج الصحيح: <span className="font-mono">{a.options[0]?.text}</span>
                  </p>
                )}
              </div>
            ) : a.questionType === "ordering" ? (
              <div className="mt-3 grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-ink-soft mb-1">ترتيبك:</p>
                  <ol className="list-decimal list-inside space-y-0.5">
                    {(a.selectedOptionIds ?? []).map((optId) => {
                      const opt = a.options.find((o) => o.id === optId);
                      return <li key={optId}>{opt?.text}</li>;
                    })}
                  </ol>
                </div>
                {!a.isCorrect && (
                  <div>
                    <p className="text-accent mb-1">الترتيب الصحيح:</p>
                    <ol className="list-decimal list-inside space-y-0.5">
                      {[...a.options]
                        .sort((x, y) => x.order - y.order)
                        .map((o) => (
                          <li key={o.id}>{o.text}</li>
                        ))}
                    </ol>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-3 space-y-1">
                {a.options.map((o) => {
                  const wasSelected = (a.selectedOptionIds ?? []).includes(o.id);
                  return (
                    <p
                      key={o.id}
                      className={`text-sm ${
                        o.isCorrect
                          ? "text-accent font-medium"
                          : wasSelected
                          ? "text-danger"
                          : "text-ink-soft"
                      }`}
                    >
                      {o.isCorrect ? "✓" : wasSelected ? "✗" : "○"} {o.text}
                    </p>
                  );
                })}
              </div>
            )}

            {a.explanation && (
              <p className="mt-3 text-sm text-ink-soft border-t border-border/50 pt-2">
                💡 {a.explanation}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
