"use client";

import { useEffect, useState } from "react";

/**
 * عارض PDF يعرض كل صفحة كصورة (PNG) مُولَّدة على السيرفر (عبر
 * /api/pdf-page)، بدل تحميل PDF.js ورسمه على <canvas> داخل متصفح الطالب.
 *
 * السبب: بعض هواتف أندرويد تفشل بصمت (بلا أي رسالة خطأ) في رسم عارض
 * PDF.js على canvas بسبب قيود ذاكرة/تسريع رسومي على الجهاز نفسه، رغم أن
 * تحميل وقراءة الملف نفسه ينجح. تحويل الصفحة لصورة عادية على السيرفر
 * يتجنب هذه المشكلة تمامًا، لأن أي متصفح على أي جهاز يعرض صورة PNG
 * عادية دون أي تعقيد. الأثر الجانبي: لا يوجد نص قابل للتحديد/النسخ داخل
 * الصفحة (وهو أصلًا متوافق مع نية عدم توفير زر تحميل/طباعة مباشر).
 */
export function PdfViewer({ url, title }: { url: string; title?: string }) {
  const [numPages, setNumPages] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [widthPx, setWidthPx] = useState(900);
  const [metaLoading, setMetaLoading] = useState(true);
  const [imgLoading, setImgLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // جلب عدد الصفحات عند تغيّر رابط الملف
  useEffect(() => {
    let cancelled = false;
    setMetaLoading(true);
    setError(null);
    setNumPages(0);
    setPageNum(1);

    fetch(`/api/pdf-page?url=${encodeURIComponent(url)}&meta=1`)
      .then((res) => {
        if (!res.ok) throw new Error("تعذّر قراءة الملف.");
        return res.json() as Promise<{ numPages: number }>;
      })
      .then((data) => {
        if (cancelled) return;
        setNumPages(data.numPages);
        setMetaLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError("تعذّر تحميل الملف. تأكد من اتصالك بالإنترنت وحاول مرة أخرى.");
          setMetaLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  // إظهار حالة تحميل قصيرة كل ما نتنقل لصفحة جديدة (الصورة نفسها لها onLoad)
  useEffect(() => {
    setImgLoading(true);
  }, [pageNum, widthPx, url]);

  const imageSrc = `/api/pdf-page?url=${encodeURIComponent(url)}&page=${pageNum}&width=${widthPx}`;

  return (
    <div className="rounded-xl border border-border shadow-elevated bg-canvas overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-4 py-2.5">
        <span className="text-sm font-medium text-ink truncate">{title ?? "ملف PDF"}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPageNum((p) => Math.max(1, p - 1))}
            disabled={pageNum <= 1 || metaLoading || !!error}
            className="rounded-md border border-border px-2.5 py-1 text-sm hover:bg-canvas disabled:opacity-40 transition-colors"
          >
            السابق
          </button>
          <span className="text-sm text-ink-soft min-w-[80px] text-center">
            {numPages > 0 ? `صفحة ${pageNum} من ${numPages}` : "..."}
          </span>
          <button
            type="button"
            onClick={() => setPageNum((p) => Math.min(numPages, p + 1))}
            disabled={pageNum >= numPages || metaLoading || !!error}
            className="rounded-md border border-border px-2.5 py-1 text-sm hover:bg-canvas disabled:opacity-40 transition-colors"
          >
            التالي
          </button>
          <div className="w-px h-5 bg-border mx-1" />
          <button
            type="button"
            onClick={() => setWidthPx((w) => Math.max(500, w - 150))}
            disabled={metaLoading || !!error}
            className="rounded-md border border-border px-2.5 py-1 text-sm hover:bg-canvas disabled:opacity-40 transition-colors"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => setWidthPx((w) => Math.min(1800, w + 150))}
            disabled={metaLoading || !!error}
            className="rounded-md border border-border px-2.5 py-1 text-sm hover:bg-canvas disabled:opacity-40 transition-colors"
          >
            +
          </button>
        </div>
      </div>

      <div
        className="relative overflow-auto flex justify-center p-4"
        style={{ height: "70vh" }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {metaLoading && <p className="text-sm text-ink-soft self-center">جارٍ تحميل الملف...</p>}
        {error && <p className="text-sm text-danger self-center">{error}</p>}
        {!metaLoading && !error && (
          <>
            {imgLoading && (
              <p className="text-sm text-ink-soft absolute top-1/2 -translate-y-1/2">
                جارٍ تحميل الصفحة...
              </p>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element -- صورة مولَّدة ديناميكيًا من مسار API داخلي بأبعاد متغيرة، لا تناسب قيود next/image */}
            <img
              src={imageSrc}
              alt={title ?? "صفحة PDF"}
              className={`h-fit shadow-elevated ${imgLoading ? "invisible" : ""}`}
              onLoad={() => setImgLoading(false)}
              onError={() => {
                setImgLoading(false);
                setError("تعذّر عرض هذه الصفحة.");
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
