/// ظهور ناعم لمحتوى كل صفحة عند التنقل (شفافية فقط، من غير تحريك، عشان
/// النوافذ المنبثقة المثبّتة position:fixed جوه الصفحات تفضل في مكانها).
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
