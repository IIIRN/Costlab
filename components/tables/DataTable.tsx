"use client";

import Link from "next/link";
import { ArrowDownWideNarrow, ArrowUpWideNarrow, ChevronLeft, ChevronRight, Eye, List, Search, X } from "lucide-react";
import { useState, useMemo, useEffect, type ReactNode } from "react";
import { BillImageThumbnail } from "@/components/BillImageThumbnail";
import type { SheetRow } from "@/lib/types";

type DataTableProps = {
  columns: string[];
  rows: SheetRow[];
  limit?: number;
  title?: string;
  subtitle?: string;
  rowLabel?: string;
  pagination?: {
    page: number;
    pageSize: number;
    basePath: string;
    query?: Record<string, string | undefined>;
    pageSizeOptions?: number[];
  };
  sortToggle?: {
    href: string;
    label: string;
    direction: "latest" | "oldest";
  };
  detailBasePath?: string;
  detailKeyColumn?: string;
  cellFormatters?: Record<string, (value: unknown, row: SheetRow) => ReactNode>;
  showDetailColumn?: boolean;
  showSearch?: boolean;
  initialSearch?: string;
  actionButton?: ReactNode;
};

const DEFAULT_PAGE_SIZE_OPTIONS = [20, 50, 100, 200];

export function DataTable({ columns, rows, limit = 80, title = "Data", subtitle, rowLabel = "rows", pagination, sortToggle, detailBasePath, detailKeyColumn, cellFormatters, showDetailColumn = true, showSearch = false, initialSearch = "", actionButton }: DataTableProps) {
  const [localSearch, setLocalSearch] = useState(initialSearch);
  const [sortDesc, setSortDesc] = useState(sortToggle ? sortToggle.direction === "latest" : true);
  const [page, setPage] = useState(pagination ? pagination.page : 1);
  const [pageSize, setPageSize] = useState(pagination ? pagination.pageSize : limit);

  useEffect(() => {
    setPage(1);
  }, [localSearch]);

  const filteredAndSortedRows = useMemo(() => {
    let result = [...rows];
    if (showSearch && localSearch.trim()) {
      const lower = localSearch.toLowerCase();
      result = result.filter(row => 
        Object.values(row).some(value => String(value || "").toLowerCase().includes(lower))
      );
    }
    // Always sort by sequence ID (latest first by default)
    result.sort((a, b) => {
      const seqA = extractRowSequence(a);
      const seqB = extractRowSequence(b);
      if (seqA !== seqB) {
        return sortDesc ? seqB - seqA : seqA - seqB;
      }
      return 0;
    });
    return result;
  }, [rows, localSearch, showSearch, sortDesc]);

  const totalRows = filteredAndSortedRows.length;
  const totalPages = pagination ? Math.max(1, Math.ceil(totalRows / pageSize)) : 1;
  const currentPage = pagination ? clampPage(page, totalPages) : 1;
  const startIndex = pagination ? (currentPage - 1) * pageSize : 0;
  const visibleRows = pagination ? filteredAndSortedRows.slice(startIndex, startIndex + pageSize) : filteredAndSortedRows.slice(0, limit);
  const displayStart = visibleRows.length ? startIndex + 1 : 0;
  const displayEnd = startIndex + visibleRows.length;

  const cleanColumns = useMemo(() => columns.filter(col => Boolean(col && String(col).trim())), [columns]);

  return (
    <div className="flex flex-col h-full bg-white rounded-md border border-slate-200 overflow-hidden text-xs text-slate-800">
      <div className="px-4 py-3 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight m-0">{title}</h3>
          {subtitle ? <span className="text-xs text-slate-500 font-normal">{subtitle}</span> : null}
        </div>
        <div className="flex items-center gap-2">
          {actionButton}
          {showSearch && (
            <div className="flex items-center bg-white border border-slate-300 focus-within:border-slate-500 rounded-md px-2.5 py-1 h-8 w-56 transition">
              <Search size={14} className="text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="ค้นหา..."
                value={localSearch}
                onChange={e => setLocalSearch(e.target.value)}
                className="border-none bg-transparent outline-none px-2 text-xs font-normal w-full text-slate-800 placeholder:text-slate-400 min-h-0"
              />
              {localSearch && (
                <X size={14} className="cursor-pointer text-slate-400 hover:text-slate-600 shrink-0" onClick={() => setLocalSearch("")} />
              )}
            </div>
          )}
          {sortToggle ? (
            <button
              type="button"
              className="border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              onClick={() => setSortDesc(current => !current)}
              title="สลับการเรียงลำดับ"
            >
              {sortDesc ? <ArrowDownWideNarrow size={14} className="text-slate-600 shrink-0" /> : <ArrowUpWideNarrow size={14} className="text-slate-600 shrink-0" />}
              <span className="text-slate-700 font-semibold">{sortDesc ? "ล่าสุดก่อน" : "เก่าสุดก่อน"}</span>
            </button>
          ) : null}
        </div>
      </div>
      {visibleRows.length ? (
        <div className="flex-1 overflow-auto bg-white">
          <table className="w-full text-left border-collapse text-xs text-slate-800 font-sans">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200 text-xs">
                {cleanColumns.map(column => (
                  <th key={column} className={`py-2.5 px-3 border-r border-slate-200 ${getColumnAlignmentClass(column)}`} data-column={column} data-label={column}>
                    {column}
                  </th>
                ))}
                {detailBasePath && showDetailColumn ? <th className="py-2.5 px-3 text-center">จัดการ</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleRows.map((row, index) => {
                const targetKey = String(row[detailKeyColumn || "ID Project" || cleanColumns[0]] || row["ID Project"] || row.id || "");

                return (
                  <tr key={`${String(row._sheetRow ?? row.id ?? row["ลำดับ"] ?? row[cleanColumns[0]] ?? "row")}-${index}`} className="hover:bg-slate-50 transition-colors">
                    {cleanColumns.map(column => (
                      <td key={column} className={`py-2 px-3 border-r border-slate-100 ${getColumnAlignmentClass(column)}`} data-column={column} data-label={column}>
                        {column === "ชื่อ Project" && detailBasePath && targetKey ? (
                          <Link
                            href={`${detailBasePath}/${encodeURIComponent(targetKey)}`}
                            className="font-bold text-slate-900 hover:underline"
                          >
                            {renderCell(column, row[column], row, cellFormatters)}
                          </Link>
                        ) : (
                          renderCell(column, row[column], row, cellFormatters)
                        )}
                      </td>
                    ))}
                    {detailBasePath && showDetailColumn ? (
                      <td className="py-2 px-3 text-center" data-label="จัดการ">
                        <Link
                          className="inline-flex items-center justify-center w-6 h-6 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition"
                          href={`${detailBasePath}/${encodeURIComponent(targetKey)}`}
                          aria-label="ดูรายละเอียด"
                          title="ดูรายละเอียด"
                        >
                          <Eye size={13} />
                        </Link>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-10 text-slate-400 font-medium text-xs">ไม่พบข้อมูล</div>
      )}
      {pagination ? (
        <TablePagination
          currentPage={currentPage}
          pageSize={pageSize}
          pageSizeOptions={pagination.pageSizeOptions || DEFAULT_PAGE_SIZE_OPTIONS}
          rowLabel={rowLabel}
          totalPages={totalPages}
          totalRows={totalRows}
          visibleEnd={displayEnd}
          visibleStart={displayStart}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      ) : null}
    </div>
  );
}

function TablePagination({
  currentPage,
  pageSize,
  pageSizeOptions,
  rowLabel,
  totalPages,
  totalRows,
  visibleEnd,
  visibleStart,
  onPageChange,
  onPageSizeChange
}: {
  currentPage: number;
  pageSize: number;
  pageSizeOptions: number[];
  rowLabel: string;
  totalPages: number;
  totalRows: number;
  visibleEnd: number;
  visibleStart: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const pages = pageWindow(currentPage, totalPages);
  return (
    <div className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-slate-50 border-t border-slate-200 text-xs text-slate-600" aria-label="pagination">
      <div className="flex items-center gap-3 font-medium">
        <span>แสดง {visibleStart}-{visibleEnd} จาก {totalRows} {rowLabel}</span>
        <div className="flex items-center gap-1" aria-label="rows per page">
          <span className="flex items-center gap-1 text-slate-500 font-medium text-xs">
            <span>ต่อหน้า:</span>
          </span>
          <div className="flex items-center gap-1">
            {pageSizeOptions.map(option => (
              <button
                key={option}
                type="button"
                className={`px-2 py-0.5 rounded text-xs font-semibold transition cursor-pointer ${
                  option === pageSize
                    ? "bg-slate-900 text-white font-semibold"
                    : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                }`}
                onClick={() => onPageSizeChange(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>
      <nav className="flex items-center gap-1" aria-label="table pages">
        <button 
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer transition"
          disabled={currentPage <= 1} 
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft size={14} aria-hidden="true" />
          <span>ก่อนหน้า</span>
        </button>
        {pages.map((page, index) => (
          page === "ellipsis" ? (
            <span className="px-1 text-xs text-slate-400 font-bold" key={`ellipsis-${index}`}>...</span>
          ) : (
            <button
              key={page}
              type="button"
              className={`min-w-6 h-6 px-1.5 rounded text-xs font-semibold transition cursor-pointer ${
                page === currentPage
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
              }`}
              onClick={() => onPageChange(page)}
            >
              {page}
            </button>
          )
        ))}
        <button 
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer transition"
          disabled={currentPage >= totalPages} 
          onClick={() => onPageChange(currentPage + 1)}
        >
          <span>ถัดไป</span>
          <ChevronRight size={14} aria-hidden="true" />
        </button>
      </nav>
    </div>
  );
}

function pageWindow(currentPage: number, totalPages: number) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const pages: Array<number | "ellipsis"> = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  if (start > 2) pages.push("ellipsis");
  for (let page = start; page <= end; page += 1) pages.push(page);
  if (end < totalPages - 1) pages.push("ellipsis");
  pages.push(totalPages);
  return pages;
}

function clampPage(value: number, totalPages: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(Math.max(Math.trunc(value), 1), totalPages);
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || String(value).trim() === "") return "";
  if (typeof value === "number") return value.toLocaleString("th-TH", { maximumFractionDigits: 2 });
  const str = String(value).trim();
  const rawNum = str.replace(/,/g, "");
  if (rawNum !== "" && !isNaN(Number(rawNum))) {
    return Number(rawNum).toLocaleString("th-TH", { maximumFractionDigits: 2 });
  }
  return str;
}

import { formatDateDisplay } from "@/lib/dates";

function isDateColumn(column: string) {
  const col = column.trim();
  return col === "ว/ด/ป" || col === "วันได้บิล" || col === "วันออก 3%" || col === "วันจ่าย" || col === "วันที่" || col.toLowerCase().includes("date");
}

function renderCell(column: string, value: unknown, row: SheetRow, cellFormatters?: DataTableProps["cellFormatters"]) {
  const formatter = cellFormatters?.[column];
  if (formatter) return formatter(value, row);
  if (isImageColumn(column)) return <BillImageThumbnail value={value} />;
  if (column === "color" || column === "COLOR") return <ColorDot value={value} />;
  if (isDateColumn(column)) return formatDateDisplay(value);
  return formatValue(value);
}

function ColorDot({ value }: { value: unknown }) {
  const raw = String(value ?? "").trim();
  const tone = raw.toLowerCase();
  const isRed = tone === "red" || tone.includes("แดง") || tone.includes("ใหญ่");
  const isGreen = tone === "green" || tone.includes("เขียว") || tone.includes("เล็ก");
  const isBlack = tone === "black" || tone.includes("ดำ") || tone.includes("เสร็จ");

  const bgClass = isGreen
    ? "bg-emerald-500 ring-2 ring-emerald-200"
    : isRed
      ? "bg-rose-500 ring-2 ring-rose-200"
      : isBlack
        ? "bg-slate-900 ring-2 ring-slate-300"
        : "bg-slate-200";

  const displayTitle = isRed
    ? "Red (งานใหญ่)"
    : isGreen
      ? "Green (งานเล็ก)"
      : isBlack
        ? "Black (งานเสร็จแล้ว)"
        : raw || "-";

  return (
    <span className="inline-flex items-center gap-1.5" title={displayTitle}>
      <span className={`w-2.5 h-2.5 rounded-full ${bgClass} transition-all shrink-0`} aria-label={displayTitle} />
      <span className="text-[11px] font-semibold text-slate-700">{displayTitle}</span>
    </span>
  );
}

function isImageColumn(column: string) {
  return column === "รูปถ่ายบิล" || column.includes("รูปถ่าย") || column.toLowerCase().includes("image");
}

function extractRowSequence(row: SheetRow): number {
  if (!row) return 0;
  const val = row["ลำดับ"] ?? row["ID Project"] ?? row["id_store"] ?? row["id_Contractor"] ?? row["id_Conwork"] ?? row["id_bank"] ?? row["id_car"] ?? row["id_cus"] ?? row["id_Company"] ?? row._sheetRow ?? row.id;
  const num = Number(val);
  return Number.isFinite(num) ? num : 0;
}

function isAmountColumn(column: string) {
  return /ยอด|เงิน|ราคา|vat|หัก|เครดิต|ค่าแรง|รวม|คงเหลือ|โอน|งบ/.test(column);
}

function getColumnAlignmentClass(column: string): string {
  if (isAmountColumn(column)) return "text-right numeric-cell align-middle";
  if (isCenterColumn(column)) return "text-center align-middle";
  return "text-left align-middle";
}

function isCenterColumn(column: string): boolean {
  const col = column.trim();
  return (
    col === "ลำดับ" ||
    col === "ID Project" ||
    col === "id" ||
    col === "บิล" ||
    col === "ประเภท" ||
    col === "เงื่อนไข" ||
    col === "ผู้เบิก" ||
    col === "ว/ด/ป" ||
    col === "รูปถ่ายบิล" ||
    col === "สถานะ" ||
    col === "จัดการ" ||
    col === "statusค่าแรง" ||
    col === "เครดิต" ||
    col === "vat" ||
    col === "หัก" ||
    col === "วันได้บิล" ||
    col === "วันออก 3%" ||
    col === "วันจ่าย" ||
    col === "color"
  );
}

