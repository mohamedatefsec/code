import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { toEmbedUrl } from "@/lib/media";
import { PdfViewer } from "@/components/PdfViewer";
import { requireActiveUser } from "@/lib/auth";
import { awardBadge } from "@/lib/badges";
import { LessonHeader } from "@/components/LessonHeader";
import { isNewLesson } from "@/lib/lesson-badge";
import { safeHttpUrl } from "@/lib/safe-url";
import { getStudentSubscriptionStatus } from "@/lib/subscription";
import { getContactWhatsappLink } from "@/lib/settings";
import { PaywallLock } from "@/components/PaywallLock";
import { UnpaidNotice } from "@/components/UnpaidNotice";

export default async function StudentLessonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await requireActiveUser("student");
  const profile = user ? await db.studentProfile.findUnique({ where: { userId: user.id } }) : null;

  let showUnpaidNotice = false;
  if (profile) {
    const subscription = await getStudentSubscriptionStatus(profile.id);
    if (!subscription.active) {
      const whatsappLink = await getContactWhatsappLink();
      return (
        <div className="max-w-2xl space-y-6">
          <Link href="/lessons" className="text-sm text-ink-soft hover:text-ink inline-block">
            ← رجوع للدروس
          </Link>
          <PaywallLock paidUntil={subscription.paidUntil} whatsappLink={whatsappLink} />
        </div>
      );
    }
    showUnpaidNotice = subscription.unpaidNotice;
  }

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
  if (profile) {
    try {
      await awardBadge(profile.id, "first_lesson");
    } catch {
      // تجاهل بهدوء
    }
  }

  const paragraphs = (lesson.content ?? "").split(/\n{2,}/).filter(Boolean);
  const fresh = isNewLesson(lesson.createdAt);
  const videoCount = lesson.media.filter((m) => m.type === "video").length;
  const pdfCount = lesson.media.filter((m) => m.type === "pdf").length;
  // وقت القراءة التقريبي (حوالي 180 كلمة/دقيقة بالعربي) - بيظهر بس لو النص
  // طويل كفاية، عشان ما نكتبش "دقيقة" على فقرة من سطرين.
  const wordCount = (lesson.content ?? "").trim().split(/\s+/).filter(Boolean).length;
  const readMinutes = wordCount >= 60 ? Math.max(1, Math.round(wordCount / 180)) : 0;

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/lessons" className="text-sm text-ink-soft hover:text-ink inline-block">
        ← رجوع للدروس
      </Link>

      {showUnpaidNotice && <UnpaidNotice />}

      <LessonHeader
        subject={lesson.unit.subject}
        unitTitle={lesson.unit.title}
        title={lesson.title}
        description={lesson.description}
        isNew={fresh}
        videoCount={videoCount}
        pdfCount={pdfCount}
        readMinutes={readMinutes}
      />

      {lesson.media
        .filter((m) => m.type === "video")
        .map((m) => {
          const embedUrl = toEmbedUrl(m.url);
          return (
            <div key={m.id} className="rounded-xl overflow-hidden border border-border aspect-video bg-ink">
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
                  href={safeHttpUrl(m.url) ?? "#"}
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
        <div className="rounded-xl border border-border bg-surface p-6 space-y-4 leading-7 text-ink shadow-elevated">
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
                className="rounded-xl border border-border w-full"
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
        <div className="rounded-xl border border-border bg-surface p-4 space-y-2 shadow-elevated">
          {lesson.media
            .filter((m) => m.type === "link" && safeHttpUrl(m.url))
            .map((m) => (
              <a
                key={m.id}
                href={safeHttpUrl(m.url)!}
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
