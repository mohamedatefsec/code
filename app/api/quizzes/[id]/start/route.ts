import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";
import { getQuizEligibility } from "@/lib/quiz-eligibility";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (!session || session.role !== "student") {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }
  const { id } = await params;

  const student = await db.studentProfile.findUnique({ where: { userId: session.userId } });
  if (!student) {
    return NextResponse.json({ error: "الملف الشخصي غير موجود." }, { status: 404 });
  }

  // لو فيه محاولة شغّالة بالفعل لنفس الاختبار، كمّل فيها بدل ما تبدأ محاولة جديدة
  const existingInProgress = await db.quizAttempt.findFirst({
    where: { quizId: id, studentId: student.id, status: "in_progress" },
  });
  if (existingInProgress) {
    return NextResponse.json({ attemptId: existingInProgress.id });
  }

  const quiz = await db.quiz.findUnique({ where: { id }, include: { targets: true } });
  if (!quiz) {
    return NextResponse.json({ error: "الاختبار غير موجود." }, { status: 404 });
  }

  const eligibility = await getQuizEligibility(quiz, student.id, student.groupId);
  if (!eligibility.eligible) {
    return NextResponse.json({ error: eligibility.reason }, { status: 403 });
  }

  const attempt = await db.quizAttempt.create({
    data: {
      quizId: id,
      studentId: student.id,
      attemptNumber: eligibility.attemptsUsed + 1,
    },
  });

  return NextResponse.json({ attemptId: attempt.id }, { status: 201 });
}
