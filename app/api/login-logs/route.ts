import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";

const RESULTS = ["success", "failed", "blocked", "disabled"] as const;

/// سجل الدخول (آخر 300 عملية) مع تنبيهات المشاركة المحتملة:
///  - ipAccountCount: كام حساب مختلف دخل بنجاح من نفس الـ IP ده
///  - accountIpCount: كام IP مختلف دخل منه نفس الحساب ده بنجاح
export async function GET(req: NextRequest) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const result = req.nextUrl.searchParams.get("result") ?? "";

  const where: Record<string, unknown> = {};
  if ((RESULTS as readonly string[]).includes(result)) where.result = result;
  if (q) {
    where.OR = [
      { ip: { contains: q } },
      { loginIdentifier: { contains: q, mode: "insensitive" } },
      { user: { studentProfile: { fullName: { contains: q, mode: "insensitive" } } } },
    ];
  }

  const [logs, pairs, blocked] = await Promise.all([
    db.loginLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 300,
      include: {
        user: {
          select: {
            role: true,
            studentProfile: { select: { fullName: true, studentCode: true } },
          },
        },
      },
    }),
    // أزواج (حساب، IP) المميّزة لعمليات الدخول الناجحة - للكشف عن المشاركة
    db.loginLog.groupBy({
      by: ["userId", "ip"],
      where: { result: "success", userId: { not: null } },
    }),
    db.blockedIp.findMany({ select: { ip: true } }),
  ]);

  const usersByIp = new Map<string, Set<string>>();
  const ipsByUser = new Map<string, Set<string>>();
  for (const p of pairs) {
    if (!p.userId) continue;
    (usersByIp.get(p.ip) ?? usersByIp.set(p.ip, new Set()).get(p.ip)!).add(p.userId);
    (ipsByUser.get(p.userId) ?? ipsByUser.set(p.userId, new Set()).get(p.userId)!).add(p.ip);
  }
  const blockedSet = new Set(blocked.map((b) => b.ip));

  return NextResponse.json({
    logs: logs.map((l) => ({
      id: l.id,
      createdAt: l.createdAt,
      ip: l.ip,
      result: l.result,
      userAgent: l.userAgent,
      loginIdentifier: l.loginIdentifier,
      role: l.user?.role ?? null,
      studentName: l.user?.studentProfile?.fullName ?? null,
      studentCode: l.user?.studentProfile?.studentCode ?? l.loginIdentifier,
      ipAccountCount: usersByIp.get(l.ip)?.size ?? 0,
      accountIpCount: l.userId ? ipsByUser.get(l.userId)?.size ?? 0 : 0,
      blocked: blockedSet.has(l.ip),
    })),
  });
}
