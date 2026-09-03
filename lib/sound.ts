/// صوت تحفيزي قصير عند إنجاز (شارة جديدة) - بيتولّد لحظيًا بالمتصفح
/// (Web Audio API) بدل ملف MP3 خارجي، عشان يشتغل فورًا من غير تحميل أصول
/// إضافية ومن غير أي قيود ترخيص على مقطع صوتي جاهز. عبارة عن نغمتين
/// صاعدتين قصيرتين (chime) بإحساس "إنجاز" لطيف مش مزعج.
export function playAchievementChime() {
  if (typeof window === "undefined") return;
  const AudioContextClass =
    window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;

  try {
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // نغمتان متتاليتان (دو -> صول تقريبًا) بإحساس "تم الإنجاز" مألوف.
    const notes: { freq: number; start: number; duration: number }[] = [
      { freq: 587.33, start: 0, duration: 0.16 }, // D5
      { freq: 880, start: 0.11, duration: 0.28 }, // A5
    ];

    notes.forEach(({ freq, start, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);

      const t0 = now + start;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.22, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

      osc.start(t0);
      osc.stop(t0 + duration + 0.02);
    });

    // يقفل الـ AudioContext بعد ما ينتهي الصوت عشان مايفضلش فاتح في الخلفية.
    setTimeout(() => ctx.close().catch(() => {}), 700);
  } catch {
    // لو المتصفح رفض تشغيل صوت من غير تفاعل مستخدم مباشر، نتجاهل بهدوء.
  }
}
