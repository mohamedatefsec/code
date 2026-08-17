import { z } from "zod";

export const loginSchema = z.object({
  identifier: z.string().min(1, "أدخل اسم المستخدم أو كود الطالب"),
  password: z.string().min(1, "أدخل كلمة المرور"),
});

export const groupCreateSchema = z.object({
  name: z.string().min(1, "اسم المجموعة مطلوب").max(100),
  grade: z.string().max(50).optional().nullable(),
  description: z.string().max(300).optional().nullable(),
});

export const groupUpdateSchema = groupCreateSchema.partial();

const studentCodeRegex = /^[A-Za-z0-9_-]{3,30}$/;

export const studentCreateSchema = z.object({
  fullName: z.string().min(1, "الاسم مطلوب").max(150),
  studentCode: z
    .string()
    .regex(studentCodeRegex, "كود الطالب يجب أن يكون حروفًا/أرقامًا فقط (3-30 حرفًا)"),
  phone: z.string().max(30).optional().nullable(),
  grade: z.string().max(50).optional().nullable(),
  groupId: z.string().min(1).optional().nullable(),
  password: z.string().min(6, "كلمة المرور يجب ألا تقل عن 6 أحرف"),
});

export const studentUpdateSchema = z.object({
  fullName: z.string().min(1).max(150).optional(),
  studentCode: z.string().regex(studentCodeRegex).optional(),
  phone: z.string().max(30).optional().nullable(),
  grade: z.string().max(50).optional().nullable(),
  groupId: z.string().min(1).optional().nullable(),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(6, "كلمة المرور يجب ألا تقل عن 6 أحرف"),
});

export const subjectCreateSchema = z.object({
  name: z.string().min(1, "اسم المادة مطلوب").max(100),
  order: z.number().int().optional(),
});

export const unitCreateSchema = z.object({
  subjectId: z.string().min(1),
  title: z.string().min(1, "عنوان الوحدة مطلوب").max(150),
  description: z.string().max(500).optional().nullable(),
  order: z.number().int().optional(),
  status: z.enum(["draft", "published"]).optional(),
});

export const unitUpdateSchema = unitCreateSchema.omit({ subjectId: true }).partial();

export const lessonCreateSchema = z.object({
  unitId: z.string().min(1),
  title: z.string().min(1, "عنوان الدرس مطلوب").max(150),
  description: z.string().max(500).optional().nullable(),
  content: z.string().max(20000).optional().nullable(),
  order: z.number().int().optional(),
  status: z.enum(["draft", "published"]).optional(),
});

export const lessonUpdateSchema = lessonCreateSchema.omit({ unitId: true }).partial();

export const lessonMediaCreateSchema = z.object({
  type: z.enum(["video", "pdf", "image", "link"]),
  url: z.string().url("رابط غير صالح"),
  title: z.string().max(150).optional().nullable(),
  order: z.number().int().optional(),
});

// رابط صورة قد يكون رابطًا خارجيًا كاملًا (https://...) أو مسارًا محليًا
// نسبيًا لصورة مرفوعة عبر /api/upload (يبدأ بـ /uploads/...)
const imagePathSchema = z
  .string()
  .refine((v) => v === "" || v.startsWith("/uploads/") || /^https?:\/\//.test(v), {
    message: "رابط صورة غير صالح",
  })
  .nullable()
  .optional();

export const settingsUpdateSchema = z.object({
  platformName: z.string().min(1).max(100).optional(),
  logoUrl: imagePathSchema,
  faviconUrl: imagePathSchema,
  teacherName: z.string().max(100).nullable().optional(),
  teacherPhotoUrl: imagePathSchema,
  description: z.string().max(500).nullable().optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "لون غير صالح")
    .optional(),
  secondaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "لون غير صالح")
    .optional(),
  welcomeMessage: z.string().max(300).nullable().optional(),
  contactInfo: z
    .object({
      email: z.string().max(150).optional(),
      phone: z.string().max(50).optional(),
    })
    .nullable()
    .optional(),
  socialLinks: z
    .object({
      facebook: z.string().max(300).optional(),
      instagram: z.string().max(300).optional(),
      youtube: z.string().max(300).optional(),
      whatsapp: z.string().max(300).optional(),
    })
    .nullable()
    .optional(),
  footerText: z.string().max(300).nullable().optional(),
  heroHeadline: z.string().max(150).nullable().optional(),
  heroBadges: z.array(z.string().max(60)).max(3).nullable().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "أدخل كلمة المرور الحالية"),
  newPassword: z
    .string()
    .min(8, "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل"),
});

// ===== بنك الأسئلة =====

const questionOptionInputSchema = z.object({
  text: z.string().min(1, "نص الخيار مطلوب").max(500),
  isCorrect: z.boolean().default(false),
});

export const questionBaseSchema = z.object({
  subjectId: z.string().min(1, "اختر مادة"),
  unitId: z.string().min(1).optional().nullable(),
  lessonId: z.string().min(1).optional().nullable(),
  type: z.enum(["mcq", "true_false", "multiple_answer", "ordering", "code_output", "essay"]),
  text: z.string().min(1, "نص السؤال مطلوب").max(2000),
  codeSnippet: z.string().max(5000).optional().nullable(),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  points: z.number().int().min(1, "الدرجة يجب أن تكون 1 على الأقل").max(100).default(1),
  explanation: z.string().max(1000).optional().nullable(),
  status: z.enum(["draft", "published"]).optional(),
  // الحد الأدنى 2 يخص أنواع الاختيارات؛ السؤال المقالي بلا خيارات إطلاقًا
  // (0)، ويُتحقق من ذلك بدقة أكبر في validateQuestionBusinessRules أدناه.
  options: z.array(questionOptionInputSchema).max(10),
});

