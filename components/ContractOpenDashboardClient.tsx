"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowDownWideNarrow, ArrowUpWideNarrow, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { FormModal } from "@/components/FormModal";
import { FORM_SCHEMAS } from "@/lib/schemas";
import { money, toNumber } from "@/lib/numbers";
import type { SheetRow } from "@/lib/types";

type ContractOpenDashboardClientProps = {
  columns: string[];
  initialRows: SheetRow[];
  form: any;
};

const PAGE_SIZE_OPTIONS = [20, 50, 100, 200];

export function ContractOpenDashboardClient({
  columns,
  initialRows,
  form,
}: ContractOpenDashboardClientProps) {
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get("search") || "";
  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortDesc, setSortDesc] = useState(true);

  useEffect(() => {
    setSearchTerm(urlSearch);
  }, [urlSearch]);

  const activeForm = form || {
    tableName: "contract_works",
    schema: FORM_SCHEMAS["contract_works"] || [],
    initialValues: {},
    refOptions: {}
  };

  const filteredRows = useMemo(() => {
    let list = initialRows;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(row =>
        Object.values(row).some(val => String(val || "").toLowerCase().includes(q))
      );
    }
    return [...list].sort((a, b) => {
      const seqA = Number(a._sheetRow || a["id_Conwork"] || a.id || 0);
      const seqB = Number(b._sheetRow || b["id_Conwork"] || b.id || 0);
      return sortDesc ? seqB - seqA : seqA - seqB;
    });
  }, [initialRows, searchTerm, sortDesc]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const visibleRows = filteredRows.slice(pageStart, pageStart + pageSize);
  const visibleStart = visibleRows.length ? pageStart + 1 : 0;
  const visibleEnd = pageStart + visibleRows.length;

  const totalHire = useMemo(() => filteredRows.reduce((sum, r) => sum + toNumber(r["ยอดเงินจ้าง"]), 0), [filteredRows]);
  const totalPaid = useMemo(() => filteredRows.reduce((sum, r) => sum + toNumber(r["ยอดเงินจ่าย"]), 0), [filteredRows]);
  const totalRemaining = totalHire - totalPaid;

  useEffect(() => {
    setPage(1);
  }, [searchTerm, pageSize]);

  return (
    <div className="w-full flex flex-col gap-3 p-3 sm:p-5 max-w-[1600px] mx-auto font-sans text-sm text-slate-800">
      {/* Active FormModal Listener for Header Lime Green + Button */}
      <FormModal
        key="form-modal-contract-open-global"
        form={activeForm}
        buttonLabel="เปิดจ้างงาน"
        title="เปิดจ้างงานรับเหมา"
        submitPath="/api/rows"
        openEventName="open-contract-form"
        hideLauncher={true}
      />

      {/* 1. SUMMARY KPI CARDS (2x2 on Mobile, 4 Columns on Desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <div className="bg-white rounded-xl md:rounded-md p-2.5 sm:p-3 border border-slate-200 shadow-2xs">
          <span className="text-[10px] sm:text-xs font-semibold text-slate-500 block truncate">สัญญาจ้างทั้งหมด</span>
          <div className="text-sm sm:text-lg font-bold text-slate-900 mt-0.5">{filteredRows.length} <span className="text-[11px] font-normal text-slate-500">สัญญา</span></div>
        </div>

        <div className="bg-white rounded-xl md:rounded-md p-2.5 sm:p-3 border border-slate-200 shadow-2xs">
          <span className="text-[10px] sm:text-xs font-semibold text-slate-500 block truncate">ยอดเงินจ้างรวม</span>
          <div className="text-sm sm:text-lg font-bold text-slate-900 mt-0.5">{money(totalHire)}</div>
        </div>

        <div className="bg-white rounded-xl md:rounded-md p-2.5 sm:p-3 border border-slate-200 shadow-2xs">
          <span className="text-[10px] sm:text-xs font-semibold text-slate-500 block truncate">ยอดจ่ายแล้วรวม</span>
          <div className="text-sm sm:text-lg font-bold text-emerald-700 mt-0.5">{money(totalPaid)}</div>
        </div>

        <div className="bg-white rounded-xl md:rounded-md p-2.5 sm:p-3 border border-slate-200 shadow-2xs">
          <span className="text-[10px] sm:text-xs font-semibold text-slate-500 block truncate">ค่าแรงคงเหลือรวม</span>
          <div className="text-sm sm:text-lg font-bold text-amber-700 mt-0.5">{money(totalRemaining)}</div>
        </div>
      </div>

      {/* 2. FILTER TOOLBAR & SEARCH */}
      {/* 2. UNIVERSAL SEARCH & SORT TOOLBAR */}
      <div className="border border-slate-200 rounded-xl md:rounded-md p-2 sm:p-2.5 bg-white flex items-center justify-between gap-2 text-xs shadow-2xs">
        {/* Search Input */}
        <div className="relative flex items-center flex-1 min-w-0">
          <Search size={14} className="absolute left-2.5 text-slate-400 pointer-events-none shrink-0" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ Project, ID, สัญญา, ผู้รับเหมา..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 md:bg-white text-slate-800 text-xs pl-8 pr-7 py-1.5 rounded-lg md:rounded-md border border-slate-200 md:border-slate-300 focus:outline-none focus:bg-white focus:border-slate-400 placeholder:text-slate-400"
          />
          {searchTerm && (
            <X size={14} className="absolute right-2 text-slate-400 cursor-pointer hover:text-slate-600" onClick={() => setSearchTerm("")} />
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setSortDesc(cur => !cur)}
            className="px-2.5 py-1.5 border border-slate-200 md:border-slate-300 bg-slate-50 md:bg-white hover:bg-slate-100 text-slate-700 rounded-lg md:rounded-md text-xs font-semibold flex items-center justify-center gap-1 transition cursor-pointer whitespace-nowrap active:scale-95 shadow-2xs"
            title="สลับการเรียงลำดับ"
          >
            {sortDesc ? <ArrowDownWideNarrow size={13} className="text-slate-600" /> : <ArrowUpWideNarrow size={13} className="text-slate-600" />}
            <span className="text-[11px] sm:text-xs">{sortDesc ? "ล่าสุด" : "เก่าสุด"}</span>
          </button>

          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("open-contract-form"))}
            className="hidden sm:flex px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-bold transition cursor-pointer items-center gap-1.5 shadow-2xs whitespace-nowrap active:scale-95"
          >
            <span>+ เปิดจ้างงาน</span>
          </button>
        </div>
      </div>

      {/* 3. WORK TABLE / MOBILE HIGH-DENSITY CARD FEED */}
      <div className="border border-slate-200 rounded-xl md:rounded-md bg-white overflow-hidden shadow-2xs">
        {!visibleRows.length ? (
          <div className="p-8 text-center text-slate-400 text-xs font-medium">ไม่พบรายการสัญญาจ้าง</div>
        ) : (
          <>
            {/* MOBILE HIGH-DENSITY CONTRACT CARD FEED */}
            <div className="block md:hidden divide-y divide-slate-100">
              {visibleRows.map((row, idx) => {
                const contractId = String(row["id_Conwork"] || row._sheetRow || row.id || idx + 1);
                const projectId = String(row["ID Project"] || "");
                const projectName = String(row["ชื่อ Project"] || "-");
                const workDetails = String(row["รายละเอียดงาน"] || "-");
                const contractorName = String(row["ชื่อเล่น"] || row["ชื่อ-นามสกุล"] || row["ผู้รับเหมา"] || "");
                const hireAmount = toNumber(row["ยอดเงินจ้าง"]);
                const paidAmount = toNumber(row["ยอดเงินจ่าย"]);
                const remaining = hireAmount - paidAmount;
                const payPercent = hireAmount > 0 ? Math.min(100, Math.round((paidAmount / hireAmount) * 100)) : 0;

                return (
                  <div
                    key={`mob-contract-${contractId}-${idx}`}
                    onClick={() => window.location.href = `/contract-open/${encodeURIComponent(contractId)}`}
                    className="p-3 hover:bg-slate-50 active:bg-slate-100 transition cursor-pointer space-y-2"
                  >
                    {/* Header Row: Contract ID + Project Name */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-bold text-[11px] bg-slate-900 text-white px-1.5 py-0.2 rounded shrink-0">
                          #{contractId}
                        </span>
                        <span className="font-bold text-xs text-slate-900 truncate">
                          {projectId ? `[${projectId}] ` : ""}{projectName}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-900 shrink-0">
                        {money(hireAmount)} ฿
                      </span>
                    </div>

                    {/* Work Details & Contractor */}
                    <div className="text-xs text-slate-600 font-medium line-clamp-1">
                      {workDetails}
                    </div>

                    {/* Contractor Name & Date */}
                    {contractorName && (
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 truncate">
                        <span className="font-semibold text-slate-700">ผู้รับเหมา:</span>
                        <span className="truncate">{contractorName}</span>
                      </div>
                    )}

                    {/* Progress Bar & Financial Breakdown */}
                    <div className="bg-slate-50 rounded-lg p-2 border border-slate-100 space-y-1.5">
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            payPercent >= 100 ? "bg-emerald-600" : "bg-sky-500"
                          }`}
                          style={{ width: `${payPercent}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">
                          จ่ายแล้ว: <strong className="text-emerald-700 font-semibold">{money(paidAmount)} ฿</strong> <span className="text-slate-400">({payPercent}%)</span>
                        </span>
                        <span className="text-slate-500">
                          คงเหลือ: <strong className={`font-semibold ${remaining > 0 ? "text-amber-700" : "text-slate-400"}`}>{money(remaining)} ฿</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* DESKTOP WORK TABLE */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 border-collapse font-sans">
                <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200 text-xs">
                  <tr>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-center">รหัสจ้าง</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-center">ID Project</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">ชื่อ Project</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">รายละเอียดงาน</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-right">ยอดเงินจ้าง</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-right">ยอดเงินจ่าย</th>
                    <th className="py-2.5 px-3 text-right">ค่าแรงคงเหลือ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleRows.map((row, idx) => {
                    const contractId = String(row["id_Conwork"] || row._sheetRow || row.id || idx + 1);
                    const projectId = String(row["ID Project"] || "-");
                    const projectName = String(row["ชื่อ Project"] || "-");
                    const workDetails = String(row["รายละเอียดงาน"] || "-");
                    const hireAmount = toNumber(row["ยอดเงินจ้าง"]);
                    const paidAmount = toNumber(row["ยอดเงินจ่าย"]);
                    const remaining = hireAmount - paidAmount;

                    return (
                      <tr
                        key={`${contractId}-${idx}`}
                        onClick={() => window.location.href = `/contract-open/${encodeURIComponent(contractId)}`}
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <td className="py-2 px-3 text-center font-bold text-slate-900 border-r border-slate-100">{contractId}</td>
                        <td className="py-2 px-3 text-center font-medium text-slate-600 border-r border-slate-100">{projectId}</td>
                        <td className="py-2 px-3 font-bold text-slate-900 max-w-[220px] truncate border-r border-slate-100" title={projectName}>
                          {projectName}
                        </td>
                        <td className="py-2 px-3 text-slate-700 max-w-[240px] truncate border-r border-slate-100" title={workDetails}>{workDetails}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900 border-r border-slate-100">{money(hireAmount)}</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-700 border-r border-slate-100">{money(paidAmount)}</td>
                        <td className={`py-2 px-3 text-right font-bold ${remaining > 0 ? "text-amber-700" : "text-slate-400"}`}>
                          {money(remaining)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* SLEEK PAGINATION */}
        {filteredRows.length > 0 && (
          <>
            {/* Mobile Minimal Pagination */}
            <div className="block md:hidden border-t border-slate-100 bg-slate-50/50">
              {totalPages <= 1 ? (
                <div className="p-3 text-center text-xs text-slate-400 font-medium">
                  แสดงทั้งหมด {filteredRows.length} รายการ
                </div>
              ) : (
                <div className="flex items-center justify-between p-2.5 sm:p-3 text-xs">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setPage(page - 1)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 transition font-semibold text-slate-700 flex items-center gap-1 cursor-pointer active:bg-slate-100 shadow-2xs"
                  >
                    <ChevronLeft size={14} />
                    <span>ก่อนหน้า</span>
                  </button>

                  <span className="font-semibold text-slate-700 text-xs">
                    หน้า {currentPage} / {totalPages} <span className="font-normal text-slate-400 text-[11px]">({filteredRows.length} รายการ)</span>
                  </span>

                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage(page + 1)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 transition font-semibold text-slate-700 flex items-center gap-1 cursor-pointer active:bg-slate-100 shadow-2xs"
                  >
                    <span>ถัดไป</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Desktop Full Pagination */}
            <div className="hidden md:flex flex-row items-center justify-between gap-3 p-3 border-t border-slate-200 text-xs text-slate-600 bg-slate-50">
              <div>
                แสดง {visibleStart}-{visibleEnd} จาก {filteredRows.length} รายการ
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className="text-slate-500 font-medium">แสดงต่อหน้า:</span>
                  {PAGE_SIZE_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setPageSize(opt)}
                      className={`px-2 py-0.5 rounded text-xs font-semibold transition cursor-pointer ${
                        opt === pageSize ? "bg-slate-900 text-white" : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setPage(page - 1)}
                    className="p-1 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer text-slate-700"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <span className="font-semibold text-slate-800 px-1">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage(page + 1)}
                    className="p-1 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer text-slate-700"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

