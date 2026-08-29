import { SubjectCoverArt, SubjectGlyph, type SubjectLike } from "./SubjectArt";

export function SubjectHero({
  subject,
  name,
  lessonsCount,
}: {
  subject: SubjectLike;
  name: string;
  lessonsCount: number;
}) {
  return (
    <div className="relative h-32 sm:h-36 rounded-2xl overflow-hidden shadow-glow animate-fade-in-up">
      <SubjectCoverArt subject={subject} className="h-full w-full" />
      <div className="absolute inset-0 flex items-center gap-4 px-6">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
          <SubjectGlyph subject={subject} className="w-8 h-8 text-white" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">{name}</h2>
          <p className="text-sm text-white/80 mt-0.5">
            {lessonsCount} {lessonsCount === 1 ? "درس متاح" : "دروس متاحة"}
          </p>
        </div>
      </div>
    </div>
  );
}
