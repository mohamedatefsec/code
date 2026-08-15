import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@codeai.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";

  const existing = await db.user.findUnique({
    where: { loginIdentifier: adminEmail },
  });

  if (existing) {
    console.log("حساب الأدمن موجود بالفعل، تم تخطي الإنشاء.");
  } else {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await db.user.create({
      data: {
        role: "admin",
        loginIdentifier: adminEmail,
        passwordHash,
        status: "active",
        adminProfile: {
          create: { fullName: "مدير المنصة" },
        },
      },
    });
    console.log(`تم إنشاء حساب أدمن: ${adminEmail} / ${adminPassword}`);
    console.log("⚠️  غيّر كلمة المرور فورًا بعد أول تسجيل دخول.");
  }

  const settingsExists = await db.settings.findFirst();
  if (!settingsExists) {
    await db.settings.create({
      data: {
        heroHeadline: "تعلم البرمجة والذكاء الاصطناعي",
        description:
          "منصة تعليمية بسيطة وسريعة لطلاب المرحلة الثانوية، بدروس وتدريبات واختبارات تفاعلية.",
        welcomeMessage: "مع نخبة من المدرّسين المتخصصين",
        heroBadges: ["شرح مبسط وممتع", "اختبارات تفاعلية", "متابعة شخصية"],
      },
    });
    console.log("تم إنشاء صف الإعدادات الافتراضي.");
  }

  const defaultSubjects = [
    { name: "البرمجة", slug: "programming", order: 1 },
    { name: "الذكاء الاصطناعي", slug: "ai", order: 2 },
  ];
  for (const subject of defaultSubjects) {
    await db.subject.upsert({
      where: { slug: subject.slug },
      update: {},
      create: subject,
    });
  }
  console.log("تم التأكد من وجود المادتين الافتراضيتين (البرمجة/الذكاء الاصطناعي).");

  const defaultBadges: {
    name: string;
    icon: string;
    description: string;
    criteriaKey: "first_quiz" | "five_quizzes_streak" | "perfect_score" | "excellent_attendance" | "first_lesson";
  }[] = [
    { name: "أول اختبار", icon: "🏆", description: "أدّيت أول اختبار لك على المنصة", criteriaKey: "first_quiz" },
    { name: "الطالب المتميز", icon: "⭐", description: "حصلت على الدرجة الكاملة في اختبار", criteriaKey: "perfect_score" },
    { name: "5 اختبارات", icon: "🔥", description: "أدّيت 5 اختبارات على الأقل", criteriaKey: "five_quizzes_streak" },
    { name: "مبرمج صغير", icon: "💻", description: "شاهدت أول درس لك على المنصة", criteriaKey: "first_lesson" },
    { name: "حضور ممتاز", icon: "📚", description: "نسبة حضورك 90% أو أكثر (بعد 5 حصص على الأقل)", criteriaKey: "excellent_attendance" },
  ];
  for (const badge of defaultBadges) {
    await db.badge.upsert({
      where: { criteriaKey: badge.criteriaKey },
      update: {},
      create: badge,
    });
  }
  console.log("تم التأكد من وجود الشارات الافتراضية.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
