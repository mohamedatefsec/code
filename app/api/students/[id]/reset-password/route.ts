import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession, hashPassword } from "@/lib/auth";
import { resetPasswordSchema } from "@/lib/validation";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "بيانات غير صالحة.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const student = await db.studentProfile.findUnique({ where: { id } });
  if (!student) {
    return NextResponse.json({ error: "الطالب غير موجود." }, { status: 404 });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await db.user.update({
    where: { id: student.userId },
    data: { passwordHash },
  });

  return NextResponse.json({ ok: true });
}
