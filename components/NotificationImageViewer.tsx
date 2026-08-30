"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/// معاينة الصورة المصغّرة داخل بطاقة الإشعار - بتختفي بهدوء لو الرابط
/// بقى غير صالح بدل ما تسيب أيقونة "صورة مكسورة" ظاهرة للطالب.
function Thumbnail({ src, alt, onOpen }: { src: string; alt: string; onOpen: () => void }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- صورة مرفوعة عبر Vercel Blob، ليست next/image
    <img
      src={src}
      alt={alt}
      draggable={false}
      onError={() => setFailed(true)}
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      onContextMenu={(e) => e.preventDefault()}
      className="mt-2 w-full max-h-40 rounded-lg object-cover cursor-zoom-in select-none"
      style={{ WebkitTouchCallout: "none" } as React.CSSProperties}
    />
  );
}

/// عرض الصورة بحجمها الكامل للمعاينة فقط - مفيش رابط تحميل ولا زرار حفظ،
/// وقائمة سياق المتصفح ("حفظ الصورة باسم...") ومعاينة اللمس الطويل على
/// الموبايل ("حفظ في الصور") متعطّلين. تنبيه واقعي: ده مانع للتحميل
/// العادي بس، مش حماية مطلقة (لقطة شاشة تفضل ممكنة دايمًا زي أي صورة
/// بتتعرض على شاشة).
function FullscreenViewer({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // بنعمل render للفيوير في document.body مباشرة (Portal) بدل ما يفضل
  // متداخل جوّه <button> صف الإشعار - لأن زرار الإغلاق هنا لازم يبقى
  // <button> برضه، وعنصر <button> جوّه <button> تاني HTML غير صحيح وبيكسر
  // التصرّف. البورتال بيحل المشكلة من غير ما نغيّر بنية صف الإشعار.
  return createPortal(
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/85 backdrop-blur-sm p-6 animate-fade-in-up"
      style={{ animationDuration: "0.15s" }}
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="إغلاق"
        className="absolute top-4 end-4 grid place-items-center w-9 h-9 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
      >
        <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} className="w-5 h-5">
          <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeLinecap="round" />
        </svg>
      </button>

      {/* الصورة نفسها pointer-events-none، وطبقة شفافة فوقها بتلقّف كل
          التفاعل (ضغطة/لمسة طويلة/كليك يمين) بدل ما توصل للصورة مباشرة -
          كده متصفح الموبايل ميعرضش خيار "حفظ في الصور" أصلًا. */}
      <div
        className="relative max-w-[92vw] max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- صورة مرفوعة عبر Vercel Blob، ليست next/image */}
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="max-w-[92vw] max-h-[85vh] w-auto h-auto rounded-lg object-contain select-none pointer-events-none"
          style={{ WebkitTouchCallout: "none" } as React.CSSProperties}
        />
        <div
          className="absolute inset-0"
          onContextMenu={(e) => e.preventDefault()}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        />
      </div>
    </div>,
    document.body
  );
}

export function NotificationImageViewer({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Thumbnail src={src} alt={alt} onOpen={() => setOpen(true)} />
      {open && <FullscreenViewer src={src} alt={alt} onClose={() => setOpen(false)} />}
    </>
  );
}
