"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownWideNarrow, ArrowUpWideNarrow, ChevronLeft, ChevronRight, Eye, Search, X } from "lucide-react";
import { FormModal } from "@/components/FormModal";
import { BillWorkflowActions } from "@/components/BillWorkflowActions";
import { BillDetailDrawer } from "@/components/BillDetailDrawer";
import { FORM_SCHEMAS } from "@/lib/schemas";
import { formatDateDisplay, normalizeDateToIso, parseDateStrict } from "@/lib/dates";
import { money, toNumber } from "@/lib/numbers";
import type { SheetRow } from "@/lib/types";

type BillsDashboardClientProps = {
  columns: string[];
  initialRows: SheetRow[];
  form: any;
  isAdmin: boolean;
  peopleRows: SheetRow[];
  search: string;
  page: number;
  pageSize: number;
  sort: "latest" | "oldest";
};

const PAGE_SIZE_OPTIONS = [20, 50, 100, 200];

export function BillsDashboardClient({
  columns,
  initialRows,
  form,
  isAdmin,
  peopleRows,
  search: initialSearch = "",
  page: initialPage = 1,
  pageSize: initialPageSize = 20,
  sort: initialSort = "latest",
}: BillsDashboardClientProps) {
  const [filters, setFilters] = useState({
    requester: "",
    date: "",
    bill: "",
    status: "",
    search: initialSearch,
  });
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sortDesc, setSortDesc] = useState(initialSort === "latest");

  // Bill Detail Drawer State
  const [selectedDetailIndex, setSelectedDetailIndex] = useState<number | null>(null);

  const requesterNames = useMemo(() => {
    return peopleRows.reduce<Record<string, string>>((names, row) => {
      const key = String(row["รหัสพนักงาน"] || row["ชื่อเล่น"] || "").trim();
      const name = String(row["ชื่อเล่น"] || "").trim();
      if (key && name) names[key] = name;
      return names;
    }, {});
  }, [peopleRows]);

  const activeForm = form || {
    tableName: "Data",
    schema: FORM_SCHEMAS["Data"] || [],
    initialValues: { "บิล": "ย่อย", "ร้านค้า/ผู้รับเหมา": "ร้านค้า", "ว/ด/ป": new Date().toISOString().slice(0, 10) },
    refOptions: {}
  };

  const filteredRows = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    const requester = filters.requester.trim();
    const bill = filters.bill.trim();
    const status = filters.status.trim();
    const filterDateIso = filters.date.trim();

    return initialRows.filter(row => {
      if (requester && String(row["ผู้เบิก"] || "").trim() !== requester) return false;
      if (bill && String(row["บิล"] || "").trim() !== bill) return false;
      if (status && String(row["สถานะ"] || "").trim() !== status) return false;
      if (filterDateIso) {
        const rowIso = normalizeDateToIso(row["ว/ด/ป"]);
        if (rowIso !== filterDateIso) return false;
      }
      if (query) {
        const found = Object.values(row).some(v => String(v || "").toLowerCase().includes(query));
        if (!found) return false;
      }
      return true;
    }).sort((a, b) => {
      const seqA = Number(a._sheetRow || a["ลำดับ"] || a.id || 0);
      const seqB = Number(b._sheetRow || b["ลำดับ"] || b.id || 0);
      return sortDesc ? seqB - seqA : seqA - seqB;
    });
  }, [initialRows, filters, sortDesc]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const visibleRows = filteredRows.slice(pageStart, pageStart + pageSize);
  const visibleStart = visibleRows.length ? pageStart + 1 : 0;
  const visibleEnd = pageStart + visibleRows.length;

  const totalAmount = filteredRows.reduce((sum, row) => sum + toNumber(row["ยอดเงิน"]), 0);
  const approvedAmount = filteredRows
    .filter(row => String(row["สถานะ"] || "").includes("อนุมัติ") || String(row["สถานะ"] || "").includes("เบิกแล้ว"))
    .reduce((sum, row) => sum + toNumber(row["ยอดเงิน"]), 0);
  const pendingAmount = totalAmount - approvedAmount;

  useEffect(() => {
    setPage(1);
  }, [filters, pageSize]);

  function updateFilter(name: string, value: string) {
    setFilters(cur => ({ ...cur, [name]: value }));
  }

  return (
    <div className="w-full flex flex-col gap-5 p-4 sm:p-6 max-w-[1600px] mx-auto font-sans">
      {/* 1. EXECUTIVE SUMMARY KPI CARDS */}
      <div className="hidden md:grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">รายการบิลทั้งหมด</span>
          <div className="text-xl font-extrabold text-slate-900">{filteredRows.length} รายการ</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider">รวมยอดเงินบิล</span>
          <div className="text-xl font-extrabold text-indigo-900">{money(totalAmount)}</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">ยอดอนุมัติ/เบิกแล้ว</span>
          <div className="text-xl font-extrabold text-emerald-700">{money(approvedAmount)}</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider">ยอดรออนุมัติ</span>
          <div className="text-xl font-extrabold text-amber-700">{money(pendingAmount)}</div>
        </div>
      </div>

      {/* 2. PRO FILTER TOOLBAR */}
      <div className="hidden md:flex bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs flex-1">
          {/* Requester Filter */}
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

          {/* Date Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 whitespace-nowrap">วันที่:</span>
            <input
              type="date"
              value={filters.date}
              onChange={event => updateFilter("date", event.target.value)}
              className="bg-slate-50 hover:bg-slate-100/90 text-slate-800 text-xs font-semibold px-3 py-1.5 h-9 rounded-xl border border-slate-200 focus:bg-white focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer"
            />
          </div>

          {/* Bill Type Filter */}
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

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 whitespace-nowrap">สถานะ:</span>
            <select
              value={filters.status}
              onChange={event => updateFilter("status", event.target.value)}
              className="bg-slate-50 hover:bg-slate-100/90 text-slate-800 text-xs font-semibold px-3 py-2 h-9 rounded-xl border border-slate-200 focus:bg-white focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer"
            >
              <option value="">ทั้งหมด</option>
              <option value="รออนุมัติ">รออนุมัติ</option>
              <option value="ตั้งเบิก">ตั้งเบิก</option>
              <option value="อนุมัติ">อนุมัติ</option>
              <option value="เบิกแล้ว">เบิกแล้ว</option>
            </select>
          </div>

          {/* Search Input */}
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

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSortDesc(cur => !cur)}
            className="h-9 px-3.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-extrabold inline-flex items-center justify-center gap-1.5 transition shadow-2xs whitespace-nowrap cursor-pointer"
            title="สลับการเรียงลำดับ"
          >
            {sortDesc ? <ArrowDownWideNarrow size={14} className="text-indigo-600" /> : <ArrowUpWideNarrow size={14} className="text-indigo-600" />}
            <span>{sortDesc ? "ล่าสุดก่อน" : "เก่าสุดก่อน"}</span>
          </button>

          <FormModal
            form={activeForm}
            title="เพิ่มบิล"
            buttonLabel="เพิ่มบิล"
            submitPath="/api/bills"
            openEventName="open-bill-form"
          />
        </div>
      </div>

      {/* Hidden Add Modal Trigger for Mobile & Global Events */}
      <FormModal
        form={activeForm}
        title="เพิ่มบิล"
        buttonLabel="เพิ่มบิล"
        submitPath="/api/bills"
        openEventName="open-bill-form"
        hideLauncher
      />

      {/* Hidden Edit Modal Trigger */}
      <FormModal
        form={activeForm}
        title="แก้ไขบิล"
        buttonLabel="แก้ไขบิล"
        submitPath="/api/rows"
        openEventName="open-bill-edit-form"
        hideLauncher
      />

      {/* 3. PRO WORK TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {!visibleRows.length ? (
          <div className="p-10 text-center text-slate-400 text-xs font-medium">ไม่พบรายการบิล</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200/90 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-2 px-3 text-center">ลำดับ</th>
                  <th className="py-2 px-3 text-center">ID Project</th>
                  <th className="py-2 px-3">ชื่อ Project</th>
                  <th className="py-2 px-3">ร้าน/บุคคล</th>
                  <th className="py-2 px-3">สินค้า/ทำงาน</th>
                  <th className="py-2 px-3 text-center">บิล</th>
                  <th className="py-2 px-3 text-center">ประเภท</th>
                  <th className="py-2 px-3 text-right">ยอดเงิน</th>
                  <th className="py-2 px-3 text-center">เงื่อนไข</th>
                  <th className="py-2 px-3 text-center">ผู้เบิก</th>
                  <th className="py-2 px-3 text-center">ว/ด/ป</th>
                  <th className="py-2 px-3 text-center">สถานะ</th>
                  <th className="py-2 px-3 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {visibleRows.map((row, idx) => {
                  const seq = String(row["ลำดับ"] || row._sheetRow || row.id || idx + 1);
                  const statusStr = String(row["สถานะ"] || "รออนุมัติ").trim();
                  const requesterKey = String(row["ผู้เบิก"] || "").trim();
                  const requesterName = requesterNames[requesterKey] || requesterKey || "-";
                  const conditions = [
                    row.vat ? `VAT ${row.vat}` : "",
                    row["หัก"] ? `หัก ${row["หัก"]}` : "",
                    row["เครดิต"] ? `เครดิต ${row["เครดิต"]}` : ""
                  ].filter(Boolean).join(" · ");

                  return (
                    <tr
                      key={`${seq}-${idx}`}
                      onClick={() => window.location.href = `/bills/${seq}`}
                      className="hover:bg-slate-100/90 transition-colors cursor-pointer group"
                    >
                      <td className="p-3 text-center font-bold text-slate-900">{seq}</td>
                      <td className="p-3 text-center font-bold text-indigo-600 group-hover:underline">{String(row["ID Project"] || "-")}</td>
                      <td className="p-3 font-extrabold text-slate-900 max-w-[200px] truncate" title={String(row["ชื่อ Project"] || "")}>
                        {String(row["ชื่อ Project"] || "-")}
                      </td>
                      <td className="p-3 font-semibold text-slate-800 max-w-[160px] truncate" title={String(row["ร้าน/บุคคล"] || "")}>
                        {String(row["ร้าน/บุคคล"] || "-")}
                      </td>
                      <td className="p-3 text-slate-600 max-w-[180px] truncate" title={String(row["สินค้า/ทำงาน"] || "")}>
                        {String(row["สินค้า/ทำงาน"] || "-")}
                      </td>
                      <td className="p-3 text-center font-bold text-indigo-600">{String(row["บิล"] || "-")}</td>
                      <td className="p-3 text-center text-slate-600">{String(row["ประเภท"] || "-")}</td>
                      <td className="p-3 text-right font-extrabold text-slate-900">{money(row["ยอดเงิน"])}</td>
                      <td className="p-3 text-center text-[11px] text-slate-500">{conditions || "-"}</td>
                      <td className="p-3 text-center font-semibold text-slate-700">{requesterName}</td>
                      <td className="p-3 text-center font-semibold text-slate-600">{formatDateDisplay(row["ว/ด/ป"])}</td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-extrabold ${
                          statusStr.includes("อนุมัติ")
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : statusStr.includes("เบิกแล้ว")
                            ? "bg-slate-100 text-slate-700 border border-slate-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}>
                          {statusStr}
                        </span>
                      </td>
                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => window.location.href = `/bills/${seq}`}
                            className="w-7 h-7 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 flex items-center justify-center transition"
                            title="ดูรายละเอียดบิล"
                          >
                            <Eye size={14} />
                          </button>
                          <BillWorkflowActions row={row} compact allowEdit />
                        </div>
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

      {/* BILL DETAIL DRAWER & PROJECT DETAIL LINK */}
      {selectedDetailIndex !== null && (
        <BillDetailDrawer
          bill={visibleRows[selectedDetailIndex] || null}
          onClose={() => setSelectedDetailIndex(null)}
          onEdit={(bill) => {
            setSelectedDetailIndex(null);
            window.dispatchEvent(new CustomEvent("open-bill-edit-form", { detail: { row: bill } }));
          }}
          onDelete={async (bill) => {
            const sheetRow = Number(bill._sheetRow);
            if (!confirm(`คุณต้องการลบบิล ${String(bill["ลำดับ"] || bill["รายการ"] || "")} ใช่หรือไม่?`)) return;
            try {
              const res = await fetch("/api/rows", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tableName: "Data", sheetRows: [sheetRow] }),
              });
              if (res.ok) {
                setSelectedDetailIndex(null);
                window.location.reload();
              } else {
                const err = await res.json();
                alert(`ลบบิลไม่สำเร็จ: ${err.error || "เกิดข้อผิดพลาด"}`);
              }
            } catch (e: any) {
              alert(`เกิดข้อผิดพลาด: ${e.message}`);
            }
          }}
          onPrev={() => setSelectedDetailIndex((i) => (i !== null && i > 0 ? i - 1 : i))}
          onNext={() => setSelectedDetailIndex((i) => (i !== null && i < visibleRows.length - 1 ? i + 1 : i))}
          hasPrev={selectedDetailIndex > 0}
          hasNext={selectedDetailIndex < visibleRows.length - 1}
        />
      )}
    </div>
  );
}
