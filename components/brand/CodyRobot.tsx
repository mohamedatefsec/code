/// "كودي" - الروبوت المساعد الخاص بالمنصة (رسم أصلي بالكامل).
/// رسم SVG متحرك بـ CSS فقط (بدون JavaScript)، فيشتغل في أي صفحة سيرفر أو عميل،
/// وبيحترم إعداد "تقليل الحركة" في جهاز المستخدم تلقائيًا (من globals.css).
/// الألوان من متغيرات الهوية، فلو الأدمن غيّر لون المنصة من الإعدادات الروبوت بيتغيّر معاها.

export function CodyRobot({
  className = "w-48 h-56",
  wave = true,
  onDark = false,
  idPrefix = "cody",
}: {
  className?: string;
  /// تلويحة الإيد (ترحيب). نوقفها في الأماكن اللي محتاجة هدوء أكتر.
  wave?: boolean;
  /// على خلفية داكنة/متدرّجة بنفتّح جسم الروبوت شوية عشان يبان
  onDark?: boolean;
  /// معرّف فريد للتدرّجات: لازم يختلف لو فيه أكتر من روبوت في نفس الصفحة،
  /// لأن روبوت مخفي (display:none) بيبوّظ تدرّجات أي روبوت تاني بنفس المعرّف.
  idPrefix?: string;
}) {
  const id = (n: string) => `${idPrefix}-${n}`;
  const body = onDark ? "rgba(255,255,255,0.96)" : "var(--color-surface)";
  const bodyStroke = onDark ? "rgba(255,255,255,0.35)" : "var(--color-border)";

  return (
    <svg viewBox="0 0 200 230" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={id("visor")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#141a44" />
          <stop offset="1" stopColor="#0a0d26" />
        </linearGradient>
        <linearGradient id={id("brand")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: "var(--color-primary)" }} />
          <stop offset="1" style={{ stopColor: "var(--color-accent)" }} />
        </linearGradient>
        <radialGradient id={id("eye")} cx="0.5" cy="0.4" r="0.6">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.45" stopColor="#7ff5e6" />
          <stop offset="1" style={{ stopColor: "var(--color-accent)" }} />
        </radialGradient>
      </defs>

      {/* ظل على الأرض بيتنفّس مع حركة الطفو */}
      <ellipse className="robot-shadow" cx="100" cy="218" rx="46" ry="7" fill="#0e1330" />

      <g className="robot-bob">
        {/* الهوائي */}
        <line x1="100" y1="34" x2="100" y2="16" style={{ stroke: bodyStroke }} strokeWidth="4" strokeLinecap="round" />
        <circle cx="100" cy="13" r="7" style={{ fill: "var(--color-spark)" }} className="animate-pulse-glow" />
        <circle cx="100" cy="13" r="12" style={{ fill: "var(--color-spark)" }} opacity="0.18" className="node-pulse" />

        {/* الرأس */}
        <rect x="42" y="32" width="116" height="88" rx="30" style={{ fill: body, stroke: bodyStroke }} strokeWidth="2" />
        <rect x="56" y="46" width="88" height="58" rx="20" fill={`url(#${id("visor")})`} />
        {/* العيون */}
        <g className="robot-eye">
          <ellipse cx="82" cy="74" rx="9" ry="10" fill={`url(#${id("eye")})`} />
        </g>
        <g className="robot-eye">
          <ellipse cx="118" cy="74" rx="9" ry="10" fill={`url(#${id("eye")})`} />
        </g>
        {/* ابتسامة */}
        <path d="M89 92q11 7 22 0" stroke="#7ff5e6" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.85" />
        {/* الأذنين */}
        <rect x="32" y="62" width="12" height="28" rx="6" fill={`url(#${id("brand")})`} />
        <rect x="156" y="62" width="12" height="28" rx="6" fill={`url(#${id("brand")})`} />

        {/* الرقبة */}
        <rect x="88" y="118" width="24" height="10" rx="4" style={{ fill: bodyStroke }} />

        {/* الجسم */}
        <rect x="58" y="126" width="84" height="70" rx="24" fill={`url(#${id("brand")})`} />
        <rect x="74" y="142" width="52" height="34" rx="10" fill="rgba(255,255,255,0.16)" />
        <text
          x="100"
          y="165"
          textAnchor="middle"
          style={{ fontFamily: "var(--font-mono), monospace" }}
          fontSize="15"
          fontWeight="700"
          fill="#ffffff"
          direction="ltr"
        >
          {"</>"}
        </text>

        {/* الدراع الثابت */}
        <rect x="140" y="136" width="16" height="44" rx="8" fill={`url(#${id("brand")})`} />
        {/* الدراع اللي بيلوّح */}
        <g className={wave ? "robot-wave" : undefined}>
          <rect x="44" y="104" width="16" height="44" rx="8" fill={`url(#${id("brand")})`} transform="rotate(28 52 146)" />
          <circle cx="40" cy="108" r="9" style={{ fill: body, stroke: bodyStroke }} strokeWidth="2" />
        </g>
      </g>
    </svg>
  );
}
