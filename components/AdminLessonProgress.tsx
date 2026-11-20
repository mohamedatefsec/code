"use client";

import { useEffect, useMemo, useState } from "react";

type Row = {
  id: string;
  name: string;
  code: string;
  group: string | null;
  state: "done" | "opened" | "none";
  lastOpenedAt: string | null;
  openCount: number;
  completedAt: string | null;
};

const TABS = [
  { key: "none", label: "لسه ما فتحوش", tone: "warn" },
  { key: "opened", label: "فتحوه بس", tone: "spark" },
  { key: "done", label: "خلّصوه", tone: "accent" },
] as const;

const TONE: Record<string, { text: string; bg: string; ring: string }> = {
  warn: { text: "text-warn", bg: "bg-warn-soft", ring: "ring-warn/40" },
  spark: { text: "text-spark", bg: "bg-spark-soft", ring: "ring-spark/40" },
  accent: { text: "text-accent", bg: "bg-accent-soft", ring: "ring-accent/40" },
};

function studentsLabel(n: number) {
  if (n === 1) return "طالب واحد";
  if (n === 2) return "طالبين";
  if (n >= 3 && n <= 10) return `${n} طلاب`;
  return `${n} طالب`;
}

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("ar-EG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

/// متابعة الطلاب لدرس واحد: مين خلّصه، مين فتحه بس، مين لسه ما فتحوش.
export function AdminLessonProgress({ lessonId }: { lessonId: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [available, setAvailable] = useState(true);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<Row["state"]>("none");
  const [group, setGroup] = useState("all");

  useEffect(() => {
    fetch(`/api/lessons/${lessonId}/progress`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { available: boolean; students: Row[] }) => {
        setAvailable(d.available);
        setRows(d.students);
      })
      .catch(() => setFailed(true));
  }, [lessonId]);

  const groups = useMemo(
    () => Array.from(new Set((rows ?? []).map((r) => r.group ?? "بدون مجموعة"))).sort(),
    [rows]
  );
  const filtered = useMemo(
    () => (rows ?? []).filter((r) => group === "all" || (r.group ?? "بدون مجموعة") === group),
    [rows, group]
  );
  const counts = {
    none: filtered.filter((r) => r.state === "none").length,
    opened: filtered.filter((r) => r.state === "opened").length,
    done: filtered.filter((r) => r.state === "done").length,
  };
  const list = filtered.filter((r) => r.state === tab);

  return (
    <div className="rounded-xl border border-border bg-surface p-6 space-y-4 shadow-elevated">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-ink">متابعة الطلاب</h2>
          <p className="text-sm text-ink-soft mt-0.5">مين من الطلاب النشطين فتح الدرس ده ومين خلّصه.</p>
        </div>
        {groups.length > 1 && (
          <select
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            aria-label="فلترة حسب المجموعة"
          >
            <option value="all">كل المجموعات</option>
            {groups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        )}
      </div>

      {failed && <p className="text-sm text-danger">تعذّر تحميل المتابعة. حدّث الصفحة.</p>}
      {!available && (
        <p className="rounded-lg bg-warn-soft px-4 py-2.5 text-sm text-warn">
          المتابعة مش شغالة لسه: جدول التقدّم مش موجود في قاعدة البيانات. شغّل أمر SQL الخاص بالتحديث في Neon.
        </p>
      )}
      {rows === null && !failed && <p className="text-sm text-ink-soft">جارٍ التحميل...</p>}

      {rows && available && (
        <>
          {/* 3 مربعات بالأرقام - الضغط على أي واحد بيعرض أسماء الطلاب فيه */}
          <div className="grid grid-cols-3 gap-3">
            {TABS.map((t) => {
              const tone = TONE[t.tone];
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`rounded-xl p-3 text-center transition ${tone.bg} ${active ? `ring-2 ${tone.ring}` : "opacity-80 hover:opacity-100"}`}
                  aria-pressed={active}
                >
                  <span className={`block text-2xl font-bold tabular-nums ${tone.text}`}>{counts[t.key]}</span>
                  <span className={`block text-xs font-semibold mt-0.5 ${tone.text}`}>{t.label}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-ink-soft">
            من إجمالي {studentsLabel(filtered.length)}
            {group !== "all" ? ` في ${group}` : ""}. دوس على أي مربع عشان تشوف الأسماء.
          </p>

          {list.length === 0 ? (
            <p className="text-sm text-ink-soft py-2">مفيش طلاب هنا.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border max-h-80 overflow-y-auto">
              {list.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="font-medium text-ink">{r.name}</span>
                    <span className="text-ink-soft mx-2 text-xs" dir="ltr">
                      {r.code}
                    </span>
                    {r.group && <span className="ms-2 rounded-full bg-surface-2 px-2 py-0.5 text-xs text-ink-soft">{r.group}</span>}
                  </span>
                  <span className="text-xs text-ink-soft">
                    {r.state === "done" && `خلّصه ${formatDate(r.completedAt)}`}
                    {r.state === "opened" &&
                      `آخر فتح ${formatDate(r.lastOpenedAt)}${r.openCount > 1 ? ` (فتحه ${r.openCount} مرات)` : ""}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
