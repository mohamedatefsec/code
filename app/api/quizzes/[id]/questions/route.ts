import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";
import { quizQuestionsUpdateSchema } from "@/lib/validation";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = quizQuestionsUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "بيانات غير صالحة.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { questionIds } = parsed.data;

  await db.$transaction(async (tx) => {
    await tx.quizQuestion.deleteMany({ where: { quizId: id } });
    if (questionIds.length > 0) {
      await tx.quizQuestion.createMany({
        data: questionIds.map((questionId, index) => ({
          quizId: id,
          questionId,
          order: index,
        })),
      });
    }
  });

  const questions = await db.quizQuestion.findMany({
    where: { quizId: id },
    orderBy: { order: "asc" },
    include: { question: { select: { id: true, text: true, type: true, points: true } } },
  });

  return NextResponse.json({ questions });
}
