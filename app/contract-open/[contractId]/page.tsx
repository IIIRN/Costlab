import Link from "next/link";
import { ArrowLeft, BriefcaseBusiness, Building2, CreditCard, DollarSign, FileText, Pencil, User } from "lucide-react";
import { DataTable } from "@/components/tables/DataTable";
import { isCommittedBill } from "@/lib/bill-status";
import { TABLES } from "@/lib/config";
import { hydrateBillRows, hydrateContractRows } from "@/lib/formulas";
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

  const [contractRows, rawDataRows, contractorRows] = await Promise.all([
    getRows(TABLES.CONTRACT_WORK, 15_000).then(rows => hydrateContractRows(rows)).catch(() => []),
    getRows(TABLES.DATA, 15_000).catch(() => []),
    getRows(TABLES.CONTRACTOR, 15_000).catch(() => [])
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
    <div className="w-full flex flex-col gap-6 p-4 sm:p-6 max-w-[1400px] mx-auto font-sans">
      {/* 1. EXECUTIVE HEADER BANNER */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/contract-open"
            className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition border border-slate-700"
            title="กลับไปหน้าเปิดจ้าง"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-extrabold uppercase tracking-wider">
              <BriefcaseBusiness size={15} /> Contract Work Detail · {decodedContractId}
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold mt-0.5">{displayName}</h1>
            <p className="text-slate-400 text-xs mt-1 flex items-center gap-2">
              <Building2 size={13} className="text-indigo-400" />
              <span>โครงการ: <strong className="text-slate-200">{projectName}</strong></span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/contract-open?search=${encodeURIComponent(decodedContractId)}`}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold rounded-xl transition shadow-lg shadow-indigo-600/30 flex items-center gap-2"
          >
            <Pencil size={15} />
            <span>แก้ไขสัญญา</span>
          </Link>
        </div>
      </div>

      {/* 2. FINANCIAL METRICS SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Total Contract */}
        <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
            <span>ยอดเงินจ้างรวม</span>
            <DollarSign size={16} className="text-slate-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
            {money(total)}
          </div>
          <p className="text-xs text-slate-400 font-medium">มูลค่าสัญญางานรับเหมาทั้งหมด</p>
        </div>

        {/* Card 2: Paid Amount */}
        <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
            <span>ยอดเงินจ่ายแล้ว</span>
            <CreditCard size={16} className="text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 font-mono">
            {money(paid)}
          </div>
          <div className="flex items-center gap-2 text-xs text-emerald-700 font-bold">
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex-1">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${payPercent}%` }}
              />
            </div>
            <span>{payPercent}%</span>
          </div>
        </div>

        {/* Card 3: Remaining Balance */}
        <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
            <span>ค่าแรงคงเหลือ</span>
            <FileText size={16} className={remaining < 0 ? "text-rose-500" : "text-amber-500"} />
          </div>
          <div className={`text-2xl sm:text-3xl font-extrabold font-mono ${remaining < 0 ? "text-rose-600" : "text-slate-900"}`}>
            {money(remaining)}
          </div>
          <p className="text-xs text-slate-400 font-medium">
            {remaining < 0 ? "⚠️ จ่ายเกินสัญญาจ้าง" : "จำนวนเงินคงเหลือผูกมัด"}
          </p>
        </div>
      </div>

      {/* 3. DETAILS & RELATED DATA WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Contract Information Card */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <User size={16} className="text-indigo-600" />
              <span>ข้อมูลสัญญาและผู้รับเหมา</span>
            </h3>
            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-mono font-bold">
              {decodedContractId}
            </span>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {DETAIL_FIELDS.map(field => {
              const val = contract[field];
              const isAmount = amountField(field);
              return (
                <div key={field} className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/60 space-y-1">
                  <dt className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{field}</dt>
                  <dd className={`font-bold ${isAmount ? "text-indigo-700 font-mono text-xs" : "text-slate-800"}`}>
                    {formatDetailValue(field, val)}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>

        {/* Right Column: Related Disbursement Bills Table Directly Integrated */}
        <div className="lg:col-span-7">
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
