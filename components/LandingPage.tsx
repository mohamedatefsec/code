import Link from "next/link";
import { db } from "@/lib/db";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TeacherPhoto } from "@/components/TeacherPhoto";
import { Avatar } from "@/components/Avatar";
import { getPrimaryAdminBrand } from "@/lib/settings";
import { normalizeWhatsappLink } from "@/lib/social-links";
import { safeHttpUrl } from "@/lib/safe-url";
import { AICoreOrbit } from "@/components/brand/AICoreOrbit";
import { TerminalTyper } from "@/components/brand/TerminalTyper";
import { LearningJourney } from "@/components/brand/LearningJourney";
import { CodyRobot } from "@/components/brand/CodyRobot";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { SubjectCoverArt } from "@/components/SubjectArt";

async function getLandingData() {
  const [settings, adminBrand, studentCount, lessonCount, quizCount, subjects] = await Promise.all([
    db.settings.findFirst(),
    getPrimaryAdminBrand(),
    db.studentProfile.count(),
    db.lesson.count({ where: { status: "published" } }),
    db.quiz.count({ where: { status: "published" } }),
    db.subject.findMany({
      orderBy: { order: "asc" },
      include: {
        _count: {
          select: {
            units: { where: { status: "published" } },
          },
        },
        units: {
          where: { status: "published" },
          select: { _count: { select: { lessons: { where: { status: "published" } } } } },
        },
      },
    }),
  ]);

  return { settings, adminBrand, studentCount, lessonCount, quizCount, subjects };
}

type Feature = { icon: string; title: string; desc: string };

/// موضوعات المسار - بتعدّي في شريط متحرك تحت الهيرو
const TOPICS = [
  "Python",
  "التفكير المنطقي",
  "الخوارزميات",
  "الذكاء الاصطناعي",
  "تعلّم الآلة",
  "حل المشكلات",
  "الشبكات العصبية",
  "كتابة الأكواد",
];

const TERMINAL_LINES = ['print("أهلًا يا مبرمج")', "ai.learn(topic='python')", "quiz.start()  # بالتوفيق"];

function SocialIcon({ kind }: { kind: "facebook" | "instagram" | "youtube" | "whatsapp" }) {
  const common = { viewBox: "0 0 24 24", className: "w-5 h-5", fill: "currentColor", "aria-hidden": true } as const;
  if (kind === "facebook")
    return (
      <svg {...common}>
        <path d="M13.5 21v-7.5H16l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4A21 21 0 0 0 14.3 4C12 4 10.5 5.4 10.5 8v2.5H8v3h2.5V21h3Z" />
      </svg>
    );
  if (kind === "instagram")
    return (
      <svg {...common} fill="none" stroke="currentColor" strokeWidth={1.8}>
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r="1" fill="currentColor" />
      </svg>
    );
  if (kind === "youtube")
    return (
      <svg {...common}>
        <path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10 15V9l5.2 3L10 15Z" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3Zm4.6 12.6c-.2.6-1.2 1.2-1.7 1.2-.4.1-1 .1-1.6-.1a14.5 14.5 0 0 1-1.5-.6 11.5 11.5 0 0 1-4.4-3.9c-.3-.5-1-1.4-1-2.6s.6-1.8.9-2.1c.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 1.9c.1.1.1.3 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.2 1.6 2 1.1 1 2 1.3 2.3 1.4.3.2.5.1.6 0l.9-1c.2-.3.4-.2.6-.1l1.8.8c.3.2.4.2.5.4 0 .1 0 .6-.2 1.2Z" />
    </svg>
  );
}

const DEFAULT_FEATURES: Feature[] = [
  { icon: "📚", title: "محتوى منظّم", desc: "دروس مقسّمة لوحدات واضحة، بفيديوهات وملفات وشرح مكتوب." },
  { icon: "❓", title: "بنك أسئلة متنوع", desc: "اختيار من متعدد، صح وخطأ، ترتيب، أسئلة برمجية، وأسئلة مقالية." },
  { icon: "⏱️", title: "اختبارات فورية", desc: "تصحيح تلقائي لحظة التسليم، ونتيجة تفصيلية لكل سؤال." },
  { icon: "🏆", title: "تحفيز مستمر", desc: "شارات إنجاز وإشعارات تبقيك متابعًا لتقدّمك أول بأول." },
];

