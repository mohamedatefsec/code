import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";

const gradeSchema = z.object({
  studentId: z.string().min(1),
  /// true = صحيحة، false = غير صحيحة، null = رجّعها "بانتظار المراجعة"
  isCorrect: z.boolean().nullable(),
});

/// مراجعة إجابة طالب على سؤال مقالي يدويًا (الأنواع التانية بتتصحح آليًا).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = gradeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صالحة." }, { status: 400 });
  }

  const question = await db.reviewQuestion.findUnique({
    where: { id },
    select: { type: true },
  });
  if (!question) {
    return NextResponse.json({ error: "السؤال غير موجود." }, { status: 404 });
  }
  if (question.type !== "essay") {
    return NextResponse.json(
      { error: "التصحيح اليدوي متاح للأسئلة المقالية فقط." },
      { status: 400 }
    );
  }

  const result = await db.reviewAnswer.updateMany({
    where: { questionId: id, studentId: parsed.data.studentId },
    data: { isCorrect: parsed.data.isCorrect },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "إجابة الطالب غير موجودة." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

/// إعادة فتح السؤال: يمسح إجابات الطلاب فيرجع السؤال قابل للحل من جديد.
/// - من غير studentId: يمسح إجابات كل الطلاب على هذا السؤال.
/// - مع ?studentId=...: يمسح إجابة طالب واحد بس.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }
  const { id } = await params;
  const studentId = new URL(req.url).searchParams.get("studentId");

  const result = await db.reviewAnswer.deleteMany({
    where: { questionId: id, ...(studentId ? { studentId } : {}) },
  });

  return NextResponse.json({ ok: true, deleted: result.count });
}
