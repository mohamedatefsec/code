import { db } from "@/lib/db";
import { getLatestCoverageEnd } from "@/lib/subscription-shared";

export type SubscriptionStatus = {
  /// هل الطالب يقدر يوصل للدروس دلوقتي فعليًا (سواء بدفع ساري أو بفتح
  /// يدوي من الأدمن).
  active: boolean;
  /// تاريخ آخر دفعة سُجّلت له فعليًا (بغضّ النظر عن الشهر اللي بتغطّيه).
  lastPaymentAt: Date | null;
  /// الاشتراك المدفوع فعليًا ساري لحد امتى - أبعد نهاية تغطية من بين كل
  /// دفعاته (بمعزل عن أي فتح يدوي من الأدمن).
  paidUntil: Date | null;
  /// هل الأدمن فتحله الدروس يدويًا (بغضّ النظر عن حالة الدفع).
  overrideActive: boolean;
  /// إشعار صغير للطالب: اتفتحله الدروس يدويًا بس هو أصلًا لسه ما سدّدش
  /// اشتراك ساري - يظهرله تنبيه بسيط من غير ما نقفل عليه حاجة.
  unpaidNotice: boolean;
};

/// حالة اشتراك الطالب الشهري: بنحسبها من *كل* دفعاته المسجّلة (Payment) -
/// كل دفعة بتغطّي شهر كامل بالتقويم من نفس يوم الدفع (paidAt)، وبناخد
/// أبعد نهاية تغطية من بينهم كلهم. لو الأدمن فتحله يدويًا (subscriptionOverride)
/// بيبقى "active" حتى لو الدفع منتهي، مع إشعار صغير يوضّح إنه لسه ما سدّدش.
export async function getStudentSubscriptionStatus(
  studentId: string,
  now: Date = new Date()
): Promise<SubscriptionStatus> {
  const profile = await db.studentProfile.findUnique({
    where: { id: studentId },
    select: {
      subscriptionOverride: true,
      payments: { orderBy: { paidAt: "desc" }, select: { paidAt: true, forMonth: true } },
    },
  });

  const payments = profile?.payments ?? [];
  const paidUntil = getLatestCoverageEnd(payments);
  const paymentActive = paidUntil !== null && paidUntil.getTime() >= now.getTime();
  const overrideActive = profile?.subscriptionOverride ?? false;

  return {
    active: paymentActive || overrideActive,
    lastPaymentAt: payments[0]?.paidAt ?? null,
    paidUntil,
    overrideActive,
    unpaidNotice: overrideActive && !paymentActive,
  };
}
