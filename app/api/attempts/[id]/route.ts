import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (!session || session.role !== "student") {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 403 });
  }
  const { id } = await params;

  const student = await db.studentProfile.findUnique({ where: { userId: session.userId } });
  if (!student) {
    return NextResponse.json({ error: "الملف الشخصي غير موجود." }, { status: 404 });
  }

  const attempt = await db.quizAttempt.findUnique({
    where: { id },
    include: {
      quiz: {
        include: {
          questions: {
            orderBy: { order: "asc" },
            include: {
              question: {
                include: { options: { orderBy: { order: "asc" } } },
              },
            },
          },
        },
      },
    },
  });

  if (!attempt || attempt.studentId !== student.id) {
    return NextResponse.json({ error: "المحاولة غير موجودة." }, { status: 404 });
  }

  // لا نُرجع isCorrect أو النص الصحيح لسؤال code_output أثناء أداء الاختبار.
  // ولأسئلة الترتيب (ordering) بالذات: لازم نخلط ترتيب العرض، وإلا كان
  // ترتيب الخيارات كما يظهر للطالب هو نفسه الترتيب الصحيح (تسريب للإجابة).
  function shuffle<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  const sanitizedQuestions = attempt.quiz.questions.map((qq) => {
    const rawOptions =
      qq.question.type === "code_output"
        ? []
        : qq.question.options.map((o) => ({ id: o.id, text: o.text }));

    return {
      id: qq.question.id,
      type: qq.question.type,
      text: qq.question.text,
      codeSnippet: qq.question.codeSnippet,
      points: qq.pointsOverride ?? qq.question.points,
      options: qq.question.type === "ordering" ? shuffle(rawOptions) : rawOptions,
    };
  });

  // نحسب الوقت المتبقي على السيرفر (مش الاعتماد على ساعة جهاز الطالب)، لأن
  // ساعة الموبايل ممكن تكون مضبوطة غلط عند بعض الطلاب، فلو الحساب اعتمد على
  // "الآن" بتاع المتصفح ممكن يظهر الوقت خالص فورًا حتى لو المدرّس منحه وقت
  // إضافي فعليًا. القيمة دي بتُحسب مرة واحدة هنا وبعدين العميل بيعد تنازليًا
  // منها محليًا (setInterval) من غير ما يعيد حسابها من ساعته هو.
  const elapsedSeconds = Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000);
  const totalSeconds = attempt.quiz.durationMinutes * 60;
  const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);

  return NextResponse.json({
    attempt: {
      id: attempt.id,
      status: attempt.status,
      startedAt: attempt.startedAt,
      remainingSeconds,
      quiz: {
        id: attempt.quiz.id,
        title: attempt.quiz.title,
        durationMinutes: attempt.quiz.durationMinutes,
      },
      questions: sanitizedQuestions,
    },
  });
}
