"use client";

import { motion } from "framer-motion";
import { AnimatedNumber } from "./AnimatedNumber";

export type Stat = {
  label: string;
  value: number | string;
  accent?: "primary" | "accent";
  suffix?: string;
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
          className="rounded-xl border border-border bg-surface p-5 card-hover relative overflow-hidden shadow-elevated"
        >
          <div
            className="absolute -top-6 -end-6 w-20 h-20 rounded-full opacity-[0.07] blur-xl"
            style={{ background: stat.accent === "accent" ? "var(--color-accent)" : "var(--color-primary)" }}
          />
          <p className="text-sm text-ink-soft mb-2 relative">{stat.label}</p>
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
        </motion.div>
      ))}
    </div>
  );
}
