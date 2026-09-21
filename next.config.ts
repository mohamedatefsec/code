import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ‎@napi-rs/canvas وحدة أصلية (native addon) تُحمَّل عبر require عادي وقت
  // التشغيل. تضمينها هنا يمنع Turbopack من محاولة تجميعها ضمن حزمة ESM (وهو
  // ما يفشل لأن ملف الربط الأصلي غير قابل للوضع داخل حزمة كهذه)، ويتركها
  // تُحل بشكل طبيعي من node_modules وقت التشغيل على السيرفر.
  serverExternalPackages: ["@napi-rs/canvas"],
  // ترويسات أمان أساسية على كل الصفحات. (مفيش CSP صارم هنا عمدًا: المنصة بتستخدم
  // سكريبت inline لتطبيق الثيم قبل أول رسم، وCSP ملزم بيحتاج nonce لكل طلب.)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          // منع فتح المنصة داخل iframe في موقع تاني (Clickjacking)
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
  // مسار /api/pdf-page يقرأ ملفات خطوط pdfjs-dist القياسية (standard_fonts)
  // وملف الـ worker (pdf.worker.mjs) عبر مسارات تُبنى وقت التشغيل
  // (path.join(process.cwd(), ...))، وهذا لا يُكتشف تلقائيًا بتتبّع next.js
  // الثابت للاستيرادات. نضيفها صراحة هنا حتى تُدرَج ضمن حزمة الدالة
  // السيرفرلس عند النشر على Vercel، وإلا تفشل الرسالة بـ "Cannot find module".
  outputFileTracingIncludes: {
    "/api/pdf-page/route": [
      "./node_modules/pdfjs-dist/standard_fonts/**",
      "./node_modules/pdfjs-dist/legacy/build/**",
    ],
  },
};

export default nextConfig;
