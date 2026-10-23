import Link from "next/link";
import { subjectTheme, type SubjectLike } from "./SubjectArt";
import { isNewLesson } from "@/lib/lesson-badge";
import { splitLessonNumber } from "@/lib/lesson-title";

/// بطاقة درس في قايمة الدروس: شارة رقم متدرّجة بلون المادة + العنوان +
/// الوصف + زرار "ابدأ الدرس". الرقم بيتاخد من العنوان لو بادئ برقم
/// ("3- ...")، وإلا بنستخدم ترتيب الدرس جوه الوحدة (index + 1) - عشان
/// الرقم المعروض دايمًا يطابق اللي الطالب شايفه في القايمة.
export function LessonCard({
  id,
  title,
  description,
  subject,
  index = 0,
  createdAt,
}: {
  id: string;
  title: string;
  description?: string | null;
  subject: SubjectLike;
  index?: number;
  createdAt: Date | string;
}) {
  const fresh = isNewLesson(createdAt);
  const theme = subjectTheme(subject);
  const { number, text } = splitLessonNumber(title);
  const badgeNumber = number ?? String(index + 1);

  return (
    <Link
      href={`/lessons/${id}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface p-4 pt-5 shadow-elevated card-hover animate-fade-in-up"
      style={{ animationDelay: `${Math.min(index, 8) * 0.05}s` }}
    >
      {/* خط تدرّج رفيع فوق البطاقة بلون المادة */}
      <span className="absolute inset-x-0 top-0 h-1" style={{ background: theme.gradient }} aria-hidden="true" />

      <div className="flex items-start gap-3.5">
        <div
          className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-lg font-extrabold tabular-nums text-white shadow-sm transition-transform duration-300 group-hover:scale-105"
          style={{ background: theme.gradient }}
          aria-hidden="true"
        >
          {badgeNumber}
        </div>
        <div className="min-w-0 flex-1">
          {fresh && (
            <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-bold text-primary animate-pulse-glow">
              ✨ جديد
            </span>
          )}
          <p className="font-semibold leading-snug text-ink transition-colors group-hover:text-primary">{text}</p>
        </div>
      </div>

      {description && <p className="mt-3 line-clamp-2 text-sm leading-6 text-ink-soft">{description}</p>}

      <div className="mt-auto flex items-center justify-end pt-4 text-xs font-semibold text-primary">
        <span className="inline-flex items-center gap-1 transition-all duration-300 group-hover:gap-2">
          ابدأ الدرس
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} className="h-3.5 w-3.5" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </Link>
  );
}
