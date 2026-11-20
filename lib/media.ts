/// كود فيديو يوتيوب دايمًا 11 حرف/رقم (مع - و _)
const YT_ID = /^[A-Za-z0-9_-]{11}$/;

/// بيتأكد إن الدومين هو الموقع نفسه أو دومين فرعي منه (عشان "notyoutube.com" ماتتحسبش)
function isHost(hostname: string, domain: string) {
  const h = hostname.toLowerCase();
  return h === domain || h.endsWith(`.${domain}`);
}

/// بيحوّل وقت البداية من صيغ زي "90" أو "1m30s" أو "1h2m3s" لعدد ثواني
function parseStartSeconds(raw: string | null): number | null {
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return Number(raw);
  const m = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!m || (!m[1] && !m[2] && !m[3])) return null;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

/// بياخد أول 11 حرف لو هم كود فيديو صحيح - عشان لو اتلزق بعد الكود حاجة
/// زيادة (زي "ID?si=..." مكتوبة غلط، أو "ID&feature=share") مايبوّظش الرابط.
function leadingYtId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.match(/^[A-Za-z0-9_-]{11}/);
  return m ? m[0] : null;
}

function youtubeId(u: URL): string | null {
  const host = u.hostname.toLowerCase();
  const parts = u.pathname.split("/").filter(Boolean);

  if (isHost(host, "youtu.be")) return leadingYtId(parts[0]);

  if (isHost(host, "youtube.com") || isHost(host, "youtube-nocookie.com")) {
    const v = u.searchParams.get("v");
    if (v) return leadingYtId(v);
    // /embed/ID و /shorts/ID و /live/ID و /v/ID و /e/ID و /watch/ID
    if (parts.length >= 2 && ["embed", "shorts", "live", "v", "e", "watch"].includes(parts[0])) {
      return leadingYtId(parts[1]);
    }
    // روابط المشاركة القديمة: youtube.com/attribution_link?u=/watch?v=ID
    const inner = u.searchParams.get("u");
    if (inner) {
      const m = inner.match(/[?&]v=([A-Za-z0-9_-]{11})/);
      if (m) return m[1];
    }
  }
  return null;
}

/// بينضّف الرابط قبل ما نقراه:
/// - بيشيل الحروف المخفية اللي بتتلزق مع النسخ من نص عربي (علامات اتجاه
///   الكتابة RTL/LTR والمسافات الصفرية) - دي كانت بتخلّي رابط سليم شكلًا
///   "مش مفهوم" فيفتح برّه المنصة.
/// - لو مكتوب مع الرابط كلام زيادة (زي "شرح الدرس https://youtu.be/..."),
///   بياخد الرابط بس.
function cleanUrl(raw: string): string {
  const noHidden = raw.replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF\u00A0]/g, " ").trim();
  const found = noHidden.match(/https?:\/\/\S+/i);
  if (found) return found[0];
  return noHidden.split(/\s+/)[0] ?? "";
}

/** يحوّل رابط فيديو عادي لرابط embed يتعرض جوه المنصة نفسها (iframe).
 *  بيدعم:
 *  - يوتيوب: watch?v= و youtu.be و shorts و live و embed و m.youtube و music.youtube
 *    (ومعاهم وقت البداية لو الرابط فيه t= أو start=)
 *  - فيميو: vimeo.com/ID و vimeo.com/ID/HASH (الفيديوهات غير المدرجة) و player.vimeo.com
 *  - جوجل درايف: drive.google.com/file/d/ID/... و open?id=ID
 *  لو الرابط مش فيديو معروف بيرجّع null (وساعتها بيظهر زرار يفتحه برّه). */
export function toEmbedUrl(url: string): string | null {
  return toEmbed(url, true);
}

/// نفس toEmbedUrl لكن ليوتيوب وفيميو بس (من غير جوجل درايف) - بنستخدمه مع
/// الوسائط المحفوظة كـ "رابط": لو طلع رابط فيديو يوتيوب/فيميو بنعرضه كفيديو
/// جوه المنصة، أما روابط درايف فممكن تكون ملفات مش فيديو فبنسيبها لينك.
export function toVideoEmbedUrl(url: string): string | null {
  return toEmbed(url, false);
}

function toEmbed(url: string, allowDrive: boolean): string | null {
  let u: URL;
  try {
    const trimmed = cleanUrl(url);
    // لو الأدمن نسي https:// في أول الرابط
    u = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase();

  // ===== يوتيوب =====
  const yt = youtubeId(u);
  if (yt && YT_ID.test(yt)) {
    const start = parseStartSeconds(u.searchParams.get("t") ?? u.searchParams.get("start"));
    const params = new URLSearchParams({ rel: "0", modestbranding: "1", playsinline: "1" });
    if (start) params.set("start", String(start));
    return `https://www.youtube.com/embed/${yt}?${params.toString()}`;
  }

  // ===== فيميو =====
  if (isHost(host, "vimeo.com")) {
    const parts = u.pathname.split("/").filter(Boolean);
    if (host.startsWith("player.") && parts[0] === "video" && /^\d+$/.test(parts[1] ?? "")) {
      return `https://player.vimeo.com/video/${parts[1]}${u.search}`;
    }
    // أول رقم في المسار هو كود الفيديو (يغطي /ID و /channels/x/ID و /groups/x/videos/ID)
    const idIndex = parts.findIndex((p) => /^\d+$/.test(p));
    if (idIndex >= 0) {
      const id = parts[idIndex];
      // فيديو غير مدرج: vimeo.com/ID/HASH
      const hash = parts[idIndex + 1] && /^[a-f0-9]+$/i.test(parts[idIndex + 1]) ? parts[idIndex + 1] : u.searchParams.get("h");
      return `https://player.vimeo.com/video/${id}${hash ? `?h=${hash}` : ""}`;
    }
    return null;
  }

  // ===== جوجل درايف =====
  if (allowDrive && isHost(host, "drive.google.com")) {
    const m = u.pathname.match(/\/file\/d\/([A-Za-z0-9_-]+)/);
    const id = m?.[1] ?? u.searchParams.get("id");
    return id ? `https://drive.google.com/file/d/${id}/preview` : null;
  }

  return null;
}
