import { requireActiveUser } from "@/lib/auth";
import { publishDueContent } from "@/lib/scheduled-publish";
import { db } from "@/lib/db";
import Link from "next/link";
import { NotificationsWidget } from "@/components/NotificationsWidget";
import { StatGrid } from "@/components/StatGrid";
import { SubjectGlyph } from "@/components/SubjectArt";
import { isNewLesson } from "@/lib/lesson-badge";
import { computeStreak } from "@/lib/streak";
import { LeaderboardCard, type LeaderboardEntry } from "@/components/LeaderboardCard";
import { BadgeCelebration } from "@/components/BadgeCelebration";
import { ReviewPromptCard } from "@/components/ReviewPromptCard";
import { getStudentSubscriptionStatus } from "@/lib/subscription";
import { getContactWhatsappLink } from "@/lib/settings";
import { SubscriptionBanner } from "@/components/SubscriptionBanner";
import { CodyRobot } from "@/components/brand/CodyRobot";
import { getResumeLesson, getCompletedCount, getStudentProgressMap } from "@/lib/lesson-progress";
import { buildJourney, buildMissions, badgeHint } from "@/lib/student-journey";
import { JourneyMap } from "@/components/JourneyMap";
import { MissionCard } from "@/components/MissionCard";
import { BadgeShelf } from "@/components/BadgeShelf";
import { ProgressRing } from "@/components/ProgressRing";
import { splitLessonNumber } from "@/lib/lesson-title";

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
/// تحية حسب الساعة في القاهرة
function greeting(now: Date) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Cairo", hour: "2-digit", hourCycle: "h23" }).format(now)
  );
  if (hour >= 5 && hour < 12) return "صباح الخير";
  if (hour >= 12 && hour < 17) return "نهارك سعيد";
  return "مساء الخير";
}

/// جملة السلسلة: بتشجّع الطالب حسب طولها
function streakLine(streak: number) {
  if (streak === 0) return "ابدأ سلسلتك النهارده";
  if (streak === 1) return "يوم واحد — كمّل بكرة";
  if (streak === 2) return "يومين ورا بعض";
  if (streak < 7) return `${streak} أيام ورا بعض 💪`;
  return `${streak} ${streak <= 10 ? "أيام" : "يوم"} ورا بعض — أسطورة 🏆`;
}

