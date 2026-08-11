"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownWideNarrow, ArrowUpWideNarrow, ChevronLeft, ChevronRight, Eye, Search, X } from "lucide-react";
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
    <div className="w-full flex flex-col gap-5 p-4 sm:p-6 max-w-[1600px] mx-auto font-sans">
      {/* 1. EXECUTIVE SUMMARY KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">สัญญาจ้างทั้งหมด</span>
          <div className="text-xl font-extrabold text-slate-900">{filteredRows.length} รายการ</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider">ยอดเงินจ้างรวม</span>
          <div className="text-xl font-extrabold text-indigo-900">{money(totalHire)}</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">ยอดจ่ายแล้วรวม</span>
          <div className="text-xl font-extrabold text-emerald-700">{money(totalPaid)}</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider">ค่าแรงคงเหลือรวม</span>
          <div className="text-xl font-extrabold text-amber-700">{money(totalRemaining)}</div>
        </div>
      </div>

      {/* 2. PRO FILTER TOOLBAR */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex items-center h-9 flex-1 min-w-[240px] max-w-md">
          <Search size={15} className="absolute left-3 text-slate-400 pointer-events-none z-10" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ Project, ID, สัญญาจ้าง, ผู้รับเหมา..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ paddingLeft: "36px", paddingRight: "30px" }}
            className="w-full h-full bg-slate-50 hover:bg-slate-100/90 focus:bg-white text-slate-800 text-xs font-medium rounded-xl border border-slate-200 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-400"
          />
          {searchTerm && (
            <X size={14} className="absolute right-2.5 text-slate-400 cursor-pointer hover:text-slate-700 z-10" onClick={() => setSearchTerm("")} />
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSortDesc(cur => !cur)}
            className="h-9 px-3 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xs whitespace-nowrap"
            title="สลับการเรียงลำดับ"
          >
            {sortDesc ? <ArrowDownWideNarrow size={14} className="text-indigo-600" /> : <ArrowUpWideNarrow size={14} className="text-indigo-600" />}
            <span>{sortDesc ? "ล่าสุดก่อน" : "เก่าสุดก่อน"}</span>
          </button>

          <FormModal
            key="form-modal-contract-open"
            form={activeForm}
            buttonLabel="+ เปิดจ้างงาน"
            title="เปิดจ้างงานรับเหมา"
            submitPath="/api/rows"
            openEventName="open-contract-form"
          />
        </div>
      </div>

      {/* 3. PRO WORK TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {!visibleRows.length ? (
          <div className="p-10 text-center text-slate-400 text-xs font-medium">ไม่พบรายการสัญญาจ้าง</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200/90 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-2 px-3 text-center">รหัสจ้าง</th>
                  <th className="py-2 px-3 text-center">ID Project</th>
                  <th className="py-2 px-3">ชื่อ Project</th>
                  <th className="py-2 px-3">รายละเอียดงาน</th>
                  <th className="py-2 px-3 text-right">ยอดเงินจ้าง</th>
                  <th className="py-2 px-3 text-right">ยอดเงินจ่าย</th>
                  <th className="py-2 px-3 text-right">ค่าแรงคงเหลือ</th>
                  <th className="py-2 px-3 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {visibleRows.map((row, idx) => {
                  const contractId = String(row["id_Conwork"] || row._sheetRow || row.id || idx + 1);
                  const projectId = String(row["ID Project"] || "-");
                  const projectName = String(row["ชื่อ Project"] || "-");
                  const workDetails = String(row["รายละเอียดงาน"] || "-");
                  const hireAmount = toNumber(row["ยอดเงินจ้าง"]);
                  const paidAmount = toNumber(row["ยอดเงินจ่าย"]);
                  const remaining = hireAmount - paidAmount;

                  return (
                    <tr key={`${contractId}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 text-center font-bold text-slate-900">{contractId}</td>
                      <td className="p-3 text-center font-semibold text-slate-600">{projectId}</td>
                      <td className="p-3 font-extrabold text-slate-900 max-w-[220px] truncate" title={projectName}>
                        <Link href={`/contract-open/${encodeURIComponent(contractId)}`} className="hover:text-indigo-600 hover:underline">
                          {projectName}
                        </Link>
                      </td>
                      <td className="p-3 text-slate-600 max-w-[240px] truncate" title={workDetails}>{workDetails}</td>
                      <td className="p-3 text-right font-extrabold text-slate-900">{money(hireAmount)}</td>
                      <td className="p-3 text-right font-bold text-emerald-700">{money(paidAmount)}</td>
                      <td className={`p-3 text-right font-extrabold ${remaining > 0 ? "text-amber-600" : "text-slate-400"}`}>
                        {money(remaining)}
                      </td>
                      <td className="p-3 text-center">
                        <Link
                          href={`/contract-open/${encodeURIComponent(contractId)}`}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition"
                          title="ดูรายละเอียด"
                        >
                          <Eye size={15} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-200/90 text-xs text-slate-500 bg-slate-50/50">
          <div>
            แสดง {visibleStart}-{visibleEnd} จาก {filteredRows.length} รายการ
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-semibold">แสดงต่อหน้า:</span>
              {PAGE_SIZE_OPTIONS.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setPageSize(opt)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    opt === pageSize ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
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
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="font-bold text-slate-800 px-2">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
