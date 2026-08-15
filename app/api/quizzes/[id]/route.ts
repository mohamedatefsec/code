import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";
import { quizUpdateSchema } from "@/lib/validation";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }
  const { id } = await params;

  const quiz = await db.quiz.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: { question: { select: { id: true, text: true, type: true, points: true } } },
      },
      targets: { include: { group: { select: { id: true, name: true } } } },
    },
  });

  if (!quiz) {
    return NextResponse.json({ error: "الاختبار غير موجود." }, { status: 404 });
  }

  return NextResponse.json({ quiz });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = quizUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "بيانات غير صالحة.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (parsed.data.status === "published") {
    const questionsCount = await db.quizQuestion.count({ where: { quizId: id } });
    if (questionsCount === 0) {
      return NextResponse.json(
        { error: "لا يمكن نشر اختبار بدون أسئلة. أضف سؤالًا واحدًا على الأقل أولًا." },
        { status: 400 }
      );
    }
  }

  const quiz = await db.quiz.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ quiz });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }
  const { id } = await params;

  await db.quiz.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
