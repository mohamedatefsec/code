import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";
import { quizUpdateSchema } from "@/lib/validation";
import { sendPushToStudents, sendPushToAllStudents } from "@/lib/push";
import { resolveAudienceStudentIdsMulti } from "@/lib/notification-audience";

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
  const session = await requireAdminSession();
  if (!session) {
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

  // نجيب حالة الاختبار قبل التحديث عشان نكتشف لحظة "أول نشر" بالتحديد،
  // ومعاها بيانات المادة والاستهداف لبناء الإشعار.
  const before = await db.quiz.findUnique({ where: { id }, select: { status: true } });

  const quiz = await db.quiz.update({
    where: { id },
    data: parsed.data,
    include: { subject: true, targets: true },
  });

  // عند أول نشر لاختبار، نبعت إشعار داخلي + Push فوري، بنفس منطق نشر
  // الدروس - يوصل الطالب حتى لو المنصة مقفولة.
  const justPublished = before?.status !== "published" && quiz.status === "published";
  if (justPublished) {
    const title = `📝 اختبار جديد: ${quiz.title}`;
    const body = `تم نشر اختبار جديد في مادة ${quiz.subject.name}. افتح صفحة الاختبارات للدخول عليه الآن.`;

    try {
      if (quiz.targets.length === 0) {
        // من غير استهداف = متاح لكل الطلاب
        await db.notification.create({
          data: { title, body, targetType: "all", createdBy: session.userId },
        });
      } else {
        // صف إشعار منفصل لكل هدف (مجموعة/طالب) - نفس قيود موديل
        // Notification الحالي (هدف واحد بالصف).
        await Promise.all(
          quiz.targets.map((t) =>
            t.targetType === "group" && t.groupId
              ? db.notification.create({
                  data: { title, body, targetType: "group", targetGroupId: t.groupId, createdBy: session.userId },
                })
              : t.targetType === "student" && t.studentId
              ? db.notification.create({
                  data: { title, body, targetType: "student", targetStudentId: t.studentId, createdBy: session.userId },
                })
              : Promise.resolve()
          )
        );
      }
    } catch {
      // فشل إرسال الإشعار الداخلي لا يجب أن يفشّل عملية النشر نفسها
    }

    try {
      if (quiz.targets.length === 0) {
        await sendPushToAllStudents({ title, body: quiz.subject.name, url: "/quizzes" });
      } else {
        const studentIds = await resolveAudienceStudentIdsMulti(
          quiz.targets
            .filter((t) => (t.targetType === "group" && t.groupId) || (t.targetType === "student" && t.studentId))
            .map((t) =>
              t.targetType === "group"
                ? { targetType: "group" as const, targetGroupId: t.groupId! }
                : { targetType: "student" as const, targetStudentId: t.studentId! }
            )
        );
        await sendPushToStudents(studentIds, { title, body: quiz.subject.name, url: "/quizzes" });
      }
    } catch {
      // فشل إرسال Push لا يجب أن يفشّل عملية النشر نفسها
    }
  }

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
