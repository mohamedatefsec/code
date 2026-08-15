import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";
import { gradeEssaysSchema } from "@/lib/validation";
import { evaluateQuizBadges } from "@/lib/badges";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }
  const { id } = await params;

  const attempt = await db.quizAttempt.findUnique({
    where: { id },
    include: {
      quiz: { select: { title: true } },
      student: { select: { fullName: true, studentCode: true } },
      answers: { include: { question: true } },
    },
  });

  if (!attempt) {
    return NextResponse.json({ error: "المحاولة غير موجودة." }, { status: 404 });
  }

  return NextResponse.json({
    attempt: {
      id: attempt.id,
      quizTitle: attempt.quiz.title,
      studentName: attempt.student.fullName,
      studentCode: attempt.student.studentCode,
      needsManualGrading: attempt.needsManualGrading,
      essayAnswers: attempt.answers
        .filter((a) => a.question.type === "essay")
        .map((a) => ({
          questionId: a.questionId,
          questionText: a.question.text,
          maxPoints: a.question.points,
          textAnswer: a.textAnswer,
          pointsEarned: a.pointsEarned,
        })),
    },
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = gradeEssaysSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "بيانات غير صالحة.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const attempt = await db.quizAttempt.findUnique({
    where: { id },
    include: { answers: { include: { question: true } } },
  });
  if (!attempt) {
    return NextResponse.json({ error: "المحاولة غير موجودة." }, { status: 404 });
  }

  const essayAnswers = attempt.answers.filter((a) => a.question.type === "essay");
  const gradesByQuestionId = new Map(parsed.data.grades.map((g) => [g.questionId, g.pointsEarned]));

  // لازم يتم تصحيح كل الأسئلة المقالية في المحاولة دفعة واحدة، وإلا
  // ستبقى الدرجة النهائية غير مكتملة وقد يظنها الطالب نهائية بالخطأ.
  const missing = essayAnswers.filter((a) => !gradesByQuestionId.has(a.questionId));
  if (missing.length > 0) {
    return NextResponse.json(
      { error: "لازم تصحح كل الأسئلة المقالية في هذه المحاولة." },
      { status: 400 }
    );
  }

  await db.$transaction(async (tx) => {
    for (const answer of essayAnswers) {
      const rawPoints = gradesByQuestionId.get(answer.questionId) ?? 0;
      const clamped = Math.max(0, Math.min(rawPoints, answer.question.points));
      await tx.quizAttemptAnswer.update({
        where: { id: answer.id },
        data: { pointsEarned: clamped, isCorrect: clamped >= answer.question.points },
      });
    }

    const freshAnswers = await tx.quizAttemptAnswer.findMany({ where: { attemptId: id } });
    const totalScore = freshAnswers.reduce((sum, a) => sum + a.pointsEarned, 0);
    const maxScore = attempt.maxScore ?? 0;
    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 1000) / 10 : 0;

    await tx.quizAttempt.update({
      where: { id },
      data: { score: totalScore, percentage, needsManualGrading: false },
    });
  });

  // بعد اكتمال التصحيح، الدرجة النهائية باتت معروفة - نقيّم شارات الدرجة
  // الكاملة الآن (لم تُقيَّم وقت التسليم لتجنّب منحها قبل اكتمال التصحيح).
  const updated = await db.quizAttempt.findUnique({ where: { id } });
  if (updated?.percentage != null) {
    try {
      await evaluateQuizBadges(attempt.studentId, updated.percentage);
    } catch {
      // تجاهل بهدوء
    }
  }

  return NextResponse.json({ ok: true });
}
