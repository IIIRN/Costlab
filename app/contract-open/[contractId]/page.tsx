import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ContractDetailEditButton } from "@/components/ContractDetailEditButton";
import { DataTable } from "@/components/tables/DataTable";
import { isCommittedBill } from "@/lib/bill-status";
import { TABLES } from "@/lib/config";
import { hydrateBillRows, hydrateContractRows } from "@/lib/formulas";
import { getFormPayload } from "@/lib/form";
import { getRows } from "@/lib/sheets";
import { money } from "@/lib/numbers";
import type { SheetRow } from "@/lib/types";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type ContractDetailPageProps = {
  params: Promise<{ contractId: string }>;
};

const DETAIL_FIELDS = [
  "ชื่อเล่น",
  "id_Conwork",
  "ID Project",
  "ชื่อ Project",
  "id_Contractor",
  "ชื่อ-นามสกุล",
  "เลขบัญชี",
  "ธนาคาร",
  "ยอดเงินจ้าง",
  "ยอดเงินจ่าย",
  "ค่าแรงคงเหลือ",
  "รายละเอียดงาน",
  "สถานที่",
  "วันที่",
  "เบอร์โทรศัพท์",
  "ที่อยู่"
];

const RELATED_COLUMNS = [
  "ลำดับ",
  "ID Project",
  "ชื่อ Project",
  "ร้าน/บุคคล",
  "สินค้า/ทำงาน",
  "บิล",
  "ประเภท",
  "ยอดเงิน",
  "ผู้รับเหมา",
  "ผู้เบิก",
  "ว/ด/ป",
  "สถานะ"
];

