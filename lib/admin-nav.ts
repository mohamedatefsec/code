import type { AdminIconKey } from "@/components/AdminIcons";

export type AdminNavItem = {
  href: string;
  label: string;
  /// وصف قصير يظهر في شبكة لوحة التحكم (بطاقات الوصول السريع) فقط.
  description: string;
  icon: AdminIconKey;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: "/admin/dashboard", label: "لوحة التحكم", description: "نظرة عامة وإحصائيات المنصة", icon: "dashboard" },
  { href: "/admin/students", label: "الطلاب", description: "إدارة حسابات وبيانات الطلاب", icon: "students" },
  { href: "/admin/groups", label: "المجموعات", description: "تنظيم الطلاب في مجموعات دراسية", icon: "groups" },
  { href: "/admin/attendance", label: "الحضور والغياب", description: "تسجيل ومتابعة حصص الحضور", icon: "attendance" },
  { href: "/admin/content", label: "المحتوى التعليمي", description: "الوحدات والدروس والفيديوهات", icon: "content" },
  { href: "/admin/question-bank", label: "بنك الأسئلة", description: "إدارة أسئلة الاختبارات", icon: "question-bank" },
  { href: "/admin/ai-generator", label: "توليد بالذكاء الاصطناعي", description: "توليد أسئلة ومحتوى تلقائيًا", icon: "ai-generator" },
  { href: "/admin/quizzes", label: "الاختبارات", description: "إنشاء ومتابعة الاختبارات", icon: "quizzes" },
  { href: "/admin/grading", label: "التصحيح اليدوي", description: "تصحيح الأسئلة المقالية", icon: "grading" },
  { href: "/admin/notifications", label: "الإشعارات", description: "إرسال إشعارات للطلاب", icon: "notifications" },
  { href: "/admin/badges", label: "الشارات", description: "إدارة شارات التحفيز والإنجاز", icon: "badges" },
  { href: "/admin/settings", label: "الإعدادات", description: "إعدادات المنصة العامة", icon: "settings" },
];
