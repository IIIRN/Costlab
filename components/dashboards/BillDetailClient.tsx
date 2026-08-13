"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BillImageThumbnail } from "@/components/BillImageThumbnail";
import { BillWorkflowActions } from "@/components/BillWorkflowActions";
import { DataTable } from "@/components/tables/DataTable";
import { money, toNumber } from "@/lib/numbers";
import type { SheetRow } from "@/lib/types";

type BillDetailClientProps = {
  bill: SheetRow;
  decodedBillId: string;
  project: SheetRow[];
  contract: SheetRow[];
  requesterDisplay?: string;
  requesterLink?: string;
  vendorDisplay?: string;
  vendorLink?: string;
};

export function BillDetailClient({
  bill,
  decodedBillId,
  project,
  contract,
  requesterDisplay,
  requesterLink,
  vendorDisplay,
  vendorLink,
}: BillDetailClientProps) {
  const projectId = text(bill["ID Project"]);
  const projectName = text(bill["ชื่อ Project"]) || "ไม่ระบุโครงการ";
  const imageValue = bill["รูปถ่ายบิล"];
  const total = toNumber(bill["ยอดเงิน"]);
  const transfer = toNumber(bill["ยอดโอน"]);
  const remaining = total - transfer;
  const status = text(bill["สถานะ"]) || "รออนุมัติ";
  const vendor = vendorDisplay || firstText(bill, ["ร้านค้า", "ผู้รับเหมา", "ร้านค้า/ผู้รับเหมา", "ร้าน/บุคคล"]);
  const requester = requesterDisplay || text(bill["ผู้เบิก"]) || "-";
  const rawBillDate = firstText(bill, ["ว/ด/ป", "วันได้บิล"]);
  const billDate = formatDateThai(rawBillDate);

  const isApproved = status === "อนุมัติ";
  const isPaid = status === "เบิกแล้ว";

  const expenseItems = useMemo(() => {
    return [
      { label: "รายละเอียดงาน", value: bill["รายละเอียดงาน"] },
      { label: "สินค้า", value: bill["สินค้า"] },
      { label: "รายการ", value: bill["รายการ"] },
      { label: "ค่าของ", value: bill["ค่าของ"], isAmount: true },
      { label: "ค่าแรง", value: bill["ค่าแรง"], isAmount: true },
      { label: "น้ำมัน", value: bill["น้ำมัน"], isAmount: true },
      { label: "ซ่อมรถ", value: bill["ซ่อมรถ"], isAmount: true },
      { label: "ทะเบียนรถ", value: bill["ทะเบียน"] },
      { label: "เครื่องจักร", value: bill["เครื่องจักร"], isAmount: true },
      { label: "เครื่องมือ", value: bill["เครื่องมือ"], isAmount: true },
      { label: "ชื่อเครื่องมือ", value: bill["ชื่อเครื่องมือ"] },
      { label: "อื่นๆ", value: bill["อื่นๆ"], isAmount: true },
    ].filter((item) => hasValue(item.value));
  }, [bill]);

  const paymentItems = useMemo(() => {
    return [
      { label: "VAT", value: bill.vat },
      { label: "หัก ณ ที่จ่าย", value: bill["หัก"] },
      { label: "3 เปอร์เซ็นต์", value: bill["3เปอร์เซ็น"], isAmount: true },
      { label: "เครดิต (วัน)", value: bill["เครดิต"] },
      { label: "ผู้เบิก", value: requester, link: requesterLink },
      { label: "พนักงาน", value: firstText(bill, ["ชื่อพนักงาน", "พนักงาน"]) },
      { label: "วันที่บิล", value: formatDateThai(firstText(bill, ["ว/ด/ป", "วันได้บิล"])) },
      { label: "วันออก 3%", value: formatDateThai(bill["วันออก 3%"]) },
      { label: "วันจ่าย", value: formatDateThai(bill["วันจ่าย"]) },
    ].filter((item) => hasValue(item.value));
  }, [bill, requester, requesterLink]);

  return (
    <div className="w-full flex flex-col gap-4 p-4 sm:p-5 max-w-[1400px] mx-auto font-sans text-sm text-slate-800">
      {/* 1. HEADER ROW */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-3">
          <Link
            href="/bills"
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition"
          >
            <ArrowLeft size={14} />
            <span>รายการบิล</span>
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-bold text-slate-700">บิล #{billKey(bill) || decodedBillId}</span>
          <span
            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
              isPaid
                ? "bg-slate-100 text-slate-600 border border-slate-200"
                : isApproved
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-amber-50 text-amber-700 border border-amber-200"
            }`}
          >
            {status}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <BillWorkflowActions row={bill} allowEdit redirectAfterDelete="/bills" />
        </div>
      </div>

      {/* 2. TITLE & META */}
      <div>
        <h1 className="text-lg font-bold text-slate-900">{projectName}</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          คู่ค้า: <span className="font-semibold text-slate-700">{vendor}</span> · ผู้เบิก: <span className="font-semibold text-slate-700">{requester}</span> · วันที่: <span className="font-semibold text-slate-700">{billDate}</span>
        </p>
      </div>

      {/* 3. FINANCIAL METRICS */}
      <div className="grid grid-cols-3 gap-3">
        <div className="border border-slate-200 rounded-md p-3 bg-white">
          <div className="text-[11px] text-slate-400 font-medium mb-1">ยอดเงินรวม</div>
          <div className="text-base font-bold text-slate-900">{money(total)}</div>
        </div>
        <div className="border border-slate-200 rounded-md p-3 bg-white">
          <div className="text-[11px] text-slate-400 font-medium mb-1">ยอดโอนแล้ว</div>
          <div className="text-base font-bold text-indigo-700">{money(transfer)}</div>
        </div>
        <div className="border border-slate-200 rounded-md p-3 bg-white">
          <div className="text-[11px] text-slate-400 font-medium mb-1">ยอดคงเหลือ</div>
          <div className={`text-base font-bold ${remaining > 0 ? "text-amber-600" : "text-emerald-700"}`}>
            {money(remaining)}
          </div>
        </div>
      </div>

      {/* 4. DETAILS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Expense Breakdown */}
        <div className="lg:col-span-6 border border-slate-200 rounded-md bg-white overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-200 bg-slate-50">
            <h2 className="text-xs font-bold text-slate-700">รายการค่าใช้จ่าย</h2>
          </div>
          {expenseItems.length > 0 ? (
            <table className="w-full text-xs">
              <tbody className="divide-y divide-slate-100">
                {expenseItems.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2 text-slate-500 font-medium whitespace-nowrap w-[40%]">{item.label}</td>
                    <td className={`px-3 py-2 font-semibold ${item.isAmount ? "text-slate-900" : "text-slate-800"}`}>
                      {item.isAmount ? money(item.value) : String(item.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-4 text-center text-slate-400 text-xs">ไม่มีรายละเอียดค่าใช้จ่ายเพิ่มเติม</div>
          )}
        </div>

        {/* Right: Payment & Tax Details */}
        <div className="lg:col-span-6 border border-slate-200 rounded-md bg-white overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-200 bg-slate-50">
            <h2 className="text-xs font-bold text-slate-700">เงื่อนไขการชำระเงิน & ภาษี</h2>
          </div>
          {paymentItems.length > 0 ? (
            <table className="w-full text-xs">
              <tbody className="divide-y divide-slate-100">
                {paymentItems.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2 text-slate-500 font-medium whitespace-nowrap w-[40%]">{item.label}</td>
                    <td className="px-3 py-2 font-semibold text-slate-800">
                      {item.link ? (
                        <Link href={item.link} className="text-indigo-600 hover:underline">
                          {String(item.value)}
                        </Link>
                      ) : item.isAmount ? (
                        money(item.value)
                      ) : (
                        String(item.value)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-4 text-center text-slate-400 text-xs">ไม่มีเงื่อนไขชำระเงินเพิ่มเติม</div>
          )}
        </div>
      </div>

      {/* 5. ATTACHMENT / BILL IMAGE */}
      <div className="border border-slate-200 rounded-md bg-white overflow-hidden">
        <div className="px-3 py-2 border-b border-slate-200 bg-slate-50">
          <h2 className="text-xs font-bold text-slate-700">รูปถ่ายบิล & เอกสารประกอบ</h2>
        </div>
        <div className="p-3">
          {hasValue(imageValue) ? (
            <BillImageThumbnail value={imageValue} />
          ) : (
            <span className="text-xs text-slate-400">ไม่มีรูปถ่ายบิลแนบในระบบ</span>
          )}
        </div>
      </div>

      {/* 6. RELATED TABLES */}
      <div className="space-y-4">
        {project.length > 0 && (
          <div className="border border-slate-200 rounded-md bg-white overflow-hidden">
            <DataTable
              columns={["ID Project", "ชื่อ Project", "ยอดงาน", "ยอดรวม vat", "งบไม่เกิน", "วันที่", "รับผิดชอบ"]}
              rows={project}
              title="โครงการที่เกี่ยวข้อง"
              rowLabel="รายการ"
              limit={10}
              detailBasePath="/work-status"
              detailKeyColumn="ID Project"
              cellFormatters={{ "วันที่": (v) => formatDateThai(v) }}
            />
          </div>
        )}

        {contract.length > 0 && (
          <div className="border border-slate-200 rounded-md bg-white overflow-hidden">
            <DataTable
              columns={["id_Conwork", "id_Contractor", "ยอดเงินจ้าง", "ยอดเงินจ่าย", "ค่าแรงคงเหลือ", "รายละเอียดงาน", "วันที่"]}
              rows={contract}
              title="เปิดจ้างที่เกี่ยวข้อง"
              rowLabel="รายการ"
              limit={10}
              detailBasePath="/contract-open"
              detailKeyColumn="id_Conwork"
              cellFormatters={{ "วันที่": (v) => formatDateThai(v) }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function formatDateThai(value: unknown): string {
  const str = String(value || "").trim();
  if (!str) return "-";
  const m = str.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return str;
}

function text(value: unknown) {
  return String(value || "").trim();
}

function firstText(row: SheetRow, columns: string[]) {
  for (const column of columns) {
    const val = text(row[column]);
    if (val) return val;
  }
  return "";
}

function hasValue(value: unknown) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function billKey(row: SheetRow) {
  return text(row["ลำดับ"]) || text(row._sheetRow);
}

