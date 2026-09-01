import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";
import { questionBaseSchema, validateQuestionBusinessRules } from "@/lib/validation";

export async function GET(req: NextRequest) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const subjectId = searchParams.get("subjectId");
  const unitId = searchParams.get("unitId");
  const lessonId = searchParams.get("lessonId");
  // فلترة بعدة دروس مرة واحدة (مفصولة بفاصلة) - مستخدمة في صفحة إعداد
  // الاختبار عشان الأدمن يقدر يخلط أسئلة من كذا درس مع بعض.
  const lessonIdsParam = searchParams.get("lessonIds");
  const lessonIds = lessonIdsParam ? lessonIdsParam.split(",").filter(Boolean) : null;
  const type = searchParams.get("type");
  const difficulty = searchParams.get("difficulty");
  const status = searchParams.get("status");
  const search = searchParams.get("q")?.trim();

  const questions = await db.question.findMany({
    where: {
      ...(subjectId ? { subjectId } : {}),
      ...(unitId ? { unitId } : {}),
      ...(lessonId ? { lessonId } : {}),
      ...(lessonIds ? { lessonId: { in: lessonIds } } : {}),
      ...(type ? { type: type as never } : {}),
      ...(difficulty ? { difficulty: difficulty as never } : {}),
      ...(status ? { status: status as never } : {}),
      ...(search ? { text: { contains: search, mode: "insensitive" } } : {}),
    },
    include: {
      subject: { select: { name: true } },
      unit: { select: { title: true } },
      lesson: { select: { id: true, title: true } },
      _count: { select: { options: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ questions });
}

export async function POST(req: NextRequest) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = questionBaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "بيانات غير صالحة.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const businessError = validateQuestionBusinessRules(parsed.data);
  if (businessError) {
    return NextResponse.json({ error: businessError }, { status: 400 });
  }

  const { options, ...questionData } = parsed.data;

  const question = await db.question.create({
    data: {
      ...questionData,
      createdBy: session.userId,
      options: {
        create: options.map((o, index) => ({
          text: o.text,
          isCorrect: o.isCorrect,
          order: index,
        })),
      },
    },
    include: { options: true },
  });

  return NextResponse.json({ question }, { status: 201 });
}
