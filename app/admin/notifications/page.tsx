"use client";

import { useEffect, useState, FormEvent } from "react";
import { ImageUploadField } from "@/components/ImageUploadField";

type Group = { id: string; name: string };
type Student = { id: string; fullName: string; studentCode: string };
type Notification = {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  targetType: "all" | "group" | "student";
  targetGroupId: string | null;
  targetStudentId: string | null;
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
  const [imageUrl, setImageUrl] = useState("");
  const [targetType, setTargetType] = useState<Notification["targetType"]>("all");
  const [targetGroupId, setTargetGroupId] = useState("");
  const [targetStudentId, setTargetStudentId] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // تعديل إشعار موجود - نفس الحقول بس في نسخة منفصلة عشان مفيش تعارض مع
  // فورم الإرسال الجديد فوق.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editTargetType, setEditTargetType] = useState<Notification["targetType"]>("all");
  const [editTargetGroupId, setEditTargetGroupId] = useState("");
  const [editTargetStudentId, setEditTargetStudentId] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  function startEdit(n: Notification) {
    setEditingId(n.id);
    setEditTitle(n.title);
    setEditBody(n.body);
    setEditImageUrl(n.imageUrl ?? "");
    setEditTargetType(n.targetType);
    setEditTargetGroupId(n.targetGroupId ?? "");
    setEditTargetStudentId(n.targetStudentId ?? "");
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError(null);
  }

  async function handleEditSave(id: string) {
    setEditError(null);
    setEditSaving(true);
    const res = await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editTitle,
        body: editBody,
        imageUrl: editImageUrl || null,
        targetType: editTargetType,
        targetGroupId: editTargetType === "group" ? editTargetGroupId : null,
        targetStudentId: editTargetType === "student" ? editTargetStudentId : null,
      }),
    });
    setEditSaving(false);
    if (res.ok) {
      setEditingId(null);
      reload();
    } else {
      const data = await res.json().catch(() => null);
      setEditError(data?.error ?? "تعذّر حفظ التعديل.");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("متأكد من حذف هذا الإشعار؟ هيتشال من عند كل الطلاب اللي وصلهم.")) return;
    setDeletingId(id);
    const res = await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    setDeletingId(null);
    if (res.ok) {
      if (editingId === id) setEditingId(null);
      reload();
    } else {
      alert("تعذّر حذف الإشعار.");
    }
  }

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
        imageUrl: imageUrl || null,
        targetType,
        targetGroupId: targetType === "group" ? targetGroupId : null,
        targetStudentId: targetType === "student" ? targetStudentId : null,
      }),
    });
    setSending(false);
    if (res.ok) {
      setTitle("");
      setBody("");
      setImageUrl("");
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

        <ImageUploadField label="صورة (اختياري)" value={imageUrl} onChange={setImageUrl} />

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
        {notifications?.map((n) =>
          editingId === n.id ? (
            <div key={n.id} className="space-y-3 rounded-xl border border-primary/40 bg-surface p-4 shadow-elevated">
              <div>
                <label className="block text-xs font-medium text-ink mb-1">العنوان</label>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink mb-1">النص</label>
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                />
              </div>
              <ImageUploadField label="صورة (اختياري)" value={editImageUrl} onChange={setEditImageUrl} />
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">إرسال إلى</label>
                  <select
                    value={editTargetType}
                    onChange={(e) => setEditTargetType(e.target.value as Notification["targetType"])}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <option value="all">كل الطلاب</option>
                    <option value="group">مجموعة محددة</option>
                    <option value="student">طالب محدد</option>
                  </select>
                </div>
                {editTargetType === "group" && (
                  <div>
                    <label className="block text-xs font-medium text-ink mb-1">المجموعة</label>
                    <select
                      value={editTargetGroupId}
                      onChange={(e) => setEditTargetGroupId(e.target.value)}
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm"
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
                {editTargetType === "student" && (
                  <div>
                    <label className="block text-xs font-medium text-ink mb-1">الطالب</label>
                    <select
                      value={editTargetStudentId}
                      onChange={(e) => setEditTargetStudentId(e.target.value)}
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm"
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

              {editError && (
                <div className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
                  {editError}
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleEditSave(n.id)}
                  disabled={editSaving}
                  className="rounded-lg bg-gradient-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-60"
                >
                  {editSaving ? "جارٍ الحفظ..." : "حفظ التعديل"}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-lg border border-border px-4 py-2 text-sm text-ink-soft hover:bg-canvas transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </div>
          ) : (
            <div key={n.id} className="rounded-xl border border-border bg-surface p-4 shadow-elevated">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  {n.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element -- معاينة صورة مرفوعة، ليست next/image
                    <img
                      src={n.imageUrl}
                      alt=""
                      className="w-12 h-12 rounded-lg object-cover border border-border shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-ink">{n.title}</p>
                    <p className="text-sm text-ink-soft mt-0.5">{n.body}</p>
                  </div>
                </div>
                <span className="text-xs text-ink-soft shrink-0">{TARGET_LABELS[n.targetType]}</span>
              </div>
              <div className="flex items-center justify-between mt-2 gap-3">
                <p className="text-xs text-ink-soft">
                  وصل لـ {n.audienceCount} طالب · قرأه {n.readCount}
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => startEdit(n)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    تعديل
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(n.id)}
                    disabled={deletingId === n.id}
                    className="text-xs font-medium text-danger hover:underline disabled:opacity-60"
                  >
                    {deletingId === n.id ? "جارٍ الحذف..." : "حذف"}
                  </button>
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
