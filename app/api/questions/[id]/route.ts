import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";
import { questionBaseSchema, validateQuestionBusinessRules } from "@/lib/validation";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }
  const { id } = await params;

  const question = await db.question.findUnique({
    where: { id },
    include: { options: { orderBy: { order: "asc" } } },
  });

  if (!question) {
    return NextResponse.json({ error: "السؤال غير موجود." }, { status: 404 });
  }

  return NextResponse.json({ question });
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
  const parsed = questionBaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "بيانات غير صالحة.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const businessError = validateQuestionBusinessRules(parsed.data);
  if (businessError) {
    return NextResponse.json({ error: businessError }, { status: 400 });
  }

  const { options, ...questionData } = parsed.data;

  // أبسط وأضمن طريقة لتحديث الخيارات: حذف القديمة وإنشاء الجديدة كاملة
  // داخل معاملة واحدة، بدل محاولة "مطابقة" كل خيار قديم بجديد.
  const question = await db.$transaction(async (tx) => {
    await tx.questionOption.deleteMany({ where: { questionId: id } });
    return tx.question.update({
      where: { id },
      data: {
        ...questionData,
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
  });

  return NextResponse.json({ question });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }
  const { id } = await params;

  await db.question.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
