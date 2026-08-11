import { TABLES } from "@/lib/config";
import { MainDashboardClient } from "@/components/dashboards/MainDashboardClient";
import { isCommittedBill, isUnpaidBill } from "@/lib/bill-status";
import { WithdrawDashboardClient, type WithdrawFilters } from "@/components/dashboards/WithdrawDashboardClient";
import { WorkStatusDashboardClient } from "@/components/dashboards/WorkStatusDashboardClient";
import { BillFollowDashboardClient } from "@/components/dashboards/BillFollowDashboardClient";
import { money, toNumber } from "@/lib/numbers";
import { getRows } from "@/lib/sheets";
import { cookies } from "next/headers";
import type { SheetRow } from "@/lib/types";

export async function MainDashboard() {
  const [dataRows, projectRows] = await Promise.all([safeRows(TABLES.DATA), safeRows(TABLES.PROJECT)]);
  return <MainDashboardClient initialDataRows={dataRows.filter(isCommittedBill)} initialProjectRows={projectRows} />;
}

export async function WithdrawDashboard({ filters = {} }: { filters?: WithdrawFilters }) {
  const [dataRows, peopleRows] = await Promise.all([safeRows(TABLES.DATA), safeRows(TABLES.PEOPLE)]);
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get("auth_role")?.value === "Admin";
  
  const rows = hydrateDataRows(dataRows).filter(row => {
    if (!isUnpaidBill(row)) return false;
    return hasValue(row["ลำดับ"]) || hasValue(row["ID Project"]) || hasValue(row["ร้าน/บุคคล"]) || hasValue(row["สินค้า/ทำงาน"]);
  });
  return <WithdrawDashboardClient rows={rows} peopleRows={peopleRows} initialFilters={filters} isAdmin={isAdmin} />;
}

export async function BillFollowDashboard() {
  const [dataRows, peopleRows] = await Promise.all([safeRows(TABLES.DATA), safeRows(TABLES.PEOPLE)]);
  const rawRows = hydrateDataRows(dataRows).filter(isCommittedBill);
  const requesterNames = requesterNameMap(peopleRows);
  
  // Sort rows latest first
  const rows = [...rawRows].sort((left, right) => {
    const leftSeq = Number(left["ลำดับ"] || left._sheetRow || 0);
    const rightSeq = Number(right["ลำดับ"] || right._sheetRow || 0);
    return rightSeq - leftSeq;
  });

  const vatRows = rows.filter(row => hasValue(row.vat) && !hasValue(row["วันได้บิล"]));
  const naturalDeductRows = rows.filter(row =>
    hasValue(row["หัก"]) &&
    !hasValue(row["วันออก 3%"]) &&
    !isCompanyLaborStatus(row["statusค่าแรง"])
  );
  const companyDeductRows = rows.filter(row =>
    hasValue(row["หัก"]) &&
    !hasValue(row["วันออก 3%"]) &&
    isCompanyLaborStatus(row["statusค่าแรง"])
  );
  const creditRows = rows.filter(row => hasValue(row["เครดิต"]) && !hasValue(row["วันจ่าย"]));

  return (
    <BillFollowDashboardClient
      vatRows={vatRows}
      naturalDeductRows={naturalDeductRows}
      companyDeductRows={companyDeductRows}
      creditRows={creditRows}
      requesterNames={requesterNames}
      peopleRows={peopleRows}
    />
  );
}

export async function WorkStatusDashboard() {
  const [projectRows, dataRows] = await Promise.all([safeRows(TABLES.PROJECT), safeRows(TABLES.DATA)]);
  const hydratedDataRows = hydrateDataRows(dataRows);

  const rawRows: SheetRow[] = projectRows.map((row) => {
    const projectId = String(row["ID Project"] || row.id || "").trim();
    const relatedBills = hydratedDataRows.filter(
      (b) => String(b["ID Project"] || "").trim() === projectId && isCommittedBill(b)
    );
    const billTotal = sumColumns(relatedBills, ["ยอดเงิน"]);
    const totalAll = hasValue(row["รวม ALL"]) ? toNumber(row["รวม ALL"]) : billTotal;
    const workTotal = toNumber(row["ยอดงาน"]);
    const vatTotal = hasValue(row["ยอดรวม vat"]) ? toNumber(row["ยอดรวม vat"]) : workTotal * 1.07;

    return {
      ...row,
      "รวม ALL": totalAll,
      "ยอดรวม vat": vatTotal,
    };
  });

  // Sort projects by ID or sheet sequence
  const rows = [...rawRows].sort((left, right) => {
    const leftId = Number(String(left["ID Project"] || "").replace(/\D/g, "") || left._sheetRow || 0);
    const rightId = Number(String(right["ID Project"] || "").replace(/\D/g, "") || right._sheetRow || 0);
    return rightId - leftId;
  });

  return <WorkStatusDashboardClient projects={rows} />;
}

