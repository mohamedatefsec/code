"use client";

import { useEffect, useState } from "react";
import { QuestionForm, QuestionFormValue } from "@/components/QuestionForm";

type Subject = { id: string; name: string };
type Unit = { id: string; title: string };
type QuestionType = "mcq" | "true_false" | "multiple_answer" | "ordering" | "code_output" | "essay";

type GeneratedQuestion = {
  type: QuestionType;
  text: string;
  codeSnippet: string | null;
  difficulty: "easy" | "medium" | "hard";
  points: number;
  explanation: string | null;
  options: { text: string; isCorrect: boolean }[];
};

const TYPE_LABELS: Record<QuestionType, string> = {
  mcq: "اختيار من متعدد",
  true_false: "صح / خطأ",
  multiple_answer: "اختيارات متعددة صحيحة",
  ordering: "ترتيب عناصر",
  code_output: "توقع ناتج الكود",
  essay: "سؤال مقالي",
};

const ALL_TYPES: QuestionType[] = ["mcq", "true_false", "multiple_answer", "ordering", "code_output", "essay"];

export default function AIGeneratorPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);

  const [subjectId, setSubjectId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(5);
  const [selectedTypes, setSelectedTypes] = useState<QuestionType[]>(["mcq"]);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard" | "mixed">("mixed");

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skippedCount, setSkippedCount] = useState(0);
  const [drafts, setDrafts] = useState<(GeneratedQuestion & { savedStatus?: "saved" | "error" })[] | null>(null);

  useEffect(() => {
    fetch("/api/subjects")
      .then((r) => r.json())
      .then((d) => setSubjects(d.subjects));
  }, []);

  useEffect(() => {
    if (!subjectId) return;
    fetch(`/api/units?subjectId=${subjectId}`)
      .then((r) => r.json())
      .then((d) => setUnits(d.units));
  }, [subjectId]);

  function toggleType(t: QuestionType) {
    setSelectedTypes((list) => (list.includes(t) ? list.filter((x) => x !== t) : [...list, t]));
  }

  async function handleGenerate() {
    setError(null);
    setDrafts(null);
    if (!subjectId || !topic.trim() || selectedTypes.length === 0) {
      setError("اختر مادة، واكتب موضوعًا، واختر نوع سؤال واحد على الأقل.");
      return;
    }
    setGenerating(true);
    const res = await fetch("/api/ai/generate-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subjectId,
        unitId: unitId || null,
        topic,
        count,
        types: selectedTypes,
        difficulty,
      }),
    });
    setGenerating(false);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error ?? "تعذّر توليد الأسئلة.");
      return;
    }
    setDrafts(data.questions);
    setSkippedCount(data.skippedCount ?? 0);
  }

  async function saveDraft(index: number, value: QuestionFormValue) {
    const res = await fetch("/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subjectId: value.subjectId,
        unitId: value.unitId || null,
        lessonId: value.lessonId || null,
        type: value.type,
        text: value.text,
        codeSnippet: value.type === "code_output" ? value.codeSnippet || null : null,
        difficulty: value.difficulty,
        points: value.points,
        explanation: value.explanation || null,
        status: "draft", // دائمًا مسودة أولًا - لا نشر تلقائي أبدًا لمحتوى AI
        options: value.options,
      }),
    });
    if (res.ok) {
      setDrafts((list) =>
        list ? list.map((d, i) => (i === index ? { ...d, savedStatus: "saved" } : d)) : list
      );
      return null;
    }
    const data = await res.json().catch(() => null);
    setDrafts((list) =>
      list ? list.map((d, i) => (i === index ? { ...d, savedStatus: "error" } : d)) : list
    );
    return data?.error ?? "تعذّر الحفظ.";
  }

  function discardDraft(index: number) {
    setDrafts((list) => (list ? list.filter((_, i) => i !== index) : list));
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">توليد أسئلة بالذكاء الاصطناعي</h1>
        <p className="text-sm text-ink-soft mt-1">
          الأسئلة المُولَّدة تُحفظ كمسودات فقط — راجعها وعدّلها ثم انشرها يدويًا من بنك
          الأسئلة. لا يوجد نشر تلقائي إطلاقًا.
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-border bg-surface p-6 shadow-elevated">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">المادة</label>
            <select
              value={subjectId}
              onChange={(e) => {
                setSubjectId(e.target.value);
                setUnitId("");
              }}
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
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              disabled={!subjectId}
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
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">الموضوع</label>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="مثال: المتغيرات وأنواع البيانات في Python للصف الأول الثانوي"
            className="w-full rounded-lg border border-border px-4 py-2.5 transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">أنواع الأسئلة</label>
          <div className="flex flex-wrap gap-2">
            {ALL_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => toggleType(t)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  selectedTypes.includes(t)
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border text-ink-soft hover:bg-canvas"
                }`}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">عدد الأسئلة</label>
            <input
              type="number"
              min={1}
              max={15}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">الصعوبة</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
            >
              <option value="mixed">متنوعة</option>
              <option value="easy">سهل</option>
              <option value="medium">متوسط</option>
              <option value="hard">صعب</option>
            </select>
          </div>
        </div>

        {error && <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger">{error}</div>}

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="rounded-lg bg-gradient-brand px-5 py-2.5 font-semibold text-white hover:opacity-90 shadow-glow transition-all active:scale-[0.98] disabled:opacity-60"
        >
          {generating ? "جارٍ التوليد..." : "✨ توليد الأسئلة"}
        </button>
      </div>

      {drafts && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-ink">
              راجع وعدّل ({drafts.length} سؤال)
            </h2>
            {skippedCount > 0 && (
              <span className="text-xs text-ink-soft">تم تجاهل {skippedCount} سؤال غير صالح</span>
            )}
          </div>

          {drafts.length === 0 && (
            <p className="text-sm text-ink-soft">لا توجد أسئلة لمراجعتها.</p>
          )}

          {drafts.map((d, i) => (
            <div key={i} className="relative">
              {d.savedStatus === "saved" ? (
                <div className="rounded-xl border border-accent/40 bg-accent/10 p-6 text-sm text-accent">
                  ✓ تم حفظ هذا السؤال كمسودة في بنك الأسئلة.
                </div>
              ) : (
                <>
                  <div className="flex justify-end mb-2">
                    <button
                      onClick={() => discardDraft(i)}
                      className="text-xs text-danger hover:underline"
                    >
                      تجاهل هذا السؤال
                    </button>
                  </div>
                  <QuestionForm
                    initialValue={{
                      subjectId,
                      unitId,
                      lessonId: "",
                      type: d.type,
                      text: d.text,
                      codeSnippet: d.codeSnippet ?? "",
                      difficulty: d.difficulty,
                      points: d.points,
                      explanation: d.explanation ?? "",
                      status: "draft",
                      options: d.options,
                    }}
                    submitLabel="حفظ كمسودة في بنك الأسئلة"
                    onSubmit={(value) => saveDraft(i, value)}
                    lockStatusToDraft
                  />
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
