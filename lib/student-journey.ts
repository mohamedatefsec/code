import { db } from "@/lib/db";
import { getQuizEligibility } from "@/lib/quiz-eligibility";
import { splitLessonNumber } from "@/lib/lesson-title";
import type { LessonProgressState } from "@/lib/lesson-progress";

/// بيانات "رحلتي" في لوحة الطالب: خريطة الوحدات والدروس، والدرس الحالي،
/// و"مهمة النهارده" (أهم خطوة يعملها الطالب دلوقتي).

export type JourneyLessonState = "done" | "opened" | "current" | "upcoming";

export type JourneyLesson = {
  id: string;
  title: string;
  number: number;
  state: JourneyLessonState;
};

export type JourneyUnit = {
  id: string;
  title: string;
  subjectName: string;
  lessons: JourneyLesson[];
  doneCount: number;
};

export type Mission = {
  kind: "quiz-in-progress" | "quiz-closing" | "quiz-new" | "lesson-continue" | "lesson-start" | "review" | "all-done";
  label: string;
  title: string;
  detail: string;
  href: string;
  cta: string;
};

/// الوحدات المنشورة بدروسها المنشورة (بالترتيب) + حالة كل درس للطالب.
/// "الدرس الحالي" = آخر درس فتحه وما خلّصهوش، وإلا أول درس لسه ما خلّصهوش.
export function buildJourney(
  subjects: {
    name: string;
    units: { id: string; title: string; lessons: { id: string; title: string }[] }[];
  }[],
  progress: Map<string, LessonProgressState>,
  resumeLessonId: string | null
) {
  const flat = subjects.flatMap((s) =>
    s.units.filter((u) => u.lessons.length > 0).map((u) => ({ ...u, subjectName: s.name }))
  );
  const allLessons = flat.flatMap((u) => u.lessons);

  const currentLessonId =
    (resumeLessonId && progress.get(resumeLessonId) !== "done" ? resumeLessonId : null) ??
    allLessons.find((l) => progress.get(l.id) !== "done")?.id ??
    null;

  const units: JourneyUnit[] = flat.map((u) => {
    const lessons = u.lessons.map((l, i) => {
      const p = progress.get(l.id);
      const state: JourneyLessonState =
        l.id === currentLessonId ? "current" : p === "done" ? "done" : p === "opened" ? "opened" : "upcoming";
      return { id: l.id, title: splitLessonNumber(l.title).text, number: i + 1, state };
    });
    return {
      id: u.id,
      title: u.title,
      subjectName: u.subjectName,
      lessons,
      doneCount: lessons.filter((l) => l.state === "done").length,
    };
  });

  const currentUnitId =
    units.find((u) => u.lessons.some((l) => l.state === "current"))?.id ?? units[units.length - 1]?.id ?? null;

  return { units, currentUnitId, currentLessonId };
}

function inDays(date: Date, now: Date) {
  const hours = Math.round((date.getTime() - now.getTime()) / 3_600_000);
  if (hours < 1) return "خلال أقل من ساعة";
  if (hours < 24) return hours === 1 ? "بعد ساعة" : hours === 2 ? "بعد ساعتين" : `بعد ${hours} ${hours <= 10 ? "ساعات" : "ساعة"}`;
  const days = Math.round(hours / 24);
  return days === 1 ? "بكرة" : days === 2 ? "بعد يومين" : `بعد ${days} ${days <= 10 ? "أيام" : "يوم"}`;
}

