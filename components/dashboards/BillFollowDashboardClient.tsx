"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  FileCheck,
  Receipt,
  Search,
  X,
} from "lucide-react";
import { money, toNumber } from "@/lib/numbers";
import { formatDateDisplay, normalizeDateToIso } from "@/lib/dates";
import type { SheetRow } from "@/lib/types";

const PAGE_SIZE_OPTIONS = [20, 40, 60, 100];

type BillFollowDashboardClientProps = {
  vatRows: SheetRow[];
  naturalDeductRows: SheetRow[];
  companyDeductRows: SheetRow[];
  creditRows: SheetRow[];
  requesterNames: Record<string, string>;
  peopleRows?: SheetRow[];
};

export function BillFollowDashboardClient({
  vatRows,
  naturalDeductRows,
  companyDeductRows,
  creditRows,
  requesterNames,
  peopleRows = [],
}: BillFollowDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<"all" | "vat" | "natural" | "company" | "credit">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRequester, setSelectedRequester] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);

  // Combine rows according to active tab
  const allPendingRows = useMemo(() => {
    const map = new Map<string, SheetRow>();
    [...vatRows, ...naturalDeductRows, ...companyDeductRows, ...creditRows].forEach((row) => {
      const key = String(row._sheetRow || row["ลำดับ"] || Math.random());
      map.set(key, row);
    });
    return Array.from(map.values());
  }, [vatRows, naturalDeductRows, companyDeductRows, creditRows]);

  const activeCategoryRows = useMemo(() => {
    switch (activeTab) {
      case "vat":
        return vatRows;
      case "natural":
        return naturalDeductRows;
      case "company":
        return companyDeductRows;
      case "credit":
        return creditRows;
      default:
        return allPendingRows;
    }
  }, [activeTab, vatRows, naturalDeductRows, companyDeductRows, creditRows, allPendingRows]);

  // Filtered rows by requester, date, and search term
  const filteredRows = useMemo(() => {
    return activeCategoryRows.filter((row) => {
      // Filter by requester
      if (selectedRequester && String(row["ผู้เบิก"] || "").trim() !== selectedRequester) {
        return false;
      }
      // Filter by date
      if (selectedDate) {
        const rowIso = normalizeDateToIso(row["ว/ด/ป"]);
        if (rowIso !== selectedDate) return false;
      }
      // Filter by search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const match =
          String(row["ลำดับ"] || "").toLowerCase().includes(q) ||
          String(row["ร้าน/บุคคล"] || "").toLowerCase().includes(q) ||
          String(row["ชื่อ Project"] || "").toLowerCase().includes(q) ||
          String(row["สินค้า/ทำงาน"] || row["รายการ"] || "").toLowerCase().includes(q) ||
          String(row["ผู้เบิก"] || "").toLowerCase().includes(q) ||
          String(row["บิล"] || "").toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [activeCategoryRows, selectedRequester, selectedDate, searchTerm]);

  // Financial totals
  const vatTotal = useMemo(() => vatRows.reduce((sum, r) => sum + toNumber(r["ยอดเงิน"]), 0), [vatRows]);
  const naturalTotal = useMemo(() => naturalDeductRows.reduce((sum, r) => sum + toNumber(r["ยอดเงิน"]), 0), [naturalDeductRows]);
  const companyTotal = useMemo(() => companyDeductRows.reduce((sum, r) => sum + toNumber(r["ยอดเงิน"]), 0), [companyDeductRows]);
  const creditTotal = useMemo(() => creditRows.reduce((sum, r) => sum + toNumber(r["ยอดเงิน"]), 0), [creditRows]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleStart = filteredRows.length > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const visibleEnd = Math.min(currentPage * pageSize, filteredRows.length);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const handleTabChange = (tab: "all" | "vat" | "natural" | "company" | "credit") => {
    setActiveTab(tab);
    setPage(1);
  };

  return (
    <div className="w-full flex flex-col gap-5 p-4 sm:p-6 max-w-[1600px] mx-auto font-sans">
      {/* 1. EXECUTIVE SUMMARY KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Vat Card */}
        <div
          onClick={() => handleTabChange("vat")}
          className={`bg-white rounded-2xl p-4.5 border transition-all cursor-pointer shadow-2xs ${
            activeTab === "vat" ? "border-amber-400 ring-2 ring-amber-100" : "border-slate-200/90 hover:border-amber-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">ตาม VAT (ยังไม่ได้บิล)</span>
            <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <FileCheck size={18} />
            </span>
          </div>
          <div className="text-xl font-extrabold text-slate-900 mt-2">{vatRows.length} รายการ</div>
          <div className="text-xs font-semibold text-amber-700 mt-1">{money(vatTotal)}</div>
        </div>

        {/* Natural Deduct 3% Card */}
        <div
          onClick={() => handleTabChange("natural")}
          className={`bg-white rounded-2xl p-4.5 border transition-all cursor-pointer shadow-2xs ${
            activeTab === "natural" ? "border-indigo-400 ring-2 ring-indigo-100" : "border-slate-200/90 hover:border-indigo-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">ตาม หัก 3% (บุคคล)</span>
            <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Receipt size={18} />
            </span>
          </div>
          <div className="text-xl font-extrabold text-slate-900 mt-2">{naturalDeductRows.length} รายการ</div>
          <div className="text-xs font-semibold text-indigo-700 mt-1">{money(naturalTotal)}</div>
        </div>

        {/* Company Deduct 3% Card */}
        <div
          onClick={() => handleTabChange("company")}
          className={`bg-white rounded-2xl p-4.5 border transition-all cursor-pointer shadow-2xs ${
            activeTab === "company" ? "border-emerald-400 ring-2 ring-emerald-100" : "border-slate-200/90 hover:border-emerald-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">ตาม หัก 3% (บริษัท)</span>
            <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Building2 size={18} />
            </span>
          </div>
          <div className="text-xl font-extrabold text-slate-900 mt-2">{companyDeductRows.length} รายการ</div>
          <div className="text-xs font-semibold text-emerald-700 mt-1">{money(companyTotal)}</div>
        </div>

        {/* Credit Card */}
        <div
          onClick={() => handleTabChange("credit")}
          className={`bg-white rounded-2xl p-4.5 border transition-all cursor-pointer shadow-2xs ${
            activeTab === "credit" ? "border-rose-400 ring-2 ring-rose-100" : "border-slate-200/90 hover:border-rose-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">ตาม เครดิต (รอจ่าย)</span>
            <span className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <Clock size={18} />
            </span>
          </div>
          <div className="text-xl font-extrabold text-slate-900 mt-2">{creditRows.length} รายการ</div>
          <div className="text-xs font-semibold text-rose-700 mt-1">{money(creditTotal)}</div>
        </div>
      </div>

      {/* 2. FILTER & ACTION TOOLBAR (MATCHING WITHDRAW DASHBOARD) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left Filters */}
        <div className="flex flex-wrap items-center gap-3 text-xs flex-1">
          {/* Requester dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 whitespace-nowrap">ผู้เบิก:</span>
            <select
              value={selectedRequester}
              onChange={(e) => {
                setSelectedRequester(e.target.value);
                setPage(1);
              }}
              className="bg-slate-50 hover:bg-slate-100/90 text-slate-800 text-xs font-semibold px-3 py-2 h-9 rounded-xl border border-slate-200 focus:bg-white focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer"
            >
              <option value="">ทั้งหมด</option>
              {peopleRows.map((row) => {
                const key = String(row["รหัสพนักงาน"] || row["ชื่อเล่น"] || row._sheetRow || "").trim();
                const label = row["ชื่อเล่น"] ? `${key} - ${row["ชื่อเล่น"]}` : key;
                return key ? (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ) : null;
              })}
            </select>
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 whitespace-nowrap">วันที่:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setPage(1);
              }}
              className="bg-slate-50 hover:bg-slate-100/90 text-slate-800 text-xs font-semibold px-3 py-1.5 h-9 rounded-xl border border-slate-200 focus:bg-white focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer"
            />
          </div>

          {/* Live Search */}
          <div className="relative flex items-center h-9 flex-1 min-w-[220px] max-w-md">
            <Search size={15} className="absolute left-3 text-slate-400 pointer-events-none z-10" />
            <input
              type="text"
              placeholder="ค้นหาลำดับ, ร้านค้า, Project, รายการ..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              style={{ paddingLeft: "36px", paddingRight: "30px" }}
              className="w-full h-full bg-slate-50 hover:bg-slate-100/90 focus:bg-white text-slate-800 text-xs font-medium rounded-xl border border-slate-200 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-400"
            />
            {searchTerm && (
              <X
                size={14}
                className="absolute right-2.5 text-slate-400 cursor-pointer hover:text-slate-700 z-10"
                onClick={() => {
                  setSearchTerm("");
                  setPage(1);
                }}
              />
            )}
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
          <button
            type="button"
            onClick={() => handleTabChange("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "all" ? "bg-slate-900 text-white shadow-2xs" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            ทั้งหมด ({allPendingRows.length})
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("vat")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "vat" ? "bg-amber-600 text-white shadow-2xs" : "text-amber-700 hover:bg-amber-50"
            }`}
          >
            ตาม VAT ({vatRows.length})
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("natural")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "natural" ? "bg-indigo-600 text-white shadow-2xs" : "text-indigo-700 hover:bg-indigo-50"
            }`}
          >
            หัก 3% บุคคล ({naturalDeductRows.length})
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("company")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "company" ? "bg-emerald-600 text-white shadow-2xs" : "text-emerald-700 hover:bg-emerald-50"
            }`}
          >
            หัก 3% บริษัท ({companyDeductRows.length})
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("credit")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "credit" ? "bg-rose-600 text-white shadow-2xs" : "text-rose-700 hover:bg-rose-50"
            }`}
          >
            เครดิต ({creditRows.length})
          </button>
        </div>
      </div>

      {/* 3. PRO HIGH-DENSITY TABLE (MATCHING WITHDRAW DASHBOARD) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead>
              <tr className="bg-slate-200 text-slate-900 font-extrabold border-b-2 border-slate-300 uppercase tracking-wider text-[11px]">
                <th className="py-1 px-2.5 w-12 text-center bg-slate-200 text-slate-900">ดู</th>
                <th className="py-1 px-2.5 w-20 bg-slate-200 text-slate-900">ลำดับ</th>
                <th className="py-1 px-2.5 min-w-[150px] bg-slate-200 text-slate-900">ร้าน/บุคคล</th>
                <th className="py-1 px-2.5 min-w-[160px] bg-slate-200 text-slate-900">Project</th>
                <th className="py-1 px-2.5 min-w-[180px] bg-slate-200 text-slate-900">สินค้า/ทำงาน</th>
                <th className="py-1 px-2.5 w-28 bg-slate-200 text-slate-900">วันที่</th>
                <th className="py-1 px-2.5 w-28 bg-slate-200 text-slate-900">ผู้เบิก</th>
                <th className="py-1 px-2.5 text-right w-32 bg-slate-200 text-slate-900">ยอดเงิน</th>
                <th className="py-1 px-2.5 text-center min-w-[150px] bg-slate-200 text-slate-900">เงื่อนไขการตามบิล</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRows.map((row, index) => {
                const billId = String(row["ลำดับ"] || row._sheetRow || index);
                const vendor = String(row["ร้าน/บุคคล"] || "-");
                const project = String(row["ชื่อ Project"] || "-");
                const item = String(row["สินค้า/ทำงาน"] || row["รายการ"] || "-");
                const date = formatDateDisplay(row["ว/ด/ป"]);
                const requesterCode = String(row["ผู้เบิก"] || "").trim();
                const requesterName = requesterNames[requesterCode] || requesterCode || "-";
                const amount = toNumber(row["ยอดเงิน"]);

                const hasVat = toNumber(row.vat) > 0 && !row["วันได้บิล"];
                const hasDeduct = toNumber(row["หัก"]) > 0 && !row["วันออก 3%"];
                const isCompany = String(row["statusค่าแรง"] || "").trim() === "บริษัท";
                const hasCredit = Boolean(row["เครดิต"]) && !row["วันจ่าย"];

                return (
                  <tr key={`${billId}-${index}`} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="py-2.5 px-3.5 text-center">
                      <Link
                        href={`/bills/${encodeURIComponent(billId)}`}
                        className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-indigo-600 text-slate-600 group-hover:text-white flex items-center justify-center transition mx-auto shadow-2xs"
                        title="ดูรายละเอียดบิล"
                      >
                        <Eye size={15} />
                      </Link>
                    </td>

                    <td className="py-2.5 px-3.5 font-mono font-bold text-slate-800">
                      #{billId}
                    </td>

                    <td className="py-2.5 px-3.5 font-bold text-slate-900">
                      {vendor}
                    </td>

                    <td className="py-2.5 px-3.5 text-slate-600">
                      {project}
                    </td>

                    <td className="py-2.5 px-3.5 text-slate-600">
                      {item}
                    </td>

                    <td className="py-2.5 px-3.5 text-slate-500 font-mono">
                      {date}
                    </td>

                    <td className="py-2.5 px-3.5 text-slate-600">
                      {requesterName}
                    </td>

                    <td className="py-2.5 px-3.5 text-right font-extrabold text-slate-900">
                      {money(amount)}
                    </td>

                    <td className="py-2.5 px-3.5 text-center">
                      <div className="flex flex-wrap items-center justify-center gap-1">
                        {hasVat && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            vat {row.vat}
                          </span>
                        )}
                        {hasDeduct && (
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              isCompany
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                            }`}
                          >
                            หัก {row["หัก"]}% {isCompany ? "(บ.)" : "(บุคคล)"}
                          </span>
                        )}
                        {hasCredit && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            เครดิต {row["เครดิต"]} วัน
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!paginatedRows.length && (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400 text-xs font-medium">
                    ไม่พบรายการตามบิลที่ค้นหา
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 4. PRO PAGINATION TOOLBAR (EXACT MATCH WITHDRAW DASHBOARD) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-200/90 text-xs text-slate-500 bg-slate-50/50">
          <div>
            แสดง {visibleStart}-{visibleEnd} จาก {filteredRows.length} รายการ
          </div>

          <div className="flex items-center gap-4">
            {/* Rows per page */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-semibold">แสดงต่อหน้า:</span>
              {PAGE_SIZE_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    setPageSize(opt);
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    opt === pageSize ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>

            {/* Page prev next navigation */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
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
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
