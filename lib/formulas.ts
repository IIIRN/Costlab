import { TABLES } from "@/lib/config";
import { isCommittedBill } from "@/lib/bill-status";
import { computeBillAmount, computeBillDeductMultiplier, computeBillTransferAmount } from "@/lib/project-summary";
import { getRows } from "@/lib/sheets";
import type { SheetRow } from "@/lib/types";

export async function applyBillFormulas(row: SheetRow) {
  const context = await getBillFormulaContext();
  return applyBillFormulasFast(row, context);
}

export async function hydrateBillRows(
  rows: SheetRow[],
  preloadedContext?: { projects?: SheetRow[]; stores?: SheetRow[]; contracts?: SheetRow[] }
) {
  const projects = preloadedContext?.projects || await getRows(TABLES.PROJECT, 120_000);
  const stores = preloadedContext?.stores || await getRows(TABLES.STORE, 120_000);
  const contracts = preloadedContext?.contracts || await getRows(TABLES.CONTRACT_WORK, 60_000);

  const projectMap = new Map<string, SheetRow>();
  for (const item of projects) {
    const k1 = String(item["ID Project"] || "").trim();
    const k2 = String(item.id || "").trim();
    const k3 = String(item["ชื่อ Project"] || "").trim();
    const k4 = String(item.name || "").trim();
    if (k1) projectMap.set(k1, item);
    if (k2) projectMap.set(k2, item);
    if (k3) projectMap.set(k3, item);
    if (k4) projectMap.set(k4, item);
  }

  const storeMap = new Map<string, SheetRow>();
  for (const item of stores) {
    const k1 = String(item["id_store"] || "").trim();
    const k2 = String(item.id || "").trim();
    const k3 = String(item["ชื่อร้านค้า"] || "").trim();
    const k4 = String(item.name || "").trim();
    if (k1) storeMap.set(k1, item);
    if (k2) storeMap.set(k2, item);
    if (k3) storeMap.set(k3, item);
    if (k4) storeMap.set(k4, item);
  }

  const contractMap = new Map<string, SheetRow>();
  for (const item of contracts) {
    const k1 = String(item["id_Conwork"] || "").trim();
    const k2 = String(item.id || "").trim();
    const k3 = String(item["ชื่อเล่น"] || "").trim();
    const k4 = String(item["รายละเอียดงาน"] || "").trim();
    if (k1) contractMap.set(k1, item);
    if (k2) contractMap.set(k2, item);
    if (k3) contractMap.set(k3, item);
    if (k4) contractMap.set(k4, item);
  }

  const indexedContext = { projectMap, storeMap, contractMap };
  return rows.map(row => applyBillFormulasFast({ ...row }, indexedContext));
}

export async function applyContractFormulas(row: SheetRow) {
  const context = await getContractFormulaContext();
  return applyContractFormulasWithContext({ ...row }, context);
}

export function applyProjectFormulas(row: SheetRow) {
  const output = { ...row };
  const workAmount = toNumber(output["ยอดงาน"]);
  if (hasValue(output["ยอดงาน"])) output["ยอดรวม vat"] = workAmount * 1.07;
  if (!hasValue(output["วันที่"])) output["วันที่"] = new Date().toISOString().slice(0, 10);
  if (!hasValue(output["color"])) output["color"] = "Red";
  return output;
}

export async function hydrateContractRows(rows: SheetRow[]) {
  const context = await getContractFormulaContext();
  return rows.map(row => applyContractFormulasWithContext({ ...row }, context));
}

async function getContractFormulaContext() {
  const [projects, dataRows] = await Promise.all([
    getRows(TABLES.PROJECT, 30_000),
    getRows(TABLES.DATA, 15_000)
  ]);
  return { projects, paidByContract: contractPaidAmounts(dataRows) };
}

function applyContractFormulasWithContext(
  row: SheetRow,
  context: { projects: SheetRow[]; paidByContract: Record<string, number> }
) {
  const project = context.projects.find(item => String(item["ID Project"]) === String(row["ID Project"]));
  if (project) {
    row["ชื่อ Project"] = project["ชื่อ Project"] || row["ชื่อ Project"] || "";
  }
  const key = contractPaymentKey(row);
  const paid = key ? context.paidByContract[key] || 0 : 0;
  const hireAmount = toNumber(firstValue(row, ["ยอดเงินจ้าง"]));
  row["ยอดเงินจ่าย"] = paid;
  row["ค่าแรงคงเหลือ"] = hireAmount - paid;
  return row;
}

function contractPaidAmounts(rows: SheetRow[]) {
  return rows.reduce<Record<string, number>>((totals, row) => {
    if (!isCommittedBill(row)) return totals;
    const key = contractPaymentKey(row);
    if (!key) return totals;
    const directAmount =
      toNumber(firstValue(row, ["ค่าแรง"])) +
      toNumber(firstValue(row, ["พนักงาน"])) +
      toNumber(firstValue(row, ["อื่นๆ"]));
    totals[key] = (totals[key] || 0) + directAmount;
    return totals;
  }, {});
}

