"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { LogoutButton } from "./LogoutButton";
import { ThemeToggle } from "./ThemeToggle";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "الرئيسية",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} className="w-5 h-5">
        <path d="M3 10.5 12 3l9 7.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 9.5V21h14V9.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/lessons",
    label: "الدروس",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} className="w-5 h-5">
        <path
          d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19a1 1 0 0 1 1 1v15.5a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 1 4 18V5.5Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 7h8M8 10.2h8" stroke="currentColor" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/quizzes",
    label: "الاختبارات",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} className="w-5 h-5">
        <path
          d="M9 3.5h6a1 1 0 0 1 1 1v.5h1a1 1 0 0 1 1 1V19a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a1 1 0 0 1 1-1h1v-.5a1 1 0 0 1 1-1Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="m9 12.5 2 2 4-4.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/results",
    label: "نتائجي",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} className="w-5 h-5">
        <path d="M5 21V10M12 21V4M19 21v-7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

/// شعار المنصة: أيقونة قبعة تخرّج داخل دائرة متدرّجة، بنفس هوية المنصة
/// اللونية (gradient-brand) - نفس التدرّج المستخدم في كل مكان آخر بالموقع.
function SidebarBrand({ platformName }: { platformName: string }) {
  return (
    <div className="flex items-center gap-2.5 px-2 mb-2">
      <span
        className="grid place-items-center w-9 h-9 rounded-xl shrink-0 text-white shadow-glow"
        style={{ background: "var(--gradient-brand)" }}
      >
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
          <path
            d="M12 4 2 8.5 12 13l10-4.5L12 4Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M6 10.5V15c0 1.4 2.7 3 6 3s6-1.6 6-3v-4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </span>
      <div className="min-w-0 leading-tight">
        <p className="font-bold text-ink truncate">{platformName}</p>
        <p className="text-[11px] text-ink-soft truncate">للتعلم الذكي</p>
      </div>
    </div>
  );
}

function NavLinks({
  pathname,
  animated,
  onNavigate,
}: {
  pathname: string | null;
  animated: boolean;
  onNavigate?: () => void;
}) {
  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + "/");

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className="relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors"
            style={{ color: active ? "#fff" : "var(--color-ink-soft)" }}
          >
            {animated && active && (
              <motion.span
                layoutId="student-active-nav"
                className="absolute inset-0 rounded-xl"
                style={{ background: "var(--gradient-brand)", zIndex: 0 }}
                transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
              />
            )}
            {!animated && active && (
              <span className="absolute inset-0 rounded-xl" style={{ background: "var(--gradient-brand)" }} />
            )}
            <span className="relative z-10 shrink-0">{item.icon}</span>
            <span className="relative z-10">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function StudentShell({
  children,
  studentName,
  platformName,
}: {
  children: React.ReactNode;
  studentName: string;
  platformName: string;
}) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const initial = studentName.trim().charAt(0) || "ط";

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!navOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [navOpen]);

  return (
    <div className="min-h-screen flex">
      {/* الشريط الجانبي الثابت - على اليمين في واجهة RTL */}
      <aside className="hidden md:flex md:flex-col w-64 shrink-0 border-s border-border bg-surface p-5">
        <SidebarBrand platformName={platformName} />
        <div className="mt-4 flex-1">
          <NavLinks pathname={pathname} animated />
        </div>
        <div className="pt-4 border-t border-border space-y-3">
          <div className="flex items-center gap-2.5 px-1">
            <span
              className="grid place-items-center w-9 h-9 rounded-full shrink-0 text-white font-bold text-sm"
              style={{ background: "var(--gradient-brand)" }}
            >
              {initial}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink truncate">{studentName}</p>
              <p className="text-[11px] text-ink-soft">طالب</p>
            </div>
            <ThemeToggle />
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* قائمة منسدلة (Off-canvas) للموبايل */}
      <div
        className={`fixed inset-0 z-40 md:hidden transition-opacity duration-300 ${
          navOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!navOpen}
      >
        <div className="absolute inset-0 bg-black/50" onClick={() => setNavOpen(false)} />
        <aside
          className="absolute inset-y-0 right-0 w-72 max-w-[82%] flex flex-col p-5 overflow-y-auto bg-surface transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ transform: navOpen ? "translateX(0)" : "translateX(100%)" }}
        >
          <div className="flex items-center justify-between mb-2">
            <SidebarBrand platformName={platformName} />
            <button
              onClick={() => setNavOpen(false)}
              aria-label="إغلاق القائمة"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft hover:bg-canvas transition shrink-0"
            >
              ✕
            </button>
          </div>
          <div className="mt-2 flex-1">
            <NavLinks pathname={pathname} animated={false} onNavigate={() => setNavOpen(false)} />
          </div>
          <div className="pt-4 border-t border-border space-y-3">
            <div className="flex items-center gap-2.5 px-1">
              <span
                className="grid place-items-center w-9 h-9 rounded-full shrink-0 text-white font-bold text-sm"
                style={{ background: "var(--gradient-brand)" }}
              >
                {initial}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink truncate">{studentName}</p>
                <p className="text-[11px] text-ink-soft">طالب</p>
              </div>
              <ThemeToggle />
            </div>
            <LogoutButton />
          </div>
        </aside>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {/* هيدر علوي للموبايل فقط - زر فتح القائمة */}
        <header className="md:hidden flex items-center justify-between border-b border-border bg-surface px-4 py-3 sticky top-0 z-20">
          <button
            onClick={() => setNavOpen(true)}
            aria-label="فتح قائمة التنقل"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-ink hover:bg-primary-soft hover:text-primary transition"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
              <path d="M4 6.5h16M4 12h16M4 17.5h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold truncate">{platformName}</span>
          </div>
          <ThemeToggle />
        </header>

        <main className="flex-1 w-full px-4 sm:px-6 py-6 sm:py-8 pb-24 md:pb-8 max-w-6xl mx-auto">
          {children}
        </main>
      </div>

      {/* شريط تنقّل سفلي للموبايل فقط */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-surface border-t border-border">
        <div className="grid grid-cols-4">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] transition ${
                  active ? "text-primary font-medium" : "text-ink-soft"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
