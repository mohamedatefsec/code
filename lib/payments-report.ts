import { db } from "@/lib/db";

/// المنطقة الزمنية اللي بتتحسب بيها حدود "اليوم" في التقارير (بداية ونهاية
/// الفترة). السيرفر على Vercel بيشتغل UTC، فبدونها دفعة اتسجّلت الساعة 1 بعد
/// منتصف الليل بتوقيت القاهرة كانت هتتحسب على اليوم اللي قبله.
export const REPORT_TIMEZONE = "Africa/Cairo";

function tzOffsetMinutes(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" }).formatToParts(at);
  const name = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const m = /GMT([+-])(\d{2}):?(\d{2})?/.exec(name);
  if (!m) return 0;
  return (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0));
}

/// اللحظة (UTC) اللي بيبدأ عندها اليوم "YYYY-MM-DD" في المنطقة الزمنية المحددة.
export function startOfDayInTz(dateStr: string, timeZone = REPORT_TIMEZONE): Date {
  const utcMidnight = new Date(`${dateStr}T00:00:00.000Z`);
  const first = utcMidnight.getTime() - tzOffsetMinutes(utcMidnight, timeZone) * 60000;
  // نعيد الحساب بفرق التوقيت عند اللحظة الناتجة (يغطي تغيّر التوقيت الصيفي)
  const second = utcMidnight.getTime() - tzOffsetMinutes(new Date(first), timeZone) * 60000;
  return new Date(second);
}

export function addDaysToDateStr(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

type AttendanceStats = {
  /// حاضر + متأخر (المتأخر بيتحسب حضور فعلي، زي تقرير الحضور الحالي)
  attended: number;
  total: number;
  percentage: number | null;
};

function toStats(statuses: string[]): AttendanceStats {
  const total = statuses.length;
  const attended = statuses.filter((s) => s === "present" || s === "late").length;
  return {
    attended,
    total,
    percentage: total > 0 ? Math.round((attended / total) * 1000) / 10 : null,
  };
}

export type PaidStudentRow = {
  studentId: string;
  fullName: string;
  studentCode: string;
  groupName: string | null;
  isActive: boolean;
  /// بداية تسجيل الطالب: تاريخ بداية الحضور لو اتحدد، وإلا تاريخ إنشاء حسابه
  registrationDate: string;
  payments: { amount: number; paidAt: string; note: string | null }[];
  paidTotal: number;
  /// حضور الطالب داخل الفترة المختارة
  period: AttendanceStats;
  /// حضور الطالب من بداية تسجيله لحد النهاردة
  sinceRegistration: AttendanceStats;
};

/**
 * الطلاب اللي سدّدوا دفعة واحدة على الأقل داخل الفترة [from, to] (شاملة اليومين)،
 * مع تفاصيل حضورهم. "إجمالي الحصص" = الحصص اللي للطالب سجل فيها فعليًا (حاضر/
 * متأخر/غائب)، بنفس منطق تقرير الحضور الحالي، ومع تجاهل أي حصة قبل تاريخ
 * بداية حضور الطالب لو الأدمن حدده.
 */
export async function getPaidStudentsReport(opts: { from: string; to: string; groupId?: string | null }) {
  const payFrom = startOfDayInTz(opts.from);
  const payTo = startOfDayInTz(addDaysToDateStr(opts.to, 1));
  const sessionFrom = new Date(`${opts.from}T00:00:00.000Z`);
  const sessionTo = new Date(`${opts.to}T00:00:00.000Z`);

  const students = await db.studentProfile.findMany({
    where: {
      ...(opts.groupId ? { groupId: opts.groupId } : {}),
      payments: { some: { paidAt: { gte: payFrom, lt: payTo } } },
    },
    select: {
      id: true,
      fullName: true,
      studentCode: true,
      createdAt: true,
      attendanceStartDate: true,
      group: { select: { name: true } },
      user: { select: { status: true } },
      payments: {
        where: { paidAt: { gte: payFrom, lt: payTo } },
        orderBy: { paidAt: "asc" },
        select: { amount: true, paidAt: true, note: true },
      },
    },
    orderBy: [{ group: { name: "asc" } }, { fullName: "asc" }],
  });

  const ids = students.map((s) => s.id);
  const records = ids.length
    ? await db.attendanceRecord.findMany({
        where: { studentId: { in: ids } },
        select: { studentId: true, status: true, session: { select: { sessionDate: true } } },
      })
    : [];

  const byStudent = new Map<string, { status: string; date: Date }[]>();
  for (const r of records) {
    const list = byStudent.get(r.studentId) ?? [];
    list.push({ status: r.status, date: r.session.sessionDate });
    byStudent.set(r.studentId, list);
  }

  const rows: PaidStudentRow[] = students.map((s) => {
    const all = (byStudent.get(s.id) ?? []).filter(
      (r) => !s.attendanceStartDate || r.date >= s.attendanceStartDate
    );
    const inPeriod = all.filter((r) => r.date >= sessionFrom && r.date <= sessionTo);
    const paidTotal = Math.round(s.payments.reduce((sum, p) => sum + p.amount, 0) * 100) / 100;

    return {
      studentId: s.id,
      fullName: s.fullName,
      studentCode: s.studentCode,
      groupName: s.group?.name ?? null,
      isActive: s.user.status === "active",
      registrationDate: (s.attendanceStartDate ?? s.createdAt).toISOString().slice(0, 10),
      payments: s.payments.map((p) => ({
        amount: p.amount,
        paidAt: p.paidAt.toISOString(),
        note: p.note,
      })),
      paidTotal,
      period: toStats(inPeriod.map((r) => r.status)),
      sinceRegistration: toStats(all.map((r) => r.status)),
    };
  });

  const totalAmount = Math.round(rows.reduce((sum, r) => sum + r.paidTotal, 0) * 100) / 100;

  return { from: opts.from, to: opts.to, count: rows.length, totalAmount, rows };
}
