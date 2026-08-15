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
    include: { user: true },
  });
  if (!student) {
    return NextResponse.json({ error: "الطالب غير موجود." }, { status: 404 });
  }

  const newStatus = student.user.status === "active" ? "disabled" : "active";
  await db.user.update({
    where: { id: student.userId },
    data: { status: newStatus },
  });

  return NextResponse.json({ status: newStatus });
}
