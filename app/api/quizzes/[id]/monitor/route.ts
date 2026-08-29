import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";
import type { QuizTarget } from "@prisma/client";

/**
 * يُرجع لكل طالب مستهدَف بهذا الاختبار حالته الحالية (لم يبدأ / قيد التنفيذ
 * / تم التسليم)، ليستخدمها المدرّس في متابعة الاختبار وهو شغّال لحظيًا،
 * ولمعرفة الطلاب اللي "علقت" محاولتهم قيد التنفيذ بعد انتهاء الوقت المسموح
 * بلا تسليم (مثلًا لو قفلوا المتصفح قبل ما يسلّموا).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }
  const { id } = await params;

  const quiz = await db.quiz.findUnique({
    where: { id },
    include: { targets: true },
  });
  if (!quiz) {
    return NextResponse.json({ error: "الاختبار غير موجود." }, { status: 404 });
  }

  // نحدد الطلاب المستهدفين بنفس منطق الأهلية المستخدم عند دخول الطالب
  // للاختبار: بلا استهداف = كل الطلاب، وإلا مجموعات و/أو طلاب محددين بالاسم.
  const groupIds = quiz.targets
    .filter((t: QuizTarget) => t.targetType === "group" && t.groupId)
    .map((t: QuizTarget) => t.groupId as string);
  const studentIds = quiz.targets
    .filter((t: QuizTarget) => t.targetType === "student" && t.studentId)
    .map((t: QuizTarget) => t.studentId as string);
  const hasTargeting = quiz.targets.length > 0;

  const students = await db.studentProfile.findMany({
    where: hasTargeting
      ? {
          OR: [
            ...(groupIds.length > 0 ? [{ groupId: { in: groupIds } }] : []),
            ...(studentIds.length > 0 ? [{ id: { in: studentIds } }] : []),
          ],
        }
      : {},
    select: {
      id: true,
      fullName: true,
      studentCode: true,
      group: { select: { name: true } },
      quizAttempts: {
        where: { quizId: id },
        orderBy: { attemptNumber: "desc" },
        select: {
          id: true,
          attemptNumber: true,
          status: true,
          startedAt: true,
          submittedAt: true,
          percentage: true,
          needsManualGrading: true,
        },
      },
    },
    orderBy: { fullName: "asc" },
  });

  // محاولات إضافية اتمنحت لطلاب معيّنين على هذا الاختبار تحديدًا (لو حصلت)،
  // نجيبها كلها مرة واحدة ونطابقها بالـ studentId بدل استعلام منفصل لكل طالب.
  const extraGrants = await db.quizExtraAttempt.findMany({
    where: { quizId: id },
    select: { studentId: true, count: true },
  });
  const extraGrantsByStudent = new Map(extraGrants.map((g) => [g.studentId, g.count]));

  // نفس الفكرة لمحاولات اتمسحت (اتحذف سجلّها) - نعرضها في الشاشة عشان
  // المدرّس يعرف إن في محاولات سابقة كانت موجودة واتمسحت.
  const clearedAttempts = await db.quizClearedAttempt.findMany({
    where: { quizId: id },
    select: { studentId: true, count: true },
  });
  const clearedByStudent = new Map(clearedAttempts.map((c) => [c.studentId, c.count]));

  return NextResponse.json({
    quiz: {
      id: quiz.id,
      title: quiz.title,
      durationMinutes: quiz.durationMinutes,
      maxAttempts: quiz.maxAttempts,
    },
    students: students.map((s) => ({
      id: s.id,
      fullName: s.fullName,
      studentCode: s.studentCode,
      groupName: s.group?.name ?? null,
      latestAttempt: s.quizAttempts[0] ?? null,
      attemptsUsed: s.quizAttempts.length,
      extraGrants: extraGrantsByStudent.get(s.id) ?? 0,
      clearedAttempts: clearedByStudent.get(s.id) ?? 0,
    })),
  });
}
