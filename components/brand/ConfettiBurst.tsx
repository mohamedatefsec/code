"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";

/// قصاصات احتفال بألوان المنصة بتنزل مرة واحدة كل ما `fireKey` يتغيّر.
/// خفيفة (عناصر HTML بسيطة) وبتتشال لوحدها بعد ثانيتين ونص، ومش بتشتغل
/// خالص لو جهاز الطالب مفعّل "تقليل الحركة".
const COLORS = ["var(--color-primary)", "var(--color-accent)", "var(--color-spark)", "#ec4899", "#a855f7"];

type Piece = { id: number; x: number; drift: number; rotate: number; delay: number; color: string; w: number; h: number; round: boolean };

function makePieces(count: number): Piece[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    drift: (Math.random() - 0.5) * 160,
    rotate: (Math.random() - 0.5) * 720,
    delay: Math.random() * 0.25,
    color: COLORS[i % COLORS.length],
    w: 6 + Math.random() * 6,
    h: 8 + Math.random() * 8,
    round: Math.random() > 0.7,
  }));
}

export function ConfettiBurst({ fireKey, count = 70 }: { fireKey: number; count?: number }) {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const pieces = useMemo(() => (active ? makePieces(count) : []), [active, count]);

  useEffect(() => {
    if (!fireKey || reduced) return;
    const start = setTimeout(() => setActive(fireKey), 0);
    const stop = setTimeout(() => setActive(0), 2600);
    return () => {
      clearTimeout(start);
      clearTimeout(stop);
    };
  }, [fireKey, reduced]);

  if (!active || typeof document === "undefined") return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden="true">
      {pieces.map((p) => (
        <motion.span
          key={`${active}-${p.id}`}
          className="absolute top-0"
          style={{
            left: `${p.x}%`,
            width: p.w,
            height: p.h,
            background: p.color,
            borderRadius: p.round ? "999px" : "2px",
          }}
          initial={{ y: -20, x: 0, rotate: 0, opacity: 1 }}
          animate={{ y: "105vh", x: p.drift, rotate: p.rotate, opacity: [1, 1, 0.9, 0] }}
          transition={{ duration: 2.2, delay: p.delay, ease: [0.2, 0.6, 0.4, 1] }}
        />
      ))}
    </div>,
    document.body
  );
}
