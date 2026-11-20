"use client";

import { motion } from "framer-motion";

/// رحلة الطالب داخل المنصة: 4 خطوات حقيقية بالترتيب اللي الطالب بيمشي بيه فعلًا.
/// الخط اللي بيربطهم بيترسم مرة واحدة لما القسم يظهر، وكل خطوة بتنوّر وراه.

const STEPS = [
  {
    title: "ادرس الدرس",
    desc: "فيديو وشرح مكتوب وملفات، مقسّمة على وحدات.",
    icon: (
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19a1 1 0 0 1 1 1v15.5a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 1 4 18V5.5ZM4 18.5A2.5 2.5 0 0 1 6.5 16H20M8 7h8M8 10.2h8" />
    ),
  },
  {
    title: "راجع بنفسك",
    desc: "أسئلة مراجعة سريعة تعرف منها فهمت ولا لأ.",
    icon: <path d="M20 12a8 8 0 1 1-2.6-5.9M20 4.5v4h-4M9 12.2l2.1 2.1L15.2 10" />,
  },
  {
    title: "ادخل الاختبار",
    desc: "تصحيح فوري ونتيجة مفصّلة لكل سؤال.",
    icon: (
      <path d="M9 3.5h6a1 1 0 0 1 1 1v.5h1a1 1 0 0 1 1 1V19a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a1 1 0 0 1 1-1h1v-.5a1 1 0 0 1 1-1ZM9 12.5l2 2 4-4.5" />
    ),
  },
  {
    title: "اكسب شارة",
    desc: "كل إنجاز بيتسجّل وبيظهر في لوحة الصدارة.",
    icon: <path d="M12 3 14.2 8 20 8.8l-4.2 3.9 1.1 5.7L12 15.6 6.9 18.4 8 12.7 3.8 8.8 9.6 8 12 3Z" />,
  },
];

export function LearningJourney() {
  return (
    <div className="relative">
      {/* خط المسار - أفقي على الشاشات الكبيرة، بيتملي من اليمين للشمال (اتجاه القراءة) */}
      <div className="hidden lg:block absolute top-9 inset-x-[12.5%] h-[3px] rounded-full bg-border" aria-hidden="true">
        <motion.div
          className="h-full rounded-full bg-gradient-brand origin-right"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, margin: "-20% 0px" }}
          transition={{ duration: 1.6, ease: [0.65, 0, 0.35, 1] }}
        />
      </div>

      <ol className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {STEPS.map((step, i) => (
          <motion.li
            key={step.title}
            initial={{ opacity: 0, scale: 0.92 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-20% 0px" }}
            transition={{ duration: 0.45, delay: 0.25 + i * 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center text-center"
          >
            <span className="relative grid place-items-center w-[4.5rem] h-[4.5rem] rounded-full bg-surface border-2 border-primary/30 shadow-elevated text-primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
                {step.icon}
              </svg>
              <span className="absolute -top-1 -end-1 grid place-items-center w-7 h-7 rounded-full bg-gradient-brand text-white text-sm font-bold font-mono shadow-glow">
                {i + 1}
              </span>
            </span>
            <h3 className="mt-5 text-xl font-bold text-ink">{step.title}</h3>
            <p className="mt-2 text-base text-ink-soft leading-7 max-w-[16rem]">{step.desc}</p>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}
