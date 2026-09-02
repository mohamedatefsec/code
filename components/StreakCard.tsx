"use client";

import { motion } from "framer-motion";

export function StreakCard({ streak }: { streak: number }) {
  const hasStreak = streak > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-xl border border-border bg-surface p-5 shadow-elevated flex items-center gap-4"
    >
      <div
        className={`grid place-items-center w-14 h-14 rounded-2xl shrink-0 text-2xl ${
          hasStreak ? "bg-gradient-brand shadow-glow" : "bg-canvas border border-border"
        }`}
      >
        <span className={hasStreak ? "animate-pulse-glow" : "opacity-40"}>🔥</span>
      </div>
      <div>
        <p className="stat-figure text-2xl font-bold text-ink">
          {streak}
          <span className="text-sm font-normal text-ink-soft"> {streak === 1 ? "يوم" : "أيام"}</span>
        </p>
        <p className="text-sm text-ink-soft mt-0.5">
          {hasStreak ? "سلسلة نشاطك المتتالية — استمر عشان متكسّرهاش!" : "ابدأ نشاطك اليوم لتفتح سلسلتك الأولى"}
        </p>
      </div>
    </motion.div>
  );
}
