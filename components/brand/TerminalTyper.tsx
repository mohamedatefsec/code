"use client";

import { useEffect, useState } from "react";

/// سطر طرفية بيكتب نفسه حرف حرف، يمسح، ويكتب الجملة اللي بعدها.
/// بيحترم "تقليل الحركة": في الحالة دي بيعرض أول جملة كاملة ثابتة.
export function TerminalTyper({
  lines,
  className = "",
}: {
  lines: string[];
  className?: string;
}) {
  const [lineIndex, setLineIndex] = useState(0);
  const [chars, setChars] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    Promise.resolve().then(() => setReduced(mq.matches));
  }, []);

  const current = lines[lineIndex % lines.length] ?? "";

  useEffect(() => {
    if (reduced) return;
    let delay = deleting ? 28 : 62;
    if (!deleting && chars === current.length) delay = 1900;
    if (deleting && chars === 0) delay = 350;

    const t = setTimeout(() => {
      if (!deleting && chars === current.length) {
        setDeleting(true);
      } else if (deleting && chars === 0) {
        setDeleting(false);
        setLineIndex((i) => (i + 1) % lines.length);
      } else {
        setChars((c) => c + (deleting ? -1 : 1));
      }
    }, delay);
    return () => clearTimeout(t);
  }, [chars, deleting, current, lines.length, reduced]);

  const shown = reduced ? current : current.slice(0, chars);

  return (
    <span className={`inline-flex items-center font-mono ${className}`} dir="ltr">
      <span className="text-accent me-2 select-none">{">"}</span>
      <span>{shown}</span>
      <span className="ms-0.5 inline-block w-[0.55em] h-[1.1em] bg-accent align-middle animate-blink" aria-hidden="true" />
    </span>
  );
}
