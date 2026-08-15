"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { LogoutButton } from "./LogoutButton";
import { ThemeToggle } from "./ThemeToggle";

const NAV_ITEMS = [
  { href: "/dashboard", label: "الرئيسية" },
  { href: "/lessons", label: "الدروس" },
  { href: "/quizzes", label: "الاختبارات" },
  { href: "/results", label: "نتائجي" },
];

export function StudentShell({
  children,
  studentName,
}: {
  children: React.ReactNode;
  studentName: string;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-20 glass-surface border-b border-border">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <span className="font-mono text-primary">{">"}_</span>
              <span className="font-bold">Code AI</span>
            </div>
            <nav className="hidden sm:flex items-center gap-1 text-sm">
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href || pathname?.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="relative px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {active && (
                      <motion.span
                        layoutId="student-active-nav"
                        className="absolute inset-0 rounded-lg bg-primary-soft"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                      />
                    )}
                    <span className={`relative ${active ? "text-primary font-medium" : "text-ink-soft"}`}>
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <span className="text-sm text-ink-soft hidden sm:inline">
              مرحبًا، <span className="text-ink font-medium">{studentName}</span>
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">{children}</main>
    </div>
  );
}
