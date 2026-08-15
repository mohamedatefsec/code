/** يحوّل رابط يوتيوب أو فيميو عادي (watch?v=, youtu.be, shorts, vimeo.com) لرابط embed قابل للعرض داخل iframe. */
export function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);

    if (u.hostname.includes("youtu.be") || u.hostname.includes("youtube.com")) {
      let videoId: string | null = null;
      if (u.hostname.includes("youtu.be")) {
        videoId = u.pathname.slice(1);
      } else if (u.pathname.startsWith("/shorts/")) {
        videoId = u.pathname.split("/")[2];
      } else {
        videoId = u.searchParams.get("v");
      }
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    if (u.hostname.includes("vimeo.com")) {
      const videoId = u.pathname.split("/").filter(Boolean)[0];
      return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
    }

    return null;
  } catch {
    return null;
  }
}
