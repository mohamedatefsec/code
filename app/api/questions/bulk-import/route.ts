import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";
import { questionBaseSchema, validateQuestionBusinessRules } from "@/lib/validation";

const TYPE_LABEL_TO_VALUE: Record<string, string> = {
  "اختيار من متعدد": "mcq",
  "صح خطأ": "true_false",
  "صح/خطأ": "true_false",
  "اختيارات متعددة": "multiple_answer",
  "ترتيب": "ordering",
  "ناتج كود": "code_output",
  "مقالي": "essay",
};

const DIFFICULTY_LABEL_TO_VALUE: Record<string, string> = {
  "سهل": "easy",
  "متوسط": "medium",
  "صعب": "hard",
};

type ParsedRow = {
  rowNumber: number;
  unit: string;
  lesson: string;
  type: string;
  question: string;
  options: string[];
  correctIndexes: number[];
  difficulty: string;
  points: number;
  explanation: string;
  parseError?: string;
};

function cellText(v: ExcelJS.CellValue): string {
  if (v == null) return "";
  if (typeof v === "object" && "richText" in (v as object)) {
    return (v as { richText: { text: string }[] }).richText.map((r) => r.text).join("");
  }
  return String(v).trim();
}

async function parseWorkbook(buffer: ArrayBuffer): Promise<ParsedRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as never);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const headerRow = sheet.getRow(1);
  const colIndex: Record<string, number> = {};
  headerRow.eachCell((cell, colNumber) => {
    colIndex[cellText(cell.value).trim()] = colNumber;
  });

  const get = (row: ExcelJS.Row, headerName: string) => {
    const col = colIndex[headerName];
    return col ? cellText(row.getCell(col).value) : "";
  };

  const rows: ParsedRow[] = [];
  const lastRow = sheet.rowCount;

  for (let r = 2; r <= lastRow; r++) {
    const row = sheet.getRow(r);
    const question = get(row, "نص السؤال");
    const typeLabel = get(row, "النوع");
    const unit = get(row, "الوحدة");
    const lesson = get(row, "الدرس");
    const correctRaw = get(row, "الإجابة الصحيحة");
    const difficultyLabel = get(row, "الصعوبة");
    const pointsRaw = get(row, "الدرجة");
    const explanation = get(row, "الشرح");
    const options = [1, 2, 3, 4, 5, 6]
      .map((n) => get(row, `اختيار ${n}`))
      .filter((v) => v !== "");

    // نتخطى الصفوف الفاضية تمامًا (زي صفوف فاضية في آخر الملف)
    if (!question && !typeLabel && !unit && !lesson && options.length === 0) continue;

    const type = TYPE_LABEL_TO_VALUE[typeLabel.trim()] ?? "";
    const difficulty = DIFFICULTY_LABEL_TO_VALUE[difficultyLabel.trim()] ?? "medium";
    const points = parseInt(pointsRaw, 10) || 1;

    let correctIndexes: number[] = [];
    let parseError: string | undefined;

    if (!question) {
      parseError = "عمود «نص السؤال» فاضي.";
    } else if (!type) {
      parseError = typeLabel
        ? `نوع سؤال غير معروف: "${typeLabel}". استخدم أحد الأنواع الموجودة في القالب بالظبط.`
        : "عمود «النوع» فاضي.";
    } else if (type === "mcq" || type === "code_output") {
      const n = parseInt(correctRaw, 10);
      if (!Number.isNaN(n) && n >= 1 && n <= options.length) correctIndexes = [n - 1];
      else if (type === "code_output" && options.length === 1) correctIndexes = [0];
      else parseError = "عمود «الإجابة الصحيحة» لازم يكون رقم الاختيار الصحيح.";
    } else if (type === "multiple_answer") {
      correctIndexes = correctRaw
        .split(/[،,|]/)
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !Number.isNaN(n) && n >= 1 && n <= options.length)
        .map((n) => n - 1);
      if (correctIndexes.length === 0) {
        parseError = "عمود «الإجابة الصحيحة» لازم يحتوي رقم إجابة صحيحة واحدة على الأقل (مفصولة بفاصلة لو أكتر من واحدة).";
      }
    } else if (type === "true_false") {
      const norm = correctRaw.trim();
      if (norm !== "صح" && norm !== "خطأ") {
        parseError = 'عمود «الإجابة الصحيحة» لسؤال صح/خطأ لازم يكون "صح" أو "خطأ" بالظبط.';
      } else {
        correctIndexes = [norm === "صح" ? 0 : 1];
      }
    } else if (type === "ordering") {
      if (options.length < 2) parseError = "سؤال الترتيب محتاج عنصرين على الأقل في أعمدة الاختيارات.";
      correctIndexes = options.map((_, i) => i); // كل الخيارات صحيحة، الترتيب هو ترتيب كتابتها في الأعمدة
    }
    // essay: بلا خيارات وبلا إجابة صحيحة - مفيش تحقق إضافي

    rows.push({
      rowNumber: r,
      unit,
      lesson,
      type,
      question,
      options: type === "true_false" ? ["صح", "خطأ"] : options,
      correctIndexes,
      difficulty,
      points,
      explanation,
      parseError,
    });
  }

  return rows;
}

