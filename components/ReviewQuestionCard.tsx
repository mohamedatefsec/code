"use client";

import { useState } from "react";
import {
  REVIEW_TYPE_LABELS,
  type ReviewCardAnswer,
  type ReviewCardData,
} from "@/lib/review-shared";

/// بطاقة سؤال مراجعة للطالب.
/// - قبل الحل: الطالب يختار/يكتب إجابته ويأكّدها (مرة واحدة فقط).
/// - بعد الحل: البطاقة تتقفل (مفيش أي إدخال)، وتفضل ظاهرة بإجابته والإجابة
///   الصحيحة والشرح. القفل الحقيقي على السيرفر (unique في قاعدة البيانات)،
///   وده مجرد انعكاس بصري ليه.
export function ReviewQuestionCard({
  question,
  index = 0,
  onSolved,
}: {
  question: ReviewCardData;
  index?: number;
  /** يُستدعى مرة واحدة أول ما السؤال يتقفل (لتحديث عدّاد التقدّم في القائمة). */
  onSolved?: (questionId: string) => void;
}) {
  const [answer, setAnswer] = useState<ReviewCardAnswer | null>(question.answer);
  const [selected, setSelected] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMulti = question.type === "multiple_answer";
  const isCode = question.type === "code_output";
  const isEssay = question.type === "essay";
  // code_output والمقالي إجابتهم نص حر؛ الباقي اختيارات
  const usesText = isCode || isEssay;
  const locked = answer !== null;

  const canSubmit = usesText
    ? text.trim().length > 0
    : isMulti
    ? selected.length >= 1
    : selected.length === 1;

  function toggle(optionId: string) {
    if (isMulti) {
      setSelected((prev) =>
        prev.includes(optionId) ? prev.filter((x) => x !== optionId) : [...prev, optionId]
      );
    } else {
      setSelected([optionId]);
    }
  }

  async function submit() {
    if (!canSubmit || submitting) return;
    if (!confirm("متأكد من إجابتك؟ مش هتقدر تغيّرها بعد التأكيد.")) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/review-questions/${question.id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          usesText ? { textAnswer: text } : { selectedOptionIds: selected }
        ),
      });
      const data = await res.json().catch(() => null);

      // 200: اتسجّلت إجابته الآن. 409: كان جاوب قبل كده (تاب تاني مثلًا) والسيرفر
      // بيرجّع إجابته الأصلية - في الحالتين نقفل البطاقة بالنتيجة الحقيقية.
      if ((res.ok || res.status === 409) && data?.answer) {
        setAnswer(data.answer as ReviewCardAnswer);
        onSolved?.(question.id);
        return;
      }
      setError(data?.error ?? "تعذّر حفظ إجابتك، حاول مرة تانية.");
    } catch {
      setError("تعذّر الاتصال بالخادم، تأكد من الإنترنت وحاول تاني.");
    } finally {
      setSubmitting(false);
    }
  }

  const lostSelection =
    answer !== null &&
    !usesText &&
    answer.selectedOptionIds.some((id) => !question.options.some((o) => o.id === id));

  return (
    <article
      className="rounded-xl border border-border bg-surface p-5 sm:p-6 space-y-4 shadow-elevated animate-fade-in-up"
      style={{ animationDelay: `${Math.min(index, 6) * 0.06}s` }}
    >
      <header className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="rounded-full bg-primary-soft text-primary px-2.5 py-1 font-medium">
            {REVIEW_TYPE_LABELS[question.type]}
          </span>
          {question.subjectName && (
            <span className="rounded-full bg-canvas text-ink-soft px-2.5 py-1">
              {question.subjectName}
            </span>
          )}
        </div>
        {locked ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-canvas px-2.5 py-1 text-xs font-medium text-ink-soft">
            🔒 تم الحل
          </span>
        ) : (
          <span className="rounded-full border border-primary/30 bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary">
            متاح للحل
          </span>
        )}
      </header>

      <div>
        <p className="font-medium text-ink leading-7 whitespace-pre-line">{question.text}</p>
        {question.codeSnippet && (
          <pre
            dir="ltr"
            className="mt-3 rounded-lg bg-slate-900 text-slate-100 p-3 text-sm overflow-x-auto font-mono text-left"
          >
            {question.codeSnippet}
          </pre>
        )}
      </div>

      {/* ===== قبل الحل ===== */}
      {!locked && !usesText && (
        <div className="space-y-2">
          {isMulti && (
            <p className="text-xs text-ink-soft">اختر كل الإجابات الصحيحة (ممكن أكتر من واحدة).</p>
          )}
          {question.options.map((o) => {
            const checked = selected.includes(o.id);
            return (
              <label
                key={o.id}
                className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm cursor-pointer transition-colors ${
                  checked ? "border-primary bg-primary-soft" : "border-border hover:bg-canvas"
                }`}
              >
                <input
                  type={isMulti ? "checkbox" : "radio"}
                  name={question.id}
                  checked={checked}
                  onChange={() => toggle(o.id)}
                  className="shrink-0 accent-[var(--color-primary)]"
                />
                <span className="flex-1 leading-6 text-ink">{o.text}</span>
              </label>
            );
          })}
        </div>
      )}

      {!locked && isCode && (
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">ناتج الكود</label>
          <textarea
            dir="ltr"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            placeholder="اكتب الناتج بالظبط..."
            className="w-full rounded-lg border border-border px-4 py-2.5 font-mono text-sm text-left transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
          />
        </div>
      )}

      {!locked && isEssay && (
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">إجابتك</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            maxLength={5000}
            placeholder="اكتب إجابتك هنا..."
            className="w-full rounded-lg border border-border px-4 py-2.5 leading-7 transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
          />
          <p className="text-xs text-ink-soft mt-1.5">
            السؤال ده بيراجعه المدرّس بنفسه بعد ما تبعت إجابتك.
          </p>
        </div>
      )}

      {!locked && (
        <div className="space-y-3">
          {error && (
            <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger">
              {error}
            </div>
          )}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit || submitting}
              className="rounded-lg bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 shadow-glow transition-all active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
            >
              {submitting ? "جارٍ الحفظ..." : "تأكيد الإجابة"}
            </button>
            <span className="text-xs text-ink-soft">
              تقدر تجاوب مرة واحدة بس، وبعدها السؤال بيتقفل.
            </span>
          </div>
        </div>
      )}

      {/* ===== بعد الحل: مقفول ويفضل ظاهر ===== */}
      {locked && answer && (
        <div className="space-y-3">
          <div
            className={`rounded-lg border px-4 py-2.5 text-sm font-semibold ${
              answer.isCorrect === null
                ? "border-warn/40 bg-warn-soft text-warn"
                : answer.isCorrect
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-danger/40 bg-danger/10 text-danger"
            }`}
          >
            {answer.isCorrect === null
              ? "⏳ وصلت إجابتك وبانتظار مراجعة المدرّس"
              : answer.isCorrect
              ? "✅ إجابتك صحيحة"
              : "❌ إجابتك غير صحيحة"}
          </div>

          {isEssay && (
            <div>
              <p className="text-xs text-ink-soft mb-1">إجابتك</p>
              <div className="rounded-lg border border-border bg-canvas px-4 py-3 text-sm leading-7 text-ink whitespace-pre-wrap break-words">
                {answer.textAnswer}
              </div>
            </div>
          )}

          {!usesText && (
            <div className="space-y-2" aria-label="نتيجة الإجابة (مقفولة)">
              {question.options.map((o) => {
                const isSelected = answer.selectedOptionIds.includes(o.id);
                const isRight = answer.correctOptionIds.includes(o.id);

                let box = "border-border text-ink-soft";
                let marker = "";
                let label = "";
                if (isRight) {
                  box = "border-accent/50 bg-accent/10 text-ink";
                  marker = "✓";
                  label = isSelected ? "إجابتك" : "الإجابة الصحيحة";
                } else if (isSelected) {
                  box = "border-danger/50 bg-danger/10 text-ink";
                  marker = "✕";
                  label = "إجابتك";
                }

                return (
                  <div
                    key={o.id}
                    className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${box}`}
                  >
                    <span
                      className={`grid place-items-center w-5 h-5 shrink-0 rounded-full text-[11px] font-bold ${
                        isRight
                          ? "bg-accent text-white"
                          : isSelected
                          ? "bg-danger text-white"
                          : "border border-border"
                      }`}
                      aria-hidden="true"
                    >
                      {marker}
                    </span>
                    <span className="flex-1 leading-6">{o.text}</span>
                    {label && (
                      <span className="shrink-0 text-xs font-medium text-ink-soft">{label}</span>
                    )}
                  </div>
                );
              })}
              {lostSelection && (
                <p className="text-xs text-ink-soft">
                  ملحوظة: اتعدّل السؤال بعد إجابتك، فبعض اختياراتك القديمة مبقتش موجودة.
                </p>
              )}
            </div>
          )}

          {isCode && (
            <div className="space-y-2">
              <div>
                <p className="text-xs text-ink-soft mb-1">إجابتك</p>
                <pre
                  dir="ltr"
                  className={`rounded-lg border px-4 py-2.5 text-sm font-mono text-left whitespace-pre-wrap ${
                    answer.isCorrect
                      ? "border-accent/50 bg-accent/10 text-ink"
                      : "border-danger/50 bg-danger/10 text-ink"
                  }`}
                >
                  {answer.textAnswer}
                </pre>
              </div>
              {!answer.isCorrect && answer.expectedOutput !== null && (
                <div>
                  <p className="text-xs text-ink-soft mb-1">الناتج الصحيح</p>
                  <pre
                    dir="ltr"
                    className="rounded-lg border border-accent/50 bg-accent/10 px-4 py-2.5 text-sm font-mono text-left text-ink whitespace-pre-wrap"
                  >
                    {answer.expectedOutput}
                  </pre>
                </div>
              )}
            </div>
          )}

          {answer.explanation && (
            <div className="rounded-lg bg-primary-soft px-4 py-3 text-sm leading-7 text-ink">
              <p className="font-semibold text-primary mb-1">
                {isEssay ? "💡 الإجابة النموذجية / الشرح" : "💡 الشرح"}
              </p>
              <p className="whitespace-pre-line">{answer.explanation}</p>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
