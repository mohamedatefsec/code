/// شاشة قفل الدروس/المنهج للطالب اللي اشتراكه لسه ما اتسددش أو خلصت
/// مدته - بتحل محل المحتوى تمامًا (مش مجرد بانر فوقه) عشان محدش يقدر
/// يوصل لأي محتوى تعليمي من غير اشتراك ساري، مع رسالة واضحة وودّية
/// ورابط تواصل مباشر مع المدرّس لو متاح.
export function PaywallLock({
  paidUntil,
  whatsappLink,
}: {
  paidUntil: Date | null;
  whatsappLink?: string | null;
}) {
  const expired = paidUntil !== null;

  return (
    <div className="max-w-md mx-auto text-center rounded-2xl border border-warn/30 bg-warn-soft/40 p-8 shadow-elevated space-y-4">
      <div className="grid place-items-center w-16 h-16 rounded-2xl mx-auto bg-warn/15 text-warn">
        <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} className="w-8 h-8">
          <rect x="5" y="10.5" width="14" height="9.5" rx="2" stroke="currentColor" />
          <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" stroke="currentColor" strokeLinecap="round" />
          <circle cx="12" cy="14.7" r="1.3" fill="currentColor" stroke="none" />
        </svg>
      </div>

      <div>
        <h2 className="font-bold text-ink text-lg">
          {expired ? "اشتراكك الشهري انتهى" : "لازم تسدّد الاشتراك أولًا"}
        </h2>
        <p className="text-sm text-ink-soft mt-2 leading-relaxed">
          {expired
            ? "الدروس ومحتوى المنهج بيتقفلوا تلقائيًا بعد شهر من آخر دفعة. سدّد اشتراك الشهر ده وهتتفتح لك فورًا."
            : "الدروس ومحتوى المنهج بتتفتح بعد ما تسدّد اشتراك أول شهر. باقي المنصة (لوحتك وملفك الشخصي) متاحة عادي."}
        </p>
        {paidUntil && (
          <p className="text-xs text-ink-soft mt-2">
            آخر اشتراك ساري كان لحد {paidUntil.toLocaleDateString("ar-EG")}
          </p>
        )}
      </div>

      {whatsappLink && (
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 shadow-glow transition-all active:scale-[0.98]"
        >
          💬 تواصل لتسديد الاشتراك
        </a>
      )}
    </div>
  );
}
