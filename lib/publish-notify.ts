import { db } from "@/lib/db";
import { sendPushToAllStudents, sendPushToStudents } from "@/lib/push";
import { resolveAudienceStudentIdsMulti } from "@/lib/notification-audience";
import { splitLessonNumber } from "@/lib/lesson-title";

/// إشعارات "أول نشر" للدروس والاختبارات - في مكان واحد، عشان النشر اليدوي
/// (من لوحة الأدمن) والنشر المجدول (lib/scheduled-publish.ts) يبعتوا نفس
/// الإشعار بالظبط. أي فشل هنا مايوقفش النشر نفسه.

/// إشعار داخلي + Push لكل الطلاب لما درس يتنشر لأول مرة
export async function notifyLessonPublished(lessonId: string, createdBy: string) {
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, title: true, unit: { select: { title: true, subject: { select: { name: true } } } } },
  });
  if (!lesson) return;

  // الضغط على الإشعار (داخل المنصة أو على الموبايل) بيفتح الدرس نفسه مباشرة
  const lessonUrl = `/lessons/${lesson.id}`;
  const title = `📘 درس جديد: ${splitLessonNumber(lesson.title).text}`;

  try {
    await db.notification.create({
      data: {
        title,
        body: `تم نشر درس جديد في مادة ${lesson.unit.subject.name} - ${lesson.unit.title}. اضغط على الإشعار لفتح الدرس.`,
        linkUrl: lessonUrl,
        targetType: "all",
        createdBy,
      },
    });
  } catch {
    // فشل الإشعار الداخلي مايفشّلش النشر
  }

  // Push فوري لكل طالب فعّل الإشعارات - بيوصله حتى لو المنصة مقفولة
  try {
    await sendPushToAllStudents({
      title,
      body: `${lesson.unit.subject.name} - ${lesson.unit.title}`,
      url: lessonUrl,
    });
  } catch {
    // فشل Push مايفشّلش النشر
  }
}

/// إشعار داخلي + Push لما اختبار يتنشر لأول مرة (للطلاب المستهدفين بس لو فيه استهداف)
export async function notifyQuizPublished(quizId: string, createdBy: string) {
  const quiz = await db.quiz.findUnique({
    where: { id: quizId },
    select: { id: true, title: true, subject: { select: { name: true } }, targets: true },
  });
  if (!quiz) return;

  const title = `📝 اختبار جديد: ${quiz.title}`;
  const body = `تم نشر اختبار جديد في مادة ${quiz.subject.name}. اضغط على الإشعار للوصول للاختبار.`;
  // بيفتح صفحة الاختبارات وينزل لحد الاختبار ده ويميّزه، والطالب بيدوس
  // "ابدأ الاختبار" بنفسه - عشان العدّاد مايشتغلش بالغلط من مجرد ضغطة على إشعار.
  const linkUrl = `/quizzes?quiz=${quiz.id}`;

  try {
    if (quiz.targets.length === 0) {
      // من غير استهداف = متاح لكل الطلاب
      await db.notification.create({
        data: { title, body, linkUrl, targetType: "all", createdBy },
      });
    } else {
      // صف إشعار منفصل لكل هدف (مجموعة/طالب)
      await Promise.all(
        quiz.targets.map((t) =>
          t.targetType === "group" && t.groupId
            ? db.notification.create({
                data: { title, body, linkUrl, targetType: "group", targetGroupId: t.groupId, createdBy },
              })
            : t.targetType === "student" && t.studentId
              ? db.notification.create({
                  data: { title, body, linkUrl, targetType: "student", targetStudentId: t.studentId, createdBy },
                })
              : Promise.resolve()
        )
      );
    }
  } catch {
    // فشل الإشعار الداخلي مايفشّلش النشر
  }

  try {
    if (quiz.targets.length === 0) {
      await sendPushToAllStudents({ title, body: quiz.subject.name, url: linkUrl });
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
      await sendPushToStudents(studentIds, { title, body: quiz.subject.name, url: linkUrl });
    }
  } catch {
    // فشل Push مايفشّلش النشر
  }
}
