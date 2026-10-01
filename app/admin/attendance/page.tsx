"use client";

import { useCallback, useEffect, useState } from "react";

type Group = { id: string; name: string };
type RosterRow = {
  studentId: string;
  fullName: string;
  studentCode: string;
  status: "present" | "absent" | "late";
};
type PastSession = {
  id: string;
  sessionDate: string;
  sessionLabel: string | null;
  group: { name: string };
  _count: { records: number };
};

const STATUS_OPTIONS: { value: RosterRow["status"]; label: string; activeClass: string }[] = [
  { value: "present", label: "حاضر", activeClass: "bg-accent/10 text-accent border-accent" },
  { value: "late", label: "متأخر", activeClass: "bg-warn/10 text-warn border-warn" },
  { value: "absent", label: "غائب", activeClass: "bg-danger/10 text-danger border-danger" },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminAttendancePage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState("");
  const [date, setDate] = useState(todayStr());
  const [label, setLabel] = useState("");

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionInfo, setSessionInfo] = useState<{ sessionDate: string; sessionLabel: string | null; group: { name: string } } | null>(null);
  const [roster, setRoster] = useState<RosterRow[] | null>(null);
  const [opening, setOpening] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // سجل الحصص السابقة - عشان الأدمن يقدر يرجع لأي حصة قديمة يعدّل فيها
  // أو يحذفها لو سجّلها غلط، بدل ما يفتكر التاريخ بالظبط ويكتبه يدويًا.
  const [pastSessions, setPastSessions] = useState<PastSession[] | null>(null);
  const [logGroupFilter, setLogGroupFilter] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadLog = useCallback(async () => {
    const params = new URLSearchParams();
    if (logGroupFilter) params.set("groupId", logGroupFilter);
    const res = await fetch(`/api/attendance/sessions?${params.toString()}`);
    const data = await res.json();
    setPastSessions(data.sessions);
  }, [logGroupFilter]);

  useEffect(() => {
    fetch("/api/groups")
      .then((r) => r.json())
      .then((d) => setGroups(d.groups));
  }, []);

  useEffect(() => {
    loadLog();
  }, [loadLog]);

  async function loadSessionIntoEditor(id: string) {
    setError(null);
    setMessage(null);
    const detailRes = await fetch(`/api/attendance/sessions/${id}`);
    if (!detailRes.ok) {
      setError("تعذّر تحميل الحصة.");
      return;
    }
    const detail = await detailRes.json();
    setSessionId(id);
    setSessionInfo(detail.session);
    setRoster(detail.roster);
    // نظبط حقول الفورم فوق كمان عشان تبقى متسقة لو ضغط "فتح الحصة" تاني بالغلط
    setGroupId(detail.session.group?.id ?? "");
    setDate(new Date(detail.session.sessionDate).toISOString().slice(0, 10));
    setLabel(detail.session.sessionLabel ?? "");
  }

  async function openSession() {
    if (!groupId || !date) return;
    setError(null);
    setMessage(null);
    setOpening(true);
    const res = await fetch("/api/attendance/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId, sessionDate: date, sessionLabel: label || null }),
    });
    if (!res.ok) {
      setOpening(false);
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "تعذّر فتح الحصة.");
      return;
    }
    const { session } = await res.json();
    await loadSessionIntoEditor(session.id);
    setOpening(false);
    loadLog();
  }

  function setStatus(studentId: string, status: RosterRow["status"]) {
    setRoster((r) => (r ? r.map((row) => (row.studentId === studentId ? { ...row, status } : row)) : r));
  }

  async function saveAttendance() {
    if (!sessionId || !roster) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    const res = await fetch(`/api/attendance/sessions/${sessionId}/records`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        records: roster.map((r) => ({ studentId: r.studentId, status: r.status })),
      }),
    });
    setSaving(false);
    if (res.ok) {
      setMessage("تم حفظ الحضور بنجاح.");
      loadLog();
    } else {
      setError("تعذّر حفظ الحضور.");
    }
  }

  async function handleDeleteSession(id: string, s: PastSession) {
    const dateLabel = new Date(s.sessionDate).toLocaleDateString("ar-EG");
    if (
      !confirm(
        `هل تريد حذف حصة "${s.group.name}" بتاريخ ${dateLabel}${s.sessionLabel ? ` (${s.sessionLabel})` : ""} نهائيًا؟ سيُحذف كل سجل الحضور المسجّل فيها (${s._count.records} طالب) ولا يمكن التراجع عن هذا.`
      )
    ) {
      return;
    }
    setDeletingId(id);
    const res = await fetch(`/api/attendance/sessions/${id}`, { method: "DELETE" });
    setDeletingId(null);
    if (res.ok) {
      if (sessionId === id) {
        // لو كانت الحصة المحذوفة هي نفسها المفتوحة في المحرّر فوق، نقفل المحرر
        setSessionId(null);
        setSessionInfo(null);
        setRoster(null);
      }
      loadLog();
    } else {
      alert("تعذّر حذف الحصة.");
    }
  }

  const presentCount = roster?.filter((r) => r.status !== "absent").length ?? 0;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-xl font-bold text-ink">الحضور والغياب</h1>
          <a href="/admin/attendance/report" className="text-primary text-sm hover:underline">
            📄 تقرير الحضور الشامل
          </a>
        </div>
        <p className="text-sm text-ink-soft mt-1">اختر المجموعة والتاريخ لفتح الحصة وتسجيل الحضور.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4 shadow-elevated">
        <div className="min-w-[160px]">
          <label className="block text-sm font-medium text-ink mb-1.5">المجموعة</label>
          <select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
          >
            <option value="">اختر</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">التاريخ</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-border px-3 py-2 text-sm"
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="block text-sm font-medium text-ink mb-1.5">اسم الحصة (اختياري)</label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="مثال: الحصة الأولى"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
          />
        </div>
        <button
          onClick={openSession}
          disabled={!groupId || !date || opening}
          className="rounded-lg bg-gradient-brand px-5 py-2 text-sm font-semibold text-white hover:opacity-90 shadow-glow transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {opening ? "جارٍ الفتح..." : "فتح الحصة"}
        </button>
      </div>

      {error && <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger">{error}</div>}
      {message && <div className="rounded-lg border border-accent/40 bg-accent/10 px-4 py-2.5 text-sm text-accent">{message}</div>}

      {roster && (
        <div className="rounded-xl border border-border bg-surface p-5 space-y-4 shadow-elevated">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="font-semibold text-ink">قائمة الطلاب ({roster.length})</h2>
              {sessionInfo && (
                <p className="text-xs text-ink-soft mt-0.5">
                  {sessionInfo.group.name} · {new Date(sessionInfo.sessionDate).toLocaleDateString("ar-EG")}
                  {sessionInfo.sessionLabel ? ` · ${sessionInfo.sessionLabel}` : ""}
                </p>
              )}
            </div>
            <span className="text-sm text-ink-soft">
              {presentCount} من {roster.length} متوقع حضورهم
            </span>
          </div>

          {roster.length === 0 ? (
            <p className="text-sm text-ink-soft">لا يوجد طلاب نشطون في هذه المجموعة.</p>
          ) : (
            <div className="space-y-2">
              {roster.map((row) => (
                <div
                  key={row.studentId}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium text-ink">{row.fullName}</p>
                    <p className="text-xs text-ink-soft font-mono">{row.studentCode}</p>
                  </div>
                  <div className="flex gap-1.5">
                    {STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setStatus(row.studentId, opt.value)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                          row.status === opt.value
                            ? opt.activeClass
                            : "border-border text-ink-soft hover:bg-canvas"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={saveAttendance}
            disabled={saving || roster.length === 0}
            className="rounded-lg bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 shadow-glow transition-all active:scale-[0.98] disabled:opacity-60"
          >
            {saving ? "جارٍ الحفظ..." : "حفظ الحضور"}
          </button>
        </div>
      )}

      {/* سجل الحصص السابقة - للرجوع لأي حصة اتسجّلت قبل كده وتعديلها أو
          حذفها، بدل ما يفتكر التاريخ بالظبط ويكتبه من الفورم فوق. */}
      <div className="rounded-xl border border-border bg-surface p-5 space-y-3 shadow-elevated">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-semibold text-ink">سجل الحصص</h2>
          <select
            value={logGroupFilter}
            onChange={(e) => setLogGroupFilter(e.target.value)}
            className="rounded-lg border border-border px-3 py-1.5 text-xs"
          >
            <option value="">كل المجموعات</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        {pastSessions === null && <p className="text-sm text-ink-soft">جارٍ التحميل...</p>}
        {pastSessions?.length === 0 && (
          <p className="text-sm text-ink-soft">لا توجد حصص مسجّلة بعد.</p>
        )}
        <div className="space-y-2">
          {pastSessions?.map((s) => (
            <div
              key={s.id}
              className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-2.5 text-sm ${
                sessionId === s.id ? "border-primary bg-primary-soft/40" : "border-border"
              }`}
            >
              <div>
                <p className="font-medium text-ink">
                  {s.group.name} · {new Date(s.sessionDate).toLocaleDateString("ar-EG")}
                  {s.sessionLabel ? ` · ${s.sessionLabel}` : ""}
                </p>
                <p className="text-xs text-ink-soft mt-0.5">{s._count.records} طالب مسجَّل</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button onClick={() => loadSessionIntoEditor(s.id)} className="text-primary hover:underline text-xs">
                  تعديل
                </button>
                <button
                  onClick={() => handleDeleteSession(s.id, s)}
                  disabled={deletingId === s.id}
                  className="text-danger hover:underline text-xs disabled:opacity-50"
                >
                  {deletingId === s.id ? "جارٍ الحذف..." : "حذف"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
