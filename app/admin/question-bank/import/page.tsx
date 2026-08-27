"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Subject = { id: string; name: string };

type PreviewRow = {
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

export default function ImportQuestionsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [file, setFile] = useState<File | null>(null);

  const [previewing, setPreviewing] = useState(false);
  const [previewRows, setPreviewRows] = useState<PreviewRow[] | null>(null);

  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResultRow[] | null>(null);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/subjects")
      .then((r) => r.json())
      .then((d) => setSubjects(d.subjects ?? []))
      .catch(() => {});
  }, []);

  async function handleFileSelected(f: File) {
    setFile(f);
    setPreviewRows(null);
    setImportResults(null);
    setError(null);

    if (!subjectId) {
      setError("اختر المادة أولًا قبل رفع الملف، عشان نتأكد أسماء الوحدات/الدروس مطابقة.");
      return;
    }

    setPreviewing(true);
    const form = new FormData();
    form.append("file", f);
    form.append("subjectId", subjectId);
    form.append("dryRun", "true");
    const res = await fetch("/api/questions/bulk-import", { method: "POST", body: form });
    setPreviewing(false);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error ?? "تعذّر قراءة الملف.");
      return;
    }
    setPreviewRows(data.preview);
  }

  const validCount = previewRows?.filter((r) => !r.parseError).length ?? 0;
  const invalidCount = previewRows?.filter((r) => r.parseError).length ?? 0;

  async function handleImport() {
    if (!file || !subjectId) return;
    setError(null);
    setImporting(true);
    const form = new FormData();
    form.append("file", file);
    form.append("subjectId", subjectId);
    form.append("status", status);
    form.append("dryRun", "false");
    const res = await fetch("/api/questions/bulk-import", { method: "POST", body: form });
    setImporting(false);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error ?? "تعذّر إتمام الاستيراد.");
      return;
    }
    setImportResults(data.results);
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href="/admin/question-bank" className="text-sm text-ink-soft hover:text-ink">
          ← رجوع لبنك الأسئلة
        </Link>
        <h1 className="text-xl font-bold text-ink mt-2">استيراد مجموعة أسئلة من Excel</h1>
        <p className="text-sm text-ink-soft mt-1">
          ارفع ملف Excel فيه عدد كبير من الأسئلة دفعة واحدة. كل سؤال ممكن يكون لوحدة/درس مختلف (مزيج) طالما كلهم لنفس المادة.
          العملية إضافة فقط — لا يتم أبدًا تعديل أو حذف أي سؤال موجود مسبقًا.
        </p>
      </div>

      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm text-ink">
        <p className="font-medium mb-1">أول خطوة: نزّل القالب وافتحه في Excel</p>
        <p className="text-ink-soft">
          القالب فيه ورقة أولى بأمثلة حقيقية لكل نوع سؤال، وورقة تانية اسمها &quot;تعليمات&quot; بتشرح بالظبط القيم المسموحة
          في كل عمود (خصوصًا عمودي النوع والإجابة الصحيحة).
        </p>
        <a
          href="/api/questions/bulk-import/template"
          className="mt-3 inline-block rounded-lg bg-gradient-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 shadow-glow transition-all active:scale-[0.98]"
        >
          📥 تحميل قالب Excel (مع أمثلة وتعليمات)
        </a>
      </div>

      <div className="space-y-4 rounded-xl border border-border bg-surface p-6 shadow-elevated">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">المادة</label>
            <select
              value={subjectId}
              onChange={(e) => {
                setSubjectId(e.target.value);
                setPreviewRows(null);
                setImportResults(null);
              }}
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
              أسماء الوحدات/الدروس في الملف لازم تكون مطابقة تمامًا للموجودة فعليًا تحت هذه المادة.
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

        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">ملف Excel (.xlsx) بعد ملء بيانات أسئلتك</label>
          <input
            type="file"
            accept=".xlsx"
            disabled={!subjectId}
            onChange={(e) => e.target.files?.[0] && handleFileSelected(e.target.files[0])}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50"
          />
          {!subjectId && <p className="text-xs text-danger mt-1">اختر المادة الأول عشان يتفعّل رفع الملف.</p>}
        </div>

        {previewing && <p className="text-sm text-ink-soft">جارٍ قراءة الملف ومعاينته...</p>}

        {previewRows && (
          <div className="rounded-lg border border-border bg-canvas p-3 text-sm space-y-2">
            <p className="text-ink">
              تم تحليل <strong>{previewRows.length}</strong> صف — <span className="text-accent">{validCount} صالح</span>
              {invalidCount > 0 && (
                <>
                  {" "}
                  · <span className="text-danger">{invalidCount} به مشكلة (لن يتم استيراده)</span>
                </>
              )}
            </p>
            <div className="max-h-72 overflow-y-auto space-y-1">
              {previewRows.map((r) => (
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

        {previewRows && validCount > 0 && (
          <button
            onClick={handleImport}
            disabled={importing}
            className="w-full rounded-lg bg-gradient-brand py-2.5 font-semibold text-white hover:opacity-90 shadow-glow transition-all active:scale-[0.98] disabled:opacity-60"
          >
            {importing ? "جارٍ الاستيراد..." : `استيراد ${validCount} سؤال`}
          </button>
        )}
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
