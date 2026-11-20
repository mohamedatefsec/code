import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";

/// بيحفظ ترتيب دروس وحدة كاملة مرة واحدة: أول درس في القايمة بياخد ترتيب 0،
/// اللي بعده 1... وهكذا. بنبعت القايمة كلها عشان أي ترتيب قديم مكرّر أو فيه
/// فجوات (بعد حذف درس مثلًا) يتصلّح تلقائيًا.
const reorderSchema = z.object({
  unitId: z.string().min(1),
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
  const { unitId, ids } = parsed.data;

  // لازم القايمة تكون هي نفس دروس الوحدة بالظبط (من غير زيادة ولا نقص)
  const existing = await db.lesson.findMany({ where: { unitId }, select: { id: true } });
  const existingIds = new Set(existing.map((l) => l.id));
  if (new Set(ids).size !== ids.length || ids.length !== existingIds.size || ids.some((id) => !existingIds.has(id))) {
    return NextResponse.json(
      { error: "قايمة الدروس اتغيّرت. حدّث الصفحة وجرّب تاني." },
      { status: 409 }
    );
  }

  await db.$transaction(ids.map((id, index) => db.lesson.update({ where: { id }, data: { order: index } })));
  return NextResponse.json({ ok: true });
}
