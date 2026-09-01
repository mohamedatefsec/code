"use client";

import { useEffect, useState, use, useCallback, FormEvent } from "react";
import Link from "next/link";

type QuizStatus = "draft" | "published" | "closed";

type QuizDetail = {
  id: string;
  title: string;
  subjectId: string;
  status: QuizStatus;
  durationMinutes: number;
  maxAttempts: number;
  startAt: string | null;
  endAt: string | null;
  questions: { question: { id: string; text: string; type: string; points: number } }[];
  targets: { targetType: string; group: { id: string; name: string } | null }[];
};

type Subject = { id: string; name: string };

/// يحوّل تاريخ ISO (من الـ API، UTC) لصيغة datetime-local (بالتوقيت
/// المحلي للمتصفح) عشان input[type=datetime-local] يعرضه صح. والعكس
/// بالعكس عند الإرسال.
function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type BankQuestion = {
  id: string;
  text: string;
  type: string;
  points: number;
  status?: string;
  difficulty?: "easy" | "medium" | "hard";
  lesson?: { id: string; title: string } | null;
};
type Group = { id: string; name: string };
type Lesson = { id: string; title: string; unit: { title: string } };

const DIFFICULTY_LABELS: Record<string, string> = { easy: "سهل", medium: "متوسط", hard: "صعب" };

const STATUS_LABELS: Record<QuizStatus, string> = {
  draft: "مسودة",
  published: "منشور",
  closed: "مغلق",
};

const TYPE_LABELS: Record<string, string> = {
  mcq: "اختيار من متعدد",
  true_false: "صح/خطأ",
  multiple_answer: "اختيارات متعددة",
  ordering: "ترتيب",
  code_output: "ناتج كود",
  essay: "مقالي",
};

