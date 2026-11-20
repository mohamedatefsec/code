"use client";

/// خانة "انشر تلقائيًا في ميعاد": بتاخد تاريخ وساعة، وبتوضّح بالكلام إمتى
/// بالظبط هيتنشر. القيمة بتتبعت للسيرفر بصيغة ISO (أو null = من غير جدولة).

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function describe(iso: string) {
  const d = new Date(iso);
  const diffMs = d.getTime() - Date.now();
  const when = d.toLocaleString("ar-EG", { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" });
  if (diffMs <= 0) return { text: `الميعاد ده (${when}) عدّى — هيتنشر أول ما حد يفتح المنصة.`, past: true };
  const hours = Math.round(diffMs / 3_600_000);
  const days = Math.round(hours / 24);
  const rel =
    hours < 1
      ? "خلال أقل من ساعة"
      : hours === 1
        ? "بعد حوالي ساعة"
        : hours === 2
          ? "بعد حوالي ساعتين"
          : hours < 24
            ? `بعد حوالي ${hours} ${hours <= 10 ? "ساعات" : "ساعة"}`
            : days === 1
              ? "بكرة تقريبًا"
              : days === 2
                ? "بعد حوالي يومين"
                : `بعد حوالي ${days} ${days <= 10 ? "أيام" : "يوم"}`;
  return { text: `هيتنشر تلقائيًا يوم ${when} (${rel}) ويتبعت إشعار للطلاب.`, past: false };
}

export function SchedulePublishField({
  value,
  onChange,
  what = "الدرس",
}: {
  value: string | null;
  onChange: (iso: string | null) => void;
  /// "الدرس" أو "الاختبار" - للكلام اللي بيظهر
  what?: string;
}) {
  const info = value ? describe(value) : null;

  return (
    <div className="rounded-lg border border-dashed border-primary/40 bg-primary-soft/40 p-4 space-y-2">
      <label className="block text-sm font-medium text-ink">
        ⏰ نشر تلقائي في ميعاد <span className="text-ink-soft font-normal">(اختياري)</span>
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="datetime-local"
          value={toLocalInput(value)}
          onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          dir="ltr"
        />
        {value && (
          <button type="button" onClick={() => onChange(null)} className="text-sm text-danger hover:underline">
            إلغاء الجدولة
          </button>
        )}
      </div>
      <p className={`text-xs leading-5 ${info?.past ? "text-warn" : "text-ink-soft"}`}>
        {info
          ? info.text
          : `سيب ${what} مسودة واختار ميعاد، وهو هيتنشر لوحده في الميعاد ده. متنساش تدوس حفظ.`}
      </p>
    </div>
  );
}
