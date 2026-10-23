import { SubjectBackdrop } from "./SubjectArt";
import { splitLessonNumber } from "@/lib/lesson-title";

/// ترويسة صفحة الدرس: بطاقة متدرّجة نظيفة بدل الغلاف القديم (اللي كان فيه
/// أيقونة </> كبيرة في النص بتتداخل مع العنوان). التنظيم من فوق لتحت:
/// مسار المادة › الوحدة (+ شارة جديد) ← رقم الدرس والعنوان ← الوصف ←
/// معلومات سريعة عن محتوى الدرس (فيديوهات / ملفات / وقت القراءة).
/// بدون أي أيقونة مركزية، وبتعتيم خفيف من تحت عشان النص الأبيض يتقرا
/// بوضوح حتى لو لون التدرّج فاتح.

type Props = {
  subject: { slug?: string | null; name: string };
  unitTitle: string;
  title: string;
  description?: string | null;
  isNew?: boolean;
  videoCount?: number;
  pdfCount?: number;
  /// وقت القراءة التقريبي بالدقائق (0 أو ناقص = ما يظهرش).
  readMinutes?: number;
};

function MetaChip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="inline-flex items-center gap-1.5 rounded-full bg-black/20 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-white/15 backdrop-blur-sm">
      <span className="text-white/80" aria-hidden="true">
        {icon}
      </span>
      {children}
    </li>
  );
}

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  strokeWidth: 1.8,
  className: "h-4 w-4",
} as const;

const PlayIcon = (
  <svg {...iconProps}>
    <rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" />
    <path d="M10.5 9.5v5l4.2-2.5-4.2-2.5Z" fill="currentColor" stroke="none" />
  </svg>
);

const FileIcon = (
  <svg {...iconProps}>
    <path
      d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
      stroke="currentColor"
      strokeLinejoin="round"
    />
    <path d="M14 3v5h5M9 13h6M9 16.5h4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ClockIcon = (
  <svg {...iconProps}>
    <circle cx="12" cy="12" r="8.5" stroke="currentColor" />
    <path d="M12 7.5V12l3 2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function LessonHeader({
  subject,
  unitTitle,
  title,
  description,
  isNew = false,
  videoCount = 0,
  pdfCount = 0,
  readMinutes = 0,
}: Props) {
  const { number, text } = splitLessonNumber(title);
  const hasMeta = videoCount > 0 || pdfCount > 0 || readMinutes > 0;

  return (
    <header className="relative isolate overflow-hidden rounded-3xl shadow-glow animate-fade-in-up">
      <SubjectBackdrop subject={subject} />

      <div className="relative flex flex-col gap-4 p-5 text-white sm:gap-5 sm:p-8">
        {/* المسار: المادة › الوحدة */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-black/20 px-3 py-1 text-xs font-medium ring-1 ring-white/20 backdrop-blur-sm">
            <span className="truncate">{subject.name}</span>
            <span className="opacity-60" aria-hidden="true">
              ‹
            </span>
            <span className="truncate opacity-90">{unitTitle}</span>
          </span>
          {isNew && (
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-primary shadow-sm animate-pulse-glow">
              ✨ جديد
            </span>
          )}
        </div>

        {/* رقم الدرس + العنوان */}
        <div className="flex items-start gap-3.5 sm:gap-5">
          {number && (
            <div
              className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-white/20 shadow-lg ring-1 ring-white/35 backdrop-blur-md sm:h-16 sm:w-16"
              aria-label={`الدرس رقم ${number}`}
            >
              <span className="text-[10px] font-medium leading-none text-white/80">درس</span>
              <span className="mt-1 text-xl font-extrabold leading-none tabular-nums sm:text-2xl">{number}</span>
            </div>
          )}
          <h1 className="min-w-0 flex-1 text-2xl font-extrabold leading-snug tracking-tight drop-shadow-sm sm:text-3xl">
            {text}
          </h1>
        </div>

        {description && (
          <p className="max-w-xl border-s-2 border-white/40 ps-3 text-sm leading-7 text-white/90 sm:text-[15px]">
            {description}
          </p>
        )}

        {hasMeta && (
          <ul className="flex flex-wrap gap-2 pt-1">
            {videoCount > 0 && (
              <MetaChip icon={PlayIcon}>{videoCount === 1 ? "فيديو" : `${videoCount} فيديوهات`}</MetaChip>
            )}
            {pdfCount > 0 && (
              <MetaChip icon={FileIcon}>{pdfCount === 1 ? "ملف PDF" : `${pdfCount} ملفات PDF`}</MetaChip>
            )}
            {readMinutes > 0 && <MetaChip icon={ClockIcon}>قراءة ≈ {readMinutes} د</MetaChip>}
          </ul>
        )}
      </div>
    </header>
  );
}
