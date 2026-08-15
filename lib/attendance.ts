import { db } from "@/lib/db";

export type AttendanceSummary = {
  totalSessions: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  /// النسبة تُحسب من (حاضر + متأخر) نسبة لإجمالي الحصص التي كان للطالب سجل فيها
  percentage: number | null;
};

/**
 * يحسب ملخّص حضور الطالب بناءً على الحصص التي له سجل فيها فعليًا
 * (وليس كل حصص المجموعة، حتى لا يُظلم طالب انضم للمجموعة متأخرًا).
 */
export async function getStudentAttendanceSummary(
  studentId: string
): Promise<AttendanceSummary> {
  const records = await db.attendanceRecord.findMany({
    where: { studentId },
    select: { status: true },
  });

  const totalSessions = records.length;
  const presentCount = records.filter((r) => r.status === "present").length;
  const lateCount = records.filter((r) => r.status === "late").length;
  const absentCount = records.filter((r) => r.status === "absent").length;

  const percentage =
    totalSessions > 0
      ? Math.round(((presentCount + lateCount) / totalSessions) * 1000) / 10
      : null;

  return { totalSessions, presentCount, lateCount, absentCount, percentage };
}
