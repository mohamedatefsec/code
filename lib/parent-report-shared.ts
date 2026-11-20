/// أسماء فترات تقرير ولي الأمر - في ملف منفصل من غير قاعدة بيانات،
/// عشان صفحة التقرير (اللي بتشتغل في المتصفح) تقدر تستخدمها.
export type ReportPeriodKey = "month" | "last-month" | "30" | "all";

export const PERIOD_LABELS: Record<ReportPeriodKey, string> = {
  month: "الشهر الحالي",
  "last-month": "الشهر اللي فات",
  "30": "آخر 30 يوم",
  all: "من أول الاشتراك",
};
