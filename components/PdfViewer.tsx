"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, PDFDocumentLoadingTask } from "pdfjs-dist";

/**
 * عارض PDF مستضاف بالكامل داخل الموقع (PDF.js) بدل الاعتماد على خدمة خارجية
 * (Google Docs Viewer) أو عرض المتصفح المباشر للملف. بما أننا نبني الواجهة
 * بأنفسنا، لا يوجد أي زر "فتح في نافذة جديدة" أو تحميل أو طباعة في أي مكان -
 * فقط تنقّل بين الصفحات وتكبير/تصغير. هذا لا يمنع التحميل بشكل مطلق (يظل
 * ممكنًا عبر لقطة شاشة أو أدوات المطوّر)، لكنه أقصى تحكم ممكن تقنيًا.
 */
export function PdfViewer({ url, title }: { url: string; title?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
  const loadingTaskRef = useRef<PDFDocumentLoadingTask | null>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);

  const [numPages, setNumPages] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [scale, setScale] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // تحميل المستند عند تغيّر الرابط
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setNumPages(0);
    setPageNum(1);
    setScale(null);

    (async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        // نستضيف ملف الـ worker من نفس الموقع بدل CDN خارجي (unpkg)، لأن
        // بعض الشبكات (خصوصًا شبكات الموبايل/المدارس) تحجب أو تُبطئ الوصول
        // لنطاقات CDN خارجية، مما يجعل تحميل الملف يعلّق للأبد بلا أي خطأ.
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const loadingTask = pdfjsLib.getDocument({
          url: `/api/pdf-proxy?url=${encodeURIComponent(url)}`,
          // نتجنب طلبات Range (تحتاج إعداد CORS دقيق على السيرفر المُستضيف)
          // ونحمّل الملف كاملًا دفعة واحدة، وهو مناسب لحجم ملفات الدروس.
          disableRange: true,
          disableStream: true,
        });
        loadingTaskRef.current = loadingTask;
        // شبكة تحجب مصدر الملف بصمت (بدل رفض الطلب) قد تترك الوعد معلّقًا
        // للأبد؛ هذه المهلة تضمن ظهور رسالة خطأ للمستخدم دائمًا بدل تحميل
        // بلا نهاية.
        const timeoutMs = 20000;
        const pdf = await Promise.race([
          loadingTask.promise,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("انتهت مهلة تحميل الملف.")), timeoutMs)
          ),
        ]);
        if (cancelled) return;
        pdfDocRef.current = pdf;
        setNumPages(pdf.numPages);

        // نحسب مستوى تكبير أولي يملأ عرض الحاوية بدل مستوى ثابت صغير، حتى
        // يظهر النص واضحًا للقراءة من أول لحظة بدل الاعتماد على تكبير يدوي.
        const firstPage = await pdf.getPage(1);
        if (cancelled) return;
        const unscaledWidth = firstPage.getViewport({ scale: 1 }).width;
        const containerWidth = containerRef.current?.clientWidth ?? 800;
        const fitScale = Math.max(0.5, Math.min(2.5, (containerWidth - 32) / unscaledWidth));
        setScale(fitScale);
        setLoading(false);
      } catch (loadErr) {
        if (!cancelled) {
          console.error("PDF load error:", loadErr);
          const detail = loadErr instanceof Error ? loadErr.message : null;
          setError(
            detail
              ? `تعذّر تحميل الملف: ${detail}`
              : "تعذّر تحميل الملف. تأكد من اتصالك بالإنترنت وحاول مرة أخرى."
          );
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      loadingTaskRef.current?.destroy();
      loadingTaskRef.current = null;
      pdfDocRef.current = null;
    };
  }, [url]);

  // رسم الصفحة الحالية كل ما يتغيّر رقم الصفحة أو مستوى التكبير
  useEffect(() => {
    const pdf = pdfDocRef.current;
    if (!pdf || !canvasRef.current || scale === null) return;

    let cancelled = false;

    (async () => {
      const page = await pdf.getPage(pageNum);
      if (cancelled) return;

      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext("2d");
      if (!context) return;

      // رسم بدقة الشاشة الفعلية (devicePixelRatio) مع إبقاء الحجم الظاهر
      // على الصفحة كما هو، حتى يظهر النص حادًا وواضحًا على الشاشات عالية
      // الكثافة (Retina) بدل صورة ضبابية مكبَّرة.
      // نحدّ الدقة القصوى لتفادي فشل رسم الـ canvas بصمت على بعض هواتف
      // أندرويد ذات كثافة البكسل العالية (devicePixelRatio 3 فأكثر).
      const outputScale = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;

      renderTaskRef.current?.cancel();
      const task = page.render({ canvasContext: context, viewport, canvas, transform });
      renderTaskRef.current = task;
      try {
        await task.promise;
      } catch (renderErr) {
        // نتجاهل فقط أخطاء الإلغاء الطبيعية (تبديل سريع بين الصفحات)، ونعرض
        // أي خطأ حقيقي آخر بدل إخفائه، حتى نقدر نشخّص مشاكل الرسم الفعلية.
        const name = renderErr instanceof Error ? renderErr.name : "";
        if (name !== "RenderingCancelledException") {
          console.error("PDF render error:", renderErr);
          setError(
            renderErr instanceof Error
              ? `تعذّر رسم الصفحة: ${renderErr.message}`
              : "تعذّر رسم الصفحة لسبب غير معروف."
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pageNum, scale, numPages]);

  return (
    <div className="rounded-xl border border-border shadow-elevated bg-canvas overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-4 py-2.5">
        <span className="text-sm font-medium text-ink truncate">{title ?? "ملف PDF"}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPageNum((p) => Math.max(1, p - 1))}
            disabled={pageNum <= 1 || loading}
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
            disabled={pageNum >= numPages || loading}
            className="rounded-md border border-border px-2.5 py-1 text-sm hover:bg-canvas disabled:opacity-40 transition-colors"
          >
            التالي
          </button>
          <div className="w-px h-5 bg-border mx-1" />
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(0.5, +((s ?? 1) - 0.15).toFixed(2)))}
            disabled={loading}
            className="rounded-md border border-border px-2.5 py-1 text-sm hover:bg-canvas disabled:opacity-40 transition-colors"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(2.5, +((s ?? 1) + 0.15).toFixed(2)))}
            disabled={loading}
            className="rounded-md border border-border px-2.5 py-1 text-sm hover:bg-canvas disabled:opacity-40 transition-colors"
          >
            +
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="overflow-auto flex justify-center p-4"
        style={{ height: "70vh" }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {loading && <p className="text-sm text-ink-soft self-center">جارٍ تحميل الملف...</p>}
        {error && <p className="text-sm text-danger self-center">{error}</p>}
        {!loading && !error && <canvas ref={canvasRef} className="shadow-elevated h-fit" />}
      </div>
    </div>
  );
}
