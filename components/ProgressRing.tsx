"use client";

import { motion, useReducedMotion } from "framer-motion";
import { AnimatedNumber } from "@/components/AnimatedNumber";

/// دايرة تقدّم بتتملي بحركة لحد النسبة، والرقم في النص بيعدّ من صفر.
/// onDark: لما تبقى فوق خلفية ملوّنة (البانر)، الألوان بتبقى أبيض.
export function ProgressRing({
  percent,
  size = 96,
  stroke = 9,
  onDark = false,
  label,
}: {
  percent: number;
  size?: number;
  stroke?: number;
  onDark?: boolean;
  label?: string;
}) {
  const reduced = useReducedMotion();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.min(Math.max(percent, 0), 100);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          style={{ stroke: onDark ? "rgba(255,255,255,0.22)" : "var(--color-border)" }}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          style={{ stroke: onDark ? "#ffffff" : "var(--color-primary)" }}
          initial={{ strokeDashoffset: reduced ? c * (1 - p / 100) : c }}
          animate={{ strokeDashoffset: c * (1 - p / 100) }}
          transition={{ duration: reduced ? 0 : 1.3, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center leading-none">
        <div>
          <span className={`stat-figure block font-bold ${onDark ? "text-white" : "text-ink"}`} style={{ fontSize: size * 0.24 }}>
            <AnimatedNumber value={Math.round(p)} suffix="%" />
          </span>
          {label && <span className={`block mt-1 text-[10px] ${onDark ? "text-white/80" : "text-ink-soft"}`}>{label}</span>}
        </div>
      </div>
    </div>
  );
}
