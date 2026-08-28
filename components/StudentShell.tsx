"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { LogoutButton } from "./LogoutButton";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationBell } from "./NotificationBell";

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

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + "/");

  return (
    <div className="flex min-h-screen">
      {/* الشريط الجانبي - يظهر من مقاس md فأكبر فقط، ونفس الأسلوب البصري
          لشريط الأدمن (خلفية داكنة ثابتة في الوضعين) لتناسق الهوية */}
      <aside
        className="hidden md:flex w-64 shrink-0 flex-col p-5 border-e"
        style={{
          background: "var(--color-sidebar)",
          borderColor: "var(--color-sidebar-border)",
          color: "var(--color-sidebar-text)",
        }}
      >
        <div className="flex items-center gap-2 text-white mb-8 px-1">
          <span className="font-mono text-accent">{">"}_</span>
          <span className="font-bold tracking-tight">{platformName}</span>
        </div>
        <nav className="flex flex-col gap-0.5 text-sm">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors"
                style={{ color: active ? "#fff" : "var(--color-sidebar-text)" }}
              >
                {active && (
                  <motion.span
                    layoutId="student-active-nav"
                    className="absolute inset-0 rounded-lg bg-gradient-brand"
                    style={{ zIndex: 0 }}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <span className="relative z-10">{item.icon}</span>
                <span className="relative z-10">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 flex items-center justify-between glass-surface border-b border-border px-6 py-3.5">
          <div className="md:hidden flex items-center gap-2">
            <span className="font-mono text-primary">{">"}_</span>
            <span className="font-bold">{platformName}</span>
          </div>
          <div className="hidden md:block" />
          <div className="flex items-center gap-2">
            <NotificationBell />
            <ThemeToggle />
            <span className="text-sm text-ink-soft hidden sm:inline mx-1">
              مرحبًا، <span className="text-ink font-medium">{studentName}</span>
            </span>
            <LogoutButton />
          </div>
        </header>

        <main className="flex-1 w-full px-6 py-8 pb-24 md:pb-8">{children}</main>
      </div>

      {/* شريط تنقّل سفلي يظهر على الموبايل والتابلت فقط، بما إن الشريط
          الجانبي مخفي تحت md */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-surface border-t border-border">
        <div className="grid grid-cols-4">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] transition ${
                  active ? "text-primary" : "text-ink-soft"
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
