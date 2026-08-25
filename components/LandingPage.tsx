import Link from "next/link";
import { db } from "@/lib/db";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TeacherPhoto } from "@/components/TeacherPhoto";

async function getLandingData() {
  const [settings, studentCount, lessonCount, quizCount, subjects] = await Promise.all([
    db.settings.findFirst(),
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

  return { settings, studentCount, lessonCount, quizCount, subjects };
}

type Feature = { icon: string; title: string; desc: string };

const DEFAULT_FEATURES: Feature[] = [
  { icon: "📚", title: "محتوى منظّم", desc: "دروس مقسّمة لوحدات واضحة، بفيديوهات وملفات وشرح مكتوب." },
  { icon: "❓", title: "بنك أسئلة متنوع", desc: "اختيار من متعدد، صح وخطأ، ترتيب، أسئلة برمجية، وأسئلة مقالية." },
  { icon: "⏱️", title: "اختبارات فورية", desc: "تصحيح تلقائي لحظة التسليم، ونتيجة تفصيلية لكل سؤال." },
  { icon: "🏆", title: "تحفيز مستمر", desc: "شارات إنجاز وإشعارات تبقيك متابعًا لتقدّمك أول بأول." },
];

export default async function LandingPage() {
  const { settings, studentCount, lessonCount, quizCount, subjects } = await getLandingData();

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

  return (
    <div className="min-h-screen flex flex-col">
      {/* ===== Navbar ===== */}
      <header className="sticky top-0 z-30 glass-surface border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-primary text-xl">{">"}_</span>
            <span className="font-bold text-xl">{platformName}</span>
          </div>
          <nav className="hidden md:flex items-center gap-7 text-base text-ink-soft">
            <a href="#top" className="hover:text-ink transition-colors">الرئيسية</a>
            {visibleSubjects.length > 0 && (
              <a href="#subjects" className="hover:text-ink transition-colors">المسارات</a>
            )}
            <a href="#about" className="hover:text-ink transition-colors">عن المنصة</a>
            {(contactInfo?.email || contactInfo?.phone || socialLinks) && (
              <a href="#contact" className="hover:text-ink transition-colors">تواصل معنا</a>
            )}
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="rounded-lg bg-gradient-brand px-5 py-2.5 text-base font-semibold text-white shadow-glow hover:opacity-90 transition-all active:scale-[0.98]"
            >
              دخول
            </Link>
          </div>
        </div>
      </header>

      {/* ===== Hero ===== */}
      <section id="top" className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10 opacity-[0.08]"
          style={{ background: "var(--gradient-brand)" }}
        />
        <div className="max-w-6xl mx-auto px-6 py-16 sm:py-24 grid md:grid-cols-2 gap-12 items-center">
          {/* النص */}
          <div className="animate-fade-in-up order-2 md:order-1 text-center md:text-start">
            <h1 className="text-4xl sm:text-6xl font-extrabold leading-tight text-ink">
              {headline}
            </h1>
            {subheadline && (
              <p className="mt-4 text-xl sm:text-2xl text-gradient-brand font-bold">{subheadline}</p>
            )}
            <p className="mt-5 text-lg text-ink-soft leading-8 max-w-lg mx-auto md:mx-0">{description}</p>

            {badges.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2 justify-center md:justify-start">
                {badges.map((b, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 text-accent px-4 py-2 text-base font-semibold"
                  >
                    ✓ {b}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-8 flex flex-wrap gap-3 justify-center md:justify-start">
              <Link
                href="/login"
                className="rounded-lg bg-gradient-brand px-7 py-3.5 text-lg font-semibold text-white shadow-glow hover:opacity-90 transition-all active:scale-[0.98]"
              >
                ابدأ رحلتك الآن
              </Link>
              {visibleSubjects.length > 0 && (
                <a
                  href="#subjects"
                  className="rounded-lg border border-border px-7 py-3.5 text-lg font-semibold text-ink hover:bg-surface-2 transition-colors"
                >
                  استعرض الدروس
                </a>
              )}
            </div>

            {studentCount > 0 && (
              <p className="mt-6 text-base text-ink-soft">
                <span className="stat-figure font-semibold text-ink">{studentCount}+</span> طالب
                منضم للمنصة بالفعل
              </p>
            )}
          </div>

          {/* بطاقة المدرّس */}
          <div className="order-1 md:order-2 flex justify-center animate-scale-in">
            <div className="relative">
              <div className="absolute -top-6 -start-6 w-16 h-16 rounded-2xl bg-accent/25 animate-float-slow" />
              <div
                className="absolute -bottom-6 -end-6 w-20 h-20 rounded-full bg-primary/25 animate-float-slow"
                style={{ animationDelay: "1.5s" }}
              />
              <div
                className={`relative rounded-2xl border border-border bg-surface shadow-elevated p-5 card-hover ${
                  hasSecondPhoto ? "w-[26rem]" : "w-72"
                }`}
              >
                {hasSecondPhoto ? (
                  <div className="flex gap-3">
                    <div className="flex-1 aspect-square rounded-xl overflow-hidden bg-gradient-brand grid place-items-center animate-float-card">
                      <TeacherPhoto src={teacherPhotoUrl ?? null} alt={teacherName ?? platformName} />
                    </div>
                    <div
                      className="flex-1 aspect-square rounded-xl overflow-hidden bg-gradient-brand grid place-items-center animate-float-card"
                      style={{ animationDelay: "1.1s", animationDuration: "5.5s" }}
                    >
                      <TeacherPhoto src={teacherPhotoUrl2 ?? null} alt={teacherName ?? platformName} />
                    </div>
                  </div>
                ) : (
                  <div className="w-full aspect-square rounded-xl overflow-hidden bg-gradient-brand grid place-items-center animate-float-card">
                    <TeacherPhoto src={teacherPhotoUrl ?? null} alt={teacherName ?? platformName} />
                  </div>
                )}
                {teacherName && (
                  <p className="mt-4 font-bold text-lg text-ink text-center">{teacherName}</p>
                )}
                <p className="text-base text-ink-soft text-center">معلّم البرمجة والذكاء الاصطناعي</p>
              </div>
            </div>
          </div>
        </div>

        {/* شريط الإحصائيات */}
        {(lessonCount > 0 || quizCount > 0) && (
          <div className="border-y border-border bg-surface-2">
            <div className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-3 gap-4 text-center">
              {stats.map((s) => (
                <div key={s.label}>
                  <p className="stat-figure text-2xl sm:text-3xl font-bold text-primary">{s.value}</p>
                  <p className="text-sm sm:text-base text-ink-soft mt-1.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ===== لمحة: البرمجة + الذكاء الاصطناعي في الصفوف الحقيقية ===== */}
      <section className="max-w-6xl mx-auto px-6 py-16 w-full overflow-hidden">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div className="animate-fade-in-up order-2 md:order-1 text-center md:text-start">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 text-accent px-4 py-1.5 text-sm font-semibold">
              ⚡ مدعوم بالذكاء الاصطناعي
            </span>
            <h2 className="mt-4 text-3xl font-bold text-ink">مولّد أسئلة ذكي لكل درس</h2>
            <p className="mt-4 text-lg text-ink-soft leading-8 max-w-lg mx-auto md:mx-0">
              معلّمك بيكتب الموضوع، والذكاء الاصطناعي بيقترح أسئلة متنوعة جاهزة للمراجعة —
              نفس الأدوات اللي هتتعلم تبنيها إنت بنفسك في مسار الذكاء الاصطناعي.
            </p>
            <ul className="mt-6 space-y-3 text-base text-ink-soft max-w-lg mx-auto md:mx-0">
              <li className="flex items-center gap-2.5 justify-center md:justify-start">
                <span className="text-accent">✓</span> اختيار من متعدد، صح وخطأ، ترتيب، وأسئلة برمجية
              </li>
              <li className="flex items-center gap-2.5 justify-center md:justify-start">
                <span className="text-accent">✓</span> مستويات صعوبة متدرّجة حسب كل درس
              </li>
              <li className="flex items-center gap-2.5 justify-center md:justify-start">
                <span className="text-accent">✓</span> مراجعة وتعديل بشرية قبل النشر دايمًا
              </li>
            </ul>
          </div>

          {/* نافذة كود تفاعلية الشكل */}
          <div className="order-1 md:order-2 flex justify-center animate-scale-in">
            <div className="relative">
              <div className="absolute -top-5 -end-5 w-14 h-14 rounded-2xl bg-primary/20 animate-float-slow" />
              <div
                className="absolute -bottom-5 -start-5 w-16 h-16 rounded-full bg-accent/20 animate-float-slow"
                style={{ animationDelay: "1s" }}
              />
              <div
                className="relative w-80 sm:w-96 rounded-2xl overflow-hidden shadow-elevated card-hover"
                style={{ backgroundColor: "var(--color-sidebar)", border: "1px solid var(--color-sidebar-border)" }}
              >
                <div
                  className="flex items-center gap-2 px-4 py-3 border-b"
                  style={{ borderColor: "var(--color-sidebar-border)" }}
                >
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#ff5f56" }} />
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#ffbd2e" }} />
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#27c93f" }} />
                  <span className="ms-2 text-xs font-mono" style={{ color: "var(--color-sidebar-text)" }}>
                    ai_generator.py
                  </span>
                </div>
                <pre
                  dir="ltr"
                  className="px-5 py-5 text-sm leading-7 font-mono overflow-x-auto text-start"
                  style={{ color: "var(--color-sidebar-text)" }}
                >
                  <code>
                    <span style={{ color: "#818cf8" }}>def</span>{" "}
                    <span style={{ color: "#2dd4bf" }}>generate_quiz</span>
                    {"(topic, level):\n"}
                    {"    # يولّد أسئلة متنوعة جاهزة للمراجعة\n"}
                    {"    questions = ai.create(\n"}
                    {"        topic=topic,\n"}
                    {"        difficulty=level,\n        status="}
                    <span style={{ color: "#2dd4bf" }}>&quot;draft&quot;</span>
                    {"\n    )\n    "}
                    <span style={{ color: "#818cf8" }}>return</span>
                    {" questions"}
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== المسارات ===== */}
      {visibleSubjects.length > 0 && (
        <section id="subjects" className="max-w-6xl mx-auto px-6 py-16 w-full">
          <h2 className="text-3xl font-bold text-ink text-center">المسارات التعليمية</h2>
          <p className="text-lg text-ink-soft text-center mt-3">اختار المسار اللي يناسبك وابدأ التعلم.</p>
          <div className="mt-10 grid sm:grid-cols-2 gap-5">
            {visibleSubjects.map((s) => {
              const lessonsInSubject = s.units.reduce((sum, u) => sum + u._count.lessons, 0);
              return (
                <div
                  key={s.id}
                  className="rounded-2xl border border-border bg-surface p-6 card-hover shadow-elevated"
                >
                  <p className="font-bold text-xl text-ink">{s.name}</p>
                  <p className="text-base text-ink-soft mt-1.5">
                    {s._count.units} وحدة · {lessonsInSubject} درس
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ===== المميزات ===== */}
      <section id="about" className="bg-surface-2 border-y border-border">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-ink text-center">{featuresTitle}</h2>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f, i) => (
              <div key={i} className="rounded-2xl border border-border bg-surface p-6 card-hover">
                <span className="text-3xl">{f.icon}</span>
                <p className="font-bold text-lg text-ink mt-3">{f.title}</p>
                <p className="text-base text-ink-soft mt-2 leading-7">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== تواصل معنا + Footer ===== */}
      <footer id="contact" className="mt-auto">
        {(contactInfo?.email || contactInfo?.phone || socialLinks) && (
          <div className="max-w-6xl mx-auto px-6 py-12 text-center">
            <h2 className="text-2xl font-bold text-ink">تواصل معنا</h2>
            <div className="mt-4 flex flex-wrap justify-center gap-5 text-base text-ink-soft">
              {contactInfo?.email && <span>📧 {contactInfo.email}</span>}
              {contactInfo?.phone && <span>📱 {contactInfo.phone}</span>}
            </div>
            {socialLinks && (
              <div className="mt-4 flex justify-center gap-5 text-base">
                {socialLinks.facebook && (
                  <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    فيسبوك
                  </a>
                )}
                {socialLinks.instagram && (
                  <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    إنستجرام
                  </a>
                )}
                {socialLinks.youtube && (
                  <a href={socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    يوتيوب
                  </a>
                )}
                {socialLinks.whatsapp && (
                  <a href={socialLinks.whatsapp} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    واتساب
                  </a>
                )}
              </div>
            )}
          </div>
        )}
        <div className="border-t border-border">
          <div className="max-w-6xl mx-auto px-6 py-6 text-center text-base text-ink-soft">
            {footerText || `© ${new Date().getFullYear()} ${platformName} — جميع الحقوق محفوظة`}
          </div>
        </div>
      </footer>
    </div>
  );
}