export type QuestionInput = z.infer<typeof questionBaseSchema>;

/**
 * قواعد عمل تختلف حسب نوع السؤال، لا يمكن التعبير عنها بـ Zod وحده:
 * - mcq: خيار صحيح واحد بالظبط
 * - true_false: خياران بالظبط، وواحد صحيح
 * - multiple_answer: إجابة صحيحة واحدة على الأقل
 * - ordering: كل الخيارات تُعتبر "صحيحة"، الترتيب المطلوب هو ترتيبها في المصفوفة
 * - code_output: خيار واحد بالظبط (الناتج المتوقع)
 * - essay: بلا خيارات إطلاقًا - تصحيح يدوي بالكامل
 */
export function validateQuestionBusinessRules(data: QuestionInput): string | null {
  const correctCount = data.options.filter((o) => o.isCorrect).length;

  switch (data.type) {
    case "mcq":
      if (data.options.length < 2) return "أضف خيارين على الأقل.";
      if (correctCount !== 1) return "سؤال الاختيار من متعدد يحتاج إجابة صحيحة واحدة بالظبط.";
      return null;
    case "true_false":
      if (data.options.length !== 2) return "سؤال صح/خطأ يحتاج خيارين بالظبط.";
      if (correctCount !== 1) return "سؤال صح/خطأ يحتاج إجابة صحيحة واحدة بالظبط.";
      return null;
    case "multiple_answer":
      if (data.options.length < 2) return "أضف خيارين على الأقل.";
      if (correctCount < 1) return "اختر إجابة صحيحة واحدة على الأقل.";
      return null;
    case "ordering":
      if (data.options.length < 2) return "أضف عنصرين على الأقل للترتيب.";
      return null;
    case "code_output":
      if (data.options.length !== 1) return "سؤال توقع الناتج يحتاج ناتجًا متوقعًا واحدًا فقط.";
      return null;
    case "essay":
      if (data.options.length !== 0) return "السؤال المقالي لا يحتاج أي خيارات.";
      return null;
    default:
      return null;
  }
}

// ===== الاختبارات (Quizzes) =====

export const quizCreateSchema = z.object({
  subjectId: z.string().min(1, "اختر مادة"),
  unitId: z.string().min(1).optional().nullable(),
  lessonId: z.string().min(1).optional().nullable(),
  title: z.string().min(1, "عنوان الاختبار مطلوب").max(150),
  durationMinutes: z.number().int().min(1, "المدة يجب أن تكون دقيقة واحدة على الأقل").max(600),
  startAt: z.string().datetime().optional().nullable(),
  endAt: z.string().datetime().optional().nullable(),
  maxAttempts: z.number().int().min(1).max(20).default(1),
});

export const quizUpdateSchema = quizCreateSchema.partial().extend({
  status: z.enum(["draft", "published", "closed"]).optional(),
});

export const quizQuestionsUpdateSchema = z.object({
  questionIds: z.array(z.string().min(1)).max(200),
});

export const quizTargetsUpdateSchema = z.object({
  mode: z.enum(["all", "groups"]),
  groupIds: z.array(z.string().min(1)).max(50).default([]),
});

export const submitAttemptSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().min(1),
      selectedOptionIds: z.array(z.string()).optional().nullable(),
      textAnswer: z.string().max(2000).optional().nullable(),
    })
  ),
});

// ===== الحضور والغياب =====

export const attendanceSessionCreateSchema = z.object({
  groupId: z.string().min(1, "اختر مجموعة"),
  sessionDate: z.string().min(1, "اختر تاريخ"), // "YYYY-MM-DD"
  sessionLabel: z.string().max(80).optional().nullable(),
});

export const attendanceRecordsUpdateSchema = z.object({
  records: z
    .array(
      z.object({
        studentId: z.string().min(1),
        status: z.enum(["present", "absent", "late"]),
      })
    )
    .max(500),
});

// ===== الإشعارات =====

export const notificationCreateSchema = z
  .object({
    title: z.string().min(1, "عنوان الإشعار مطلوب").max(150),
    body: z.string().min(1, "نص الإشعار مطلوب").max(1000),
    targetType: z.enum(["all", "group", "student"]),
    targetGroupId: z.string().min(1).optional().nullable(),
    targetStudentId: z.string().min(1).optional().nullable(),
  })
  .refine((d) => d.targetType !== "group" || !!d.targetGroupId, {
    message: "اختر المجموعة المستهدفة",
    path: ["targetGroupId"],
  })
  .refine((d) => d.targetType !== "student" || !!d.targetStudentId, {
    message: "اختر الطالب المستهدف",
    path: ["targetStudentId"],
  });

// ===== توليد الأسئلة بالذكاء الاصطناعي =====

export const aiGenerateQuestionsSchema = z.object({
  subjectId: z.string().min(1, "اختر مادة"),
  unitId: z.string().min(1).optional().nullable(),
  topic: z.string().min(3, "اكتب موضوعًا واضحًا").max(300),
  count: z.number().int().min(1).max(15),
  types: z
    .array(z.enum(["mcq", "true_false", "multiple_answer", "ordering", "code_output", "essay"]))
    .min(1, "اختر نوع سؤال واحد على الأقل"),
  difficulty: z.enum(["easy", "medium", "hard", "mixed"]),
});

// ===== التصحيح اليدوي (الأسئلة المقالية) =====

export const gradeEssaysSchema = z.object({
  grades: z
    .array(
      z.object({
        questionId: z.string().min(1),
        pointsEarned: z.number().int().min(0),
      })
    )
    .min(1),
});
