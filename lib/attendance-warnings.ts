import { db } from "@/lib/db";
import { sendPushToStudents } from "@/lib/push";

/// النص المطلوب حرفيًا من المدرّس - يظهر للطالب أول ما يتسجّل غيابه.
const FIRST_WARNING_BODY =
  "تم تسجيل غيابك اليوم. إذا تكرر الغياب لأكثر من حصتين سيتم إيقاف حسابك على المنصة، وهذا أول تحذير.";
const FIRST_WARNING_TITLE = "تنبيه غياب";

const DISABLE_BODY =
  "تم إيقاف حسابك على المنصة بسبب الغياب عن حصتين متتاليتين. للتفعيل، يرجى التواصل مع المدرّس.";
const DISABLE_TITLE = "تم إيقاف حسابك";

/**
 * بتتفحص بعد ما الأدمن يحفظ حضور حصة (PUT /api/attendance/sessions/[id]/records).
 * لكل طالب "غاب دلوقتي لأول مرة في هذه الحصة" (يعني حالته كانت غير absent قبل
 * الحفظ ده وبقت absent)، بتقارنه بأقرب حصة سابقة لنفس المجموعة عندها سجل له:
 *
 * - لو الحصة السابقة دي كانت حضور/تأخير (أو مفيش حصة سابقة أصلًا - أول حصة له
 *   أو انضم بعدها): إشعار تحذير أول غياب بس.
 * - لو الحصة السابقة كانت غياب برضه (يعني حصتين غياب متتاليتين): تعطيل
 *   حسابه تلقائيًا فورًا، وإشعار بديل يوضح إنه اتعطّل (مش نفس تحذير الغياب
 *   الأول). التفعيل بعد كده أدمن بس (مفيش أي كود تلقائي بيرجّعه).
 *
 * previousStatuses: خريطة studentId -> حالته في هذه الحصة قبل الحفظ (undefined
 * لو مالوش سجل قبل كده) - المصدر هو الصف اللي كان موجود فعلًا قبل الـ upsert،
 * عشان إعادة حفظ نفس الحصة بنفس الحالة (تعديل بسيط لطالب تاني مثلًا) ما
 * يكررش التحذير أو التعطيل.
 *
 * فشل أي جزء هنا (بحث، إشعار، push) بيتلقّط ومبيوقفش حفظ الحضور نفسه -
 * الاستدعاء في الـ route محوّط بـ try/catch برضه كطبقة حماية إضافية.
 */
export async function applyAbsenceConsequences(
  sessionId: string,
  groupId: string,
  records: { studentId: string; status: "present" | "absent" | "late" }[],
  previousStatuses: Map<string, string | undefined>
): Promise<{ warnedStudentIds: string[]; disabledStudentIds: string[] }> {
  const newlyAbsentIds = records
    .filter((r) => r.status === "absent" && previousStatuses.get(r.studentId) !== "absent")
    .map((r) => r.studentId);

  if (newlyAbsentIds.length === 0) {
    return { warnedStudentIds: [], disabledStudentIds: [] };
  }

  const warnedStudentIds: string[] = [];
  const disabledStudentIds: string[] = [];

  for (const studentId of newlyAbsentIds) {
    // أقرب حصة سابقة (زمنيًا) لنفس المجموعة عندها سجل حضور لهذا الطالب،
    // غير الحصة الحالية. لو الطالب جديد أو انضم بعد هذه الحصة، ببساطة مفيش
    // سجل سابق له، فالنتيجة null والتحذير الأول بس هو اللي بيتفعّل.
    const previousRecord = await db.attendanceRecord.findFirst({
      where: {
        studentId,
        session: { groupId, id: { not: sessionId } },
      },
      orderBy: [{ session: { sessionDate: "desc" } }, { session: { createdAt: "desc" } }],
      select: { status: true },
    });

    if (previousRecord?.status === "absent") {
      disabledStudentIds.push(studentId);
    } else {
      warnedStudentIds.push(studentId);
    }
  }

  if (disabledStudentIds.length > 0) {
    const students = await db.studentProfile.findMany({
      where: { id: { in: disabledStudentIds } },
      select: { id: true, userId: true },
    });
    await db.user.updateMany({
      where: { id: { in: students.map((s) => s.userId) } },
      data: { status: "disabled" },
    });
  }

  // إشعار + push لكل مجموعة، بمعزل عن نجاح حفظ الحضور نفسه.
  await Promise.all([
    ...warnedStudentIds.map((studentId) => notify(studentId, FIRST_WARNING_TITLE, FIRST_WARNING_BODY)),
    ...disabledStudentIds.map((studentId) => notify(studentId, DISABLE_TITLE, DISABLE_BODY)),
  ]);

  return { warnedStudentIds, disabledStudentIds };
}

async function notify(studentId: string, title: string, body: string) {
  try {
    await db.notification.create({
      data: {
        title,
        body,
        targetType: "student",
        targetStudentId: studentId,
        // ملاحظة: هذا الإشعار تلقائي من نظام الحضور، لا من إنشاء أدمن يدوي،
        // فمفيش createdBy حقيقي هنا - نسجّله باسم "النظام" عبر قيمة ثابتة
        // غير مرتبطة بحساب فعلي.
        createdBy: "system:attendance",
      },
    });
  } catch {
    // تجاهل بهدوء - فشل تسجيل الإشعار داخل التطبيق لا يوقف تسجيل الحضور
  }
  try {
    await sendPushToStudents([studentId], { title, body, url: "/dashboard" });
  } catch {
    // تجاهل بهدوء - نفس المنطق المتبع في باقي أماكن استخدام sendPushToStudents
  }
}
