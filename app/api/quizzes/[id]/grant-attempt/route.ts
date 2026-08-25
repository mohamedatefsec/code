import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";

/**
 * يمنح طالبًا معيّنًا محاولة إضافية واحدة لاختبار معيّن. النتائج السابقة
 * المحفوظة (الدرجة، الإجابات) لا تُمس إطلاقًا - المحاولة القديمة تبقى كما
 * هي بالضبط في سجل النتائج، والطالب يحصل على محاولة جديدة منفصلة تمامًا
 * (attemptNumber جديد) لما يدخل الاختبار تاني من نفس الرابط المعتاد.
 * هذا لا يغيّر الحد الأقصى للمحاولات (maxAttempts) لبقية الطلاب.
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

  const grant = await db.quizExtraAttempt.upsert({
    where: { quizId_studentId: { quizId, studentId } },
    update: { count: { increment: 1 } },
    create: { quizId, studentId, count: 1 },
  });

  return NextResponse.json({ extraGrant: grant });
}
