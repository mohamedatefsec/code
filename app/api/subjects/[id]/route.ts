import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";
import { subjectCreateSchema } from "@/lib/validation";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }
  const { id } = await params;

  const body = await req.json().catch(() => null);
  // بنعيد استخدام نفس مخطط التحقق بتاع الإنشاء (name مطلوب، حتى 100 حرف)،
  // ونتجاهل حقل order هنا لو اتبعت لأن تعديل الاسم فقط هو المطلوب.
  const parsed = subjectCreateSchema.pick({ name: true }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "بيانات غير صالحة.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await db.subject.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    return NextResponse.json({ error: "المادة غير موجودة." }, { status: 404 });
  }

  // نكتفي بتعديل الاسم المعروض فقط، ونسيب الـ slug كما هو بدون تغيير حتى لا
  // تنكسر أي روابط أو مراجع مبنية عليه.
  const subject = await db.subject.update({
    where: { id },
    data: { name: parsed.data.name },
  });

  return NextResponse.json({ subject });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }
  const { id } = await params;

  const unitsCount = await db.unit.count({ where: { subjectId: id } });
  if (unitsCount > 0) {
    return NextResponse.json(
      { error: `لا يمكن حذف المادة، بها ${unitsCount} وحدة. احذف الوحدات أولًا.` },
      { status: 409 }
    );
  }

  await db.subject.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
