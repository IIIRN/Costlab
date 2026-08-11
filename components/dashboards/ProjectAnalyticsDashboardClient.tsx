"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  Boxes,
  Building2,
  Download,
  FileSpreadsheet,
  Filter,
  FolderKanban,
  Layers,
  Printer,
  Search,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import { money } from "@/lib/numbers";
import type { SheetRow } from "@/lib/types";
import {
  filterBillsByProject,
  getRowAmount,
  getRowCategory,
  getRowTransferAmount,
} from "@/lib/reports";

type ProjectAnalyticsDashboardClientProps = {
  initialDataRows: SheetRow[];
  initialProjectRows: SheetRow[];
  initialStoreRows: SheetRow[];
  initialContractorRows: SheetRow[];
  initialPeopleRows: SheetRow[];
};

type RowDimension = "project" | "vendor" | "category" | "product_category" | "requester" | "month";
type ColumnDimension = "category" | "product_category" | "project" | "month" | "status";
type MetricType = "transfer" | "amount" | "count" | "average";

const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
];

function formatDateThai(dateVal: unknown): string {
  if (!dateVal) return "-";
  const str = String(dateVal).trim();
  if (!str) return "-";

  // Match YYYY-MM-DD or YYYY/MM/DD
  const matchISO = str.match(/^(\d{4})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])$/);
  if (matchISO) {
    const [, y, m, d] = matchISO;
    const dayNum = parseInt(d, 10);
    const monthIdx = parseInt(m, 10) - 1;
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${dayNum} ${THAI_MONTHS_SHORT[monthIdx]} ${y}`;
    }
    return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
  }

  // Match DD-MM-YYYY or DD/MM/YYYY
  const matchDDMM = str.match(/^(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.](20\d\d|\d\d)$/);
  if (matchDDMM) {
    const [, d, m, y] = matchDDMM;
    const dayNum = parseInt(d, 10);
    const monthIdx = parseInt(m, 10) - 1;
    const fullYear = y.length === 2 ? `20${y}` : y;
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${dayNum} ${THAI_MONTHS_SHORT[monthIdx]} ${fullYear}`;
    }
    return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${fullYear}`;
  }

  return str;
}

const CATEGORIES_LIST = [
  { key: "1.ค่าของ", label: "1.ค่าของ", searchKey: "ค่าของ" },
  { key: "2.ค่าแรง", label: "2.ค่าแรง", searchKey: "ค่าแรง" },
  { key: "3.พนักงาน", label: "3.พนักงาน", searchKey: "พนักงาน" },
  { key: "4.น้ำมัน", label: "4.น้ำมัน", searchKey: "น้ำมัน" },
  { key: "5.ซ่อมรถ", label: "5.ซ่อมรถ", searchKey: "ซ่อมรถ" },
  { key: "6.เครื่องจักร", label: "6.เครื่องจักร", searchKey: "เครื่องจักร" },
  { key: "7.เครื่องมือ", label: "7.เครื่องมือ", searchKey: "เครื่องมือ" },
  { key: "8.อื่นๆ", label: "8.อื่นๆ", searchKey: "อื่นๆ" },
];

const PRODUCT_CATEGORIES_LIST = [
  { code: "1", label: "1. เหล็กเส้น", searchKeys: ["1", "เหล็กเส้น"] },
  { code: "2", label: "2. รูปพรรณ", searchKeys: ["2", "รูปพรรณ"] },
  { code: "3", label: "3. คอนกรีต", searchKeys: ["3", "คอนกรีต"] },
  { code: "4", label: "4. ไม้แบบ", searchKeys: ["4", "ไม้แบบ"] },
  { code: "5", label: "5. วัสดุมุง", searchKeys: ["5", "วัสดุมุง"] },
  { code: "6", label: "6. ฝ้าผนัง", searchKeys: ["6", "ฝ้าผนัง"] },
  { code: "7", label: "7. ปูพื้น", searchKeys: ["7", "ปูพื้น"] },
  { code: "8", label: "8. กระจก", searchKeys: ["8", "กระจก"] },
  { code: "9", label: "9. ไฟฟ้า", searchKeys: ["9", "ไฟฟ้า"] },
  { code: "10", label: "10. ประปา", searchKeys: ["10", "ประปา"] },
  { code: "11", label: "11. อื่นๆ", searchKeys: ["11", "อื่นๆ"] },
  { code: "12", label: "12. สีเคมี", searchKeys: ["12", "สีเคมี"] },
  { code: "13", label: "13. สุขภัณฑ์", searchKeys: ["13", "สุขภัณฑ์"] },
  { code: "14", label: "14. นั่งร้าน", searchKeys: ["14", "นั่งร้าน", "บิวอิน"] },
  { code: "15", label: "15. แอร์", searchKeys: ["15", "แอร์"] },
  { code: "16", label: "16. ดิน", searchKeys: ["16", "ดิน"] },
  { code: "17", label: "17. หินทราย", searchKeys: ["17", "หินทราย"] },
  { code: "18", label: "18. เตรียมงาน", searchKeys: ["18", "เตรียมงาน"] },
  { code: "101", label: "101. น้ำมัน", searchKeys: ["101", "น้ำมัน"] },
  { code: "102", label: "102. ค่าขนส่ง", searchKeys: ["102", "ค่าขนส่ง"] },
  { code: "103", label: "103. เครื่องจักร", searchKeys: ["103", "เครื่องจักร"] },
  { code: "200", label: "200. ดำเนินการ(อื่นๆ)", searchKeys: ["200", "ดำเนินการ"] },
  { code: "non", label: "non (7.เครื่องมือ 8.อื่นๆ ที่พัก)", searchKeys: ["non"] },
];

export function ProjectAnalyticsDashboardClient({
  initialDataRows,
  initialProjectRows,
  initialPeopleRows,
}: ProjectAnalyticsDashboardClientProps) {
  const [dataRows] = useState<SheetRow[]>(initialDataRows);
  const [projectRows] = useState<SheetRow[]>(initialProjectRows);

  // Pivot Controls State
  const [pivotPreset, setPivotPreset] = useState<"proj_cat" | "proj_prod" | "vendor_cat" | "month_proj" | "custom">(
    "proj_cat"
  );
  const [rowDimension, setRowDimension] = useState<RowDimension>("project");
  const [colDimension, setColDimension] = useState<ColumnDimension>("category");
  const [metricType, setMetricType] = useState<MetricType>("transfer");

  // Filters State
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Cell Drilldown Modal State
  const [drilldownModal, setDrilldownModal] = useState<{
    title: string;
    rows: SheetRow[];
  } | null>(null);

  // People Map Lookup
  const peopleMap = useMemo(() => {
    const map: Record<string, string> = {};
    (initialPeopleRows || []).forEach((r) => {
      const code = String(r["รหัสพนักงาน"] || r["รหัส"] || r["ID"] || "").trim().toLowerCase();
      const nickname = String(r["ชื่อเล่น"] || "").trim();
      const fullName = String(r["ชื่อ-นามสกุล"] || r["ชื่อ"] || "").trim();
      const displayName = nickname || fullName;
      if (code && displayName) {
        map[code] = displayName;
      }
    });
    return map;
  }, [initialPeopleRows]);

  function getRequesterDisplayName(raw: unknown): string {
    const val = String(raw || "").trim();
    if (!val) return "-";
    const mapped = peopleMap[val.toLowerCase()];
    if (mapped) return mapped;
    return val;
  }

  // Projects list
  const projectsList = useMemo(() => {
    return projectRows
      .map((p) => {
        const id = String(p["ID Project"] || p.id || "").trim();
        const name = String(p["ชื่อ Project"] || p.name || "").trim();
        return { id, name, label: id && name ? `${id} - ${name}` : id || name };
      })
      .filter((p) => p.id || p.name);
  }, [projectRows]);

  // Apply Presets handler
  function handleSelectPreset(preset: "proj_cat" | "proj_prod" | "vendor_cat" | "month_proj" | "custom") {
    setPivotPreset(preset);
    if (preset === "proj_cat") {
      setRowDimension("project");
      setColDimension("category");
    } else if (preset === "proj_prod") {
      setRowDimension("project");
      setColDimension("product_category");
    } else if (preset === "vendor_cat") {
      setRowDimension("vendor");
      setColDimension("category");
    } else if (preset === "month_proj") {
      setRowDimension("project");
      setColDimension("month");
    }
  }

  // Helper to extract dimension values from a bill row
  function getDimensionValue(row: SheetRow, dim: RowDimension | ColumnDimension): string {
    if (dim === "project") {
      const id = String(row["ID Project"] || "").trim();
      const name = String(row["ชื่อ Project"] || "").trim();
      if (id && name) return `${id} - ${name}`;
      return id || name || "ไม่ระบุโครงการ";
    }

    if (dim === "vendor") {
      const vendor = String(row["ร้านค้า"] || row["ผู้รับเหมา"] || row["ร้าน/บุคคล"] || "").trim();
      return vendor || "ไม่ระบุร้านค้า/ผู้รับเหมา";
    }

    if (dim === "category") {
      const cat = getRowCategory(row);
      if (!cat) return "ไม่ระบุหมวด";
      const matched = CATEGORIES_LIST.find((c) => cat.toLowerCase().includes(c.searchKey));
      return matched ? matched.label : cat;
    }

    if (dim === "product_category") {
      const itemVal = String(row["สินค้า"] || row["สินค้า/ทำงาน"] || row["รายการ"] || "").trim().toLowerCase();
      const matched = PRODUCT_CATEGORIES_LIST.find((c) => {
        if (c.code === "non") return itemVal.includes("non") || itemVal.includes("ที่พัก");
        if (itemVal.startsWith(c.code.toLowerCase())) return true;
        return c.searchKeys.some((k) => itemVal.includes(k.toLowerCase()));
      });
      return matched ? matched.label : "อื่นๆ / ไม่ได้ระบุ";
    }

    if (dim === "requester") {
      const rawReq = String(row["ผู้เบิก"] || "").trim();
      return getRequesterDisplayName(rawReq);
    }

    if (dim === "month") {
      const dateStr = String(row["ว/ด/ป"] || row["วันที่"] || "").trim();
      if (!dateStr) return "ไม่ระบุวันที่";
      const parts = dateStr.split(/[-/.]/);
      if (parts.length >= 2) {
        const year = parts[0].length === 4 ? parts[0] : parts[2] || "2026";
        const month = parts[1].padStart(2, "0");
        return `${year}-${month}`;
      }
      return dateStr;
    }

    if (dim === "status") {
      return String(row["statusบิล"] || row["สถานะ"] || "อนุมัติแล้ว").trim();
    }

    return "อื่นๆ";
  }

  // Filtered rows based on Project & Search Term
  const filteredDataRows = useMemo(() => {
    let rows = filterBillsByProject(dataRows, selectedProjectId);
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      rows = rows.filter((r) => {
        const reqName = getRequesterDisplayName(r["ผู้เบิก"]);
        return (
          String(r["ID Project"] || "").toLowerCase().includes(q) ||
          String(r["ชื่อ Project"] || "").toLowerCase().includes(q) ||
          String(r["ร้าน/บุคคล"] || "").toLowerCase().includes(q) ||
          String(r["ผู้รับเหมา"] || "").toLowerCase().includes(q) ||
          String(r["สินค้า/ทำงาน"] || "").toLowerCase().includes(q) ||
          String(r["รายละเอียดงาน"] || "").toLowerCase().includes(q) ||
          String(r["ประเภท"] || "").toLowerCase().includes(q) ||
          String(r["ผู้เบิก"] || "").toLowerCase().includes(q) ||
          reqName.toLowerCase().includes(q)
        );
      });
    }
    return rows;
  }, [dataRows, selectedProjectId, searchTerm, peopleMap]);

  // Build Dynamic Pivot Matrix Table Engine
  const pivotMatrixData = useMemo(() => {
    const rowKeysSet = new Set<string>();
    const colKeysSet = new Set<string>();

    const cellMap = new Map<string, SheetRow[]>();

    filteredDataRows.forEach((row) => {
      const rKey = getDimensionValue(row, rowDimension);
      const cKey = getDimensionValue(row, colDimension);

      rowKeysSet.add(rKey);
      colKeysSet.add(cKey);

      const cellKey = `${rKey}:::${cKey}`;
      if (!cellMap.has(cellKey)) {
        cellMap.set(cellKey, []);
      }
      cellMap.get(cellKey)!.push(row);
    });

    const rowKeys = Array.from(rowKeysSet).sort();
    const colKeys = Array.from(colKeysSet).sort();

    return { rowKeys, colKeys, cellMap };
  }, [filteredDataRows, rowDimension, colDimension]);

  // Helper for computing metric values
  function calculateMetric(rows: SheetRow[]): number {
    if (!rows || rows.length === 0) return 0;
    if (metricType === "transfer") {
      return rows.reduce((sum, r) => sum + getRowTransferAmount(r), 0);
    }
    if (metricType === "amount") {
      return rows.reduce((sum, r) => sum + getRowAmount(r), 0);
    }
    if (metricType === "count") {
      return rows.length;
    }
    if (metricType === "average") {
      const total = rows.reduce((sum, r) => sum + getRowTransferAmount(r), 0);
      return total / rows.length;
    }
    return 0;
  }

  // Calculate Max Cell Metric Value for Dynamic Heatmap Highlights
  const maxCellValue = useMemo(() => {
    let max = 0;
    pivotMatrixData.rowKeys.forEach((rKey) => {
      pivotMatrixData.colKeys.forEach((cKey) => {
        const rows = pivotMatrixData.cellMap.get(`${rKey}:::${cKey}`) || [];
        const val = calculateMetric(rows);
        if (val > max) max = val;
      });
    });
    return max;
  }, [pivotMatrixData, metricType]);

  // Calculate Column Totals & Column Max
  const colTotals = useMemo(() => {
    const totals: Record<string, { val: number; rows: SheetRow[] }> = {};
    let maxTotal = 0;

    pivotMatrixData.colKeys.forEach((cKey) => {
      const allColRows: SheetRow[] = [];
      pivotMatrixData.rowKeys.forEach((rKey) => {
        const rows = pivotMatrixData.cellMap.get(`${rKey}:::${cKey}`);
        if (rows) allColRows.push(...rows);
      });
      const val = calculateMetric(allColRows);
      totals[cKey] = { val, rows: allColRows };
      if (val > maxTotal) maxTotal = val;
    });

    return { totals, maxTotal };
  }, [pivotMatrixData, metricType]);

  // Grand Total for all visible rows
  const grandTotalValue = useMemo(() => {
    return calculateMetric(filteredDataRows);
  }, [filteredDataRows, metricType]);

  const totalTransferSum = useMemo(() => {
    return filteredDataRows.reduce((sum, r) => sum + getRowTransferAmount(r), 0);
  }, [filteredDataRows]);

  const totalBillAmountSum = useMemo(() => {
    return filteredDataRows.reduce((sum, r) => sum + getRowAmount(r), 0);
  }, [filteredDataRows]);

  return (
    <div className="w-full flex flex-col gap-3 p-3 sm:p-4 max-w-[1700px] mx-auto font-sans print:p-0">
      {/* 1. COMPACT EXECUTIVE HEADER CARD */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-md border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left Title & Status */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center shrink-0">
            <BarChart3 className="text-teal-400" size={20} />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
              <span>ตารางวิเคราะห์ Pivot ทางการเงิน</span>
              <span className="text-[10px] font-bold text-teal-400 bg-teal-950/80 px-2 py-0.5 rounded-md border border-teal-800/60 uppercase">
                Pivot Live
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              วิเคราะห์ข้อมูลค่าใช้จ่ายโครงการ หมวดหมู่ สินค้า และร้านค้า
            </p>
          </div>
        </div>

        {/* Executive Quick Stats Strip */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">ยอดโอนสุทธิ</span>
            <span className="text-sm font-black text-emerald-400">{money(totalTransferSum)}</span>
          </div>

          <div className="bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">ยอดเงินบิลรวม</span>
            <span className="text-sm font-black text-white">{money(totalBillAmountSum)}</span>
          </div>

          <div className="bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">จำนวนบิลทั้งหมด</span>
            <span className="text-sm font-black text-teal-300">{filteredDataRows.length.toLocaleString()} รายการ</span>
          </div>
        </div>
      </div>

      {/* 2. COMPACT SINGLE-ROW CONTROLS BAR */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-2xs space-y-3">
        {/* Preset Tabs Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-black text-slate-400 uppercase tracking-wider mr-1">Pivot Presets:</span>
            <button
              type="button"
              onClick={() => handleSelectPreset("proj_cat")}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${pivotPreset === "proj_cat"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200/80 text-slate-700"
                }`}
            >
              📁 โครงการ × หมวดหมู่
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset("proj_prod")}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${pivotPreset === "proj_prod"
                  ? "bg-teal-600 text-white shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200/80 text-slate-700"
                }`}
            >
              📦 โครงการ × ประเภทสินค้า
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset("vendor_cat")}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${pivotPreset === "vendor_cat"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200/80 text-slate-700"
                }`}
            >
              🏪 ร้านค้า/ผู้รับเหมา × หมวดหมู่
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset("month_proj")}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${pivotPreset === "month_proj"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200/80 text-slate-700"
                }`}
            >
              📅 โครงการ × รายเดือน
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset("custom")}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${pivotPreset === "custom"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200/80 text-slate-700"
                }`}
            >
              🎛️ Custom
            </button>
          </div>

          {/* Metric Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <span className="text-[11px] font-bold text-slate-500 px-2">ตัววัด (Metric):</span>
            <button
              type="button"
              onClick={() => setMetricType("transfer")}
              className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                metricType === "transfer" ? "bg-emerald-600 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              ยอดโอนสุทธิ
            </button>
            <button
              type="button"
              onClick={() => setMetricType("amount")}
              className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                metricType === "amount" ? "bg-slate-900 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              ยอดเงินบิล
            </button>
            <button
              type="button"
              onClick={() => setMetricType("count")}
              className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                metricType === "count" ? "bg-indigo-600 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              จำนวนรายการ
            </button>
          </div>
        </div>

        {/* Dynamic Controls & Search Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Dimension Selectors */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-slate-700">แถว (Row):</span>
              <select
                value={rowDimension}
                onChange={(e) => {
                  setRowDimension(e.target.value as RowDimension);
                  setPivotPreset("custom");
                }}
                className="bg-slate-50 border border-slate-200 font-extrabold text-xs text-slate-900 px-3 py-1.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="project">📁 โครงการ (Projects)</option>
                <option value="vendor">🏪 ร้านค้า / ผู้รับเหมา (Vendors)</option>
                <option value="category">🏷️ หมวดหมู่ค่าใช้จ่าย (Categories)</option>
                <option value="product_category">📦 ประเภทสินค้า 18 รายการ</option>
                <option value="requester">👤 ผู้เบิก (Requesters)</option>
                <option value="month">📅 รายเดือน (Monthly)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-slate-700">คอลัมน์ (Column):</span>
              <select
                value={colDimension}
                onChange={(e) => {
                  setColDimension(e.target.value as ColumnDimension);
                  setPivotPreset("custom");
                }}
                className="bg-slate-50 border border-slate-200 font-extrabold text-xs text-slate-900 px-3 py-1.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="category">🏷️ หมวดหมู่ค่าใช้จ่าย (Categories)</option>
                <option value="product_category">📦 ประเภทสินค้า 18 รายการ</option>
                <option value="project">📁 โครงการ (Projects)</option>
                <option value="month">📅 รายเดือน (Monthly)</option>
              </select>
            </div>
          </div>

          {/* Global Search & Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Project */}
            <div className="flex items-center gap-2">
              <FolderKanban size={15} className="text-slate-500" />
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="bg-slate-50 border border-slate-200 font-bold text-xs text-slate-800 px-3 py-1.5 rounded-xl focus:outline-none max-w-[220px]"
              >
                <option value="all">📁 ทุกโครงการ ({projectsList.length})</option>
                {projectsList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="relative flex items-center">
              <Search size={14} className="absolute left-3 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหารายการ..."
                className="bg-slate-50 text-slate-800 text-xs font-semibold pl-8 pr-7 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-300 w-44 sm:w-56"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. DYNAMIC PIVOT MATRIX TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-3 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="text-teal-400" size={17} />
            <h2 className="text-xs font-extrabold text-white uppercase tracking-wider">
              Matrix Analysis Grid: {rowDimension.toUpperCase()} × {colDimension.toUpperCase()}
            </h2>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="font-bold text-slate-300">
              แถว: <strong className="text-white">{pivotMatrixData.rowKeys.length}</strong> | คอลัมน์:{" "}
              <strong className="text-white">{pivotMatrixData.colKeys.length}</strong>
            </span>
            <span className="text-emerald-400 font-extrabold bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
              รวมสุทธิ: {metricType === "count" ? `${grandTotalValue} รายการ` : money(grandTotalValue)}
            </span>
          </div>
        </div>

        {/* Scrollable Pivot Grid */}
        <div className="overflow-auto max-h-[calc(100vh-210px)] min-h-[420px] relative scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead className="sticky top-0 z-20 bg-slate-900 text-slate-100 font-extrabold text-[11px] uppercase tracking-wider shadow-xs">
              <tr>
                <th className="py-2.5 px-3 border-r border-slate-800 min-w-[200px] sticky left-0 z-30 bg-slate-900">
                  {rowDimension === "project"
                    ? "โครงการ"
                    : rowDimension === "vendor"
                    ? "ร้านค้า/ผู้รับเหมา"
                    : rowDimension === "category"
                    ? "หมวดหมู่"
                    : rowDimension === "product_category"
                    ? "ประเภทสินค้า"
                    : rowDimension === "requester"
                    ? "ผู้เบิก"
                    : "มิติแถว"}
                </th>
                {pivotMatrixData.colKeys.map((cKey) => (
                  <th key={cKey} className="py-2.5 px-3 text-right border-r border-slate-800 min-w-[120px]">
                    {cKey}
                  </th>
                ))}
                <th className="py-2.5 px-3 text-right bg-emerald-950 text-emerald-300 min-w-[130px] font-black border-l border-slate-800">
                  รวมแถว
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {pivotMatrixData.rowKeys.length === 0 ? (
                <tr>
                  <td
                    colSpan={pivotMatrixData.colKeys.length + 2}
                    className="py-12 text-center text-slate-400 font-semibold"
                  >
                    ไม่พบข้อมูลสำหรับเงื่อนไขที่เลือก
                  </td>
                </tr>
              ) : (
                pivotMatrixData.rowKeys.map((rKey, rIdx) => {
                  let rowSum = 0;
                  const allRowCellBills: SheetRow[] = [];

                  return (
                    <tr key={rKey} className="hover:bg-slate-50 transition-colors">
                      {/* Row Label (Sticky Left) */}
                      <td className="py-2.5 px-3 font-bold text-slate-900 border-r border-slate-200 sticky left-0 z-10 bg-white shadow-xs">
                        <div className="text-xs">{rKey}</div>
                      </td>

                      {/* Matrix Cells */}
                      {pivotMatrixData.colKeys.map((cKey) => {
                        const cellKey = `${rKey}:::${cKey}`;
                        const cellBills = pivotMatrixData.cellMap.get(cellKey) || [];
                        const val = calculateMetric(cellBills);
                        rowSum += val;
                        if (cellBills.length) allRowCellBills.push(...cellBills);

                        const hasVal = val > 0;
                        const intensity = maxCellValue > 0 ? val / maxCellValue : 0;

                        // Dynamic Heatmap Background Styling
                        let heatmapBg = "bg-white";
                        if (hasVal) {
                          if (intensity > 0.6) heatmapBg = "bg-emerald-100/90 text-emerald-950 font-black";
                          else if (intensity > 0.3) heatmapBg = "bg-emerald-50 text-emerald-900 font-extrabold";
                          else heatmapBg = "bg-slate-50/90 text-slate-900 font-bold";
                        }

                        return (
                          <td
                            key={cKey}
                            onClick={() => {
                              if (cellBills.length) {
                                setDrilldownModal({
                                  title: `บิลสำหรับ "${rKey}" × "${cKey}"`,
                                  rows: cellBills,
                                });
                              }
                            }}
                            className={`py-2.5 px-2.5 text-right border-r border-slate-100 transition ${heatmapBg} ${hasVal ? "cursor-pointer hover:ring-2 hover:ring-emerald-400/60" : "text-slate-300"
                              }`}
                          >
                            {hasVal ? (
                              metricType === "count" ? (
                                <span>{val} รายการ</span>
                              ) : (
                                <span>{money(val)}</span>
                              )
                            ) : (
                              "-"
                            )}
                          </td>
                        );
                      })}

                      {/* Row Total (Rightmost) */}
                      <td
                        onClick={() => {
                          if (allRowCellBills.length) {
                            setDrilldownModal({
                              title: `สรุปบิลรวมแถว: "${rKey}"`,
                              rows: allRowCellBills,
                            });
                          }
                        }}
                        className="py-2.5 px-3 text-right font-black text-emerald-950 bg-emerald-50 border-l border-emerald-200 cursor-pointer hover:bg-emerald-100 transition"
                      >
                        {metricType === "count" ? `${rowSum} รายการ` : money(rowSum)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Matrix Footer Totals (Column Summary) */}
            {pivotMatrixData.rowKeys.length > 0 && (
              <tfoot className="sticky bottom-0 z-20 bg-slate-200 text-slate-900 font-extrabold text-xs shadow-md border-t-2 border-slate-400">
                <tr>
                  <td
                    style={{ color: "#020617", backgroundColor: "#e2e8f0" }}
                    className="py-2.5 px-3 sticky left-0 z-30 font-black border-r border-slate-300 uppercase tracking-wider text-slate-950 text-xs"
                  >
                    รวมแนวตั้ง (Column Total)
                  </td>
                  {pivotMatrixData.colKeys.map((cKey) => {
                    const colData = colTotals.totals[cKey] || { val: 0, rows: [] };
                    const hasVal = colData.val > 0;

                    return (
                      <td
                        key={cKey}
                        onClick={() => {
                          if (colData.rows.length) {
                            setDrilldownModal({
                              title: `สรุปบิลรวมคอลัมน์: "${cKey}"`,
                              rows: colData.rows,
                            });
                          }
                        }}
                        style={hasVal ? { color: "#064e3b", backgroundColor: "#d1fae5" } : { color: "#64748b", backgroundColor: "#f1f5f9" }}
                        className="py-2.5 px-2.5 text-right border-r border-slate-300 transition cursor-pointer font-black text-xs"
                      >
                        {hasVal ? (
                          metricType === "count" ? (
                            <span>{colData.val} รายการ</span>
                          ) : (
                            <span>{money(colData.val)}</span>
                          )
                        ) : (
                          "-"
                        )}
                      </td>
                    );
                  })}
                  <td
                    style={{ color: "#ffffff", backgroundColor: "#059669" }}
                    className="py-2.5 px-3 text-right font-black border-l border-emerald-700 text-sm shadow-inner"
                  >
                    {metricType === "count" ? `${grandTotalValue} รายการ` : money(grandTotalValue)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* 4. CELL DRILLDOWN MODAL */}
      {drilldownModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="text-teal-400" size={18} />
                <h3 className="text-xs font-black text-white">{drilldownModal.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setDrilldownModal(null)}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Content Table */}
            <div className="p-3 overflow-y-auto flex-1">
              <table className="w-full text-left text-xs text-slate-700 border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200 uppercase text-[10px]">
                    <th className="py-2 px-2.5">ลำดับ</th>
                    <th className="py-2 px-2.5">ผู้เบิก</th>
                    <th className="py-2 px-2.5">บิล</th>
                    <th className="py-2 px-2.5">ร้านค้า/ผู้รับเหมา</th>
                    <th className="py-2 px-2.5">รายละเอียดงาน / รายการ</th>
                    <th className="py-2 px-2.5">ประเภท</th>
                    <th className="py-2 px-2.5 text-right">ยอดเงินบิล</th>
                    <th className="py-2 px-2.5 text-right text-emerald-700">ยอดโอน</th>
                    <th className="py-2 px-2.5">ว/ด/ป</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {drilldownModal.rows.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition">
                      <td className="py-2 px-2.5 font-semibold text-slate-500">{r["ลำดับ"] || i + 1}</td>
                      <td className="py-2 px-2.5 font-bold text-slate-900">{getRequesterDisplayName(r["ผู้เบิก"])}</td>
                      <td className="py-2 px-2.5 font-medium">{r["บิล"] || "-"}</td>
                      <td className="py-2 px-2.5 font-bold text-slate-900">
                        {r["ร้านค้า"] || r["ผู้รับเหมา"] || r["ร้าน/บุคคล"] || "-"}
                      </td>
                      <td className="py-2 px-2.5">{r["รายละเอียดงาน"] || r["สินค้า/ทำงาน"] || r["รายการ"] || "-"}</td>
                      <td className="py-2 px-2.5 font-semibold text-indigo-600">{getRowCategory(r) || "-"}</td>
                      <td className="py-2 px-2.5 text-right font-bold text-slate-900">{money(getRowAmount(r))}</td>
                      <td className="py-2 px-2.5 text-right font-black text-emerald-700 bg-emerald-50/60">
                        {money(getRowTransferAmount(r))}
                      </td>
                      <td className="py-2 px-2.5 text-slate-600 font-semibold whitespace-nowrap">{formatDateThai(r["ว/ด/ป"] || r["วันที่"])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs font-bold text-slate-600">
              <span>รวม {drilldownModal.rows.length} รายการ</span>
              <span className="text-emerald-700 font-black text-xs">
                ยอดโอนรวมสุทธิ: {money(drilldownModal.rows.reduce((sum, r) => sum + getRowTransferAmount(r), 0))}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
