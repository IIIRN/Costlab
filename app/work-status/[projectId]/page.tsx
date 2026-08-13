import { ProjectDetailClient } from "@/components/dashboards/ProjectDetailClient";
import { isCommittedBill } from "@/lib/bill-status";
import { TABLES } from "@/lib/config";
import { toNumber } from "@/lib/numbers";
import { getRows } from "@/lib/db";
import { hydrateProjectSummary, rowsForProject, valueOf } from "@/lib/project-summary";
import type { SheetRow } from "@/lib/types";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type ProjectDetailPageProps = {
  params: Promise<{ projectId: string }>;
};

const DETAIL_FIELDS = [
  "ID Project",
  "ชื่อ Project",
  "ชื่อลูกค้า",
  "สถานที่",
  "บริษัท",
  "รับผิดชอบ",
  "วันที่",
  "color",
  "คุมงบประเภทงาน",
  "ยอดงาน",
  "ยอดรวม vat",
  "งบไม่เกิน",
  "รวม ALL"
];

const RELATED_COLUMNS = [
  "ลำดับ",
  "ว/ด/ป",
  "ร้าน/บุคคล",
  "สินค้า/ทำงาน",
  "บิล",
  "ประเภท",
  "ยอดเงิน",
  "ยอดโอน",
  "ผู้เบิก",
  "สถานะ"
];

const EXPENSE_CATEGORIES = [
  "ค่าของ",
  "ค่าแรง",
  "พนักงาน",
  "น้ำมัน",
  "ซ่อมรถ",
  "เครื่องจักร",
  "เครื่องมือ",
  "อื่นๆ"
];

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { projectId } = await params;
  const decodedProjectId = decodeURIComponent(projectId);

  const [projectRows, dataRows, customerRows, companyRows] = await Promise.all([
    getRows(TABLES.PROJECT).catch(() => []),
    getRows(TABLES.DATA).catch(() => []),
    getRows(TABLES.CUSTOMER).catch(() => []),
    getRows(TABLES.COMPANY).catch(() => []),
  ]);

  const project = projectRows.find((row) => String(row["ID Project"] || "").trim() === decodedProjectId.trim());
  if (!project) notFound();

  const relatedRows = rowsForProject(dataRows, project["ID Project"]);
  const summaryRows = relatedRows.filter(isCommittedBill);
  const { project: hydratedProject, totals } = hydrateProjectSummary(project, relatedRows);
  const expenseBreakdown = buildExpenseBreakdown(summaryRows);

  const projectName = displayValue(valueOf(hydratedProject, ["ชื่อ Project"])) || `Project ${decodedProjectId}`;

  // Build Customer Display - Name only
  const rawCusId = String(hydratedProject["ชื่อลูกค้า"] || hydratedProject["ลูกค้า"] || "").trim();
  const matchedCus = customerRows.find(
    (c) => String(c["id_cus"] || c["id"] || c["รหัสลูกค้า"] || "").trim().toLowerCase() === rawCusId.toLowerCase()
  );
  const cusName = matchedCus
    ? String(matchedCus["ชื่อลูกค้า"] || matchedCus["ชื่อบริษัท"] || matchedCus["ชื่อ-นามสกุล"] || "").trim()
    : "";
  const customerDisplay = cusName || rawCusId || "-";

  // Build Company Display - Name only
  const rawCompId = String(hydratedProject["บริษัท"] || hydratedProject["บริษัทรับงาน"] || "").trim();
  const matchedComp = companyRows.find(
    (c) => String(c["id_Company"] || c["id"] || c["รหัสบริษัท"] || "").trim().toLowerCase() === rawCompId.toLowerCase()
  );
  const compName = matchedComp
    ? String(matchedComp["ชื่อบริษัท"] || matchedComp["ชื่อย่อ"] || "").trim()
    : "";
  const companyDisplay = compName || rawCompId || "-";

  return (
    <ProjectDetailClient
      projectId={decodedProjectId}
      projectName={projectName}
      hydratedProject={hydratedProject}
      customerDisplay={customerDisplay}
      companyDisplay={companyDisplay}
      totals={totals}
      summaryRows={summaryRows}
      expenseBreakdown={expenseBreakdown}
      detailFields={DETAIL_FIELDS}
      relatedColumns={RELATED_COLUMNS}
      expenseCategories={EXPENSE_CATEGORIES}
    />
  );
}

function buildExpenseBreakdown(summaryRows: SheetRow[]) {
  const breakdown: Record<string, number> = {};
  for (const cat of EXPENSE_CATEGORIES) {
    breakdown[cat] = summaryRows.reduce((sum, row) => sum + toNumber(row[cat]), 0);
  }
  return breakdown;
}

function displayValue(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value);
}
