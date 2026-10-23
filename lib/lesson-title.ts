/// بيفصل رقم الدرس لو العنوان بادئ برقم زي "3- الاستجابة..." أو "٣. ..."
/// فيظهر الرقم في شارة مستقلة والعنوان نظيف. لو مفيش رقم بيرجّع number = null
/// والعنوان كما هو. (regex من غير flag s عشان target بتاع المشروع ES2017.)
export function splitLessonNumber(title: string): { number: string | null; text: string } {
  const match = title.match(/^\s*([0-9\u0660-\u0669]{1,3})\s*[-\u2013\u2014.:)\u060C]\s*([\s\S]+)$/);
  if (!match || !match[2].trim()) return { number: null, text: title.trim() };
  return { number: match[1], text: match[2].trim() };
}
