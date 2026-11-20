import { db } from "@/lib/db";
import { publishDueContent } from "@/lib/scheduled-publish";
import { SubjectHero } from "@/components/SubjectHero";
import { LessonCard } from "@/components/LessonCard";
import { requireActiveUser } from "@/lib/auth";
import { getStudentSubscriptionStatus } from "@/lib/subscription";
import { getContactWhatsappLink } from "@/lib/settings";
import { PaywallLock } from "@/components/PaywallLock";
import { UnpaidNotice } from "@/components/UnpaidNotice";
import { getStudentProgressMap } from "@/lib/lesson-progress";

export default async function StudentLessonsPage() {
  const user = await requireActiveUser("student");
  const profile = user ? await db.studentProfile.findUnique({ where: { userId: user.id } }) : null;

  let showUnpaidNotice = false;
  if (profile) {
    const subscription = await getStudentSubscriptionStatus(profile.id);
    if (!subscription.active) {
      const whatsappLink = await getContactWhatsappLink();
      return (
        <div className="space-y-10">
          <div>
            <h1 className="text-xl font-bold text-ink">الدروس</h1>
            <p className="text-sm text-ink-soft mt-1">تصفّح المواد والوحدات والدروس المتاحة لك.</p>
          </div>
          <PaywallLock paidUntil={subscription.paidUntil} whatsappLink={whatsappLink} />
        </div>
      );
    }
    showUnpaidNotice = subscription.unpaidNotice;
  }

  // نشر أي درس/اختبار مجدول جه ميعاده (سريع، ومحمي من التكرار)
  await publishDueContent();

  const subjects = await db.subject.findMany({
    orderBy: { order: "asc" },
    include: {
      units: {
        where: { status: "published" },
        orderBy: { order: "asc" },
        include: {
          lessons: {
            where: { status: "published" },
            orderBy: { order: "asc" },
            select: { id: true, title: true, description: true, order: true, createdAt: true },
          },
        },
      },
    },
  });

  const progress = profile ? await getStudentProgressMap(profile.id) : new Map<string, "done" | "opened">();

  const hasAnyContent = subjects.some((s) => s.units.some((u) => u.lessons.length > 0));

  return (
    <div className="space-y-10">
      {showUnpaidNotice && <UnpaidNotice />}
      <div>
        <h1 className="text-xl font-bold text-ink">الدروس</h1>
        <p className="text-sm text-ink-soft mt-1">تصفّح المواد والوحدات والدروس المتاحة لك.</p>
      </div>

      {!hasAnyContent && (
        <div className="rounded-xl border border-border bg-surface p-6 text-sm text-ink-soft shadow-elevated">
          لا توجد دروس منشورة بعد. راجع لاحقًا.
        </div>
      )}

      {subjects.map((subject) => {
        const lessonsInSubject = subject.units.reduce((sum, u) => sum + u.lessons.length, 0);
        if (lessonsInSubject === 0) return null;

        return (
          <div key={subject.id} className="space-y-5">
            <SubjectHero
              subject={subject}
              name={subject.name}
              lessonsCount={lessonsInSubject}
              unitsCount={subject.units.filter((u) => u.lessons.length > 0).length}
            />

            {subject.units.map((unit) => {
              if (unit.lessons.length === 0) return null;
              const doneInUnit = unit.lessons.filter((l) => progress.get(l.id) === "done").length;
              const unitPercent = Math.round((doneInUnit / unit.lessons.length) * 100);
              return (
                <div key={unit.id} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="h-6 w-1 shrink-0 rounded-full bg-gradient-brand" aria-hidden="true" />
                    <h3 className="text-base font-bold text-ink">{unit.title}</h3>
                    <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium tabular-nums text-primary">
                      {unit.lessons.length} {unit.lessons.length === 1 ? "درس" : "دروس"}
                    </span>
                    <span className="h-px flex-1 bg-border" aria-hidden="true" />
                  </div>
                  {/* تقدّم الطالب في الوحدة: الشريط بيتملي على قد الدروس اللي خلّصها */}
                  <div className="flex items-center gap-3">
                    <div
                      className="h-2 flex-1 max-w-xs rounded-full bg-surface-2 border border-border overflow-hidden"
                      role="progressbar"
                      aria-valuenow={unitPercent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`تقدّمك في ${unit.title}`}
                    >
                      <div
                        className="h-full rounded-full bg-gradient-brand transition-all"
                        style={{ width: `${unitPercent}%` }}
                      />
                    </div>
                    <span className="text-xs text-ink-soft tabular-nums">
                      {doneInUnit === unit.lessons.length
                        ? "🎉 خلّصت الوحدة كلها"
                        : doneInUnit === 0
                          ? "لسه ما خلّصتش دروس في الوحدة دي"
                          : `خلّصت ${doneInUnit} من ${unit.lessons.length} دروس`}
                    </span>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {unit.lessons.map((lesson, i) => (
                      <LessonCard
                        key={lesson.id}
                        id={lesson.id}
                        title={lesson.title}
                        description={lesson.description}
                        subject={subject}
                        index={i}
                        createdAt={lesson.createdAt}
                        progress={progress.get(lesson.id) ?? null}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
