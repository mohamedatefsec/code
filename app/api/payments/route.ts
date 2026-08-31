import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";
import { paymentCreateSchema } from "@/lib/validation";

export async function GET(req: NextRequest) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("studentId");
  if (!studentId) {
    return NextResponse.json({ error: "بيانات الطالب مفقودة." }, { status: 400 });
  }

  const payments = await db.payment.findMany({
    where: { studentId },
    orderBy: { paidAt: "desc" },
  });

  return NextResponse.json({ payments });
}

export async function POST(req: NextRequest) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = paymentCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "بيانات غير صالحة.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const student = await db.studentProfile.findUnique({ where: { id: parsed.data.studentId } });
  if (!student) {
    return NextResponse.json({ error: "الطالب غير موجود." }, { status: 404 });
  }

  const payment = await db.payment.create({
    data: {
      studentId: parsed.data.studentId,
      amount: parsed.data.amount,
      note: parsed.data.note || null,
      paidAt: parsed.data.paidAt ? new Date(parsed.data.paidAt) : new Date(),
      createdBy: session.userId,
    },
  });

  return NextResponse.json({ payment }, { status: 201 });
}
