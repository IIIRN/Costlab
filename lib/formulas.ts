import { TABLES } from "@/lib/config";
import { isCommittedBill } from "@/lib/bill-status";
import { computeBillAmount, computeBillDeductMultiplier, computeBillTransferAmount } from "@/lib/project-summary";
import { getRows } from "@/lib/db";
import type { SheetRow } from "@/lib/types";

export async function applyBillFormulas(row: SheetRow) {
  const context = await getBillFormulaContext();
  return applyBillFormulasFast(row, context);
}

export async function hydrateBillRows(
  rows: SheetRow[],
  preloadedContext?: { projects?: SheetRow[]; stores?: SheetRow[]; contracts?: SheetRow[]; contractors?: SheetRow[] }
) {
  const projects = preloadedContext?.projects || await getRows(TABLES.PROJECT, 120_000);
  const stores = preloadedContext?.stores || await getRows(TABLES.STORE, 120_000);
  const rawContracts = preloadedContext?.contracts || await getRows(TABLES.CONTRACT_WORK, 60_000);
  const contractors = preloadedContext?.contractors || await getRows(TABLES.CONTRACTOR, 60_000).catch(() => []);

  const contractorMap = new Map<string, string>();
  for (const c of contractors) {
    const id = String(c["id_Contractor"] || c.id || "").trim();
    const name = String(c["ชื่อเล่น"] || c["ชื่อ-นามสกุล"] || c["ชื่อผู้รับเหมา"] || c.name || "").trim();
    if (id && name) contractorMap.set(id, name);
  }

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
  for (const item of rawContracts) {
    const contractorId = String(item["id_Contractor"] || "").trim();
    const contractorName = contractorMap.get(contractorId) || String(item["ชื่อเล่น"] || item["ผู้รับเหมา"] || "").trim();

    const hydratedItem = {
      ...item,
      "ชื่อเล่น": contractorName || item["ชื่อเล่น"] || "",
      "ผู้รับเหมา": contractorName || item["ผู้รับเหมา"] || ""
    };

    const k1 = String(item["id_Conwork"] || "").trim();
    const k2 = String(item.id || "").trim();
    const k3 = String(item["ชื่อเล่น"] || "").trim();
    const k4 = String(item["รายละเอียดงาน"] || "").trim();
    if (k1) contractMap.set(k1, hydratedItem);
    if (k2) contractMap.set(k2, hydratedItem);
    if (k3) contractMap.set(k3, hydratedItem);
    if (k4) contractMap.set(k4, hydratedItem);
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
  const vatAmount = toNumber(output["ยอดรวม vat"]);

  if (workAmount > 0 && (!hasValue(output["ยอดรวม vat"]) || vatAmount === 0)) {
    output["ยอดรวม vat"] = Math.round(workAmount * 1.07);
  } else if (vatAmount > 0 && (!hasValue(output["ยอดงาน"]) || workAmount === 0)) {
    output["ยอดงาน"] = Math.round(vatAmount / 1.07);
  }

  // Calculate overall budget cap "งบไม่เกิน" if empty or 0
  const currentCap = toNumber(output["งบไม่เกิน"]);
  if (currentCap === 0) {
    const categorySum = Object.keys(output)
      .filter(k => k.startsWith("งบไม่เกิน") && k !== "งบไม่เกิน")
      .reduce((sum, k) => sum + toNumber(output[k]), 0);
    if (categorySum > 0) {
      output["งบไม่เกิน"] = categorySum;
    } else if (workAmount > 0) {
      output["งบไม่เกิน"] = workAmount;
    } else if (vatAmount > 0) {
      output["งบไม่เกิน"] = Math.round(vatAmount / 1.07);
    }
  }

  if (!hasValue(output["วันที่"])) output["วันที่"] = new Date().toISOString().slice(0, 10);
  if (!hasValue(output["color"])) output["color"] = "Red";
  return output;
}

export async function hydrateContractRows(
  rows: SheetRow[],
  preloadedContext?: { projects?: SheetRow[]; contractors?: SheetRow[]; dataRows?: SheetRow[] }
) {
  const context = await getContractFormulaContext(preloadedContext);
  return rows.map(row => applyContractFormulasWithContext({ ...row }, context));
}

async function getContractFormulaContext(preloadedContext?: { projects?: SheetRow[]; contractors?: SheetRow[]; dataRows?: SheetRow[] }) {
  const projects = preloadedContext?.projects || await getRows(TABLES.PROJECT, 30_000).catch(() => []);
  const contractors = preloadedContext?.contractors || await getRows(TABLES.CONTRACTOR, 30_000).catch(() => []);
  const dataRows = preloadedContext?.dataRows || await getRows(TABLES.DATA, 15_000).catch(() => []);
  return { projects, contractors, paidByContract: contractPaidAmounts(dataRows) };
}

function applyContractFormulasWithContext(
  row: SheetRow,
  context: { projects: SheetRow[]; contractors: SheetRow[]; paidByContract: Record<string, number> }
) {
  const project = context.projects.find(item => String(item["ID Project"]) === String(row["ID Project"]));
  if (project) {
    row["ชื่อ Project"] = project["ชื่อ Project"] || row["ชื่อ Project"] || "";
  }
  const contractor = context.contractors.find(item => String(item["id_Contractor"]) === String(row["id_Contractor"]));
  if (contractor) {
    row["ชื่อเล่น"] = contractor["ชื่อเล่น"] || contractor["ชื่อ-นามสกุล"] || row["ชื่อเล่น"] || "";
    row["ผู้รับเหมา"] = contractor["ชื่อเล่น"] || contractor["ชื่อ-นามสกุล"] || row["ผู้รับเหมา"] || "";
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

  const rawContractorId = String(row["ผู้รับเหมา"] || row.contractor_id || row.conwork_id || "").trim();
  const rawVendorStr = String(row["ร้าน/บุคคล"] || "").trim();
  const contractKey = rawContractorId || (rawVendorStr.startsWith("CW") ? rawVendorStr : "");
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
  const rawVendor = String(row["ร้าน/บุคคล"] || "").trim();
  const rawContractor = String(row["ผู้รับเหมา"] || "").trim();

  const isContractor = vendorType === "ผู้รับเหมา" || (!vendorType && (rawContractor || rawVendor.startsWith("CW") || contract));

  if (isContractor) {
    const nameFromContract = contract?.["ชื่อเล่น"] || contract?.["ชื่อ-นามสกุล"] || contract?.["ผู้รับเหมา"];
    if (nameFromContract) return nameFromContract;
    if (rawVendor && !rawVendor.startsWith("CW")) return rawVendor;
    if (rawContractor && !rawContractor.startsWith("CW")) return rawContractor;
    return contract?.["id_Conwork"] || rawVendor || rawContractor || "";
  }
  const storeKey = String(row["ร้านค้า"] || row.store_id || "").trim();
  if (!storeKey) return rawVendor || "";
  const store = storeMap.get(storeKey);
  return store?.["ชื่อร้านค้า"] || store?.["ชื่อเต็ม"] || store?.name || rawVendor || storeKey;
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