export default async function LandingPage() {
  const { settings, adminBrand, studentCount, lessonCount, quizCount, subjects } = await getLandingData();

  // صورة صاحب المنصة بدل علامة ">_" في الهيدر: نفس صورة الأدمن المستخدمة في صفحة
  // تسجيل الدخول وشريط الطالب، وإلا صورة المدرّس من الإعدادات، وإلا العلامة الأصلية.
  const ownerPhotoUrl = adminBrand.avatarUrl || settings?.teacherPhotoUrl || null;
  const ownerName = adminBrand.fullName || settings?.teacherName || settings?.platformName || "Code AI";

  const platformName = settings?.platformName ?? "Code AI";
  const headline = settings?.heroHeadline ?? "تعلم البرمجة والذكاء الاصطناعي";
  const subheadline = settings?.welcomeMessage ?? "";
  const description =
    settings?.description ??
    "منصة تعليمية بسيطة ومخصّصة لطلاب المرحلة الثانوية، بدروس وتدريبات واختبارات تفاعلية.";
  const badges = Array.isArray(settings?.heroBadges) ? (settings.heroBadges as string[]) : [];
  const teacherName = settings?.teacherName;
  const teacherPhotoUrl = settings?.teacherPhotoUrl;
  const teacherPhotoUrl2 = settings?.teacherPhotoUrl2;
  const hasSecondPhoto = Boolean(teacherPhotoUrl2);
  const contactInfo = (settings?.contactInfo as { email?: string; phone?: string } | null) ?? null;
  const socialLinks =
    (settings?.socialLinks as
      | { facebook?: string; instagram?: string; youtube?: string; whatsapp?: string }
      | null) ?? null;
  const footerText = settings?.footerText;
  const featuresTitle = settings?.featuresTitle || `ليه ${platformName}؟`;
  const features =
    Array.isArray(settings?.features) && (settings.features as Feature[]).length > 0
      ? (settings.features as Feature[])
      : DEFAULT_FEATURES;

  const visibleSubjects = subjects.filter((s) => s._count.units > 0);
  const stats = [
    { label: "طالب مسجّل", value: studentCount },
    { label: "درس متاح", value: lessonCount },
    { label: "اختبار منشور", value: quizCount },
  ];

  const lessonsLabel = (n: number) => (n === 1 ? "درس واحد" : n === 2 ? "درسين" : `${n} دروس`);
  const unitsLabel = (n: number) => (n === 1 ? "وحدة واحدة" : n === 2 ? "وحدتين" : `${n} وحدات`);

  const socials = socialLinks
    ? ([
        { kind: "facebook", label: "فيسبوك", href: safeHttpUrl(socialLinks.facebook) },
        { kind: "instagram", label: "إنستجرام", href: safeHttpUrl(socialLinks.instagram) },
        { kind: "youtube", label: "يوتيوب", href: safeHttpUrl(socialLinks.youtube) },
        { kind: "whatsapp", label: "واتساب", href: normalizeWhatsappLink(socialLinks.whatsapp) },
      ] as const).filter((x) => Boolean(x.href))
    : [];
  const hasContact = Boolean(contactInfo?.email || contactInfo?.phone || socials.length > 0);

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      {/* ===== Navbar ===== */}
      <header className="sticky top-0 z-30 glass-surface border-b border-border/70">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-5 sm:px-6 py-3">
          <a href="#top" className="flex items-center gap-2.5 min-w-0">
            {ownerPhotoUrl ? (
              <Avatar name={ownerName} avatarUrl={ownerPhotoUrl} size={40} />
            ) : (
              <span className="grid place-items-center w-10 h-10 rounded-xl bg-gradient-brand text-white font-mono font-bold shadow-glow" dir="ltr">
                {">_"}
              </span>
            )}
            <span className="font-display font-bold text-lg sm:text-xl truncate">{platformName}</span>
          </a>
          <nav className="hidden md:flex items-center gap-1 text-base text-ink-soft">
            <a href="#journey" className="rounded-lg px-3.5 py-2 hover:text-ink hover:bg-surface-2 transition-colors">إزاي بتتعلم</a>
            {visibleSubjects.length > 0 && (
              <a href="#subjects" className="rounded-lg px-3.5 py-2 hover:text-ink hover:bg-surface-2 transition-colors">المسارات</a>
            )}
            <a href="#about" className="rounded-lg px-3.5 py-2 hover:text-ink hover:bg-surface-2 transition-colors">عن المنصة</a>
            {hasContact && (
              <a href="#contact" className="rounded-lg px-3.5 py-2 hover:text-ink hover:bg-surface-2 transition-colors">تواصل معنا</a>
            )}
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="rounded-xl bg-gradient-brand px-5 py-2.5 text-base font-semibold text-white shadow-glow hover:brightness-110 transition active:scale-[0.98]"
            >
              تسجيل الدخول
            </Link>
          </div>
        </div>
      </header>

      {/* ===== Hero ===== */}
      <section id="top" className="relative isolate">
        <div className="aurora" aria-hidden="true" />
        <div className="absolute inset-0 -z-0 bg-circuit-dots opacity-60 [mask-image:radial-gradient(ellipse_at_center,#000_30%,transparent_75%)]" aria-hidden="true" />

        <div className="relative max-w-6xl mx-auto px-5 sm:px-6 pt-12 pb-16 sm:pt-20 sm:pb-24 grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-8 items-center">
          <div className="text-center lg:text-start animate-fade-in-up">
            <div className="inline-flex items-center rounded-full border border-border bg-surface/80 backdrop-blur px-4 py-2 text-sm text-ink shadow-elevated">
              <TerminalTyper lines={TERMINAL_LINES} />
            </div>

            <h1 className="mt-6 text-[2.6rem] leading-[1.15] sm:text-6xl sm:leading-[1.12] font-bold text-ink text-balance">
              {headline}
            </h1>
            {subheadline && (
              <p className="mt-5 text-xl sm:text-2xl text-gradient-brand font-display font-bold">{subheadline}</p>
            )}
            <p className="mt-5 text-lg text-ink-soft leading-8 max-w-xl mx-auto lg:mx-0">{description}</p>

            {badges.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-2 justify-center lg:justify-start">
                {badges.map((b, i) => (
                  <li
                    key={i}
                    className="inline-flex items-center gap-2 rounded-full bg-accent-soft text-accent px-4 py-2 text-base font-semibold"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.4} aria-hidden="true">
                      <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {b}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-8 flex flex-wrap gap-3 justify-center lg:justify-start">
              <Link
                href="/login"
                className="btn-shine rounded-2xl bg-gradient-brand px-8 py-4 text-lg font-bold text-white shadow-glow hover:brightness-110 transition active:scale-[0.98]"
              >
                ابدأ رحلتك الآن
              </Link>
              <a
                href="#journey"
                className="rounded-2xl border border-border bg-surface/70 backdrop-blur px-7 py-4 text-lg font-semibold text-ink hover:border-primary/40 hover:text-primary transition-colors"
              >
                اعرف المنصة بتشتغل إزاي
              </a>
            </div>

            {(lessonCount > 0 || quizCount > 0) && (
              <dl className="mt-10 grid grid-cols-3 max-w-md mx-auto lg:mx-0 divide-x divide-x-reverse divide-border rounded-2xl border border-border bg-surface/80 backdrop-blur shadow-elevated">
                {stats.map((s) => (
                  <div key={s.label} className="px-3 py-4 text-center">
                    <dd className="stat-figure text-2xl sm:text-3xl font-bold text-primary">
                      <AnimatedNumber value={s.value} />
                    </dd>
                    <dt className="text-sm text-ink-soft mt-1">{s.label}</dt>
                  </div>
                ))}
              </dl>
            )}
          </div>

          {/* النواة الذكية حوالين صورة المدرّس */}
          <div className="animate-scale-in" style={{ animationDelay: "0.15s" }}>
            <AICoreOrbit
              satellite={
                hasSecondPhoto && teacherPhotoUrl ? (
                  <TeacherPhoto src={teacherPhotoUrl2 ?? null} alt={teacherName ?? platformName} />
                ) : null
              }
              caption={
                teacherName ? (
                  <span className="block rounded-2xl bg-surface/90 backdrop-blur border border-border shadow-elevated px-6 py-2.5 text-center">
                    <span className="block font-display font-bold text-lg text-ink">{teacherName}</span>
                    <span className="block text-sm text-ink-soft">معلّم البرمجة والذكاء الاصطناعي</span>
                  </span>
                ) : null
              }
            >
              <TeacherPhoto src={teacherPhotoUrl ?? teacherPhotoUrl2 ?? null} alt={teacherName ?? platformName} />
            </AICoreOrbit>
          </div>
        </div>

        {/* شريط الموضوعات المتحرك */}
        <div className="relative border-y border-border bg-surface/70 backdrop-blur py-4 marquee-mask overflow-hidden" aria-label="موضوعات المسار">
          <div className="marquee-track flex w-max gap-3">
            {[...TOPICS, ...TOPICS].map((t, i) => (
              <span
                key={i}
                aria-hidden={i >= TOPICS.length}
                className="shrink-0 rounded-full border border-border bg-surface px-5 py-2 text-base font-semibold text-ink-soft"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ===== رحلة الطالب ===== */}
      <section id="journey" className="max-w-6xl mx-auto px-5 sm:px-6 py-20 w-full scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-ink">من أول درس لحد الشارة</h2>
          <p className="mt-4 text-lg text-ink-soft leading-8">
            أربع خطوات واضحة بتتكرر مع كل درس، وكل خطوة بتتسجّل في لوحتك عشان تشوف تقدّمك بعينك.
          </p>
        </div>
        <LearningJourney />
      </section>

      {/* ===== مولّد الأسئلة الذكي ===== */}
      <section className="relative isolate py-20 overflow-hidden" style={{ background: "var(--color-sidebar)" }}>
        <div className="aurora" aria-hidden="true" />
        <div className="relative max-w-6xl mx-auto px-5 sm:px-6 grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-start">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 text-[#7ff5e6] px-4 py-1.5 text-sm font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#7ff5e6] animate-pulse-glow" aria-hidden="true" />
              مدعوم بالذكاء الاصطناعي
            </span>
            <h2 className="mt-5 text-3xl sm:text-4xl font-bold text-white">مولّد أسئلة ذكي لكل درس</h2>
            <p className="mt-4 text-lg leading-8 max-w-lg mx-auto lg:mx-0" style={{ color: "var(--color-sidebar-text)" }}>
              المعلّم بيكتب الموضوع، والذكاء الاصطناعي بيقترح أسئلة متنوعة، والمعلّم بيراجعها بنفسه قبل ما توصلك —
              نفس الأدوات اللي هتتعلم تبنيها في مسار الذكاء الاصطناعي.
            </p>
            <ul className="mt-7 space-y-3 text-base max-w-lg mx-auto lg:mx-0 text-white/85">
              {[
                "اختيار من متعدد، صح وخطأ، ترتيب، وأسئلة برمجية",
                "مستويات صعوبة متدرّجة حسب كل درس",
                "مراجعة بشرية قبل النشر دايمًا",
              ].map((t) => (
                <li key={t} className="flex items-center gap-3 justify-center lg:justify-start">
                  <span className="grid place-items-center w-6 h-6 rounded-full bg-[#7ff5e6]/15 text-[#7ff5e6] shrink-0">
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={3} aria-hidden="true">
                      <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* نافذة الكود + الأسئلة اللي "بتتولّد" */}
          <div className="relative mx-auto w-full max-w-md">
            <div className="rounded-2xl overflow-hidden border shadow-2xl" style={{ background: "#0a0d24", borderColor: "var(--color-sidebar-border)" }}>
              <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "var(--color-sidebar-border)" }}>
                <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
                <span className="ms-2 text-xs font-mono" style={{ color: "var(--color-sidebar-text)" }} dir="ltr">
                  ai_generator.py
                </span>
              </div>
              <pre dir="ltr" className="px-5 py-5 text-sm leading-7 font-mono overflow-x-auto text-start" style={{ color: "var(--color-sidebar-text)" }}>
                <code>
                  <span className="text-[#a5b4fc]">def</span> <span className="text-[#7ff5e6]">generate_quiz</span>
                  {"(topic, level):\n"}
                  <span className="text-[#6b7399]">{"    # يولّد أسئلة جاهزة للمراجعة\n"}</span>
                  {"    questions = ai.create(\n        topic=topic,\n        difficulty=level,\n        status="}
                  <span className="text-[#fcd34d]">&quot;draft&quot;</span>
                  {"\n    )\n    "}
                  <span className="text-[#a5b4fc]">return</span>
                  {" questions"}
                </code>
              </pre>
            </div>
            <div className="mt-4 space-y-2.5" aria-hidden="true">
              {["سؤال اختيار من متعدد", "سؤال صح وخطأ", "سؤال توقّع ناتج الكود"].map((q, i) => (
                <div
                  key={q}
                  className="flex items-center gap-3 rounded-xl bg-white/[0.06] border border-white/10 px-4 py-3 text-sm text-white/90 animate-fade-in-up"
                  style={{ animationDelay: `${0.6 + i * 0.5}s` }}
                >
                  <span className="w-2 h-2 rounded-full bg-[#7ff5e6] node-pulse" style={{ animationDelay: `${i * -0.5}s` }} />
                  {q}
                  <span className="ms-auto rounded-md bg-[#fcd34d]/15 text-[#fcd34d] px-2 py-0.5 text-xs font-semibold">مسودة</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== المسارات ===== */}
      {visibleSubjects.length > 0 && (
        <section id="subjects" className="max-w-6xl mx-auto px-5 sm:px-6 py-20 w-full scroll-mt-20">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-ink">المسارات التعليمية</h2>
            <p className="text-lg text-ink-soft mt-4">اختار المسار اللي يناسبك وابدأ من أول درس.</p>
          </div>
          <div className="mt-12 grid sm:grid-cols-2 gap-6">
            {visibleSubjects.map((s, i) => {
              const lessonsInSubject = s.units.reduce((sum, u) => sum + u._count.lessons, 0);
              return (
                <Link
                  key={s.id}
                  href="/login"
                  className="group rounded-3xl border border-border bg-surface overflow-hidden shadow-elevated hover:border-primary/40 transition-colors"
                >
                  <SubjectCoverArt subject={s} variant={i} className="h-36 w-full" />
                  <div className="p-6 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-display font-bold text-2xl text-ink">{s.name}</p>
                      <p className="text-base text-ink-soft mt-1.5">
                        {unitsLabel(s._count.units)}، {lessonsLabel(lessonsInSubject)}
                      </p>
                    </div>
                    <span className="grid place-items-center w-11 h-11 rounded-full bg-primary-soft text-primary transition-transform group-hover:-translate-x-1">
                      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden="true">
                        <path d="M15 6 9 12l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ===== المميزات ===== */}
      <section id="about" className="bg-surface-2 border-y border-border scroll-mt-20">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 py-20">
          <h2 className="text-3xl sm:text-4xl font-bold text-ink text-center">{featuresTitle}</h2>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) =>
              i === 0 ? (
                <div
                  key={i}
                  className="relative isolate overflow-hidden rounded-3xl p-8 border-gradient shadow-glow sm:col-span-2 lg:col-span-1 lg:row-span-3 flex flex-col justify-end min-h-[16rem]"
                >
                  <div className="absolute inset-0 -z-10 bg-circuit-dots opacity-50 [mask-image:linear-gradient(to_bottom,#000,transparent_70%)]" aria-hidden="true" />
                  <span className="grid place-items-center w-16 h-16 text-4xl rounded-2xl bg-primary-soft animate-float-card" aria-hidden="true">
                    {f.icon}
                  </span>
                  <p className="font-display font-bold text-2xl text-ink mt-6">{f.title}</p>
                  <p className="text-lg text-ink-soft mt-2 leading-8">{f.desc}</p>
                </div>
              ) : (
                <div key={i} className="rounded-3xl border border-border bg-surface p-6 sm:col-span-1 lg:col-span-2 flex items-start gap-5">
                  <span className="grid place-items-center w-12 h-12 shrink-0 text-2xl rounded-2xl bg-surface-2" aria-hidden="true">
                    {f.icon}
                  </span>
                  <div>
                    <p className="font-display font-bold text-lg text-ink">{f.title}</p>
                    <p className="text-base text-ink-soft mt-1.5 leading-7">{f.desc}</p>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* ===== دعوة أخيرة مع كودي ===== */}
      <section className="max-w-6xl mx-auto px-5 sm:px-6 py-20 w-full">
        <div className="relative isolate overflow-hidden rounded-[2rem] bg-gradient-brand px-6 sm:px-12 py-12 shadow-glow flex flex-col-reverse md:flex-row items-center gap-8">
          <div className="absolute inset-0 bg-circuit-dots opacity-30 -z-10" aria-hidden="true" />
          <div className="flex-1 text-center md:text-start">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">جاهز تكتب أول سطر كود؟</h2>
            <p className="mt-4 text-lg text-white/85 leading-8 max-w-lg mx-auto md:mx-0">
              حسابك بيتعمل من المعلّم. لو معاك بيانات الدخول، ادخل وكمّل من حيث وقفت.
            </p>
            <Link
              href="/login"
              className="mt-7 inline-flex rounded-2xl bg-white px-8 py-4 text-lg font-bold text-primary shadow-elevated hover:scale-[1.03] active:scale-[0.98] transition-transform"
            >
              ادخل حسابك
            </Link>
          </div>
          <CodyRobot className="w-40 h-48 sm:w-52 sm:h-60 shrink-0" onDark idPrefix="cody-cta" />
        </div>
      </section>

      {/* ===== تواصل معنا + Footer ===== */}
      <footer id="contact" className="mt-auto border-t border-border bg-surface scroll-mt-20">
        {hasContact && (
          <div className="max-w-6xl mx-auto px-5 sm:px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-start">
              <h2 className="text-2xl font-bold text-ink">تواصل معنا</h2>
              <div className="mt-3 flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-2 text-base text-ink-soft">
                {contactInfo?.email && (
                  <a href={`mailto:${contactInfo.email}`} className="hover:text-primary transition-colors" dir="ltr">
                    {contactInfo.email}
                  </a>
                )}
                {contactInfo?.phone && (
                  <a href={`tel:${contactInfo.phone}`} className="hover:text-primary transition-colors" dir="ltr">
                    {contactInfo.phone}
                  </a>
                )}
              </div>
            </div>
            {socials.length > 0 && (
              <div className="flex gap-3">
                {socials.map((x) => (
                  <a
                    key={x.kind}
                    href={x.href!}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={x.label}
                    title={x.label}
                    className="grid place-items-center w-11 h-11 rounded-xl border border-border text-ink-soft hover:text-white hover:bg-gradient-brand hover:border-transparent transition-colors"
                  >
                    <SocialIcon kind={x.kind} />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="border-t border-border">
          <div className="max-w-6xl mx-auto px-5 sm:px-6 py-6 text-center text-base text-ink-soft">
            {footerText || `© ${new Date().getFullYear()} ${platformName} — جميع الحقوق محفوظة`}
          </div>
        </div>
      </footer>
    </div>
  );
}
