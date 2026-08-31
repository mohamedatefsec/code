"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type UnpaidStudent = {
  id: string;
  fullName: string;
  studentCode: string;
  groupName: string | null;
};

/// تنبيه "الطلاب اللي لسه ما سدّدوش" في هيدر الأدمن. بيتحسب حي (live) في
/// كل تحميل صفحة بدل ما يبقى إشعار مخزّن ثابت - ده أدق (بيختفي تلقائيًا
/// أول ما الأدمن يسجّل دفعة الطالب من غير أي إجراء "تعليم كمقروء" منفصل)
/// وما بيحتاجش أي مهمة مجدولة (cron) أو نظام إشعارات push خارجي.
export function UnpaidAlertBell() {
  const [data, setData] = useState<{ monthLabel: string; students: UnpaidStudent[] } | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/payments/unpaid-last-month")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => {});
  }, []);

  const count = data?.students.length ?? 0;
  if (!data || count === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`${count} طالب لم يسدّد اشتراك ${data.monthLabel}`}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border text-ink hover:bg-danger/10 hover:text-danger transition"
      >
        <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} className="w-4.5 h-4.5">
          <path
            d="M6 9.5a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13.5 6 9.5Z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M10 18a2 2 0 0 0 4 0" stroke="currentColor" strokeLinecap="round" />
        </svg>
        <span className="absolute -top-1 -end-1 grid place-items-center min-w-[18px] h-[18px] rounded-full bg-danger px-1 text-[10px] font-bold text-white animate-pulse-glow">
          {count}
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute top-11 end-0 z-40 w-72 rounded-xl border border-border bg-surface shadow-elevated p-3 animate-fade-in-up" style={{ animationDuration: "0.15s" }}>
            <p className="text-sm font-semibold text-ink px-1">
              {count} طالب لم يسدّد اشتراك {data.monthLabel}
            </p>
            <div className="mt-2 max-h-64 overflow-y-auto space-y-1">
              {data.students.map((s) => (
                <Link
                  key={s.id}
                  href={`/admin/students?q=${encodeURIComponent(s.studentCode)}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-danger/5 transition"
                >
                  <span className="text-ink">{s.fullName}</span>
                  <span className="text-xs text-ink-soft">{s.groupName ?? "—"}</span>
                </Link>
              ))}
            </div>
            <Link
              href="/admin/students"
              onClick={() => setOpen(false)}
              className="mt-2 block text-center rounded-lg bg-primary-soft px-3 py-1.5 text-xs font-medium text-primary hover:opacity-90 transition"
            >
              فتح صفحة الطلاب لتسجيل الدفعات
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
