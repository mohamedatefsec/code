import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }
  const { id } = await params;

  const payment = await db.payment.findUnique({ where: { id } });
  if (!payment) {
    return NextResponse.json({ error: "الدفعة غير موجودة." }, { status: 404 });
  }

  await db.payment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
