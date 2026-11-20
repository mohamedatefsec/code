"use client";

import { motion } from "framer-motion";

export type ShelfBadge = {
  id: string;
  name: string;
  icon: string;
  description: string;
  earned: boolean;
  /// إزاي تتفتح (للشارات المقفولة)
  hint: string;
};

/// رف الشارات: المكسوبة بتلمع، والمقفولة عليها قفل ومكتوب تحتها إزاي تتفتح -
/// عشان الطالب يبقى عنده هدف قريب واضح.
export function BadgeShelf({ badges }: { badges: ShelfBadge[] }) {
  if (badges.length === 0) return null;
  const earnedCount = badges.filter((b) => b.earned).length;
  const nextGoal = badges.find((b) => !b.earned);

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-elevated" aria-label="شاراتك">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-bold text-ink">شاراتك</h2>
        <span className="text-sm text-ink-soft tabular-nums">
          كسبت {earnedCount} من {badges.length}
        </span>
      </div>
      {nextGoal && (
        <p className="mt-1 text-sm text-ink-soft">
          الهدف الجاي: <span className="font-semibold text-primary">{nextGoal.name}</span> — {nextGoal.hint}
        </p>
      )}

      <ul className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {badges.map((b, i) => (
          <motion.li
            key={b.id}
            initial={{ opacity: 0, scale: 0.85 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06, type: "spring", stiffness: 260, damping: 20 }}
            title={b.earned ? b.description : b.hint}
            className={`relative overflow-hidden flex flex-col items-center text-center gap-1.5 rounded-2xl border p-3 ${
              b.earned ? "border-primary/30 bg-primary-soft" : "border-dashed border-border bg-surface-2/60"
            }`}
          >
            {b.earned && <span className="badge-shine" aria-hidden="true" />}
            <span className={`relative text-3xl ${b.earned ? "" : "grayscale opacity-35"}`} aria-hidden="true">
              {b.icon}
              {!b.earned && (
                <span className="absolute -bottom-1 -end-2 grid place-items-center w-5 h-5 rounded-full bg-surface border border-border text-[10px]">
                  🔒
                </span>
              )}
            </span>
            <span className={`text-xs font-bold ${b.earned ? "text-ink" : "text-ink-soft"}`}>{b.name}</span>
            <span className="text-[11px] leading-4 text-ink-soft">{b.earned ? "✓ اتكسبت" : b.hint}</span>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}
