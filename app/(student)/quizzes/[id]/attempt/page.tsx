"use client";

import { useEffect, useState, use, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

type QuestionType = "mcq" | "true_false" | "multiple_answer" | "ordering" | "code_output" | "essay";
type Option = { id: string; text: string };
type AttemptQuestion = {
  id: string;
  type: QuestionType;
  text: string;
  codeSnippet: string | null;
  points: number;
  options: Option[];
};
type AttemptData = {
  id: string;
  status: string;
  startedAt: string;
  remainingSeconds: number;
  quiz: { id: string; title: string; durationMinutes: number };
  questions: AttemptQuestion[];
};

const TYPE_LABELS: Record<QuestionType, string> = {
  mcq: "اختيار من متعدد",
  true_false: "صح / خطأ",
  multiple_answer: "اختر كل الإجابات الصحيحة",
  ordering: "رتّب العناصر بالترتيب الصحيح",
  code_output: "اكتب الناتج المتوقع بالظبط",
  essay: "سؤال مقالي - اكتب إجابة مفصّلة",
};

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function AttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: quizId } = use(params);
  const router = useRouter();
  const [attempt, setAttempt] = useState<AttemptData | null>(null);
  const [answers, setAnswers] = useState<
    Record<string, { selectedOptionIds?: string[]; textAnswer?: string }>
  >({});
  const [orderState, setOrderState] = useState<Record<string, Option[]>>({});
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoSubmitted = useRef(false);

  useEffect(() => {
    // /api/quizzes/{quizId}/start "آمنة للتكرار": لو فيه محاولة شغّالة بالفعل
    // بترجّعها بدل ما تبدأ محاولة جديدة، فده بيسمح لنا نحصل على attemptId
    // الصحيح سواء كانت هذه أول زيارة للصفحة أو Refresh في منتصف الاختبار.
    fetch(`/api/quizzes/${quizId}/start`, { method: "POST" })
      .then((r) => r.json())
      .then((startData) => {
        if (startData.error) {
          setError(startData.error);
          return;
        }
        return fetch(`/api/attempts/${startData.attemptId}`)
          .then((r) => r.json())
          .then((d) => {
            if (d.error) {
              setError(d.error);
              return;
            }
            const a: AttemptData = d.attempt;
            setAttempt(a);
            setRemainingSeconds(a.remainingSeconds);
            const initialOrder: Record<string, Option[]> = {};
            a.questions.forEach((q) => {
              if (q.type === "ordering") initialOrder[q.id] = q.options;
            });
            setOrderState(initialOrder);
          });
      });
  }, [quizId]);

  const submit = useCallback(
    async (attemptId: string) => {
      setSubmitting(true);
      const payload = {
        answers: Object.entries(answers).map(([questionId, a]) => ({
          questionId,
          selectedOptionIds: a.selectedOptionIds ?? null,
          textAnswer: a.textAnswer ?? null,
        })),
      };
      const res = await fetch(`/api/attempts/${attemptId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setSubmitting(false);
      if (res.ok) {
        router.push(`/results/${attemptId}`);
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "تعذّر تسليم الاختبار.");
      }
    },
    [answers, router]
  );

  // نحتفظ بأحدث نسخة من submit في ref بدل الاعتماد عليها كاعتمادية مباشرة
  // في useEffect العدّاد - لأن submit بيتغيّر مع كل إجابة يكتبها الطالب،
  // ولو اعتمدنا عليها مباشرة كان هيعيد ضبط الـ interval مع كل إجابة
  // ويبطّئ العدّ الفعلي عن الثانية الحقيقية.
  const submitRef = useRef(submit);
  useEffect(() => {
    submitRef.current = submit;
  }, [submit]);

  // العدّاد التنازلي: نعدّ محليًا كل ثانية من القيمة الجاية من السيرفر
  // (remainingSeconds) بدل ما نحسب الفرق بين "الآن" بتاع جهاز الطالب وبين
  // وقت البدء - عشان لو ساعة جهاز الطالب غلط، العدّاد يفضل صحيح وميظهرش
  // "انتهى الوقت" فورًا رغم إن الوقت الفعلي لسه متبقّي.
  useEffect(() => {
    if (!attempt) return;
    const interval = setInterval(() => {
      setRemainingSeconds((s) => {
        if (s === null) return s;
        if (s <= 1) {
          clearInterval(interval);
          if (!autoSubmitted.current) {
            autoSubmitted.current = true;
            submitRef.current(attempt.id);
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [attempt]);

  function setSingleAnswer(questionId: string, optionId: string) {
    setAnswers((a) => ({ ...a, [questionId]: { selectedOptionIds: [optionId] } }));
  }

  function toggleMultiAnswer(questionId: string, optionId: string) {
    setAnswers((a) => {
      const current = a[questionId]?.selectedOptionIds ?? [];
      const next = current.includes(optionId)
        ? current.filter((x) => x !== optionId)
        : [...current, optionId];
      return { ...a, [questionId]: { selectedOptionIds: next } };
    });
  }

  function setTextAnswer(questionId: string, text: string) {
    setAnswers((a) => ({ ...a, [questionId]: { textAnswer: text } }));
  }

  function moveOrderItem(questionId: string, index: number, dir: -1 | 1) {
    setOrderState((state) => {
      const list = [...(state[questionId] ?? [])];
      const target = index + dir;
      if (target < 0 || target >= list.length) return state;
      [list[index], list[target]] = [list[target], list[index]];
      return { ...state, [questionId]: list };
    });
    setAnswers((a) => {
      const list = orderState[questionId] ?? [];
      const next = [...list];
      const target = index + dir;
      if (target < 0 || target >= next.length) return a;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...a, [questionId]: { selectedOptionIds: next.map((o) => o.id) } };
    });
  }

  if (error && !attempt) {
    return <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>;
  }
  if (!attempt) {
    return <p className="text-sm text-ink-soft">جارٍ التحميل...</p>;
  }

  const isTimeCritical = remainingSeconds !== null && remainingSeconds <= 60;

  return (
    <div className="max-w-2xl space-y-6 pb-40 md:pb-24">
      <div className="sticky top-0 z-10 -mx-6 glass-surface px-6 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <h1 className="font-bold text-ink">{attempt.quiz.title}</h1>
          {remainingSeconds !== null && (
            <span
              className={`stat-figure text-lg font-semibold ${
                isTimeCritical ? "text-danger animate-pulse-glow" : "text-primary"
              }`}
            >
              {formatTime(remainingSeconds)}
            </span>
          )}
        </div>
        {remainingSeconds !== null && (
          <div className="mt-2 h-1 rounded-full bg-border overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-linear ${
                isTimeCritical ? "bg-danger" : "bg-gradient-brand"
              }`}
              style={{
                width: `${Math.min(
                  100,
                  (remainingSeconds / (attempt.quiz.durationMinutes * 60)) * 100
                )}%`,
              }}
            />
          </div>
        )}
      </div>

      {attempt.questions.map((q, index) => (
        <div
          key={q.id}
          className="rounded-2xl border border-border bg-surface p-6 space-y-4 shadow-elevated animate-fade-in-up"
          style={{ animationDelay: `${Math.min(index, 6) * 0.06}s` }}
        >
          <div>
            <p className="text-xs text-ink-soft mb-1">
              سؤال {index + 1} من {attempt.questions.length} · {TYPE_LABELS[q.type]} · {q.points} درجة
            </p>
            <p className="font-medium text-ink">{q.text}</p>
            {q.codeSnippet && (
              <pre className="mt-2 rounded-lg bg-ink text-slate-200 p-3 text-sm overflow-x-auto font-mono">
                {q.codeSnippet}
              </pre>
            )}
          </div>

          {(q.type === "mcq" || q.type === "true_false") && (
            <div className="space-y-2">
              {q.options.map((o) => (
                <label key={o.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name={q.id}
                    checked={answers[q.id]?.selectedOptionIds?.[0] === o.id}
                    onChange={() => setSingleAnswer(q.id, o.id)}
                  />
                  {o.text}
                </label>
              ))}
            </div>
          )}

          {q.type === "multiple_answer" && (
            <div className="space-y-2">
              {q.options.map((o) => (
                <label key={o.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(answers[q.id]?.selectedOptionIds ?? []).includes(o.id)}
                    onChange={() => toggleMultiAnswer(q.id, o.id)}
                  />
                  {o.text}
                </label>
              ))}
            </div>
          )}

          {q.type === "ordering" && (
            <div className="space-y-2">
              {(orderState[q.id] ?? q.options).map((o, i) => (
                <div key={o.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                  <span className="stat-figure text-xs text-ink-soft w-5">{i + 1}</span>
                  <span className="flex-1">{o.text}</span>
                  <button type="button" onClick={() => moveOrderItem(q.id, i, -1)} className="text-ink-soft hover:text-ink px-1">
                    ↑
                  </button>
                  <button type="button" onClick={() => moveOrderItem(q.id, i, 1)} className="text-ink-soft hover:text-ink px-1">
                    ↓
                  </button>
                </div>
              ))}
            </div>
          )}

          {q.type === "code_output" && (
            <input
              value={answers[q.id]?.textAnswer ?? ""}
              onChange={(e) => setTextAnswer(q.id, e.target.value)}
              placeholder="اكتب الناتج هنا..."
              className="w-full rounded-lg border border-border px-4 py-2.5 font-mono text-sm transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
            />
          )}

          {q.type === "essay" && (
            <textarea
              value={answers[q.id]?.textAnswer ?? ""}
              onChange={(e) => setTextAnswer(q.id, e.target.value)}
              rows={6}
              placeholder="اكتب إجابتك هنا..."
              className="w-full rounded-lg border border-border px-4 py-2.5 leading-7 transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
            />
          )}
        </div>
      ))}

      {error && <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger">{error}</div>}

      <div className="fixed bottom-16 md:bottom-0 inset-x-0 z-30 md:static bg-surface md:bg-transparent border-t md:border-0 border-border p-4 md:p-0">
        <button
          onClick={() => submit(attempt.id)}
          disabled={submitting}
          className="w-full sm:w-auto rounded-lg bg-gradient-brand px-6 py-3 font-semibold text-white hover:opacity-90 shadow-glow transition-all active:scale-[0.98] disabled:opacity-60"
        >
          {submitting ? "جارٍ التسليم..." : "تسليم الاختبار"}
        </button>
      </div>
    </div>
  );
}
