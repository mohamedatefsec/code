"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { LogoutButton } from "./LogoutButton";
import { ThemeToggle } from "./ThemeToggle";
import { UnpaidAlertBell } from "./UnpaidAlertBell";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "لوحة التحكم", icon: "▤" },
  { href: "/admin/students", label: "الطلاب", icon: "🎓" },
  { href: "/admin/groups", label: "المجموعات", icon: "👥" },
  { href: "/admin/attendance", label: "الحضور والغياب", icon: "📅" },
  { href: "/admin/content", label: "المحتوى التعليمي", icon: "📚" },
  { href: "/admin/question-bank", label: "بنك الأسئلة", icon: "❓" },
  { href: "/admin/ai-generator", label: "توليد بالذكاء الاصطناعي", icon: "✨" },
  { href: "/admin/quizzes", label: "الاختبارات", icon: "📝" },
  { href: "/admin/grading", label: "التصحيح اليدوي", icon: "✍️" },
  { href: "/admin/notifications", label: "الإشعارات", icon: "🔔" },
  { href: "/admin/badges", label: "الشارات", icon: "🏆" },
  { href: "/admin/settings", label: "الإعدادات", icon: "⚙️" },
];

/// قائمة التنقل نفسها تُستخدم في الشريط الجانبي الثابت (ديسكتوب) وفي
/// القائمة المنسدلة (موبايل)، فصلناها في دالة واحدة لتفادي تكرار المنطق.
/// `animated` تفعّل مؤشر الانتقال بـ layoutId (Framer Motion) - يُفعَّل في
/// نسخة واحدة بس (الديسكتوب) لأن وجود نفس الـ layoutId في عنصرين مُركَّبين
/// في نفس اللحظة (حتى لو أحدهما مخفي بصريًا) يسبب تعارضًا في المؤشر المتحرك.
function AdminNavLinks({
  pathname,
  animated,
  onNavigate,
}: {
  pathname: string | null;
  animated: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-0.5 text-sm">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname?.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className="relative flex items-center gap-3 rounded-lg px-3 py-2 transition-colors"
            style={{
              color: active ? "#fff" : "var(--color-sidebar-text)",
              background: !animated && active ? "var(--gradient-brand)" : undefined,
            }}
          >
            {animated && active && (
              <motion.span
                layoutId="admin-active-nav"
                className="absolute inset-0 rounded-lg bg-gradient-brand"
                style={{ zIndex: 0 }}
                transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
              />
            )}
            <span className="relative w-4 text-center z-10">{item.icon}</span>
            <span className="relative z-10">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarBrand({ platformName }: { platformName: string }) {
  return (
    <div className="flex items-start gap-2 text-white mb-8 px-1">
      <span className="font-mono text-accent shrink-0 leading-6">{">"}_</span>
      <span className="font-bold tracking-tight leading-snug break-words flex-1 min-w-0">
        {platformName}
      </span>
      <span
        className="text-[10px] font-mono rounded px-1.5 py-0.5 border shrink-0 mt-0.5"
        style={{ borderColor: "var(--color-sidebar-border)", color: "var(--color-sidebar-text)" }}
      >
        أدمن
      </span>
    </div>
  );
}

export function AdminShell({
  children,
  adminName,
  platformName,
}: {
  children: React.ReactNode;
  adminName: string;
  platformName: string;
}) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);

  // اقفل القائمة تلقائيًا فور الانتقال لصفحة جديدة
  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  // امنع تمرير محتوى الصفحة خلف القائمة وهي مفتوحة على الموبايل
  useEffect(() => {
    if (!navOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [navOpen]);

  return (
    <div className="flex min-h-screen">
      {/* الشريط الجانبي الثابت - يظهر على الشاشات المتوسطة فأكبر فقط.
          print:hidden عشان يختفي تلقائيًا في أي صفحة أدمن بتتطبع (مش
          مقصورة على صفحة طباعة الاختبار بس). */}
      <aside
        className="hidden md:flex w-64 shrink-0 flex-col p-5 border-e print:hidden"
        style={{
          background: "var(--color-sidebar)",
          borderColor: "var(--color-sidebar-border)",
          color: "var(--color-sidebar-text)",
        }}
      >
        <SidebarBrand platformName={platformName} />
        <AdminNavLinks pathname={pathname} animated />
      </aside>

      {/* قائمة منسدلة (Off-canvas Drawer) للموبايل فقط - هذا هو البديل
          اللي كان ناقصًا تمامًا، وكان سبب عدم قدرة الأدمن على التنقل
          بين الصفحات على الموبايل. */}
      <div
        className={`fixed inset-0 z-40 md:hidden print:hidden transition-opacity duration-300 ${
          navOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!navOpen}
      >
        <div className="absolute inset-0 bg-black/50" onClick={() => setNavOpen(false)} />
        <aside
          className="absolute inset-y-0 right-0 w-72 max-w-[82%] flex flex-col p-5 overflow-y-auto transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            background: "var(--color-sidebar)",
            color: "var(--color-sidebar-text)",
            transform: navOpen ? "translateX(0)" : "translateX(100%)",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <SidebarBrand platformName={platformName} />
          </div>
          <button
            onClick={() => setNavOpen(false)}
            aria-label="إغلاق القائمة"
            className="absolute top-4 left-4 flex h-8 w-8 items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition"
          >
            ✕
          </button>
          <AdminNavLinks pathname={pathname} animated={false} onNavigate={() => setNavOpen(false)} />
        </aside>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 flex items-center justify-between glass-surface border-b border-border px-6 py-3.5 print:hidden">
          <div className="md:hidden flex items-center gap-3">
            <button
              onClick={() => setNavOpen(true)}
              aria-label="فتح قائمة التنقل"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-ink hover:bg-primary-soft hover:text-primary transition"
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                <path
                  d="M4 6.5h16M4 12h16M4 17.5h16"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="font-mono text-primary shrink-0">{">"}_</span>
              <span className="font-bold leading-tight break-words">{platformName}</span>
            </div>
          </div>
          <div className="hidden md:block" />
          <div className="flex items-center gap-3">
            <UnpaidAlertBell />
            <ThemeToggle />
            <span className="text-sm text-ink-soft hidden sm:inline">
              مرحبًا، <span className="text-ink font-medium">{adminName}</span>
            </span>
            <LogoutButton />
          </div>
        </header>
        <main className="flex-1 p-6 print:p-0">{children}</main>
      </div>
    </div>
  );
}
