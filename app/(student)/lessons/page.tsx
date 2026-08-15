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
      <div>
        <h1 className="text-xl font-bold text-ink">الدروس</h1>
        <p className="text-sm text-ink-soft mt-1">تصفّح المواد والوحدات والدروس المتاحة لك.</p>
      </div>

      {!hasAnyContent && (
        <div className="rounded-xl border border-border bg-surface p-6 text-sm text-ink-soft shadow-elevated">
          لا توجد دروس منشورة بعد. راجع لاحقًا.
        </div>
      )}

      {subjects.map((subject) =>
        subject.units.length === 0 ? null : (
          <div key={subject.id} className="space-y-4">
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
                        className="rounded-xl border border-border bg-surface p-4 hover:border-primary transition shadow-elevated card-hover"
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
