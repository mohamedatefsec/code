import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireAdminSession } from "@/lib/auth";

const HEADERS = [
  "الوحدة",
  "الدرس",
  "النوع",
  "نص السؤال",
  "اختيار 1",
  "اختيار 2",
  "اختيار 3",
  "اختيار 4",
  "اختيار 5",
  "اختيار 6",
  "الإجابة الصحيحة",
  "الصعوبة",
  "الدرجة",
  "الشرح",
];

// أمثلة توضيحية تغطي كل أنواع الأسئلة المدعومة، وتوضح استخدام "mix" لوحدات/دروس مختلفة في نفس الملف
const SAMPLE_ROWS: (string | number)[][] = [
  ["الوحدة الأولى", "الدرس الأول", "اختيار من متعدد", "ما ناتج 2 + 2 ؟", "3", "4", "5", "6", "", "", "2", "سهل", 1, "عملية جمع بسيطة"],
  ["الوحدة الأولى", "", "صح خطأ", "لغة JavaScript لغة مُفسَّرة؟", "", "", "", "", "", "", "صح", "متوسط", 1, ""],
  ["الوحدة الثانية", "الدرس الثاني", "اختيارات متعددة", "أي مما يلي لغات برمجة؟", "Python", "HTML", "JavaScript", "CSS", "", "", "1،3", "متوسط", 2, "HTML و CSS لغات توصيف وليست برمجة"],
  ["", "", "ترتيب", "رتّب خطوات تشغيل برنامج بسيط", "كتابة الكود", "الحفظ", "التصريف (Compile)", "التشغيل", "", "", "", "متوسط", 2, "الترتيب المكتوب هنا هو الترتيب الصحيح"],
  ["الوحدة الأولى", "الدرس الأول", "ناتج كود", "ماذا يطبع: print(1+1)", "2", "", "", "", "", "", "1", "سهل", 1, ""],
  ["", "", "مقالي", "اشرح الفرق بين let و const باختصار", "", "", "", "", "", "", "", "متوسط", 3, "يُصحَّح يدويًا من صفحة التصحيح اليدوي"],
];

export async function GET() {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "code-ai";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("أسئلة للاستيراد", { views: [{ rightToLeft: true }] });

  sheet.columns = HEADERS.map((h) => ({ header: h, key: h, width: h === "نص السؤال" || h === "الشرح" ? 40 : 18 }));
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF6D28D9" } };
  sheet.getRow(1).alignment = { horizontal: "center", vertical: "middle", wrapText: true };

  for (const row of SAMPLE_ROWS) sheet.addRow(row);

  for (let i = 1; i <= sheet.columnCount; i++) {
    sheet.getColumn(i).alignment = { horizontal: "right", vertical: "top", wrapText: true };
  }

  // ورقة تعليمات منفصلة توضح القيم المسموحة بالظبط لعمودي "النوع" و"الصعوبة"
  const helpSheet = workbook.addWorksheet("تعليمات", { views: [{ rightToLeft: true }] });
  helpSheet.columns = [
    { header: "الحقل", key: "field", width: 22 },
    { header: "القيم المسموحة (اكتبها بالظبط زي ما هي)", key: "values", width: 60 },
  ];
  helpSheet.getRow(1).font = { bold: true };
  helpSheet.addRows([
    { field: "النوع", values: "اختيار من متعدد / صح خطأ / اختيارات متعددة / ترتيب / ناتج كود / مقالي" },
    { field: "الصعوبة", values: "سهل / متوسط / صعب (لو فاضي، يتحط متوسط تلقائيًا)" },
    {
      field: "الإجابة الصحيحة",
      values:
        "اختيار من متعدد / ناتج كود: رقم الاختيار الصحيح (مثال: 2)\n" +
        "اختيارات متعددة: أرقام الاختيارات الصحيحة مفصولة بفاصلة (مثال: 1،3)\n" +
        "صح خطأ: اكتب «صح» أو «خطأ» بالظبط\n" +
        "ترتيب: اتركه فاضي — الترتيب الصحيح هو ترتيب كتابة الاختيارات نفسها في أعمدة اختيار 1، 2، 3...\n" +
        "مقالي: اتركه فاضي — بلا اختيارات إطلاقًا",
    },
    { field: "الوحدة / الدرس", values: "اختياريان. لو حطيتهم لازم يكونوا مطابقين تمامًا لاسم موجود بالفعل تحت المادة التي هتختارها عند الاستيراد. اتركهم فاضيين لو السؤال عام بدون وحدة/درس محدد." },
    { field: "مزج (Mix)", values: "كل صف مستقل — تقدر تحط وحدة/درس مختلف لكل سؤال في نفس الملف، طالما كلهم لنفس المادة التي هتختارها." },
  ]);
  helpSheet.eachRow((row) => {
    row.alignment = { horizontal: "right", vertical: "top", wrapText: true };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = "قالب-استيراد-الأسئلة.xlsx";
  // اسم الملف عربي، والـ HTTP headers بتقبل بس ASCII، فلازم نرمّزه بصيغة RFC 5987
  // (filename* بدل filename) عشان يظهر بالعربي صح عند التحميل بدل ما يكسر الطلب
  const encodedFilename = encodeURIComponent(filename);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="quiz-import-template.xlsx"; filename*=UTF-8''${encodedFilename}`,
    },
  });
}
