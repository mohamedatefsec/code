/// إشعار صغير غير مانع: الطالب ده اتفتحله الدروس يدويًا من الإدارة بس
/// أصلًا لسه ما سدّدش اشتراك ساري - المحتوى نفسه ظاهر عادي تحت الإشعار
/// ده، فالفرق عن PaywallLock إن ده مايقفلش حاجة، مجرد تذكير خفيف.
export function UnpaidNotice() {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-warn/30 bg-warn-soft/40 px-3.5 py-2.5 text-xs text-ink mb-4">
      <span className="text-base shrink-0">ℹ️</span>
      <span>تم فتح هذا المحتوى لك من الإدارة - برجاء تسديد الاشتراك في أقرب وقت.</span>
    </div>
  );
}
