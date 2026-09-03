"use client";

import { useEffect, useState, FormEvent } from "react";
import { ImageUploadField } from "./ImageUploadField";
import { Avatar } from "./Avatar";

const inputClass =
  "w-full rounded-lg border border-border px-4 py-2.5 transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15";

/// بطاقة "صورتي الشخصية" في صفحة الإعدادات - بترفع صورة بروفايل الأدمن
/// وتحفظها في AdminProfile.avatarUrl، فتظهر تلقائيًا في الشريط الجانبي
/// والهيدر (مكوّن Avatar) بدل الحرف الأول الافتراضي.
export function AdminProfileCard() {
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/profile")
      .then((r) => r.json())
      .then((data) => {
        setFullName(data.profile?.fullName ?? "");
        setAvatarUrl(data.profile?.avatarUrl ?? "");
        setLoaded(true);
      });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/admin/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, avatarUrl: avatarUrl || null }),
    });
    setSaving(false);
    if (res.ok) {
      setMessage({ type: "ok", text: "تم حفظ صورتك الشخصية بنجاح. حدّث الصفحة لتظهر في الشريط الجانبي." });
    } else {
      const data = await res.json().catch(() => null);
      setMessage({ type: "error", text: data?.error ?? "تعذّر حفظ التعديلات." });
    }
  }

  if (!loaded) {
    return <div className="rounded-xl border border-border bg-surface p-6 shadow-elevated skeleton h-40" />;
  }

  return (
    <div className="space-y-5 rounded-xl border border-border bg-surface p-6 shadow-elevated">
      <div className="flex items-center gap-3">
        <Avatar name={fullName || "المدير"} avatarUrl={avatarUrl} size={44} />
        <div>
          <h2 className="font-semibold text-ink">صورتي الشخصية</h2>
          <p className="text-sm text-ink-soft mt-0.5">تظهر في الشريط الجانبي والهيدر لكل صفحات الإدارة.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <ImageUploadField label="الصورة الشخصية" value={avatarUrl} onChange={setAvatarUrl} shape="circle" />

        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">الاسم الظاهر</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className={inputClass}
          />
        </div>

        {message && (
          <p className={`text-sm ${message.type === "ok" ? "text-success" : "text-danger"}`}>{message.text}</p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 shadow-glow transition disabled:opacity-60"
        >
          {saving ? "جارٍ الحفظ..." : "حفظ الصورة والاسم"}
        </button>
      </form>
    </div>
  );
}
