"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortDesc, setSortDesc] = useState(true);

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
    <div className="w-full flex flex-col gap-4 p-4 sm:p-5 max-w-[1600px] mx-auto font-sans text-sm text-slate-800">
      {/* 1. SUMMARY KPI CARDS (2x2 on Mobile, 4-col on Desktop) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-white rounded-md p-2.5 sm:p-3 border border-slate-200 shadow-2xs">
          <span className="text-[11px] sm:text-xs font-semibold text-slate-500 block truncate">สัญญาจ้างทั้งหมด</span>
          <div className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">{filteredRows.length} รายการ</div>
        </div>

        <div className="bg-white rounded-md p-2.5 sm:p-3 border border-slate-200 shadow-2xs">
          <span className="text-[11px] sm:text-xs font-semibold text-slate-500 block truncate">ยอดเงินจ้างรวม</span>
          <div className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">{money(totalHire)}</div>
        </div>

        <div className="bg-white rounded-md p-2.5 sm:p-3 border border-slate-200 shadow-2xs">
          <span className="text-[11px] sm:text-xs font-semibold text-slate-500 block truncate">ยอดจ่ายแล้วรวม</span>
          <div className="text-base sm:text-lg font-bold text-emerald-700 mt-0.5">{money(totalPaid)}</div>
        </div>

        <div className="bg-white rounded-md p-2.5 sm:p-3 border border-slate-200 shadow-2xs">
          <span className="text-[11px] sm:text-xs font-semibold text-slate-500 block truncate">ค่าแรงคงเหลือรวม</span>
          <div className="text-base sm:text-lg font-bold text-amber-700 mt-0.5">{money(totalRemaining)}</div>
        </div>
      </div>

      {/* 2. FILTER TOOLBAR */}
      <div className="border border-slate-200 rounded-md p-3 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        {/* Search Input */}
        <div className="relative flex items-center flex-1 min-w-[240px] max-w-md">
          <Search size={14} className="absolute left-2.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ Project, ID, สัญญาจ้าง, ผู้รับเหมา..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-white text-slate-800 text-xs pl-8 pr-7 py-1 rounded-md border border-slate-300 focus:outline-none focus:border-slate-500 placeholder:text-slate-400"
          />
          {searchTerm && (
            <X size={14} className="absolute right-2 text-slate-400 cursor-pointer hover:text-slate-600" onClick={() => setSearchTerm("")} />
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSortDesc(cur => !cur)}
            className="px-3 py-1 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-md text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
            title="สลับการเรียงลำดับ"
          >
            {sortDesc ? <ArrowDownWideNarrow size={14} className="text-slate-600" /> : <ArrowUpWideNarrow size={14} className="text-slate-600" />}
            <span>{sortDesc ? "ล่าสุดก่อน" : "เก่าสุดก่อน"}</span>
          </button>

          <FormModal
            key="form-modal-contract-open"
            form={activeForm}
            buttonLabel="เปิดจ้างงาน"
            title="เปิดจ้างงานรับเหมา"
            submitPath="/api/rows"
            openEventName="open-contract-form"
          />
        </div>
      </div>

      {/* 3. WORK TABLE */}
      <div className="border border-slate-200 rounded-md bg-white overflow-hidden">
        {!visibleRows.length ? (
          <div className="p-8 text-center text-slate-400 text-xs font-medium">ไม่พบรายการสัญญาจ้าง</div>
        ) : (
          <div className="overflow-x-auto">
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
        )}

        {/* PAGINATION */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 border-t border-slate-200 text-xs text-slate-600 bg-slate-50">
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
                  className={`px-2 py-0.5 rounded text-xs font-semibold transition cursor-pointer ${opt === pageSize ? "bg-slate-900 text-white" : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
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
      </div>
    </div>
  );
}

