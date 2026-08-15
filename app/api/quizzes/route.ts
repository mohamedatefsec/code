import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";
import { quizCreateSchema } from "@/lib/validation";

export async function GET() {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }

  const quizzes = await db.quiz.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      subject: { select: { name: true } },
      _count: { select: { questions: true, attempts: true } },
    },
  });

  return NextResponse.json({ quizzes });
}

export async function POST(req: NextRequest) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = quizCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "بيانات غير صالحة.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const quiz = await db.quiz.create({
    data: { ...parsed.data, createdBy: session.userId },
  });

  return NextResponse.json({ quiz }, { status: 201 });
}
