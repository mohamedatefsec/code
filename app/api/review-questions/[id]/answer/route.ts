import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireActiveUser } from "@/lib/auth";
import {
  asStringArray,
  buildRevealedAnswer,
  gradeReviewAnswer,
  isReviewType,
  reviewAnswerSchema,
  validateReviewAnswerInput,
} from "@/lib/review";

/// الطالب بيجاوب على سؤال مراجعة - مرة واحدة فقط.
/// الحماية من التكرار على مستوى قاعدة البيانات (unique: questionId + studentId)،
/// فحتى لو الطالب ضغط الزر مرتين أو فتح المنصة من تابين، الإجابة الثانية بترجع 409.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireActiveUser("student");
  if (!user) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }
  const { id } = await params;

  const student = await db.studentProfile.findUnique({ where: { userId: user.id } });
  if (!student) {
    return NextResponse.json({ error: "الملف الشخصي غير موجود." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = reviewAnswerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صالحة." }, { status: 400 });
  }

  const question = await db.reviewQuestion.findUnique({
    where: { id },
    include: { options: { orderBy: { order: "asc" } } },
  });
  // السؤال المسودة مايتحلّش (ويتعامل معاه كأنه مش موجود)
  if (!question || question.status !== "published" || !isReviewType(question.type)) {
    return NextResponse.json({ error: "السؤال غير موجود." }, { status: 404 });
  }

  const gradable = { type: question.type, options: question.options };

  const inputError = validateReviewAnswerInput(gradable, parsed.data);
  if (inputError) {
    return NextResponse.json({ error: inputError }, { status: 400 });
  }

  // code_output والمقالي إجابتهم نص حر؛ الباقي اختيارات.
  const usesText = question.type === "code_output" || question.type === "essay";
  const selectedOptionIds = usesText ? [] : parsed.data.selectedOptionIds ?? [];
  const textAnswer = usesText ? (parsed.data.textAnswer ?? "").trim() : null;

  const isCorrect = gradeReviewAnswer(gradable, { selectedOptionIds, textAnswer });

  try {
    await db.reviewAnswer.create({
      data: {
        questionId: question.id,
        studentId: student.id,
        selectedOptionIds: usesText ? undefined : selectedOptionIds,
        textAnswer,
        isCorrect,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      // جاوب قبل كده: نرجّع إجابته الأصلية (مش الإجابة الجديدة) عشان الواجهة تقفل
      // البطاقة بالنتيجة الحقيقية.
      const previous = await db.reviewAnswer.findUnique({
        where: { questionId_studentId: { questionId: question.id, studentId: student.id } },
      });
      return NextResponse.json(
        {
          error: "أنت جاوبت على السؤال ده قبل كده، ومينفعش تجاوب تاني.",
          answer: previous
            ? buildRevealedAnswer(
                { ...gradable, explanation: question.explanation },
                {
                  selectedOptionIds: asStringArray(previous.selectedOptionIds),
                  textAnswer: previous.textAnswer,
                  isCorrect: previous.isCorrect,
                }
              )
            : undefined,
        },
        { status: 409 }
      );
    }
    throw err;
  }

  return NextResponse.json({
    answer: buildRevealedAnswer(
      { ...gradable, explanation: question.explanation },
      { selectedOptionIds, textAnswer, isCorrect }
    ),
  });
}
