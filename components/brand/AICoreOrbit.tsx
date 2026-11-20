import type { ReactNode } from "react";

/// "النواة الذكية": صورة المدرّس في المركز، حواليها مداران بيلفّوا ببطء في
/// اتجاهين عكس بعض، وعليهم رموز البرمجة والذكاء الاصطناعي، وتحتهم شبكة
/// عصبية بتمشي فيها نبضات. ده العنصر البصري الأساسي في هوية المنصة.
/// كله CSS (بدون JavaScript) - خفيف على موبايلات الطلاب.

type Chip = { label: ReactNode; x: number; y: number; tone: "primary" | "accent" | "spark" };

const INNER: Chip[] = [
  { label: "</>", x: 50, y: 0, tone: "primary" },
  { label: "AI", x: 93.3, y: 75, tone: "accent" },
  { label: "{ }", x: 6.7, y: 75, tone: "spark" },
];

const OUTER: Chip[] = [
  { label: "py", x: 85.4, y: 14.6, tone: "accent" },
  { label: <BrainIcon />, x: 14.6, y: 85.4, tone: "primary" },
  { label: <ChipIcon />, x: 0, y: 50, tone: "spark" },
  { label: "01", x: 100, y: 50, tone: "primary" },
];

const TONES = {
  primary: { color: "var(--color-primary)", bg: "var(--color-primary-soft)" },
  accent: { color: "var(--color-accent)", bg: "var(--color-accent-soft)" },
  spark: { color: "var(--color-spark)", bg: "var(--color-spark-soft)" },
} as const;

function BrainIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
      <path d="M9 4.5a3 3 0 0 0-3 3 3 3 0 0 0-1.5 5.6A3 3 0 0 0 9 18.5V4.5ZM15 4.5a3 3 0 0 1 3 3 3 3 0 0 1 1.5 5.6A3 3 0 0 1 15 18.5V4.5Z" />
      <path d="M9 4.5h6M9 18.5h6M9 11.5h2M13 11.5h2" />
    </svg>
  );
}

function ChipIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
      <rect x="6.5" y="6.5" width="11" height="11" rx="2.5" />
      <path d="M10 3v3.5M14 3v3.5M10 17.5V21M14 17.5V21M3 10h3.5M3 14h3.5M17.5 10H21M17.5 14H21" />
    </svg>
  );
}

function OrbitChip({ chip, size }: { chip: Chip; size: number }) {
  const tone = TONES[chip.tone];
  return (
    <div
      className="absolute"
      style={{ left: `${chip.x}%`, top: `${chip.y}%`, width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2 }}
    >
      <div
        className="orbit-upright w-full h-full grid place-items-center rounded-2xl border shadow-elevated font-mono font-bold text-sm"
        style={{ color: tone.color, background: tone.bg, borderColor: `color-mix(in srgb, ${tone.color} 30%, transparent)` }}
        dir="ltr"
      >
        {chip.label}
      </div>
    </div>
  );
}

