import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ‎@napi-rs/canvas وحدة أصلية (native addon) تُحمَّل عبر require عادي وقت
  // التشغيل. تضمينها هنا يمنع Turbopack من محاولة تجميعها ضمن حزمة ESM (وهو
  // ما يفشل لأن ملف الربط الأصلي غير قابل للوضع داخل حزمة كهذه)، ويتركها
  // تُحل بشكل طبيعي من node_modules وقت التشغيل على السيرفر.
  serverExternalPackages: ["@napi-rs/canvas"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
  // مسار /api/pdf-page يقرأ ملفات خطوط pdfjs-dist القياسية (standard_fonts)
  // عبر مسار ملف يُبنى وقت التشغيل (path.join(process.cwd(), ...))، وهذا لا
  // يُكتشف تلقائيًا بتتبّع next.js الثابت للاستيرادات. نضيفه صراحة هنا حتى
  // يُدرَج ضمن حزمة الدالة السيرفرلس عند النشر على Vercel.
  outputFileTracingIncludes: {
    "/api/pdf-page/route": ["./node_modules/pdfjs-dist/standard_fonts/**"],
  },
};

export default nextConfig;
