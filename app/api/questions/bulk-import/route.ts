import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";
import { questionBaseSchema, validateQuestionBusinessRules } from "@/lib/validation";

// صف واحد قادم من ملف الاستيراد (بعد تحليله في الواجهة)
type ImportRow = {
  rowNumber: number;
  unit: string; // اسم الوحدة كما كُتب في الملف، فاضي لو بدون وحدة
  lesson: string; // اسم الدرس كما كُتب في الملف، فاضي لو بدون درس
  type: string;
  question: string;
  options: string[]; // نصوص الاختيارات بعد استبعاد الفاضي
  correctIndexes: number[]; // فهارس (0-based) الاختيارات الصحيحة ضمن options
  difficulty: string;
  points: number;
  explanation: string;
};

export async function POST(req: NextRequest) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const subjectId: string | undefined = body?.subjectId;
  const status: "draft" | "published" = body?.status === "published" ? "published" : "draft";
  const rows: ImportRow[] = Array.isArray(body?.rows) ? body.rows : [];

  if (!subjectId) {
    return NextResponse.json({ error: "اختر مادة أولًا." }, { status: 400 });
  }
  if (rows.length === 0) {
    return NextResponse.json({ error: "لا يوجد صفوف صالحة للاستيراد." }, { status: 400 });
  }
  if (rows.length > 300) {
    return NextResponse.json({ error: "الحد الأقصى 300 سؤال في الدفعة الواحدة." }, { status: 400 });
  }

  const subject = await db.subject.findUnique({ where: { id: subjectId } });
  if (!subject) {
    return NextResponse.json({ error: "المادة غير موجودة." }, { status: 404 });
  }

  // نجهّز خرائط اسم الوحدة/الدرس -> id، مرة واحدة، بدل ما نستعلم لكل صف
  const units = await db.unit.findMany({ where: { subjectId } });
  const unitByName = new Map(units.map((u) => [u.title.trim().toLowerCase(), u]));

  const lessons = await db.lesson.findMany({ where: { unitId: { in: units.map((u) => u.id) } } });
  const lessonByUnitAndName = new Map(
    lessons.map((l) => [`${l.unitId}::${l.title.trim().toLowerCase()}`, l])
  );

  const results: { row: number; status: "created" | "error"; error?: string; questionId?: string }[] = [];

  // كل صف بيتعامل معاه لوحده - فشل صف واحد ميوقفش الباقي، ومفيش أي تعديل على أسئلة موجودة أصلًا (إنشاء فقط)
  for (const row of rows) {
    try {
      let unitId: string | null = null;
      if (row.unit?.trim()) {
        const unit = unitByName.get(row.unit.trim().toLowerCase());
        if (!unit) {
          results.push({ row: row.rowNumber, status: "error", error: `الوحدة "${row.unit}" غير موجودة في هذه المادة.` });
          continue;
        }
        unitId = unit.id;
      }

      let lessonId: string | null = null;
      if (row.lesson?.trim()) {
        if (!unitId) {
          results.push({ row: row.rowNumber, status: "error", error: "لتحديد درس، لازم تحدّد الوحدة أولًا في نفس الصف." });
          continue;
        }
        const lesson = lessonByUnitAndName.get(`${unitId}::${row.lesson.trim().toLowerCase()}`);
        if (!lesson) {
          results.push({ row: row.rowNumber, status: "error", error: `الدرس "${row.lesson}" غير موجود ضمن الوحدة "${row.unit}".` });
          continue;
        }
        lessonId = lesson.id;
      }

      const options = row.options.map((text, i) => ({
        text,
        isCorrect: row.correctIndexes.includes(i),
      }));

      const candidate = {
        subjectId,
        unitId,
        lessonId,
        type: row.type,
        text: row.question,
        codeSnippet: null,
        difficulty: row.difficulty || "medium",
        points: row.points || 1,
        explanation: row.explanation || null,
        status,
        options,
      };

      const parsed = questionBaseSchema.safeParse(candidate);
      if (!parsed.success) {
        const firstIssue = parsed.error.issues[0];
        results.push({ row: row.rowNumber, status: "error", error: firstIssue?.message ?? "بيانات غير صالحة." });
        continue;
      }

      const businessError = validateQuestionBusinessRules(parsed.data);
      if (businessError) {
        results.push({ row: row.rowNumber, status: "error", error: businessError });
        continue;
      }

      const { options: finalOptions, ...questionData } = parsed.data;
      const created = await db.question.create({
        data: {
          ...questionData,
          createdBy: session.userId,
          options: {
            create: finalOptions.map((o, index) => ({
              text: o.text,
              isCorrect: o.isCorrect,
              order: index,
            })),
          },
        },
      });

      results.push({ row: row.rowNumber, status: "created", questionId: created.id });
    } catch {
      results.push({ row: row.rowNumber, status: "error", error: "خطأ غير متوقع أثناء إنشاء هذا السؤال." });
    }
  }

  const createdCount = results.filter((r) => r.status === "created").length;
  return NextResponse.json({ results, createdCount, totalCount: rows.length });
}
