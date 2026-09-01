import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";

type Requirement = {
  lessonId: string;
  difficulty: "easy" | "medium" | "hard" | "any";
  count: number;
};

/// خلط عشوائي بسيط (Fisher-Yates) - بنفضّله على ORDER BY random() في
/// SQL عشان يفضل الكود متنقّل بسهولة بين قواعد بيانات مختلفة، وحجم بنك
/// الأسئلة لكل درس عادةً صغير بما يكفي إن الخلط في الذاكرة يبقى رخيص.
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * بياخد قايمة "متطلبات" (درس + مستوى صعوبة اختياري + عدد مطلوب) وبيرجّع
 * أسئلة عشوائية من بنك الأسئلة المنشورة تطابق كل سطر، من غير تكرار سؤال
 * في أكتر من سطر. لو مفيش أسئلة كفاية لسطر معيّن، بيرجّع أقصى عدد متاح
 * ويبلّغ الفرق في shortfalls بدل ما يفشل كل الطلب.
 */
export async function POST(req: NextRequest) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const requirements = body?.requirements as Requirement[] | undefined;
  if (!Array.isArray(requirements) || requirements.length === 0) {
    return NextResponse.json({ error: "لازم تحدد سطر متطلبات واحد على الأقل." }, { status: 400 });
  }

  const lessonIds = [...new Set(requirements.map((r) => r.lessonId))];
  const candidates = await db.question.findMany({
    where: { lessonId: { in: lessonIds }, status: "published" },
    select: { id: true, lessonId: true, difficulty: true },
  });

  const usedIds = new Set<string>();
  const pickedIds: string[] = [];
  const shortfalls: { lessonId: string; difficulty: string; requested: number; found: number }[] = [];

  for (const requirement of requirements) {
    const pool = shuffle(
      candidates.filter(
        (c) =>
          c.lessonId === requirement.lessonId &&
          !usedIds.has(c.id) &&
          (requirement.difficulty === "any" || c.difficulty === requirement.difficulty)
      )
    );
    const take = pool.slice(0, requirement.count);
    for (const q of take) {
      usedIds.add(q.id);
      pickedIds.push(q.id);
    }
    if (take.length < requirement.count) {
      shortfalls.push({
        lessonId: requirement.lessonId,
        difficulty: requirement.difficulty,
        requested: requirement.count,
        found: take.length,
      });
    }
  }

  // بنرجّع بيانات الأسئلة كاملة (مش الـ id بس) عشان واجهة الأدمن تقدر
  // تعرضها في "الأسئلة المختارة" فورًا من غير ما تحتاج تجيب بيانات كل
  // سؤال في طلب منفصل - الأسئلة دي ممكن تكون من دروس مش ظاهرة أصلًا في
  // فلتر بنك الأسئلة الحالي عند الأدمن.
  const pickedQuestions =
    pickedIds.length > 0
      ? await db.question.findMany({
          where: { id: { in: pickedIds } },
          select: { id: true, text: true, type: true, points: true, difficulty: true, status: true },
        })
      : [];

  return NextResponse.json({ questions: pickedQuestions, shortfalls });
}
