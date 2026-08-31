import { db } from "@/lib/db";

/// بيرجّع حدود "الشهر السابق الكامل" بالنسبة للحظة الحالية - مفيد عشان
/// نراجع سداد الاشتراك بعد ما الشهر يخلص فعليًا، مش الشهر الجاري اللي
/// لسه ما انتهاش.
export function getLastMonthRange(now = new Date()) {
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return { start: startOfLastMonth, end: startOfThisMonth };
}

/// الطلاب النشطين اللي مالهمش أي دفعة مسجّلة خلال الشهر السابق الكامل -
/// بنستبعد الطلاب اللي انضموا بعد ما الشهر ده خلص (يعني لسه جداد ومكانش
/// متوقّع منهم يدفعوا عن شهر مكانوش مسجّلين فيه أصلًا).
export async function getUnpaidStudentsLastMonth(now = new Date()) {
  const { start, end } = getLastMonthRange(now);

  const students = await db.studentProfile.findMany({
    where: {
      createdAt: { lt: end },
      user: { status: "active" },
    },
    select: {
      id: true,
      fullName: true,
      studentCode: true,
      group: { select: { name: true } },
      payments: {
        where: { paidAt: { gte: start, lt: end } },
        select: { id: true },
        take: 1,
      },
    },
  });

  const unpaid = students
    .filter((s) => s.payments.length === 0)
    .map((s) => ({
      id: s.id,
      fullName: s.fullName,
      studentCode: s.studentCode,
      groupName: s.group?.name ?? null,
    }));

  const monthLabel = start.toLocaleDateString("ar-EG", { month: "long", year: "numeric" });

  return { monthLabel, students: unpaid };
}
