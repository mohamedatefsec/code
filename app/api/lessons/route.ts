import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession, getCurrentSession } from "@/lib/auth";
import { lessonCreateSchema } from "@/lib/validation";

export async function GET(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const unitId = searchParams.get("unitId");
  const subjectId = searchParams.get("subjectId");
  if (!unitId && !subjectId) {
    return NextResponse.json({ error: "unitId أو subjectId مطلوب." }, { status: 400 });
  }

  const lessons = await db.lesson.findMany({
    where: {
      ...(unitId ? { unitId } : {}),
      ...(subjectId ? { unit: { subjectId } } : {}),
      ...(session.role === "student" ? { status: "published" } : {}),
    },
    include: { unit: { select: { title: true } } },
    orderBy: [{ unit: { order: "asc" } }, { order: "asc" }],
  });

  return NextResponse.json({ lessons });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = lessonCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "بيانات غير صالحة.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const lesson = await db.lesson.create({ data: parsed.data });
  return NextResponse.json({ lesson }, { status: 201 });
}