function contractPaymentKey(row: SheetRow) {
  const projectId = String(row["ID Project"] || "").trim();
  const contractId = String(firstValue(row, ["id_Conwork", "ผู้รับเหมา"]) || "").trim();
  return projectId && contractId ? `${projectId}|${contractId}` : "";
}

function firstValue(row: SheetRow, columns: string[]) {
  for (const column of columns) {
    const value = row[column];
    if (hasValue(value)) return value;
  }
  return "";
}

async function getBillFormulaContext() {
  const [projects, stores, contracts] = await Promise.all([
    getRows(TABLES.PROJECT, 120_000),
    getRows(TABLES.STORE, 120_000),
    getRows(TABLES.CONTRACT_WORK, 60_000)
  ]);

  const projectMap = new Map<string, SheetRow>();
  for (const item of projects) {
    const key = String(item["ID Project"] || "").trim();
    if (key) projectMap.set(key, item);
  }

  const storeMap = new Map<string, SheetRow>();
  for (const item of stores) {
    const key = String(item["id_store"] || "").trim();
    if (key) storeMap.set(key, item);
  }

  const contractMap = new Map<string, SheetRow>();
  for (const item of contracts) {
    const key = String(item["id_Conwork"] || "").trim();
    if (key) contractMap.set(key, item);
  }

  return { projectMap, storeMap, contractMap };
}

function applyBillFormulasFast(
  row: SheetRow,
  context: { projectMap: Map<string, SheetRow>; storeMap: Map<string, SheetRow>; contractMap: Map<string, SheetRow> }
) {
  const projKey = String(row["ID Project"] || "").trim();
  if (projKey) {
    const project = context.projectMap.get(projKey);
    if (project) {
      row["ชื่อ Project"] = project["ชื่อ Project"] || row["ชื่อ Project"] || "";
      row["ชื่อบริษัท"] = project["ชื่อบริษัท"] || row["ชื่อบริษัท"] || "";
    }
  }

  const contractKey = String(row["ผู้รับเหมา"] || "").trim();
  let contract: SheetRow | undefined;
  if (contractKey) {
    contract = context.contractMap.get(contractKey);
    if (contract) {
      row["รายละเอียดงาน"] = contract["รายละเอียดงาน"] || row["รายละเอียดงาน"] || "";
      row["ค่าแรงคงเหลือ"] = contract["ค่าแรงคงเหลือ"] || "";
    }
  }

  const sumAmount = computeBillAmount(row);
  row["ยอดเงิน"] = sumAmount > 0 ? sumAmount : (hasValue(row["ยอดเงิน"]) ? toNumber(row["ยอดเงิน"]) : 0);
  row["ค่าแรง+พนักงาน+อื่น"] = toNumber(row["ค่าแรง"]) + toNumber(row["พนักงาน"]) + toNumber(row["อื่นๆ"]);
  row["3เปอร์"] = hasValue(row["หัก"]) ? deductAmount(row) : "";
  row["รวม"] = hasValue(row["หัก"]) ? toNumber(row["ค่าแรง+พนักงาน+อื่น"]) - toNumber(row["3เปอร์"]) : "";
  row["ค่าแรง(หัก)"] = hasValue(row["หัก"]) ? computeBillDeductMultiplier(row) : "";
  row["ยอดโอน(มีvat)"] = row["ยอดเงิน"];
  row["ยอดโอน(มีหัก)"] = hasValue(row["หัก"]) ? computeBillTransferAmount(row) : "";
  row["ยอดโอน(vat,หัก)"] = hasValue(row["vat"]) && hasValue(row["หัก"]) ? computeBillTransferAmount(row) : "";
  row["ยอดโอน"] = hasValue(row["ยอดโอน"]) && toNumber(row["ยอดโอน"]) > 0 ? toNumber(row["ยอดโอน"]) : computeBillTransferAmount(row);
  row["ร้าน/บุคคล"] = vendorNameFast(row, context.storeMap, contract);
  const pFast = String(row["สินค้า"] || row.product || "").trim();
  const dFast = String(row["รายละเอียดงาน"] || row.work_details || "").trim();
  row["สินค้า/ทำงาน"] = pFast && dFast ? `${pFast} / ${dFast}` : (pFast || dFast || row["สินค้า/ทำงาน"] || row.description || "");
  return row;
}

