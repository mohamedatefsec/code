"use client";

import { useEffect, useState, FormEvent } from "react";

type QuestionType = "mcq" | "true_false" | "multiple_answer" | "ordering" | "code_output" | "essay";
type Difficulty = "easy" | "medium" | "hard";
type Status = "draft" | "published";

type OptionRow = { text: string; isCorrect: boolean };

export type QuestionFormValue = {
  subjectId: string;
  unitId: string;
  lessonId: string;
  type: QuestionType;
  text: string;
  codeSnippet: string;
  difficulty: Difficulty;
  points: number;
  explanation: string;
  status: Status;
  options: OptionRow[];
};

type Subject = { id: string; name: string };
type Unit = { id: string; title: string };
type Lesson = { id: string; title: string };

const TYPE_LABELS: Record<QuestionType, string> = {
  mcq: "اختيار من متعدد",
  true_false: "صح / خطأ",
  multiple_answer: "اختيارات متعددة صحيحة",
  ordering: "ترتيب عناصر",
  code_output: "توقع ناتج الكود",
  essay: "سؤال مقالي (تصحيح يدوي)",
};

function defaultOptionsFor(type: QuestionType): OptionRow[] {
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
  return [
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ];
}

export function QuestionForm({
  initialValue,
  onSubmit,
  submitLabel,
  lockStatusToDraft = false,
}: {
  initialValue?: Partial<QuestionFormValue>;
  onSubmit: (value: QuestionFormValue) => Promise<string | null>;
  submitLabel: string;
  /** يُستخدم في صفحة مراجعة الذكاء الاصطناعي: يخفي اختيار "منشور" لضمان عدم النشر التلقائي أبدًا. */
  lockStatusToDraft?: boolean;
}) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);

  const [value, setValue] = useState<QuestionFormValue>({
    subjectId: initialValue?.subjectId ?? "",
    unitId: initialValue?.unitId ?? "",
    lessonId: initialValue?.lessonId ?? "",
    type: initialValue?.type ?? "mcq",
    text: initialValue?.text ?? "",
    codeSnippet: initialValue?.codeSnippet ?? "",
    difficulty: initialValue?.difficulty ?? "medium",
    points: initialValue?.points ?? 1,
    explanation: initialValue?.explanation ?? "",
    status: initialValue?.status ?? "draft",
    options: initialValue?.options ?? defaultOptionsFor(initialValue?.type ?? "mcq"),
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/subjects")
      .then((r) => r.json())
      .then((d) => setSubjects(d.subjects));
  }, []);

  useEffect(() => {
    if (!value.subjectId) return;
    fetch(`/api/units?subjectId=${value.subjectId}`)
      .then((r) => r.json())
      .then((d) => setUnits(d.units));
  }, [value.subjectId]);

  useEffect(() => {
    if (!value.unitId) return;
    fetch(`/api/lessons?unitId=${value.unitId}`)
      .then((r) => r.json())
      .then((d) => setLessons(d.lessons));
  }, [value.unitId]);

  function changeSubject(subjectId: string) {
    setUnits([]);
    setLessons([]);
    setValue((s) => ({ ...s, subjectId, unitId: "", lessonId: "" }));
  }

  function changeUnit(unitId: string) {
    setLessons([]);
    setValue((s) => ({ ...s, unitId, lessonId: "" }));
  }

  function update<K extends keyof QuestionFormValue>(key: K, v: QuestionFormValue[K]) {
    setValue((s) => ({ ...s, [key]: v }));
  }

  function changeType(type: QuestionType) {
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

  function moveOption(index: number, dir: -1 | 1) {
    setValue((s) => {
      const next = [...s.options];
      const target = index + dir;
      if (target < 0 || target >= next.length) return s;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...s, options: next };
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const err = await onSubmit(value);
    setSaving(false);
    if (err) setError(err);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-border bg-surface p-6 shadow-elevated">
      <div>
        <label className="block text-sm font-medium text-ink mb-1.5">نوع السؤال</label>
        <select
          value={value.type}
          onChange={(e) => changeType(e.target.value as QuestionType)}
          className="w-full rounded-lg border border-border px-4 py-2.5 transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
        >
          {Object.entries(TYPE_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">المادة</label>
          <select
            value={value.subjectId}
            onChange={(e) => changeSubject(e.target.value)}
            required
            className="w-full rounded-lg border border-border px-3 py-2 text-sm transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
          >
            <option value="">اختر</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">الوحدة (اختياري)</label>
          <select
            value={value.unitId}
            onChange={(e) => changeUnit(e.target.value)}
            disabled={!value.subjectId}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50 transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
          >
            <option value="">بدون تحديد</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">الدرس (اختياري)</label>
          <select
            value={value.lessonId}
            onChange={(e) => update("lessonId", e.target.value)}
            disabled={!value.unitId}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50 transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
          >
            <option value="">بدون تحديد</option>
            {lessons.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title}
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
          rows={2}
          className="w-full rounded-lg border border-border px-4 py-2.5 transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
        />
      </div>

      {value.type === "code_output" && (
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">الكود</label>
          <textarea
            value={value.codeSnippet}
            onChange={(e) => update("codeSnippet", e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-border px-4 py-2.5 font-mono text-sm transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
            placeholder={"print('Hello')"}
          />
        </div>
      )}

      {/* محرر الخيارات - يتغيّر سلوكه حسب النوع، ويختفي تمامًا للسؤال المقالي */}
      {value.type === "essay" ? (
        <div className="rounded-lg bg-canvas px-4 py-3 text-sm text-ink-soft">
          سؤال مقالي: الطالب هيكتب إجابة حرة، ومفيش خيارات ولا تصحيح آلي —
          هتصحّحه بنفسك يدويًا من صفحة &quot;التصحيح اليدوي&quot; بعد ما الطلاب يسلّموا.
        </div>
      ) : (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-ink">
          {value.type === "ordering"
            ? "عناصر الترتيب (بالترتيب الصحيح من فوق لتحت)"
            : value.type === "code_output"
            ? "الناتج المتوقع"
            : "الخيارات"}
        </label>

        {value.options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            {(value.type === "mcq" || value.type === "true_false") && (
              <input
                type="radio"
                name="correct-option"
                checked={opt.isCorrect}
                onChange={() => selectSingleCorrect(i)}
                className="shrink-0"
                title="الإجابة الصحيحة"
              />
            )}
            {value.type === "multiple_answer" && (
              <input
                type="checkbox"
                checked={opt.isCorrect}
                onChange={(e) => updateOption(i, { isCorrect: e.target.checked })}
                className="shrink-0"
                title="إجابة صحيحة"
              />
            )}
            {value.type === "ordering" && (
              <span className="stat-figure text-xs text-ink-soft w-5 text-center shrink-0">{i + 1}</span>
            )}

            <input
              value={opt.text}
              onChange={(e) => updateOption(i, { text: e.target.value })}
              disabled={value.type === "true_false"}
              placeholder={value.type === "code_output" ? "الناتج بالظبط" : `خيار ${i + 1}`}
              className="flex-1 rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-60"
              required
            />

            {value.type === "ordering" && (
              <>
                <button type="button" onClick={() => moveOption(i, -1)} className="text-ink-soft hover:text-ink px-1">
                  ↑
                </button>
                <button type="button" onClick={() => moveOption(i, 1)} className="text-ink-soft hover:text-ink px-1">
                  ↓
                </button>
              </>
            )}

            {value.options.length > 2 &&
              value.type !== "true_false" &&
              value.type !== "code_output" && (
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

        {value.type !== "true_false" && value.type !== "code_output" && (
          <button type="button" onClick={addOption} className="text-primary text-sm hover:underline">
            + إضافة خيار
          </button>
        )}
      </div>
      )}

      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">مستوى الصعوبة</label>
          <select
            value={value.difficulty}
            onChange={(e) => update("difficulty", e.target.value as Difficulty)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
          >
            <option value="easy">سهل</option>
            <option value="medium">متوسط</option>
            <option value="hard">صعب</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">الدرجة</label>
          <input
            type="number"
            min={1}
            max={100}
            value={value.points}
            onChange={(e) => update("points", Number(e.target.value))}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">الحالة</label>
          {lockStatusToDraft ? (
            <div className="flex items-center h-[38px]">
              <span className="rounded-full bg-canvas text-ink-soft px-2.5 py-1 text-xs font-medium">
                مسودة (لن تُنشر تلقائيًا)
              </span>
            </div>
          ) : (
            <select
              value={value.status}
              onChange={(e) => update("status", e.target.value as Status)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
            >
              <option value="draft">مسودة</option>
              <option value="published">منشور</option>
            </select>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink mb-1.5">شرح الإجابة (اختياري)</label>
        <textarea
          value={value.explanation}
          onChange={(e) => update("explanation", e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-border px-4 py-2.5 transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
        />
      </div>

      {error && <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger">{error}</div>}

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
