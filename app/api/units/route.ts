import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession, getCurrentSession } from "@/lib/auth";
import { unitCreateSchema } from "@/lib/validation";

export async function GET(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const subjectId = searchParams.get("subjectId");
  if (!subjectId) {
    return NextResponse.json({ error: "subjectId مطلوب." }, { status: 400 });
  }

  // الطالب يرى الوحدات المنشورة فقط، الأدمن يرى كل شيء
  const units = await db.unit.findMany({
    where: {
      subjectId,
      ...(session.role === "student" ? { status: "published" } : {}),
    },
    orderBy: { order: "asc" },
    include: { _count: { select: { lessons: true } } },
  });

  return NextResponse.json({ units });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = unitCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "بيانات غير صالحة.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const unit = await db.unit.create({ data: parsed.data });
  return NextResponse.json({ unit }, { status: 201 });
}
