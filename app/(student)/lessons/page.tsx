import { db } from "@/lib/db";
import { SubjectHero } from "@/components/SubjectHero";
import { LessonCard } from "@/components/LessonCard";

export default async function StudentLessonsPage() {
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

  const hasAnyContent = subjects.some((s) => s.units.some((u) => u.lessons.length > 0));

  return (
    <div className="space-y-10">
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
            <SubjectHero subject={subject} name={subject.name} lessonsCount={lessonsInSubject} />

            {subject.units.map((unit) =>
              unit.lessons.length === 0 ? null : (
                <div key={unit.id} className="space-y-3">
                  <h3 className="text-sm font-semibold text-ink-soft flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-gradient-brand" />
                    {unit.title}
                  </h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {unit.lessons.map((lesson, i) => (
                      <LessonCard
                        key={lesson.id}
                        id={lesson.id}
                        title={lesson.title}
                        description={lesson.description}
                        subject={subject}
                        order={lesson.order}
                        index={i}
                        createdAt={lesson.createdAt}
                      />
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}
