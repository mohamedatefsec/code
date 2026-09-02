"use client";

import { useMemo, useState } from "react";

type Option = { id: string; text: string; isCorrect: boolean };
type QuizQuestionRow = {
  order: number;
  pointsOverride: number | null;
  question: {
    id: string;
    text: string;
    type: string;
    codeSnippet: string | null;
    difficulty: "easy" | "medium" | "hard";
    points: number;
    lesson: { title: string } | null;
    options: Option[];
  };
};

type QuizPrintData = {
  title: string;
  subject: { name: string };
  durationMinutes: number;
  maxAttempts: number;
  questions: QuizQuestionRow[];
};

const TYPE_LABELS: Record<string, string> = {
  mcq: "اختيار من متعدد",
  true_false: "صح / خطأ",
  multiple_answer: "اختيارات متعددة",
  ordering: "ترتيب",
  code_output: "توقّع ناتج الكود",
  essay: "سؤال مقالي",
};

const DIFFICULTY_LABELS: Record<string, string> = { easy: "سهل", medium: "متوسط", hard: "صعب" };
const LETTERS = ["أ", "ب", "ج", "د", "هـ", "و", "ز", "ح"];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function QuizPrintView({ quiz }: { quiz: QuizPrintData }) {
  const [showAnswers, setShowAnswers] = useState(false);
  const totalPoints = quiz.questions.reduce((sum, qq) => sum + (qq.pointsOverride ?? qq.question.points), 0);

  // ترتيب خيارات سؤال "ترتيب" (ordering) مخزّن في القاعدة بالتسلسل
  // الصحيح فعليًا (ده أساس التصحيح الآلي). لو عرضناه زي ما هو من غير
  // إظهار الإجابات، هنكون سرّبنا الحل بمجرد ترتيب العرض نفسه - فبنحسب
  // نسخة مخلوطة مرة واحدة بس (useMemo بدل ما تتغيّر مع كل إعادة رسم)
  // ونستخدمها لحد ما "إظهار الإجابات" يتفعّل.
  const shuffledOrderingOptions = useMemo(() => {
    const map: Record<string, Option[]> = {};
    for (const qq of quiz.questions) {
      if (qq.question.type === "ordering") {
        map[qq.question.id] = shuffle(qq.question.options);
      }
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- نحسبها مرة واحدة بس لكل تحميل صفحة، مش لازم تتجدد مع showAnswers
  }, [quiz]);

  return (
    <div className="min-h-screen bg-canvas print:bg-white">
      {/* شريط أدوات - يظهر على الشاشة بس، بيختفي تلقائيًا عند الطباعة */}
      <div className="print:hidden sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-surface px-6 py-3 shadow-elevated">
        <p className="text-sm text-ink-soft">معاينة قبل الطباعة - استخدم خيار &quot;حفظ كـ PDF&quot; في نافذة الطباعة للحفظ كملف.</p>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-ink cursor-pointer select-none">
            <input type="checkbox" checked={showAnswers} onChange={(e) => setShowAnswers(e.target.checked)} />
            إظهار الإجابات الصحيحة
          </label>
          <button
            onClick={() => window.print()}
            className="rounded-lg bg-gradient-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 shadow-glow transition-all active:scale-[0.98]"
          >
            🖨️ طباعة / حفظ PDF
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-3xl p-8 print:p-0 print:max-w-none">
        {/* رأس الورقة */}
        <div className="mb-6 border-b-2 border-ink pb-4">
          <h1 className="text-2xl font-bold text-ink">{quiz.title}</h1>
          <p className="text-sm text-ink-soft mt-1">
            {quiz.subject.name} · {quiz.durationMinutes} دقيقة · {quiz.questions.length} سؤال ·{" "}
            {totalPoints} درجة
          </p>
          <div className="mt-4 flex flex-wrap gap-8 text-sm text-ink">
            <span>الاسم: ‎_________________________</span>
            <span>التاريخ: ‎____________</span>
          </div>
        </div>

        {/* الأسئلة */}
        <div className="space-y-6">
          {quiz.questions.map((qq, i) => {
            const q = qq.question;
            return (
              <div key={q.id} className="break-inside-avoid">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-ink">
                    <span className="stat-figure">{i + 1}.</span> {q.text}
                  </p>
                  <span className="shrink-0 text-xs text-ink-soft whitespace-nowrap">
                    {q.points} د · {DIFFICULTY_LABELS[q.difficulty]}
                    {q.lesson ? ` · ${q.lesson.title}` : ""}
                  </span>
                </div>

                {q.codeSnippet && (
                  <pre className="mt-2 rounded-lg bg-ink text-white text-xs p-3 overflow-x-auto text-left" dir="ltr">
                    {q.codeSnippet}
                  </pre>
                )}

                {q.type === "essay" ? (
                  <div className="mt-3 space-y-3">
                    <div className="border-b border-dotted border-border h-6" />
                    <div className="border-b border-dotted border-border h-6" />
                    <div className="border-b border-dotted border-border h-6" />
                  </div>
                ) : q.type === "ordering" ? (
                  <ol className="mt-2 ms-6 list-decimal space-y-1 text-sm text-ink">
                    {(showAnswers ? q.options : shuffledOrderingOptions[q.id] ?? q.options).map((o) => (
                      <li key={o.id}>{o.text}</li>
                    ))}
                  </ol>
                ) : q.type === "code_output" ? (
                  <div className="mt-3">
                    <div className="border-b border-dotted border-border h-6 max-w-xs" />
                    {showAnswers && (
                      <p className="mt-1.5 text-sm text-accent font-semibold">
                        الناتج الصحيح: <span className="font-mono">{q.options[0]?.text}</span>
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {q.options.map((o, oi) => (
                      <div
                        key={o.id}
                        className={`flex items-center gap-2 text-sm rounded-lg px-2 py-1 ${
                          showAnswers && o.isCorrect ? "bg-accent-soft text-accent font-semibold" : "text-ink"
                        }`}
                      >
                        <span className="stat-figure text-xs text-ink-soft">{LETTERS[oi] ?? oi + 1}.</span>
                        <span>{o.text}</span>
                        {showAnswers && o.isCorrect && <span>✓</span>}
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-xs text-ink-soft mt-1">{TYPE_LABELS[q.type]}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
