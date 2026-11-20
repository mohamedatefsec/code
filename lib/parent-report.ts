import { db } from "@/lib/db";
import { getStudentSubscriptionStatus } from "@/lib/subscription";

/// بيانات "تقرير ولي الأمر" لطالب واحد خلال فترة محددة.
/// التقرير بيتعرض للأدمن بس، والأدمن هو اللي يقرر يطبعه أو يبعته بنفسه -
/// المنصة مش بتبعت أي حاجة لوحدها.

import { PERIOD_LABELS, type ReportPeriodKey } from "@/lib/parent-report-shared";
export { PERIOD_LABELS, type ReportPeriodKey };

const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

function cairoYearMonth(d: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit" })
      .formatToParts(d)
      .map((p) => [p.type, p.value])
  );
  return { y: Number(parts.year), m: Number(parts.month) };
}

/// حدود الفترة: from/to لأوقات زي التسليم والدفع، وfromDay/toDay (تواريخ بس) لحصص الحضور
function periodRange(key: ReportPeriodKey, now: Date) {
  const DAY = 24 * 60 * 60 * 1000;
  // مصر UTC+2 أو +3 - بنبدأ اليوم من 21:00 UTC اليوم اللي قبله عشان مايفوتناش حاجة
  const cairoMidnight = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d) - 3 * 60 * 60 * 1000);
  const { y, m } = cairoYearMonth(now);

  if (key === "month") {
    return {
      from: cairoMidnight(y, m, 1),
      to: now,
      fromDay: new Date(Date.UTC(y, m - 1, 1)),
      toDay: new Date(Date.UTC(y, m, 0)),
      title: `${MONTHS[m - 1]} ${y}`,
    };
  }
  if (key === "last-month") {
    const py = m === 1 ? y - 1 : y;
    const pm = m === 1 ? 12 : m - 1;
    return {
      from: cairoMidnight(py, pm, 1),
      to: cairoMidnight(y, m, 1),
      fromDay: new Date(Date.UTC(py, pm - 1, 1)),
      toDay: new Date(Date.UTC(py, pm, 0)),
      title: `${MONTHS[pm - 1]} ${py}`,
    };
  }
  if (key === "30") {
    const from = new Date(now.getTime() - 30 * DAY);
    return { from, to: now, fromDay: new Date(from.toISOString().slice(0, 10)), toDay: now, title: "آخر 30 يوم" };
  }
  return { from: new Date(0), to: now, fromDay: new Date(0), toDay: now, title: "من أول الاشتراك" };
}

export type ParentReport = Awaited<ReturnType<typeof buildParentReport>>;

