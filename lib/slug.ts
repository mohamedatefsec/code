import { db } from "@/lib/db";

/**
 * يحوّل اسم عربي أو إنجليزي إلى slug صالح (حروف إنجليزية صغيرة، أرقام، شرطات).
 * لو الاسم عربي بالكامل (مفيش حروف إنجليزية/أرقام نافعة) بيرجع "subject" كقاعدة
 * وبعدين بيتضاف رقم تلقائي عشان يضمن التفرد.
 */
function baseSlugify(input: string): string {
  const slug = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "subject";
}

/**
 * يولّد slug فريد لمادة جديدة اعتمادًا على اسمها، مع التأكد من عدم تكراره
 * في جدول subjects (لأن العمود @unique في الـ Prisma schema).
 */
export async function generateUniqueSubjectSlug(name: string): Promise<string> {
  const base = baseSlugify(name);
  let candidate = base;
  let counter = 1;

  while (await db.subject.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    counter += 1;
    candidate = `${base}-${counter}`;
  }

  return candidate;
}
