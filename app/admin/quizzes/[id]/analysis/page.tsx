import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireActiveUser } from "@/lib/auth";

const TYPE_LABELS: Record<string, string> = {
  mcq: "اختيار من متعدد",
  true_false: "صح وخطأ",
  multiple_answer: "اختيارات متعددة",
  ordering: "ترتيب",
  code_output: "ناتج كود",
  essay: "مقالي",
};

/// مستوى صعوبة السؤال حسب نسبة الطلاب اللي غلطوا فيه
function level(wrongPct: number) {
  if (wrongPct >= 60) return { label: "صعب جدًا", text: "text-danger", bg: "bg-danger/10", bar: "var(--color-danger)" };
  if (wrongPct >= 30) return { label: "محتاج مراجعة", text: "text-warn", bg: "bg-warn-soft", bar: "var(--color-warn)" };
  return { label: "مفهوم كويس", text: "text-accent", bg: "bg-accent-soft", bar: "var(--color-accent)" };
}

function countLabel(n: number, one: string, two: string, few: string, many: string) {
  if (n === 1) return one;
  if (n === 2) return two;
  if (n >= 3 && n <= 10) return `${n} ${few}`;
  return `${n} ${many}`;
}

function asIds(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

export default async function QuizAnalysisPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  await requireActiveUser("admin");
  const { id } = await params;
  const { sort } = await searchParams;
  const byOrder = sort === "order";

  const quiz = await db.quiz.findUnique({
    where: { id },
    select: {
      title: true,
      subject: { select: { name: true } },
      questions: {
        orderBy: { order: "asc" },
        select: {
          question: {
            select: {
              id: true,
              text: true,
              type: true,
              lesson: { select: { id: true, title: true } },
              options: { orderBy: { order: "asc" }, select: { id: true, text: true, isCorrect: true } },
            },
          },
        },
      },
    },
  });
  if (!quiz) notFound();

  const [attempts, answers] = await Promise.all([
    db.quizAttempt.findMany({
      where: { quizId: id, status: "submitted" },
      select: { studentId: true, percentage: true, needsManualGrading: true },
    }),
    db.quizAttemptAnswer.findMany({
      where: { attempt: { quizId: id, status: "submitted" } },
      select: { questionId: true, isCorrect: true, selectedOptionIds: true },
    }),
  ]);

  const studentsCount = new Set(attempts.map((a) => a.studentId)).size;
  const finalAttempts = attempts.filter((a) => !a.needsManualGrading && a.percentage !== null);
  const avg =
    finalAttempts.length > 0
      ? Math.round(finalAttempts.reduce((s, a) => s + (a.percentage ?? 0), 0) / finalAttempts.length)
      : null;

  const stats = quiz.questions.map(({ question: q }, index) => {
    const qa = answers.filter((a) => a.questionId === q.id);
    const graded = qa.filter((a) => a.isCorrect !== null);
    const wrong = graded.filter((a) => a.isCorrect === false).length;
    const pending = qa.length - graded.length;
    const wrongPct = graded.length > 0 ? Math.round((wrong / graded.length) * 100) : 0;

    // أكتر إجابة غلط اختارها الطلاب (لأسئلة الاختيار من متعدد / صح وخطأ)
    let topWrong: { text: string; count: number } | null = null;
    if (q.type === "mcq" || q.type === "true_false") {
      for (const opt of q.options.filter((o) => !o.isCorrect)) {
        const count = qa.filter((a) => asIds(a.selectedOptionIds).includes(opt.id)).length;
        if (count > 0 && (!topWrong || count > topWrong.count)) topWrong = { text: opt.text, count };
      }
    }
    return { q, number: index + 1, total: graded.length, wrong, pending, wrongPct, topWrong };
  });

  const sorted = byOrder ? stats : [...stats].sort((a, b) => b.wrongPct - a.wrongPct || a.number - b.number);
  const hardCount = stats.filter((s) => s.total > 0 && s.wrongPct >= 60).length;

  // الدروس اللي محتاجة إعادة شرح: مجمّعة من الأسئلة اللي نسبة الغلط فيها 30% أو أكتر
  const lessonMap = new Map<string, { id: string; title: string; questions: number }>();
  for (const s of stats) {
    if (s.total > 0 && s.wrongPct >= 30 && s.q.lesson) {
      const cur = lessonMap.get(s.q.lesson.id) ?? { ...s.q.lesson, questions: 0 };
      cur.questions += 1;
      lessonMap.set(s.q.lesson.id, cur);
    }
  }
  const weakLessons = [...lessonMap.values()].sort((a, b) => b.questions - a.questions);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link href="/admin/quizzes" className="text-sm text-ink-soft hover:text-ink">
          ← رجوع للاختبارات
        </Link>
        <h1 className="text-xl font-bold text-ink mt-2">تحليل أسئلة: {quiz.title}</h1>
        <p className="text-sm text-ink-soft mt-1">
          كل سؤال ونسبة الطلاب اللي غلطوا فيه، عشان تعرف أنهي جزء محتاج تعيد شرحه. الأرقام محسوبة من كل المحاولات اللي
          اتسلّمت.
        </p>
      </div>

      {attempts.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-6 text-sm text-ink-soft shadow-elevated">
          لسه مفيش طالب سلّم الاختبار ده. التحليل هيظهر هنا أول ما الطلاب يسلّموا.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { value: studentsCount, label: "طالب سلّم" },
              { value: attempts.length, label: "محاولة مسلّمة" },
              { value: avg !== null ? `${avg}%` : "—", label: "متوسط الدرجات" },
              { value: hardCount, label: "سؤال صعب جدًا", danger: hardCount > 0 },
            ].map((c) => (
              <div key={c.label} className="rounded-xl border border-border bg-surface p-4 text-center shadow-elevated">
                <p className={`stat-figure text-2xl font-bold ${c.danger ? "text-danger" : "text-primary"}`}>{c.value}</p>
                <p className="text-xs text-ink-soft mt-1">{c.label}</p>
              </div>
            ))}
          </div>

          {weakLessons.length > 0 && (
            <div className="rounded-xl border border-warn/40 bg-warn-soft p-5">
              <p className="font-bold text-ink">📌 دروس محتاجة إعادة شرح</p>
              <p className="text-sm text-ink-soft mt-0.5">الدروس اللي جت منها أسئلة غلط فيها 30% من الطلاب أو أكتر.</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {weakLessons.map((l) => (
                  <li key={l.id} className="rounded-full bg-surface border border-border px-3 py-1 text-sm text-ink">
                    {l.title}
                    <span className="text-ink-soft text-xs ms-1.5">
                      ({l.questions === 1 ? "سؤال واحد" : l.questions === 2 ? "سؤالين" : `${l.questions} أسئلة`})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm">
            <span className="text-ink-soft">الترتيب:</span>
            <Link
              href={`/admin/quizzes/${id}/analysis`}
              className={`rounded-full px-3 py-1 ${!byOrder ? "bg-primary text-white" : "border border-border text-ink-soft hover:text-ink"}`}
            >
              الأصعب الأول
            </Link>
            <Link
              href={`/admin/quizzes/${id}/analysis?sort=order`}
              className={`rounded-full px-3 py-1 ${byOrder ? "bg-primary text-white" : "border border-border text-ink-soft hover:text-ink"}`}
            >
              بترتيب الاختبار
            </Link>
          </div>

          <div className="space-y-3">
            {sorted.map((s) => {
              const lv = level(s.wrongPct);
              return (
                <div key={s.q.id} className="rounded-xl border border-border bg-surface p-5 shadow-elevated">
                  <div className="flex items-start gap-4">
                    <span className="grid place-items-center w-10 h-10 shrink-0 rounded-xl bg-primary-soft text-primary font-bold">
                      {s.number}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-ink leading-7 whitespace-pre-wrap">{s.q.text}</p>
                      <p className="text-xs text-ink-soft mt-1">
                        {TYPE_LABELS[s.q.type] ?? s.q.type}
                        {s.q.lesson && <> — من درس: {s.q.lesson.title}</>}
                      </p>
                    </div>
                    {s.total > 0 && (
                      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${lv.bg} ${lv.text}`}>{lv.label}</span>
                    )}
                  </div>

                  {s.total === 0 ? (
                    <p className="mt-3 text-sm text-ink-soft">
                      {s.pending > 0
                        ? `${countLabel(s.pending, "إجابة واحدة", "إجابتين", "إجابات", "إجابة")} لسه مستنية التصحيح اليدوي.`
                        : "مفيش إجابات على السؤال ده لسه."}
                    </p>
                  ) : (
                    <div className="mt-4">
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="text-ink">
                          <span className={`font-bold ${lv.text}`}>{s.wrongPct}%</span> من الطلاب غلطوا
                        </span>
                        <span className="text-ink-soft text-xs">
                          {s.wrong} من {s.total} إجابات غلط
                          {s.pending > 0 && ` (وفيه ${s.pending} لسه مستنية تصحيح)`}
                        </span>
                      </div>
                      <div className="mt-2 h-2.5 rounded-full bg-surface-2 border border-border overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${s.wrongPct}%`, background: lv.bar }} />
                      </div>
                      {s.topWrong && (
                        <p className="mt-3 text-sm text-ink-soft">
                          أكتر إجابة غلط اختاروها: <span className="font-semibold text-danger">«{s.topWrong.text}»</span>{" "}
                          ({countLabel(s.topWrong.count, "طالب واحد", "طالبين", "طلاب", "طالب")})
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
