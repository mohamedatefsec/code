import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession, hashPassword, verifyPassword } from "@/lib/auth";
import { changePasswordSchema } from "@/lib/validation";

/**
 * يسمح للأدمن المسجّل دخوله بتغيير كلمة مروره الخاصة من داخل لوحة التحكم،
 * بعد التحقق من كلمة المرور الحالية. لا علاقة له بإدارة حسابات الطلاب.
 */
export async function PATCH(req: NextRequest) {
  const session = await requireAdminSession();
  if (!session) {
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

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user) {
    return NextResponse.json({ error: "الحساب غير موجود." }, { status: 404 });
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
