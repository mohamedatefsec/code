import { requireActiveUser } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { NotificationsWidget } from "@/components/NotificationsWidget";
import { StatGrid } from "@/components/StatGrid";

export default async function StudentDashboardPage() {
  const user = await requireActiveUser("student");
  const profile = user
    ? await db.studentProfile.findUnique({
        where: { userId: user.id },
        include: { group: true },
      })
    : null;

  const lessonsCount = await db.lesson.count({ where: { status: "published" } });
  const recentLessons = await db.lesson.findMany({
    where: { status: "published" },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: { id: true, title: true, unit: { select: { title: true } } },
  });

  const submittedAttempts = profile
    ? await db.quizAttempt.findMany({
        where: { studentId: profile.id, status: "submitted" },
        select: { percentage: true },
      })
    : [];
  const averagePercentage =
    submittedAttempts.length > 0
      ? Math.round(
          (submittedAttempts.reduce((sum, a) => sum + (a.percentage ?? 0), 0) /
            submittedAttempts.length) *
            10
        ) / 10
      : null;
  const publishedQuizzesCount = await db.quiz.count({ where: { status: "published" } });

  const attendanceRecords = profile
    ? await db.attendanceRecord.findMany({
        where: { studentId: profile.id },
        select: { status: true },
      })
    : [];
  const attendancePercentage =
    attendanceRecords.length > 0
      ? Math.round(
          (attendanceRecords.filter((r) => r.status !== "absent").length /
            attendanceRecords.length) *
            1000
        ) / 10
      : null;

  const allBadges = await db.badge.findMany();
  const earnedBadgeIds = profile
    ? new Set(
        (
          await db.studentBadge.findMany({
            where: { studentId: profile.id },
            select: { badgeId: true },
          })
        ).map((b) => b.badgeId)
      )
    : new Set<string>();

  return (
    <div className="space-y-6">
      {/* بانر ترحيب متدرّج بدل الترويسة النصية العادية */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-brand p-6 sm:p-8 text-white shadow-glow animate-fade-in-up">
        <div className="absolute -top-10 -end-10 w-48 h-48 rounded-full bg-white/10 blur-2xl animate-float-slow" />
        <div className="absolute -bottom-16 -start-10 w-56 h-56 rounded-full bg-white/10 blur-2xl animate-float-slow" style={{ animationDelay: "1.5s" }} />
        <div className="relative">
          <h1 className="text-2xl sm:text-3xl font-bold">
            مرحبًا بك يا {profile?.fullName?.split(" ")[0] ?? "طالبنا"} 👋
          </h1>
          <p className="text-sm sm:text-base text-white/85 mt-2">
            {profile?.group ? `مجموعة: ${profile.group.name}` : "لم تُضف لأي مجموعة بعد."}
          </p>
        </div>
      </div>

      <StatGrid
        stats={[
          { label: "الدروس", value: lessonsCount },
          { label: "الاختبارات", value: publishedQuizzesCount, accent: "accent" },
          {
            label: "متوسط الدرجات",
            value: averagePercentage !== null ? averagePercentage : "—",
            suffix: "%",
          },
          {
            label: "نسبة الحضور",
            value: attendancePercentage !== null ? attendancePercentage : "—",
            suffix: "%",
            accent: "accent",
          },
        ]}
      />

      {/* تقسيم الشاشة: المحتوى الرئيسي في عمودين، والإشعارات ثابتة جنبًا في الشاشات الكبيرة */}
      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-elevated animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-ink">أحدث الدروس</h2>
              <Link href="/lessons" className="text-sm text-primary hover:underline">
                عرض الكل
              </Link>
            </div>
            {recentLessons.length === 0 ? (
              <p className="text-sm text-ink-soft">لا توجد دروس منشورة بعد. راجع لاحقًا.</p>
            ) : (
              <div className="space-y-2">
                {recentLessons.map((l) => (
                  <Link
                    key={l.id}
                    href={`/lessons/${l.id}`}
                    className="flex items-center justify-between rounded-lg border border-border px-4 py-2.5 hover:border-primary hover:bg-primary-soft/40 transition-colors text-sm"
                  >
                    <span className="font-medium text-ink">{l.title}</span>
                    <span className="text-ink-soft">{l.unit.title}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6 shadow-elevated animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
            <h2 className="font-semibold text-ink mb-4">الشارات</h2>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {allBadges.map((b, i) => {
                const earned = earnedBadgeIds.has(b.id);
                return (
                  <div
                    key={b.id}
                    title={b.description}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center animate-scale-in transition-transform hover:scale-105 ${
                      earned
                        ? "border-primary/30 bg-primary-soft shadow-glow"
                        : "border-border opacity-40 grayscale"
                    }`}
                    style={{ animationDelay: `${0.3 + i * 0.05}s` }}
                  >
                    <span className="text-2xl">{b.icon}</span>
                    <span className="text-xs text-ink-soft">{b.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-ink-soft leading-6 shadow-elevated">
            {attendancePercentage !== null
              ? `سُجّل حضورك في ${attendanceRecords.length} حصة حتى الآن.`
              : "لم يُسجَّل حضورك في أي حصة بعد."}
          </div>
        </div>

        <div className="lg:sticky lg:top-6">
          <NotificationsWidget />
        </div>
      </div>
    </div>
  );
}