export default async function ContractDetailPage({ params }: ContractDetailPageProps) {
  const { contractId } = await params;
  const decodedContractId = decodeURIComponent(contractId).trim();

  const [contractRows, rawDataRows, contractorRows, form] = await Promise.all([
    getRows(TABLES.CONTRACT_WORK, 15_000).then(rows => hydrateContractRows(rows)).catch(() => []),
    getRows(TABLES.DATA, 15_000).catch(() => []),
    getRows(TABLES.CONTRACTOR, 15_000).catch(() => []),
    getFormPayload(TABLES.CONTRACT_WORK).catch(() => null)
  ]);

  const dataRows = await hydrateBillRows(rawDataRows);
  const rawContract = contractRows.find(row => String(row.id_Conwork || "").trim() === decodedContractId);
  if (!rawContract) notFound();

  // Merge contractor details if available
  const contractor = contractorRows.find(c => String(c.id_Contractor || "").trim() === String(rawContract.id_Contractor || "").trim());
  const contract: SheetRow = {
    ...rawContract,
    "ชื่อเล่น": rawContract["ชื่อเล่น"] || contractor?.["ชื่อเล่น"] || "",
    "ชื่อ-นามสกุล": rawContract["ชื่อ-นามสกุล"] || contractor?.["ชื่อ-นามสกุล"] || "",
    "เลขบัญชี": rawContract["เลขบัญชี"] || contractor?.["เลขบัญชี"] || "",
    "ธนาคาร": rawContract["ธนาคาร"] || contractor?.["ธนาคาร"] || "",
    "บัตรประจำตัวประชาชน": rawContract["บัตรประจำตัวประชาชน"] || contractor?.["บัตรประจำตัวประชาชน"] || "",
    "เบอร์โทรศัพท์": rawContract["เบอร์โทรศัพท์"] || contractor?.["เบอร์โทรศัพท์"] || "",
    "ที่อยู่": rawContract["ที่อยู่"] || contractor?.["ที่อยู่"] || "",
  };

  const relatedRows = dataRows.filter(row => relatedToContract(row, decodedContractId) && isCommittedBill(row));
  const displayName = valueOf(contract, ["ชื่อเล่น", "ชื่อ-นามสกุล", "id_Contractor"]) || decodedContractId;
  const projectName = valueOf(contract, ["ชื่อ Project", "ID Project"]) || "-";
  const paid = toAmount(valueOf(contract, ["ยอดเงินจ่าย"]));
  const total = toAmount(valueOf(contract, ["ยอดเงินจ้าง"]));
  const remaining = toAmount(valueOf(contract, ["ค่าแรงคงเหลือ"])) || total - paid;
  const payPercent = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

  return (
    <div className="w-full flex flex-col gap-4 p-4 sm:p-5 max-w-[1400px] mx-auto font-sans text-sm text-slate-800">

      {/* HEADER ROW */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-3">
          <Link
            href="/contract-open"
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition"
          >
            <ArrowLeft size={14} />
            <span>รายการเปิดจ้าง</span>
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-bold text-slate-700">{decodedContractId}</span>
        </div>
        <ContractDetailEditButton form={form} row={contract} />
      </div>

      {/* TITLE & META */}
      <div>
        <h1 className="text-lg font-bold text-slate-900">{displayName}</h1>
        <p className="text-xs text-slate-500 mt-0.5">โครงการ: <span className="font-semibold text-slate-700">{projectName}</span></p>
      </div>

      {/* FINANCIAL SUMMARY */}
      <div className="grid grid-cols-3 gap-3">
        <div className="border border-slate-200 rounded-md p-3 bg-white">
          <div className="text-[11px] text-slate-400 font-medium mb-1">ยอดเงินจ้างรวม</div>
          <div className="text-base font-bold text-slate-900">{money(total)}</div>
        </div>
        <div className="border border-slate-200 rounded-md p-3 bg-white">
          <div className="text-[11px] text-slate-400 font-medium mb-1">ยอดจ่ายแล้ว</div>
          <div className="text-base font-bold text-emerald-700">{money(paid)}</div>
          <div className="mt-1.5 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${payPercent}%` }} />
          </div>
        </div>
        <div className="border border-slate-200 rounded-md p-3 bg-white">
          <div className="text-[11px] text-slate-400 font-medium mb-1">ค่าแรงคงเหลือ</div>
          <div className={`text-base font-bold ${remaining < 0 ? "text-rose-600" : "text-slate-900"}`}>
            {money(remaining)}
            {remaining < 0 && <span className="text-[10px] text-rose-500 ml-1">จ่ายเกิน</span>}
          </div>
        </div>
      </div>

      {/* DETAIL + RELATED BILLS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* Left: Contract Info Table */}
        <div className="lg:col-span-4 border border-slate-200 rounded-md bg-white overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-200 bg-slate-50">
            <h2 className="text-xs font-bold text-slate-700">ข้อมูลสัญญาและผู้รับเหมา</h2>
          </div>
          <table className="w-full text-xs">
            <tbody className="divide-y divide-slate-100">
              {DETAIL_FIELDS.map(field => {
                const val = contract[field];
                const isAmount = amountField(field);
                return (
                  <tr key={field}>
                    <td className="px-3 py-2 text-slate-500 font-medium whitespace-nowrap w-[38%]">{field}</td>
                    <td className={`px-3 py-2 font-semibold ${isAmount ? "text-indigo-700" : "text-slate-800"}`}>
                      {formatDetailValue(field, val)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Right: Related Bills */}
        <div className="lg:col-span-8">
          <DataTable
            columns={RELATED_COLUMNS}
            rows={relatedRows}
            title="รายการบิลเบิกจ่ายที่เกี่ยวข้อง"
            subtitle={`ประวัติบิลเบิกจ่ายภายใต้สัญญา ${decodedContractId}`}
            rowLabel="รายการ"
            limit={50}
          />
        </div>
      </div>
    </div>
  );
}

function relatedToContract(row: SheetRow, contractId: string) {
  return String(row["ผู้รับเหมา"] || row.id_Conwork || "").trim() === contractId;
}

function valueOf(row: SheetRow, columns: string[]) {
  for (const column of columns) {
    const value = row[column];
    if (value !== undefined && value !== null && String(value).trim() !== "") return String(value);
  }
  return "";
}

function toAmount(value: string) {
  const parsed = Number(String(value || "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function amountField(field: string) {
  return /ยอด|เงิน|ค่าแรง/.test(field);
}

function formatDetailValue(field: string, value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (amountField(field)) return money(toAmount(String(value)));
  return String(value);
}
