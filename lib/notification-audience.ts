import { db } from "@/lib/db";

export type AudienceTarget =
  | { targetType: "all" }
  | { targetType: "group"; targetGroupId: string }
  | { targetType: "student"; targetStudentId: string };

/// بيرجّع IDs الطلاب اللي بيغطيهم استهداف معيّن (الكل / مجموعة / طالب
/// واحد) - نفس منطق استهداف الإشعارات الحالي، مستخدَم من أكتر من مكان
/// (نشر درس، نشر اختبار، إرسال إشعار يدوي) عشان نحدد لمين نبعت Push.
export async function resolveAudienceStudentIds(target: AudienceTarget): Promise<string[]> {
  if (target.targetType === "all") {
    const students = await db.studentProfile.findMany({ select: { id: true } });
    return students.map((s) => s.id);
  }
  if (target.targetType === "group") {
    const students = await db.studentProfile.findMany({
      where: { groupId: target.targetGroupId },
      select: { id: true },
    });
    return students.map((s) => s.id);
  }
  return [target.targetStudentId];
}

/// نسخة بتاخد أكتر من هدف مرة واحدة (زي اختبار مستهدِف أكتر من مجموعة)
/// وبترجع مجموعة IDs فريدة (بدون تكرار) مجمّعة من كل الأهداف.
export async function resolveAudienceStudentIdsMulti(targets: AudienceTarget[]): Promise<string[]> {
  const lists = await Promise.all(targets.map(resolveAudienceStudentIds));
  return [...new Set(lists.flat())];
}
