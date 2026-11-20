import { notFound, redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/auth";
import { buildParentReport, PERIOD_LABELS, type ReportPeriodKey } from "@/lib/parent-report";
import { ParentReportView } from "@/components/ParentReportView";

/// تقرير ولي الأمر - للأدمن بس. خارج تخطيط /admin عشان يطلع نظيف في الطباعة
/// (نفس فكرة صفحة طباعة الاختبار)، وبنعمل فحص الصلاحية هنا يدويًا.
export default async function ParentReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const user = await requireActiveUser("admin");
  if (!user) redirect("/login");

  const { id } = await params;
  const { period } = await searchParams;
  const key: ReportPeriodKey = period && period in PERIOD_LABELS ? (period as ReportPeriodKey) : "month";

  const report = await buildParentReport(id, key);
  if (!report) notFound();

  return <ParentReportView report={report} />;
}
