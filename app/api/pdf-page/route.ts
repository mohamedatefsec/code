import { NextRequest } from "next/server";
import path from "node:path";
import { getCurrentSession } from "@/lib/auth";
import { createCanvas, type Canvas, type SKRSContext2D } from "@napi-rs/canvas";

/**
 * يحوّل صفحة PDF إلى صورة PNG على السيرفر بدل الاعتماد على PDF.js داخل
 * متصفح الطالب. بعض هواتف أندرويد تفشل بصمت (بلا أي خطأ) في رسم عارض
 * PDF.js على عنصر <canvas> بسبب قيود ذاكرة/تسريع رسومي على الجهاز نفسه؛
 * تحويل الصفحة لصورة عادية على السيرفر يتجنب هذه المشكلة تمامًا لأن أي
 * متصفح على أي جهاز يعرض صورة PNG عادية بلا أي تعقيد.
 *
 * يعمل هذا المسار حصرًا على بيئة Node.js (وليس Edge) لأن @napi-rs/canvas
 * وحدة أصلية (native) لا تُشغَّل على Edge Runtime.
 */
export const runtime = "nodejs";

// تحويل صفحة PDF غنية بالتفاصيل لصورة قد يأخذ وقتًا أطول من طلب API عادي.
export const maxDuration = 30;

function parseAllowedBlobUrl(fileUrl: string): URL | null {
  let parsed: URL;
  try {
    parsed = new URL(fileUrl);
  } catch {
    return null;
  }
  // نسمح فقط بروابط Vercel Blob الخاصة بمشروعنا لمنع تحويل هذا المسار إلى
  // بروكسي عام لأي رابط على الإنترنت.
  const isVercelBlobHost =
    parsed.protocol === "https:" && parsed.hostname.endsWith(".public.blob.vercel-storage.com");
  return isVercelBlobHost ? parsed : null;
}

/** يوفّر لمكتبة pdfjs-dist طريقة لإنشاء/إعادة ضبط/تدمير Canvas داخل Node.js. */
class NodeCanvasFactory {
  create(width: number, height: number) {
    const canvas = createCanvas(width, height);
    const context = canvas.getContext("2d");
    return { canvas, context };
  }
  reset(canvasAndContext: { canvas: Canvas; context: SKRSContext2D }, width: number, height: number) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }
  destroy(canvasAndContext: { canvas: Canvas; context: SKRSContext2D | null }) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.context = null;
  }
}

/// أقصى حجم PDF نقبل نحوّله لصورة (تحويل ملفات ضخمة بيستهلك ذاكرة ووقت)
const MAX_PDF_BYTES = 30 * 1024 * 1024;

export async function GET(request: NextRequest) {
  // تحويل PDF لصورة عملية تقيلة على السيرفر: للمسجّلين بس، وإلا أي حد على
  // الإنترنت كان يقدر يستنزف موارد المنصة.
  if (!(await getCurrentSession())) {
    return new Response("غير مصرّح.", { status: 401 });
  }

  const fileUrl = request.nextUrl.searchParams.get("url");
  const metaOnly = request.nextUrl.searchParams.get("meta") === "1";
  const pageParam = request.nextUrl.searchParams.get("page");
  const widthParam = request.nextUrl.searchParams.get("width");

  if (!fileUrl) {
    return new Response("رابط الملف مفقود.", { status: 400 });
  }

  const parsed = parseAllowedBlobUrl(fileUrl);
  if (!parsed) {
    return new Response("مصدر ملف غير مسموح به.", { status: 400 });
  }

  // redirect: "error" - ممنوع نتّبع أي تحويل لمكان تاني (ممكن يكسر قائمة السماح)
  const upstream = await fetch(parsed.toString(), { redirect: "error" }).catch(() => null);
  if (!upstream || !upstream.ok) {
    return new Response("تعذّر جلب الملف.", { status: 502 });
  }
  if (Number(upstream.headers.get("content-length") ?? 0) > MAX_PDF_BYTES) {
    return new Response("الملف كبير جدًا.", { status: 413 });
  }
  const buffer0 = await upstream.arrayBuffer();
  if (buffer0.byteLength > MAX_PDF_BYTES) {
    return new Response("الملف كبير جدًا.", { status: 413 });
  }
  const bytes = new Uint8Array(buffer0);

  try {
    // نسخة pdfjs-dist المخصصة لبيئة Node (legacy build): تعمل بدون DOM أو
    // Worker منفصل، وهو ما يناسب التنفيذ داخل دالة سيرفرلس واحدة.
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

    // pdfjs-dist يحاول تحديد مسار ملف الـ worker تلقائيًا استنادًا لمكانه
    // النسبي داخل node_modules، لكن حزم النشر السيرفرلس (Vercel) تعيد ترتيب
    // الملفات فتكسر هذا التخمين التلقائي وتظهر رسالة "Cannot find module".
    // نحدد المسار صراحة هنا لتفادي الاعتماد على التخمين.
    pdfjsLib.GlobalWorkerOptions.workerSrc = path.join(
      process.cwd(),
      "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"
    );

    const loadingTask = pdfjsLib.getDocument({
      data: bytes,
      disableFontFace: true,
      useSystemFonts: false,
      standardFontDataUrl: path.join(process.cwd(), "node_modules/pdfjs-dist/standard_fonts") + "/",
    });
    const pdf = await loadingTask.promise;

    if (metaOnly) {
      return Response.json({ numPages: pdf.numPages });
    }

    const pageNum = Math.max(1, Math.min(pdf.numPages, Number(pageParam) || 1));
    // نحدّ العرض المطلوب بين حد أدنى (وضوح مقبول) وحد أقصى (تفادي استهلاك
    // ذاكرة/وقت مفرط لصورة أكبر من اللازم).
    const targetWidth = Math.max(400, Math.min(2000, Number(widthParam) || 1000));

    const page = await pdf.getPage(pageNum);
    const unscaledViewport = page.getViewport({ scale: 1 });
    const scale = targetWidth / unscaledViewport.width;
    const viewport = page.getViewport({ scale });

    const canvasFactory = new NodeCanvasFactory();
    const { canvas, context } = canvasFactory.create(
      Math.ceil(viewport.width),
      Math.ceil(viewport.height)
    );

    // تعريفات TypeScript الخاصة بـ pdfjs-dist مبنية على افتراض متصفح، ولا
    // تعرف معاملات تشغيل Node.js (canvasContext من @napi-rs/canvas،
    // canvasFactory)؛ الطرح الصريح هنا موثّق وصحيح وقت التشغيل رغم ذلك.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await page.render({
      canvasContext: context,
      viewport,
      canvasFactory,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any).promise;

    const buffer: Uint8Array = canvas.toBuffer("image/png");

    // خلاف طفيف بين أنواع Uint8Array الخاصة بـ Node وتعريفات DOM لـ BodyInit؛
    // القيمة صحيحة وقت التشغيل (Response تقبل Uint8Array فعليًا).
    return new Response(buffer as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        // الرابط الأصلي يحمل لاحقة عشوائية فريدة عند كل رفع، فمن الآمن
        // تخزين الصورة الناتجة في الكاش لمدة طويلة دون قلق من تغيّر المحتوى.
        // private: الصورة ناتجة من ملف للمسجّلين فقط، فمنسمحش لكاش عام (CDN) يقدّمها لغير المسجّلين
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("PDF page render error:", err);
    return new Response("تعذّر تحويل صفحة الملف إلى صورة.", { status: 500 });
  }
}
