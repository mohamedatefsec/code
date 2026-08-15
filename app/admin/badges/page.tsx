import { db } from "@/lib/db";

export default async function AdminBadgesPage() {
  const badges = await db.badge.findMany({
    include: { _count: { select: { studentBadges: true } } },
  });

  const recentAwards = await db.studentBadge.findMany({
    orderBy: { awardedAt: "desc" },
    take: 10,
    include: { student: { select: { fullName: true } }, badge: true },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-ink">الشارات</h1>
        <p className="text-sm text-ink-soft mt-1">
          شارات تحفيزية تُمنح تلقائيًا للطلاب حسب إنجازاتهم — لا تحتاج إعدادًا يدويًا.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {badges.map((b) => (
          <div key={b.id} className="rounded-xl border border-border bg-surface p-4 text-center space-y-1.5 shadow-elevated card-hover">
            <p className="text-3xl">{b.icon}</p>
            <p className="text-sm font-medium text-ink">{b.name}</p>
            <p className="text-xs text-ink-soft">{b.description}</p>
            <p className="stat-figure text-lg font-semibold text-primary pt-1">
              {b._count.studentBadges}
            </p>
            <p className="text-xs text-ink-soft">طالب حصل عليها</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-surface p-6 shadow-elevated">
        <h2 className="font-semibold text-ink mb-4">آخر الشارات الممنوحة</h2>
        {recentAwards.length === 0 ? (
          <p className="text-sm text-ink-soft">لم يحصل أي طالب على شارة بعد.</p>
        ) : (
          <div className="space-y-2">
            {recentAwards.map((a) => (
              <div key={a.id} className="flex items-center gap-3 text-sm">
                <span className="text-xl">{a.badge.icon}</span>
                <span className="font-medium text-ink">{a.student.fullName}</span>
                <span className="text-ink-soft">حصل على</span>
                <span className="text-ink-soft">{a.badge.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
