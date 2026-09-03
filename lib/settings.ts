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

/// العبارة الصغيرة تحت اسم المنصة (شريط الطالب الجانبي) - قابلة للتعديل من
/// صفحة إعدادات الأدمن، وبترجع للنص الافتراضي "للتعلم الذكي" لو فاضية.
export async function getPlatformTagline(): Promise<string> {
  try {
    const settings = await db.settings.findFirst({ select: { tagline: true } });
    return settings?.tagline?.trim() || "للتعلم الذكي";
  } catch {
    return "للتعلم الذكي";
  }
}

/// صورة وبيانات الأدمن (المدرّس) اللي بتظهر جنب اسم المنصة في صفحة تسجيل
/// الدخول وشريط الطالب - بناخد أول حساب أدمن (المنصة مصمّمة لمدرّس واحد
/// أساسي حاليًا).
export async function getPrimaryAdminBrand(): Promise<{
  avatarUrl: string | null;
  fullName: string | null;
}> {
  try {
    const admin = await db.adminProfile.findFirst({
      orderBy: { id: "asc" },
      select: { avatarUrl: true, fullName: true },
    });
    return { avatarUrl: admin?.avatarUrl ?? null, fullName: admin?.fullName ?? null };
  } catch {
    return { avatarUrl: null, fullName: null };
  }
}
