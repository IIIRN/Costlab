import { ContractOpenDashboardClient } from "@/components/ContractOpenDashboardClient";
import { TABLES } from "@/lib/config";
import { getFormPayload } from "@/lib/form";
import { hydrateContractRows } from "@/lib/formulas";
import { getRows } from "@/lib/sheets";
import { getViewColumns } from "@/lib/views";

export const dynamic = "force-dynamic";

export default async function ContractOpenPage() {
  const [rawRows, form] = await Promise.all([
    safeRows(TABLES.CONTRACT_WORK),
    getFormPayload(TABLES.CONTRACT_WORK).catch(() => null),
  ]);

  const hydratedRows = await hydrateContractRows(rawRows);
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