/// "مهمة النهارده": بنختار أهم حاجة بالترتيب ده:
/// 1) اختبار بدأه وما سلّمهوش  2) اختبار متاح بيقفل خلال 3 أيام  3) اختبار جديد ما دخلهوش
/// 4) الدرس الحالي  5) أسئلة مراجعة مستنياه  6) خلّص كل حاجة
export async function buildMissions(opts: {
  studentId: string;
  groupId: string | null;
  currentLesson: { id: string; title: string; unitTitle: string; opened: boolean } | null;
  reviewPending: number;
  now?: Date;
}): Promise<Mission[]> {
  const now = opts.now ?? new Date();
  const missions: Mission[] = [];

  try {
    const [quizzes, openAttempts] = await Promise.all([
      db.quiz.findMany({
        where: { status: "published" },
        include: { targets: true, subject: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      db.quizAttempt.findMany({
        where: { studentId: opts.studentId, status: { in: ["pending", "in_progress"] } },
        select: { quizId: true },
      }),
    ]);
    const inProgress = new Set(openAttempts.map((a) => a.quizId));

    for (const q of quizzes.filter((q) => inProgress.has(q.id))) {
      missions.push({
        kind: "quiz-in-progress",
        label: "مكمّلتش اختبارك",
        title: q.title,
        detail: "بدأت الاختبار ده وما سلّمتوش. ارجع كمّله قبل ما الوقت يخلص.",
        href: `/quizzes?quiz=${q.id}`,
        cta: "كمّل الاختبار",
      });
    }

    const fresh: { q: (typeof quizzes)[number]; closing: boolean }[] = [];
    for (const q of quizzes) {
      if (inProgress.has(q.id)) continue;
      const e = await getQuizEligibility(q, opts.studentId, opts.groupId);
      if (!e.eligible || e.attemptsUsed > 0) continue;
      const closing = Boolean(q.endAt && q.endAt.getTime() - now.getTime() < 3 * 24 * 3_600_000);
      fresh.push({ q, closing });
    }
    fresh.sort((a, b) => Number(b.closing) - Number(a.closing));
    for (const { q, closing } of fresh) {
      missions.push({
        kind: closing ? "quiz-closing" : "quiz-new",
        label: closing ? "اختبار بيقفل قريب" : "اختبار مستنيك",
        title: q.title,
        detail: closing && q.endAt ? `بيقفل ${inDays(q.endAt, now)} — ما تفوّتهوش.` : `في مادة ${q.subject.name}. لسه ما دخلتهوش.`,
        href: `/quizzes?quiz=${q.id}`,
        cta: "روح للاختبار",
      });
    }
  } catch {
    // لو حصل أي خطأ في الاختبارات نكمّل بباقي المهام
  }

  if (opts.currentLesson) {
    missions.push({
      kind: opts.currentLesson.opened ? "lesson-continue" : "lesson-start",
      label: opts.currentLesson.opened ? "كمّل من حيث وقفت" : "درسك الجاي",
      title: opts.currentLesson.title,
      detail: opts.currentLesson.unitTitle,
      href: `/lessons/${opts.currentLesson.id}`,
      cta: opts.currentLesson.opened ? "كمّل الدرس" : "ابدأ الدرس",
    });
  }

  if (opts.reviewPending > 0) {
    missions.push({
      kind: "review",
      label: "مراجعة سريعة",
      title:
        opts.reviewPending === 1
          ? "سؤال مراجعة واحد مستنيك"
          : opts.reviewPending === 2
            ? "سؤالين مراجعة مستنيينك"
            : `${opts.reviewPending} ${opts.reviewPending <= 10 ? "أسئلة" : "سؤال"} مراجعة مستنيينك`,
      detail: "دقايق بسيطة بتثبّت اللي ذاكرته.",
      href: "/review",
      cta: "ابدأ المراجعة",
    });
  }

  if (missions.length === 0) {
    missions.push({
      kind: "all-done",
      label: "عاش يا بطل",
      title: "خلّصت كل المطلوب منك دلوقتي 🎉",
      detail: "أول ما ينزل درس أو اختبار جديد هيوصلك إشعار.",
      href: "/lessons",
      cta: "راجع الدروس",
    });
  }

  return missions;
}

/// إزاي الطالب يفتح كل شارة (بالكلام، ومعاها تقدّمه لو ينفع)
export function badgeHint(
  criteriaKey: string,
  ctx: { submittedQuizzes: number; attendancePct: number | null; attendanceSessions: number }
): string {
  switch (criteriaKey) {
    case "first_lesson":
      return "افتح أول درس ليك.";
    case "first_quiz":
      return "سلّم أول اختبار.";
    case "five_quizzes_streak": {
      const left = Math.max(5 - ctx.submittedQuizzes, 0);
      return left === 0
        ? "سلّم 5 اختبارات."
        : `سلّم 5 اختبارات — فاضلك ${left === 1 ? "اختبار واحد" : left === 2 ? "اختبارين" : `${left} اختبارات`}.`;
    }
    case "perfect_score":
      return "جيب الدرجة النهائية في أي اختبار.";
    case "excellent_attendance":
      return ctx.attendanceSessions < 5
        ? "احضر 90% من الحصص (بعد أول 5 حصص)."
        : `احضر 90% من الحصص — نسبتك دلوقتي ${Math.round(ctx.attendancePct ?? 0)}%.`;
    default:
      return "";
  }
}
