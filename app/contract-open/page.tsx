import { ContractOpenDashboardClient } from "@/components/ContractOpenDashboardClient";
import { TABLES } from "@/lib/config";
import { getFormPayload } from "@/lib/form";
import { hydrateContractRows } from "@/lib/formulas";
import { getRows } from "@/lib/db";
import { getViewColumns } from "@/lib/views";

export const dynamic = "force-dynamic";

export default async function ContractOpenPage() {
  const [rawRows, projectRows, contractorRows, dataRows] = await Promise.all([
    safeRows(TABLES.CONTRACT_WORK),
    safeRows(TABLES.PROJECT),
    safeRows(TABLES.CONTRACTOR),
    safeRows(TABLES.DATA),
  ]);

  const preloadedRows = {
    [TABLES.PROJECT]: projectRows,
    [TABLES.CONTRACTOR]: contractorRows,
    [TABLES.DATA]: dataRows,
  };

  const [hydratedRows, form] = await Promise.all([
    hydrateContractRows(rawRows, { projects: projectRows, contractors: contractorRows, dataRows }),
    getFormPayload(TABLES.CONTRACT_WORK, preloadedRows).catch(() => null),
  ]);

  const fallback = hydratedRows[0] ? Object.keys(hydratedRows[0]).filter((column) => !column.startsWith("_")) : [];
  const columns = getViewColumns("เปิดจ้าง", fallback);

  return <ContractOpenDashboardClient columns={columns} initialRows={hydratedRows} form={form} />;
}

async function safeRows(tableName: string) {
  try {
    return await getRows(tableName);
  } catch {
    return [];
  }
}

