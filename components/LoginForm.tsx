"use client";

import { useState, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar } from "@/components/Avatar";

const CODE_LINES = [
  { indent: 0, text: "class Student:" },
  { indent: 1, text: "def __init__(self, name):" },
  { indent: 2, text: "self.name = name" },
  { indent: 2, text: "self.progress = 0" },
  { indent: 0, text: "" },
  { indent: 0, text: "def learn(topic):" },
  { indent: 1, text: 'print(f"يتعلم {topic}...")' },
  { indent: 1, text: "return True" },
  { indent: 0, text: "" },
  { indent: 0, text: "# model.predict(next_lesson)" },
];

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

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    sessionEnded
      ? "تم إنهاء الجلسة هنا - إما لأن الحساب اتسجّل دخوله من جهاز آخر، أو انتهت صلاحية الجلسة. سجّل دخولك تاني."
      : null
  );
  const [loading, setLoading] = useState(false);

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

      {/* اللوحة اليسرى: طابع محرر أكواد - توقيع بصري ثابت للمنصة في الوضعين */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "var(--color-sidebar)", color: "var(--color-sidebar-text)" }}
      >
        {/* كرات إضاءة متحركة ببطء في الخلفية - لمسة "SaaS حديثة" */}
        <div
          className="absolute -top-24 -start-24 w-96 h-96 rounded-full blur-3xl opacity-30 animate-float-slow"
          style={{ background: "var(--color-primary)" }}
        />
        <div
          className="absolute bottom-0 end-0 w-80 h-80 rounded-full blur-3xl opacity-20 animate-float-slow"
          style={{ background: "var(--color-accent)", animationDelay: "-4s" }}
        />

        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative flex items-center gap-2.5 text-white min-w-0"
        >
          {adminAvatarUrl ? (
            <Avatar name={adminName || platformName} avatarUrl={adminAvatarUrl} size={32} />
          ) : (
            <span className="font-mono text-accent text-lg shrink-0">{">"}_</span>
          )}
          <span className="font-bold text-xl truncate">{platformName}</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="relative font-mono text-sm leading-7 opacity-90"
        >
          {CODE_LINES.map((line, i) => (
            <div key={i} style={{ paddingInlineStart: `${line.indent * 1.5}rem` }}>
              <span className="text-slate-600 select-none ms-0 me-3">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                className={
                  line.text.startsWith("#")
                    ? "text-slate-500"
                    : line.text.includes("class") || line.text.includes("def")
                    ? "text-primary-soft"
                    : "text-slate-300"
                }
              >
                {line.text || " "}
              </span>
            </div>
          ))}
          <div className="mt-1">
            <span className="text-slate-600 select-none me-3">11</span>
            <span className="inline-block w-2 h-4 bg-accent align-middle animate-pulse-glow" />
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="relative text-slate-400 text-sm leading-6"
        >
          منصة متخصصة لتعليم البرمجة والذكاء الاصطناعي
          <br />
          لطلاب المرحلة الثانوية.
        </motion.p>
      </div>

      {/* اللوحة اليمنى: نموذج تسجيل الدخول */}
      <div className="flex flex-1 items-center justify-center bg-canvas p-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm"
        >
          <div className="mb-8 flex items-center justify-center gap-2.5 lg:hidden">
            {adminAvatarUrl ? (
              <Avatar name={adminName || platformName} avatarUrl={adminAvatarUrl} size={32} />
            ) : (
              <span className="font-mono text-primary text-lg">{">"}_</span>
            )}
            <span className="font-bold text-xl">{platformName}</span>
          </div>

          <Link href="/" className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink mb-6 transition-colors">
            ← رجوع للرئيسية
          </Link>

          <h1 className="text-2xl font-bold text-ink mb-1">تسجيل الدخول</h1>
          <p className="text-ink-soft text-sm mb-8">
            أدخل بيانات حسابك للمتابعة إلى لوحة التحكم.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="identifier" className="block text-sm font-medium text-ink mb-1.5">
                البريد الإلكتروني أو كود الطالب
              </label>
              <input
                id="identifier"
                name="identifier"
                type="text"
                autoComplete="username"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-ink placeholder:text-ink-soft/60 transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
                placeholder="teacher@codeai.local أو STU-1024"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ink mb-1.5">
                كلمة المرور
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-ink transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                role="alert"
                className="rounded-lg bg-danger/10 border border-danger/40 px-4 py-2.5 text-sm text-danger"
              >
                {error}
              </motion.div>
            )}

            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gradient-brand py-2.5 font-semibold text-white shadow-glow transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "جارٍ الدخول..." : "دخول"}
            </motion.button>
          </form>

          <p className="mt-6 text-center text-xs text-ink-soft">
            حسابات الطلاب تُنشأ من قبل المدرّس فقط.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
