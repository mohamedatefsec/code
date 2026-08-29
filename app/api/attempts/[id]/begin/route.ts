import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";

/**
 * يُستدعى لما الطالب يضغط زر "ابدأ الاختبار" فعليًا في صفحة أداء الاختبار.
 * هذه هي اللحظة الوحيدة اللي بيبدأ فيها العدّاد التنازلي - سواء كانت المحاولة
 * أول محاولة عادية، أو محاولة إضافية منحها المدرّس، أو محاولة أعاد المدرّس
 * فتحها بعد ما علقت. من غير الضغط على الزرار، تفضل المحاولة "pending"
 * والمدرّس شايفها في شاشة المتابعة كـ"مفتوحة - في انتظار الطالب".
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (!session || session.role !== "student") {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }
  const { id } = await params;

  const student = await db.studentProfile.findUnique({ where: { userId: session.userId } });
  if (!student) {
    return NextResponse.json({ error: "الملف الشخصي غير موجود." }, { status: 404 });
  }

  const attempt = await db.quizAttempt.findUnique({
    where: { id },
    select: { id: true, studentId: true, status: true },
  });
  if (!attempt || attempt.studentId !== student.id) {
    return NextResponse.json({ error: "المحاولة غير موجودة." }, { status: 404 });
  }
  if (attempt.status !== "pending") {
    return NextResponse.json(
      { error: "هذه المحاولة بدأت بالفعل أو تم تسليمها." },
      { status: 400 }
    );
  }

  const updated = await db.quizAttempt.update({
    where: { id },
    data: { status: "in_progress", startedAt: new Date() },
    select: { id: true, status: true, startedAt: true },
  });

  return NextResponse.json({ attempt: updated });
}
