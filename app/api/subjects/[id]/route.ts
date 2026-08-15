import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }
  const { id } = await params;

  const unitsCount = await db.unit.count({ where: { subjectId: id } });
  if (unitsCount > 0) {
    return NextResponse.json(
      { error: `لا يمكن حذف المادة، بها ${unitsCount} وحدة. احذف الوحدات أولًا.` },
      { status: 409 }
    );
  }

  await db.subject.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
