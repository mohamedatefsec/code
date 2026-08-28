import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { toEmbedUrl } from "@/lib/media";
import { PdfViewer } from "@/components/PdfViewer";
import { requireActiveUser } from "@/lib/auth";
import { awardBadge } from "@/lib/badges";

export default async function StudentLessonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const lesson = await db.lesson.findUnique({
    where: { id },
    include: {
      media: { orderBy: { order: "asc" } },
      unit: { include: { subject: true } },
    },
  });

  if (!lesson || lesson.status !== "published" || lesson.unit.status !== "published") {
    notFound();
  }

  // منح شارة "أول درس" - آمنة للتكرار، ومعزولة حتى لا تكسر عرض الدرس لو فشلت.
  // نستخدم await صراحة (لا "fire and forget") لأن السيرفرات بدون حالة قد
  // توقف تنفيذ أي Promise معلّق فور إرسال الاستجابة.
  const user = await requireActiveUser("student");
  if (user) {
    const profile = await db.studentProfile.findUnique({ where: { userId: user.id } });
    if (profile) {
      try {
        await awardBadge(profile.id, "first_lesson");
      } catch {
        // تجاهل بهدوء
      }
    }
  }

  const paragraphs = (lesson.content ?? "").split(/\n{2,}/).filter(Boolean);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="animate-fade-in-up">
        <Link href="/lessons" className="text-sm text-ink-soft hover:text-ink">
          ← رجوع للدروس
        </Link>
        <p className="text-sm text-primary mt-2">
          {lesson.unit.subject.name} · {lesson.unit.title}
        </p>
        <h1 className="text-2xl font-bold text-ink mt-1">{lesson.title}</h1>
        {lesson.description && <p className="text-ink-soft mt-2">{lesson.description}</p>}
      </div>

      {lesson.media
        .filter((m) => m.type === "video")
        .map((m) => {
          const embedUrl = toEmbedUrl(m.url);
          return (
            <div key={m.id} className="rounded-2xl overflow-hidden border border-border aspect-video bg-ink shadow-elevated animate-fade-in-up">
              {embedUrl ? (
                <iframe
                  src={embedUrl}
                  title={m.title ?? lesson.title}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <a
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center h-full text-white"
                >
                  ▶ مشاهدة الفيديو
                </a>
              )}
            </div>
          );
        })}

      {paragraphs.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-6 space-y-4 leading-7 text-ink shadow-elevated animate-fade-in-up">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      )}

      {lesson.media.filter((m) => m.type === "image").length > 0 && (
        <div className="grid sm:grid-cols-2 gap-3">
          {lesson.media
            .filter((m) => m.type === "image")
            .map((m) => (
              // eslint-disable-next-line @next/next/no-img-element -- روابط صور خارجية ديناميكية، لا داعي لتحسين next/image هنا
              <img
                key={m.id}
                src={m.url}
                alt={m.title ?? lesson.title}
                className="rounded-2xl border border-border w-full shadow-elevated"
              />
            ))}
        </div>
      )}

      {lesson.media.filter((m) => m.type === "pdf").length > 0 && (
        <div className="space-y-4">
          {lesson.media
            .filter((m) => m.type === "pdf")
            .map((m) => (
              <PdfViewer key={m.id} url={m.url} title={m.title ?? lesson.title} />
            ))}
        </div>
      )}

      {lesson.media.filter((m) => m.type === "link").length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-4 space-y-2 shadow-elevated animate-fade-in-up">
          {lesson.media
            .filter((m) => m.type === "link")
            .map((m) => (
              <a
                key={m.id}
                href={m.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-primary hover:underline text-sm"
              >
                🔗 {m.title ?? "رابط تعليمي"}
              </a>
            ))}
        </div>
      )}
    </div>
  );
}
