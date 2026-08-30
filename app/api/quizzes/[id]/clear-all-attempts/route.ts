import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";

/**
 * يمسح (يحذف نهائيًا) كل محاولات كل الطلاب في اختبار معيّن دفعة واحدة -
 * نفس منطق /clear-attempts بس مطبّق على كل طالب دخل الاختبار قبل كده، مش
 * طالب واحد بس. بنفس قاعدة "المسح لا يمنح فرصة دخول جديدة": عدد المحاولات
 * اللي اتمسحت لكل طالب بيتسجل في QuizClearedAttempt ويتخصم من الحد
 * المسموح بيه.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }
  const { id: quizId } = await params;

  const quiz = await db.quiz.findUnique({ where: { id: quizId }, select: { id: true } });
  if (!quiz) {
    return NextResponse.json({ error: "الاختبار غير موجود." }, { status: 404 });
  }

  const existing = await db.quizAttempt.findMany({
    where: { quizId },
    select: { studentId: true },
  });

  if (existing.length === 0) {
    return NextResponse.json({ error: "لا توجد أي محاولات على هذا الاختبار لمسحها." }, { status: 400 });
  }

  // نحسب عدد المحاولات لكل طالب عشان نزوّد QuizClearedAttempt بالقيمة
  // الصح لكل واحد فيهم (مش كل الطلاب بالضرورة بنفس العدد).
  const countByStudent = new Map<string, number>();
  for (const a of existing) {
    countByStudent.set(a.studentId, (countByStudent.get(a.studentId) ?? 0) + 1);
  }

  await db.$transaction([
    // QuizAttemptAnswer محذوفة تلقائيًا مع onDelete: Cascade
    db.quizAttempt.deleteMany({ where: { quizId } }),
    ...Array.from(countByStudent.entries()).map(([studentId, count]) =>
      db.quizClearedAttempt.upsert({
        where: { quizId_studentId: { quizId, studentId } },
        update: { count: { increment: count } },
        create: { quizId, studentId, count },
      })
    ),
  ]);

  return NextResponse.json({ cleared: existing.length, studentsAffected: countByStudent.size });
}