function AmountPanel({ title, value, className = "" }: { title: string; value: number; className?: string }) {
  return (
    <div className={`bg-white rounded-lg p-5 border border-slate-200/90 shadow-2xs space-y-3 ${className}`}>
      <header className="flex items-center justify-between text-xs font-extrabold text-slate-400 uppercase tracking-wider">
        <h3>{title}</h3>
        <small className="text-slate-400 font-normal">บาท</small>
      </header>
      <div className="bg-slate-50 p-4 rounded-xl flex flex-col gap-1">
        <span className="text-xs text-slate-500 font-semibold">{title}</span>
        <strong className="text-xl font-extrabold text-slate-900">{money(value)}</strong>
      </div>
    </div>
  );
}

function FollowPanel({ title, count, requesterNames, rows }: { title: string; count: number; requesterNames: Record<string, string>; rows: SheetRow[] }) {
  const visibleRows = rows.slice(0, 80);
  const amountTotal = rows.reduce((sum, row) => sum + toNumber(row["ยอดเงิน"]), 0);
  const rowCountText = rows.length > visibleRows.length ? `${visibleRows.length} / ${rows.length}` : String(visibleRows.length);

  return (
    <div className="bg-white rounded-lg border border-slate-200/90 shadow-2xs overflow-hidden">
      <header className="p-4 bg-slate-50/80 border-b border-slate-200/90 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-extrabold text-slate-800">{title}</h3>
        <div className="flex items-center gap-3 text-xs">
          <span className="font-bold text-slate-500">{rowCountText} รายการ</span>
          <strong className="font-extrabold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200">{money(amountTotal)}</strong>
        </div>
      </header>
      {visibleRows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead>
              <tr className="bg-slate-100/90 text-slate-600 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                <th className="py-3 px-3">ลำดับ</th>
                <th className="py-3 px-3">ร้าน/บุคคล</th>
                <th className="py-3 px-3">Project</th>
                <th className="py-3 px-3">รายการ</th>
                <th className="py-3 px-3">วันที่</th>
                <th className="py-3 px-3">ผู้เบิก</th>
                <th className="py-3 px-3 text-right">ยอดเงิน</th>
                <th className="py-3 px-3">เงื่อนไข</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleRows.map((row, index) => (
                <tr key={String(row._sheetRow || row["ลำดับ"] || index)} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3 text-slate-500">{formatCell(row["ลำดับ"]) || "-"}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-900">{formatCell(row["ร้าน/บุคคล"]) || "-"}</td>
                  <td className="py-2.5 px-3 text-slate-600">{formatCell(row["ชื่อ Project"]) || "-"}</td>
                  <td className="py-2.5 px-3 text-slate-600 max-w-[200px] truncate">{formatCell(row["สินค้า/ทำงาน"] || row["รายการ"]) || "-"}</td>
                  <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{formatCell(row["ว/ด/ป"]) || "-"}</td>
                  <td className="py-2.5 px-3 text-slate-600">{requesterName(row["ผู้เบิก"], requesterNames) || "-"}</td>
                  <td className="py-2.5 px-3 text-right font-extrabold text-slate-900">{money(row["ยอดเงิน"])}</td>
                  <td className="py-2.5 px-3">
                    <div className="flex flex-wrap gap-1 text-[10px] font-bold">
                      <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">vat {formatCell(row.vat) || "-"}</span>
                      <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">หัก {formatCell(row["หัก"]) || "-"}</span>
                      {hasValue(row["เครดิต"]) ? <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">เครดิต {formatCell(row["เครดิต"])}</span> : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-8 text-center text-slate-400 text-xs font-medium">ไม่พบข้อมูล</div>
      )}
    </div>
  );
}

function requesterNameMap(peopleRows: SheetRow[]) {
  return peopleRows.reduce<Record<string, string>>((names, row) => {
    const key = String(row["รหัสพนักงาน"] || "").trim();
    const name = String(row["ชื่อเล่น"] || "").trim();
    if (key && name) names[key] = name;
    return names;
  }, {});
}

function requesterName(value: unknown, requesterNames: Record<string, string>) {
  const key = String(value || "").trim();
  return requesterNames[key] || key;
}

function isCompanyLaborStatus(value: unknown) {
  const text = String(value || "").trim();
  return text === "บริษัท";
}

function ProjectStatusPanel({
  title,
  count,
  rows,
  tone = "default"
}: {
  title: string;
  count: number;
  rows: SheetRow[];
  tone?: "default" | "green";
}) {
  return (
    <div className="bg-white rounded-lg border border-slate-200/90 shadow-2xs overflow-hidden">
      <header className="p-4 bg-slate-50/80 border-b border-slate-200/90 flex items-center justify-between">
        <h3 className="text-sm font-extrabold text-slate-800">{title}</h3>
        <strong className="text-xs font-extrabold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200">{count} รายการ</strong>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        {rows.slice(0, 60).map((row, index) => (
          <ProjectItemCard key={String(row["ID Project"] || row._sheetRow || index)} title={title} row={row} tone={tone} />
        ))}
        {!rows.length ? <div className="col-span-full p-8 text-center text-slate-400 text-xs font-medium">ไม่พบข้อมูล</div> : null}
      </div>
    </div>
  );
}

function ProjectItemCard({ title, row, tone }: { title: string; row: SheetRow; tone: "default" | "green" }) {
  const projectName = row["ชื่อ Project"];
  const date = row["วันที่"];
  const customer = row["ชื่อลูกค้า"];
  const company = row["บริษัท"];
  const owner = row["รับผิดชอบ"];
  const total = row["รวม ALL"] || row["ยอดงาน"];
  const totalVat = row["ยอดรวม vat"];
  const budget = row["งบไม่เกิน"];

  const colorMap: Record<string, string> = {
    red: "#dc2626",
    green: "#16853d",
    black: "#1e293b"
  };
  const rawColor = String(row.color || "").toLowerCase().trim();
  const headerBg = colorMap[rawColor] || (tone === "green" ? "#16853d" : "#334155");

  return (
    <article className="bg-white rounded-lg border border-slate-200/90 overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col">
      <div className="px-4 py-2.5 flex items-center justify-between text-xs font-extrabold text-white" style={{ backgroundColor: headerBg }}>
        <strong>{title}</strong>
        <span className="font-mono text-[11px] opacity-90">#{formatCell(row["ID Project"])}</span>
      </div>
      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between text-xs">
        <div>
          <div className="flex items-start justify-between gap-2">
            <strong className="font-extrabold text-slate-900 text-xs line-clamp-2">{formatCell(projectName) || "-"}</strong>
            <span className="text-[10px] font-semibold text-slate-400 shrink-0">{formatCell(date) || "-"}</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 space-y-0.5">
            <div>ลูกค้า: <span className="font-semibold text-slate-700">{formatCell(customer) || "-"}</span></div>
            <div>บริษัท: <span className="font-semibold text-slate-700">{formatCell(company) || "-"}</span></div>
            <div>ผู้รับผิดชอบ: <span className="font-semibold text-slate-700">{formatCell(owner) || "-"}</span></div>
          </div>
        </div>
        
        <div className="bg-slate-50 p-2.5 rounded-lg grid grid-cols-2 gap-2 text-[11px]">
          <div>
            <span className="text-slate-400 text-[10px]">ยอดรวม</span>
            <div className="font-extrabold text-slate-900">{money(total)}</div>
          </div>
          <div>
            <span className="text-slate-400 text-[10px]">ยอดรวม vat</span>
            <div className="font-extrabold text-slate-900">{money(totalVat)}</div>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100 text-slate-500">
          <span>งบไม่เกิน: <strong className="text-slate-800">{money(budget)}</strong></span>
          <span>รวม ALL: <strong className="text-indigo-600">{money(total)}</strong></span>
        </div>
      </div>
    </article>
  );
}

function SummaryTable({
  title,
  subtitle,
  header,
  rows
}: {
  title: string;
  subtitle: string;
  header: string[];
  rows: Array<Array<string | number>>;
}) {
  return (
    <div className="bg-white rounded-lg border border-slate-200/90 shadow-2xs overflow-hidden">
      <header className="p-4 bg-slate-50/80 border-b border-slate-200/90">
        <h3 className="text-sm font-extrabold text-slate-800">{title}</h3>
        <small className="text-slate-400 font-medium">{subtitle}</small>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700 border-collapse">
          <thead>
            <tr className="bg-slate-100/90 text-slate-600 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
              {header.map(column => <th key={column} className="py-2.5 px-3">{column}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, index) => (
              <tr key={`${title}-${index}`} className="hover:bg-slate-50/80 transition-colors">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className={`py-2 px-3 ${typeof cell === "number" ? "font-extrabold text-slate-900 text-right" : "font-medium"}`}>
                    {typeof cell === "number" ? money(cell) : cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function sumColumns(rows: SheetRow[], columns: string[]) {
  return rows.reduce((sum, row) => sum + columns.reduce((inner, column) => inner + toNumber(row[column]), 0), 0);
}

function hydrateDataRows(rows: SheetRow[]) {
  const amountColumns = ["ค่าของ", "ค่าแรง", "พนักงาน", "น้ำมัน", "ซ่อมรถ", "เครื่องจักร", "เครื่องมือ", "อื่นๆ"];
  return rows.map(row => {
    const output = { ...row };
    if (!hasValue(output["ยอดเงิน"])) output["ยอดเงิน"] = sumColumns([output], amountColumns);
    if (!hasValue(output["ยอดโอน"])) output["ยอดโอน"] = computeTransferAmount(output);
    if (!hasValue(output["ร้าน/บุคคล"])) output["ร้าน/บุคคล"] = firstValue(output, ["ร้านค้า", "ผู้รับเหมา", "ร้านค้า/ผู้รับเหมา"]);
    if (!hasValue(output["สินค้า/ทำงาน"])) output["สินค้า/ทำงาน"] = firstValue(output, ["สินค้า", "รายละเอียดงาน", "รายการ"]);
    return output;
  });
}

function computeTransferAmount(row: SheetRow) {
  const amount = toNumber(row["ยอดเงิน"]);
  const hasVat = hasValue(row.vat);
  const hasDeduct = hasValue(row["หัก"]);
  if (!hasVat && !hasDeduct) return amount;
  if (hasVat && hasDeduct) return amount * 104 / 107;
  if (hasVat) return amount;
  if (hasDeduct) return amount * computeDeductMultiplier(row);
  return 0;
}

function computeDeductMultiplier(row: SheetRow) {
  const deduct = String(row["หัก"] || "").trim();
  const status = String(row["statusค่าแรง"] || "").trim();
  const company = status === "บริษัท";
  if (deduct === "1") return company ? 1.06 : 0.99;
  if (deduct === "3") return company ? 1.04 : 0.97;
  if (deduct === "5") return company ? 1.02 : 0.95;
  if (deduct === "8") return company ? 0.99 : 0.92;
  return 1;
}

function hydrateProjectSummary(project: SheetRow, dataRows: SheetRow[]): SheetRow {
  const projectId = String(project["ID Project"] || "");
  const projectDataRows = dataRows.filter(row => String(row["ID Project"] || "") === projectId);
  const total = sumColumns(projectDataRows, ["ยอดเงิน"]);
  const totalAll = project["รวม ALL"] || total;
  const totalVat = project["ยอดรวม vat"] || toNumber(project["ยอดงาน"]) * 1.07;
  return {
    ...project,
    "รวม ALL": totalAll,
    "ยอดรวม vat": totalVat
  };
}

function firstValue(row: SheetRow, columns: string[]) {
  for (const column of columns) {
    if (hasValue(row[column])) return row[column];
  }
  return "";
}

function hasValue(value: unknown) {
  return value !== null && value !== undefined && value !== "";
}

function lower(value: unknown) {
  return String(value || "").toLowerCase();
}

function formatCell(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return money(value);
  return String(value);
}

async function safeRows(tableName: string): Promise<SheetRow[]> {
  try {
    return await getRows(tableName);
  } catch {
    return [];
  }
}
