import Link from "next/link";
import { db } from "@/lib/db";

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
            select: { id: true, title: true, description: true },
          },
        },
      },
    },
  });

  const hasAnyContent = subjects.some((s) => s.units.some((u) => u.lessons.length > 0));

  return (
    <div className="space-y-8">
      <div className="animate-fade-in-up">
        <h1 className="text-xl font-bold text-ink">الدروس</h1>
        <p className="text-sm text-ink-soft mt-1">تصفّح المواد والوحدات والدروس المتاحة لك.</p>
      </div>

      {!hasAnyContent && (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center shadow-elevated animate-fade-in-up">
          <div className="mx-auto mb-3 grid place-items-center w-14 h-14 rounded-full bg-primary-soft text-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="w-7 h-7">
              <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19a1 1 0 0 1 1 1v15.5a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 1 4 18V5.5Z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-sm text-ink-soft">لا توجد دروس منشورة بعد. راجع لاحقًا.</p>
        </div>
      )}

      {subjects.map((subject, si) =>
        subject.units.length === 0 ? null : (
          <div
            key={subject.id}
            className="space-y-4 animate-fade-in-up"
            style={{ animationDelay: `${si * 0.08}s` }}
          >
            <h2 className="text-lg font-semibold text-ink border-b border-border pb-2">
              {subject.name}
            </h2>
            {subject.units.map((unit) =>
              unit.lessons.length === 0 ? null : (
                <div key={unit.id} className="space-y-2">
                  <h3 className="text-sm font-medium text-ink-soft">{unit.title}</h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {unit.lessons.map((lesson) => (
                      <Link
                        key={lesson.id}
                        href={`/lessons/${lesson.id}`}
                        className="rounded-2xl border border-border bg-surface p-4 hover:border-primary transition shadow-elevated card-hover"
                      >
                        <p className="font-medium text-ink">{lesson.title}</p>
                        {lesson.description && (
                          <p className="text-sm text-ink-soft mt-1 line-clamp-2">{lesson.description}</p>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        )
      )}
    </div>
  );
}