function vendorNameFast(row: SheetRow, storeMap: Map<string, SheetRow>, contract?: SheetRow) {
  const vendorType = String(row["ร้านค้า/ผู้รับเหมา"] || "").trim();
  if (vendorType === "ผู้รับเหมา") {
    return contract?.["ชื่อเล่น"] || contract?.["ชื่อ-นามสกุล"] || row["ผู้รับเหมา"] || row["ร้าน/บุคคล"] || "";
  }
  const storeKey = String(row["ร้านค้า"] || row.store_id || "").trim();
  if (!storeKey) return row["ร้าน/บุคคล"] || "";
  const store = storeMap.get(storeKey);
  return store?.["ชื่อร้านค้า"] || store?.["ชื่อเต็ม"] || store?.name || row["ร้าน/บุคคล"] || storeKey;
}

function applyBillFormulasWithContext(
  row: SheetRow,
  context: { projects: SheetRow[]; stores: SheetRow[]; contracts: SheetRow[] }
) {
  const project = context.projects.find(item => String(item["ID Project"]) === String(row["ID Project"]));
  if (project) {
    row["ชื่อ Project"] = project["ชื่อ Project"] || row["ชื่อ Project"] || "";
    row["ชื่อบริษัท"] = project["ชื่อบริษัท"] || row["ชื่อบริษัท"] || "";
  }

  const contract = context.contracts.find(item => String(item["id_Conwork"]) === String(row["ผู้รับเหมา"]));
  if (contract) {
    row["รายละเอียดงาน"] = contract["รายละเอียดงาน"] || row["รายละเอียดงาน"] || "";
    row["ค่าแรงคงเหลือ"] = contract["ค่าแรงคงเหลือ"] || "";
  }

  const sumAmount = computeBillAmount(row);
  row["ยอดเงิน"] = sumAmount > 0 ? sumAmount : (hasValue(row["ยอดเงิน"]) ? toNumber(row["ยอดเงิน"]) : 0);
  row["ค่าแรง+พนักงาน+อื่น"] = toNumber(row["ค่าแรง"]) + toNumber(row["พนักงาน"]) + toNumber(row["อื่นๆ"]);
  row["3เปอร์"] = hasValue(row["หัก"]) ? deductAmount(row) : "";
  row["รวม"] = hasValue(row["หัก"]) ? toNumber(row["ค่าแรง+พนักงาน+อื่น"]) - toNumber(row["3เปอร์"]) : "";
  row["ค่าแรง(หัก)"] = hasValue(row["หัก"]) ? computeBillDeductMultiplier(row) : "";
  row["ยอดโอน(มีvat)"] = row["ยอดเงิน"];
  row["ยอดโอน(มีหัก)"] = hasValue(row["หัก"]) ? computeBillTransferAmount(row) : "";
  row["ยอดโอน(vat,หัก)"] = hasValue(row["vat"]) && hasValue(row["หัก"]) ? computeBillTransferAmount(row) : "";
  row["ยอดโอน"] = hasValue(row["ยอดโอน"]) && toNumber(row["ยอดโอน"]) > 0 ? toNumber(row["ยอดโอน"]) : computeBillTransferAmount(row);
  row["ร้าน/บุคคล"] = vendorName(row, context.stores, contract);
  const pVal = String(row["สินค้า"] || row.product || "").trim();
  const dVal = String(row["รายละเอียดงาน"] || row.work_details || "").trim();
  row["สินค้า/ทำงาน"] = pVal && dVal ? `${pVal} / ${dVal}` : (pVal || dVal || row["สินค้า/ทำงาน"] || row.description || "");
  return row;
}

function vendorName(row: SheetRow, stores: SheetRow[], contract?: SheetRow) {
  const vendorType = String(row["ร้านค้า/ผู้รับเหมา"] || "").trim();
  if (vendorType === "ผู้รับเหมา") return contract?.["ชื่อเล่น"] || contract?.["ชื่อ-นามสกุล"] || row["ผู้รับเหมา"] || row["ร้าน/บุคคล"] || "";
  const storeKey = String(row["ร้านค้า"] || row.store_id || "").trim();
  if (!storeKey) return row["ร้าน/บุคคล"] || "";
  const store = stores.find(item => String(item["id_store"]) === storeKey || String(item.id) === storeKey || String(item["ชื่อร้านค้า"]) === storeKey || String(item.name) === storeKey);
  return store?.["ชื่อร้านค้า"] || store?.["ชื่อเต็ม"] || store?.name || row["ร้าน/บุคคล"] || storeKey;
}

function deductAmount(row: SheetRow) {
  if (hasValue(row["จำนวนหัก"])) return toNumber(row["จำนวนหัก"]);
  return toNumber(row["ค่าแรง+พนักงาน+อื่น"]) * toNumber(row["หัก"]) * 0.01;
}

function hasValue(value: unknown) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return value;
  const parsed = Number(String(value).replace(/,/g, ""));
  return Number.isNaN(parsed) ? 0 : parsed;
}