export default async function StudentDashboardPage() {
  const user = await requireActiveUser("student");
  const profile = user
    ? await db.studentProfile.findUnique({
        where: { userId: user.id },
        include: { group: true },
      })
    : null;

  // نشر أي درس/اختبار مجدول جه ميعاده (سريع، ومحمي من التكرار)
  await publishDueContent();
  const lessonsCount = await db.lesson.count({ where: { status: "published" } });
  const subscription = profile ? await getStudentSubscriptionStatus(profile.id) : null;
  const needsPaymentReminder = subscription ? !subscription.active || subscription.unpaidNotice : false;
  const whatsappLink = needsPaymentReminder ? await getContactWhatsappLink() : null;
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

  // أسئلة المراجعة: كام سؤال منشور، وكام منهم لسه الطالب ما جاوبش عليه. مغلّفة
  // بـ try/catch عشان لو جداول الميزة لسه ما اتعملتش في قاعدة البيانات (قبل
  // npm run db:push) الداشبورد يفضل شغّال عادي بدل ما يقع.
  let reviewTotal = 0;
  let reviewPending = 0;
  if (profile) {
    try {
      const [total, answered] = await Promise.all([
        db.reviewQuestion.count({ where: { status: "published" } }),
        db.reviewAnswer.count({
          where: { studentId: profile.id, question: { status: "published" } },
        }),
      ]);
      reviewTotal = total;
      reviewPending = Math.max(total - answered, 0);
    } catch {
      // تجاهل بهدوء - البطاقة ببساطة مش هتظهر
    }
  }

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
  const earnedBadgeRecords = profile
    ? await db.studentBadge.findMany({
        where: { studentId: profile.id },
        select: { badgeId: true, awardedAt: true },
      })
    : [];
  const earnedBadgeIds = new Set(earnedBadgeRecords.map((b) => b.badgeId));

  // الاحتفال (صوت + حركة) يقتصر على شارات اتحصلت عليها الأيام الأخيرة -
  // عشان طالب قديم عنده شارات كتير من زمان متتقفلش عليه كل الاحتفالات
  // مرة واحدة أول ما الميزة دي تتفعّل على حسابه.
  const RECENT_DAYS = 3;
  const recentCutoff = new Date(Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000);
  const recentlyEarnedIds = new Set(
    earnedBadgeRecords.filter((b) => b.awardedAt >= recentCutoff).map((b) => b.badgeId)
  );
  const earnedBadgesForCelebration = allBadges
    .filter((b) => recentlyEarnedIds.has(b.id))
    .map((b) => ({ id: b.id, name: b.name, description: b.description, icon: b.icon }));

  const firstName = profile?.fullName?.split(" ")[0] ?? "طالبنا";

  // "كمّل من حيث وقفت": آخر درس فتحه وما خلّصهوش + إجمالي اللي خلّصه
  const subscriptionOk = !subscription || subscription.active;
  const resume = profile && subscriptionOk ? await getResumeLesson(profile.id) : null;
  const completedCount = profile ? await getCompletedCount(profile.id) : 0;
  const overallPercent = lessonsCount > 0 ? Math.round((completedCount / lessonsCount) * 100) : 0;

  // ===== "رحلتي": خريطة الوحدات + مهمة النهارده + أهداف الشارات =====
  const journeySubjects = await db.subject.findMany({
    orderBy: { order: "asc" },
    select: {
      name: true,
      units: {
        where: { status: "published" },
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          lessons: { where: { status: "published" }, orderBy: { order: "asc" }, select: { id: true, title: true } },
        },
      },
    },
  });
  const progressMap = profile ? await getStudentProgressMap(profile.id) : new Map();
  const journey = buildJourney(journeySubjects, progressMap, resume?.lesson.id ?? null);
  const currentJourneyLesson = journey.units
    .flatMap((u) => u.lessons.map((l) => ({ ...l, unitTitle: u.title })))
    .find((l) => l.state === "current");

  const missions = profile
    ? await buildMissions({
        studentId: profile.id,
        groupId: profile.groupId,
        currentLesson:
          subscriptionOk && currentJourneyLesson
            ? {
                id: currentJourneyLesson.id,
                title: currentJourneyLesson.title,
                unitTitle: currentJourneyLesson.unitTitle,
                opened: progressMap.get(currentJourneyLesson.id) === "opened",
              }
            : null,
        reviewPending,
      })
    : [];

  const shelfBadges = allBadges.map((b) => ({
    id: b.id,
    name: b.name,
    icon: b.icon,
    description: b.description,
    earned: earnedBadgeIds.has(b.id),
    hint: badgeHint(b.criteriaKey, {
      submittedQuizzes: submittedAttempts.length,
      attendancePct: attendancePercentage,
      attendanceSessions: attendanceRecords.length,
    }),
  }));
  // المكسوبة الأول، وبعدها الأقرب للفتح
  shelfBadges.sort((a, b) => Number(b.earned) - Number(a.earned));

  const flameSize = streak >= 7 ? "text-3xl" : streak >= 3 ? "text-2xl" : "text-xl";

  return (
    <div className="space-y-6">
      {profile && <BadgeCelebration studentId={profile.id} earnedBadges={earnedBadgesForCelebration} />}
      {subscription && !subscription.active && (
        <SubscriptionBanner paidUntil={subscription.paidUntil} whatsappLink={whatsappLink} />
      )}

      {/* ===== التحية + السلسلة + التقدّم الكلي ===== */}
      <section
        className="relative overflow-hidden rounded-3xl px-5 sm:px-8 py-6 sm:py-7 shadow-glow animate-fade-in-up"
        style={{ background: "var(--gradient-brand)" }}
      >
        <div className="absolute -top-10 -end-10 w-52 h-52 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
        <div className="absolute inset-0 bg-circuit-dots opacity-25 [mask-image:linear-gradient(to_left,#000,transparent_60%)]" aria-hidden="true" />
        <div className="relative flex items-center gap-5 sm:gap-7">
          <div className="hidden sm:block shrink-0 -my-6">
            <CodyRobot className="w-28 h-32 lg:w-32 lg:h-36" onDark idPrefix="cody-dash" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white/80">{greeting(new Date())}</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mt-0.5">
              {firstName}، جاهز تكمّل رحلتك؟
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span
                className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-3 py-1.5 font-semibold text-white"
                title="عدد الأيام المتتالية اللي ليك فيها نشاط (حضور أو اختبار)"
              >
                <span className={`flame ${flameSize} leading-none ${streak === 0 ? "grayscale opacity-60" : ""}`} aria-hidden="true">
                  🔥
                </span>
                {streakLine(streak)}
              </span>
              <span className="inline-flex items-center rounded-full bg-white/15 backdrop-blur px-3 py-1.5 text-white/90">
                {profile?.group ? `مجموعة ${profile.group.name}` : "لسه مش في مجموعة"}
              </span>
            </div>
          </div>
          {lessonsCount > 0 && (
            <div className="shrink-0 text-center">
              <ProgressRing percent={overallPercent} size={92} onDark label="من المنهج" />
              <p className="mt-1.5 text-[11px] text-white/80 hidden sm:block">
                خلّصت {completedCount} من {lessonsCount}
              </p>
            </div>
          )}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] items-start">
        {/* ===== العمود الأساسي: المهمة + الخريطة + الشارات ===== */}
        <div className="space-y-6 min-w-0">
          {missions.length > 0 && <MissionCard missions={missions} />}
          <JourneyMap units={journey.units} initialUnitId={journey.currentUnitId} />
          <BadgeShelf badges={shelfBadges} />
        </div>

        {/* ===== العمود الجانبي: الأرقام + الإشعارات + المراجعة + الصدارة + الجديد ===== */}
        <aside className="space-y-6 min-w-0">
          <StatGrid
            compact
            stats={[
              {
                label: "نسبة الحضور",
                value: attendancePercentage !== null ? attendancePercentage : "—",
                suffix: "%",
                accent: "accent",
                icon: <AttendanceIcon />,
              },
              {
                label: "متوسط درجاتك",
                value: averagePercentage !== null ? averagePercentage : "—",
                suffix: "%",
                icon: <GradeIcon />,
              },
              {
                label: "اختبارات منشورة",
                value: publishedQuizzesCount,
                accent: "accent",
                icon: <QuizIcon />,
              },
              { label: "دروس خلّصتها", value: completedCount, icon: <LessonIcon /> },
            ]}
          />

          <NotificationsWidget />

          {reviewTotal > 0 && <ReviewPromptCard total={reviewTotal} pending={reviewPending} />}

          <LeaderboardCard entries={leaderboard} groupName={profile?.group?.name ?? null} />

          {/* جديد على المنصة */}
          <section className="rounded-2xl border border-border bg-surface p-5 shadow-elevated">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-ink">جديد على المنصة</h2>
              <Link href="/lessons" className="text-xs font-semibold text-primary hover:underline">
                كل الدروس
              </Link>
            </div>
            {recentLessons.length === 0 ? (
              <p className="text-sm text-ink-soft">لسه مفيش دروس منشورة.</p>
            ) : (
              <ul className="space-y-2">
                {recentLessons.map((l) => {
                  const fresh = isNewLesson(l.createdAt);
                  return (
                    <li key={l.id}>
                      <Link
                        href={`/lessons/${l.id}`}
                        className="group flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 hover:border-primary/40 transition-colors"
                      >
                        <span className="grid place-items-center w-9 h-9 shrink-0 rounded-lg bg-primary-soft text-primary">
                          <SubjectGlyph subject={l.unit.subject} className="w-5 h-5" />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="flex items-center gap-1.5">
                            <span className="font-semibold text-sm text-ink truncate group-hover:text-primary">
                              {splitLessonNumber(l.title).text}
                            </span>
                            {fresh && (
                              <span className="shrink-0 rounded-full bg-gradient-brand px-1.5 py-0.5 text-[10px] font-bold text-white">
                                جديد
                              </span>
                            )}
                          </span>
                          <span className="block text-xs text-ink-soft truncate">{l.unit.title}</span>
                        </span>
                        {progressMap.get(l.id) === "done" && (
                          <span className="shrink-0 text-accent text-xs font-bold" title="خلّصته">
                            ✓
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
