"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Eye,
  FileCheck,
  Loader2,
  MessageSquare,
  Receipt,
  RotateCw,
  Search,
  Upload,
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

function calculateDaysElapsed(dateVal: unknown): number {
  if (!dateVal) return 0;
  const iso = normalizeDateToIso(dateVal);
  if (!iso) return 0;
  const billDate = new Date(iso);
  if (isNaN(billDate.getTime())) return 0;
  const today = new Date();
  const diffTime = Math.max(0, today.getTime() - billDate.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export function BillFollowDashboardClient({
  vatRows,
  naturalDeductRows,
  companyDeductRows,
  creditRows,
  requesterNames,
  peopleRows = [],
}: BillFollowDashboardClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"all" | "vat" | "natural" | "company" | "credit">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRequester, setSelectedRequester] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);

  // Quick Action & Notification States
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [completedRowIds, setCompletedRowIds] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }

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

  // Quick Action: Mark Received / Completed
  async function handleMarkReceived(row: SheetRow, targetType: "vat" | "deduct" | "credit" | "all") {
    const sheetRow = row._sheetRow ?? row.id ?? row["ลำดับ"];
    const rowId = String(row["ลำดับ"] || row._sheetRow || "");
    if (!sheetRow) return;

    const todayStr = new Date().toISOString().split("T")[0];
    const updateValues: SheetRow = {};

    if (targetType === "vat" || (targetType === "all" && row.vat && !row["วันได้บิล"])) {
      updateValues["วันได้บิล"] = todayStr;
    }
    if (targetType === "deduct" || (targetType === "all" && row["หัก"] && !row["วันออก 3%"])) {
      updateValues["วันออก 3%"] = todayStr;
    }
    if (targetType === "credit" || (targetType === "all" && row["เครดิต"] && !row["วันจ่าย"])) {
      updateValues["วันจ่าย"] = todayStr;
    }

    if (!Object.keys(updateValues).length) {
      updateValues["วันได้บิล"] = todayStr;
    }
    if (rowId) {
      updateValues["ลำดับ"] = rowId;
    }

    setSavingRowId(rowId);
    try {
      const res = await fetch("/api/rows", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableName: "Data",
          sheetRow,
          values: updateValues,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Update failed");

      setCompletedRowIds((prev) => new Set(prev).add(rowId));
      showToast(`บันทึกได้รับบิลรายการ #${rowId} เรียบร้อยแล้ว`);
      router.refresh();
    } catch (err: any) {
      alert(`เกิดข้อผิดพลาดในการบันทึกสถานะบิล: ${err?.message || "กรุณาลองใหม่อีกครั้ง"}`);
    } finally {
      setSavingRowId(null);
    }
  }

  // Generate LINE follow-up message text
  function generateLineText(row: SheetRow) {
    const billId = String(row["ลำดับ"] || row._sheetRow || "");
    const vendor = String(row["ร้าน/บุคคล"] || "-");
    const project = String(row["ชื่อ Project"] || "-");
    const item = String(row["สินค้า/ทำงาน"] || row["รายการ"] || "-");
    const date = formatDateDisplay(row["ว/ด/ป"]);
    const requesterCode = String(row["ผู้เบิก"] || "").trim();
    const requesterName = requesterNames[requesterCode] || requesterCode || "ผู้เบิก";
    const amount = money(toNumber(row["ยอดเงิน"]));
    const days = calculateDaysElapsed(row["ว/ด/ป"]);

    const conditions = [];
    if (row.vat && !row["วันได้บิล"]) conditions.push(`ใบกำกับภาษี VAT ${row.vat}`);
    if (row["หัก"] && !row["วันออก 3%"]) conditions.push(`หนังสือหัก ณ ที่จ่าย ${row["หัก"]}%`);
    if (row["เครดิต"] && !row["วันจ่าย"]) conditions.push(`บิลเครดิต ${row["เครดิต"]} วัน`);
    const condStr = conditions.join(" / ") || "บิลสินค้า";

    return `📢 แจ้งติดตามเอกสารบิล/ใบเสร็จรับเงิน
----------------------------------
👤 ผู้เบิก: ${requesterName}
🏗️ โครงการ: ${project}
🏪 ร้าน/บุคคล: ${vendor}
📄 เลขที่บิล/ลำดับ: #${billId}
📝 รายการ: ${item}
💰 ยอดเงิน: ${amount} บาท
📅 วันที่รายการ: ${date}
⏳ ค้างเอกสารมาแล้ว: ${days} วัน
📌 เอกสารที่ต้องส่ง: ${condStr}
----------------------------------
รบกวนนำส่งเอกสารต้นฉบับให้ฝ่ายบัญชีด้วยครับ/ค่ะ 🙏`;
  }

  function copyLineText(row: SheetRow) {
    const billId = String(row["ลำดับ"] || row._sheetRow || "");
    const text = generateLineText(row);
    navigator.clipboard.writeText(text);
    setCopiedId(billId);
    showToast(`คัดลอกข้อความติดตามบิล #${billId} สำหรับส่ง LINE แล้ว!`);
    setTimeout(() => setCopiedId(null), 2500);
  }

  // Copy batch summary for selected requester
  function copyRequesterBatchText() {
    if (!selectedRequester || !filteredRows.length) return;
    const reqName = requesterNames[selectedRequester] || selectedRequester;
    let text = `📢 สรุปรายการตามบิลค้างส่งของคุณ ${reqName} (${filteredRows.length} รายการ)\n----------------------------------\n`;

    filteredRows.forEach((r, idx) => {
      const bId = String(r["ลำดับ"] || r._sheetRow || idx + 1);
      const prj = String(r["ชื่อ Project"] || "-");
      const vdr = String(r["ร้าน/บุคคล"] || "-");
      const amt = money(toNumber(r["ยอดเงิน"]));
      const days = calculateDaysElapsed(r["ว/ด/ป"]);
      text += `${idx + 1}. #${bId} - ${prj} (${vdr}) ยอด ${amt} บ. [ค้าง ${days} วัน]\n`;
    });

    text += `----------------------------------\nรบกวนตรวจสอบและส่งเอกสารให้ฝ่ายบัญชีด้วยนะครับ/ค่ะ 🙏`;
    navigator.clipboard.writeText(text);
    showToast(`คัดลอกสรุปรายการตามบิลของคุณ ${reqName} แล้ว!`);
  }

  return (
    <div className="w-full flex flex-col gap-4 p-4 sm:p-5 max-w-[1600px] mx-auto font-sans text-sm text-slate-800 relative">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white border border-slate-700 px-4 py-3 rounded-md shadow-lg flex items-center gap-3 animate-in fade-in duration-200">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
          <button type="button" onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white ml-2">
            <X size={15} />
          </button>
        </div>
      )}

      {/* 1. EXECUTIVE SUMMARY KPI CARDS (2x2 on Mobile, 4-col on Desktop) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Vat Card */}
        <div
          onClick={() => handleTabChange("vat")}
          className={`bg-white rounded-md p-2.5 sm:p-3 border transition cursor-pointer shadow-2xs ${
            activeTab === "vat" ? "border-slate-900 bg-slate-50 font-bold" : "border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-[11px] sm:text-xs">
            <span className="font-semibold text-slate-700 truncate">ตาม VAT (ยังไม่ได้บิล)</span>
            <span className="text-slate-400 shrink-0 ml-1">{vatRows.length} รายการ</span>
          </div>
          <div className="flex items-baseline justify-between mt-1.5 sm:mt-2">
            <span className="text-sm sm:text-base font-bold text-slate-900">{money(vatTotal)}</span>
          </div>
        </div>

        {/* Natural Deduct 3% Card */}
        <div
          onClick={() => handleTabChange("natural")}
          className={`bg-white rounded-md p-2.5 sm:p-3 border transition cursor-pointer shadow-2xs ${
            activeTab === "natural" ? "border-slate-900 bg-slate-50 font-bold" : "border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-[11px] sm:text-xs">
            <span className="font-semibold text-slate-700 truncate">ตาม หัก 3% (บุคคล)</span>
            <span className="text-slate-400 shrink-0 ml-1">{naturalDeductRows.length} รายการ</span>
          </div>
          <div className="flex items-baseline justify-between mt-1.5 sm:mt-2">
            <span className="text-sm sm:text-base font-bold text-slate-900">{money(naturalTotal)}</span>
          </div>
        </div>

        {/* Company Deduct 3% Card */}
        <div
          onClick={() => handleTabChange("company")}
          className={`bg-white rounded-md p-2.5 sm:p-3 border transition cursor-pointer shadow-2xs ${
            activeTab === "company" ? "border-slate-900 bg-slate-50 font-bold" : "border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-[11px] sm:text-xs">
            <span className="font-semibold text-slate-700 truncate">ตาม หัก 3% (บริษัท)</span>
            <span className="text-slate-400 shrink-0 ml-1">{companyDeductRows.length} รายการ</span>
          </div>
          <div className="flex items-baseline justify-between mt-1.5 sm:mt-2">
            <span className="text-sm sm:text-base font-bold text-slate-900">{money(companyTotal)}</span>
          </div>
        </div>

        {/* Credit Card */}
        <div
          onClick={() => handleTabChange("credit")}
          className={`bg-white rounded-md p-2.5 sm:p-3 border transition cursor-pointer shadow-2xs ${
            activeTab === "credit" ? "border-slate-900 bg-slate-50 font-bold" : "border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-[11px] sm:text-xs">
            <span className="font-semibold text-slate-700 truncate">ตาม เครดิต (รอจ่าย)</span>
            <span className="text-slate-400 shrink-0 ml-1">{creditRows.length} รายการ</span>
          </div>
          <div className="flex items-baseline justify-between mt-1.5 sm:mt-2">
            <span className="text-sm sm:text-base font-bold text-slate-900">{money(creditTotal)}</span>
          </div>
        </div>
      </div>

      {/* 2. FILTER & ACTION TOOLBAR */}
      <div className="border border-slate-200 rounded-md p-3 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        {/* Left Filters */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Requester dropdown */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 whitespace-nowrap">ผู้เบิก:</span>
            <select
              value={selectedRequester}
              onChange={(e) => {
                setSelectedRequester(e.target.value);
                setPage(1);
              }}
              className="bg-white border border-slate-300 text-xs text-slate-800 px-2.5 py-1 rounded-md focus:outline-none cursor-pointer"
            >
              <option value="">ทั้งหมด ({allPendingRows.length} รายการ)</option>
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
            <span className="font-semibold text-slate-700 whitespace-nowrap">วันที่:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setPage(1);
              }}
              className="bg-white border border-slate-300 text-xs text-slate-800 px-2.5 py-1 rounded-md focus:outline-none cursor-pointer"
            />
          </div>

          {/* Live Search */}
          <div className="relative flex items-center flex-1 min-w-[220px] max-w-md">
            <Search size={14} className="absolute left-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="ค้นหาลำดับ, ร้านค้า, Project, รายการ..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full bg-white text-slate-800 text-xs pl-8 pr-7 py-1 rounded-md border border-slate-300 focus:outline-none focus:border-slate-500 placeholder:text-slate-400"
            />
            {searchTerm && (
              <X
                size={14}
                className="absolute right-2 text-slate-400 cursor-pointer hover:text-slate-600"
                onClick={() => {
                  setSearchTerm("");
                  setPage(1);
                }}
              />
            )}
          </div>

          {/* Batch Copy Button for Selected Requester */}
          {selectedRequester && filteredRows.length > 0 && (
            <button
              type="button"
              onClick={copyRequesterBatchText}
              className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-md transition cursor-pointer shrink-0"
              title="คัดลอกข้อความสรุปบิลค้างทั้งหมดของผู้เบิกรายนี้"
            >
              คัดลอกส่ง LINE ({filteredRows.length} รายการ)
            </button>
          )}
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1 border-b sm:border-b-0 border-slate-200">
          <button
            type="button"
            onClick={() => handleTabChange("all")}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
              activeTab === "all" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            ทั้งหมด ({allPendingRows.length})
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("vat")}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
              activeTab === "vat" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            ตาม VAT ({vatRows.length})
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("natural")}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
              activeTab === "natural" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            หัก 3% บุคคล ({naturalDeductRows.length})
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("company")}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
              activeTab === "company" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            หัก 3% บริษัท ({companyDeductRows.length})
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("credit")}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
              activeTab === "credit" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            เครดิต ({creditRows.length})
          </button>
        </div>
      </div>

      {/* 3. HIGH-DENSITY TABLE */}
      <div className="border border-slate-200 rounded-md bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse font-sans">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200 text-xs">
                <th className="py-2.5 px-3 border-r border-slate-200">ลำดับ</th>
                <th className="py-2.5 px-3 border-r border-slate-200">ร้าน/บุคคล</th>
                <th className="py-2.5 px-3 border-r border-slate-200">Project</th>
                <th className="py-2.5 px-3 border-r border-slate-200">สินค้า/ทำงาน</th>
                <th className="py-2.5 px-3 border-r border-slate-200">วันที่</th>
                <th className="py-2.5 px-3 border-r border-slate-200 text-center">ค้างเอกสาร</th>
                <th className="py-2.5 px-3 border-r border-slate-200">ผู้เบิก</th>
                <th className="py-2.5 px-3 border-r border-slate-200 text-right">ยอดเงิน</th>
                <th className="py-2.5 px-3 border-r border-slate-200 text-center">เงื่อนไข</th>
                <th className="py-2.5 px-3 text-center">จัดการตามบิล</th>
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
                const daysElapsed = calculateDaysElapsed(row["ว/ด/ป"]);

                const hasVat = toNumber(row.vat) > 0;
                const hasDeduct = toNumber(row["หัก"]) > 0;
                const isCompany = String(row["statusค่าแรง"] || "").trim() === "บริษัท";
                const hasCredit = Boolean(row["เครดิต"]);

                const isSaving = savingRowId === billId;
                const isCopied = copiedId === billId;

                return (
                  <tr key={`${billId}-${index}`} className="hover:bg-slate-50 transition-colors">
                    {/* Sequence */}
                    <td className="py-2 px-3 font-semibold text-slate-800 border-r border-slate-100">
                      <Link
                        href={`/bills/${encodeURIComponent(billId)}`}
                        className="text-slate-900 font-bold hover:underline"
                        title="ดูรายละเอียดบิล"
                      >
                        #{billId}
                      </Link>
                    </td>

                    {/* Vendor */}
                    <td className="py-2 px-3 font-bold text-slate-900 border-r border-slate-100">
                      {vendor}
                    </td>

                    {/* Project */}
                    <td className="py-2 px-3 text-slate-700 border-r border-slate-100">
                      {project}
                    </td>

                    {/* Item */}
                    <td className="py-2 px-3 text-slate-700 border-r border-slate-100">
                      {item}
                    </td>

                    {/* Date */}
                    <td className="py-2 px-3 text-slate-500 border-r border-slate-100 whitespace-nowrap">
                      {date}
                    </td>

                    {/* Days Elapsed Aging */}
                    <td className="py-2 px-3 text-center border-r border-slate-100">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        daysElapsed >= 15
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : daysElapsed >= 8
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}>
                        {daysElapsed} วัน
                      </span>
                    </td>

                    {/* Requester */}
                    <td className="py-2 px-3 text-slate-700 font-medium border-r border-slate-100">
                      {requesterName}
                    </td>

                    {/* Amount */}
                    <td className="py-2 px-3 text-right font-bold text-slate-900 border-r border-slate-100">
                      {money(amount)}
                    </td>

                    {/* Conditions */}
                    <td className="py-2 px-3 text-center border-r border-slate-100">
                      <div className="flex flex-wrap items-center justify-center gap-1">
                        {hasVat && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            vat {row.vat}
                          </span>
                        )}
                        {hasDeduct && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            หัก {row["หัก"]}% {isCompany ? "(บ.)" : "(บุคคล)"}
                          </span>
                        )}
                        {hasCredit && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            เครดิต {row["เครดิต"]} วัน
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions: Mark Received & LINE Copy */}
                    <td className="py-2 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {completedRowIds.has(billId) || (toNumber(row.vat) > 0 && Boolean(row["วันได้บิล"])) || (toNumber(row["หัก"]) > 0 && Boolean(row["วันออก 3%"])) || (Boolean(row["เครดิต"]) && Boolean(row["วันจ่าย"])) ? (
                          <span className="px-2 py-1 bg-slate-100 text-slate-500 font-semibold text-[11px] rounded border border-slate-200 cursor-not-allowed">
                            ได้บิลแล้ว
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => handleMarkReceived(row, (activeTab === "natural" || activeTab === "company") ? "deduct" : activeTab)}
                            className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-[11px] rounded transition cursor-pointer disabled:opacity-50"
                            title="กดเพื่อบันทึกว่าได้รับบิลแล้ว"
                          >
                            {isSaving ? "บันทึก..." : "ได้บิลแล้ว"}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => copyLineText(row)}
                          className={`p-1 rounded text-[11px] transition border cursor-pointer ${
                            isCopied
                              ? "bg-slate-900 text-white border-slate-900"
                              : "bg-white text-slate-600 hover:bg-slate-50 border-slate-300"
                          }`}
                          title="คัดลอกข้อความส่ง LINE ติดตาม"
                        >
                          <MessageSquare size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!paginatedRows.length && (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400 text-xs font-medium">
                    ไม่พบรายการตามบิลที่ค้นหา
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 4. PAGINATION TOOLBAR */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 border-t border-slate-200 text-xs text-slate-600 bg-slate-50">
          <div>
            แสดง {visibleStart}-{visibleEnd} จาก {filteredRows.length} รายการ
          </div>

          <div className="flex items-center gap-3">
            {/* Rows per page */}
            <div className="flex items-center gap-1">
              <span className="text-slate-500 font-medium">แสดงต่อหน้า:</span>
              {PAGE_SIZE_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    setPageSize(opt);
                    setPage(1);
                  }}
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
                onClick={() => setPage((p) => Math.max(1, p - 1))}
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
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
