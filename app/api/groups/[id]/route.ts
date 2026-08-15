import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";
import { groupUpdateSchema } from "@/lib/validation";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = groupUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "بيانات غير صالحة.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const group = await db.group.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ group });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }
  const { id } = await params;

  const studentsCount = await db.studentProfile.count({ where: { groupId: id } });
  if (studentsCount > 0) {
    return NextResponse.json(
      { error: `لا يمكن حذف المجموعة، بها ${studentsCount} طالب. انقلهم لمجموعة أخرى أولًا.` },
      { status: 409 }
    );
  }

  await db.group.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