export async function POST(req: NextRequest) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
  }

  const file = form.get("file");
  const subjectId = String(form.get("subjectId") ?? "");
  const status: "draft" | "published" = form.get("status") === "published" ? "published" : "draft";
  const dryRun = form.get("dryRun") === "true";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "ارفع ملف Excel أولًا." }, { status: 400 });
  }
  if (!subjectId) {
    return NextResponse.json({ error: "اختر مادة أولًا." }, { status: 400 });
  }

  const subject = await db.subject.findUnique({ where: { id: subjectId } });
  if (!subject) {
    return NextResponse.json({ error: "المادة غير موجودة." }, { status: 404 });
  }

  let parsedRows: ParsedRow[];
  try {
    const buffer = await file.arrayBuffer();
    parsedRows = await parseWorkbook(buffer);
  } catch {
    return NextResponse.json({ error: "تعذّر قراءة الملف. تأكد إنه ملف Excel (.xlsx) صالح." }, { status: 400 });
  }

  if (parsedRows.length === 0) {
    return NextResponse.json({ error: "الملف فاضي أو لا يحتوي صفوف بيانات." }, { status: 400 });
  }
  if (parsedRows.length > 300) {
    return NextResponse.json({ error: "الحد الأقصى 300 سؤال في الملف الواحد." }, { status: 400 });
  }

  // معاينة فقط (dry run) — بدون أي كتابة على قاعدة البيانات
  if (dryRun) {
    return NextResponse.json({ preview: parsedRows });
  }

  const units = await db.unit.findMany({ where: { subjectId } });
  const unitByName = new Map(units.map((u) => [u.title.trim().toLowerCase(), u]));

  const lessons = await db.lesson.findMany({ where: { unitId: { in: units.map((u) => u.id) } } });
  const lessonByUnitAndName = new Map(
    lessons.map((l) => [`${l.unitId}::${l.title.trim().toLowerCase()}`, l])
  );

  const results: { row: number; status: "created" | "error"; error?: string; questionId?: string }[] = [];

  // كل صف بيتعامل معاه لوحده - فشل صف واحد ميوقفش الباقي، ومفيش أي تعديل على أسئلة موجودة أصلًا (إنشاء فقط)
  for (const row of parsedRows) {
    if (row.parseError) {
      results.push({ row: row.rowNumber, status: "error", error: row.parseError });
      continue;
    }
    try {
      let unitId: string | null = null;
      if (row.unit) {
        const unit = unitByName.get(row.unit.toLowerCase());
        if (!unit) {
          results.push({ row: row.rowNumber, status: "error", error: `الوحدة "${row.unit}" غير موجودة في هذه المادة.` });
          continue;
        }
        unitId = unit.id;
      }

      let lessonId: string | null = null;
      if (row.lesson) {
        if (!unitId) {
          results.push({ row: row.rowNumber, status: "error", error: "لتحديد درس، لازم تحدّد الوحدة أولًا في نفس الصف." });
          continue;
        }
        const lesson = lessonByUnitAndName.get(`${unitId}::${row.lesson.toLowerCase()}`);
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
        difficulty: row.difficulty,
        points: row.points,
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
  return NextResponse.json({ results, createdCount, totalCount: parsedRows.length });
}
