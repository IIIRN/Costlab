"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Eye, List, Pencil, Plus, Save, Trash2, X, Search, ArrowDownUp } from "lucide-react";
import { BillImageThumbnail } from "@/components/BillImageThumbnail";
import { showConfirm, showToast } from "@/components/ToastProvider";
import type { RowValue, SheetRow } from "@/lib/types";
import { formatDateDisplay } from "@/lib/dates";

type BusyState = "add" | "edit" | "delete" | null;
const PAGE_SIZE_OPTIONS = [20, 50, 100, 200];

type ManageTableClientProps = {
  tableName: string;
  viewName: string;
  columns: string[];
  formColumns: string[];
  rows: SheetRow[];
  keyColumn: string;
  search?: string;
  rowLabel?: string;
  detailBasePath?: string;
  addOpenEventName?: string;
  editOpenEventName?: string;
  displayLookups?: Record<string, Record<string, string>>;
};

export function ManageTableClient({
  tableName,
  viewName,
  columns,
  formColumns,
  rows: initialRows,
  keyColumn,
  search = "",
  rowLabel = "รายการ",
  detailBasePath,
  addOpenEventName,
  editOpenEventName,
  displayLookups = {}
}: ManageTableClientProps) {
  const router = useRouter();
  const visibleColumns = useMemo(() => columns.filter(column => column !== "_sheetRow"), [columns]);
  const addColumns = useMemo(() => formColumns.filter(column => column !== "_sheetRow"), [formColumns]);
  const [rows, setRows] = useState<SheetRow[]>(initialRows);
  const [addOpen, setAddOpen] = useState(false);
  const [addValues, setAddValues] = useState<Record<string, string>>(() => emptyValues(addColumns));
  const [editing, setEditing] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [draftRows, setDraftRows] = useState<Record<string, Record<string, string>>>({});
  const [selectedRows, setSelectedRows] = useState<(string | number)[]>([]);
  const [busy, setBusy] = useState<BusyState>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [localSearch, setLocalSearch] = useState(search);
  const [sortDesc, setSortDesc] = useState(true);

  const filteredAndSortedRows = useMemo(() => {
    let result = [...rows];
    if (localSearch.trim()) {
      const lower = localSearch.toLowerCase();
      result = result.filter(row => Object.values(row).some(val => String(val).toLowerCase().includes(lower)));
    }
    if (sortDesc) {
      result.reverse();
    }
    return result;
  }, [rows, localSearch, sortDesc]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const visibleRows = filteredAndSortedRows.slice(startIndex, startIndex + pageSize);
  const visibleStart = visibleRows.length ? startIndex + 1 : 0;
  const visibleEnd = startIndex + visibleRows.length;

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    setAddValues(emptyValues(addColumns));
  }, [addColumns]);

  async function reloadRows() {
    const params = new URLSearchParams({
      tableName,
      viewName,
      limit: "1000",
      _t: String(Date.now())
    });
    if (search) params.set("search", search);
    const response = await fetch(`/api/rows?${params.toString()}`, { cache: "no-store", headers: { "Cache-Control": "no-cache" } });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "โหลดข้อมูลไม่สำเร็จ");
    setRows(payload.rows || []);
    router.refresh();
  }

  function openAddForm() {
    setError("");
    if (addOpenEventName) {
      window.dispatchEvent(new Event(addOpenEventName));
      return;
    }
    setAddValues(emptyValues(addColumns));
    setAddOpen(true);
  }

  async function submitAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("add");
    setError("");
    try {
      await requestJson("/api/rows", {
        method: "POST",
        body: JSON.stringify({ tableName, row: addValues })
      });
      setAddOpen(false);
      await reloadRows();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "เพิ่มข้อมูลไม่สำเร็จ");
    } finally {
      setBusy(null);
    }
  }

  function beginEdit() {
    if (editOpenEventName) return;
    setError("");
    setDeleteMode(false);
    setSelectedRows([]);
    setDraftRows(Object.fromEntries(rows.map((row, index) => [rowId(row, index, keyColumn), draftFromRow(row, visibleColumns)])));
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setDraftRows({});
    setError("");
  }

  function updateDraft(id: string, column: string, value: string) {
    setDraftRows(current => ({
      ...current,
      [id]: {
        ...(current[id] || {}),
        [column]: value
      }
    }));
  }

  async function saveEdit() {
    const changedRows = rows.flatMap((row, index) => {
      const id = rowId(row, index, keyColumn);
      const draft = draftRows[id];
      if (!draft) return [];
      const values = changedValues(row, draft, visibleColumns);
      const targetIdentifier = row._sheetRow ?? row[keyColumn] ?? row.id ?? row.id_bank ?? row.id_store ?? (index + 2);
      return Object.keys(values).length ? [{ sheetRow: targetIdentifier, values }] : [];
    });

    if (!changedRows.length) {
      setEditing(false);
      setDraftRows({});
      return;
    }

    setBusy("edit");
    setError("");
    try {
      for (const changedRow of changedRows) {
        await requestJson("/api/rows", {
          method: "PATCH",
          body: JSON.stringify({ tableName, sheetRow: changedRow.sheetRow, values: changedRow.values })
        });
      }
      setEditing(false);
      setDraftRows({});
      await reloadRows();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "บันทึกข้อมูลไม่สำเร็จ");
    } finally {
      setBusy(null);
    }
  }

  function beginDelete() {
    setError("");
    setEditing(false);
    setDraftRows({});
    setSelectedRows([]);
    setDeleteMode(true);
  }

  function toggleSelected(sheetRow: string | number) {
    setSelectedRows(current => current.includes(sheetRow) ? current.filter(row => row !== sheetRow) : [...current, sheetRow]);
  }

  async function confirmDelete() {
    if (!selectedRows.length) {
      setError("เลือกแถวที่ต้องการลบก่อน");
      return;
    }
    const confirmed = await showConfirm(`ลบ ${selectedRows.length} ${rowLabel}?`);
    if (!confirmed) return;

    setBusy("delete");
    setError("");
    try {
      await requestJson("/api/rows", {
        method: "DELETE",
        body: JSON.stringify({ tableName, sheetRows: selectedRows })
      });
      setDeleteMode(false);
      setSelectedRows([]);
      await reloadRows();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "ลบข้อมูลไม่สำเร็จ");
    } finally {
      setBusy(null);
    }
  }

  async function deleteSingleRow(sheetRow: string | number) {
    if (!sheetRow) {
      setError("ไม่พบตำแหน่งแถวสำหรับลบ");
      return;
    }
    const confirmed = await showConfirm("คุณต้องการลบรายการนี้ใช่หรือไม่?");
    if (!confirmed) return;
    setBusy("delete");
    setError("");
    try {
      await requestJson("/api/rows", {
        method: "DELETE",
        body: JSON.stringify({ tableName, sheetRows: [sheetRow] })
      });
      await reloadRows();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "ลบข้อมูลไม่สำเร็จ");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="w-full flex flex-col gap-3 p-3 sm:p-4 max-w-[1600px] mx-auto font-sans text-xs text-slate-800">
      {/* 1. COMPACT PAGE HEADER */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <h1 className="font-bold text-base text-slate-900 tracking-tight">{viewName}</h1>
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {filteredAndSortedRows.length} {rowLabel}
          </span>
        </div>
      </div>

      {/* 2. FILTER & ACTION TOOLBAR */}
      <div className="border border-slate-200 rounded-md p-3 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Live Search Input Box */}
        <div className="relative flex items-center flex-1 min-w-[220px] max-w-md">
          <Search size={14} className="absolute left-2.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="ค้นหา..."
            value={localSearch}
            onChange={e => setLocalSearch(e.target.value)}
            className="w-full bg-white text-slate-800 text-xs pl-8 pr-7 py-1 rounded-md border border-slate-300 focus:outline-none focus:border-slate-500 placeholder:text-slate-400"
          />
          {localSearch && (
            <X size={14} className="absolute right-2 text-slate-400 cursor-pointer hover:text-slate-600" onClick={() => setLocalSearch("")} />
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-3.5 py-1.5 bg-[#d4f54e] hover:bg-[#c2e438] text-[#0b3531] text-xs font-extrabold rounded-lg shadow-2xs border border-[#b8df28] transition cursor-pointer flex items-center gap-1.5 shrink-0"
            disabled={Boolean(busy)}
            onClick={openAddForm}
          >
            <Plus size={15} />
            <span>เพิ่มข้อมูล</span>
          </button>

          <button
            type="button"
            onClick={() => setSortDesc(!sortDesc)}
            className="px-2.5 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
            title="สลับการเรียงลำดับ"
          >
            <ArrowDownUp size={14} className="text-slate-600 shrink-0" />
            <span>{sortDesc ? "ล่าสุดก่อน" : "เก่าสุดก่อน"}</span>
          </button>

          {editing ? (
            <>
              <button
                type="button"
                className="px-3.5 py-1.5 bg-[#0b3531] hover:bg-[#072724] text-white rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer"
                disabled={busy === "edit"}
                onClick={saveEdit}
              >
                <Save size={14} />
                <span>บันทึก</span>
              </button>
              <button
                type="button"
                className="px-2.5 py-1 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-md text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                disabled={Boolean(busy)}
                onClick={cancelEdit}
              >
                <X size={14} />
                <span>ยกเลิก</span>
              </button>
            </>
          ) : editOpenEventName ? null : (
            <button
              type="button"
              className="px-2.5 py-1 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-md text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              disabled={Boolean(busy) || !rows.length}
              onClick={beginEdit}
            >
              <Pencil size={14} />
              <span>แก้ไขด่วน</span>
            </button>
          )}

          {deleteMode ? (
            <>
              <button
                type="button"
                className="px-3 py-1 bg-rose-700 hover:bg-rose-800 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                disabled={busy === "delete" || !selectedRows.length}
                onClick={confirmDelete}
              >
                <Trash2 size={14} />
                <span>ยืนยันลบ ({selectedRows.length})</span>
              </button>
              <button
                type="button"
                className="px-2.5 py-1 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-md text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                disabled={Boolean(busy)}
                onClick={() => { setDeleteMode(false); setSelectedRows([]); }}
              >
                <X size={14} />
                <span>ยกเลิก</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              className="px-2.5 py-1 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-md text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              disabled={Boolean(busy) || !rows.length}
              onClick={beginDelete}
            >
              <Trash2 size={14} />
              <span>เลือกลบ</span>
            </button>
          )}
        </div>
      </div>

      {error ? <div className="p-3 bg-rose-50 text-rose-700 rounded-md border border-rose-200 text-xs font-bold">{error}</div> : null}

      {/* 3. WORK TABLE CARD */}
      <div className="border border-slate-200 rounded-md bg-white overflow-hidden">
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 border-collapse font-sans">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200 text-xs">
                  {deleteMode ? (
                    <th className="py-2.5 px-3 w-10 text-center border-r border-slate-200">
                      <input
                        type="checkbox"
                        checked={
                          visibleRows.length > 0 &&
                          visibleRows.every((r, i) => {
                            const sr = getRowKey(r, startIndex + i, keyColumn);
                            return selectedRows.includes(sr);
                          })
                        }
                        onChange={(e) => {
                          const visibleSheetRows = visibleRows.map((r, i) => getRowKey(r, startIndex + i, keyColumn));
                          if (e.target.checked) {
                            setSelectedRows(prev => [...new Set([...prev, ...visibleSheetRows])]);
                          } else {
                            const visibleSet = new Set(visibleSheetRows);
                            setSelectedRows(prev => prev.filter(id => !visibleSet.has(id)));
                          }
                        }}
                        title="เลือกทั้งหมด"
                        className="cursor-pointer rounded border-slate-300 accent-slate-900"
                      />
                    </th>
                  ) : null}
                  {visibleColumns.map(column => (
                    <th
                      key={column}
                      data-label={column}
                      className={`py-2.5 px-3 border-r border-slate-200 ${
                        isAmountColumn(column) ? "text-right" : isCenterColumn(column) || isDateColumn(column) ? "text-center" : ""
                      }`}
                    >
                      {column}
                    </th>
                  ))}
                  {!editing && !deleteMode ? <th className="py-2.5 px-3 text-center" data-label="จัดการ">จัดการ</th> : null}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row, index) => {
                  const rowIndex = startIndex + index;
                  const id = rowId(row, rowIndex, keyColumn);
                  const sheetRow = getRowKey(row, rowIndex, keyColumn);
                  const targetKey = String(row[keyColumn] || row.id_store || row.id_Contractor || row.id_bank || row["ID Project"] || row["ชื่อร้าน"] || row["ชื่อร้านค้า"] || row.id || sheetRow || "");

                  return (
                    <tr key={id}>
                      {deleteMode ? (
                        <td className="py-2.5 px-3.5 text-center w-10" data-label="เลือก">
                          <input
                            type="checkbox"
                            checked={selectedRows.includes(sheetRow)}
                            disabled={Boolean(busy)}
                            onChange={() => toggleSelected(sheetRow)}
                            className="cursor-pointer w-4 h-4 rounded border-slate-300 accent-slate-900"
                          />
                        </td>
                      ) : null}
                      {visibleColumns.map(column => {
                        const draftValue = draftRows[id]?.[column] ?? stringify(row[column]);
                        const cellContent = renderDisplayCell(column, row[column], displayLookups);
                        const isLinkColumn = column === visibleColumns[0] || column === "ชื่อ Project" || column === "ชื่อร้าน" || column === "ชื่อร้านค้า" || column === "ร้านค้า" || column === "ชื่อ-นามสกุล" || column === "ชื่อบริษัท" || column === "ชื่อลูกค้า" || column === "id_store";

                        return (
                          <td
                            key={column}
                            className={[
                              "py-2 px-3 text-xs border-r border-slate-100",
                              isAmountColumn(column) ? "text-right font-bold text-slate-900" : "",
                              isCenterColumn(column) ? "text-center" : "",
                              isDateColumn(column) ? "text-center" : "",
                              editing ? "editing-cell" : ""
                            ].filter(Boolean).join(" ") || undefined}
                            data-column={column}
                            data-label={column}
                          >
                            {editing ? (
                              <input
                                className="w-full px-2 py-0.5 text-xs border border-slate-300 rounded bg-white focus:outline-none focus:border-slate-500"
                                value={draftValue}
                                onChange={event => updateDraft(id, column, event.target.value)}
                              />
                            ) : detailBasePath && isLinkColumn ? (
                              <Link
                                href={`${detailBasePath}/${encodeURIComponent(targetKey)}`}
                                className="font-bold text-slate-900 hover:underline"
                              >
                                {cellContent}
                              </Link>
                            ) : (
                              cellContent
                            )}
                          </td>
                        );
                      })}
                      {!editing && !deleteMode ? (
                        <td className="py-2 px-3 text-center w-24" data-label="จัดการ">
                          <div className="flex items-center justify-center gap-1 min-w-[70px]">
                            {detailBasePath ? (
                              <Link
                                className="inline-flex items-center justify-center w-6 h-6 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition"
                                href={`${detailBasePath}/${encodeURIComponent(targetKey)}`}
                                aria-label="ดูรายละเอียด"
                                title="ดูรายละเอียด"
                              >
                                <Eye size={13} />
                              </Link>
                            ) : null}
                            {editOpenEventName ? (
                              <button
                                type="button"
                                className="inline-flex items-center justify-center w-6 h-6 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                                disabled={Boolean(busy)}
                                onClick={() => {
                                  if (typeof window !== "undefined") {
                                    window.dispatchEvent(new CustomEvent(editOpenEventName, { detail: { row } }));
                                  }
                                }}
                                aria-label="แก้ไข"
                                title="แก้ไข"
                              >
                                <Pencil size={13} />
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="inline-flex items-center justify-center w-6 h-6 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                                disabled={Boolean(busy)}
                                onClick={() => { setEditing(true); setDraftRows({ [id]: draftFromRow(row, visibleColumns) }); }}
                                aria-label="แก้ไข"
                                title="แก้ไข"
                              >
                                <Pencil size={13} />
                              </button>
                            )}
                            <button
                              type="button"
                              className="inline-flex items-center justify-center w-6 h-6 rounded border border-rose-300 bg-white text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                              disabled={Boolean(busy) || !sheetRow}
                              onClick={() => deleteSingleRow(sheetRow)}
                              aria-label="ลบ"
                              title="ลบ"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 text-xs font-medium">ไม่พบข้อมูล</div>
        )}
        {rows.length ? (
          <ManagePagination
            currentPage={currentPage}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            pageSize={pageSize}
            rowLabel={rowLabel}
            totalPages={totalPages}
            totalRows={rows.length}
            visibleEnd={visibleEnd}
            visibleStart={visibleStart}
          />
        ) : null}
      </div>

      {addOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" role="presentation">
          <form
            className="w-full max-w-xl bg-white rounded-md shadow-xl overflow-hidden flex flex-col border border-slate-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="manage-add-title"
            onSubmit={submitAdd}
          >
            <header className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
              <div>
                <h3 id="manage-add-title" className="text-sm font-bold text-slate-900 m-0">เพิ่มข้อมูล</h3>
                <span className="text-xs text-slate-500 font-normal">{viewName}</span>
              </div>
              <button
                type="button"
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                aria-label="ปิด"
                disabled={Boolean(busy)}
                onClick={() => setAddOpen(false)}
              >
                <X size={16} />
              </button>
            </header>
            <div className="p-4 max-h-[70vh] overflow-y-auto space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {addColumns.map(column => (
                  <label className="flex flex-col gap-1 text-xs" key={column}>
                    <span className="font-semibold text-slate-700">{column}</span>
                    <input
                      name={column}
                      value={addValues[column] || ""}
                      disabled={Boolean(busy)}
                      onChange={event => setAddValues(current => ({ ...current, [column]: event.target.value }))}
                      className="w-full h-8 px-2.5 bg-white border border-slate-300 focus:border-slate-500 focus:outline-none rounded text-xs font-normal text-slate-900 placeholder:text-slate-400 transition"
                    />
                  </label>
                ))}
              </div>
              {error ? <div className="p-2.5 bg-rose-50 text-rose-700 rounded text-xs font-medium border border-rose-200">{error}</div> : null}
            </div>
            <footer className="flex items-center justify-end gap-2 px-4 py-3 bg-slate-50 border-t border-slate-200">
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => setAddOpen(false)}
                className="px-3 py-1 rounded text-xs font-semibold text-slate-700 hover:bg-slate-200 transition"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={busy === "add"}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 transition cursor-pointer"
              >
                <Save size={14} />
                <span>บันทึก</span>
              </button>
            </footer>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function emptyValues(columns: string[]) {
  return Object.fromEntries(columns.map(column => [column, ""]));
}

function ManagePagination({
  currentPage,
  onPageChange,
  onPageSizeChange,
  pageSize,
  rowLabel,
  totalPages,
  totalRows,
  visibleEnd,
  visibleStart
}: {
  currentPage: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSize: number;
  rowLabel: string;
  totalPages: number;
  totalRows: number;
  visibleEnd: number;
  visibleStart: number;
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
            {PAGE_SIZE_OPTIONS.map(option => (
              <button
                key={option}
                type="button"
                className={`px-2 py-0.5 rounded text-xs font-semibold transition cursor-pointer ${
                  option === pageSize
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                }`}
                aria-current={option === pageSize ? "true" : undefined}
                onClick={() => onPageSizeChange(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>
      <nav className="flex items-center gap-1" aria-label="table pages">
        <PageButton disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}>
          <ChevronLeft size={14} aria-hidden="true" />
          <span>ก่อนหน้า</span>
        </PageButton>
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
              aria-current={page === currentPage ? "page" : undefined}
              onClick={() => onPageChange(page)}
            >
              {page}
            </button>
          )
        ))}
        <PageButton disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)}>
          <span>ถัดไป</span>
          <ChevronRight size={14} aria-hidden="true" />
        </PageButton>
      </nav>
    </div>
  );
}

function PageButton({ children, disabled, onClick }: { children: ReactNode; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
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

function rowId(row: SheetRow, index: number, keyColumn: string) {
  return String(row._sheetRow ?? row[keyColumn] ?? index);
}

function draftFromRow(row: SheetRow, columns: string[]) {
  return Object.fromEntries(columns.map(column => [column, stringify(row[column])]));
}

function changedValues(row: SheetRow, draft: Record<string, string>, columns: string[]) {
  return Object.fromEntries(
    columns
      .filter(column => stringify(row[column]) !== (draft[column] ?? ""))
      .map(column => [column, draft[column] ?? ""])
  );
}

async function requestJson(url: string, init: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {})
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "ดำเนินการไม่สำเร็จ");
  return payload;
}

function stringify(value: RowValue | undefined) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function formatValue(value: RowValue | undefined, column = "") {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return value.toLocaleString("th-TH", { maximumFractionDigits: 2 });
  if (isAmountColumn(column)) {
    const parsed = Number(String(value).replace(/,/g, ""));
    if (Number.isFinite(parsed) && String(value).trim() !== "") {
      return parsed.toLocaleString("th-TH", { maximumFractionDigits: 2 });
    }
  }
  return String(value);
}

function renderDisplayCell(column: string, value: RowValue | undefined, displayLookups: Record<string, Record<string, string>>) {
  if (isImageColumn(column)) return <BillImageThumbnail value={value} />;
  if (column === "color") return <ColorDot value={value} />;
  const rawValue = stringify(value);
  const lookup = displayLookups[column];
  if (lookup && rawValue) return lookup[rawValue] || rawValue;
  if (isDateColumn(column) && rawValue) return formatDateThai(rawValue);
  return formatValue(value, column);
}

function ColorDot({ value }: { value: RowValue | undefined }) {
  const label = stringify(value).trim();
  const tone = label.toLowerCase();
  const bgClass = tone === "green"
    ? "bg-emerald-500 ring-2 ring-emerald-200"
    : tone === "red"
      ? "bg-rose-500 ring-2 ring-rose-200"
      : tone === "black"
        ? "bg-slate-900 ring-2 ring-slate-300"
        : "bg-slate-200";
  return (
    <span className="inline-flex items-center justify-center" title={label || "-"}>
      <span className={`w-3 h-3 rounded-full ${bgClass} transition-all`} aria-label={label || "-"} />
    </span>
  );
}

function isImageColumn(column: string) {
  return column === "image" || column.includes("รูปถ่าย") || column.toLowerCase().includes("image");
}

function isDateColumn(column: string) {
  return /วันที่|date|ว\/ด\/ป/.test(column);
}

function isCenterColumn(column: string) {
  return column === "color" || column === "COLOR" || column === "จัดการ";
}

function formatDateThai(value: string): string {
  return formatDateDisplay(value);
}

function isAmountColumn(column: string) {
  return /ยอด|เงิน|ราคา|vat|หัก|เครดิต|ค่าแรง|รวม|คงเหลือ|โอน|งบ/.test(column);
}

function getRowKey(row: SheetRow, defaultIndex: number, keyColumn?: string): string | number {
  const val = row._sheetRow ?? row.id ?? (keyColumn ? row[keyColumn] : undefined) ?? row.id_store ?? row.id_bank ?? row.id_Contractor ?? row.id_car ?? row.id_cus ?? row.id_Company;
  if (typeof val === "string" || typeof val === "number") return val;
  return defaultIndex + 2;
}

