"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Subject = { id: string; name: string };

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

type ImportResultRow = { row: number; status: "created" | "error"; error?: string; questionId?: string };

const TYPE_LABELS: Record<string, string> = {
  mcq: "اختيار من متعدد",
  true_false: "صح / خطأ",
  multiple_answer: "اختيارات متعددة صحيحة",
  ordering: "ترتيب عناصر",
  code_output: "توقع ناتج الكود",
  essay: "مقالي",
};

const TEMPLATE_HEADER = "unit,lesson,type,question,option1,option2,option3,option4,option5,option6,correct,difficulty,points,explanation";
const TEMPLATE_SAMPLE = [
  "الوحدة الأولى,الدرس الأول,mcq,ما ناتج 2+2؟,3,4,5,6,,,2,easy,1,العملية جمع بسيط",
  "الوحدة الأولى,,true_false,لغة JavaScript لغة مفسّرة؟,,,,,,,صح,medium,1,",
  ",,essay,اشرح الفرق بين let و const,,,,,,,,,medium,2,",
].join("\n");

// محلّل CSV بسيط يدعم الحقول المقتبسة بعلامات تنصيص "..." التي تحتوي فواصل أو أسطر جديدة
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const clean = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (inQuotes) {
      if (c === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function rowsToParsed(rawRows: string[][]): ParsedRow[] {
  if (rawRows.length === 0) return [];
  const [header, ...dataRows] = rawRows;
  const idx = (name: string) => header.findIndex((h) => h.trim().toLowerCase() === name);

  const cUnit = idx("unit");
  const cLesson = idx("lesson");
  const cType = idx("type");
  const cQuestion = idx("question");
  const cOptions = [1, 2, 3, 4, 5, 6].map((n) => idx(`option${n}`));
  const cCorrect = idx("correct");
  const cDifficulty = idx("difficulty");
  const cPoints = idx("points");
  const cExplanation = idx("explanation");

  return dataRows.map((r, i) => {
    const get = (c: number) => (c >= 0 && c < r.length ? r[c].trim() : "");
    const type = get(cType).toLowerCase();
    const options = cOptions.map(get).filter((v) => v !== "");
    const correctRaw = get(cCorrect);

    let correctIndexes: number[] = [];
    let parseError: string | undefined;

    if (type === "mcq" || type === "code_output") {
      const n = parseInt(correctRaw, 10);
      if (!Number.isNaN(n) && n >= 1 && n <= options.length) correctIndexes = [n - 1];
      else if (type === "code_output" && options.length === 1) correctIndexes = [0];
      else parseError = "عمود correct لازم يكون رقم الاختيار الصحيح.";
    } else if (type === "multiple_answer") {
      correctIndexes = correctRaw
        .split("|")
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !Number.isNaN(n) && n >= 1 && n <= options.length)
        .map((n) => n - 1);
      if (correctIndexes.length === 0) parseError = "عمود correct لازم يحتوي رقم إجابة صحيحة واحدة على الأقل مفصولة بـ |.";
    } else if (type === "true_false") {
      const norm = correctRaw.toLowerCase();
      const isTrue = norm === "صح" || norm === "true" || norm === "1";
      const isFalse = norm === "خطأ" || norm === "false" || norm === "0";
      if (!isTrue && !isFalse) {
        parseError = 'عمود correct لسؤال صح/خطأ لازم يكون "صح" أو "خطأ".';
      }
    } else if (type === "ordering") {
      correctIndexes = options.map((_, i2) => i2); // كل الخيارات صحيحة، الترتيب هو ترتيب كتابتها
    } else if (type === "essay") {
      // بلا خيارات
    } else if (type === "") {
      parseError = "عمود type فاضي.";
    } else {
      parseError = `نوع سؤال غير معروف: "${get(cType)}".`;
    }

    return {
      rowNumber: i + 2, // +2 لأن الصف الأول هو الهيدر والعد يبدأ من 1
      unit: get(cUnit),
      lesson: get(cLesson),
      type,
      question: get(cQuestion),
      options: type === "true_false" ? ["صح", "خطأ"] : options,
      correctIndexes: type === "true_false" ? [correctRaw.toLowerCase() === "صح" || correctRaw.toLowerCase() === "true" || correctRaw === "1" ? 0 : 1] : correctIndexes,
      difficulty: get(cDifficulty) || "medium",
      points: parseInt(get(cPoints), 10) || 1,
      explanation: get(cExplanation),
      parseError: !get(cQuestion) ? "نص السؤال فاضي." : parseError,
    };
  });
}

export default function ImportQuestionsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [csvText, setCsvText] = useState("");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResultRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/subjects")
      .then((r) => r.json())
      .then((d) => setSubjects(d.subjects ?? []))
      .catch(() => {});
  }, []);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setCsvText(text);
      setParsedRows(rowsToParsed(parseCSV(text)));
      setImportResults(null);
      setError(null);
    };
    reader.readAsText(file, "utf-8");
  }

  function handlePasteChange(value: string) {
    setCsvText(value);
    setImportResults(null);
    if (value.trim()) setParsedRows(rowsToParsed(parseCSV(value)));
    else setParsedRows([]);
  }

  const validRows = parsedRows.filter((r) => !r.parseError);
  const invalidRows = parsedRows.filter((r) => r.parseError);

  async function handleImport() {
    if (!subjectId) {
      setError("اختر مادة أولًا.");
      return;
    }
    if (validRows.length === 0) {
      setError("لا يوجد صفوف صالحة للاستيراد.");
      return;
    }
    setError(null);
    setImporting(true);
    const res = await fetch("/api/questions/bulk-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectId, status, rows: validRows }),
    });
    setImporting(false);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error ?? "تعذّر إتمام الاستيراد.");
      return;
    }
    setImportResults(data.results);
  }

  function downloadTemplate() {
    const blob = new Blob(["\uFEFF" + TEMPLATE_HEADER + "\n" + TEMPLATE_SAMPLE], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "قالب-استيراد-الأسئلة.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href="/admin/question-bank" className="text-sm text-ink-soft hover:text-ink">
          ← رجوع لبنك الأسئلة
        </Link>
        <h1 className="text-xl font-bold text-ink mt-2">استيراد مجموعة أسئلة</h1>
        <p className="text-sm text-ink-soft mt-1">
          استورد عدد كبير من الأسئلة دفعة واحدة من ملف CSV. كل سؤال ممكن يكون لوحدة/درس مختلف (مزيج/mix) طالما كلهم لنفس المادة.
          العملية إضافة فقط — لا يتم أبدًا تعديل أو حذف أي سؤال موجود مسبقًا.
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-border bg-surface p-6 shadow-elevated">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">المادة</label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
            >
              <option value="">اختر</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-ink-soft mt-1">
              أسماء الوحدات/الدروس في الملف لازم تكون مطابقة (نفس الاسم) للموجودة فعليًا تحت هذه المادة.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">حالة النشر بعد الاستيراد</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as "draft" | "published")}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
            >
              <option value="draft">مسودة (مُوصى به للمراجعة أولًا)</option>
              <option value="published">منشور مباشرة</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={downloadTemplate}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-canvas transition"
          >
            📥 تحميل قالب CSV فارغ (مع أمثلة)
          </button>
          <label className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-canvas transition cursor-pointer">
            📄 رفع ملف CSV
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">أو الصق محتوى CSV مباشرة هنا</label>
          <textarea
            value={csvText}
            onChange={(e) => handlePasteChange(e.target.value)}
            rows={8}
            dir="ltr"
            placeholder={TEMPLATE_HEADER}
            className="w-full rounded-lg border border-border px-3 py-2 text-xs font-mono transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
          />
        </div>

        {parsedRows.length > 0 && (
          <div className="rounded-lg border border-border bg-canvas p-3 text-sm space-y-2">
            <p className="text-ink">
              تم تحليل <strong>{parsedRows.length}</strong> صف — {" "}
              <span className="text-accent">{validRows.length} صالح</span>
              {invalidRows.length > 0 && (
                <>
                  {" "}
                  · <span className="text-danger">{invalidRows.length} به مشكلة</span>
                </>
              )}
            </p>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {parsedRows.map((r) => (
                <div
                  key={r.rowNumber}
                  className={`rounded-md border px-3 py-1.5 text-xs ${
                    r.parseError ? "border-danger/40 bg-danger/5 text-danger" : "border-border text-ink-soft"
                  }`}
                >
                  <span className="font-medium">صف {r.rowNumber}:</span>{" "}
                  {r.parseError ? (
                    r.parseError
                  ) : (
                    <>
                      {TYPE_LABELS[r.type] ?? r.type} — {r.question.slice(0, 60)}
                      {r.unit && ` · وحدة: ${r.unit}`}
                      {r.lesson && ` · درس: ${r.lesson}`}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {error && <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger">{error}</div>}

        <button
          onClick={handleImport}
          disabled={importing || validRows.length === 0 || !subjectId}
          className="w-full rounded-lg bg-gradient-brand py-2.5 font-semibold text-white hover:opacity-90 shadow-glow transition-all active:scale-[0.98] disabled:opacity-60"
        >
          {importing ? "جارٍ الاستيراد..." : `استيراد ${validRows.length || ""} سؤال`}
        </button>
      </div>

      {importResults && (
        <div className="rounded-xl border border-border bg-surface p-6 shadow-elevated space-y-3">
          <h2 className="font-semibold text-ink">
            نتيجة الاستيراد: {importResults.filter((r) => r.status === "created").length} تمت إضافته من أصل {importResults.length}
          </h2>
          <div className="max-h-72 overflow-y-auto space-y-1">
            {importResults
              .filter((r) => r.status === "error")
              .map((r) => (
                <div key={r.row} className="rounded-md border border-danger/40 bg-danger/5 px-3 py-1.5 text-xs text-danger">
                  صف {r.row}: {r.error}
                </div>
              ))}
          </div>
          <Link href="/admin/question-bank" className="inline-block text-sm text-primary hover:underline">
            روح لبنك الأسئلة لمراجعة الأسئلة المضافة →
          </Link>
        </div>
      )}
    </div>
  );
}
