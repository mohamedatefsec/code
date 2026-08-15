import { db } from "@/lib/db";
import type { Quiz, QuizTarget } from "@prisma/client";

export type EligibilityResult =
  | { eligible: true; attemptsUsed: number; attemptsRemaining: number }
  | { eligible: false; reason: string };

/** يتحقق هل الطالب مسموح له أصلًا بدخول هذا الاختبار حسب استهدافه (كل الطلاب أو مجموعات محددة). */
function isTargeted(targets: QuizTarget[], groupId: string | null): boolean {
  if (targets.length === 0) return true; // لا استهداف = متاح للجميع
  return targets.some((t) => t.targetType === "group" && t.groupId === groupId);
}

export async function getQuizEligibility(
  quiz: Quiz & { targets: QuizTarget[] },
  studentId: string,
  studentGroupId: string | null
): Promise<EligibilityResult> {
  if (quiz.status !== "published") {
    return { eligible: false, reason: "هذا الاختبار غير متاح حاليًا." };
  }

  const now = new Date();
  if (quiz.startAt && now < quiz.startAt) {
    return { eligible: false, reason: "الاختبار لم يبدأ بعد." };
  }
  if (quiz.endAt && now > quiz.endAt) {
    return { eligible: false, reason: "انتهى الوقت المسموح لدخول هذا الاختبار." };
  }

  if (!isTargeted(quiz.targets, studentGroupId)) {
    return { eligible: false, reason: "هذا الاختبار غير متاح لمجموعتك." };
  }

  const attemptsUsed = await db.quizAttempt.count({
    where: { quizId: quiz.id, studentId },
  });

  if (attemptsUsed >= quiz.maxAttempts) {
    return { eligible: false, reason: "استنفدت عدد المحاولات المسموح بها لهذا الاختبار." };
  }

  return { eligible: true, attemptsUsed, attemptsRemaining: quiz.maxAttempts - attemptsUsed };
}
