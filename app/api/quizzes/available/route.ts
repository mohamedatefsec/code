import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";
import { getQuizEligibility } from "@/lib/quiz-eligibility";

export async function GET() {
  const session = await getCurrentSession();
  if (!session || session.role !== "student") {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }

  const student = await db.studentProfile.findUnique({ where: { userId: session.userId } });
  if (!student) {
    return NextResponse.json({ error: "الملف الشخصي غير موجود." }, { status: 404 });
  }

  const quizzes = await db.quiz.findMany({
    where: { status: "published" },
    include: {
      targets: true,
      subject: { select: { name: true } },
      _count: { select: { questions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const inProgressAttempts = await db.quizAttempt.findMany({
    where: { studentId: student.id, status: "in_progress" },
    select: { quizId: true, id: true },
  });
  const inProgressByQuiz = new Map(inProgressAttempts.map((a) => [a.quizId, a.id]));

  const result = await Promise.all(
    quizzes.map(async (quiz) => {
      const eligibility = await getQuizEligibility(quiz, student.id, student.groupId);
      return {
        id: quiz.id,
        title: quiz.title,
        subject: quiz.subject.name,
        durationMinutes: quiz.durationMinutes,
        questionsCount: quiz._count.questions,
        maxAttempts: quiz.maxAttempts,
        inProgressAttemptId: inProgressByQuiz.get(quiz.id) ?? null,
        ...eligibility,
      };
    })
  );

  return NextResponse.json({ quizzes: result });
}
