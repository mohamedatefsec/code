"use client";

import { useState, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar } from "@/components/Avatar";
import { CodyRobot } from "@/components/brand/CodyRobot";
import { TerminalTyper } from "@/components/brand/TerminalTyper";

const ROBOT_LINES = ['print("أهلًا بيك تاني")', "lesson.continue()", "progress += 1"];

export function LoginForm({
  platformName,
  adminAvatarUrl,
  adminName,
}: {
  platformName: string;
  adminAvatarUrl?: string | null;
  adminName?: string | null;
}) {
  return (
    <Suspense fallback={null}>
      <LoginFormInner platformName={platformName} adminAvatarUrl={adminAvatarUrl} adminName={adminName} />
    </Suspense>
  );
}

function LoginFormInner({
  platformName,
  adminAvatarUrl,
  adminName,
}: {
  platformName: string;
  adminAvatarUrl?: string | null;
  adminName?: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionEnded = searchParams.get("reason") === "session-ended";
  const blocked = searchParams.get("reason") === "blocked";

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    blocked
      ? "تم حظر الدخول من هذه الشبكة/الجهاز. يرجى التواصل مع المدرّس."
      : sessionEnded
      ? "تم إنهاء الجلسة هنا - إما لأن الحساب اتسجّل دخوله من جهاز آخر، أو انتهت صلاحية الجلسة. سجّل دخولك تاني."
      : null
  );
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "حدث خطأ غير متوقع.");
        setLoading(false);
        return;
      }
      router.push(data.redirectTo);
      router.refresh();
    } catch {
      setError("تعذّر الاتصال بالخادم، حاول مرة أخرى.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full relative">
      <div className="absolute top-4 left-4 z-10">
        <ThemeToggle className="bg-surface border border-border shadow-elevated" />
      </div>

      {/* اللوحة اليسرى: "كودي" بيرحّب بالطالب - توقيع بصري ثابت للمنصة في الوضعين */}
      <div
        className="hidden lg:flex lg:w-[46%] flex-col justify-between p-12 relative isolate overflow-hidden"
        style={{ background: "var(--color-sidebar)", color: "var(--color-sidebar-text)" }}
      >
        <div className="aurora" aria-hidden="true" />
        <div className="absolute inset-0 -z-0 bg-circuit-dots opacity-25" aria-hidden="true" />

        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative flex items-center gap-3 text-white min-w-0"
        >
          {adminAvatarUrl ? (
            <Avatar name={adminName || platformName} avatarUrl={adminAvatarUrl} size={40} />
          ) : (
            <span className="grid place-items-center w-10 h-10 rounded-xl bg-gradient-brand font-mono font-bold shrink-0" dir="ltr">
              {">_"}
            </span>
          )}
          <span className="font-display font-bold text-xl truncate">{platformName}</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex flex-col items-center"
        >
          {/* فقاعة كلام الروبوت */}
          <div className="relative mb-4 rounded-2xl bg-white/[0.07] border border-white/10 backdrop-blur px-5 py-3 text-sm text-white shadow-2xl">
            <TerminalTyper lines={ROBOT_LINES} />
            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 bg-[#1a1f45] border-b border-r border-white/10" aria-hidden="true" />
          </div>
          <CodyRobot className="w-56 h-64" onDark idPrefix="cody-login-lg" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="relative"
        >
          <p className="font-display text-2xl font-bold text-white leading-snug">كمّل من حيث وقفت.</p>
          <p className="mt-2 text-base leading-7">
            دروسك واختباراتك وشاراتك مستنياك — منصة البرمجة والذكاء الاصطناعي لطلاب المرحلة الثانوية.
          </p>
        </motion.div>
      </div>

      {/* اللوحة اليمنى: نموذج تسجيل الدخول */}
      <div className="relative isolate flex flex-1 items-center justify-center bg-canvas p-6 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-circuit-dots opacity-40 [mask-image:radial-gradient(ellipse_at_center,#000_20%,transparent_70%)]" aria-hidden="true" />
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md rounded-3xl border border-border bg-surface/85 backdrop-blur-xl shadow-elevated p-7 sm:p-9"
        >
          <div className="flex justify-center lg:hidden -mt-2 mb-2">
            <CodyRobot className="w-24 h-28" idPrefix="cody-login-sm" />
          </div>
          <div className="mb-6 flex items-center justify-center gap-2.5 lg:hidden">
            {adminAvatarUrl ? (
              <Avatar name={adminName || platformName} avatarUrl={adminAvatarUrl} size={32} />
            ) : (
              <span className="font-mono text-primary text-lg" dir="ltr">{">_"}</span>
            )}
            <span className="font-bold text-xl">{platformName}</span>
          </div>

          <Link href="/" className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink mb-6 transition-colors">
            ← رجوع للرئيسية
          </Link>

          <h1 className="text-3xl font-bold text-ink mb-2">تسجيل الدخول</h1>
          <p className="text-ink-soft text-base mb-7">
            أدخل بيانات حسابك للمتابعة إلى لوحة التحكم.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="identifier" className="block text-sm font-semibold text-ink mb-2">
                اسم المستخدم
              </label>
              <div className="relative">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="absolute top-1/2 -translate-y-1/2 start-3.5 w-5 h-5 text-ink-soft pointer-events-none" aria-hidden="true">
                <circle cx="12" cy="8" r="4" />
                <path d="M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" strokeLinecap="round" />
              </svg>
              <input
                id="identifier"
                name="identifier"
                type="text"
                autoComplete="username"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface ps-11 pe-4 py-3 text-base text-ink placeholder:text-ink-soft/60 transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
                placeholder="اكتب بيانات الدخول"
              />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-ink mb-2">
                كلمة المرور
              </label>
              <div className="relative">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="absolute top-1/2 -translate-y-1/2 start-3.5 w-5 h-5 text-ink-soft pointer-events-none" aria-hidden="true">
                <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
                <path d="M8 10.5V8a4 4 0 1 1 8 0v2.5" strokeLinecap="round" />
              </svg>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface ps-11 pe-12 py-3 text-base text-ink placeholder:text-ink-soft/60 transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                className="absolute top-1/2 -translate-y-1/2 end-2 grid place-items-center w-9 h-9 rounded-lg text-ink-soft hover:text-primary hover:bg-primary-soft transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5" aria-hidden="true">
                  <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" strokeLinejoin="round" />
                  <circle cx="12" cy="12" r="3" />
                  {showPassword && <path d="M4 4l16 16" strokeLinecap="round" />}
                </svg>
              </button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                role="alert"
                className="rounded-xl bg-danger/10 border border-danger/40 px-4 py-3 text-sm text-danger leading-6"
              >
                {error}
              </motion.div>
            )}

            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="btn-shine w-full rounded-xl bg-gradient-brand py-3.5 text-lg font-bold text-white shadow-glow transition hover:brightness-110 disabled:opacity-60"
            >
              {loading ? "جارٍ الدخول..." : "دخول"}
            </motion.button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-soft">
            حسابات الطلاب تُنشأ من قبل المدرّس فقط.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
