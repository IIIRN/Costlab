import type { SheetRow } from "@/lib/types";
import { toNumber } from "@/lib/numbers";

export function validateBillStatusTransition(currentStatus: unknown, nextStatus: unknown) {
  const current = normalizeBillStatus(currentStatus);
  const next = normalizeBillStatus(nextStatus);
  if (current === next) return;

  const validTransitions: Record<string, string[]> = {
    "": ["รออนุมัติ", "ตั้งเบิก", "อนุมัติ", "เบิกแล้ว"],
    "รออนุมัติ": ["ตั้งเบิก", "อนุมัติ", "เบิกแล้ว"],
    "ตั้งเบิก": ["รออนุมัติ", "อนุมัติ", "เบิกแล้ว"],
    "อนุมัติ": ["รออนุมัติ", "ตั้งเบิก", "เบิกแล้ว"],
    "เบิกแล้ว": ["รออนุมัติ", "อนุมัติ"]
  };

  const allowed = validTransitions[current] || ["รออนุมัติ", "อนุมัติ", "เบิกแล้ว"];
  if (!allowed.includes(next)) {
    throw new Error(`เปลี่ยนสถานะจาก ${current || "ว่าง"} เป็น ${next || "ว่าง"} ไม่ได้`);
  }
}

export function canEditOrDeleteBill(status: unknown) {
  const normStatus = normalizeBillStatus(status);
  return normStatus === "" || normStatus === "ตั้งเบิก" || normStatus === "รออนุมัติ";
}

export function isValidBill(row: SheetRow) {
  if (!row) return false;
  const hasSeq = Boolean(row["ลำดับ"] || row._sheetRow || row.id);
  const hasVendor = Boolean(row["ร้าน/บุคคล"] && String(row["ร้าน/บุคคล"]).trim() !== "");
  const hasProject = Boolean(row["ชื่อ Project"] || row["ID Project"]);
  const hasItem = Boolean(row["สินค้า/ทำงาน"] || row["รายการ"]);
  const hasMoney = toNumber(row["ยอดเงิน"]) > 0 || ["ค่าของ", "ค่าแรง", "พนักงาน", "น้ำมัน", "ซ่อมรถ", "เครื่องจักร", "เครื่องมือ", "อื่นๆ"].some(c => toNumber(row[c]) > 0);
  return hasSeq || hasVendor || hasProject || hasItem || hasMoney;
}

export function isCommittedBill(row: SheetRow) {
  return isValidBill(row);
}

export function isUnpaidBill(row: SheetRow) {
  return normalizeBillStatus(row["สถานะ"]) !== "เบิกแล้ว";
}

export function normalizeBillStatus(value: unknown) {
  return String(value || "").trim();
}
