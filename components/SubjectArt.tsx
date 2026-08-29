/// غلاف بصري مولَّد للمواد الدراسية (البرمجة / الذكاء الاصطناعي).
/// بدل الاعتماد على صور مرفوعة يدويًا لكل درس (تكلفة إدارية على الأدمن)،
/// نولّد غلافًا مميزًا يعبّر عن محتوى المادة فعليًا: شاشة كود متحركة
/// للبرمجة، وشبكة عصبية للذكاء الاصطناعي - بألوان هوية المنصة نفسها،
/// ويتكيف تلقائيًا مع الوضع الداكن لأنه مبني على متغيرات CSS.

export type SubjectLike = { slug?: string | null; name?: string | null } | string | null | undefined;

function resolveSlug(subject: SubjectLike): string {
  if (!subject) return "programming";
  const raw = typeof subject === "string" ? subject : subject.slug ?? subject.name ?? "";
  return raw.toLowerCase().includes("ai") || raw.includes("ذكاء") ? "ai" : "programming";
}

export function subjectTheme(subject: SubjectLike) {
  const slug = resolveSlug(subject);
  if (slug === "ai") {
    return {
      slug,
      gradient: "linear-gradient(135deg, var(--color-accent) 0%, #14b8a6 45%, var(--color-primary-dim) 130%)",
      solid: "var(--color-accent)",
      soft: "var(--color-accent-soft)",
      ring: "color-mix(in srgb, var(--color-accent) 35%, var(--color-border))",
    };
  }
  return {
    slug,
    gradient: "var(--gradient-brand)",
    solid: "var(--color-primary)",
    soft: "var(--color-primary-soft)",
    ring: "color-mix(in srgb, var(--color-primary) 35%, var(--color-border))",
  };
}

/// أيقونة مصغّرة (لشارات/صفوف مضغوطة) - قوسا كود `</>` للبرمجة، شبكة عصبية للذكاء الاصطناعي
export function SubjectGlyph({ subject, className }: { subject: SubjectLike; className?: string }) {
  const { slug } = subjectTheme(subject);
  if (slug === "ai") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="5" cy="6" r="2" fill="currentColor" />
        <circle cx="5" cy="18" r="2" fill="currentColor" />
        <circle cx="12" cy="12" r="2.3" fill="currentColor" />
        <circle cx="19" cy="6" r="2" fill="currentColor" />
        <circle cx="19" cy="18" r="2" fill="currentColor" />
        <path
          d="M6.7 7 10 11M6.7 17l3.3-4M13.7 11l3.6-4M13.7 13l3.6 4"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M8.5 6 3 12l5.5 6M15.5 6 21 12l-5.5 6M13.2 4.5 10.8 19.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/// غلاف بصري كامل (يُستخدم كخلفية بطاقة/بانر) - تدرّج + رسم زخرفي + أيقونة مركزية كبيرة.
/// variant يعطي تنويعًا بسيطًا في تموضع الزخارف بين البطاقات بنفس المادة، حتى لا تبدو متطابقة تمامًا.
export function SubjectCoverArt({
  subject,
  variant = 0,
  className,
}: {
  subject: SubjectLike;
  variant?: number;
  className?: string;
}) {
  const theme = subjectTheme(subject);
  const shift = (variant % 3) * 14;

  return (
    <div
      className={`relative overflow-hidden ${className ?? ""}`}
      style={{ background: theme.gradient }}
      aria-hidden="true"
    >
      {/* أشكال زخرفية عائمة */}
      <div
        className="absolute rounded-full bg-white/10 blur-md"
        style={{ width: 90, height: 90, top: -30 + shift * 0.4, insetInlineEnd: -20 - shift }}
      />
      <div
        className="absolute rounded-full bg-black/10 blur-lg"
        style={{ width: 60, height: 60, bottom: -20, insetInlineStart: 10 + shift }}
      />

      {theme.slug === "ai" ? (
        <svg viewBox="0 0 200 120" className="absolute inset-0 w-full h-full opacity-90">
          <g stroke="white" strokeOpacity="0.28" strokeWidth="1.2">
            <line x1={30 + shift * 0.5} y1="30" x2="100" y2="60" />
            <line x1="100" y1="60" x2={170 - shift * 0.5} y2="25" />
            <line x1="100" y1="60" x2={40 + shift * 0.3} y2="95" />
            <line x1="100" y1="60" x2={160} y2="95" />
            <line x1={30 + shift * 0.5} y1="30" x2={40 + shift * 0.3} y2="95" />
          </g>
          <g fill="white">
            <circle cx={30 + shift * 0.5} cy="30" r="4" fillOpacity="0.55" />
            <circle cx="100" cy="60" r="7" fillOpacity="0.85" />
            <circle cx={170 - shift * 0.5} cy="25" r="4" fillOpacity="0.5" />
            <circle cx={40 + shift * 0.3} cy="95" r="4" fillOpacity="0.5" />
            <circle cx="160" cy="95" r="4" fillOpacity="0.5" />
          </g>
        </svg>
      ) : (
        <svg viewBox="0 0 200 120" className="absolute inset-0 w-full h-full opacity-90">
          <g fill="white" fillOpacity="0.16" fontFamily="var(--font-mono)" fontSize="11">
            <text x={14 + shift * 0.4} y="28">{"const ai ="}</text>
            <text x={26 + shift * 0.3} y="46">{"learn();"}</text>
            <text x={14 + shift * 0.5} y="64">{"if (skill) {"}</text>
            <text x={30 + shift * 0.2} y="82">{"grow++;"}</text>
            <text x={14 + shift * 0.4} y="100">{"}"}</text>
          </g>
        </svg>
      )}

      <div className="absolute inset-0 flex items-center justify-center">
        <SubjectGlyph subject={subject} className="w-11 h-11 text-white drop-shadow-md" />
      </div>
    </div>
  );
}
