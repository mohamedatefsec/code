"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "./LogoutButton";
import { ThemeToggle } from "./ThemeToggle";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "الرئيسية",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} className="w-6 h-6">
        <path d="M3 10.5 12 3l9 7.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 9.5V21h14V9.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/lessons",
    label: "الدروس",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} className="w-6 h-6">
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
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} className="w-6 h-6">
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
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} className="w-6 h-6">
        <path d="M5 21V10M12 21V4M19 21v-7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export function StudentShell({
  children,
  studentName,
}: {
  children: React.ReactNode;
  studentName: string;
}) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(href + "/");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-surface">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <span className="font-mono text-primary">{">"}_</span>
              <span className="font-bold">Code AI</span>
            </div>
            <nav className="hidden sm:flex items-center gap-1 text-sm">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    isActive(item.href)
                      ? "bg-primary-soft text-primary"
                      : "text-ink-soft hover:bg-primary-soft hover:text-primary"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-ink-soft hidden sm:inline">
              مرحبًا، <span className="text-ink font-medium">{studentName}</span>
            </span>
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8 pb-24 sm:pb-8">
        {children}
      </main>

      {/* شريط تنقّل سفلي يظهر على الموبايل فقط، لأن قائمة الهيدر مخفية تحت sm */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-20 bg-surface border-t border-border">
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
