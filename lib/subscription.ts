import { db } from "@/lib/db";
import { getLatestCoverageEnd } from "@/lib/subscription-shared";

export type SubscriptionStatus = {
  /// هل اشتراك الطالب سارٍ دلوقتي (عنده تغطية شهر لسه ماخلصتش مدتها).
  active: boolean;
  /// تاريخ آخر دفعة سُجّلت له فعليًا (بغضّ النظر عن الشهر اللي بتغطّيه).
  lastPaymentAt: Date | null;
  /// الاشتراك ساري لحد امتى - أبعد نهاية تغطية من بين كل دفعاته.
  paidUntil: Date | null;
};

/// حالة اشتراك الطالب الشهري: بنحسبها من *كل* دفعاته المسجّلة (Payment) -
/// كل دفعة بتغطّي شهر محدّد (forMonth) أو شهر من تاريخها الفعلي (paidAt)
/// للدفعات القديمة - وبناخد أبعد نهاية تغطية من بينهم كلهم.
export async function getStudentSubscriptionStatus(
  studentId: string,
  now: Date = new Date()
): Promise<SubscriptionStatus> {
  const payments = await db.payment.findMany({
    where: { studentId },
    orderBy: { paidAt: "desc" },
    select: { paidAt: true, forMonth: true },
  });

  if (payments.length === 0) {
    return { active: false, lastPaymentAt: null, paidUntil: null };
  }

  const paidUntil = getLatestCoverageEnd(payments);
  return {
    active: paidUntil !== null && paidUntil.getTime() >= now.getTime(),
    lastPaymentAt: payments[0].paidAt,
    paidUntil,
  };
}
