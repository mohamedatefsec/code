import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";

export async function GET(
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

  const attempt = await db.quizAttempt.findUnique({
    where: { id },
    include: {
      quiz: { select: { title: true } },
      answers: {
        include: {
          question: {
            include: { options: { orderBy: { order: "asc" } } },
          },
        },
      },
    },
  });

  if (!attempt || attempt.studentId !== student.id) {
    return NextResponse.json({ error: "المحاولة غير موجودة." }, { status: 404 });
  }
  if (attempt.status !== "submitted") {
    return NextResponse.json({ error: "لم يتم تسليم هذه المحاولة بعد." }, { status: 409 });
  }

  return NextResponse.json({
    result: {
      quizTitle: attempt.quiz.title,
      score: attempt.score,
      maxScore: attempt.maxScore,
      percentage: attempt.percentage,
      timeSpentSeconds: attempt.timeSpentSeconds,
      needsManualGrading: attempt.needsManualGrading,
      answers: attempt.answers.map((a) => ({
        questionText: a.question.text,
        questionType: a.question.type,
        explanation: a.question.explanation,
        isCorrect: a.isCorrect,
        pointsEarned: a.pointsEarned,
        maxPoints: a.question.points,
        selectedOptionIds: a.selectedOptionIds,
        textAnswer: a.textAnswer,
        options: a.question.options.map((o) => ({ id: o.id, text: o.text, isCorrect: o.isCorrect, order: o.order })),
      })),
    },
  });
}
