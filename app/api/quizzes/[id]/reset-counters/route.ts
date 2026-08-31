import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";

/**
 * بيرجّع عدّادَي "منح محاولة إضافية" و"مسح المحاولات" لطالب معيّن في
 * اختبار معيّن للصفر - بدون ما يمسّ أي محاولة حقيقية للطالب أو يأثر على
 * عدد المحاولات المتاح له فعليًا (لو عنده محاولات مستخدمة، لسه هتفضل زي
 * ما هي). ده تصفير للعرض/التتبّع بس، مش تعديل في الأهلية.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }
  const { id: quizId } = await params;

  const body = await req.json().catch(() => null);
  const studentId = body?.studentId as string | undefined;
  if (!studentId) {
    return NextResponse.json({ error: "بيانات الطالب مفقودة." }, { status: 400 });
  }

  await db.$transaction([
    db.quizExtraAttempt.deleteMany({ where: { quizId, studentId } }),
    db.quizClearedAttempt.deleteMany({ where: { quizId, studentId } }),
  ]);

  return NextResponse.json({ ok: true });
}
