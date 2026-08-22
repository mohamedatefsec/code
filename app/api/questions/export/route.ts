import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";

const TYPE_LABELS: Record<string, string> = {
  mcq: "اختيار من متعدد",
  true_false: "صح/خطأ",
  multiple_answer: "اختيارات متعددة",
  ordering: "ترتيب",
  code_output: "ناتج كود",
  essay: "مقالي",
};

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "سهل",
  medium: "متوسط",
  hard: "صعب",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  published: "منشور",
};

export async function GET(req: NextRequest) {
  // الصفحة كلها (/admin/*) محمية أصلاً بـ requireActiveUser("admin") في
  // الـ layout، لكن الـ API نفسه لازم يتحقق بشكل مستقل لأنه ممكن يُستدعى
  // مباشرة بمعزل عن الصفحة.
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const subjectId = searchParams.get("subjectId");
  const unitId = searchParams.get("unitId");
  const type = searchParams.get("type");
  const difficulty = searchParams.get("difficulty");
  const status = searchParams.get("status");
  const search = searchParams.get("q")?.trim();

  const questions = await db.question.findMany({
    where: {
      ...(subjectId ? { subjectId } : {}),
      ...(unitId ? { unitId } : {}),
      ...(type ? { type: type as never } : {}),
      ...(difficulty ? { difficulty: difficulty as never } : {}),
      ...(status ? { status: status as never } : {}),
      ...(search ? { text: { contains: search, mode: "insensitive" } } : {}),
    },
    include: {
      subject: { select: { name: true } },
      unit: { select: { title: true } },
      options: { orderBy: { order: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "code-ai";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("الأسئلة", {
    views: [{ rightToLeft: true }],
  });

  sheet.columns = [
    { header: "المادة", key: "subject", width: 18 },
    { header: "الوحدة", key: "unit", width: 20 },
    { header: "النوع", key: "type", width: 16 },
    { header: "نص السؤال", key: "text", width: 50 },
    { header: "كود مرفق", key: "codeSnippet", width: 30 },
    { header: "الصعوبة", key: "difficulty", width: 12 },
    { header: "الدرجة", key: "points", width: 10 },
    { header: "الاختيارات", key: "options", width: 45 },
    { header: "الإجابة الصحيحة", key: "correct", width: 30 },
    { header: "الشرح", key: "explanation", width: 40 },
    { header: "الحالة", key: "status", width: 12 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { horizontal: "center", vertical: "middle", wrapText: true };

  for (const q of questions) {
    const optionsText = q.options.map((o: { text: string }) => o.text).join(" | ");
    const correctText = q.options
      .filter((o: { isCorrect: boolean }) => o.isCorrect)
      .map((o: { text: string }) => o.text)
      .join(" | ");

    sheet.addRow({
      subject: q.subject.name,
      unit: q.unit?.title ?? "—",
      type: TYPE_LABELS[q.type] ?? q.type,
      text: q.text,
      codeSnippet: q.codeSnippet ?? "",
      difficulty: DIFFICULTY_LABELS[q.difficulty] ?? q.difficulty,
      points: q.points,
      options: q.type === "essay" ? "—" : optionsText,
      correct: q.type === "essay" ? "يُصحَّح يدويًا" : q.type === "ordering" ? optionsText + " (بالترتيب ده)" : correctText,
      explanation: q.explanation ?? "",
      status: STATUS_LABELS[q.status] ?? q.status,
    });
  }

  for (let i = 1; i <= sheet.columnCount; i++) {
    sheet.getColumn(i).alignment = { horizontal: "right", vertical: "top", wrapText: true };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `question-bank-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
