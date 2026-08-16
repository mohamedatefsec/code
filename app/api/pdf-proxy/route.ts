import { NextRequest } from "next/server";

/**
 * يمرّر (يبروكسي) ملف PDF من Vercel Blob عبر نفس نطاق الموقع (same-origin).
 *
 * عارض PDF.js (components/PdfViewer.tsx) يحتاج يقرأ محتوى الملف كبايتات
 * داخل المتصفح عبر fetch، وهذا يفعّل فحص CORS الذي لا ينطبق على استخدامات
 * الملف الأخرى (مثل <img> أو فتح رابط مباشر). بدل الاعتماد على إعدادات
 * CORS غير مضمونة على تخزين خارجي، يجيب هذا المسار الملف من السيرفر (لا
 * يخضع لقيود CORS بين الخوادم) ثم يبثّه (stream) للمتصفح من نفس النطاق.
 *
 * البث بدل التجميع الكامل في الذاكرة يتجنّب أيضًا حد الاستجابة الصارم
 * (4.5 ميجابايت) المفروض على دوال Vercel للاستجابات غير المُبثّة.
 */
export async function GET(request: NextRequest) {
  const fileUrl = request.nextUrl.searchParams.get("url");

  if (!fileUrl) {
    return new Response("رابط الملف مفقود.", { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(fileUrl);
  } catch {
    return new Response("رابط غير صالح.", { status: 400 });
  }

  // نسمح فقط بروابط Vercel Blob الخاصة بمشروعنا لمنع تحويل هذا المسار إلى
  // بروكسي عام لأي رابط على الإنترنت.
  const isVercelBlobHost =
    parsed.protocol === "https:" && parsed.hostname.endsWith(".public.blob.vercel-storage.com");
  if (!isVercelBlobHost) {
    return new Response("مصدر ملف غير مسموح به.", { status: 400 });
  }

  const upstream = await fetch(parsed.toString());
  if (!upstream.ok || !upstream.body) {
    return new Response("تعذّر جلب الملف.", { status: 502 });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
