import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";
import { z } from "zod";

const statusUpdateSchema = z.object({
  status: z.enum(["draft", "published"]),
});

/// تحديث حالة سؤال واحد بس (نشر / إرجاع لمسودة)، من غير الحاجة لإرسال
/// باقي بيانات السؤال والخيارات زي PATCH /api/questions/[id] الكامل -
/// مفيد لزرار "نشر" السريع في قائمة بنك الأسئلة.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = statusUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "حالة غير صالحة." }, { status: 400 });
  }

  const existing = await db.question.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    return NextResponse.json({ error: "السؤال غير موجود." }, { status: 404 });
  }

  const question = await db.question.update({
    where: { id },
    data: { status: parsed.data.status },
  });

  return NextResponse.json({ question });
}
