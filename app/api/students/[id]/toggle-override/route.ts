import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }
  const { id } = await params;

  const student = await db.studentProfile.findUnique({
    where: { id },
    select: { subscriptionOverride: true },
  });
  if (!student) {
    return NextResponse.json({ error: "الطالب غير موجود." }, { status: 404 });
  }

  const updated = await db.studentProfile.update({
    where: { id },
    data: { subscriptionOverride: !student.subscriptionOverride },
    select: { subscriptionOverride: true },
  });

  return NextResponse.json({ subscriptionOverride: updated.subscriptionOverride });
}
