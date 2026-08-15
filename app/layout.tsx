import type { Metadata } from "next";
import { Cairo, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { db } from "@/lib/db";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

async function getSiteSettings() {
  try {
    return await db.settings.findFirst();
  } catch {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: settings?.platformName ?? "Code AI",
    description:
      settings?.description ??
      "منصة تعليمية لتدريس البرمجة والذكاء الاصطناعي لطلاب المرحلة الثانوية",
  };
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const settings = await getSiteSettings();

  // نتحقق من صيغة اللون قبل حقنه داخل <style> مباشرة (دفاع إضافي رغم أن
  // القيمة أصلًا مُتحقَّق منها بنفس الصيغة عند الحفظ في lib/validation.ts).
  const primary = settings?.primaryColor && HEX_RE.test(settings.primaryColor) ? settings.primaryColor : null;
  const accent = settings?.secondaryColor && HEX_RE.test(settings.secondaryColor) ? settings.secondaryColor : null;

  const dynamicThemeCss = (primary || accent)
    ? `:root, .dark {
        ${primary ? `--color-primary: ${primary};
        --color-primary-dim: color-mix(in srgb, ${primary} 80%, black);
        --color-primary-soft: color-mix(in srgb, ${primary} 12%, white);
        --color-primary-glow: color-mix(in srgb, ${primary} 28%, transparent);` : ""}
        ${accent ? `--color-accent: ${accent};
        --color-accent-soft: color-mix(in srgb, ${accent} 14%, white);
        --color-accent-glow: color-mix(in srgb, ${accent} 24%, transparent);` : ""}
      }
      .dark {
        ${primary ? `--color-primary-soft: color-mix(in srgb, ${primary} 20%, black);` : ""}
        ${accent ? `--color-accent-soft: color-mix(in srgb, ${accent} 16%, black);` : ""}
      }`
    : null;

  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* يُنفَّذ قبل أول رسم (paint) لتفادي "وميض" اللون الغلط لحظة تحميل
            الصفحة - لازم يكون Inline Script وليس مكوّن React عادي. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('code-ai-theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
        {/* ألوان الهوية اللي يختارها الأدمن من الإعدادات - تُطبَّق على كل
            المنصة فعليًا (مش مجرد قيمة مخزّنة بلا أثر) عبر الكتابة فوق
            متغيرات CSS الافتراضية في globals.css. */}
        {dynamicThemeCss && <style dangerouslySetInnerHTML={{ __html: dynamicThemeCss }} />}
      </head>
      <body className="min-h-full flex flex-col bg-canvas text-ink font-sans">
        {children}
      </body>
    </html>
  );
}
