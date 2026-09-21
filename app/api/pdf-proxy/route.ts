import { NextRequest } from "next/server";
import { getCurrentSession } from "@/lib/auth";

/// أقصى حجم PDF نقبله (حماية من استهلاك الباندويث)
const MAX_PDF_BYTES = 30 * 1024 * 1024;

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
  // المسار ده بيتصل بسيرفرات خارجية ويبثّ ملفات: لازم يبقى للمسجّلين بس، وإلا
  // أي حد على الإنترنت كان يقدر يستهلك باندويث المنصة.
  if (!(await getCurrentSession())) {
    return new Response("غير مصرّح.", { status: 401 });
  }

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

  // redirect: "error" - ممنوع نتّبع أي تحويل لمكان تاني (ممكن يكسر قائمة السماح)
  const upstream = await fetch(parsed.toString(), { redirect: "error" }).catch(() => null);
  if (!upstream || !upstream.ok || !upstream.body) {
    return new Response("تعذّر جلب الملف.", { status: 502 });
  }
  if (Number(upstream.headers.get("content-length") ?? 0) > MAX_PDF_BYTES) {
    return new Response("الملف كبير جدًا.", { status: 413 });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
