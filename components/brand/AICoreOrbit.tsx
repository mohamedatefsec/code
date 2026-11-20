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
    <div className="relative w-[19rem] h-[19rem] sm:w-[27rem] sm:h-[27rem] mx-auto">
      {/* الشبكة العصبية في الخلفية */}
      <svg viewBox="0 0 400 400" className="absolute inset-0 w-full h-full" aria-hidden="true">
        <g style={{ stroke: "var(--color-primary)" }} strokeOpacity="0.18" strokeWidth="1.2" fill="none">
          <path d="M40 120 200 200 360 90M60 300 200 200 340 320M200 30 200 200 200 380M20 210 200 200 380 220" />
        </g>
        <g style={{ stroke: "var(--color-accent)" }} strokeWidth="2.5" strokeLinecap="round" fill="none">
          <path className="signal-flow" d="M40 120 200 200" />
          <path className="signal-flow" d="M360 90 200 200" style={{ animationDelay: "-0.9s" }} />
          <path className="signal-flow" d="M60 300 200 200" style={{ animationDelay: "-1.7s" }} />
          <path className="signal-flow" d="M340 320 200 200" style={{ animationDelay: "-2.3s" }} />
        </g>
        <g style={{ fill: "var(--color-primary)" }}>
          {[
            [40, 120],
            [360, 90],
            [60, 300],
            [340, 320],
            [200, 30],
            [200, 380],
            [20, 210],
            [380, 220],
          ].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="5" className="node-pulse" style={{ animationDelay: `${i * -0.33}s` }} />
          ))}
        </g>
      </svg>

      {/* المدار الخارجي */}
      <div className="absolute inset-0 orbit-spin-slow">
        <div className="absolute inset-[4%] rounded-full border border-dashed" style={{ borderColor: "color-mix(in srgb, var(--color-primary) 30%, transparent)" }} />
        <div className="absolute inset-[4%]">
          {OUTER.map((c, i) => (
            <OrbitChip key={i} chip={c} size={44} />
          ))}
        </div>
      </div>

      {/* المدار الداخلي */}
      <div className="absolute inset-[17%] orbit-spin">
        <div className="absolute inset-0 rounded-full border" style={{ borderColor: "color-mix(in srgb, var(--color-accent) 35%, transparent)" }} />
        {INNER.map((c, i) => (
          <OrbitChip key={i} chip={c} size={48} />
        ))}
      </div>

      {/* النواة: صورة المدرّس */}
      <div className="absolute inset-[30%]">
        <div className="absolute -inset-3 rounded-full opacity-60 blur-xl animate-pulse-glow" style={{ background: "var(--gradient-brand)" }} />
        <div className="relative w-full h-full rounded-full p-[3px]" style={{ background: "var(--gradient-brand)" }}>
          <div className="w-full h-full rounded-full overflow-hidden bg-surface grid place-items-center">{children}</div>
        </div>
      </div>

      {satellite && (
        <div className="absolute top-[2%] end-[0%] w-20 h-20 sm:w-28 sm:h-28 rounded-3xl overflow-hidden border-4 border-surface shadow-elevated animate-float-card bg-surface grid place-items-center">
          {satellite}
        </div>
      )}

      {caption && <div className="absolute -bottom-2 inset-x-0 flex justify-center">{caption}</div>}
    </div>
  );
}
