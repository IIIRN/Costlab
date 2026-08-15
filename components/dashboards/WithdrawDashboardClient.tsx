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
  const [effectiveIsAdmin, setEffectiveIsAdmin] = useState(isAdmin);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    if (typeof document !== "undefined") {
      const match = document.cookie.match(/auth_role=([^;]+)/);
      const role = match ? decodeURIComponent(match[1]) : "";
      if (role === "Admin" || isAdmin) {
        setEffectiveIsAdmin(true);
      }
    }
  }, [isAdmin]);

  const columns = useMemo(() => effectiveIsAdmin ? ALL_COLUMNS : ALL_COLUMNS.filter(c => c !== "จัดการ"), [effectiveIsAdmin]);
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
    // แสดงบิลสถานะ "รอตั้งเบิก", "ตั้งเบิก" และ "อนุมัติ" (ยังไม่เบิก/ปิดงาน)
    return filterWithdrawRows(currentRows, filters)
      .filter(row => {
        const st = normalizedStatus(row["สถานะ"]);
        return st === "รอตั้งเบิก" || st === "ตั้งเบิก" || st === "รออนุมัติ" || st === "อนุมัติ";
      })
      .sort((a, b) => Number(b._sheetRow || 0) - Number(a._sheetRow || 0));
  }, [rows, filters, statusOverrides]);

  const totalPages = Math.max(1, Math.ceil(displayRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const visibleRows = displayRows.slice(pageStart, pageStart + pageSize);
  const visibleStart = visibleRows.length ? pageStart + 1 : 0;
  const visibleEnd = pageStart + visibleRows.length;
  const amount = displayRows.reduce((sum, row) => sum + toNumber(row["ยอดเงิน"]), 0);
  // ยอดโอน = รวมเฉพาะแถวที่อนุมัติแล้ว
  const transfer = displayRows.reduce((sum, row) => sum + (normalizedStatus(row["สถานะ"]) === "อนุมัติ" ? toNumber(row["ยอดโอน"]) : 0), 0);
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
    const nextStatus = "ตั้งเบิก";
    setApprovingRow(sheetRow);
    setActionError("");
    try {
      const response = await fetch("/api/rows", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableName: "Data", sheetRow, values: { "สถานะ": nextStatus } })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "อัปเดตไม่สำเร็จ");

      const updatedRow = { ...row, "สถานะ": nextStatus };
      setStatusOverrides(current => ({ ...current, [sheetRow]: nextStatus }));

      // Automatically send LINE Flex message to the Requester
      fetch("/api/line/notify-withdraw-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ row: updatedRow, targetRole: "requester" })
      }).catch(err => console.warn("Failed sending LINE withdraw notification:", err));

      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "อัปเดตไม่สำเร็จ");
    } finally {
      setApprovingRow(null);
    }
  }

  async function approveSelected(targetStatus: "ตั้งเบิก" | "อนุมัติ" = "ตั้งเบิก") {
    if (selectedRows.size === 0) return;
    setIsBatchApproving(true);
    setActionError("");

    try {
      // Filter out rows that are already in target or finished status
      const validSheetRows = Array.from(selectedRows).filter(sheetRow => {
        const targetRow = rows.find(r => Number(r._sheetRow) === sheetRow);
        if (!targetRow) return false;
        const currentSt = normalizedStatus(targetRow["สถานะ"]);
        // If approving or requesting withdraw, skip rows that are ALREADY approved or paid/closed
        if (targetStatus === "อนุมัติ" && (currentSt === "อนุมัติ" || currentSt === "เบิกแล้ว")) return false;
        if (targetStatus === "ตั้งเบิก" && (currentSt === "ตั้งเบิก" || currentSt === "อนุมัติ" || currentSt === "เบิกแล้ว")) return false;
        return true;
      });

      if (validSheetRows.length === 0) {
        setActionError("⚠️ รายการที่เลือกอยู่ในสถานะดังกล่าวแล้ว หรือปิดงานเรียบร้อยแล้ว (ไม่สามารถสั่งซ้ำได้)");
        setIsBatchApproving(false);
        return;
      }

      const updatedRowsList: SheetRow[] = [];

      const updates = validSheetRows.map(async (sheetRow) => {
        const targetRow = rows.find(r => Number(r._sheetRow) === sheetRow);
        if (!targetRow) return;

        const res = await fetch("/api/rows", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tableName: "Data", sheetRow, values: { "สถานะ": targetStatus } })
        });
        if (res.ok) {
          const updatedRow = { ...targetRow, "สถานะ": targetStatus };
          setStatusOverrides(current => ({ ...current, [sheetRow]: targetStatus }));
          updatedRowsList.push(updatedRow);
        }
      });

      await Promise.all(updates);

      if (updatedRowsList.length > 0) {
        const targetRole = targetStatus === "อนุมัติ" ? "approver" : "requester";
        fetch("/api/line/notify-withdraw-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: updatedRowsList, targetRole })
        }).catch(err => console.warn("Failed sending LINE withdraw notification:", err));
      }

      setSelectedRows(new Set());
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "อัปเดตไม่สำเร็จ");
    } finally {
      setIsBatchApproving(false);
    }
  }

  return (
    <div className="w-full flex flex-col gap-3 p-3 sm:p-5 max-w-[1600px] mx-auto font-sans text-sm text-slate-800">
      {/* 1. EXECUTIVE SUMMARY KPI CARDS (Hidden on mobile for clean layout) */}
      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-md p-3 border border-sky-200 bg-sky-50/40">
          <span className="text-xs font-semibold text-sky-800">📌 สถานะ: รอตั้งเบิก</span>
          <div className="text-lg font-bold text-sky-900 mt-1">
            {displayRows.filter(r => normalizedStatus(r["สถานะ"]) === "รอตั้งเบิก" || normalizedStatus(r["สถานะ"]) === "รออนุมัติ").length} รายการ
          </div>
        </div>

        <div className="bg-white rounded-md p-3 border border-amber-200 bg-amber-50/40">
          <span className="text-xs font-semibold text-amber-800">📌 สถานะ: ตั้งเบิก</span>
          <div className="text-lg font-bold text-amber-900 mt-1">
            {displayRows.filter(r => normalizedStatus(r["สถานะ"]) === "ตั้งเบิก").length} รายการ
          </div>
        </div>

        <div className="bg-white rounded-md p-3 border border-emerald-200 bg-emerald-50/40">
          <span className="text-xs font-semibold text-emerald-800">✅ สถานะ: อนุมัติแล้ว</span>
          <div className="text-lg font-bold text-emerald-900 mt-1">
            {displayRows.filter(r => normalizedStatus(r["สถานะ"]) === "อนุมัติ").length} รายการ
          </div>
        </div>

        <div className="bg-white rounded-md p-3 border border-slate-200">
          <span className="text-xs font-semibold text-slate-500">ยอดโอนเงินรวม (บิลอนุมัติ)</span>
          <div className="text-lg font-bold text-emerald-700 mt-1">{money(transfer)}</div>
        </div>
      </div>

      {/* 2. FILTER TOOLBAR (Compact Mobile Layout) */}
      <div className="border border-slate-200 rounded-md p-2.5 bg-white flex flex-col gap-2 text-xs">
        {/* Search Bar & Mobile Filter Toggle Header */}
        <div className="flex items-center gap-2 w-full">
          <div className="relative flex items-center flex-1">
            <Search size={14} className="absolute left-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="ค้นหา Project, ร้านค้า, รายการ..."
              value={filters.search}
              onChange={event => updateFilter("search", event.target.value)}
              className="w-full bg-white text-slate-800 text-xs pl-8 pr-7 py-1.5 rounded-md border border-slate-300 focus:outline-none focus:border-slate-500 placeholder:text-slate-400"
            />
            {filters.search && (
              <X size={14} className="absolute right-2 text-slate-400 cursor-pointer hover:text-slate-600" onClick={() => updateFilter("search", "")} />
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="md:hidden px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-md border border-slate-300 flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <Filter size={13} />
            <span>{showMobileFilters ? "ซ่อนตัวกรอง" : "ตัวกรอง"}</span>
          </button>
        </div>

        {/* Expandable Filter Controls */}
        <div className={`flex-wrap items-center gap-2.5 pt-1 border-t border-slate-100 md:border-t-0 md:pt-0 ${showMobileFilters ? "flex" : "hidden md:flex"}`}>
          {/* Requester dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700 whitespace-nowrap">ผู้เบิก:</span>
            <select
              value={filters.requester}
              onChange={event => updateFilter("requester", event.target.value)}
              className="bg-white border border-slate-300 text-xs text-slate-800 px-2 py-1 rounded-md focus:outline-none cursor-pointer"
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
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700 whitespace-nowrap">วันที่:</span>
            <input
              type="date"
              value={filters.date}
              onChange={event => updateFilter("date", event.target.value)}
              className="bg-white border border-slate-300 text-xs text-slate-800 px-2 py-1 rounded-md focus:outline-none cursor-pointer"
            />
          </div>

          {/* Bill Type */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700 whitespace-nowrap">ประเภท:</span>
            <select
              value={filters.bill}
              onChange={event => updateFilter("bill", event.target.value)}
              className="bg-white border border-slate-300 text-xs text-slate-800 px-2 py-1 rounded-md focus:outline-none cursor-pointer"
            >
              <option value="">ทั้งหมด</option>
              <option value="หลัก">หลัก</option>
              <option value="ย่อย">ย่อย</option>
            </select>
          </div>
        </div>

        {/* Batch Approve Action Buttons */}
        {selectedRows.size > 0 && (
          <div className="flex items-center gap-2 pt-1 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={() => approveSelected("ตั้งเบิก")}
              disabled={isBatchApproving}
              className="px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-md transition cursor-pointer flex items-center gap-1.5"
            >
              {isBatchApproving ? (
                <><LoaderCircle className="spin" size={14} /> กำลังอัพเดท...</>
              ) : (
                <><Check size={14} /> ตั้งเบิกที่เลือก ({selectedRows.size})</>
              )}
            </button>

            {effectiveIsAdmin && (
              <button
                type="button"
                onClick={() => approveSelected("อนุมัติ")}
                disabled={isBatchApproving}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md transition cursor-pointer flex items-center gap-1.5"
              >
                {isBatchApproving ? (
                  <><LoaderCircle className="spin" size={14} /> กำลังอัพเดท...</>
                ) : (
                  <><Check size={14} /> อนุมัติที่เลือก ({selectedRows.size}) ➡️ ส่งต่อผู้อนุมัติ</>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {actionError ? <div className="p-3 bg-rose-50 text-rose-700 rounded-xl border border-rose-200 text-xs font-bold">{actionError}</div> : null}

      {/* 3. WORK TABLE */}
      <div className="border border-slate-200 rounded-md bg-white overflow-hidden">
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
  if (!rows.length) return <div className="p-8 text-center text-slate-400 text-xs font-medium">ไม่พบรายการตั้งเบิก</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs text-slate-700 border-collapse font-sans">
        <thead>
          <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200 text-xs">
            <th className="py-2.5 px-3 w-10 text-center border-r border-slate-200">
              <input 
                type="checkbox" 
                checked={rows.length > 0 && rows.every(r => selectedRows.has(Number(r._sheetRow)))}
                onChange={e => {
                  if (e.target.checked) onSelectAll(rows.map(r => Number(r._sheetRow)));
                  else onSelectAll([]);
                }}
                className="rounded border-slate-300 text-slate-900 focus:ring-slate-500 cursor-pointer"
              />
            </th>
            {columns.map(column => (
              <th key={column} className={`py-2.5 px-3 border-r border-slate-200 ${isAmountColumn(column) ? "text-right" : ""}`}>
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
              <tr key={`${sheetRowId}-${index}`} className="hover:bg-slate-50 transition-colors">
                <td className="py-2 px-3 text-center border-r border-slate-100">
                  <input 
                    type="checkbox" 
                    checked={isSelected}
                    onChange={() => onSelectRow(sheetRowId)}
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-500 cursor-pointer"
                  />
                </td>

                {columns.map(column => (
                  <td key={column} className={`py-2 px-3 border-r border-slate-100 ${isAmountColumn(column) ? "text-right font-bold text-slate-900" : ""}`}>
                    {column === "จัดการ" ? (
                      normalizedStatus(row["สถานะ"]) === "ตั้งเบิก" ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200 inline-block">
                          ตั้งเบิกแล้ว
                        </span>
                      ) : normalizedStatus(row["สถานะ"]) === "อนุมัติ" ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 inline-block">
                          อนุมัติแล้ว
                        </span>
                      ) : normalizedStatus(row["สถานะ"]) === "เบิกแล้ว" ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200 inline-block">
                          ปิดงานแล้ว
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={approvingRow === sheetRowId}
                          onClick={() => onApprove(row)}
                          className="px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 transition cursor-pointer bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50"
                        >
                          {approvingRow === sheetRowId ? (
                            <LoaderCircle className="spin" size={13} />
                          ) : (
                            <Check size={13} />
                          )}
                          <span>ตั้งเบิก</span>
                        </button>
                      )
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
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 border-t border-slate-200 text-xs text-slate-600 bg-slate-50">
      <div>
        แสดง {visibleStart}-{visibleEnd} จาก {totalRows} รายการ
      </div>

      <div className="flex items-center gap-3">
        {/* Rows per page */}
        <div className="flex items-center gap-1">
          <span className="text-slate-500 font-medium">แสดงต่อหน้า:</span>
          {PAGE_SIZE_OPTIONS.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => onPageSizeChange(opt)}
              className={`px-2 py-0.5 rounded text-xs font-semibold transition cursor-pointer ${
                opt === pageSize ? "bg-slate-900 text-white" : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
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
            onClick={() => onPageChange(currentPage + 1)}
            className="p-1 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer text-slate-700"
          >
            <ChevronRight size={15} />
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

function normalizedStatus(value: unknown): "รอตั้งเบิก" | "ตั้งเบิก" | "รออนุมัติ" | "อนุมัติ" | "เบิกแล้ว" {
  const text = String(value || "").trim().toLowerCase();
  if (text.includes("รอตั้งเบิก")) return "รอตั้งเบิก";
  if ((text.includes("อนุมัติ") && !text.includes("รออนุมัติ")) || text === "approved") return "อนุมัติ";
  if (text.includes("เบิกแล้ว") || text === "withdrawn" || text === "paid") return "เบิกแล้ว";
  if (text.includes("ตั้งเบิก")) return "ตั้งเบิก";
  if (text.includes("รออนุมัติ")) return "รออนุมัติ";
  return "รอตั้งเบิก";
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
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${
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

