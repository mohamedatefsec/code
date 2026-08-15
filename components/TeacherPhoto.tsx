"use client";

import { useState } from "react";

export function TeacherPhoto({ src, alt }: { src: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <span className="text-6xl">💻</span>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- رابط صورة محلي/خارجي ديناميكي من الإعدادات
    <img
      src={src}
      alt={alt}
      className="w-full h-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}
