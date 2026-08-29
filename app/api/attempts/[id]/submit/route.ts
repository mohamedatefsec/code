import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";
import { submitAttemptSchema } from "@/lib/validation";
import { gradeAnswer } from "@/lib/grading";
import { evaluateQuizBadges } from "@/lib/badges";

export async function POST(
  req: Request,
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

  const body = await req.json().catch(() => null);
  const parsed = submitAttemptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "بيانات غير صالحة.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const attempt = await db.quizAttempt.findUnique({
    where: { id },
    include: {
      quiz: {
        include: {
          questions: { include: { question: { include: { options: true } } } },
        },
      },
    },
  });

  if (!attempt || attempt.studentId !== student.id) {
    return NextResponse.json({ error: "المحاولة غير موجودة." }, { status: 404 });
  }
  if (attempt.status === "submitted") {
    return NextResponse.json({ error: "تم تسليم هذه المحاولة بالفعل." }, { status: 409 });
  }
  // محاولة "pending" لسه ما بدأتش فعليًا (الطالب ما ضغطش زر البدء)، فمفيش
  // startedAt نحسب منه الوقت المستغرق - لازم يبدأ أولًا قبل ما يقدر يسلّم.
  if (attempt.status === "pending" || !attempt.startedAt) {
    return NextResponse.json(
      { error: "لازم تضغط زر (ابدأ الاختبار) أولًا قبل التسليم." },
      { status: 400 }
    );
  }

  const answersByQuestionId = new Map(parsed.data.answers.map((a) => [a.questionId, a]));

  let totalScore = 0;
  let maxScore = 0;
  const answerRows = attempt.quiz.questions.map((qq) => {
    const points = qq.pointsOverride ?? qq.question.points;
    maxScore += points;

    const submitted = answersByQuestionId.get(qq.questionId) ?? {
      questionId: qq.questionId,
      selectedOptionIds: undefined,
      textAnswer: undefined,
    };
    const { isCorrect, pointsEarned } = gradeAnswer(
      {
        type: qq.question.type,
        points,
        options: qq.question.options,
      },
      submitted
    );
    totalScore += pointsEarned;

    return {
      attemptId: attempt.id,
      questionId: qq.questionId,
      selectedOptionIds: submitted.selectedOptionIds ?? undefined,
      textAnswer: submitted.textAnswer ?? undefined,
      isCorrect,
      pointsEarned,
    };
  });

  const timeSpentSeconds = Math.max(
    0,
    Math.round((Date.now() - attempt.startedAt.getTime()) / 1000)
  );
  // النسبة والدرجة هنا "جزئية" لو فيه أسئلة مقالية لسه ما اتصححتش - بتتحسب
  // فقط من الأسئلة القابلة للتصحيح الآلي، وتُستكمل لاحقًا بعد التصحيح اليدوي.
  const needsManualGrading = answerRows.some((a) => a.isCorrect === null);
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 1000) / 10 : 0;

  await db.$transaction(async (tx) => {
    await tx.quizAttemptAnswer.deleteMany({ where: { attemptId: attempt.id } });
    await tx.quizAttemptAnswer.createMany({ data: answerRows });
    await tx.quizAttempt.update({
      where: { id: attempt.id },
      data: {
        status: "submitted",
        submittedAt: new Date(),
        score: totalScore,
        maxScore,
        percentage,
        timeSpentSeconds,
        needsManualGrading,
      },
    });
  });

  // منح الشارات لا يجب أن يُفشل عملية التسليم لو حدث أي خطأ فيه، لذا معزول
  // في try منفصل بعد نجاح التسليم الفعلي. لو فيه أسئلة مقالية بانتظار
  // التصحيح، الأفضل تأجيل تقييم شارات الدرجة الكاملة لحين اكتمال التصحيح
  // (تحصل تلقائيًا وقتها من مسار التصحيح اليدوي)، لكن "أول اختبار" منطقي
  // نمنحها فورًا لأنها لا تعتمد على الدرجة النهائية.
  try {
    if (!needsManualGrading) {
      await evaluateQuizBadges(student.id, percentage);
    } else {
      await evaluateQuizBadges(student.id, 0);
    }
  } catch {
    // تجاهل بهدوء - التسليم نفسه نجح بالفعل وهذا ما يهم الطالب
  }

  return NextResponse.json({ score: totalScore, maxScore, percentage, needsManualGrading });
}
