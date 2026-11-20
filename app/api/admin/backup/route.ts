import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth";

// ممكن ياخد وقت مع بيانات كتير - نسمح لحد دقيقة
export const maxDuration = 60;

/// نسخة احتياطية كاملة من بيانات المنصة في ملف Excel واحد (شيت لكل نوع بيانات).
/// للقراءة والحفظ عندك - مش بيحتوي على كلمات المرور (ولا حتى مشفّرة).

const ATTENDANCE_LABELS: Record<string, string> = { present: "حاضر", absent: "غائب", late: "متأخر" };
const CONTENT_LABELS: Record<string, string> = { draft: "مسودة", published: "منشور" };
const QUIZ_LABELS: Record<string, string> = { draft: "مسودة", published: "منشور", closed: "مقفول" };

// التواريخ بصيغة "2026-11-20 13:48" بتوقيت القاهرة - عشان تتفرز صح في Excel
const CAIRO = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Africa/Cairo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function d(value: Date | null | undefined, withTime = false) {
  if (!value) return "";
  const parts = Object.fromEntries(CAIRO.formatToParts(value).map((p) => [p.type, p.value]));
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  return withTime ? `${date} ${parts.hour}:${parts.minute}` : date;
}

function addSheet(
  wb: ExcelJS.Workbook,
  name: string,
  columns: { header: string; key: string; width: number }[],
  rows: Record<string, unknown>[]
) {
  const sheet = wb.addWorksheet(name, { views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }] });
  sheet.columns = columns;
  const head = sheet.getRow(1);
  head.font = { bold: true, color: { argb: "FFFFFFFF" } };
  head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF5B4CF5" } };
  head.alignment = { horizontal: "center", vertical: "middle" };
  for (const r of rows) sheet.addRow(r);
  if (rows.length > 0) sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  for (let i = 1; i <= sheet.columnCount; i++) {
    sheet.getColumn(i).alignment = { horizontal: "right", vertical: "top", wrapText: true };
  }
  return sheet;
}

