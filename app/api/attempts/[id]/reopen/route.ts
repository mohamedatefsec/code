import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";

/**
 * يمنح المدرّس القدرة على "فتح" محاولة اختبار عالقة قيد التنفيذ (مثلًا طالب
 * أغلق المتصفح قبل التسليم وانتهى الوقت المسموح وهو غايب) من جديد، بإعادة
 * ضبط وقت البدء لتبدأ المهلة من الصفر. بما أننا لا نُنشئ محاولة جديدة (نفس
 * الصف بنفس attemptNumber)، فهذا لا يُحتسب ضمن عدد المحاولات المسموح بها
 * لهذا الاختبار - الطالب يدخل بنفس رابط الاختبار المعتاد ويكمل عاديًا.
 *
 * مُقيَّد عمدًا بمحاولات status="in_progress" فقط؛ إعادة فتح محاولة تم
 * تسليمها بالفعل قرار مختلف وأكثر حساسية (قد يمس درجة مُعلَنة للطالب) وغير
 * مطلوب هنا.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }
  const { id } = await params;

  const attempt = await db.quizAttempt.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!attempt) {
    return NextResponse.json({ error: "المحاولة غير موجودة." }, { status: 404 });
  }
  if (attempt.status !== "in_progress") {
    return NextResponse.json(
      { error: "هذه المحاولة مُسلَّمة بالفعل، لا يمكن إعادة فتحها من هنا." },
      { status: 400 }
    );
  }

  const updated = await db.quizAttempt.update({
    where: { id },
    data: { startedAt: new Date() },
  });

  return NextResponse.json({ attempt: updated });
}
