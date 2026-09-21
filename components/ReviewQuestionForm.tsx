"use client";

import { useEffect, useState, FormEvent } from "react";
import {
  REVIEW_QUESTION_TYPES,
  REVIEW_TYPE_LABELS,
  type ReviewQuestionType,
} from "@/lib/review-shared";

type Status = "draft" | "published";
type OptionRow = { id?: string; text: string; isCorrect: boolean };
type Subject = { id: string; name: string };

export type ReviewFormValue = {
  type: ReviewQuestionType;
  subjectId: string;
  text: string;
  codeSnippet: string;
  explanation: string;
  status: Status;
  options: OptionRow[];
};

function defaultOptionsFor(type: ReviewQuestionType): OptionRow[] {
  if (type === "true_false") {
    return [
      { text: "صح", isCorrect: true },
      { text: "خطأ", isCorrect: false },
    ];
  }
  if (type === "code_output") {
    return [{ text: "", isCorrect: true }];
  }
  if (type === "essay") {
    return [];
  }
  // بدون إجابة صحيحة محدّدة مسبقًا: الأدمن لازم يختارها بنفسه (السيرفر بيرفض الحفظ لو نسيها)
  return [
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ];
}

/// الجسم اللي بيتبعت لـ POST/PATCH /api/review-questions - مشترك بين صفحتي الإضافة والتعديل.
export function buildReviewPayload(value: ReviewFormValue) {
  return {
    type: value.type,
    subjectId: value.subjectId || null,
    text: value.text,
    codeSnippet: value.codeSnippet.trim() ? value.codeSnippet : null,
    explanation: value.explanation.trim() ? value.explanation : null,
    status: value.status,
    options: value.options.map((o) => ({
      ...(o.id ? { id: o.id } : {}),
      text: o.text,
      isCorrect: o.isCorrect,
    })),
  };
}

const inputCls =
  "w-full rounded-lg border border-border px-4 py-2.5 transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15";

