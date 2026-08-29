import { db } from "@/lib/db";

/// اسم المنصة الفعلي من الإعدادات (الهوية العامة) - يُستخدم بدل أي اسم
/// ثابت مكتوب يدويًا في الكود، عشان تغيير الاسم من صفحة الإعدادات ينعكس
/// فورًا في كل مكان (شريط الأدمن، شريط الطالب، صفحة تسجيل الدخول).
export async function getPlatformName(): Promise<string> {
  try {
    const settings = await db.settings.findFirst({ select: { platformName: true } });
    return settings?.platformName?.trim() || "Code AI";
  } catch {
    return "Code AI";
  }
}
