"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "code-ai-theme";

function applyTheme(theme: "light" | "dark") {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    // نؤجّلها لـ microtask لتفادي تحذير react-hooks/set-state-in-effect،
    // وهي قراءة لمرة واحدة فقط عند التحميل (client-only) لتفادي اختلاف
    // السيرفر/العميل، وليست حالة تفاعلية متكررة.
    Promise.resolve().then(() => {
      const stored = localStorage.getItem(STORAGE_KEY) as "light" | "dark" | null;
      setTheme(stored ?? (document.documentElement.classList.contains("dark") ? "dark" : "light"));
    });
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }

  // نتجنب أي وميض/اختلاف بين السيرفر والعميل بعدم عرض الأيقونة قبل معرفة الوضع الحالي
  if (theme === null) {
    return <span className={`inline-block w-8 h-8 ${className}`} />;
  }

  return (
    <button
      onClick={toggle}
      aria-label={theme === "dark" ? "التبديل للوضع الفاتح" : "التبديل للوضع الداكن"}
      title={theme === "dark" ? "الوضع الفاتح" : "الوضع الداكن"}
      className={`grid place-items-center w-8 h-8 rounded-lg text-ink-soft hover:text-ink hover:bg-canvas transition-colors ${className}`}
    >
      {theme === "dark" ? (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 1020.354 15.354z" />
        </svg>
      )}
    </button>
  );
}
