"use client";

import { useEffect, useState, FormEvent } from "react";

type Group = { id: string; name: string };
type Student = { id: string; fullName: string; studentCode: string };
type Notification = {
  id: string;
  title: string;
  body: string;
  targetType: "all" | "group" | "student";
  createdAt: string;
  audienceCount: number;
  readCount: number;
};

const TARGET_LABELS: Record<Notification["targetType"], string> = {
  all: "كل الطلاب",
  group: "مجموعة محددة",
  student: "طالب محدد",
};

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[] | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetType, setTargetType] = useState<Notification["targetType"]>("all");
  const [targetGroupId, setTargetGroupId] = useState("");
  const [targetStudentId, setTargetStudentId] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => setNotifications(d.notifications));
  }

  useEffect(() => {
    reload();
    fetch("/api/groups")
      .then((r) => r.json())
      .then((d) => setGroups(d.groups));
    fetch("/api/students")
      .then((r) => r.json())
      .then((d) => setStudents(d.students));
  }, []);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSending(true);
    const res = await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        body,
        targetType,
        targetGroupId: targetType === "group" ? targetGroupId : null,
        targetStudentId: targetType === "student" ? targetStudentId : null,
      }),
    });
    setSending(false);
    if (res.ok) {
      setTitle("");
      setBody("");
      setTargetType("all");
      setTargetGroupId("");
      setTargetStudentId("");
      reload();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "تعذّر إرسال الإشعار.");
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">الإشعارات</h1>
        <p className="text-sm text-ink-soft mt-1">أرسل إشعارًا لكل الطلاب أو مجموعة أو طالب محدد.</p>
      </div>

      <form onSubmit={handleSend} className="space-y-4 rounded-xl border border-border bg-surface p-6 shadow-elevated">
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">العنوان</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-border px-4 py-2.5 transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
            placeholder="مثال: تم إضافة اختبار جديد"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">النص</label>
          <textarea
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-border px-4 py-2.5 transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">إرسال إلى</label>
            <select
              value={targetType}
              onChange={(e) => setTargetType(e.target.value as Notification["targetType"])}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
            >
              <option value="all">كل الطلاب</option>
              <option value="group">مجموعة محددة</option>
              <option value="student">طالب محدد</option>
            </select>
          </div>

          {targetType === "group" && (
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">المجموعة</label>
              <select
                required
                value={targetGroupId}
                onChange={(e) => setTargetGroupId(e.target.value)}
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
          )}

          {targetType === "student" && (
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">الطالب</label>
              <select
                required
                value={targetStudentId}
                onChange={(e) => setTargetStudentId(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
              >
                <option value="">اختر</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} ({s.studentCode})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {error && <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger">{error}</div>}

        <button
          type="submit"
          disabled={sending}
          className="rounded-lg bg-gradient-brand px-5 py-2.5 font-semibold text-white hover:opacity-90 shadow-glow transition-all active:scale-[0.98] disabled:opacity-60"
        >
          {sending ? "جارٍ الإرسال..." : "إرسال الإشعار"}
        </button>
      </form>

      <div className="space-y-3">
        <h2 className="font-semibold text-ink">آخر الإشعارات</h2>
        {notifications === null && <p className="text-sm text-ink-soft">جارٍ التحميل...</p>}
        {notifications?.length === 0 && <p className="text-sm text-ink-soft">لم تُرسل أي إشعارات بعد.</p>}
        {notifications?.map((n) => (
          <div key={n.id} className="rounded-xl border border-border bg-surface p-4 shadow-elevated">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-ink">{n.title}</p>
                <p className="text-sm text-ink-soft mt-0.5">{n.body}</p>
              </div>
              <span className="text-xs text-ink-soft shrink-0">{TARGET_LABELS[n.targetType]}</span>
            </div>
            <p className="text-xs text-ink-soft mt-2">
              وصل لـ {n.audienceCount} طالب · قرأه {n.readCount}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
