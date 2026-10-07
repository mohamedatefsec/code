import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireActiveUser, hashPassword, verifyPassword } from "@/lib/auth";
import { changePasswordSchema } from "@/lib/validation";

/**
 * يسمح للطالب المسجّل دخوله بتغيير كلمة مروره الخاصة بنفسه، بعد التحقق
 * من كلمة المرور الحالية - بنفس أسلوب تغيير كلمة مرور الأدمن تمامًا.
 * محدش غير الطالب نفسه (اللي عارف كلمة المرور الحالية) يقدر يستخدم
 * المسار ده؛ الأدمن قادر يعمل Reset لكلمة مرور الطالب من لوحته (بدون
 * معرفة القيمة الجديدة)، لكن مفيش أي مكان في النظام بيعرض كلمة مرور أي
 * حساب كنص صريح لأي حد - كل كلمات المرور متخزّنة مُشفَّرة (hash) فقط.
 */
export async function PATCH(req: NextRequest) {
  // requireActiveUser بترجع سجل المستخدم الكامل وبتتأكد إن الحساب فعّال،
  // فمش محتاجين استعلام تاني لجلب المستخدم.
  const user = await requireActiveUser("student");
  if (!user) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "بيانات غير صالحة.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const isCurrentValid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!isCurrentValid) {
    return NextResponse.json({ error: "كلمة المرور الحالية غير صحيحة." }, { status: 400 });
  }

  const newHash = await hashPassword(parsed.data.newPassword);
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash },
  });

  return NextResponse.json({ ok: true });
}
