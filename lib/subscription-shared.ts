/// دالة صافية (من غير أي اتصال بقاعدة البيانات) بتحسب تاريخ نهاية
/// الاشتراك من تاريخ آخر دفعة - شهر كامل بالتقويم بداية من تاريخ الدفع.
/// في ملف منفصل من غير أي استيراد لـ Prisma عشان تُستخدم بأمان من
/// مكوّنات "use client" (زي صفحة قائمة الطلاب) من غير ما تجرّ اتصال
/// قاعدة البيانات للمتصفح.
export function computePaidUntil(from: Date): Date {
  const paidUntil = new Date(from);
  paidUntil.setMonth(paidUntil.getMonth() + 1);
  return paidUntil;
}

export type PaymentCoverageInput = { paidAt: Date; forMonth: Date | null };

/// نهاية الفترة اللي الدفعة دي بتغطّيها: لو الأدمن حدّد "الدفعة دي عن شهر
/// إيه" (forMonth) بنحسب من أول الشهر ده + شهر، وإلا (دفعات قديمة قبل
/// إضافة الخاصية دي) بنرجع لتاريخ الدفعة الفعلي (paidAt) + شهر زي ما كان.
export function computeCoverageEnd(payment: PaymentCoverageInput): Date {
  return computePaidUntil(payment.forMonth ?? payment.paidAt);
}

/// من بين كل دفعات الطالب، بنلاقي أبعد تغطية (مش أحدث دفعة اتسجّلت) -
/// عشان لو الأدمن سجّل دفعة شهر لاحق (مثلاً دفع مقدّم لشهر نوفمبر) قبل
/// ما يسجّل شهر أقرب، الاشتراك يفضل صحيح على أساس أبعد شهر مدفوع فعليًا.
export function getLatestCoverageEnd(payments: PaymentCoverageInput[]): Date | null {
  if (payments.length === 0) return null;
  return payments.reduce<Date | null>((latest, p) => {
    const end = computeCoverageEnd(p);
    return !latest || end.getTime() > latest.getTime() ? end : latest;
  }, null);
}
