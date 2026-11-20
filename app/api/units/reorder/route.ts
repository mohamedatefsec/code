import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";

/// بيحفظ ترتيب وحدات مادة كاملة مرة واحدة: الوحدة اللي في أول القايمة
/// بتاخد ترتيب 0، اللي بعدها 1... وهكذا. بنبعت القايمة كلها (مش وحدتين بس)
/// عشان أي ترتيب قديم مكرّر أو فيه فجوات (بعد حذف وحدة مثلًا) يتصلّح تلقائيًا.
const reorderSchema = z.object({
  subjectId: z.string().min(1),
  ids: z.array(z.string().min(1)).min(1).max(500),
});

export async function POST(req: NextRequest) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صالحة." }, { status: 400 });
  }
  const { subjectId, ids } = parsed.data;

  // لازم القايمة تكون هي نفس وحدات المادة بالظبط (من غير زيادة ولا نقص)
  const existing = await db.unit.findMany({ where: { subjectId }, select: { id: true } });
  const existingIds = new Set(existing.map((u) => u.id));
  if (new Set(ids).size !== ids.length || ids.length !== existingIds.size || ids.some((id) => !existingIds.has(id))) {
    return NextResponse.json(
      { error: "قايمة الوحدات اتغيّرت. حدّث الصفحة وجرّب تاني." },
      { status: 409 }
    );
  }

  await db.$transaction(ids.map((id, index) => db.unit.update({ where: { id }, data: { order: index } })));
  return NextResponse.json({ ok: true });
}
