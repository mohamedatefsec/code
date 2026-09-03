/// أدوات تحويل ألوان بسيطة (hex <-> HSL) عشان نضمن إن أي لون يختاره
/// الأدمن من الإعدادات يفضل واضح للقراءة في الوضع الداكن، حتى لو كان
/// لون غامق جدًا (زي أسود تقريبًا) أصلًا مناسب بس للوضع الفاتح.

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return [r, g, b];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    "#" +
    [clamp(r), clamp(g), clamp(b)].map((n) => n.toString(16).padStart(2, "0")).join("")
  );
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case rn:
      h = (gn - bn) / d + (gn < bn ? 6 : 0);
      break;
    case gn:
      h = (bn - rn) / d + 2;
      break;
    default:
      h = (rn - gn) / d + 4;
  }
  return [h * 60, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const v = l * 255;
    return [v, v, v];
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hn = h / 360;
  const r = hue2rgb(p, q, hn + 1 / 3);
  const g = hue2rgb(p, q, hn);
  const b = hue2rgb(p, q, hn - 1 / 3);
  return [r * 255, g * 255, b * 255];
}

/// بيرجّع نفس اللون لو أصلًا فاتح بما يكفي للوضع الداكن، أو نسخة أفتح
/// منه (بنفس اللون/التدرّج - Hue و Saturation - بس بإضاءة أعلى) لو كان
/// غامق جدًا وهيختفي على خلفية داكنة.
export function ensureReadableOnDark(hex: string, minLightness = 0.62): string {
  try {
    const [r, g, b] = hexToRgb(hex);
    const [h, s, l] = rgbToHsl(r, g, b);
    if (l >= minLightness) return hex;
    const [nr, ng, nb] = hslToRgb(h, Math.max(s, 0.35), minLightness);
    return rgbToHex(nr, ng, nb);
  } catch {
    return hex;
  }
}
