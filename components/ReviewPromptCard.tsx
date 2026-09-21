import Link from "next/link";

/// بطاقة في داشبورد الطالب بتقوله كام سؤال مراجعة لسه ما جاوبش عليه، وبتفتحله
/// صفحة /review. بتتعرض فقط لو فيه أسئلة مراجعة منشورة أصلًا.
export function ReviewPromptCard({ total, pending }: { total: number; pending: number }) {
  const allDone = pending === 0;

  return (
    <Link
      href="/review"
      className={`group flex items-center gap-4 rounded-xl border p-4 sm:p-5 shadow-elevated card-hover animate-fade-in-up ${
        allDone ? "border-border bg-surface" : "border-primary/30 bg-primary-soft"
      }`}
    >
      <span
        className="grid place-items-center w-11 h-11 rounded-xl shrink-0 text-white shadow-glow"
        style={{ background: "var(--gradient-brand)" }}
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} className="w-5 h-5">
          <path d="M20 12a8 8 0 1 1-2.6-5.9" stroke="currentColor" strokeLinecap="round" />
          <path d="M20 4.5v4h-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
          <path d="m9 12.2 2.1 2.1L15.2 10" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-ink">
          {allDone
            ? "خلّصت كل أسئلة المراجعة 🎉"
            : pending === 1
            ? "عندك سؤال مراجعة جديد"
            : `عندك ${pending} أسئلة مراجعة جديدة`}
        </p>
        <p className="text-sm text-ink-soft mt-0.5">
          {allDone
            ? `حلّيت ${total} ${total === 1 ? "سؤال" : "أسئلة"} — تقدر ترجع تراجع إجاباتك في أي وقت.`
            : "جاوب عليها مرة واحدة، وبعدها تقدر تراجع الإجابة الصحيحة والشرح."}
        </p>
      </div>

      <svg
        viewBox="0 0 24 24"
        fill="none"
        strokeWidth={2}
        className="w-4 h-4 shrink-0 text-ink-soft transition-transform group-hover:-translate-x-0.5"
        aria-hidden="true"
      >
        <path d="m15 6-6 6 6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}