export function ReviewQuestionForm({
  initialValue,
  onSubmit,
  submitLabel,
  lockType = false,
  notice,
}: {
  initialValue?: Partial<ReviewFormValue>;
  onSubmit: (value: ReviewFormValue) => Promise<string | null>;
  submitLabel: string;
  /** يمنع تغيير نوع السؤال (لما فيه إجابات طلاب محفوظة عليه). */
  lockType?: boolean;
  /** تنبيه يظهر أعلى الفورم (مثلًا: فيه طلاب جاوبوا على السؤال ده). */
  notice?: string | null;
}) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [value, setValue] = useState<ReviewFormValue>({
    type: initialValue?.type ?? "mcq",
    subjectId: initialValue?.subjectId ?? "",
    text: initialValue?.text ?? "",
    codeSnippet: initialValue?.codeSnippet ?? "",
    explanation: initialValue?.explanation ?? "",
    status: initialValue?.status ?? "published",
    options: initialValue?.options ?? defaultOptionsFor(initialValue?.type ?? "mcq"),
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/subjects")
      .then((r) => r.json())
      .then((d) => setSubjects(d.subjects ?? []))
      .catch(() => setSubjects([]));
  }, []);

  function update<K extends keyof ReviewFormValue>(key: K, v: ReviewFormValue[K]) {
    setValue((s) => ({ ...s, [key]: v }));
  }

  function changeType(type: ReviewQuestionType) {
    setValue((s) => ({ ...s, type, options: defaultOptionsFor(type) }));
  }

  function updateOption(index: number, patch: Partial<OptionRow>) {
    setValue((s) => ({
      ...s,
      options: s.options.map((o, i) => (i === index ? { ...o, ...patch } : o)),
    }));
  }

  function selectSingleCorrect(index: number) {
    setValue((s) => ({
      ...s,
      options: s.options.map((o, i) => ({ ...o, isCorrect: i === index })),
    }));
  }

  function addOption() {
    setValue((s) => ({ ...s, options: [...s.options, { text: "", isCorrect: false }] }));
  }

  function removeOption(index: number) {
    setValue((s) => ({ ...s, options: s.options.filter((_, i) => i !== index) }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const err = await onSubmit(value);
    setSaving(false);
    if (err) setError(err);
  }

  const isCode = value.type === "code_output";
  const isTrueFalse = value.type === "true_false";
  const isMulti = value.type === "multiple_answer";
  const isEssay = value.type === "essay";

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-xl border border-border bg-surface p-6 shadow-elevated"
    >
      {notice && (
        <div className="rounded-lg border border-warn/40 bg-warn-soft px-4 py-2.5 text-sm text-warn">
          {notice}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">نوع السؤال</label>
          <select
            value={value.type}
            onChange={(e) => changeType(e.target.value as ReviewQuestionType)}
            disabled={lockType}
            className={inputCls + " disabled:opacity-60"}
          >
            {REVIEW_QUESTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {REVIEW_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          {lockType && (
            <p className="text-xs text-ink-soft mt-1.5">
              مينفعش تغيّر النوع لأن فيه طلاب جاوبوا. امسح الإجابات الأول لو عايز تغيّره.
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">المادة (اختياري)</label>
          <select
            value={value.subjectId}
            onChange={(e) => update("subjectId", e.target.value)}
            className={inputCls}
          >
            <option value="">بدون تحديد</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink mb-1.5">نص السؤال</label>
        <textarea
          required
          value={value.text}
          onChange={(e) => update("text", e.target.value)}
          rows={3}
          maxLength={2000}
          className={inputCls}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-ink mb-1.5">
          {isCode ? "الكود" : "كود يظهر مع السؤال (اختياري)"}
        </label>
        <textarea
          dir="ltr"
          value={value.codeSnippet}
          onChange={(e) => update("codeSnippet", e.target.value)}
          rows={4}
          placeholder={"print('Hello')"}
          className={inputCls + " font-mono text-sm text-left"}
        />
      </div>

      {isEssay && (
        <div className="rounded-lg bg-canvas px-4 py-3 text-sm text-ink-soft">
          سؤال مقالي: الطالب هيكتب إجابة حرة، ومفيش خيارات ولا تصحيح آلي. إجاباته بتظهر لك
          في صفحة تعديل السؤال وتحدد لكل واحدة &quot;صحيحة&quot; أو &quot;غير صحيحة&quot;. اكتب الإجابة
          النموذجية في خانة الشرح تحت، وبتظهر للطالب بعد ما يبعت إجابته.
        </div>
      )}

      {!isEssay && (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-ink">
          {isCode ? "الناتج المتوقع" : "الخيارات (حدّد الإجابة الصحيحة)"}
        </label>

        {value.options.map((opt, i) => (
          <div key={opt.id ?? `new-${i}`} className="flex items-center gap-2">
            {(value.type === "mcq" || isTrueFalse) && (
              <input
                type="radio"
                name="review-correct-option"
                checked={opt.isCorrect}
                onChange={() => selectSingleCorrect(i)}
                className="shrink-0"
                title="الإجابة الصحيحة"
              />
            )}
            {isMulti && (
              <input
                type="checkbox"
                checked={opt.isCorrect}
                onChange={(e) => updateOption(i, { isCorrect: e.target.checked })}
                className="shrink-0"
                title="إجابة صحيحة"
              />
            )}

            {isCode ? (
              <textarea
                dir="ltr"
                value={opt.text}
                onChange={(e) => updateOption(i, { text: e.target.value })}
                rows={2}
                required
                placeholder="الناتج بالظبط (ممكن أكتر من سطر)"
                className="flex-1 rounded-lg border border-border px-3 py-2 text-sm font-mono text-left"
              />
            ) : (
              <input
                value={opt.text}
                onChange={(e) => updateOption(i, { text: e.target.value })}
                disabled={isTrueFalse}
                placeholder={`خيار ${i + 1}`}
                required
                maxLength={500}
                className="flex-1 rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-60"
              />
            )}

            {value.options.length > 2 && !isTrueFalse && !isCode && (
              <button
                type="button"
                onClick={() => removeOption(i)}
                className="text-danger hover:underline text-sm shrink-0"
              >
                حذف
              </button>
            )}
          </div>
        ))}

        {!isTrueFalse && !isCode && value.options.length < 10 && (
          <button type="button" onClick={addOption} className="text-primary text-sm hover:underline">
            + إضافة خيار
          </button>
        )}
        {isCode && (
          <p className="text-xs text-ink-soft">
            الطالب لازم يكتب نفس الناتج بالظبط (المسافات الزيادة في أول وآخر النص بتتجاهل).
          </p>
        )}
      </div>
      )}

      <div>
        <label className="block text-sm font-medium text-ink mb-1.5">
          {isEssay ? "الإجابة النموذجية / الشرح (اختياري)" : "شرح الإجابة (اختياري)"}
        </label>
        <textarea
          value={value.explanation}
          onChange={(e) => update("explanation", e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="بيظهر للطالب بعد ما يجاوب فقط"
          className={inputCls}
        />
      </div>

      <div className="max-w-xs">
        <label className="block text-sm font-medium text-ink mb-1.5">الحالة</label>
        <select
          value={value.status}
          onChange={(e) => update("status", e.target.value as Status)}
          className={inputCls}
        >
          <option value="published">منشور (يظهر للطلاب)</option>
          <option value="draft">مسودة (مخفي عن الطلاب)</option>
        </select>
      </div>

      {error && (
        <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-gradient-brand px-5 py-2.5 font-semibold text-white hover:opacity-90 shadow-glow transition-all active:scale-[0.98] disabled:opacity-60"
      >
        {saving ? "جارٍ الحفظ..." : submitLabel}
      </button>
    </form>
  );
}
