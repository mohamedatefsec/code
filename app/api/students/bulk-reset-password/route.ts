import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession, hashPassword } from "@/lib/auth";
import { resetPasswordSchema } from "@/lib/validation";

/// يطبّق كلمة مرور واحدة على كل حسابات الطلاب دفعة واحدة. لا نخزّن كلمة
/// المرور كنص صريح في أي مكان (لا في هذا المسار ولا في جدول الإعدادات) -
/// نستقبلها، نعمل لها Hash مرة واحدة، ونطبّق نفس الـ Hash على كل الطلاب،
/// تمامًا زي إنشاء أي حساب طالب عادي. مسار "إعادة تعيين كلمة مرور طالب
/// واحد" (/api/students/[id]/reset-password) يفضل شغّال بجانب ده تمامًا،
/// فالأدمن يقدر يغيّر كلمة مرور طالب بعينه في أي وقت حتى بعد التطبيق الجماعي.
export async function POST(req: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "بيانات غير صالحة.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const result = await db.user.updateMany({
    where: { role: "student" },
    data: { passwordHash },
  });

  return NextResponse.json({ ok: true, count: result.count });
}
