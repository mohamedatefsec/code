import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/auth";
import { getPaidStudentsReport } from "@/lib/payments-report";

const querySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "تاريخ البداية غير صالح"),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "تاريخ النهاية غير صالح"),
  groupId: z.string().min(1).max(64).optional(),
});

/// تقرير الطلاب اللي سدّدوا الاشتراك خلال فترة، مع تفاصيل حضورهم (للأدمن فقط).
export async function GET(req: NextRequest) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const parsed = querySchema.safeParse({
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
    groupId: sp.get("groupId") || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "اختر تاريخ بداية ونهاية صحيحين." }, { status: 400 });
  }

  const { from, to, groupId } = parsed.data;
  // Date بيرفض التواريخ المستحيلة (مثل 2026-02-31) لما تتحوّل لنص تاني
  const valid = (d: string) => new Date(`${d}T00:00:00.000Z`).toISOString().slice(0, 10) === d;
  if (!valid(from) || !valid(to)) {
    return NextResponse.json({ error: "تاريخ غير صالح." }, { status: 400 });
  }
  if (from > to) {
    return NextResponse.json({ error: "تاريخ البداية لازم يكون قبل تاريخ النهاية." }, { status: 400 });
  }
  const spanDays = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000;
  if (spanDays > 1100) {
    return NextResponse.json({ error: "الفترة أطول من اللازم (الحد 3 سنوات)." }, { status: 400 });
  }

  const report = await getPaidStudentsReport({ from, to, groupId });
  return NextResponse.json(report);
}
