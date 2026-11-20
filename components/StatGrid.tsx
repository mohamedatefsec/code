"use client";

import { motion } from "framer-motion";
import { AnimatedNumber } from "./AnimatedNumber";

export type Stat = {
  label: string;
  value: number | string;
  accent?: "primary" | "accent";
  suffix?: string;
  icon?: React.ReactNode;
};

export function StatGrid({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ y: -3 }}
          className="rounded-2xl border border-border bg-surface p-5 card-hover relative overflow-hidden shadow-elevated"
        >
          <div
            className="absolute -top-6 -end-6 w-20 h-20 rounded-full opacity-[0.07] blur-xl"
            style={{ background: stat.accent === "accent" ? "var(--color-accent)" : "var(--color-primary)" }}
          />
          <div className="flex items-center justify-between relative mb-2">
            <p className="text-sm text-ink-soft">{stat.label}</p>
            {stat.icon && (
              <span
                className={`grid place-items-center w-8 h-8 rounded-lg shrink-0 ${
                  stat.accent === "accent" ? "bg-accent-soft text-accent" : "bg-primary-soft text-primary"
                }`}
              >
                {stat.icon}
              </span>
            )}
          </div>
          <p
            className={`stat-figure text-3xl font-semibold relative ${
              stat.accent === "accent" ? "text-accent" : "text-primary"
            }`}
          >
            {typeof stat.value === "number" ? (
              <AnimatedNumber value={stat.value} suffix={stat.suffix} />
            ) : (
              stat.value
            )}
          </p>
          {/* شريط صغير يوضّح النسبة بصريًا (للقيم المئوية فقط): كل ما يتملي أكتر كل ما النسبة أعلى */}
          {stat.suffix === "%" && typeof stat.value === "number" && (
            <div className="relative mt-3 h-1.5 rounded-full bg-surface-2 overflow-hidden" aria-hidden="true">
              <motion.div
                className="h-full rounded-full origin-right"
                style={{ background: stat.accent === "accent" ? "var(--color-accent)" : "var(--color-primary)" }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: Math.min(Math.max(stat.value, 0), 100) / 100 }}
                transition={{ duration: 1.1, delay: 0.2 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
