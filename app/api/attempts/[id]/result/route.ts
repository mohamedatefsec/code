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

  // "دروس محتاج تراجعها": الدروس المرتبطة بالأسئلة اللي الطالب غلط فيها
  // (مرتّبة من الأكتر غلطًا). بتظهر بس للأسئلة المربوطة بدرس في بنك الأسئلة.
  const wrongByLesson = new Map<string, number>();
  for (const a of attempt.answers) {
    if (a.isCorrect === false && a.question.lessonId) {
      wrongByLesson.set(a.question.lessonId, (wrongByLesson.get(a.question.lessonId) ?? 0) + 1);
    }
  }
  const reviewLessons =
    wrongByLesson.size === 0
      ? []
      : (
          await db.lesson.findMany({
            where: { id: { in: [...wrongByLesson.keys()] }, status: "published", unit: { status: "published" } },
            select: { id: true, title: true, unit: { select: { title: true } } },
          })
        )
          .map((l) => ({ id: l.id, title: l.title, unitTitle: l.unit.title, wrongCount: wrongByLesson.get(l.id) ?? 0 }))
          .sort((x, y) => y.wrongCount - x.wrongCount);

  return NextResponse.json({
    result: {
      reviewLessons,
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
