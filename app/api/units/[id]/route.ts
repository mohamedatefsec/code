import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";
import { unitUpdateSchema } from "@/lib/validation";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = unitUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "بيانات غير صالحة.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const unit = await db.unit.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ unit });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }
  const { id } = await params;

  const lessonsCount = await db.lesson.count({ where: { unitId: id } });
  if (lessonsCount > 0) {
    return NextResponse.json(
      { error: `لا يمكن حذف الوحدة، بها ${lessonsCount} درس. احذف الدروس أولًا.` },
      { status: 409 }
    );
  }

  await db.unit.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
