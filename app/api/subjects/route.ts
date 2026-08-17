import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession, getCurrentSession } from "@/lib/auth";
import { subjectCreateSchema } from "@/lib/validation";
import { generateUniqueSubjectSlug } from "@/lib/slug";
import { Prisma } from "@prisma/client";

export async function GET() {
  // متاح للأدمن (للإدارة) وللطالب (لعرض المواد)، لذا يكفي التحقق من وجود جلسة
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }

  const subjects = await db.subject.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { units: true } } },
  });

  return NextResponse.json({ subjects });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = subjectCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "بيانات غير صالحة.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const slug = await generateUniqueSubjectSlug(parsed.data.name);
    const subject = await db.subject.create({ data: { ...parsed.data, slug } });
    return NextResponse.json({ subject }, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "حدث تعارض أثناء إنشاء المادة، حاول مرة أخرى." }, { status: 409 });
    }
    throw err;
  }
}
