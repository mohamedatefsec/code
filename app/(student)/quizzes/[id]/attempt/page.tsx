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
  startedAt: string | null;
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
  const [beginning, setBeginning] = useState(false);
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

  // زر "ابدأ الاختبار" الفعلي: هنا بس بيبدأ العدّاد التنازلي، مش أول ما
  // تُفتح الصفحة - سواء كانت هذه أول محاولة أو محاولة فتحها المدرّس.
  async function handleBegin() {
    if (!attempt) return;
    setBeginning(true);
    setError(null);
    const res = await fetch(`/api/attempts/${attempt.id}/begin`, { method: "POST" });
    const data = await res.json().catch(() => null);
    setBeginning(false);
    if (!res.ok) {
      setError(data?.error ?? "تعذّر بدء الاختبار.");
      return;
    }
    setAttempt((prev) =>
      prev ? { ...prev, status: data.attempt.status, startedAt: data.attempt.startedAt } : prev
    );
  }

  // العدّاد التنازلي - بيشتغل بس لما المحاولة "in_progress" وليها startedAt فعلي
  useEffect(() => {
    if (!attempt || attempt.status !== "in_progress" || !attempt.startedAt) return;
    const deadline =
      new Date(attempt.startedAt).getTime() + attempt.quiz.durationMinutes * 60 * 1000;

    const tick = () => {
      const secs = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setRemainingSeconds(secs);
      if (secs === 0 && !autoSubmitted.current) {
        autoSubmitted.current = true;
        submit(attempt.id);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [attempt, submit]);

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

  // شاشة البداية: المحاولة مفتوحة لكن العدّاد لسه ما بدأش - بينتظر الطالب
  // يضغط الزر بنفسه، بدل ما يبدأ تلقائيًا لحظة تحميل الصفحة.
  if (attempt.status === "pending") {
    return (
      <div className="max-w-lg mx-auto space-y-6 pt-6">
        <div className="rounded-xl border border-border bg-surface p-6 shadow-elevated text-center space-y-4 animate-fade-in-up">
          <h1 className="text-xl font-bold text-ink">{attempt.quiz.title}</h1>
          <p className="text-sm text-ink-soft">
            الاختبار يحتوي على {attempt.questions.length} سؤال، ومدته {attempt.quiz.durationMinutes} دقيقة.
            العدّاد التنازلي هيبدأ فور ما تضغط الزر تحت - خُد وقتك وجهّز نفسك الأول.
          </p>
          {error && (
            <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger">
              {error}
            </div>
          )}
          <button
            onClick={handleBegin}
            disabled={beginning}
            className="w-full sm:w-auto rounded-lg bg-gradient-brand px-8 py-3 font-semibold text-white hover:opacity-90 shadow-glow transition-all active:scale-[0.98] disabled:opacity-60"
          >
            {beginning ? "جارٍ البدء..." : "ابدأ الاختبار"}
          </button>
        </div>
      </div>
    );
  }

  const isTimeCritical = remainingSeconds !== null && remainingSeconds <= 60;

  return (
    <div className="max-w-2xl space-y-6 pb-32 md:pb-24">
      {/* top-[60px] عشان ميتغطّاش وراء هيدر الموبايل العلوي (sticky top-0 برضه
          في StudentShell) - القيمة دي تقريبًا ارتفاع الهيدر ده. من md وفوق
          مفيش هيدر علوي للموبايل، فبيرجع top-0 عادي. */}
      <div className="sticky top-[60px] md:top-0 z-10 -mx-4 sm:-mx-6 glass-surface px-4 sm:px-6 py-3 border-b border-border">
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
          className="rounded-xl border border-border bg-surface p-6 space-y-4 shadow-elevated animate-fade-in-up"
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

      {/* شريط التسليم: على الموبايل بيبقى ثابت فوق شريط التنقّل السفلي مباشرة
          (اللي ارتفاعه تقريبًا 4rem) وبـ z-index أعلى منه، عشان زر "تسليم
          الاختبار" ميختفيش وراه. من md وفوق مفيش شريط تنقّل سفلي أصلًا،
          فبيرجع للتدفّق العادي في نهاية الصفحة. */}
      <div className="fixed inset-x-0 bottom-16 z-30 md:static md:z-auto bg-surface md:bg-transparent border-t md:border-0 border-border p-4 md:p-0 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] md:shadow-none">
        <button
          onClick={() => submit(attempt.id)}
          disabled={submitting}
          className="w-full md:w-auto rounded-lg bg-gradient-brand px-6 py-3 font-semibold text-white hover:opacity-90 shadow-glow transition-all active:scale-[0.98] disabled:opacity-60"
        >
          {submitting ? "جارٍ التسليم..." : "تسليم الاختبار"}
        </button>
      </div>
    </div>
  );
}
