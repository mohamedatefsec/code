"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Mission } from "@/lib/student-journey";

const ICONS: Record<Mission["kind"], string> = {
  "quiz-in-progress": "⏳",
  "quiz-closing": "⏰",
  "quiz-new": "📝",
  "lesson-continue": "▶️",
  "lesson-start": "📘",
  review: "🔁",
  "all-done": "🏆",
};

/// "مهمة النهارده": خطوة واحدة كبيرة وواضحة (أهم حاجة دلوقتي)، وتحتها
/// لحد خطوتين صغيرين "وبعدها". الترتيب بيتحسب في lib/student-journey.ts.
export function MissionCard({ missions }: { missions: Mission[] }) {
  const [main, ...rest] = missions;
  if (!main) return null;
  const urgent = main.kind === "quiz-in-progress" || main.kind === "quiz-closing";

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={`relative overflow-hidden rounded-2xl border bg-surface shadow-elevated ${
        urgent ? "border-spark/50" : "border-primary/30"
      }`}
      aria-label="مهمة النهارده"
    >
      <div
        className="absolute inset-y-0 start-0 w-1.5"
        style={{ background: urgent ? "var(--color-spark)" : "var(--gradient-brand)" }}
        aria-hidden="true"
      />
      <div className="p-5 sm:p-6 ps-6 sm:ps-7 flex flex-wrap items-center gap-4">
        <motion.span
          className={`grid place-items-center w-14 h-14 shrink-0 rounded-2xl text-2xl ${urgent ? "bg-spark-soft" : "bg-primary-soft"}`}
          animate={{ rotate: [0, -8, 8, -4, 0] }}
          transition={{ duration: 1.2, delay: 0.6, repeat: Infinity, repeatDelay: 5 }}
          aria-hidden="true"
        >
          {ICONS[main.kind]}
        </motion.span>
        <div className="flex-1 min-w-[12rem]">
          <p className={`text-xs font-bold ${urgent ? "text-spark" : "text-primary"}`}>مهمة النهارده — {main.label}</p>
          <p className="font-display font-bold text-lg text-ink mt-0.5 leading-snug">{main.title}</p>
          <p className="text-sm text-ink-soft mt-1">{main.detail}</p>
        </div>
        <Link
          href={main.href}
          className="btn-shine shrink-0 rounded-xl bg-gradient-brand px-6 py-3 font-bold text-white shadow-glow hover:brightness-110 active:scale-[0.98] transition"
        >
          {main.cta}
        </Link>
      </div>

      {rest.length > 0 && (
        <div className="border-t border-border bg-surface-2/60 px-5 sm:px-6 py-3 ps-6 sm:ps-7">
          <p className="text-xs text-ink-soft mb-2">وبعدها:</p>
          <ul className="flex flex-col sm:flex-row gap-2">
            {rest.slice(0, 2).map((m, i) => (
              <li key={i} className="flex-1 min-w-0">
                <Link
                  href={m.href}
                  className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3 py-2 text-sm hover:border-primary/40 transition-colors"
                >
                  <span aria-hidden="true">{ICONS[m.kind]}</span>
                  <span className="min-w-0">
                    <span className="block text-[11px] text-ink-soft">{m.label}</span>
                    <span className="block font-semibold text-ink truncate">{m.title}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.section>
  );
}
