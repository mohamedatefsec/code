import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";
import { settingsUpdateSchema } from "@/lib/validation";

/** يضمن وجود صف الإعدادات دائمًا (Singleton) - يُنشأ تلقائيًا أول مرة إن لم يكن موجودًا. */
async function getOrCreateSettings() {
  const existing = await db.settings.findFirst();
  if (existing) return existing;
  return db.settings.create({ data: {} });
}

export async function GET() {
  const settings = await getOrCreateSettings();
  return NextResponse.json({ settings });
}

export async function PATCH(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = settingsUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "بيانات غير صالحة.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const current = await getOrCreateSettings();
  const updated = await db.settings.update({
    where: { id: current.id },
    // parsed.data مُتحقق منه بالفعل عبر zod أعلاه؛ الـ cast هنا فقط لتفادي
    // تعارض Prisma الصارم مع حقول Json الاختيارية (null بدل Prisma.JsonNull).
    data: parsed.data as Parameters<typeof db.settings.update>[0]["data"],
  });

  return NextResponse.json({ settings: updated });
}
