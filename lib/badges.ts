import { db } from "@/lib/db";
import type { BadgeCriteria } from "@prisma/client";

/**
 * يمنح شارة لطالب لو حقق شرطها، بشكل آمن للتكرار (idempotent) بفضل
 * القيد الفريد unique(studentId, badgeId) - استدعاؤها أكثر من مرة لا يضر.
 * لا نستخدم محرك قواعد معقد كما هو متفق عليه؛ فقط شروط بسيطة في الكود.
 */
export async function awardBadge(studentId: string, criteriaKey: BadgeCriteria) {
  const badge = await db.badge.findUnique({ where: { criteriaKey } });
  if (!badge) return; // البادج مش متزروع (مثلاً السيد لسه ما اتشغّلش)، تجاهل بهدوء

  await db.studentBadge.upsert({
    where: { studentId_badgeId: { studentId, badgeId: badge.id } },
    update: {},
    create: { studentId, badgeId: badge.id },
  });
}

/** يُستدعى بعد تسليم أي محاولة اختبار لتقييم شارات مرتبطة بالاختبارات. */
export async function evaluateQuizBadges(studentId: string, percentage: number) {
  const submittedCount = await db.quizAttempt.count({
    where: { studentId, status: "submitted" },
  });

  if (submittedCount >= 1) await awardBadge(studentId, "first_quiz");
  if (submittedCount >= 5) await awardBadge(studentId, "five_quizzes_streak");
  if (percentage >= 100) await awardBadge(studentId, "perfect_score");
}

/** يُستدعى بعد حفظ الحضور لتقييم شارة "حضور ممتاز". */
export async function evaluateAttendanceBadge(studentId: string) {
  const records = await db.attendanceRecord.findMany({
    where: { studentId },
    select: { status: true },
  });
  // نشترط 5 حصص على الأقل حتى لا تُمنح الشارة من أول حصة واحدة حاضرة
  if (records.length < 5) return;

  const attendedCount = records.filter((r) => r.status !== "absent").length;
  const percentage = (attendedCount / records.length) * 100;
  if (percentage >= 90) await awardBadge(studentId, "excellent_attendance");
}
