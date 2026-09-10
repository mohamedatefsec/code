import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";

/// ينشر كل الأسئلة اللي حالتها "مسودة" والمطابقة للفلاتر الحالية في
/// صفحة بنك الأسئلة (نفس أسماء query params المستخدمة في GET
/// /api/questions)، عشان زرار "نشر كل المسودات" يحترم الفلترة اللي
/// الأدمن واقف عليها بدل ما ينشر كل أسئلة الموقع دفعة واحدة بالغلط.
export async function POST(req: NextRequest) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const subjectId = searchParams.get("subjectId");
  const unitId = searchParams.get("unitId");
  const lessonId = searchParams.get("lessonId");
  const type = searchParams.get("type");
  const difficulty = searchParams.get("difficulty");
  const search = searchParams.get("q")?.trim();

  const result = await db.question.updateMany({
    where: {
      status: "draft",
      ...(subjectId ? { subjectId } : {}),
      ...(unitId ? { unitId } : {}),
      ...(lessonId ? { lessonId } : {}),
      ...(type ? { type: type as never } : {}),
      ...(difficulty ? { difficulty: difficulty as never } : {}),
      ...(search ? { text: { contains: search, mode: "insensitive" } } : {}),
    },
    data: { status: "published" },
  });

  return NextResponse.json({ count: result.count });
}
