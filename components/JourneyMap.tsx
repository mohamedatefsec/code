"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { JourneyUnit } from "@/lib/student-journey";
import { CodyRobot } from "@/components/brand/CodyRobot";
import { ConfettiBurst } from "@/components/brand/ConfettiBurst";

/// خريطة رحلة الوحدة: الدروس نقط على طريق متعرّج (من اليمين لليسار زي
/// اتجاه القراءة). اللي خلّصه أخضر، الدرس الحالي بينبض و"كودي" واقف جنبه،
/// واللي جاي رمادي. لما الطالب يخلّص درس ويرجع، كودي بيمشي على الطريق
/// للدرس اللي بعده، ولما يخلّص الوحدة كلها بتنزل قصاصات احتفال مرة واحدة.

const ROW_H = 104;
const TOP = 52;
const X_PATTERN = [0.76, 0.24]; // زجزاج: يمين ← شمال

function storageGet(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function storageSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // التخزين مش متاح (وضع خاص مثلًا) - مش مشكلة
  }
}

function lessonsWord(n: number) {
  if (n === 1) return "درس واحد";
  if (n === 2) return "درسين";
  if (n >= 3 && n <= 10) return `${n} دروس`;
  return `${n} درس`;
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={3} aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function JourneyMap({ units, initialUnitId }: { units: JourneyUnit[]; initialUnitId: string | null }) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(() => Math.max(units.findIndex((u) => u.id === initialUnitId), 0));
  const unit = units[index];

  // عرض الخريطة الفعلي بالبكسل (عشان الطريق يترسم من غير تمطيط)
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(340);
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth || 340);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const points = useMemo(
    () =>
      (unit?.lessons ?? []).map((_, i) => ({
        x: Math.round(width * X_PATTERN[i % 2]),
        y: TOP + i * ROW_H,
      })),
    [unit, width]
  );
  const height = points.length > 0 ? points[points.length - 1].y + 70 : 120;

  const pathFor = (upTo: number) => {
    if (points.length === 0) return "";
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i <= upTo && i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];
      d += ` C ${a.x} ${a.y + ROW_H * 0.55}, ${b.x} ${b.y - ROW_H * 0.55}, ${b.x} ${b.y}`;
    }
    return d;
  };

  const currentIdx = unit ? unit.lessons.findIndex((l) => l.state === "current") : -1;
  // الطريق الملوّن: لحد الدرس الحالي، أو لحد آخر درس خلّصه لو مفيش درس حالي في الوحدة دي
  const lastDoneIdx = unit ? unit.lessons.reduce((acc, l, i) => (l.state === "done" ? i : acc), -1) : -1;
  const progressTo = currentIdx >= 0 ? currentIdx : lastDoneIdx;
  const allDone = Boolean(unit && unit.lessons.length > 0 && unit.doneCount === unit.lessons.length);

  // كودي بيمشي من مكانه القديم (آخر مرة الطالب شاف الخريطة) لمكانه الجديد
  const [codyFrom, setCodyFrom] = useState<number | null>(null);
  useEffect(() => {
    if (!unit || currentIdx < 0) return;
    const key = `journey-cody-${unit.id}`;
    const prev = storageGet(key);
    const prevIdx = prev ? unit.lessons.findIndex((l) => l.id === prev) : -1;
    const t = setTimeout(() => setCodyFrom(prevIdx >= 0 && prevIdx < currentIdx ? prevIdx : null), 0);
    storageSet(key, unit.lessons[currentIdx].id);
    return () => clearTimeout(t);
  }, [unit, currentIdx]);

  // احتفال إنهاء الوحدة: مرة واحدة بس لكل وحدة
  const [confetti, setConfetti] = useState(0);
  useEffect(() => {
    if (!unit || !allDone) return;
    const key = `journey-unit-done-${unit.id}`;
    if (storageGet(key)) return;
    storageSet(key, "1");
    const t = setTimeout(() => setConfetti(Date.now()), 500);
    return () => clearTimeout(t);
  }, [unit, allDone]);

  if (!unit) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 text-center shadow-elevated">
        <CodyRobot className="w-20 h-24 mx-auto" idPrefix="cody-journey-empty" />
        <p className="font-bold text-ink mt-3">لسه مفيش دروس منشورة</p>
        <p className="text-sm text-ink-soft mt-1">أول ما المعلّم ينزّل درس، رحلتك هتبدأ من هنا.</p>
      </div>
    );
  }

  const cody = currentIdx >= 0 ? points[currentIdx] : null;
  const codyStart = codyFrom !== null ? points[codyFrom] : null;
  const codyOffsetX = (p: { x: number }) => (p.x > width / 2 ? p.x + 40 : p.x - 84);
  const percent = Math.round((unit.doneCount / unit.lessons.length) * 100);

  return (
    <section className="rounded-2xl border border-border bg-surface shadow-elevated overflow-hidden" aria-label="خريطة رحلتك">
      <ConfettiBurst fireKey={confetti} />

      {/* رأس الخريطة: الوحدة + التنقّل بين الوحدات + التقدّم */}
      <div className="px-5 pt-5 pb-4 border-b border-border bg-surface-2/60">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setIndex((i) => Math.max(i - 1, 0))}
            disabled={index === 0}
            className="grid place-items-center w-9 h-9 rounded-full border border-border text-ink-soft hover:text-primary hover:border-primary/40 disabled:opacity-30 transition"
            aria-label="الوحدة اللي قبلها"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" aria-hidden="true">
              <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="text-center min-w-0">
            <p className="text-xs text-ink-soft">
              {unit.subjectName} — الوحدة {index + 1} من {units.length}
            </p>
            <h2 className="font-bold text-ink text-lg truncate">{unit.title}</h2>
          </div>
          <button
            onClick={() => setIndex((i) => Math.min(i + 1, units.length - 1))}
            disabled={index === units.length - 1}
            className="grid place-items-center w-9 h-9 rounded-full border border-border text-ink-soft hover:text-primary hover:border-primary/40 disabled:opacity-30 transition"
            aria-label="الوحدة اللي بعدها"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" aria-hidden="true">
              <path d="m15 6-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-2 flex-1 rounded-full bg-canvas border border-border overflow-hidden">
            <motion.div
              key={unit.id}
              className="h-full rounded-full bg-gradient-brand"
              initial={{ width: 0 }}
              animate={{ width: `${percent}%` }}
              transition={{ duration: reduced ? 0 : 0.9, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <span className="text-xs text-ink-soft tabular-nums shrink-0">
            {allDone ? "🏁 خلّصتها كلها" : `خلّصت ${unit.doneCount} من ${lessonsWord(unit.lessons.length)}`}
          </span>
        </div>
      </div>

      {/* الخريطة */}
      <div ref={boxRef} className="mx-auto max-w-xl bg-circuit-dots">
      <AnimatePresence mode="wait">
        <motion.div
          key={unit.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="relative"
          style={{ height }}
        >
          <svg className="absolute inset-0" width={width} height={height} aria-hidden="true">
            <defs>
              <linearGradient id="journey-road" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" style={{ stopColor: "var(--color-accent)" }} />
                <stop offset="1" style={{ stopColor: "var(--color-primary)" }} />
              </linearGradient>
            </defs>
            {/* الطريق كله (متقطّع) */}
            <path
              d={pathFor(points.length - 1)}
              fill="none"
              style={{ stroke: "var(--color-border)" }}
              strokeWidth={6}
              strokeLinecap="round"
              strokeDasharray="2 12"
            />
            {/* الجزء اللي الطالب مشيه */}
            {progressTo > 0 && (
              <motion.path
                d={pathFor(progressTo)}
                fill="none"
                stroke="url(#journey-road)"
                strokeWidth={6}
                strokeLinecap="round"
                initial={{ pathLength: reduced ? 1 : 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: reduced ? 0 : 1.1, delay: 0.2, ease: [0.65, 0, 0.35, 1] }}
              />
            )}
          </svg>

          {/* الدروس */}
          <ol>
            {unit.lessons.map((l, i) => {
              const p = points[i];
              if (!p) return null;
              const onRight = p.x > width / 2;
              const size = l.state === "current" ? 64 : 52;
              return (
                <li key={l.id}>
                  <motion.div
                    className="absolute"
                    style={{ left: p.x - size / 2, top: p.y - size / 2, width: size, height: size }}
                    initial={{ scale: reduced ? 1 : 0.4, opacity: reduced ? 1 : 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: reduced ? 0 : 0.15 + i * 0.08, type: "spring", stiffness: 260, damping: 18 }}
                  >
                    {l.state === "current" && (
                      <span className="absolute -inset-3 rounded-full bg-primary/25 animate-ping" aria-hidden="true" />
                    )}
                    <Link
                      href={`/lessons/${l.id}`}
                      aria-label={`الدرس ${l.number}: ${l.title}${l.state === "done" ? " (خلّصته)" : l.state === "current" ? " (انت هنا)" : ""}`}
                      className={`relative grid place-items-center w-full h-full rounded-full font-bold text-lg transition-transform hover:scale-110 focus-visible:scale-110 ${
                        l.state === "done"
                          ? "bg-accent text-white shadow-[0_6px_0_0_color-mix(in_srgb,var(--color-accent)_60%,#000)]"
                          : l.state === "current"
                            ? "bg-gradient-brand text-white text-xl shadow-[0_6px_0_0_color-mix(in_srgb,var(--color-primary)_55%,#000)] ring-4 ring-surface"
                            : l.state === "opened"
                              ? "bg-surface text-spark border-[3px] border-spark shadow-[0_5px_0_0_var(--color-border)]"
                              : "bg-surface text-ink-soft border-2 border-border shadow-[0_5px_0_0_var(--color-border)]"
                      }`}
                    >
                      {l.state === "done" ? <CheckIcon /> : l.number}
                    </Link>
                  </motion.div>

                  {/* اسم الدرس ناحية النص */}
                  <div
                    className="absolute"
                    style={{
                      top: p.y + size / 2 + 6,
                      ...(onRight ? { right: width - p.x - 70 } : { left: p.x - 70 }),
                      width: 140,
                    }}
                  >
                    <p
                      className={`mx-auto w-fit max-w-full rounded-lg px-2 py-0.5 text-center text-xs leading-5 ${
                        l.state === "current" ? "bg-primary-soft text-primary font-bold" : "bg-surface/90 text-ink-soft"
                      }`}
                    >
                      {l.title}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>

          {/* كودي جنب الدرس الحالي */}
          {cody && (
            <motion.div
              className="absolute pointer-events-none"
              style={{ left: 0, top: 0 }}
              initial={
                codyStart && !reduced
                  ? { x: codyOffsetX(codyStart), y: codyStart.y - 60 }
                  : { x: codyOffsetX(cody), y: cody.y - 60, opacity: reduced ? 1 : 0 }
              }
              animate={{ x: codyOffsetX(cody), y: cody.y - 60, opacity: 1 }}
              transition={{ duration: codyStart && !reduced ? 1.4 : 0.5, delay: 0.6, ease: [0.45, 0, 0.25, 1] }}
            >
              <div className="relative">
                <CodyRobot className="w-11 h-14" wave={false} idPrefix="cody-journey" />
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white shadow-glow">
                  انت هنا
                </span>
              </div>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
      </div>

      {/* نهاية الوحدة */}
      <div className="px-5 py-4 border-t border-border flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-ink-soft">
          {allDone
            ? index < units.length - 1
              ? "🎉 خلّصت الوحدة دي. الوحدة الجاية مستنياك."
              : "🎉 خلّصت كل الوحدات المنشورة لحد دلوقتي."
            : currentIdx >= 0
              ? "دوس على أي درس عشان تفتحه، والدرس اللي بينوّر هو مكانك دلوقتي."
              : "دوس على أي درس عشان تفتحه."}
        </p>
        {allDone && index < units.length - 1 && (
          <button
            onClick={() => setIndex(index + 1)}
            className="rounded-full bg-gradient-brand px-4 py-2 text-sm font-bold text-white shadow-glow hover:brightness-110 transition"
          >
            الوحدة الجاية
          </button>
        )}
      </div>
    </section>
  );
}
