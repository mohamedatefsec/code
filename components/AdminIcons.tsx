/// أيقونات خطية موحّدة لقسم الإدارة (تحلّ محل الإيموجي القديم في الشريط
/// الجانبي وشبكة لوحة التحكم)، بنفس أسلوب الرسم المستخدم في واجهة الطالب
/// (stroke خطي بعرض 1.8، بلا تعبئة) عشان تبقى هوية بصرية واحدة في الموقع كله.

type IconProps = { className?: string };

function base(className?: string) {
  return `w-5 h-5 ${className ?? ""}`;
}

export function DashboardIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} className={base(className)}>
      <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.6" stroke="currentColor" />
      <rect x="13" y="3.5" width="7.5" height="4.5" rx="1.6" stroke="currentColor" />
      <rect x="13" y="10.2" width="7.5" height="10.3" rx="1.6" stroke="currentColor" />
      <rect x="3.5" y="13.2" width="7.5" height="7.3" rx="1.6" stroke="currentColor" />
    </svg>
  );
}

export function StudentsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} className={base(className)}>
      <circle cx="9" cy="8" r="3.2" stroke="currentColor" />
      <path d="M3.5 20c0-3.3 2.5-5.8 5.5-5.8s5.5 2.5 5.5 5.8" stroke="currentColor" strokeLinecap="round" />
      <path d="M15.5 5.3c1.6.3 2.8 1.8 2.8 3.5s-1.2 3.2-2.8 3.5" stroke="currentColor" strokeLinecap="round" />
      <path d="M17 14.3c2.3.5 4 2.6 4 5.2" stroke="currentColor" strokeLinecap="round" />
    </svg>
  );
}

export function GroupsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} className={base(className)}>
      <circle cx="8" cy="9" r="3" stroke="currentColor" />
      <circle cx="16.5" cy="9.5" r="2.4" stroke="currentColor" />
      <path d="M2.8 20c0-3 2.3-5.3 5.2-5.3s5.2 2.3 5.2 5.3" stroke="currentColor" strokeLinecap="round" />
      <path d="M14 15.3c2.4.2 4.2 2.2 4.2 4.7" stroke="currentColor" strokeLinecap="round" />
    </svg>
  );
}

export function AttendanceIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} className={base(className)}>
      <path d="M4 9h16M7 3v3M17 3v3" stroke="currentColor" strokeLinecap="round" />
      <rect x="4" y="5.5" width="16" height="15" rx="2.5" stroke="currentColor" />
      <path d="m8.5 14 2.3 2.3L16 11.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ContentIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} className={base(className)}>
      <path
        d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19a1 1 0 0 1 1 1v15.5a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 1 4 18V5.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 7h8M8 10.2h8" stroke="currentColor" strokeLinecap="round" />
    </svg>
  );
}

export function QuestionBankIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} className={base(className)}>
      <rect x="3.5" y="4" width="17" height="16" rx="2.2" stroke="currentColor" />
      <path d="M9 9a3 3 0 1 1 4 2.8c-.9.4-1.5 1-1.5 2v.4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="11.5" cy="17" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function AiGeneratorIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.6} className={base(className)}>
      <path
        d="M12 3.5 13.6 8.4 18.5 10 13.6 11.6 12 16.5 10.4 11.6 5.5 10l4.9-1.6L12 3.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
      />
      <path d="M18.5 15.5 19.3 17.8 21.5 18.5 19.3 19.2 18.5 21.5 17.7 19.2 15.5 18.5 17.7 17.8 18.5 15.5Z" stroke="currentColor" strokeLinejoin="round" />
    </svg>
  );
}

export function QuizIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} className={base(className)}>
      <path
        d="M9 3.5h6a1 1 0 0 1 1 1v.5h1a1 1 0 0 1 1 1V19a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a1 1 0 0 1 1-1h1v-.5a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="m9 12.5 2 2 4-4.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function GradingIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} className={base(className)}>
      <path
        d="M15.2 4.3 19 8.1 8.4 18.7 4 20l1.3-4.4L15.2 4.3Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M13.3 6.2 17.1 10" stroke="currentColor" strokeLinecap="round" />
    </svg>
  );
}

export function NotificationsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} className={base(className)}>
      <path
        d="M6 10.5a6 6 0 1 1 12 0c0 3.4 1 5 1.6 5.8H4.4C5 15.5 6 13.9 6 10.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9.7 19.3a2.4 2.4 0 0 0 4.6 0" stroke="currentColor" strokeLinecap="round" />
    </svg>
  );
}

export function BadgesIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} className={base(className)}>
      <circle cx="12" cy="9" r="5.2" stroke="currentColor" />
      <path d="M12 6.3 13 8.4l2.3.3-1.7 1.6.4 2.3-2-1.1-2 1.1.4-2.3-1.7-1.6 2.3-.3L12 6.3Z" stroke="currentColor" strokeLinejoin="round" />
      <path d="m8.5 13.3-1.2 6.7 4.7-2.2 4.7 2.2-1.2-6.7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SettingsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} className={base(className)}>
      <circle cx="12" cy="12" r="3" stroke="currentColor" />
      <path
        d="M19.4 13.5c.1-.5.1-1 0-1.5l1.6-1.4-1.5-2.6-2 .6a7.4 7.4 0 0 0-1.3-.8l-.4-2.1H10.2l-.4 2.1c-.5.2-.9.5-1.3.8l-2-.6-1.5 2.6L6.6 12c-.1.5-.1 1 0 1.5L5 14.9l1.5 2.6 2-.6c.4.3.8.6 1.3.8l.4 2.1h3.6l.4-2.1c.5-.2.9-.5 1.3-.8l2 .6 1.5-2.6-1.6-1.4Z"
        stroke="currentColor"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export const AdminIcons = {
  dashboard: DashboardIcon,
  students: StudentsIcon,
  groups: GroupsIcon,
  attendance: AttendanceIcon,
  content: ContentIcon,
  "question-bank": QuestionBankIcon,
  "ai-generator": AiGeneratorIcon,
  quizzes: QuizIcon,
  grading: GradingIcon,
  notifications: NotificationsIcon,
  badges: BadgesIcon,
  settings: SettingsIcon,
} as const;

export type AdminIconKey = keyof typeof AdminIcons;