export default function QuizBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [quiz, setQuiz] = useState<QuizDetail | null>(null);
  const [bankQuestions, setBankQuestions] = useState<BankQuestion[]>([]);
  // خريطة تراكمية لكل الأسئلة اللي اتحمّلت (من الاختبار نفسه أو من أي
  // فلترة سابقة لبنك الأسئلة) - مش بس القائمة المفلترة حاليًا. من غيرها،
  // لو الأدمن غيّر فلتر الدرس بعد ما اختار سؤال من درس تاني، السؤال ده
  // كان هيختفي بصمت من "الأسئلة المختارة" لأنه مش موجود في bankQuestions
  // بعد الفلترة الجديدة.
  const [questionsById, setQuestionsById] = useState<Record<string, BankQuestion>>({});
  const [groups, setGroups] = useState<Group[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [targetMode, setTargetMode] = useState<"all" | "groups">("all");
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingQuestions, setSavingQuestions] = useState(false);
  const [savingTargets, setSavingTargets] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);

  // فلاتر بنك الأسئلة (اختيار درس واحد أو أكتر مع مستوى صعوبة) - بتتحكم
  // في القائمة القابلة للتصفح جوّه "+ إضافة أسئلة من بنك المادة".
  const [filterLessonIds, setFilterLessonIds] = useState<string[]>([]);
  const [filterDifficulty, setFilterDifficulty] = useState("");

  // التوليد التلقائي: صفوف "درس + مستوى صعوبة + عدد" - كل صف بيتحوّل
  // لمتطلب واحد في طلب /api/questions/auto-select.
  const [autoRows, setAutoRows] = useState<{ lessonId: string; difficulty: string; count: number }[]>([
    { lessonId: "", difficulty: "any", count: 5 },
  ]);
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoShortfalls, setAutoShortfalls] = useState<
    { lessonId: string; difficulty: string; requested: number; found: number }[]
  >([]);

  // فورم "بيانات الاختبار الأساسية" - نسخة منفصلة قابلة للتعديل، بتتزامن
  // مع quiz لما يتحمّل أو يتحدّث من السيرفر.
  const [editTitle, setEditTitle] = useState("");
  const [editSubjectId, setEditSubjectId] = useState("");
  const [editDuration, setEditDuration] = useState(20);
  const [editMaxAttempts, setEditMaxAttempts] = useState(1);
  const [editStartAt, setEditStartAt] = useState("");
  const [editEndAt, setEditEndAt] = useState("");
  const [savingBasics, setSavingBasics] = useState(false);

  const loadQuiz = useCallback(async () => {
    const res = await fetch(`/api/quizzes/${id}`);
    const data = await res.json();
    const q: QuizDetail = data.quiz;
    setQuiz(q);
    setSelectedIds(q.questions.map((qq) => qq.question.id));
    // نضيف بيانات أسئلة الاختبار المحفوظة فعليًا لخريطة البحث التراكمية،
    // عشان تظهر في "الأسئلة المختارة" حتى لو مش موجودة في فلتر بنك
    // الأسئلة الحالي.
    setQuestionsById((prev) => {
      const next = { ...prev };
      for (const qq of q.questions) next[qq.question.id] = qq.question;
      return next;
    });
    const groupTargets = q.targets.filter((t) => t.targetType === "group" && t.group);
    if (groupTargets.length > 0) {
      setTargetMode("groups");
      setSelectedGroupIds(groupTargets.map((t) => t.group!.id));
    } else {
      setTargetMode("all");
      setSelectedGroupIds([]);
    }
    setEditTitle(q.title);
    setEditSubjectId(q.subjectId);
    setEditDuration(q.durationMinutes);
    setEditMaxAttempts(q.maxAttempts);
    setEditStartAt(toLocalInputValue(q.startAt));
    setEditEndAt(toLocalInputValue(q.endAt));
  }, [id]);

  useEffect(() => {
    // نستدعيها عبر microtask بدل الاستدعاء المباشر لتفادي تحذير
    // react-hooks/set-state-in-effect الذي يتتبع استدعاءات setState حتى
    // داخل دوال async يتم استدعاؤها من الـ effect.
    Promise.resolve().then(loadQuiz);
    fetch("/api/groups")
      .then((r) => r.json())
      .then((d) => setGroups(d.groups));
    fetch("/api/subjects")
      .then((r) => r.json())
      .then((d) => setSubjects(d.subjects));
  }, [loadQuiz]);

  useEffect(() => {
    if (!quiz?.subjectId) return;
    fetch(`/api/lessons?subjectId=${quiz.subjectId}`)
      .then((r) => r.json())
      .then((d) => setLessons(d.lessons));
  }, [quiz?.subjectId]);

  useEffect(() => {
    if (!quiz?.subjectId) return;
    const params = new URLSearchParams({ subjectId: quiz.subjectId, status: "published" });
    if (filterLessonIds.length > 0) params.set("lessonIds", filterLessonIds.join(","));
    if (filterDifficulty) params.set("difficulty", filterDifficulty);
    fetch(`/api/questions?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        setBankQuestions(d.questions);
        setQuestionsById((prev) => {
          const next = { ...prev };
          for (const q of d.questions as BankQuestion[]) next[q.id] = q;
          return next;
        });
      });
  }, [quiz?.subjectId, filterLessonIds, filterDifficulty]);

  function toggleQuestion(qid: string) {
    setSelectedIds((ids) => (ids.includes(qid) ? ids.filter((x) => x !== qid) : [...ids, qid]));
  }

  function toggleFilterLesson(lessonId: string) {
    setFilterLessonIds((ids) => (ids.includes(lessonId) ? ids.filter((x) => x !== lessonId) : [...ids, lessonId]));
  }

  function addAutoRow() {
    setAutoRows((rows) => [...rows, { lessonId: "", difficulty: "any", count: 5 }]);
  }

  function removeAutoRow(index: number) {
    setAutoRows((rows) => rows.filter((_, i) => i !== index));
  }

  function updateAutoRow(index: number, patch: Partial<{ lessonId: string; difficulty: string; count: number }>) {
    setAutoRows((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  async function runAutoSelect() {
    const requirements = autoRows.filter((r) => r.lessonId && r.count > 0);
    if (requirements.length === 0) {
      setError("حدّد درس وعدد أسئلة صحيح في سطر واحد على الأقل قبل التوليد.");
      return;
    }
    setAutoRunning(true);
    setError(null);
    setMessage(null);
    setAutoShortfalls([]);
    const res = await fetch("/api/questions/auto-select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requirements }),
    });
    setAutoRunning(false);
    if (!res.ok) {
      setError("تعذّر توليد الأسئلة تلقائيًا.");
      return;
    }
    const data = await res.json();
    const picked: BankQuestion[] = data.questions;
    setQuestionsById((prev) => {
      const next = { ...prev };
      for (const q of picked) next[q.id] = q;
      return next;
    });
    setSelectedIds((ids) => [...ids, ...picked.map((q) => q.id).filter((qid) => !ids.includes(qid))]);
    setAutoShortfalls(data.shortfalls ?? []);
    if (data.shortfalls?.length > 0) {
      setMessage(`تمت إضافة ${picked.length} سؤال. لاحظ إن بعض الأسطر ملقتش عدد الأسئلة الكافي (موضّح تحت).`);
    } else {
      setMessage(`تمت إضافة ${picked.length} سؤال تلقائيًا. راجعهم في "الأسئلة المختارة" فوق واحفظ لما تجهّز.`);
    }
  }

  function moveSelected(index: number, dir: -1 | 1) {
    setSelectedIds((ids) => {
      const next = [...ids];
      const target = index + dir;
      if (target < 0 || target >= next.length) return ids;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function saveQuestions() {
    setSavingQuestions(true);
    setMessage(null);
    setError(null);
    const res = await fetch(`/api/quizzes/${id}/questions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionIds: selectedIds }),
    });
    setSavingQuestions(false);
    if (res.ok) {
      setMessage("تم حفظ أسئلة الاختبار.");
      loadQuiz();
    } else {
      setError("تعذّر حفظ الأسئلة.");
    }
  }

  async function saveTargets() {
    setSavingTargets(true);
    setMessage(null);
    setError(null);
    const res = await fetch(`/api/quizzes/${id}/targets`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: targetMode, groupIds: selectedGroupIds }),
    });
    setSavingTargets(false);
    if (res.ok) setMessage("تم حفظ استهداف الاختبار.");
    else setError("تعذّر حفظ الاستهداف.");
  }

  async function saveBasics(e: FormEvent) {
    e.preventDefault();
    setSavingBasics(true);
    setMessage(null);
    setError(null);
    const res = await fetch(`/api/quizzes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editTitle,
        subjectId: editSubjectId,
        durationMinutes: editDuration,
        maxAttempts: editMaxAttempts,
        startAt: editStartAt ? new Date(editStartAt).toISOString() : null,
        endAt: editEndAt ? new Date(editEndAt).toISOString() : null,
      }),
    });
    setSavingBasics(false);
    if (res.ok) {
      setMessage("تم حفظ بيانات الاختبار.");
      loadQuiz();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "تعذّر حفظ بيانات الاختبار.");
    }
  }

  async function changeStatus(status: QuizStatus) {
    setChangingStatus(true);
    setError(null);
    const res = await fetch(`/api/quizzes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setChangingStatus(false);
    if (res.ok) {
      loadQuiz();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "تعذّر تغيير حالة الاختبار.");
    }
  }

  if (!quiz) return <p className="text-sm text-ink-soft">جارٍ التحميل...</p>;

  const selectedQuestions = selectedIds
    .map((qid) => questionsById[qid])
    .filter((q): q is BankQuestion => !!q);
  const totalPoints = selectedQuestions.reduce((sum, q) => sum + q.points, 0);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link href="/admin/quizzes" className="text-sm text-ink-soft hover:text-ink">
            ← رجوع للاختبارات
          </Link>
          <h1 className="text-xl font-bold text-ink mt-2">{quiz.title}</h1>
          <p className="text-sm text-ink-soft mt-1">
            {quiz.durationMinutes} دقيقة · {quiz.maxAttempts} محاولة مسموحة · {totalPoints} درجة إجمالية
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium h-fit ${
            quiz.status === "published"
              ? "border border-accent/40 bg-accent/10 text-accent"
              : quiz.status === "closed"
              ? "border border-danger/40 bg-danger/10 text-danger"
              : "bg-canvas text-ink-soft"
          }`}
        >
          {STATUS_LABELS[quiz.status]}
        </span>
      </div>

      {message && <div className="rounded-lg border border-accent/40 bg-accent/10 px-4 py-2.5 text-sm text-accent">{message}</div>}
      {error && <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger">{error}</div>}

      {/* حالة النشر */}
      <div className="rounded-xl border border-border bg-surface p-5 flex items-center gap-3 flex-wrap shadow-elevated">
        <span className="text-sm font-medium text-ink">تغيير الحالة:</span>
        {(["draft", "published", "closed"] as QuizStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => changeStatus(s)}
            disabled={changingStatus || quiz.status === s}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium border ${
              quiz.status === s
                ? "border-primary bg-primary-soft text-primary"
                : "border-border text-ink-soft hover:bg-canvas"
            } disabled:cursor-default`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* بيانات الاختبار الأساسية */}
      <form onSubmit={saveBasics} className="rounded-xl border border-border bg-surface p-5 space-y-4 shadow-elevated">
        <h2 className="font-semibold text-ink">بيانات الاختبار الأساسية</h2>

        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">عنوان الاختبار</label>
          <input
            required
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full rounded-lg border border-border px-4 py-2.5 transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">المادة</label>
          <select
            required
            value={editSubjectId}
            onChange={(e) => setEditSubjectId(e.target.value)}
            className="w-full rounded-lg border border-border px-4 py-2.5 transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">مدة الاختبار (دقيقة)</label>
            <input
              type="number"
              min={1}
              max={600}
              required
              value={editDuration}
              onChange={(e) => setEditDuration(Number(e.target.value))}
              className="w-full rounded-lg border border-border px-4 py-2.5 transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">عدد المحاولات المسموحة</label>
            <input
              type="number"
              min={1}
              max={20}
              required
              value={editMaxAttempts}
              onChange={(e) => setEditMaxAttempts(Number(e.target.value))}
              className="w-full rounded-lg border border-border px-4 py-2.5 transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">وقت البدء (اختياري)</label>
            <input
              type="datetime-local"
              value={editStartAt}
              onChange={(e) => setEditStartAt(e.target.value)}
              className="w-full rounded-lg border border-border px-4 py-2.5 transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
            />
            <p className="text-xs text-ink-soft mt-1">لو سايبها فاضية، الاختبار يبقى متاح من لحظة النشر.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">وقت الانتهاء (اختياري)</label>
            <input
              type="datetime-local"
              value={editEndAt}
              onChange={(e) => setEditEndAt(e.target.value)}
              className="w-full rounded-lg border border-border px-4 py-2.5 transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
            />
            <p className="text-xs text-ink-soft mt-1">لو سايبها فاضية، الاختبار يفضل متاح من غير موعد نهائي للدخول.</p>
          </div>
        </div>

        <button
          type="submit"
          disabled={savingBasics}
          className="rounded-lg bg-gradient-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 shadow-glow transition-all active:scale-[0.98] disabled:opacity-60"
        >
          {savingBasics ? "جارٍ الحفظ..." : "حفظ بيانات الاختبار"}
        </button>
      </form>

      {/* اختيار الأسئلة */}
      <div className="rounded-xl border border-border bg-surface p-5 space-y-4 shadow-elevated">
        <h2 className="font-semibold text-ink">الأسئلة المختارة ({selectedQuestions.length})</h2>

        {selectedQuestions.length === 0 ? (
          <p className="text-sm text-ink-soft">لم تُضف أي أسئلة بعد.</p>
        ) : (
          <div className="space-y-2">
            {selectedQuestions.map((q, i) => (
              <div key={q.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                <span className="stat-figure text-xs text-ink-soft w-5">{i + 1}</span>
                <span className="flex-1 truncate text-ink">{q.text}</span>
                <span className="text-ink-soft text-xs">{TYPE_LABELS[q.type]}</span>
                <span className="stat-figure text-primary text-xs">{q.points} د</span>
                <button onClick={() => moveSelected(i, -1)} className="text-ink-soft hover:text-ink px-1">
                  ↑
                </button>
                <button onClick={() => moveSelected(i, 1)} className="text-ink-soft hover:text-ink px-1">
                  ↓
                </button>
                <button onClick={() => toggleQuestion(q.id)} className="text-danger hover:underline text-xs">
                  إزالة
                </button>
              </div>
            ))}
          </div>
        )}

        <details className="pt-2 border-t border-border">
          <summary className="text-sm text-primary cursor-pointer">+ إضافة أسئلة من بنك المادة يدويًا</summary>
          <div className="mt-3 space-y-3">
            <div>
              <p className="text-xs font-medium text-ink-soft mb-1.5">فلترة حسب الدرس (تقدر تختار أكتر من درس عشان تخلط بينهم)</p>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto rounded-lg border border-border p-2">
                {lessons.length === 0 && <p className="text-xs text-ink-soft px-1">لا توجد دروس لهذه المادة.</p>}
                {lessons.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => toggleFilterLesson(l.id)}
                    title={l.unit.title}
                    className={`rounded-full border px-2.5 py-1 text-xs transition ${
                      filterLessonIds.includes(l.id)
                        ? "border-primary bg-primary-soft text-primary"
                        : "border-border text-ink-soft hover:bg-canvas"
                    }`}
                  >
                    {l.title}
                  </button>
                ))}
              </div>
            </div>
            <select
              value={filterDifficulty}
              onChange={(e) => setFilterDifficulty(e.target.value)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs"
            >
              <option value="">كل مستويات الصعوبة</option>
              <option value="easy">سهل</option>
              <option value="medium">متوسط</option>
              <option value="hard">صعب</option>
            </select>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {bankQuestions.length === 0 && (
                <p className="text-sm text-ink-soft">لا توجد أسئلة منشورة مطابقة لهذه الفلترة.</p>
              )}
              {bankQuestions.map((q) => (
                <label key={q.id} className="flex items-center gap-2 text-sm px-1 py-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(q.id)}
                    onChange={() => toggleQuestion(q.id)}
                  />
                  <span className="flex-1 truncate">{q.text}</span>
                  {q.lesson && <span className="text-ink-soft text-xs shrink-0">{q.lesson.title}</span>}
                  {q.difficulty && (
                    <span className="text-ink-soft text-xs shrink-0">{DIFFICULTY_LABELS[q.difficulty]}</span>
                  )}
                  <span className="text-ink-soft text-xs shrink-0">{TYPE_LABELS[q.type]}</span>
                </label>
              ))}
            </div>
          </div>
        </details>

        <details className="pt-2 border-t border-border">
          <summary className="text-sm text-primary cursor-pointer">🎲 توليد تلقائي من مجموعة دروس</summary>
          <div className="mt-3 space-y-3">
            <p className="text-xs text-ink-soft">
              حدّد لكل درس عدد الأسئلة المطلوبة (ومستوى صعوبة اختياري)، والموقع هيختار الأسئلة عشوائيًا من الأسئلة
              المنشورة بدون تكرار، ويضيفها لـ&quot;الأسئلة المختارة&quot; فوق - تقدر تراجعها أو تحذف أي سؤال قبل الحفظ.
            </p>
            <div className="space-y-2">
              {autoRows.map((row, i) => (
                <div key={i} className="flex items-center gap-2 flex-wrap">
                  <select
                    value={row.lessonId}
                    onChange={(e) => updateAutoRow(i, { lessonId: e.target.value })}
                    className="flex-1 min-w-[140px] rounded-lg border border-border px-3 py-1.5 text-xs"
                  >
                    <option value="">اختر درسًا</option>
                    {lessons.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.unit.title} - {l.title}
                      </option>
                    ))}
                  </select>
                  <select
                    value={row.difficulty}
                    onChange={(e) => updateAutoRow(i, { difficulty: e.target.value })}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs"
                  >
                    <option value="any">أي مستوى</option>
                    <option value="easy">سهل</option>
                    <option value="medium">متوسط</option>
                    <option value="hard">صعب</option>
                  </select>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={row.count}
                    onChange={(e) => updateAutoRow(i, { count: Number(e.target.value) })}
                    className="w-16 rounded-lg border border-border px-2 py-1.5 text-xs"
                  />
                  <span className="text-xs text-ink-soft">سؤال</span>
                  {autoRows.length > 1 && (
                    <button onClick={() => removeAutoRow(i)} className="text-danger hover:underline text-xs">
                      حذف السطر
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={addAutoRow}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-canvas transition"
              >
                + إضافة سطر
              </button>
              <button
                type="button"
                onClick={runAutoSelect}
                disabled={autoRunning}
                className="rounded-lg bg-gradient-brand px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90 shadow-glow transition-all active:scale-[0.98] disabled:opacity-60"
              >
                {autoRunning ? "جارٍ التوليد..." : "توليد الأسئلة"}
              </button>
            </div>
            {autoShortfalls.length > 0 && (
              <div className="rounded-lg border border-warn/40 bg-warn-soft px-3 py-2 text-xs text-warn space-y-1">
                {autoShortfalls.map((s, i) => (
                  <p key={i}>
                    {lessons.find((l) => l.id === s.lessonId)?.title ?? "درس"} (
                    {s.difficulty === "any" ? "أي مستوى" : DIFFICULTY_LABELS[s.difficulty]}): طلبت {s.requested} ولقينا
                    بس {s.found} سؤال منشور متاح.
                  </p>
                ))}
              </div>
            )}
          </div>
        </details>

        <button
          onClick={saveQuestions}
          disabled={savingQuestions}
          className="rounded-lg bg-gradient-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 shadow-glow transition-all active:scale-[0.98] disabled:opacity-60"
        >
          {savingQuestions ? "جارٍ الحفظ..." : "حفظ الأسئلة"}
        </button>
      </div>

      {/* الاستهداف */}
      <div className="rounded-xl border border-border bg-surface p-5 space-y-4 shadow-elevated">
        <h2 className="font-semibold text-ink">من يقدر يدخل الاختبار؟</h2>
        <div className="flex items-center gap-4 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={targetMode === "all"}
              onChange={() => setTargetMode("all")}
            />
            كل الطلاب
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={targetMode === "groups"}
              onChange={() => setTargetMode("groups")}
            />
            مجموعات محددة
          </label>
        </div>

        {targetMode === "groups" && (
          <div className="space-y-1.5">
            {groups.length === 0 && <p className="text-sm text-ink-soft">لا توجد مجموعات.</p>}
            {groups.map((g) => (
              <label key={g.id} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedGroupIds.includes(g.id)}
                  onChange={() =>
                    setSelectedGroupIds((ids) =>
                      ids.includes(g.id) ? ids.filter((x) => x !== g.id) : [...ids, g.id]
                    )
                  }
                />
                {g.name}
              </label>
            ))}
          </div>
        )}

        <button
          onClick={saveTargets}
          disabled={savingTargets}
          className="rounded-lg bg-gradient-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 shadow-glow transition-all active:scale-[0.98] disabled:opacity-60"
        >
          {savingTargets ? "جارٍ الحفظ..." : "حفظ الاستهداف"}
        </button>
      </div>
    </div>
  );
}
