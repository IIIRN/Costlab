"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Banknote, Check, ChevronLeft, ChevronRight, Filter, List, LoaderCircle, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { money, toNumber } from "@/lib/numbers";
import type { SheetRow } from "@/lib/types";
import { formatDateDisplay, normalizeDateToIso, parseDateStrict } from "@/lib/dates";

export type WithdrawFilters = {
  requester?: string;
  date?: string;
  bill?: string;
  search?: string;
};

type WithdrawDashboardClientProps = {
  rows: SheetRow[];
  peopleRows: SheetRow[];
  initialFilters?: WithdrawFilters;
  isAdmin?: boolean;
};

const ALL_COLUMNS = ["ลำดับ", "ID Project", "ชื่อ Project", "ร้าน/บุคคล", "สินค้า/ทำงาน", "บิล", "ประเภท", "ยอดเงิน", "ยอดโอน", "ผู้เบิก", "ว/ด/ป", "สถานะ", "จัดการ"];
const PAGE_SIZE_OPTIONS = [20, 50, 100, 200];

export function WithdrawDashboardClient({ rows, peopleRows, initialFilters = {}, isAdmin = false }: WithdrawDashboardClientProps) {
  const router = useRouter();
  const columns = useMemo(() => isAdmin ? ALL_COLUMNS : ALL_COLUMNS.filter(c => c !== "จัดการ"), [isAdmin]);
  const [filters, setFilters] = useState(() => normalizeFilters(initialFilters));
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusOverrides, setStatusOverrides] = useState<Record<number, string>>({});
  const [approvingRow, setApprovingRow] = useState<number | null>(null);
  const [actionError, setActionError] = useState("");
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [isBatchApproving, setIsBatchApproving] = useState(false);

  useEffect(() => {
    setFilters(normalizeFilters(initialFilters));
  }, [initialFilters.requester, initialFilters.date, initialFilters.bill, initialFilters.search]);

  const displayRows = useMemo(() => {
    const currentRows = rows.map(row => {
      const override = statusOverrides[Number(row._sheetRow)];
      return override ? { ...row, "สถานะ": override } : row;
    });
    return filterWithdrawRows(currentRows, filters)
      .filter(row => normalizedStatus(row["สถานะ"]) !== "เบิกแล้ว")
      .sort((a, b) => Number(b._sheetRow || 0) - Number(a._sheetRow || 0));
  }, [rows, filters, statusOverrides]);

  const totalPages = Math.max(1, Math.ceil(displayRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const visibleRows = displayRows.slice(pageStart, pageStart + pageSize);
  const visibleStart = visibleRows.length ? pageStart + 1 : 0;
  const visibleEnd = pageStart + visibleRows.length;
  const amount = displayRows.reduce((sum, row) => sum + toNumber(row["ยอดเงิน"]), 0);
  const transfer = displayRows.reduce((sum, row) => sum + toNumber(row["ยอดโอน"]), 0);
  const requesterNames = useMemo(() => requesterNameMap(peopleRows), [peopleRows]);

  useEffect(() => {
    setPage(1);
  }, [filters.requester, filters.date, filters.bill, filters.search, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  function updateFilter(name: keyof WithdrawFilters, value: string) {
    setFilters(current => ({ ...current, [name]: value }));
  }

  async function approveRow(row: SheetRow) {
    const sheetRow = Number(row._sheetRow);
    if (!Number.isInteger(sheetRow) || sheetRow < 2) return;
    const currentStatus = normalizedStatus(row["สถานะ"]);
    const nextStatus = currentStatus === "อนุมัติ" ? "เบิกแล้ว" : currentStatus === "ตั้งเบิก" ? "อนุมัติ" : "ตั้งเบิก";
    setApprovingRow(sheetRow);
    setActionError("");
    try {
      const response = await fetch("/api/rows", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableName: "Data", sheetRow, values: { "สถานะ": nextStatus } })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "อนุมัติไม่สำเร็จ");
      setStatusOverrides(current => ({ ...current, [sheetRow]: nextStatus }));
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "อนุมัติไม่สำเร็จ");
    } finally {
      setApprovingRow(null);
    }
  }

  async function approveSelected() {
    if (selectedRows.size === 0) return;
    setIsBatchApproving(true);
    setActionError("");

    try {
      const updates = Array.from(selectedRows).map(async (sheetRow) => {
        const targetRow = rows.find(r => Number(r._sheetRow) === sheetRow);
        if (!targetRow) return;
        const currentStatus = normalizedStatus(targetRow["สถานะ"]);
        const nextStatus = currentStatus === "ตั้งเบิก" ? "อนุมัติ" : "เบิกแล้ว";

        const res = await fetch("/api/rows", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tableName: "Data", sheetRow, values: { "สถานะ": nextStatus } })
        });
        if (res.ok) {
          setStatusOverrides(current => ({ ...current, [sheetRow]: nextStatus }));
        }
      });

      await Promise.all(updates);
      setSelectedRows(new Set());
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "อัพเดทไม่สำเร็จ");
    } finally {
      setIsBatchApproving(false);
    }
  }

  return (
    <div className="w-full flex flex-col gap-5 p-4 sm:p-6 max-w-[1600px] mx-auto font-sans">
      {/* 1. EXECUTIVE SUMMARY KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4.5 border border-slate-200/90 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">รายการตั้งเบิกคงเหลือ</span>
          <div className="text-xl font-extrabold text-slate-900">{displayRows.length} รายการ</div>
        </div>

        <div className="bg-white rounded-2xl p-4.5 border border-slate-200/90 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider">รวมยอดยังไม่เบิก</span>
          <div className="text-xl font-extrabold text-indigo-900">{money(amount)}</div>
        </div>

        <div className="bg-white rounded-2xl p-4.5 border border-slate-200/90 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">ยอดโอนยังไม่เบิก</span>
          <div className="text-xl font-extrabold text-emerald-700">{money(transfer)}</div>
        </div>
      </div>

      {/* 2. FILTER TOOLBAR */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs flex-1">
          {/* Requester dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 whitespace-nowrap">ผู้เบิก:</span>
            <select
              value={filters.requester}
              onChange={event => updateFilter("requester", event.target.value)}
              className="bg-slate-50 hover:bg-slate-100/90 text-slate-800 text-xs font-semibold px-3 py-2 h-9 rounded-xl border border-slate-200 focus:bg-white focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer"
            >
              <option value="">ทั้งหมด</option>
              {peopleRows.map(row => {
                const key = String(row["รหัสพนักงาน"] || row["ชื่อเล่น"] || row._sheetRow || "");
                const label = row["ชื่อเล่น"] ? `${key} - ${row["ชื่อเล่น"]}` : key;
                return key ? <option key={key} value={key}>{label}</option> : null;
              })}
            </select>
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 whitespace-nowrap">วันที่:</span>
            <input
              type="date"
              value={filters.date}
              onChange={event => updateFilter("date", event.target.value)}
              className="bg-slate-50 hover:bg-slate-100/90 text-slate-800 text-xs font-semibold px-3 py-1.5 h-9 rounded-xl border border-slate-200 focus:bg-white focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer"
            />
          </div>

          {/* Bill Type */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 whitespace-nowrap">ประเภทบิล:</span>
            <select
              value={filters.bill}
              onChange={event => updateFilter("bill", event.target.value)}
              className="bg-slate-50 hover:bg-slate-100/90 text-slate-800 text-xs font-semibold px-3 py-2 h-9 rounded-xl border border-slate-200 focus:bg-white focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer"
            >
              <option value="">ทั้งหมด</option>
              <option value="หลัก">หลัก</option>
              <option value="ย่อย">ย่อย</option>
            </select>
          </div>

          {/* Live Search */}
          <div className="relative flex items-center h-9 flex-1 min-w-[220px] max-w-md">
            <Search size={15} className="absolute left-3 text-slate-400 pointer-events-none z-10" />
            <input
              type="text"
              placeholder="ค้นหา Project, ร้านค้า, รายการ..."
              value={filters.search}
              onChange={event => updateFilter("search", event.target.value)}
              style={{ paddingLeft: "36px", paddingRight: "30px" }}
              className="w-full h-full bg-slate-50 hover:bg-slate-100/90 focus:bg-white text-slate-800 text-xs font-medium rounded-xl border border-slate-200 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-400"
            />
            {filters.search && (
              <X size={14} className="absolute right-2.5 text-slate-400 cursor-pointer hover:text-slate-700 z-10" onClick={() => updateFilter("search", "")} />
            )}
          </div>
        </div>

        {/* Batch Approve Action Button */}
        {selectedRows.size > 0 && (
          <button
            type="button"
            onClick={approveSelected}
            disabled={isBatchApproving}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition shadow-2xs flex items-center gap-2"
          >
            {isBatchApproving ? (
              <><LoaderCircle className="spin" size={15} /> กำลังอัพเดท...</>
            ) : (
              <><Check size={15} /> อัพเดทที่เลือก ({selectedRows.size})</>
            )}
          </button>
        )}
      </div>

      {actionError ? <div className="p-3 bg-rose-50 text-rose-700 rounded-xl border border-rose-200 text-xs font-bold">{actionError}</div> : null}

      {/* 3. PRO WORK TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <WithdrawTable
          approvingRow={approvingRow}
          columns={columns}
          onApprove={approveRow}
          requesterNames={requesterNames}
          rows={visibleRows}
          selectedRows={selectedRows}
          onSelectRow={rowId => {
            const newSet = new Set(selectedRows);
            if (newSet.has(rowId)) newSet.delete(rowId);
            else newSet.add(rowId);
            setSelectedRows(newSet);
          }}
          onSelectAll={rowIds => {
            if (rowIds.length === 0) setSelectedRows(new Set());
            else setSelectedRows(new Set([...selectedRows, ...rowIds]));
          }}
        />

        <WithdrawPagination
          currentPage={currentPage}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          pageSize={pageSize}
          totalPages={totalPages}
          totalRows={displayRows.length}
          visibleEnd={visibleEnd}
          visibleStart={visibleStart}
        />
      </div>
    </div>
  );
}

function getLocalTodayString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeFilters(filters: WithdrawFilters) {
  return {
    requester: String(filters.requester || ""),
    date: String(filters.date || ""),
    bill: String(filters.bill || ""),
    search: String(filters.search || "")
  };
}

function filterWithdrawRows(rows: SheetRow[], filters: Required<WithdrawFilters>) {
  const requester = filters.requester.trim();
  const bill = filters.bill.trim();
  const query = filters.search.trim().toLowerCase();
  const filterDateStr = filters.date.trim();

  return rows.filter(row => {
    if (requester && String(row["ผู้เบิก"] || "").trim() !== requester) return false;
    if (bill && String(row["บิล"] || "").trim() !== bill) return false;
    if (filterDateStr) {
      const rowIsoDate = normalizeDateToIso(row["ว/ด/ป"]);
      if (rowIsoDate !== filterDateStr) return false;
    }
    if (query && !Object.values(row).some(value => String(value || "").toLowerCase().includes(query))) return false;
    return true;
  });
}

function WithdrawTable({
  approvingRow,
  columns,
  onApprove,
  requesterNames,
  rows,
  selectedRows,
  onSelectRow,
  onSelectAll
}: {
  approvingRow: number | null;
  columns: string[];
  onApprove: (row: SheetRow) => void;
  requesterNames: Record<string, string>;
  rows: SheetRow[];
  selectedRows: Set<number>;
  onSelectRow: (rowId: number) => void;
  onSelectAll: (rowIds: number[]) => void;
}) {
  if (!rows.length) return <div className="p-10 text-center text-slate-400 text-xs font-medium">ไม่พบรายการตั้งเบิก</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs text-slate-700 border-collapse">
        <thead>
          <tr className="bg-slate-100/90 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
            <th className="py-3 px-3.5 w-10 text-center">
              <input 
                type="checkbox" 
                checked={rows.length > 0 && rows.every(r => selectedRows.has(Number(r._sheetRow)))}
                onChange={e => {
                  if (e.target.checked) onSelectAll(rows.map(r => Number(r._sheetRow)));
                  else onSelectAll([]);
                }}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
            </th>
            {columns.map(column => (
              <th key={column} className={`py-3 px-3.5 ${isAmountColumn(column) ? "text-right" : ""}`}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => {
            const sheetRowId = Number(row._sheetRow);
            const isSelected = selectedRows.has(sheetRowId);

            return (
              <tr key={`${sheetRowId}-${index}`} className="hover:bg-slate-50/80 transition-colors group">
                <td className="py-2.5 px-3.5 text-center">
                  <input 
                    type="checkbox" 
                    checked={isSelected}
                    onChange={() => onSelectRow(sheetRowId)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </td>

                {columns.map(column => (
                  <td key={column} className={`py-2.5 px-3.5 ${isAmountColumn(column) ? "text-right font-extrabold text-slate-900" : ""}`}>
                    {column === "จัดการ" ? (
                      <button
                        type="button"
                        disabled={approvingRow === sheetRowId}
                        onClick={() => onApprove(row)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                          normalizedStatus(row["สถานะ"]) === "อนุมัติ"
                            ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200"
                            : "bg-slate-900 hover:bg-slate-800 text-white"
                        }`}
                      >
                        {approvingRow === sheetRowId ? (
                          <LoaderCircle className="spin" size={14} />
                        ) : normalizedStatus(row["สถานะ"]) === "อนุมัติ" ? (
                          <Banknote size={14} />
                        ) : (
                          <Check size={14} />
                        )}
                        <span>
                          {normalizedStatus(row["สถานะ"]) === "อนุมัติ" ? "เบิกแล้ว" : "อนุมัติ"}
                        </span>
                      </button>
                    ) : (
                      formatWithdrawCell(column, row[column], requesterNames)
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function requesterNameMap(peopleRows: SheetRow[]) {
  return peopleRows.reduce<Record<string, string>>((names, row) => {
    const key = String(row["รหัสพนักงาน"] || "").trim();
    const name = String(row["ชื่อเล่น"] || "").trim();
    if (key && name) names[key] = name;
    return names;
  }, {});
}

function WithdrawPagination({
  currentPage,
  onPageChange,
  onPageSizeChange,
  pageSize,
  totalPages,
  totalRows,
  visibleEnd,
  visibleStart
}: {
  currentPage: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSize: number;
  totalPages: number;
  totalRows: number;
  visibleEnd: number;
  visibleStart: number;
}) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-200/90 text-xs text-slate-500 bg-slate-50/50">
      <div>
        แสดง {visibleStart}-{visibleEnd} จาก {totalRows} รายการ
      </div>

      <div className="flex items-center gap-4">
        {/* Rows per page */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 font-semibold">แสดงต่อหน้า:</span>
          {PAGE_SIZE_OPTIONS.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => onPageSizeChange(opt)}
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
            onClick={() => onPageChange(currentPage - 1)}
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
            onClick={() => onPageChange(currentPage + 1)}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function parseInputDate(value?: string) {
  if (!value) return null;
  const matched = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!matched) return null;
  const year = Number(matched[1]);
  const month = Number(matched[2]) - 1;
  const day = Number(matched[3]);
  return new Date(year, month, day);
}

function parseSheetDate(value: unknown) {
  const parsed = parseDateStrict(value);
  if (!parsed) return null;
  return new Date(parsed.year, parsed.month - 1, parsed.day);
}

function normalizedStatus(value: unknown) {
  const text = String(value || "").trim().toLowerCase();
  if (text.includes("อนุมัติ") || text === "approved") return "อนุมัติ";
  if (text.includes("เบิกแล้ว") || text === "withdrawn" || text === "paid") return "เบิกแล้ว";
  return "ตั้งเบิก";
}

function isAmountColumn(column: string) {
  return column === "ยอดเงิน" || column === "ยอดโอน" || column === "ยอดรวม vat" || column === "งบไม่เกิน" || column === "รวม ALL";
}

function formatWithdrawCell(column: string, value: unknown, requesterNames: Record<string, string>) {
  if (value === null || value === undefined) return "-";
  if (column === "ผู้เบิก") {
    const key = String(value).trim();
    return requesterNames[key] || key || "-";
  }
  if (column === "สถานะ") {
    const status = normalizedStatus(value);
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-extrabold ${
          status === "อนุมัติ"
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
            : status === "เบิกแล้ว"
            ? "bg-slate-100 text-slate-700 border border-slate-200"
            : "bg-amber-50 text-amber-700 border border-amber-200"
        }`}
      >
        {status}
      </span>
    );
  }
  if (column === "ว/ด/ป" || column.includes("วัน")) {
    return formatDateDisplay(value);
  }
  if (isAmountColumn(column)) {
    return money(value);
  }
  return String(value) || "-";
}
