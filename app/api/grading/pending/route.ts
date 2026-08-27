import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";

export async function GET() {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }

  const attempts = await db.quizAttempt.findMany({
    where: { status: "submitted", needsManualGrading: true },
    orderBy: { submittedAt: "asc" },
    include: {
      quiz: { select: { title: true } },
      student: { select: { fullName: true, studentCode: true } },
    },
  });

  // لو نفس الطالب دخل نفس الاختبار أكتر من مرة (مثلًا بعد ما اتمنحله
  // محاولة إضافية)، بنعرض آخر محاولة بتاعته بس في قائمة الانتظار - مش كل
  // محاولاته - عشان محاولاته القديمة تبقى مجرد تاريخ سابق مش حاجة محتاجة
  // تصحيح منفصل، وده بيمنع ظهور نفس الطالب مكرر لنفس الاختبار في القائمة.
  const latestPerStudentAndQuiz = new Map<string, (typeof attempts)[number]>();
  for (const attempt of attempts) {
    const key = `${attempt.studentId}::${attempt.quizId}`;
    const existing = latestPerStudentAndQuiz.get(key);
    if (!existing || attempt.attemptNumber > existing.attemptNumber) {
      latestPerStudentAndQuiz.set(key, attempt);
    }
  }
  const deduped = Array.from(latestPerStudentAndQuiz.values()).sort(
    (a, b) => (a.submittedAt?.getTime() ?? 0) - (b.submittedAt?.getTime() ?? 0)
  );

  return NextResponse.json({ attempts: deduped });
}
