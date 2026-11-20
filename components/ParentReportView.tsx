"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ParentReport } from "@/lib/parent-report";
import { PERIOD_LABELS, type ReportPeriodKey } from "@/lib/parent-report-shared";
import { splitLessonNumber } from "@/lib/lesson-title";

function day(d: Date | string | null | undefined) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("ar-EG", { timeZone: "Africa/Cairo", day: "numeric", month: "long" });
}

function monthOf(d: Date | string) {
  return new Date(d).toLocaleDateString("ar-EG", { timeZone: "UTC", month: "long", year: "numeric" });
}

/// "حصة واحدة"، "حصتين"، "3 حصص"، "11 حصة"
function sessions(n: number) {
  if (n === 1) return "حصة واحدة";
  if (n === 2) return "حصتين";
  if (n >= 3 && n <= 10) return `${n} حصص`;
  return `${n} حصة`;
}

function count(n: number, one: string, two: string, few: string, many: string) {
  if (n === 1) return one;
  if (n === 2) return two;
  if (n >= 3 && n <= 10) return `${n} ${few}`;
  return `${n} ${many}`;
}

function times(n: number) {
  if (n === 1) return "مرة واحدة";
  if (n === 2) return "مرتين";
  if (n >= 3 && n <= 10) return `${n} مرات`;
  return `${n} مرة`;
}

/// رقم مصري زي 01001234567 → 201001234567 (الصيغة اللي واتساب محتاجها)
function toWhatsappNumber(raw: string) {
  let digits = raw.replace(/[^\d]/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("01")) digits = `2${digits}`;
  return digits;
}

function gradeWord(pct: number | null) {
  if (pct === null) return "";
  if (pct >= 85) return "ممتاز";
  if (pct >= 70) return "جيد جدًا";
  if (pct >= 50) return "جيد";
  return "محتاج متابعة";
}

