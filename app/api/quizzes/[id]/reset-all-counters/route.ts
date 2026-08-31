import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";

/**
 * بيرجّع عدّادَي "منح محاولة إضافية" و"مسح المحاولات" لكل الطلاب في
 * اختبار معيّن للصفر دفعة واحدة - نفس منطق /reset-counters بس مطبّق على
 * الاختبار كله، من غير أي تأثير على المحاولات الحقيقية الموجودة.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }
  const { id: quizId } = await params;

  await db.$transaction([
    db.quizExtraAttempt.deleteMany({ where: { quizId } }),
    db.quizClearedAttempt.deleteMany({ where: { quizId } }),
  ]);

  return NextResponse.json({ ok: true });
}
