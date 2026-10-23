import { SubjectBackdrop, type SubjectLike } from "./SubjectArt";

/// بانر المادة في صفحة الدروس: تدرّج المادة + اسمها بخط كبير + شرائح سريعة
/// (عدد الوحدات والدروس) + رقم كبير باهت كعنصر زخرفي بدل الأيقونة القديمة.
export function SubjectHero({
  subject,
  name,
  lessonsCount,
  unitsCount = 0,
}: {
  subject: SubjectLike;
  name: string;
  lessonsCount: number;
  unitsCount?: number;
}) {
  const chipClass =
    "inline-flex items-center rounded-full bg-black/20 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-white/15 backdrop-blur-sm tabular-nums";

  return (
    <div className="relative isolate overflow-hidden rounded-3xl shadow-glow animate-fade-in-up">
      <SubjectBackdrop subject={subject} />
      <div className="relative flex items-end justify-between gap-4 p-6 text-white sm:p-8">
        <div className="min-w-0">
          <p className="mb-1.5 text-xs font-medium text-white/75">المادة الدراسية</p>
          <h2 className="text-2xl font-extrabold leading-tight drop-shadow-sm sm:text-3xl">{name}</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {unitsCount > 0 && (
              <li className={chipClass}>
                {unitsCount} {unitsCount === 1 ? "وحدة" : "وحدات"}
              </li>
            )}
            <li className={chipClass}>
              {lessonsCount} {lessonsCount === 1 ? "درس متاح" : "دروس متاحة"}
            </li>
          </ul>
        </div>
        <span
          aria-hidden="true"
          className="pointer-events-none shrink-0 select-none text-7xl font-black leading-none tabular-nums text-white/15 sm:text-8xl"
        >
          {lessonsCount}
        </span>
      </div>
    </div>
  );
}
