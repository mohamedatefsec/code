import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";
import { z } from "zod";

const unsubscribeSchema = z.object({
  endpoint: z.string().url(),
});

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session || session.role !== "student") {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = unsubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صالحة." }, { status: 400 });
  }

  await db.pushSubscription.deleteMany({ where: { endpoint: parsed.data.endpoint } });

  return NextResponse.json({ ok: true });
}
