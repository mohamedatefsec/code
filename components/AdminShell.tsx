"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { LogoutButton } from "./LogoutButton";
import { ThemeToggle } from "./ThemeToggle";

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

  return (
    <div className="flex min-h-screen">
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
          <span
            className="text-[10px] font-mono rounded px-1.5 py-0.5 ms-auto border"
            style={{ borderColor: "var(--color-sidebar-border)", color: "var(--color-sidebar-text)" }}
          >
            أدمن
          </span>
        </div>
        <nav className="flex flex-col gap-0.5 text-sm">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex items-center gap-3 rounded-lg px-3 py-2 transition-colors"
                style={{ color: active ? "#fff" : "var(--color-sidebar-text)" }}
              >
                {active && (
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
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 flex items-center justify-between glass-surface border-b border-border px-6 py-3.5">
          <div className="md:hidden flex items-center gap-2">
            <span className="font-mono text-primary">{">"}_</span>
            <span className="font-bold">{platformName}</span>
          </div>
          <div className="hidden md:block" />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <span className="text-sm text-ink-soft">
              مرحبًا، <span className="text-ink font-medium">{adminName}</span>
            </span>
            <LogoutButton />
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
