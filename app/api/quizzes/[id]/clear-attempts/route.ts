import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";

/**
 * يمسح (يحذف نهائيًا) كل محاولات طالب معيّن في اختبار معيّن - بكل ما فيها من
 * إجابات ودرجات - بغض النظر عن حالتها (بانتظار البدء / قيد التنفيذ / تم
 * التسليم). السجل بيختفي تمامًا من صفحة المتابعة والنتائج.
 *
 * مهم: المسح ده لا يمنح الطالب فرصة دخول جديدة. عدد المحاولات اللي اتمسحت
 * بيتسجل في QuizClearedAttempt ويتخصم من الحد المسموح به (maxAttempts +
 * أي محاولات إضافية اتمنحت)، فلو الطالب كان مستنفد محاولاته قبل المسح
 * بيفضل مستنفدها بعد المسح برضه - المسح مجرد تنظيف للسجل، مش إعادة تعيين.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }
  const { id: quizId } = await params;

  const body = await req.json().catch(() => null);
  const studentId = body?.studentId as string | undefined;
  if (!studentId) {
    return NextResponse.json({ error: "بيانات الطالب مفقودة." }, { status: 400 });
  }

  const [quiz, student] = await Promise.all([
    db.quiz.findUnique({ where: { id: quizId }, select: { id: true } }),
    db.studentProfile.findUnique({ where: { id: studentId }, select: { id: true } }),
  ]);
  if (!quiz) {
    return NextResponse.json({ error: "الاختبار غير موجود." }, { status: 404 });
  }
  if (!student) {
    return NextResponse.json({ error: "الطالب غير موجود." }, { status: 404 });
  }

  const existing = await db.quizAttempt.findMany({
    where: { quizId, studentId },
    select: { id: true },
  });

  if (existing.length === 0) {
    return NextResponse.json({ error: "لا توجد محاولات لهذا الطالب في هذا الاختبار." }, { status: 400 });
  }

  await db.$transaction([
    // QuizAttemptAnswer محذوفة تلقائيًا مع onDelete: Cascade
    db.quizAttempt.deleteMany({ where: { quizId, studentId } }),
    db.quizClearedAttempt.upsert({
      where: { quizId_studentId: { quizId, studentId } },
      update: { count: { increment: existing.length } },
      create: { quizId, studentId, count: existing.length },
    }),
  ]);

  return NextResponse.json({ cleared: existing.length });
}
