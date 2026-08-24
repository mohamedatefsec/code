import { NextRequest } from "next/server";
import path from "node:path";
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

export async function GET(request: NextRequest) {
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

  const upstream = await fetch(parsed.toString());
  if (!upstream.ok) {
    return new Response("تعذّر جلب الملف.", { status: 502 });
  }
  const bytes = new Uint8Array(await upstream.arrayBuffer());

  try {
    // نسخة pdfjs-dist المخصصة لبيئة Node (legacy build): تعمل بدون DOM أو
    // Worker منفصل، وهو ما يناسب التنفيذ داخل دالة سيرفرلس واحدة.
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

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
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("PDF page render error:", err);
    return new Response("تعذّر تحويل صفحة الملف إلى صورة.", { status: 500 });
  }
}