export async function buildParentReport(studentId: string, periodKey: ReportPeriodKey, now = new Date()) {
  const student = await db.studentProfile.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      fullName: true,
      studentCode: true,
      grade: true,
      phone: true,
      group: { select: { name: true } },
    },
  });
  if (!student) return null;

  const range = periodRange(periodKey, now);

  const [records, attempts, payments, badges, settings, publishedLessons, subscription] = await Promise.all([
    db.attendanceRecord.findMany({
      where: { studentId, session: { sessionDate: { gte: range.fromDay, lte: range.toDay } } },
      select: { status: true, session: { select: { sessionDate: true, sessionLabel: true } } },
      orderBy: { session: { sessionDate: "asc" } },
    }),
    db.quizAttempt.findMany({
      where: { studentId, status: "submitted", submittedAt: { gte: range.from, lte: range.to } },
      select: {
        quizId: true,
        percentage: true,
        score: true,
        maxScore: true,
        submittedAt: true,
        needsManualGrading: true,
        quiz: { select: { title: true, subject: { select: { name: true } } } },
      },
      orderBy: { submittedAt: "asc" },
    }),
    db.payment.findMany({
      where: { studentId, paidAt: { gte: range.from, lte: range.to } },
      select: { amount: true, paidAt: true, forMonth: true },
      orderBy: { paidAt: "asc" },
    }),
    db.studentBadge.findMany({
      where: { studentId, awardedAt: { gte: range.from, lte: range.to } },
      select: { awardedAt: true, badge: { select: { name: true, icon: true } } },
      orderBy: { awardedAt: "asc" },
    }),
    db.settings.findFirst({ select: { platformName: true, teacherName: true } }),
    db.lesson.count({ where: { status: "published", unit: { status: "published" } } }),
    getStudentSubscriptionStatus(studentId, now),
  ]);

  // الحضور: المتأخر بيتحسب حضور (نفس طريقة لوحة الطالب)
  const present = records.filter((r) => r.status === "present").length;
  const late = records.filter((r) => r.status === "late").length;
  const absent = records.filter((r) => r.status === "absent").length;
  const attendancePct = records.length > 0 ? Math.round(((present + late) / records.length) * 100) : null;

  // الاختبارات: لكل اختبار أعلى نسبة اتحققت في الفترة + عدد المحاولات
  const byQuiz = new Map<string, (typeof attempts)[number][]>();
  for (const a of attempts) byQuiz.set(a.quizId, [...(byQuiz.get(a.quizId) ?? []), a]);
  const quizzes = [...byQuiz.values()].map((list) => {
    const best = list.reduce((b, a) => ((a.percentage ?? -1) > (b.percentage ?? -1) ? a : b), list[0]);
    return {
      title: best.quiz.title,
      subject: best.quiz.subject.name,
      date: best.submittedAt,
      score: best.score,
      maxScore: best.maxScore,
      percentage: best.percentage !== null ? Math.round(best.percentage) : null,
      attempts: list.length,
      pending: best.needsManualGrading,
    };
  });
  const graded = quizzes.filter((q) => q.percentage !== null && !q.pending);
  const quizAvg = graded.length > 0 ? Math.round(graded.reduce((s, q) => s + (q.percentage ?? 0), 0) / graded.length) : null;

  // الدروس (لو جدول التقدّم موجود)
  let lessons: { completedInPeriod: number; completedTotal: number; recent: { title: string; completedAt: Date }[] } | null =
    null;
  try {
    const [completedTotal, inPeriod] = await Promise.all([
      db.lessonProgress.count({
        where: { studentId, completedAt: { not: null }, lesson: { status: "published", unit: { status: "published" } } },
      }),
      db.lessonProgress.findMany({
        where: { studentId, completedAt: { gte: range.from, lte: range.to } },
        select: { completedAt: true, lesson: { select: { title: true } } },
        orderBy: { completedAt: "desc" },
      }),
    ]);
    lessons = {
      completedInPeriod: inPeriod.length,
      completedTotal,
      recent: inPeriod.slice(0, 8).map((p) => ({ title: p.lesson.title, completedAt: p.completedAt! })),
    };
  } catch {
    lessons = null;
  }

  return {
    platformName: settings?.platformName ?? "المنصة",
    teacherName: settings?.teacherName ?? null,
    generatedAt: now,
    period: { key: periodKey, label: PERIOD_LABELS[periodKey], title: range.title },
    student: {
      id: student.id,
      name: student.fullName,
      code: student.studentCode,
      grade: student.grade,
      group: student.group?.name ?? null,
      phone: student.phone,
    },
    attendance: {
      total: records.length,
      present,
      late,
      absent,
      percentage: attendancePct,
      absentDates: records.filter((r) => r.status === "absent").map((r) => r.session.sessionDate),
      lateDates: records.filter((r) => r.status === "late").map((r) => r.session.sessionDate),
    },
    quizzes,
    quizAvg,
    payments: payments.map((p) => ({ amount: p.amount, paidAt: p.paidAt, forMonth: p.forMonth })),
    subscription: {
      active: subscription.active,
      paidUntil: subscription.paidUntil,
      /// الدروس مفتوحة له يدويًا من الأدمن رغم إن الاشتراك مش مدفوع
      openedWithoutPayment: subscription.unpaidNotice,
    },
    lessons,
    publishedLessons,
    badges: badges.map((b) => ({ name: b.badge.name, icon: b.badge.icon, awardedAt: b.awardedAt })),
  };
}
