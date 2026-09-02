/// شاشة تحميل (Skeleton) للوحة تحكم الأدمن - Next.js بيعرضها تلقائيًا وقت
/// ما صفحة `dashboard/page.tsx` (Server Component) بتنتظر رد قاعدة
/// البيانات، بدل ما الشاشة تفضل بيضا أو "جارٍ التحميل..." نص عادي.
/// الشكل هنا بيحاكي هيكل الصفحة الحقيقية (عنوان + شبكة بطاقات + إحصائيات)
/// عشان الانتقال يبقى سلس بصريًا بمجرد وصول البيانات.
export default function AdminDashboardLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="skeleton h-6 w-48 rounded-lg" />
        <div className="skeleton h-4 w-64 rounded-lg" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 11 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-surface px-4 py-6 flex flex-col items-center gap-3">
            <div className="skeleton w-12 h-12 rounded-xl" />
            <div className="skeleton h-3.5 w-20 rounded" />
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <div className="skeleton h-4 w-32 rounded" />
        {Array.from({ length: 3 }).map((_, row) => (
          <div key={row} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-surface p-5 space-y-3">
                <div className="skeleton h-3.5 w-24 rounded" />
                <div className="skeleton h-6 w-14 rounded" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
