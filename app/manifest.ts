import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

/// نولّد ملف الـ manifest ديناميكيًا من إعدادات الأدمن (اسم المنصة ولون
/// الهوية) بدل ما يبقى ثابت مكتوب يدويًا - عشان لو الأدمن غيّر اسم المنصة
/// أو الألوان من صفحة الإعدادات، انعكاسها يوصل حتى لأيقونة التطبيق
/// ولون شريط النظام لما يتثبّت على شاشة الطالب الرئيسية.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await db.settings.findFirst().catch(() => null);
  const name = settings?.platformName?.trim() || "Code AI";
  const themeColor =
    settings?.primaryColor && /^#[0-9a-fA-F]{6}$/.test(settings.primaryColor)
      ? settings.primaryColor
      : "#4f46e5";

  return {
    name,
    short_name: name,
    description: settings?.description || "منصة تعليمية لتدريس البرمجة والذكاء الاصطناعي",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0f1a",
    theme_color: themeColor,
    lang: "ar",
    dir: "rtl",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
