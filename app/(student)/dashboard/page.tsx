import { requireActiveUser } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { NotificationsWidget } from "@/components/NotificationsWidget";
import { StatGrid } from "@/components/StatGrid";
import { SubjectGlyph } from "@/components/SubjectArt";
import { isNewLesson } from "@/lib/lesson-badge";
import { CodeTypewriterLine } from "@/components/CodeTypewriter";
import { computeStreak } from "@/lib/streak";
import { StreakCard } from "@/components/StreakCard";
import { LeaderboardCard, type LeaderboardEntry } from "@/components/LeaderboardCard";

/// أيقونات صغيرة لبطاقات الإحصائيات - كل واحدة تعبّر بصريًا عن معناها
/// (حضور / درجات / اختبارات / دروس) بنفس أسلوب الخطوط المستخدم في بقية الموقع.
function AttendanceIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} className="w-4.5 h-4.5">
      <path d="M4 9h16M7 3v3M17 3v3" stroke="currentColor" strokeLinecap="round" />
      <rect x="4" y="5.5" width="16" height="15" rx="2.5" stroke="currentColor" />
      <path d="m8.5 14 2.3 2.3L16 11.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function GradeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} className="w-4.5 h-4.5">
      <path d="M12 3 14.2 8 20 8.8l-4.2 3.9 1.1 5.7L12 15.6 6.9 18.4 8 12.7 3.8 8.8 9.6 8 12 3Z" stroke="currentColor" strokeLinejoin="round" />
    </svg>
  );
}
function QuizIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} className="w-4.5 h-4.5">
      <path
        d="M9 3.5h6a1 1 0 0 1 1 1v.5h1a1 1 0 0 1 1 1V19a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a1 1 0 0 1 1-1h1v-.5a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="m9 12.5 2 2 4-4.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function LessonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} className="w-4.5 h-4.5">
      <path
        d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19a1 1 0 0 1 1 1v15.5a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 1 4 18V5.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 7h8M8 10.2h8" stroke="currentColor" strokeLinecap="round" />
    </svg>
  );
}
function BookmarkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} className="w-4.5 h-4.5">
      <path d="M6 4h12v17l-6-3.8L6 21V4Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/// زخرفة صغيرة لبطاقة "أحدث الدروس" - نفس مفردات الشعار البصري للمنصة
/// (شبكة الذكاء الاصطناعي + أقواس الكود) بس بحجم أصغر ومكانها في ركن
/// البطاقة، مش بانر كامل مستقل زي بانر الترحيب.
function LessonsCardMotif() {
  return (
    <svg viewBox="0 0 140 100" className="absolute -top-2 end-0 w-28 h-20 sm:w-36 sm:h-24 opacity-90" aria-hidden="true">
      <g className="animate-float-card">
        <circle cx="100" cy="28" r="14" fill="rgba(255,255,255,0.14)" />
        <circle cx="96" cy="23" r="2.2" fill="#fff" fillOpacity="0.65" />
        <circle cx="107" cy="21" r="2.2" fill="#fff" fillOpacity="0.65" />
        <circle cx="103" cy="34" r="2.2" fill="#fff" fillOpacity="0.65" />
        <path d="M96 23 103 34M107 21 103 34M96 23 107 21" stroke="#fff" strokeOpacity="0.4" strokeWidth="1" />
      </g>
      <g className="animate-float-slow" style={{ animationDelay: "0.8s" }}>
        <rect x="18" y="8" width="30" height="30" rx="9" fill="rgba(255,255,255,0.1)" />
        <text x="24" y="28" fontFamily="var(--font-mono)" fontSize="12" fill="#fff" fillOpacity="0.45">{"</>"}</text>
      </g>
    </svg>
  );
}

