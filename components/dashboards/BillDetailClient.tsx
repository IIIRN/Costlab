"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Banknote,
  BriefcaseBusiness,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  Clock3,
  CreditCard,
  FileText,
  Images,
  Receipt,
  ReceiptText,
  User,
  Wallet,
  WalletCards,
} from "lucide-react";
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
    <div className="w-full flex flex-col gap-5 p-4 sm:p-6 max-w-[1600px] mx-auto font-sans">
      {/* 1. TOP NAVBAR / WORKFLOW HEADER */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/bills"
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition border border-slate-200"
            title="ย้อนกลับไปรายการบิล"
          >
            <ChevronLeft size={18} />
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900">
                บิล #{billKey(bill) || decodedBillId}
              </h1>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-extrabold ${
                  isPaid
                    ? "bg-slate-100 text-slate-700 border border-slate-200"
                    : isApproved
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}
              >
                {status}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">{projectName}</p>
          </div>
        </div>

        {/* Workflow Action Buttons Bar */}
        <div className="flex items-center gap-2">
          <BillWorkflowActions row={bill} redirectAfterDelete="/bills" />
        </div>
      </div>

      {/* 2. TOP SUMMARY DASHBOARD (2 COLUMNS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Financial Metrics Summary Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">สรุปยอดทางการเงิน</span>
            <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Wallet size={18} />
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
            <div>
              <span className="text-[11px] font-bold text-slate-400 block">ยอดเงินรวม</span>
              <strong className="text-lg font-extrabold text-slate-900">{money(total)}</strong>
            </div>

            <div>
              <span className="text-[11px] font-bold text-indigo-500 block">ยอดโอนแล้ว</span>
              <strong className="text-lg font-extrabold text-indigo-700">{money(transfer)}</strong>
            </div>

            <div>
              <span className="text-[11px] font-bold text-emerald-600 block">ยอดคงเหลือ</span>
              <strong className={`text-lg font-extrabold ${remaining > 0 ? "text-amber-600" : "text-emerald-700"}`}>
                {money(remaining)}
              </strong>
            </div>
          </div>
        </div>

        {/* Bill Metadata Overview Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">ข้อมูลโครงการ & คู่ค้า</span>
            <span className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
              <BriefcaseBusiness size={18} />
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="space-y-0.5 min-w-0">
              <span className="text-[11px] font-bold text-slate-400">โครงการ (Project):</span>
              {projectId ? (
                <Link
                  href={`/work-status/${encodeURIComponent(projectId)}`}
                  className="font-bold text-indigo-600 hover:underline block truncate"
                  title={`#${projectId} - ${projectName}`}
                >
                  #{projectId} - {projectName}
                </Link>
              ) : (
                <span className="font-bold text-slate-800 block truncate">{projectName}</span>
              )}
            </div>

            <div className="space-y-0.5 min-w-0">
              <span className="text-[11px] font-bold text-slate-400">ร้านค้า / คู่ค้า:</span>
              {vendorLink ? (
                <Link
                  href={vendorLink}
                  className="font-bold text-indigo-600 hover:underline block truncate"
                  title={vendor}
                >
                  {vendor}
                </Link>
              ) : (
                <span className="font-bold text-slate-800 block truncate">{vendor}</span>
              )}
            </div>

            <div className="space-y-0.5 min-w-0">
              <span className="text-[11px] font-bold text-slate-400">ผู้เบิกเงิน:</span>
              {requesterLink ? (
                <Link
                  href={requesterLink}
                  className="font-bold text-indigo-600 hover:underline block truncate"
                  title={requester}
                >
                  {requester}
                </Link>
              ) : (
                <span className="font-semibold text-slate-700 block truncate">{requester}</span>
              )}
            </div>

            <div className="space-y-0.5 min-w-0">
              <span className="text-[11px] font-bold text-slate-400">วันที่บิล:</span>
              <span className="font-semibold text-slate-700 block truncate">{billDate}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. WORKSPACE SECTIONS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Expense Items Breakdown Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-4">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <ReceiptText size={16} className="text-indigo-600" />
            <span>รายการค่าใช้จ่าย (EXPENSE ITEMS)</span>
          </h2>

          {expenseItems.length > 0 ? (
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden text-xs">
              {expenseItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-white hover:bg-slate-50/60">
                  <span className="font-bold text-slate-600">{item.label}</span>
                  <span className={`font-semibold ${item.isAmount ? "text-slate-900 font-extrabold" : "text-slate-700"}`}>
                    {item.isAmount ? money(item.value) : String(item.value)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs">ไม่มีรายละเอียดค่าใช้จ่ายเพิ่มเติม</div>
          )}
        </div>


        {/* Payment Terms & Tax Details Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-4">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <CreditCard size={16} className="text-indigo-600" />
            <span>เงื่อนไขการชำระเงิน & ภาษี (PAYMENT & TAX)</span>
          </h2>

          {paymentItems.length ? (
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden text-xs">
              {paymentItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-white hover:bg-slate-50/60">
                  <span className="font-bold text-slate-600">{item.label}</span>
                  {item.link ? (
                    <Link href={item.link} className="font-bold text-indigo-600 hover:underline">
                      {String(item.value)}
                    </Link>
                  ) : (
                    <span className={`font-semibold ${item.isAmount ? "text-slate-900 font-extrabold" : "text-slate-700"}`}>
                      {item.isAmount ? money(item.value) : String(item.value)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs">ไม่มีเงื่อนไขชำระเงินเพิ่มเติม</div>
          )}
        </div>
      </div>

      {/* 4. RECEIPT PHOTO / IMAGE PREVIEW */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-3">
        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Images size={16} className="text-indigo-600" />
          <span>รูปถ่ายบิล & เอกสารประกอบ</span>
        </h2>

        <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80">
          {hasValue(imageValue) ? (
            <BillImageThumbnail value={imageValue} />
          ) : (
            <span className="text-xs font-medium text-slate-400">ไม่มีรูปถ่ายบิลแนบในระบบ</span>
          )}
        </div>
      </div>

      {/* 5. RELATED DATA TABLES (PROJECT & OPEN CONTRACTS) */}
      <div className="space-y-4">
        {project.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <DataTable
              columns={["ID Project", "ชื่อ Project", "ยอดงาน", "ยอดรวม vat", "งบไม่เกิน", "วันที่", "รับผิดชอบ"]}
              rows={project}
              title="โครงการที่เกี่ยวข้อง (Related Project)"
              rowLabel="รายการ"
              limit={10}
              detailBasePath="/work-status"
              detailKeyColumn="ID Project"
              cellFormatters={{ "วันที่": (v) => formatDateThai(v) }}
            />
          </div>
        )}

        {contract.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <DataTable
              columns={["id_Conwork", "id_Contractor", "ยอดเงินจ้าง", "ยอดเงินจ่าย", "ค่าแรงคงเหลือ", "รายละเอียดงาน", "วันที่"]}
              rows={contract}
              title="เปิดจ้างที่เกี่ยวข้อง (Related Contracts)"
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