/// تقرير ولي الأمر: بيتعرض للأدمن بس. الأدمن يقدر يكتب ملاحظة، ويطبع، أو
/// يفتح واتساب برسالة جاهزة ويبعتها هو بنفسه - المنصة مش بتبعت أي حاجة لوحدها.
export function ParentReportView({ report }: { report: NonNullable<ParentReport> }) {
  const [note, setNote] = useState("");
  const [phone, setPhone] = useState("");
  const [copied, setCopied] = useState(false);
  const { student, attendance, quizzes, quizAvg, payments, subscription, lessons, badges } = report;

  const message = useMemo(() => {
    const lines: string[] = [];
    lines.push(`السلام عليكم، ده تقرير متابعة الطالب/ة: ${student.name}`);
    lines.push(`الفترة: ${report.period.title}`);
    lines.push("");
    if (attendance.total > 0) {
      lines.push(
        `📅 الحضور: حضر ${attendance.present + attendance.late} من ${sessions(attendance.total)} (${attendance.percentage}%)` +
          (attendance.absent > 0 ? ` — غاب ${times(attendance.absent)}` : " — مفيش غياب 👏")
      );
    }
    if (quizzes.length > 0) {
      lines.push(`📝 الاختبارات: ${count(quizzes.length, "اختبار واحد", "اختبارين", "اختبارات", "اختبار")}${quizAvg !== null ? `، المتوسط ${quizAvg}% (${gradeWord(quizAvg)})` : ""}`);
      for (const q of quizzes) {
        lines.push(`   • ${q.title}: ${q.pending ? "لسه بيتصحح" : `${q.percentage}%`}`);
      }
    } else {
      lines.push("📝 الاختبارات: ما دخلش اختبارات في الفترة دي");
    }
    if (lessons) {
      lines.push(
        lessons.completedInPeriod === 0
          ? `📚 الدروس: ما علّمش على دروس خلّصها في الفترة دي (إجمالي ${lessons.completedTotal} من ${report.publishedLessons})`
          : `📚 الدروس: خلّص ${count(lessons.completedInPeriod, "درس واحد", "درسين", "دروس", "درس")} في الفترة دي (إجمالي ${lessons.completedTotal} من ${report.publishedLessons})`
      );
    }
    if (badges.length > 0) lines.push(`🏅 شارات جديدة: ${badges.map((b) => b.name).join("، ")}`);
    lines.push(
      subscription.active && !subscription.openedWithoutPayment
        ? `💳 الاشتراك: ساري${subscription.paidUntil ? ` لحد ${day(subscription.paidUntil)}` : ""}`
        : "💳 الاشتراك: محتاج تجديد"
    );
    if (note.trim()) {
      lines.push("");
      lines.push(`✍️ ملاحظة المعلّم: ${note.trim()}`);
    }
    lines.push("");
    lines.push(report.teacherName ? `${report.teacherName} — ${report.platformName}` : report.platformName);
    return lines.join("\n");
  }, [report, student, attendance, quizzes, quizAvg, lessons, badges, subscription, note]);

  const waNumber = toWhatsappNumber(phone);
  const waHref = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="min-h-screen bg-canvas print:bg-white">
      {/* ===== شريط الأدوات - للشاشة بس، بيختفي في الطباعة ===== */}
      <div className="print:hidden sticky top-0 z-10 border-b border-border bg-surface shadow-elevated">
        <div className="mx-auto max-w-4xl px-5 py-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/admin/students" className="text-sm text-ink-soft hover:text-ink">
              ← رجوع للطلاب
            </Link>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="فترة التقرير">
              {(Object.keys(PERIOD_LABELS) as ReportPeriodKey[]).map((k) => (
                <Link
                  key={k}
                  href={`?period=${k}`}
                  className={`rounded-full px-3 py-1 text-sm ${
                    report.period.key === k ? "bg-primary text-white" : "border border-border text-ink-soft hover:text-ink"
                  }`}
                >
                  {PERIOD_LABELS[k]}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <button
              onClick={() => window.print()}
              className="rounded-lg bg-gradient-brand px-4 py-2 text-sm font-semibold text-white shadow-glow hover:opacity-90"
            >
              🖨️ طباعة / حفظ PDF
            </button>
            <div className="flex items-end gap-2">
              <label className="text-xs text-ink-soft">
                رقم ولي الأمر (اختياري)
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01xxxxxxxxx"
                  dir="ltr"
                  inputMode="tel"
                  className="mt-1 block w-40 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink"
                />
              </label>
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-[#25D366] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                فتح الرسالة في واتساب
              </a>
            </div>
            <button onClick={copy} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-ink hover:border-primary/40">
              {copied ? "✓ اتنسخت" : "نسخ الرسالة"}
            </button>
          </div>
          <p className="text-xs text-ink-soft leading-5">
            مفيش حاجة بتتبعت لوحدها. زرار واتساب بيفتحلك الرسالة جاهزة وانت اللي بتدوس إرسال (أو تقفلها). لو سبت الرقم فاضي،
            واتساب هيخليك تختار جهة الاتصال.
          </p>
        </div>
      </div>

      {/* ===== التقرير نفسه ===== */}
      <div className="mx-auto max-w-4xl p-6 sm:p-8 print:p-0 print:max-w-none space-y-6 text-ink">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-primary pb-4">
          <div>
            <p className="text-sm text-ink-soft">{report.platformName}</p>
            <h1 className="text-2xl font-bold mt-1">تقرير متابعة الطالب</h1>
            <p className="text-sm text-ink-soft mt-1">
              الفترة: <span className="font-semibold text-ink">{report.period.title}</span> — اتعمل يوم {day(report.generatedAt)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface px-4 py-3 text-sm min-w-[14rem]">
            <p className="text-lg font-bold">{student.name}</p>
            <p className="text-ink-soft mt-0.5">
              الكود: <span dir="ltr">{student.code}</span>
            </p>
            {student.group && <p className="text-ink-soft">المجموعة: {student.group}</p>}
            {student.grade && <p className="text-ink-soft">الصف: {student.grade}</p>}
          </div>
        </header>

        {/* ملخص بالأرقام */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "نسبة الحضور",
              value: attendance.percentage !== null ? `${attendance.percentage}%` : "—",
              hint: attendance.total > 0 ? `حضر ${attendance.present + attendance.late} من ${sessions(attendance.total)}` : "مفيش حصص في الفترة دي",
            },
            {
              label: "متوسط الاختبارات",
              value: quizAvg !== null ? `${quizAvg}%` : "—",
              hint: quizAvg !== null ? gradeWord(quizAvg) : "ما دخلش اختبارات",
            },
            {
              label: "دروس خلّصها",
              value: lessons ? String(lessons.completedInPeriod) : "—",
              hint: lessons ? `الإجمالي ${lessons.completedTotal} من ${report.publishedLessons}` : "",
            },
            {
              label: "الاشتراك",
              value: subscription.active && !subscription.openedWithoutPayment ? "ساري" : "محتاج تجديد",
              hint: subscription.paidUntil ? `لحد ${day(subscription.paidUntil)}` : "",
            },
          ].map((c) => (
            <div key={c.label} className="rounded-xl border border-border bg-surface p-4 text-center break-inside-avoid">
              <p className="text-xs text-ink-soft">{c.label}</p>
              <p className="text-2xl font-bold text-primary mt-1">{c.value}</p>
              {c.hint && <p className="text-xs text-ink-soft mt-1">{c.hint}</p>}
            </div>
          ))}
        </section>

        {/* الحضور */}
        <section className="rounded-xl border border-border bg-surface p-5 break-inside-avoid">
          <h2 className="font-bold text-lg">📅 الحضور والغياب</h2>
          {attendance.total === 0 ? (
            <p className="text-sm text-ink-soft mt-2">مفيش حصص اتسجّل فيها حضور في الفترة دي.</p>
          ) : (
            <>
              <p className="text-sm mt-2">
                من إجمالي <b>{sessions(attendance.total)}</b>: حضر في ميعاده <b>{attendance.present}</b>، واتأخر{" "}
                <b>{attendance.late}</b>، وغاب <b>{attendance.absent}</b>. (التأخير بيتحسب حضور في النسبة.)
              </p>
              {attendance.absentDates.length > 0 && (
                <p className="text-sm text-ink-soft mt-2">
                  أيام الغياب: <span className="text-danger">{attendance.absentDates.map((d) => day(d)).join("، ")}</span>
                </p>
              )}
              {attendance.lateDates.length > 0 && (
                <p className="text-sm text-ink-soft mt-1">أيام التأخير: {attendance.lateDates.map((d) => day(d)).join("، ")}</p>
              )}
            </>
          )}
        </section>

        {/* الاختبارات */}
        <section className="rounded-xl border border-border bg-surface p-5 break-inside-avoid">
          <h2 className="font-bold text-lg">📝 الاختبارات</h2>
          {quizzes.length === 0 ? (
            <p className="text-sm text-ink-soft mt-2">ما دخلش اختبارات في الفترة دي.</p>
          ) : (
            <table className="w-full text-sm mt-3">
              <thead>
                <tr className="text-ink-soft border-b border-border">
                  <th className="text-start py-2 font-medium">الاختبار</th>
                  <th className="text-start py-2 font-medium">التاريخ</th>
                  <th className="text-start py-2 font-medium">الدرجة</th>
                  <th className="text-start py-2 font-medium">النسبة</th>
                </tr>
              </thead>
              <tbody>
                {quizzes.map((q, i) => (
                  <tr key={i} className="border-b border-border/60 last:border-0">
                    <td className="py-2">
                      {q.title}
                      {q.attempts > 1 && <span className="text-xs text-ink-soft"> (أحسن محاولة من {q.attempts})</span>}
                    </td>
                    <td className="py-2 text-ink-soft">{day(q.date)}</td>
                    <td className="py-2">{q.pending ? "—" : `${q.score} من ${q.maxScore}`}</td>
                    <td className="py-2 font-semibold">
                      {q.pending ? <span className="text-ink-soft font-normal">لسه بيتصحح</span> : `${q.percentage}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <div className="grid sm:grid-cols-2 gap-6">
          {/* الدروس */}
          <section className="rounded-xl border border-border bg-surface p-5 break-inside-avoid">
            <h2 className="font-bold text-lg">📚 الدروس</h2>
            {!lessons ? (
              <p className="text-sm text-ink-soft mt-2">متابعة الدروس مش متاحة.</p>
            ) : lessons.recent.length === 0 ? (
              <p className="text-sm text-ink-soft mt-2">ما علّمش على دروس إنه خلّصها في الفترة دي.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm">
                {lessons.recent.map((l, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span>✓ {splitLessonNumber(l.title).text}</span>
                    <span className="text-ink-soft shrink-0">{day(l.completedAt)}</span>
                  </li>
                ))}
                {lessons.completedInPeriod > lessons.recent.length && (
                  <li className="text-ink-soft">و {lessons.completedInPeriod - lessons.recent.length} دروس كمان</li>
                )}
              </ul>
            )}
          </section>

          {/* المدفوعات والشارات */}
          <section className="rounded-xl border border-border bg-surface p-5 break-inside-avoid space-y-3">
            <div>
              <h2 className="font-bold text-lg">💳 المدفوعات</h2>
              {payments.length === 0 ? (
                <p className="text-sm text-ink-soft mt-1">مفيش مدفوعات اتسجّلت في الفترة دي.</p>
              ) : (
                <ul className="mt-1 space-y-1 text-sm">
                  {payments.map((p, i) => (
                    <li key={i}>
                      {p.amount} جنيه{p.forMonth ? ` عن شهر ${monthOf(p.forMonth)}` : ""}{" "}
                      <span className="text-ink-soft">({day(p.paidAt)})</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {badges.length > 0 && (
              <div>
                <h2 className="font-bold text-lg">🏅 شارات جديدة</h2>
                <p className="text-sm mt-1">{badges.map((b) => `${b.icon} ${b.name}`).join("  •  ")}</p>
              </div>
            )}
          </section>
        </div>

        {/* ملاحظة المعلّم: بتتكتب على الشاشة وبتظهر في الطباعة وفي رسالة الواتساب */}
        <section className="rounded-xl border border-border bg-surface p-5 break-inside-avoid">
          <h2 className="font-bold text-lg">✍️ ملاحظة المعلّم</h2>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="اكتب ملاحظة لولي الأمر (اختياري) — هتظهر في الورقة المطبوعة وفي رسالة الواتساب."
            className="print:hidden mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
          <p className="hidden print:block mt-2 text-sm whitespace-pre-wrap min-h-[3rem]">{note}</p>
        </section>

        <footer className="pt-4 border-t border-border flex justify-between text-sm text-ink-soft">
          <span>{report.teacherName ?? ""}</span>
          <span>التوقيع: ______________</span>
        </footer>
      </div>
    </div>
  );
}
