"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * ملاحظة صريحة: لا يوجد أي أسلوب في الويب يمنع تصوير الشاشة فعليًا
 * (Print Screen، أدوات القص، تصوير بموبايل تاني، برامج تسجيل الشاشة) —
 * دي قيود نظام التشغيل مش المتصفح. اللي هنا مجرد روادع تقلّل المحاولات
 * العرضية وتخلي أي تسريب قابل للتتبّع، مش منع كامل.
 */

/// يبني نمط SVG متكرر (tile) بيحتوي على اسم الطالب والوقت، مايل بزاوية،
/// عشان يبقى صعب إخفاؤه أو قصّه من الصورة لو حد صوّر الشاشة.
function buildWatermarkTile(label: string): string {
  const safeLabel = label.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="340" height="200">
      <text x="10" y="110" font-family="sans-serif" font-size="15"
        fill="rgba(120,120,140,0.16)" transform="rotate(-28 170 100)">${safeLabel}</text>
    </svg>
  `.trim();
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function WatermarkOverlay({ studentName }: { studentName: string }) {
  const [stamp, setStamp] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setStamp(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const label = useMemo(() => {
    const time = stamp.toLocaleString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    });
    return `${studentName} · ${time}`;
  }, [studentName, stamp]);

  const tileUrl = useMemo(() => buildWatermarkTile(label), [label]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[9999]"
      style={{
        backgroundImage: `url("${tileUrl}")`,
        backgroundRepeat: "repeat",
      }}
    />
  );
}

export function ScreenshotGuard({
  studentName,
  children,
}: {
  studentName: string;
  children: React.ReactNode;
}) {
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    const handleBlur = () => setIsActive(false);
    const handleFocus = () => setIsActive(true);
    const handleVisibility = () => setIsActive(document.visibilityState === "visible");

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return (
    <>
      <div
        className={`student-guard-root select-none transition-[filter] duration-200 ${
          isActive ? "" : "blur-lg brightness-50"
        }`}
        onContextMenu={(e) => e.preventDefault()}
        onCopy={(e) => e.preventDefault()}
        onCut={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      >
        {children}
      </div>
      <p className="student-guard-print-message text-center py-10 text-sm text-ink-soft">
        طباعة محتوى المنصة غير متاحة.
      </p>
      <WatermarkOverlay studentName={studentName} />
    </>
  );
}
