/// حساب "سلسلة الأيام المتتالية" (Streak) من قائمة تواريخ نشاط (حضور حصة
/// أو تسليم اختبار). المنطق: نحوّل كل تاريخ لليوم التقويمي بتاعه (من غير
/// وقت)، نشيل التكرار، ونعدّ كام يوم متتالي وصولًا لآخر يوم نشاط، بشرط إن
/// آخر يوم نشاط يكون النهاردة أو أمس (عشان السلسلة متتكسرش لمجرد إن الطالب
/// لسه مادخلش النهاردة).
export function computeStreak(dates: Date[], now: Date = new Date()): number {
  if (dates.length === 0) return 0;

  const toDayKey = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x.getTime();
  };

  const uniqueDays = Array.from(new Set(dates.map(toDayKey))).sort((a, b) => b - a);

  const today = toDayKey(now);
  const oneDay = 24 * 60 * 60 * 1000;

  // لو آخر يوم نشاط أقدم من "أمس"، السلسلة اتكسرت خالص.
  if (uniqueDays[0] < today - oneDay) return 0;

  let streak = 1;
  let cursor = uniqueDays[0];
  for (let i = 1; i < uniqueDays.length; i++) {
    if (cursor - uniqueDays[i] === oneDay) {
      streak++;
      cursor = uniqueDays[i];
    } else if (cursor - uniqueDays[i] > oneDay) {
      break;
    }
  }
  return streak;
}
