import { toNumber } from "@/lib/numbers";
import { isCommittedBill } from "@/lib/bill-status";
import type { RowValue, SheetRow } from "@/lib/types";

const AMOUNT_COLUMNS = [
  "ค่าของ",
  "ค่าแรง",
  "พนักงาน",
  "น้ำมัน",
  "ซ่อมรถ",
  "เครื่องจักร",
  "เครื่องมือ",
  "อื่นๆ"
];

export function valueOf(row: SheetRow, columns: string[]) {
  for (const column of columns) {
    const value = row[column];
    if (hasValue(value)) return value;
  }
  return "";
}

export function hasValue(value: unknown) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

export function sumColumns(rows: SheetRow[], columns: string[]) {
  return rows.reduce((sum, row) => sum + columns.reduce((inner, column) => inner + toNumber(row[column]), 0), 0);
}

export function hydrateDataRows(rows: SheetRow[]) {
  return rows.map(row => {
    const output = { ...row };
    if (!hasValue(output["ยอดเงิน"])) output["ยอดเงิน"] = sumColumns([output], AMOUNT_COLUMNS);
    output["ยอดโอน"] = computeTransferAmount(output);
    if (!hasValue(output["ร้าน/บุคคล"])) output["ร้าน/บุคคล"] = valueOf(output, ["ร้านค้า", "ผู้รับเหมา", "ร้านค้า/ผู้รับเหมา"]);
    if (!hasValue(output["สินค้า/ทำงาน"])) output["สินค้า/ทำงาน"] = valueOf(output, ["สินค้า", "รายละเอียดงาน", "รายการ"]);
    return output;
  });
}

export function computeBillAmount(row: SheetRow) {
  return sumColumns([row], AMOUNT_COLUMNS);
}

export function computeBillTransferAmount(row: SheetRow) {
  return computeTransferAmount(row);
}

export function rowsForProject(dataRows: SheetRow[], projectId: RowValue | undefined) {
  const id = String(projectId || "").trim();
  return hydrateDataRows(dataRows).filter(row => String(row["ID Project"] || "").trim() === id);
}

export function hydrateProjectSummary(project: SheetRow, projectDataRows: SheetRow[]): {
  project: SheetRow;
  totals: {
    workTotal: number;
    totalVat: number;
    budget: number;
    totalAll: number;
    billCount: number;
    remaining: number;
    material: number;
    labor: number;
    staff: number;
    fuel: number;
    carRepair: number;
    machine: number;
    tool: number;
    other: number;
  };
} {
  const committedRows = projectDataRows.filter(isCommittedBill);
  const projectTotal = sumColumns(committedRows, ["ยอดเงิน"]);
  const workTotal = toNumber(valueOf(project, ["ยอดงาน"]));
  const totalAll = hasValue(project["รวม ALL"]) ? toNumber(project["รวม ALL"]) : projectTotal;
  const totalVat = hasValue(project["ยอดรวม vat"]) ? toNumber(project["ยอดรวม vat"]) : workTotal * 1.07;
  const budget = toNumber(valueOf(project, ["งบไม่เกิน"]));

  return {
    project: {
      ...project,
      "รวม ALL": totalAll,
      "ยอดรวม vat": totalVat
    },
    totals: {
      workTotal,
      totalVat,
      budget,
      totalAll,
      billCount: committedRows.length,
      remaining: budget - totalAll,
      material: sumColumns(committedRows, ["ค่าของ"]),
      labor: sumColumns(committedRows, ["ค่าแรง"]),
      staff: sumColumns(committedRows, ["พนักงาน"]),
      fuel: sumColumns(committedRows, ["น้ำมัน"]),
      carRepair: sumColumns(committedRows, ["ซ่อมรถ"]),
      machine: sumColumns(committedRows, ["เครื่องจักร"]),
      tool: sumColumns(committedRows, ["เครื่องมือ"]),
      other: sumColumns(committedRows, ["อื่นๆ"])
    }
  };
}

export function isVatActive(vatValue: unknown): boolean {
  if (vatValue === null || vatValue === undefined) return false;
  const str = String(vatValue).trim();
  return str !== "" && str !== "0" && str !== "0.00" && str !== "0%" && str !== "ไม่มี" && str !== "false";
}

export function isDeductActive(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  const str = String(value).trim();
  if (str === "" || str === "0" || str === "0.00" || str === "0%" || str === "ไม่มี" || str === "false") return false;
  return toNumber(value) > 0;
}

export function isCreditActive(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  const str = String(value).trim();
  if (str === "" || str === "0" || str === "0.00" || str === "ไม่มี" || str === "false") return false;
  return toNumber(value) > 0;
}

function computeTransferAmount(row: SheetRow) {
  const amount = hasValue(row["ยอดเงิน"]) ? toNumber(row["ยอดเงิน"]) : computeBillAmount(row);
  const hasVat = isVatActive(row.vat);
  const hasDeduct = hasValue(row["หัก"]) && toNumber(row["หัก"]) > 0;
  const customDeduct = hasValue(row["จำนวนหัก"]) ? toNumber(row["จำนวนหัก"]) : null;

  if (!hasVat && !hasDeduct) return amount;

  if (hasVat && hasDeduct) {
    if (customDeduct !== null && customDeduct > 0) return amount - customDeduct;
    const deductRate = toNumber(row["หัก"]);
    const deductAmt = (amount / 1.07) * (deductRate / 100);
    return amount - deductAmt;
  }

  if (hasVat) return amount;

  if (hasDeduct) {
    if (customDeduct !== null && customDeduct > 0) return amount - customDeduct;
    const deductRate = toNumber(row["หัก"]);
    const deductAmt = (amount * deductRate) / 100;
    return amount - deductAmt;
  }

  return amount;
}

export function computeBillDeductMultiplier(row: SheetRow) {
  const deduct = String(row["หัก"] || "").trim();
  const hasVat = isVatActive(row.vat);
  const rate = toNumber(deduct);
  if (rate <= 0) return 1;
  return hasVat ? 1 - (rate / 100 / 1.07) : 1 - (rate / 100);
}

function isCompanyLabor(row: SheetRow) {
  return String(row["statusค่าแรง"] || "").trim() === "บริษัท";
}