export function AICoreOrbit({
  children,
  caption,
  satellite,
}: {
  children: ReactNode;
  caption?: ReactNode;
  /// صورة تانية اختيارية (لو الأدمن رافع صورتين) - بتطفو في ركن المشهد
  satellite?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[20rem] h-[20rem] sm:w-[28rem] sm:h-[28rem] lg:w-[33rem] lg:h-[33rem]">
        {/* الشبكة العصبية في الخلفية */}
        <svg viewBox="0 0 400 400" className="absolute inset-0 w-full h-full" aria-hidden="true">
          <g style={{ stroke: "var(--color-primary)" }} strokeOpacity="0.18" strokeWidth="1.2" fill="none">
            <path d="M30 115 200 200 370 85M50 305 200 200 350 320M200 10 200 200 200 390M10 210 200 200 390 220" />
          </g>
          <g style={{ stroke: "var(--color-accent)" }} strokeWidth="2.5" strokeLinecap="round" fill="none">
            <path className="signal-flow" d="M30 115 200 200" />
            <path className="signal-flow" d="M370 85 200 200" style={{ animationDelay: "-0.9s" }} />
            <path className="signal-flow" d="M50 305 200 200" style={{ animationDelay: "-1.7s" }} />
            <path className="signal-flow" d="M350 320 200 200" style={{ animationDelay: "-2.3s" }} />
          </g>
          <g style={{ fill: "var(--color-primary)" }}>
            {[
              [30, 115],
              [370, 85],
              [50, 305],
              [350, 320],
              [200, 10],
              [200, 390],
              [10, 210],
              [390, 220],
            ].map(([cx, cy], i) => (
              <circle key={i} cx={cx} cy={cy} r="5" className="node-pulse" style={{ animationDelay: `${i * -0.33}s` }} />
            ))}
          </g>
        </svg>

        {/* المدار الخارجي */}
        <div className="absolute inset-0 orbit-spin-slow">
          <div className="absolute inset-[1%] rounded-full border border-dashed" style={{ borderColor: "color-mix(in srgb, var(--color-primary) 30%, transparent)" }} />
          <div className="absolute inset-[1%]">
            {OUTER.map((c, i) => (
              <OrbitChip key={i} chip={c} size={46} />
            ))}
          </div>
        </div>

        {/* المدار الداخلي */}
        <div className="absolute inset-[11%] orbit-spin">
          <div className="absolute inset-0 rounded-full border" style={{ borderColor: "color-mix(in srgb, var(--color-accent) 35%, transparent)" }} />
          {INNER.map((c, i) => (
            <OrbitChip key={i} chip={c} size={50} />
          ))}
        </div>

        {/* النواة: صورة المدرّس كبيرة، حواليها حلقة ألوان بتلف */}
        <div className="absolute inset-[19%]">
          {/* توهّج ناعم ورا الصورة */}
          <div className="absolute -inset-6 rounded-full opacity-50 blur-2xl animate-pulse-glow" style={{ background: "var(--gradient-brand)" }} />
          {/* الحلقة الملوّنة اللي بتلف */}
          <div
            className="absolute -inset-[6px] rounded-full orbit-spin"
            style={{
              animationDuration: "7s",
              background:
                "conic-gradient(from 0deg, var(--color-primary), var(--color-accent), var(--color-spark), color-mix(in srgb, var(--color-primary) 40%, transparent), var(--color-primary))",
            }}
            aria-hidden="true"
          />
          <div className="relative w-full h-full rounded-full p-[5px] bg-canvas">
            <div className="w-full h-full rounded-full overflow-hidden bg-surface grid place-items-center">{children}</div>
          </div>
        </div>

        {/* كروت صغيرة طايرة حوالين الصورة (من التابلت وأكبر - على الموبايل كانت بتغطي الصورة) */}
        <div className="hidden sm:block absolute top-[13%] sm:start-[-4%] animate-float-card" aria-hidden="true">
          <div className="rounded-2xl border border-border bg-surface/90 backdrop-blur-md shadow-elevated px-3.5 py-2.5" dir="ltr">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-[#ff5f56]" />
              <span className="w-2 h-2 rounded-full bg-[#ffbd2e]" />
              <span className="w-2 h-2 rounded-full bg-[#27c93f]" />
            </div>
            <p className="font-mono text-xs sm:text-sm text-ink">
              <span style={{ color: "var(--color-primary)" }}>ai</span>.learn(
              <span style={{ color: "var(--color-spark)" }}>&quot;python&quot;</span>)
            </p>
          </div>
        </div>

        <div
          className="hidden sm:block absolute bottom-[14%] sm:end-[-5%] animate-float-card"
          style={{ animationDelay: "-2.5s" }}
          aria-hidden="true"
        >
          <div className="flex items-center gap-2.5 rounded-2xl border border-border bg-surface/90 backdrop-blur-md shadow-elevated ps-2.5 pe-4 py-2.5">
            <span className="grid place-items-center w-9 h-9 rounded-xl bg-accent-soft text-accent">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.4}>
                <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span>
              <span className="block text-sm font-bold text-ink leading-tight">تصحيح فوري</span>
              <span className="block text-xs text-ink-soft">لكل اختبار</span>
            </span>
          </div>
        </div>

        {satellite && (
          <div className="absolute top-[2%] end-[2%] w-20 h-20 sm:w-24 sm:h-24 rounded-3xl overflow-hidden border-4 border-surface shadow-elevated animate-float-card bg-surface grid place-items-center">
            {satellite}
          </div>
        )}
      </div>

      {/* الاسم تحت المشهد مباشرة (مش فوقه) عشان مايغطّيش رموز المدار */}
      {caption && <div className="mt-7 relative z-10">{caption}</div>}
    </div>
  );
}
