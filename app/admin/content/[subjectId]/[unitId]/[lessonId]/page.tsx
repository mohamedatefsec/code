"use client";

import { useEffect, useState, FormEvent, ChangeEvent, use } from "react";
import Link from "next/link";
import { unitLabel, lessonLabel } from "@/lib/unit-label";
import { toEmbedUrl, toVideoEmbedUrl } from "@/lib/media";
import { AdminLessonProgress } from "@/components/AdminLessonProgress";
import { upload } from "@vercel/blob/client";

type Media = { id: string; type: "video" | "pdf" | "image" | "link"; url: string; title: string | null };
type Lesson = {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  status: "draft" | "published";
  media: Media[];
};

const MEDIA_LABELS: Record<Media["type"], string> = {
  video: "فيديو (رابط يوتيوب/فيميو مضمّن)",
  pdf: "ملف PDF",
  image: "صورة",
  link: "رابط تعليمي",
};

export default function AdminLessonEditPage({
  params,
}: {
  params: Promise<{ subjectId: string; unitId: string; lessonId: string }>;
}) {
  const { subjectId, unitId, lessonId } = use(params);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [mediaType, setMediaType] = useState<Media["type"]>("video");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaTitle, setMediaTitle] = useState("");
  const [addingMedia, setAddingMedia] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  function reload() {
    fetch(`/api/lessons/${lessonId}`)
      .then((r) => r.json())
      .then((d) => setLesson(d.lesson));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  function update<K extends keyof Lesson>(key: K, value: Lesson[K]) {
    setLesson((l) => (l ? { ...l, [key]: value } : l));
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!lesson) return;
    setSaving(true);
    setMessage(null);
    const res = await fetch(`/api/lessons/${lessonId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: lesson.title,
        description: lesson.description,
        content: lesson.content,
        status: lesson.status,
      }),
    });
    setSaving(false);
    setMessage(res.ok ? "تم حفظ الدرس بنجاح." : "تعذّر الحفظ.");
  }

  async function handleAddMedia(e: FormEvent) {
    e.preventDefault();
    setMediaError(null);
    if (!mediaUrl.trim()) return;
    setAddingMedia(true);
    const res = await fetch(`/api/lessons/${lessonId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: mediaType, url: mediaUrl, title: mediaTitle || null }),
    });
    setAddingMedia(false);
    if (res.ok) {
      setMediaUrl("");
      setMediaTitle("");
      reload();
    } else {
      const data = await res.json().catch(() => null);
      setMediaError(data?.error ?? "تعذّر إضافة الوسيط. تأكد أن الرابط صحيح (يبدأ بـ https://)");
    }
  }

  async function handleDeleteMedia(mediaId: string) {
    const res = await fetch(`/api/lessons/${lessonId}/media/${mediaId}`, { method: "DELETE" });
    if (res.ok) reload();
  }

  async function handlePdfFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setMediaError(null);
    setUploadingPdf(true);
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload/document",
      });
      setMediaUrl(blob.url);
    } catch (err) {
      setMediaError(err instanceof Error ? err.message : "تعذّر رفع الملف.");
    } finally {
      setUploadingPdf(false);
    }
  }

  // مكان الدرس: "الوحدة الثانية ‹ الدرس الثالث" - عشان الأدمن يعرف هو فين
  const [position, setPosition] = useState<{ unit: number; lesson: number } | null>(null);
  useEffect(() => {
    Promise.all([
      fetch(`/api/units?subjectId=${subjectId}`).then((r) => r.json()),
      fetch(`/api/lessons?unitId=${unitId}`).then((r) => r.json()),
    ])
      .then(([u, l]: [{ units?: { id: string }[] }, { lessons?: { id: string }[] }]) => {
        const unitIndex = u.units?.findIndex((x) => x.id === unitId) ?? -1;
        const lessonIndex = l.lessons?.findIndex((x) => x.id === lessonId) ?? -1;
        if (unitIndex >= 0 && lessonIndex >= 0) setPosition({ unit: unitIndex, lesson: lessonIndex });
      })
      .catch(() => {});
  }, [subjectId, unitId, lessonId]);

  if (!lesson) {
    return <p className="text-sm text-ink-soft">جارٍ التحميل...</p>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href={`/admin/content/${subjectId}/${unitId}`} className="text-sm text-ink-soft hover:text-ink">
          ← رجوع للدروس
        </Link>
        {position && (
          <div className="mt-3">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
              {unitLabel(position.unit)}
              <span aria-hidden="true">‹</span>
              {lessonLabel(position.lesson)}
            </p>
          </div>
        )}
        <h1 className="text-xl font-bold text-ink mt-2">{lesson.title}</h1>
      </div>

      <form onSubmit={handleSave} className="space-y-4 rounded-xl border border-border bg-surface p-6 shadow-elevated">
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">عنوان الدرس</label>
          <input
            value={lesson.title}
            onChange={(e) => update("title", e.target.value)}
            className="w-full rounded-lg border border-border px-4 py-2.5 transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">وصف مختصر</label>
          <input
            value={lesson.description ?? ""}
            onChange={(e) => update("description", e.target.value)}
            className="w-full rounded-lg border border-border px-4 py-2.5 transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">محتوى الدرس</label>
          <textarea
            value={lesson.content ?? ""}
            onChange={(e) => update("content", e.target.value)}
            rows={8}
            className="w-full rounded-lg border border-border px-4 py-2.5 leading-7 transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
            placeholder="اكتب شرح الدرس هنا..."
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-ink">الحالة:</label>
          <select
            value={lesson.status}
            onChange={(e) => update("status", e.target.value as Lesson["status"])}
            className="rounded-lg border border-border px-3 py-2 text-sm"
          >
            <option value="draft">مسودة (غير ظاهر للطالب)</option>
            <option value="published">منشور</option>
          </select>
        </div>

        {message && <p className="text-sm text-accent">{message}</p>}

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-gradient-brand px-5 py-2.5 font-semibold text-white hover:opacity-90 shadow-glow transition-all active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? "جارٍ الحفظ..." : "حفظ الدرس"}
        </button>
      </form>

      <div className="rounded-xl border border-border bg-surface p-6 space-y-4 shadow-elevated">
        <h2 className="font-semibold text-ink">الوسائط المرفقة</h2>

        {lesson.media.length === 0 && (
          <p className="text-sm text-ink-soft">لا توجد وسائط بعد.</p>
        )}
        <div className="space-y-2">
          {lesson.media.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-lg border border-border px-4 py-2.5 text-sm"
            >
              <div className="min-w-0">
                <span className="font-medium text-ink">{MEDIA_LABELS[m.type]}</span>
                <span className="text-ink-soft ms-2 break-all">{m.title || m.url}</span>
                {/* الطالب هيشوف الفيديو جوه المنصة ولا هيفتح برّه؟ */}
                {(m.type === "video" || (m.type === "link" && toVideoEmbedUrl(m.url))) &&
                  (toEmbedUrl(m.url) ? (
                    <span className="mt-1 flex w-fit items-center gap-1 rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent">
                      ✓ بيتعرض جوه المنصة
                    </span>
                  ) : (
                    <span className="mt-1 flex w-fit items-center gap-1 rounded-full bg-warn-soft px-2.5 py-0.5 text-xs font-medium text-warn">
                      ⚠ الرابط ده مش مفهوم، فهيفتح برّه المنصة. احذفه وضيفه تاني بالرابط من زرار &quot;مشاركة&quot; في يوتيوب.
                    </span>
                  ))}
              </div>
              <button onClick={() => handleDeleteMedia(m.id)} className="text-danger hover:underline">
                حذف
              </button>
            </div>
          ))}
        </div>

        <form onSubmit={handleAddMedia} className="flex flex-wrap items-end gap-3 pt-2 border-t border-border">
          <div>
            <label className="block text-xs font-medium text-ink-soft mb-1.5">النوع</label>
            <select
              value={mediaType}
              onChange={(e) => setMediaType(e.target.value as Media["type"])}
              className="rounded-lg border border-border px-3 py-2 text-sm"
            >
              <option value="video">فيديو</option>
              <option value="pdf">PDF</option>
              <option value="image">صورة</option>
              <option value="link">رابط</option>
            </select>
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-ink-soft mb-1.5">
              {mediaType === "pdf" ? "الرابط (أو ارفع ملف →)" : "الرابط"}
            </label>
            <input
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full rounded-lg border border-border px-3 py-2 text-sm transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
            />
            {/* فحص فوري للرابط وانت بتكتبه */}
            {mediaUrl.trim() && mediaType === "video" && (
              <p className={`mt-1.5 text-xs ${toEmbedUrl(mediaUrl) ? "text-accent" : "text-warn"}`}>
                {toEmbedUrl(mediaUrl)
                  ? "✓ رابط فيديو سليم، هيتعرض جوه المنصة."
                  : "⚠ الرابط ده مش رابط فيديو معروف (يوتيوب، فيميو، جوجل درايف)، فهيفتح برّه المنصة."}
              </p>
            )}
            {mediaUrl.trim() && mediaType === "link" && toVideoEmbedUrl(mediaUrl) && (
              <p className="mt-1.5 text-xs text-accent">
                ده رابط فيديو، فهيتعرض للطالب كفيديو جوه المنصة.{" "}
                <button type="button" onClick={() => setMediaType("video")} className="underline font-semibold">
                  غيّر النوع لـ &quot;فيديو&quot;
                </button>
              </p>
            )}
          </div>
          {mediaType === "pdf" && (
            <div>
              <label className="block text-xs font-medium text-ink-soft mb-1.5">ارفع ملف PDF</label>
              <label
                className={`flex items-center justify-center rounded-lg border border-dashed border-border px-3 py-2 text-sm cursor-pointer hover:bg-canvas transition-colors ${
                  uploadingPdf ? "opacity-60 pointer-events-none" : ""
                }`}
              >
                {uploadingPdf ? "جارٍ الرفع..." : "📄 اختر ملف"}
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handlePdfFileSelect}
                  className="hidden"
                />
              </label>
            </div>
          )}
          <div className="w-40">
            <label className="block text-xs font-medium text-ink-soft mb-1.5">عنوان (اختياري)</label>
            <input
              value={mediaTitle}
              onChange={(e) => setMediaTitle(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm transition-shadow focus:border-primary focus-visible:outline-none focus:ring-4 focus:ring-primary/15"
            />
          </div>
          <button
            type="submit"
            disabled={addingMedia}
            className="rounded-lg bg-ink text-canvas px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-60 transition-opacity"
          >
            {addingMedia ? "جارٍ الإضافة..." : "+ إضافة"}
          </button>
        </form>
        {mediaError && <p className="text-sm text-danger">{mediaError}</p>}
      </div>

      <AdminLessonProgress lessonId={lessonId} />
    </div>
  );
}
