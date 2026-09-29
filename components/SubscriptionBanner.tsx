/// بانر تذكير بسداد الاشتراك في داشبورد الطالب - غير مانع (المنصة نفسها
/// بتفضل مفتوحة عادي)، بس بيوضّح إن الدروس والمنهج مقفولين لحد ما يسدّد.
export function SubscriptionBanner({
  paidUntil,
  whatsappLink,
}: {
  paidUntil: Date | null;
  whatsappLink?: string | null;
}) {
  const expired = paidUntil !== null;

  return (
    <div className="flex items-center justify-between flex-wrap gap-3 rounded-xl border border-warn/30 bg-warn-soft/40 px-4 py-3">
      <div className="flex items-center gap-2.5 text-sm">
        <span className="text-lg">⚠️</span>
        <span className="text-ink">
          {expired
            ? "اشتراكك الشهري انتهى - الدروس ومحتوى المنهج مقفولين لحد ما تسدّد من جديد."
            : "لسه ما سدّدتش الاشتراك الشهري - الدروس ومحتوى المنهج مقفولين لحد التسديد."}
        </span>
      </div>
      {whatsappLink && (
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-lg bg-warn px-3.5 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition"
        >
          تواصل للتسديد
        </a>
      )}
    </div>
  );
}
