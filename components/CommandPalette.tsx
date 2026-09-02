"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ADMIN_NAV_ITEMS } from "@/lib/admin-nav";
import { AdminIcons } from "./AdminIcons";

/// لوحة بحث سريع (Command Palette) للتنقل بين أقسام الإدارة - تُفتح بـ
/// Ctrl+K (أو Cmd+K على ماك) من أي صفحة، أو بالضغط على الزرار/الأيقونة في
/// الهيدر. بتفلتر الأقسام أثناء الكتابة وتفتح بالـ Enter أو الضغط بالماوس،
/// والتنقل بالأسهم لأعلى/أسفل. فايدتها بتكبر كل ما عدد الأقسام يزيد.
export function CommandPalette({ trigger }: { trigger: "button" | "icon" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ADMIN_NAV_ITEMS;
    return ADMIN_NAV_ITEMS.filter(
      (item) => item.label.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
    );
  }, [query]);

  // فتح/إغلاق اللوحة بـ Ctrl+K أو Cmd+K من أي مكان في صفحات الإدارة
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      // تأخير بسيط عشان الـ input يكون جاهز بعد ظهور اللوحة
      setTimeout(() => inputRef.current?.focus(), 30);
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  function onInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = results[activeIndex];
      if (item) go(item.href);
    }
  }

  return (
    <>
      {trigger === "button" ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-lg border border-border bg-canvas px-3 py-1.5 text-xs text-ink-soft hover:border-primary/40 hover:text-primary transition"
        >
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} className="w-4 h-4">
            <circle cx="11" cy="11" r="6.5" stroke="currentColor" />
            <path d="m20 20-4-4" stroke="currentColor" strokeLinecap="round" />
          </svg>
          بحث سريع
          <span className="font-mono rounded border border-border px-1 py-0.5 text-[10px] leading-none">
            Ctrl K
          </span>
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          aria-label="بحث سريع"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-ink hover:bg-primary-soft hover:text-primary transition"
        >
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} className="w-4.5 h-4.5">
            <circle cx="11" cy="11" r="6.5" stroke="currentColor" />
            <path d="m20 20-4-4" stroke="currentColor" strokeLinecap="round" />
          </svg>
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-surface shadow-elevated overflow-hidden animate-scale-in">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} className="w-4.5 h-4.5 text-ink-soft shrink-0">
                <circle cx="11" cy="11" r="6.5" stroke="currentColor" />
                <path d="m20 20-4-4" stroke="currentColor" strokeLinecap="round" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder="ابحث عن قسم... (الطلاب، الاختبارات، الإعدادات...)"
                className="flex-1 bg-transparent outline-none text-sm text-ink placeholder:text-ink-soft"
              />
              <kbd className="font-mono rounded border border-border px-1.5 py-0.5 text-[10px] text-ink-soft shrink-0">
                Esc
              </kbd>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {results.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-ink-soft">لا توجد نتائج مطابقة.</p>
              )}
              {results.map((item, i) => {
                const Icon = AdminIcons[item.icon];
                const active = i === activeIndex;
                return (
                  <button
                    key={item.href}
                    onClick={() => go(item.href)}
                    onMouseEnter={() => setActiveIndex(i)}
                    className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-start transition-colors"
                    style={{ background: active ? "var(--color-primary-soft)" : undefined }}
                  >
                    <span
                      className={`grid place-items-center w-8 h-8 rounded-lg shrink-0 ${
                        active ? "bg-primary text-white" : "bg-canvas text-ink-soft"
                      }`}
                    >
                      <Icon className="w-4.5 h-4.5" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-ink">{item.label}</span>
                      <span className="block text-xs text-ink-soft truncate">{item.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
