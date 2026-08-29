import Link from "next/link";
import { SubjectCoverArt, type SubjectLike } from "./SubjectArt";
import { isNewLesson } from "@/lib/lesson-badge";

export function LessonCard({
  id,
  title,
  description,
  subject,
  order = 0,
  index = 0,
  createdAt,
}: {
  id: string;
  title: string;
  description?: string | null;
  subject: SubjectLike;
  order?: number;
  index?: number;
  createdAt: Date | string;
}) {
  const fresh = isNewLesson(createdAt);

  return (
    <Link
      href={`/lessons/${id}`}
      className="group rounded-xl border border-border bg-surface overflow-hidden shadow-elevated card-hover animate-fade-in-up flex flex-col"
      style={{ animationDelay: `${Math.min(index, 8) * 0.05}s` }}
    >
      <div className="relative h-28">
        <SubjectCoverArt subject={subject} variant={index} className="h-full w-full" />

        {fresh && (
          <span className="absolute top-2 start-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-bold text-primary shadow-sm animate-pulse-glow">
            ✨ جديد
          </span>
        )}
        <span className="absolute bottom-2 end-2 font-mono text-[11px] text-white/80">
          #{String(order).padStart(2, "0")}
        </span>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-1.5">
        <p className="font-medium text-ink leading-snug group-hover:text-primary transition-colors">
          {title}
        </p>
        {description && (
          <p className="text-sm text-ink-soft line-clamp-2">{description}</p>
        )}
      </div>
    </Link>
  );
}
