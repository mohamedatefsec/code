/// أنواع وثوابت أسئلة المراجعة المشتركة بين السيرفر والواجهة (Client Components).
/// ملف بلا أي imports عمدًا، عشان استيراده من الواجهة ما يسحبش zod أو Prisma
/// داخل حزمة المتصفح.

export const REVIEW_QUESTION_TYPES = ["mcq", "true_false", "multiple_answer", "code_output", "essay"] as const;
export type ReviewQuestionType = (typeof REVIEW_QUESTION_TYPES)[number];

export const REVIEW_TYPE_LABELS: Record<ReviewQuestionType, string> = {
  mcq: "اختيار من متعدد",
  true_false: "صح / خطأ",
  multiple_answer: "اختيارات متعددة صحيحة",
  code_output: "توقع ناتج الكود",
  essay: "سؤال مقالي (مراجعة يدوية)",
};

/// نتيجة إجابة الطالب - بتتبعت للواجهة بعد الإجابة فقط (السيرفر لا يُرسل
/// الإجابات الصحيحة ولا الشرح لأي سؤال لسه ما اتحلّش).
export type ReviewCardAnswer = {
  selectedOptionIds: string[];
  textAnswer: string | null;
  /// null = سؤال مقالي بانتظار مراجعة المدرّس
  isCorrect: boolean | null;
  /// الخيارات الصحيحة (mcq / true_false / multiple_answer)
  correctOptionIds: string[];
  /// الناتج المتوقع (code_output فقط)
  expectedOutput: string | null;
  explanation: string | null;
};

/// بيانات بطاقة السؤال كما تصل لمتصفح الطالب. لاحظ: الخيارات بلا isCorrect،
/// وسؤال code_output بلا خيارات أصلًا (لأنها تحتوي الناتج المتوقع)، والشرح
/// والإجابات الصحيحة داخل `answer` فقط، فتكون null لحد ما الطالب يجاوب.
export type ReviewCardData = {
  id: string;
  type: ReviewQuestionType;
  text: string;
  codeSnippet: string | null;
  subjectName: string | null;
  options: { id: string; text: string }[];
  answer: ReviewCardAnswer | null;
};
