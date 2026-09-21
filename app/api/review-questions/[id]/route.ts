import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";
import {
  asStringArray,
  gradeReviewAnswer,
  isReviewType,
  reviewQuestionSchema,
  validateReviewQuestionRules,
} from "@/lib/review";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }
  const { id } = await params;

  const question = await db.reviewQuestion.findUnique({
    where: { id },
    include: { options: { orderBy: { order: "asc" } } },
  });
  if (!question) {
    return NextResponse.json({ error: "السؤال غير موجود." }, { status: 404 });
  }

  // الطلاب اللي جاوبوا (لعرضهم في صفحة التعديل وإمكانية إعادة فتح السؤال لطالب)
  const answers = await db.reviewAnswer.findMany({
    where: { questionId: id },
    orderBy: { answeredAt: "desc" },
    include: { student: { select: { id: true, fullName: true, studentCode: true } } },
  });

  return NextResponse.json({
    question,
    answers: answers.map((a) => ({
      studentId: a.student.id,
      fullName: a.student.fullName,
      studentCode: a.student.studentCode,
      isCorrect: a.isCorrect,
      textAnswer: a.textAnswer,
      answeredAt: a.answeredAt,
    })),
  });
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

  const existing = await db.reviewQuestion.findUnique({
    where: { id },
    include: { options: true, _count: { select: { answers: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "السؤال غير موجود." }, { status: 404 });
  }

  const { options, subjectId, codeSnippet, explanation, ...rest } = parsed.data;

  // تغيير النوع بعد ما طلاب جاوبوا هيخلّي إجاباتهم المخزّنة (اختيارات/نص)
  // غير متوافقة مع شكل السؤال الجديد - نمنعه صراحةً بدل ما نكسر البيانات.
  if (existing._count.answers > 0 && existing.type !== rest.type) {
    return NextResponse.json(
      {
        error:
          "مينفعش تغيّر نوع سؤال فيه إجابات طلاب. امسح الإجابات الأول، أو أنشئ سؤال جديد.",
      },
      { status: 409 }
    );
  }

  if (subjectId) {
    const subject = await db.subject.findUnique({ where: { id: subjectId }, select: { id: true } });
    if (!subject) {
      return NextResponse.json({ error: "المادة غير موجودة." }, { status: 400 });
    }
  }

  // تحديث الخيارات "في مكانها" (بدل حذف الكل وإنشاء جديد) عشان الخيارات اللي
  // ما اتغيّرتش تحافظ على نفس الـ ID، وإجابات الطلاب المخزّنة تفضل صالحة.
  const existingIds = new Set(existing.options.map((o) => o.id));
  const reused = new Set<string>();
  const plan = options.map((o, index) => {
    const canReuse = !!o.id && existingIds.has(o.id) && !reused.has(o.id);
    if (canReuse) reused.add(o.id as string);
    return { ...o, index, reuseId: canReuse ? (o.id as string) : null };
  });

  try {
    const question = await db.$transaction(
      async (tx) => {
        await tx.reviewOption.deleteMany({
          where: { questionId: id, id: { notIn: [...reused] } },
        });

        for (const p of plan) {
          if (p.reuseId) {
            await tx.reviewOption.update({
              where: { id: p.reuseId },
              data: { text: p.text, isCorrect: p.isCorrect, order: p.index },
            });
          } else {
            await tx.reviewOption.create({
              data: { questionId: id, text: p.text, isCorrect: p.isCorrect, order: p.index },
            });
          }
        }

        const updated = await tx.reviewQuestion.update({
          where: { id },
          data: {
            ...rest,
            subjectId: subjectId || null,
            codeSnippet: codeSnippet?.trim() ? codeSnippet : null,
            explanation: explanation?.trim() ? explanation.trim() : null,
          },
          include: { options: { orderBy: { order: "asc" } } },
        });

        // إعادة تصحيح كل إجابات الطلاب الحالية على السؤال بعد التعديل (لو
        // الأدمن صحّح الإجابة الصحيحة مثلًا) عشان النتيجة المعروضة تفضل متسقة.
        // المقالي مستثنى: تصحيحه يدوي وما بنلمسش درجات الأدمن.
        if (existing._count.answers > 0 && isReviewType(updated.type) && updated.type !== "essay") {
          const answers = await tx.reviewAnswer.findMany({ where: { questionId: id } });
          const correctIds: string[] = [];
          const wrongIds: string[] = [];
          for (const a of answers) {
            const ok = gradeReviewAnswer(
              { type: updated.type, options: updated.options },
              { selectedOptionIds: asStringArray(a.selectedOptionIds), textAnswer: a.textAnswer }
            );
            if (ok === null) continue;
            (ok ? correctIds : wrongIds).push(a.id);
          }
          if (correctIds.length > 0) {
            await tx.reviewAnswer.updateMany({
              where: { id: { in: correctIds } },
              data: { isCorrect: true },
            });
          }
          if (wrongIds.length > 0) {
            await tx.reviewAnswer.updateMany({
              where: { id: { in: wrongIds } },
              data: { isCorrect: false },
            });
          }
        }

        return updated;
      },
      { maxWait: 10000, timeout: 20000 }
    );

    return NextResponse.json({ question });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "السؤال غير موجود." }, { status: 404 });
    }
    throw err;
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }
  const { id } = await params;

  try {
    // الخيارات وإجابات الطلاب بتتحذف تلقائيًا (onDelete: Cascade)
    await db.reviewQuestion.delete({ where: { id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "السؤال غير موجود." }, { status: 404 });
    }
    throw err;
  }
  return NextResponse.json({ ok: true });
}
