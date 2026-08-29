"use client";

import { useEffect, useState } from "react";

// أسطر قصيرة (لازم تفضل قصيرة عشان متطلعش بره حدود "نافذة المحرر" في
// HeroIllustration - العرض المتاح تقريبًا ١٨-٢٠ حرف بخط Mono مقاس ١٠).
const LINES = ["تعلّم(); 🚀", "فكّر() → ابنِ()", "AI.ساعدني();", "حاول(); كمّل();"];

const TYPE_MS = 55;
const DELETE_MS = 28;
const HOLD_MS = 1500;
const GAP_MS = 300;

/// سطر كود حي يُكتب ويُمحى تلقائيًا - التوقيع البصري الوحيد الديناميكي في
/// البانر الترحيبي، بيجسّد هوية المنصة (برمجة + ذكاء اصطناعي) حرفيًا بدل
/// ما يكون مجرد زخرفة عامة. يحترم prefers-reduced-motion بعرض أول سطر ثابت.
export function CodeTypewriterLine({
  x,
  y,
  className,
}: {
  x: number;
  y: number;
  className?: string;
}) {
  const [lineIndex, setLineIndex] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const current = LINES[lineIndex];
    const atEnd = charCount === current.length;
    const atStart = charCount === 0;

    if (!deleting && atEnd) {
      const t = setTimeout(() => setDeleting(true), HOLD_MS);
      return () => clearTimeout(t);
    }
    if (deleting && atStart) {
      const t = setTimeout(() => {
        setDeleting(false);
        setLineIndex((i) => (i + 1) % LINES.length);
      }, GAP_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(
      () => setCharCount((c) => c + (deleting ? -1 : 1)),
      deleting ? DELETE_MS : TYPE_MS
    );
    return () => clearTimeout(t);
  }, [charCount, deleting, lineIndex, reduced]);

  const display = reduced ? LINES[0] : LINES[lineIndex].slice(0, charCount);

  return (
    <text x={x} y={y} fontFamily="var(--font-mono)" fontSize="10" fill="#fff" fillOpacity="0.55">
      <tspan className={className}>{display}</tspan>
      {!reduced && (
        <tspan className="animate-blink" fillOpacity="0.8">
          ▌
        </tspan>
      )}
    </text>
  );
}