/// رسم زخرفي للبانر الترحيبي - يمزج بين رمزَي المنصة (أقواس الكود `</>`
/// وشبكة الذكاء الاصطناعي) في تركيبة واحدة عائمة، بدل رسمة عامة لا علاقة
/// لها بمحتوى المنصة الفعلي (برمجة + ذكاء اصطناعي).
function HeroIllustration() {
  return (
    <svg viewBox="0 0 220 180" className="w-44 h-36 sm:w-56 sm:h-44" aria-hidden="true">
      <g className="animate-float-slow">
        <rect x="30" y="40" width="120" height="80" rx="14" fill="rgba(255,255,255,0.14)" />
        <rect x="30" y="40" width="120" height="20" rx="10" fill="rgba(255,255,255,0.22)" />
        <circle cx="40" cy="50" r="2.5" fill="#fff" fillOpacity="0.6" />
        <circle cx="48" cy="50" r="2.5" fill="#fff" fillOpacity="0.6" />
        <circle cx="56" cy="50" r="2.5" fill="#fff" fillOpacity="0.6" />
        <text x="42" y="80" fontFamily="var(--font-mono)" fontSize="13" fill="#fff" fillOpacity="0.55">{"</>"}</text>
        <CodeTypewriterLine x={42} y={100} />
      </g>
      <g className="animate-float-card">
        <circle cx="175" cy="35" r="16" fill="rgba(255,255,255,0.18)" />
        <circle cx="170" cy="30" r="2.6" fill="#fff" fillOpacity="0.8" />
        <circle cx="182" cy="28" r="2.6" fill="#fff" fillOpacity="0.8" />
        <circle cx="178" cy="42" r="2.6" fill="#fff" fillOpacity="0.8" />
        <path d="M170 30 178 42M182 28 178 42M170 30 182 28" stroke="#fff" strokeOpacity="0.5" strokeWidth="1.2" />
      </g>
      <g className="animate-float-slow" style={{ animationDelay: "1.2s" }}>
        <circle cx="35" cy="145" r="13" fill="rgba(255,255,255,0.16)" />
        <path d="M29 145h12M35 139v12" stroke="#fff" strokeOpacity="0.7" strokeWidth="1.6" strokeLinecap="round" />
      </g>
      <g className="animate-float-card" style={{ animationDelay: "0.6s" }}>
        <rect x="150" y="110" width="46" height="46" rx="12" fill="rgba(255,255,255,0.14)" />
        <path d="M164 133h18M173 124v18" stroke="#fff" strokeOpacity="0.6" strokeWidth="1.6" strokeLinecap="round" />
      </g>
    </svg>
  );
}

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
        select: { percentage: true, submittedAt: true },
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
        select: { status: true, session: { select: { sessionDate: true } } },
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

  // سلسلة النشاط المتتالية: أي يوم فيه حضور فعلي أو تسليم اختبار يُحتسب
  // "يوم نشاط" - بنجمع التواريخ من المصدرين ونحسب أطول سلسلة متصلة بآخر
  // يوم نشاط (النهاردة أو أمس) عشان السلسلة متتصفرش لمجرد إن الطالب لسه
  // مادخلش النهاردة.
  const activityDates = [
    ...attendanceRecords.filter((r) => r.status !== "absent").map((r) => r.session.sessionDate),
    ...submittedAttempts.map((a) => a.submittedAt).filter((d): d is Date => d !== null),
  ];
  const streak = computeStreak(activityDates);

  // لوحة الصدارة: أعلى 5 طلاب في نفس مجموعة الطالب بعدد الشارات، مع تمييز
  // ترتيب الطالب الحالي حتى لو مش ضمن الخمسة الأوائل.
  let leaderboard: LeaderboardEntry[] = [];
  if (profile?.groupId) {
    const groupmates = await db.studentProfile.findMany({
      where: { groupId: profile.groupId },
      select: { id: true, fullName: true, _count: { select: { studentBadges: true } } },
      orderBy: { studentBadges: { _count: "desc" } },
    });
    leaderboard = groupmates.slice(0, 5).map((s) => ({
      id: s.id,
      name: s.fullName,
      badgeCount: s._count.studentBadges,
      isMe: s.id === profile.id,
    }));
    const meIncluded = leaderboard.some((e) => e.isMe);
    if (!meIncluded) {
      const meIndex = groupmates.findIndex((s) => s.id === profile.id);
      if (meIndex !== -1) {
        const me = groupmates[meIndex];
        leaderboard.push({ id: me.id, name: me.fullName, badgeCount: me._count.studentBadges, isMe: true });
      }
    }
  }

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

  const firstName = profile?.fullName?.split(" ")[0] ?? "طالبنا";

  return (
    <div className="space-y-6">
      {/* البانر الترحيبي */}
      <div
        className="relative overflow-hidden rounded-2xl px-6 sm:px-8 py-7 sm:py-9 shadow-glow animate-fade-in-up"
        style={{ background: "var(--gradient-brand)" }}
      >
        <div className="absolute -top-10 -end-10 w-52 h-52 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
        <div className="absolute -bottom-16 -start-10 w-56 h-56 rounded-full bg-black/10 blur-2xl" aria-hidden="true" />
        <div className="relative flex items-center justify-between gap-6">
          <div className="max-w-md">
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              مرحبًا بك يا {firstName} 👋
            </h1>
            <p className="text-sm text-white/80 mt-1.5">
              {profile?.group ? `مجموعة: ${profile.group.name}` : "لم تُضف لأي مجموعة بعد."} — جاهز لمواصلة رحلتك التعليمية؟
            </p>
            <Link
              href="/lessons"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-white text-primary px-5 py-2.5 text-sm font-semibold shadow-sm hover:scale-[1.03] active:scale-[0.98] transition-transform"
            >
              متابعة التعلم
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                <path d="M15 6 9 12l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
          <div className="hidden sm:block shrink-0">
            <HeroIllustration />
          </div>
        </div>
      </div>

      <StatGrid
        stats={[
          {
            label: "نسبة الحضور",
            value: attendancePercentage !== null ? attendancePercentage : "—",
            suffix: "%",
            accent: "accent",
            icon: <AttendanceIcon />,
          },
          {
            label: "متوسط الدرجات",
            value: averagePercentage !== null ? averagePercentage : "—",
            suffix: "%",
            icon: <GradeIcon />,
          },
          {
            label: "الاختبارات",
            value: publishedQuizzesCount,
            accent: "accent",
            icon: <QuizIcon />,
          },
          { label: "الدروس", value: lessonsCount, icon: <LessonIcon /> },
        ]}
      />

      <div className="grid sm:grid-cols-2 gap-4">
        <StreakCard streak={streak} />
        <LeaderboardCard entries={leaderboard} groupName={profile?.group?.name ?? null} />
      </div>

      <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
        <div
          className="relative overflow-hidden md:col-span-2 rounded-xl bg-gradient-brand p-4 sm:p-6 shadow-glow animate-fade-in-up"
          style={{ animationDelay: "0.15s" }}
        >
          <LessonsCardMotif />
          <div className="relative flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="flex items-center gap-2 font-semibold text-white">
              <span className="grid place-items-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/15 backdrop-blur-sm">
                <BookmarkIcon />
              </span>
              أحدث الدروس
            </h2>
            <Link
              href="/lessons"
              className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-primary hover:opacity-90 transition"
            >
              عرض الكل
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} className="w-3 h-3">
                <path d="m15 6-6 6 6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
          {recentLessons.length === 0 ? (
            <p className="relative text-sm text-white/80">لا توجد دروس منشورة بعد. راجع لاحقًا.</p>
          ) : (
            <div className="relative space-y-2">
              {recentLessons.map((l, i) => {
                const fresh = isNewLesson(l.createdAt);
                return (
                  <Link
                    key={l.id}
                    href={`/lessons/${l.id}`}
                    className="group flex items-center gap-3 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm px-3 sm:px-4 py-2 sm:py-2.5 transition-colors text-sm animate-fade-in-up"
                    style={{ animationDelay: `${0.2 + i * 0.05}s` }}
                  >
                    <span className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white transition-transform group-hover:scale-105">
                      <SubjectGlyph subject={l.unit.subject} className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span className="font-medium text-white truncate">{l.title}</span>
                        {fresh && (
                          <span className="shrink-0 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-primary">
                            جديد
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="text-white/70 shrink-0 hidden sm:inline">{l.unit.title}</span>
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} className="w-3.5 h-3.5 text-white/60 shrink-0 transition-transform group-hover:-translate-x-0.5">
                      <path d="m15 6-6 6 6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="md:col-span-1">
          <NotificationsWidget />
        </div>
      </div>

      <div
        className="rounded-xl border border-border bg-surface p-6 shadow-elevated animate-fade-in-up"
        style={{ animationDelay: "0.25s" }}
      >
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

      {/* بانر تحفيزي سفلي */}
      <div
        className="relative overflow-hidden rounded-xl border border-border bg-surface p-6 sm:p-7 shadow-elevated flex items-center justify-between gap-6 flex-wrap"
      >
        <div
          className="absolute -top-8 -start-8 w-40 h-40 rounded-full opacity-[0.08] blur-2xl"
          style={{ background: "var(--gradient-brand)" }}
          aria-hidden="true"
        />
        <div className="relative">
          <h3 className="font-semibold text-ink">استمر في التعلم كل يوم</h3>
          <p className="text-sm text-ink-soft mt-1">
            {streak > 0
              ? `سلسلتك الحالية ${streak} ${streak === 1 ? "يوم" : "أيام"} متتالية — كل خطوة صغيرة تقرّبك من هدفك الأكبر.`
              : "ابدأ سلسلتك النهاردة — كل خطوة صغيرة تقرّبك من هدفك الأكبر."}
          </p>
        </div>
        <Link
          href="/lessons"
          className="relative shrink-0 inline-flex items-center gap-2 rounded-full bg-gradient-brand text-white px-5 py-2.5 text-sm font-semibold shadow-glow hover:scale-[1.03] active:scale-[0.98] transition-transform"
        >
          اكتشف المزيد
        </Link>
      </div>
    </div>
  );
}
