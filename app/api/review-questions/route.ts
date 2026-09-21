import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";
import { reviewQuestionSchema, validateReviewQuestionRules } from "@/lib/review";

/// قائمة أسئلة المراجعة للأدمن، مع إحصائية بسيطة لكل سؤال:
/// كام طالب جاوب وكام منهم جاوب صح.
export async function GET() {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }

  const [questions, totalStudents, correctGroups, pendingGroups] = await Promise.all([
    db.reviewQuestion.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        subject: { select: { name: true } },
        _count: { select: { answers: true } },
      },
    }),
    db.studentProfile.count({ where: { user: { status: "active" } } }),
    db.reviewAnswer.groupBy({
      by: ["questionId"],
      where: { isCorrect: true },
      _count: { _all: true },
    }),
    // إجابات مقالية لسه بانتظار مراجعة الأدمن
    db.reviewAnswer.groupBy({
      by: ["questionId"],
      where: { isCorrect: null },
      _count: { _all: true },
    }),
  ]);

  const correctByQuestion = new Map(correctGroups.map((g) => [g.questionId, g._count._all]));
  const pendingByQuestion = new Map(pendingGroups.map((g) => [g.questionId, g._count._all]));

  return NextResponse.json({
    totalStudents,
    questions: questions.map((q) => ({
      id: q.id,
      type: q.type,
      text: q.text,
      status: q.status,
      createdAt: q.createdAt,
      subjectName: q.subject?.name ?? null,
      answeredCount: q._count.answers,
      correctCount: correctByQuestion.get(q.id) ?? 0,
      pendingCount: pendingByQuestion.get(q.id) ?? 0,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = reviewQuestionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "بيانات غير صالحة.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const businessError = validateReviewQuestionRules(parsed.data);
  if (businessError) {
    return NextResponse.json({ error: businessError }, { status: 400 });
  }

  const { options, subjectId, codeSnippet, explanation, ...rest } = parsed.data;

  if (subjectId) {
    const subject = await db.subject.findUnique({ where: { id: subjectId }, select: { id: true } });
    if (!subject) {
      return NextResponse.json({ error: "المادة غير موجودة." }, { status: 400 });
    }
  }

  const question = await db.reviewQuestion.create({
    data: {
      ...rest,
      subjectId: subjectId || null,
      codeSnippet: codeSnippet?.trim() ? codeSnippet : null,
      explanation: explanation?.trim() ? explanation.trim() : null,
      createdBy: session.userId,
      options: {
        create: options.map((o, index) => ({
          text: o.text,
          isCorrect: o.isCorrect,
          order: index,
        })),
      },
    },
    include: { options: true },
  });

  return NextResponse.json({ question }, { status: 201 });
}
