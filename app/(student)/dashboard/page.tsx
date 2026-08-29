import { requireActiveUser } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { NotificationsWidget } from "@/components/NotificationsWidget";
import { StatGrid } from "@/components/StatGrid";
import { SubjectGlyph, subjectTheme } from "@/components/SubjectArt";
import { isNewLesson } from "@/lib/lesson-badge";

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
    select: {
      id: true,
      title: true,
      createdAt: true,
      unit: { select: { title: true, subject: { select: { slug: true, name: true } } } },
    },
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
    <div className="space-y-8">
      <div className="animate-fade-in-up">
        <h1 className="text-xl font-bold text-ink">
          مرحبًا بك يا {profile?.fullName?.split(" ")[0] ?? "طالبنا"} 👋
        </h1>
        <p className="text-sm text-ink-soft mt-1">
          {profile?.group ? `مجموعة: ${profile.group.name}` : "لم تُضف لأي مجموعة بعد."}
        </p>
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

      <div className="rounded-xl border border-border bg-surface p-6 shadow-elevated animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
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
            {recentLessons.map((l) => {
              const theme = subjectTheme(l.unit.subject);
              const fresh = isNewLesson(l.createdAt);
              return (
                <Link
                  key={l.id}
                  href={`/lessons/${l.id}`}
                  className="flex items-center gap-3 rounded-lg border border-border px-4 py-2.5 hover:border-primary hover:bg-primary-soft/40 transition-colors text-sm"
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
                    style={{ background: theme.gradient }}
                  >
                    <SubjectGlyph subject={l.unit.subject} className="w-5 h-5" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-1.5">
                      <span className="font-medium text-ink truncate">{l.title}</span>
                      {fresh && (
                        <span className="shrink-0 rounded-full bg-primary-soft px-1.5 py-0.5 text-[10px] font-bold text-primary">
                          جديد
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="text-ink-soft shrink-0">{l.unit.title}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <NotificationsWidget />

      <div className="rounded-xl border border-border bg-surface p-6 shadow-elevated animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
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

      <div className="rounded-xl border border-border bg-surface p-6 text-sm text-ink-soft leading-6 shadow-elevated">
        {attendancePercentage !== null
          ? `سُجّل حضورك في ${attendanceRecords.length} حصة حتى الآن.`
          : "لم يُسجَّل حضورك في أي حصة بعد."}
      </div>
    </div>
  );
}
