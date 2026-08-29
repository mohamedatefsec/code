/// يحدد هل الدرس "جديد" بالنسبة للطالب (نُشر خلال آخر عدد أيام محدد)
/// عشان نبرزه بشارة واضحة في الواجهة بدل ما يختفي بهدوء وسط باقي الدروس.
const NEW_LESSON_WINDOW_DAYS = 7;

export function isNewLesson(createdAt: Date | string, windowDays = NEW_LESSON_WINDOW_DAYS): boolean {
  const createdTime = new Date(createdAt).getTime();
  if (Number.isNaN(createdTime)) return false;
  const ageMs = Date.now() - createdTime;
  return ageMs >= 0 && ageMs < windowDays * 24 * 60 * 60 * 1000;
}