export async function GET() {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }

  const [students, groups, sessions, attempts, payments, subjects, quizzes] = await Promise.all([
    db.studentProfile.findMany({
      orderBy: { fullName: "asc" },
      select: {
        id: true,
        fullName: true,
        studentCode: true,
        phone: true,
        grade: true,
        createdAt: true,
        group: { select: { name: true } },
        user: { select: { status: true, lastLoginAt: true } },
      },
    }),
    db.group.findMany({ orderBy: { name: "asc" }, select: { name: true, grade: true, description: true, _count: { select: { students: true } } } }),
    db.attendanceSession.findMany({
      orderBy: { sessionDate: "desc" },
      select: {
        sessionDate: true,
        sessionLabel: true,
        group: { select: { name: true } },
        records: { select: { status: true, notes: true, student: { select: { fullName: true, studentCode: true } } } },
      },
    }),
    db.quizAttempt.findMany({
      where: { status: "submitted" },
      orderBy: { submittedAt: "desc" },
      select: {
        attemptNumber: true,
        score: true,
        maxScore: true,
        percentage: true,
        submittedAt: true,
        timeSpentSeconds: true,
        needsManualGrading: true,
        quiz: { select: { title: true, subject: { select: { name: true } } } },
        student: { select: { fullName: true, studentCode: true, group: { select: { name: true } } } },
      },
    }),
    db.payment.findMany({
      orderBy: { paidAt: "desc" },
      select: {
        amount: true,
        paidAt: true,
        forMonth: true,
        note: true,
        student: { select: { fullName: true, studentCode: true, group: { select: { name: true } } } },
      },
    }),
    db.subject.findMany({
      orderBy: { order: "asc" },
      select: {
        name: true,
        units: {
          orderBy: { order: "asc" },
          select: {
            title: true,
            status: true,
            lessons: {
              orderBy: { order: "asc" },
              select: { title: true, status: true, createdAt: true, _count: { select: { media: true } } },
            },
          },
        },
      },
    }),
    db.quiz.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        title: true,
        status: true,
        durationMinutes: true,
        maxAttempts: true,
        startAt: true,
        endAt: true,
        createdAt: true,
        subject: { select: { name: true } },
        _count: { select: { questions: true, attempts: true } },
      },
    }),
  ]);

  // تقدّم الدروس (لو الجدول موجود)
  let progressRows: Record<string, unknown>[] = [];
  try {
    const progress = await db.lessonProgress.findMany({
      orderBy: { lastOpenedAt: "desc" },
      select: {
        firstOpenedAt: true,
        lastOpenedAt: true,
        openCount: true,
        completedAt: true,
        student: { select: { fullName: true, studentCode: true } },
        lesson: { select: { title: true, unit: { select: { title: true } } } },
      },
    });
    progressRows = progress.map((p) => ({
      student: p.student.fullName,
      code: p.student.studentCode,
      unit: p.lesson.unit.title,
      lesson: p.lesson.title,
      state: p.completedAt ? "خلّصه" : "فتحه بس",
      first: d(p.firstOpenedAt, true),
      last: d(p.lastOpenedAt, true),
      count: p.openCount,
      completed: d(p.completedAt, true),
    }));
  } catch {
    // الجدول لسه ما اتعملش - نتخطّى الشيت ده
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "code-ai";
  wb.created = new Date();

  addSheet(
    wb,
    "الطلاب",
    [
      { header: "الاسم", key: "name", width: 28 },
      { header: "كود الطالب", key: "code", width: 16 },
      { header: "التليفون", key: "phone", width: 16 },
      { header: "الصف", key: "grade", width: 14 },
      { header: "المجموعة", key: "group", width: 18 },
      { header: "حالة الحساب", key: "status", width: 12 },
      { header: "آخر دخول", key: "lastLogin", width: 22 },
      { header: "تاريخ التسجيل", key: "created", width: 14 },
    ],
    students.map((s) => ({
      name: s.fullName,
      code: s.studentCode,
      phone: s.phone ?? "",
      grade: s.grade ?? "",
      group: s.group?.name ?? "",
      status: s.user.status === "active" ? "مفعّل" : "موقوف",
      lastLogin: d(s.user.lastLoginAt, true),
      created: d(s.createdAt),
    }))
  );

  addSheet(
    wb,
    "المجموعات",
    [
      { header: "المجموعة", key: "name", width: 22 },
      { header: "الصف", key: "grade", width: 14 },
      { header: "عدد الطلاب", key: "count", width: 12 },
      { header: "وصف", key: "desc", width: 40 },
    ],
    groups.map((g) => ({ name: g.name, grade: g.grade ?? "", count: g._count.students, desc: g.description ?? "" }))
  );

  addSheet(
    wb,
    "الحضور والغياب",
    [
      { header: "التاريخ", key: "date", width: 14 },
      { header: "الحصة", key: "label", width: 16 },
      { header: "المجموعة", key: "group", width: 18 },
      { header: "الطالب", key: "student", width: 28 },
      { header: "كود الطالب", key: "code", width: 16 },
      { header: "الحالة", key: "status", width: 10 },
      { header: "ملاحظات", key: "notes", width: 30 },
    ],
    sessions.flatMap((s) =>
      s.records.map((r) => ({
        date: s.sessionDate.toISOString().slice(0, 10),
        label: s.sessionLabel ?? "",
        group: s.group.name,
        student: r.student.fullName,
        code: r.student.studentCode,
        status: ATTENDANCE_LABELS[r.status] ?? r.status,
        notes: r.notes ?? "",
      }))
    )
  );

  addSheet(
    wb,
    "نتائج الاختبارات",
    [
      { header: "الطالب", key: "student", width: 28 },
      { header: "كود الطالب", key: "code", width: 16 },
      { header: "المجموعة", key: "group", width: 18 },
      { header: "الاختبار", key: "quiz", width: 30 },
      { header: "المادة", key: "subject", width: 18 },
      { header: "رقم المحاولة", key: "attempt", width: 12 },
      { header: "الدرجة", key: "score", width: 10 },
      { header: "من", key: "max", width: 8 },
      { header: "النسبة %", key: "pct", width: 10 },
      { header: "الوقت (دقيقة)", key: "time", width: 12 },
      { header: "تاريخ التسليم", key: "date", width: 22 },
      { header: "ملاحظة", key: "note", width: 22 },
    ],
    attempts.map((a) => ({
      student: a.student.fullName,
      code: a.student.studentCode,
      group: a.student.group?.name ?? "",
      quiz: a.quiz.title,
      subject: a.quiz.subject.name,
      attempt: a.attemptNumber,
      score: a.score ?? "",
      max: a.maxScore ?? "",
      pct: a.percentage !== null ? Math.round(a.percentage) : "",
      time: a.timeSpentSeconds ? Math.round(a.timeSpentSeconds / 60) : "",
      date: d(a.submittedAt, true),
      note: a.needsManualGrading ? "فيه سؤال مقالي لسه ما اتصححش" : "",
    }))
  );

  addSheet(
    wb,
    "المدفوعات",
    [
      { header: "الطالب", key: "student", width: 28 },
      { header: "كود الطالب", key: "code", width: 16 },
      { header: "المجموعة", key: "group", width: 18 },
      { header: "المبلغ", key: "amount", width: 10 },
      { header: "عن شهر", key: "month", width: 12 },
      { header: "تاريخ الدفع", key: "paid", width: 14 },
      { header: "ملاحظة", key: "note", width: 30 },
    ],
    payments.map((p) => ({
      student: p.student.fullName,
      code: p.student.studentCode,
      group: p.student.group?.name ?? "",
      amount: p.amount,
      month: p.forMonth ? p.forMonth.toISOString().slice(0, 7) : "",
      paid: d(p.paidAt),
      note: p.note ?? "",
    }))
  );

  addSheet(
    wb,
    "المحتوى",
    [
      { header: "المادة", key: "subject", width: 20 },
      { header: "الوحدة", key: "unit", width: 30 },
      { header: "حالة الوحدة", key: "unitStatus", width: 12 },
      { header: "الدرس", key: "lesson", width: 34 },
      { header: "حالة الدرس", key: "lessonStatus", width: 12 },
      { header: "عدد المرفقات", key: "media", width: 12 },
      { header: "تاريخ الإضافة", key: "created", width: 14 },
    ],
    subjects.flatMap((s) =>
      s.units.flatMap((u): Record<string, unknown>[] =>
        u.lessons.length === 0
          ? [{ subject: s.name, unit: u.title, unitStatus: CONTENT_LABELS[u.status], lesson: "", lessonStatus: "", media: "", created: "" }]
          : u.lessons.map((l) => ({
              subject: s.name,
              unit: u.title,
              unitStatus: CONTENT_LABELS[u.status],
              lesson: l.title,
              lessonStatus: CONTENT_LABELS[l.status],
              media: l._count.media,
              created: d(l.createdAt),
            }))
      )
    )
  );

  addSheet(
    wb,
    "الاختبارات",
    [
      { header: "الاختبار", key: "title", width: 30 },
      { header: "المادة", key: "subject", width: 18 },
      { header: "الحالة", key: "status", width: 10 },
      { header: "عدد الأسئلة", key: "questions", width: 12 },
      { header: "المدة (دقيقة)", key: "duration", width: 12 },
      { header: "عدد المحاولات المسموح", key: "max", width: 14 },
      { header: "عدد المحاولات اللي اتعملت", key: "attempts", width: 16 },
      { header: "يبدأ", key: "start", width: 20 },
      { header: "ينتهي", key: "end", width: 20 },
    ],
    quizzes.map((q) => ({
      title: q.title,
      subject: q.subject.name,
      status: QUIZ_LABELS[q.status] ?? q.status,
      questions: q._count.questions,
      duration: q.durationMinutes,
      max: q.maxAttempts,
      attempts: q._count.attempts,
      start: d(q.startAt, true),
      end: d(q.endAt, true),
    }))
  );

  if (progressRows.length > 0) {
    addSheet(
      wb,
      "تقدم الدروس",
      [
        { header: "الطالب", key: "student", width: 28 },
        { header: "كود الطالب", key: "code", width: 16 },
        { header: "الوحدة", key: "unit", width: 28 },
        { header: "الدرس", key: "lesson", width: 32 },
        { header: "الحالة", key: "state", width: 12 },
        { header: "أول فتح", key: "first", width: 22 },
        { header: "آخر فتح", key: "last", width: 22 },
        { header: "مرات الفتح", key: "count", width: 10 },
        { header: "خلّصه في", key: "completed", width: 22 },
      ],
      progressRows
    );
  }

  const buffer = await wb.xlsx.writeBuffer();
  const filename = `code-ai-backup-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
