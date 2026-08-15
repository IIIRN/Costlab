"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  Coins,
  Layers,
  Filter,
  PieChart,
  Search,
  X,
  SlidersHorizontal,
  ArrowUpDown,
  TrendingUp,
  LayoutGrid,
  ShieldCheck,
  Sparkles,
  Building2,
  Table as TableIcon,
  PieChart as PieIcon,
  BarChart2,
  FolderKanban
} from "lucide-react";
import { money } from "@/lib/numbers";
import type { SheetRow } from "@/lib/types";
import {
  filterBillsByProject,
  getRowAmount,
  getRowCategory,
  getRowTransferAmount,
} from "@/lib/reports";
import { ProjectBudgetControlMatrix } from "@/components/dashboards/ProjectBudgetControlMatrix";

type ProjectAnalyticsDashboardClientProps = {
  initialDataRows: SheetRow[];
  initialProjectRows: SheetRow[];
  initialStoreRows: SheetRow[];
  initialContractorRows: SheetRow[];
  initialPeopleRows: SheetRow[];
};

type RowDimension = "project" | "vendor" | "category" | "product_category" | "requester" | "month";
type ColumnDimension = "category" | "product_category" | "project" | "month" | "status" | "requester";
type MetricType = "transfer" | "amount" | "count";
type MainViewTab = "pivot" | "budget_matrix";
type PivotPreset = "proj_cat" | "proj_prod" | "vendor_cat" | "month_proj" | "req_cat" | "req_proj" | "custom";

const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
];

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
  { code: "non", label: "non (7.เครื่องมือ 8.อื่นๆ)", searchKeys: ["non"] },
];

export function ProjectAnalyticsDashboardClient({
  initialDataRows,
  initialProjectRows,
  initialPeopleRows,
}: ProjectAnalyticsDashboardClientProps) {
  const [dataRows] = useState<SheetRow[]>(initialDataRows);
  const [projectRows] = useState<SheetRow[]>(initialProjectRows);

  // Main View Tab (Pivot Hub vs Budget Control Matrix)
  const [mainTab, setMainTab] = useState<MainViewTab>("pivot");

  // Pivot Controls State
  const [pivotPreset, setPivotPreset] = useState<PivotPreset>("proj_cat");
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
  function handleSelectPreset(preset: PivotPreset) {
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
    } else if (preset === "req_cat") {
      setRowDimension("requester");
      setColDimension("category");
    } else if (preset === "req_proj") {
      setRowDimension("requester");
      setColDimension("project");
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

  // Dynamic Pivot Computation Matrix Data
  const pivotMatrixData = useMemo(() => {
    const rowKeysSet = new Set<string>();
    const colKeysSet = new Set<string>();
    const cellMap = new Map<string, SheetRow[]>();

    filteredDataRows.forEach((r) => {
      const rVal = getDimensionValue(r, rowDimension);
      const cVal = getDimensionValue(r, colDimension);

      rowKeysSet.add(rVal);
      colKeysSet.add(cVal);

      const cellKey = `${rVal}:::${cVal}`;
      if (!cellMap.has(cellKey)) {
        cellMap.set(cellKey, []);
      }
      cellMap.get(cellKey)!.push(r);
    });

    const rowKeys = Array.from(rowKeysSet).sort();
    const colKeys = Array.from(colKeysSet).sort();

    return { rowKeys, colKeys, cellMap };
  }, [filteredDataRows, rowDimension, colDimension]);

  // Helper metric calculation for rows
  function calculateMetric(rows: SheetRow[]): number {
    if (!rows.length) return 0;
    if (metricType === "count") return rows.length;
    if (metricType === "amount") return rows.reduce((sum, r) => sum + getRowAmount(r), 0);
    return rows.reduce((sum, r) => sum + getRowTransferAmount(r), 0);
  }

  // Row Summary Stats for Pivot Charts
  const rowChartStats = useMemo(() => {
    const list = pivotMatrixData.rowKeys.map((rKey) => {
      const rowBills: SheetRow[] = [];
      pivotMatrixData.colKeys.forEach((cKey) => {
        const cellBills = pivotMatrixData.cellMap.get(`${rKey}:::${cKey}`) || [];
        if (cellBills.length) rowBills.push(...cellBills);
      });
      const val = calculateMetric(rowBills);
      return { rKey, val, count: rowBills.length, rows: rowBills };
    });

    list.sort((a, b) => b.val - a.val);
    const grandVal = list.reduce((s, i) => s + i.val, 0);

    return { list, grandVal, maxVal: list[0]?.val || 1 };
  }, [pivotMatrixData, metricType]);

  // Column Totals calculation
  const colTotals = useMemo(() => {
    const totals: Record<string, { val: number; rows: SheetRow[] }> = {};
    let maxTotal = 0;

    pivotMatrixData.colKeys.forEach((cKey) => {
      const colBills: SheetRow[] = [];
      pivotMatrixData.rowKeys.forEach((rKey) => {
        const cellBills = pivotMatrixData.cellMap.get(`${rKey}:::${cKey}`) || [];
        if (cellBills.length) colBills.push(...cellBills);
      });
      const val = calculateMetric(colBills);
      totals[cKey] = { val, rows: colBills };
      if (val > maxTotal) maxTotal = val;
    });

    return { totals, maxTotal };
  }, [pivotMatrixData, metricType]);

  // Maximum cell value for Heatmap intensity
  const maxCellValue = useMemo(() => {
    let maxVal = 0;
    pivotMatrixData.rowKeys.forEach((rKey) => {
      pivotMatrixData.colKeys.forEach((cKey) => {
        const cellBills = pivotMatrixData.cellMap.get(`${rKey}:::${cKey}`) || [];
        const val = calculateMetric(cellBills);
        if (val > maxVal) maxVal = val;
      });
    });
    return maxVal;
  }, [pivotMatrixData, metricType]);

  // Grand Total for all visible rows
  const grandTotalValue = useMemo(() => {
    return calculateMetric(filteredDataRows);
  }, [filteredDataRows, metricType]);

  const totalTransferSum = useMemo(() => {
    return filteredDataRows.reduce((sum, r) => sum + getRowTransferAmount(r), 0);
  }, [filteredDataRows]);

  return (
    <div className="w-full flex flex-col gap-4 p-4 sm:p-5 max-w-[1750px] mx-auto font-sans text-sm text-slate-800 print:p-0">
      {/* 1. EXECUTIVE PIVOT BI HEADER & TAB SWITCHER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-900 text-white rounded-md">
            <BarChart2 size={22} />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>ศูนย์วิเคราะห์ Pivot Chart & BI Matrix โครงการ</span>
              <span className="text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                BI Analytics Hub
              </span>
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              วิเคราะห์สรุปยอดด้วย Pivot Chart, Cross-Tabulation Matrix และระบบติดตามวงเงินคุมงบ
            </p>
          </div>
        </div>

        {/* View Switcher Tabs & Quick Stats */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex p-1 bg-slate-100 rounded-md border border-slate-300 text-xs font-bold">
            <button
              type="button"
              onClick={() => setMainTab("pivot")}
              className={`px-3 py-1.5 rounded transition flex items-center gap-1.5 cursor-pointer ${
                mainTab === "pivot"
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:text-slate-900"
              }`}
            >
              <BarChart3 size={14} />
              <span>📊 พิวอทกราฟ & เมทริกซ์</span>
            </button>
            <button
              type="button"
              onClick={() => setMainTab("budget_matrix")}
              className={`px-3 py-1.5 rounded transition flex items-center gap-1.5 cursor-pointer ${
                mainTab === "budget_matrix"
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:text-slate-900"
              }`}
            >
              <ShieldCheck size={14} />
              <span>🛡️ คุมงบประมาณรายหมวด</span>
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs">
            <div className="bg-emerald-50 border border-emerald-200 rounded-md px-3 py-1.5 text-right">
              <span className="text-xs text-emerald-800 block font-semibold">ยอดโอนเงินรวม</span>
              <span className="font-semibold text-emerald-900">{money(totalTransferSum)} ฿</span>
            </div>
          </div>
        </div>
      </div>

      {/* VIEW TAB 1: PIVOT CHART & BI MATRIX DASHBOARD */}
      {mainTab === "pivot" && (
        <div className="space-y-4">
          {/* 2. PIVOT CONTROLS & DIMENSION SELECTOR TOOLBAR */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3.5">
            {/* Preset Buttons & Metric Selector Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-slate-800 font-bold flex items-center gap-1 mr-1">
                  <SlidersHorizontal size={15} className="text-emerald-700" /> มิติมุมมอง Pivot:
                </span>
                <button
                  type="button"
                  onClick={() => handleSelectPreset("proj_cat")}
                  className={`px-3 py-1 rounded-md transition text-xs font-bold cursor-pointer border ${
                    pivotPreset === "proj_cat"
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-300"
                  }`}
                >
                  โครงการ × หมวดหมู่
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset("proj_prod")}
                  className={`px-3 py-1 rounded-md transition text-xs font-bold cursor-pointer border ${
                    pivotPreset === "proj_prod"
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-300"
                  }`}
                >
                  โครงการ × สินค้า Master
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset("vendor_cat")}
                  className={`px-3 py-1 rounded-md transition text-xs font-bold cursor-pointer border ${
                    pivotPreset === "vendor_cat"
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-300"
                  }`}
                >
                  ร้านค้า/ผู้รับเหมา × หมวดหมู่
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset("month_proj")}
                  className={`px-3 py-1 rounded-md transition text-xs font-bold cursor-pointer border ${
                    pivotPreset === "month_proj"
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-300"
                  }`}
                >
                  โครงการ × รายเดือน
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset("req_cat")}
                  className={`px-3 py-1 rounded-md transition text-xs font-bold cursor-pointer border ${
                    pivotPreset === "req_cat"
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-300"
                  }`}
                >
                  👤 ผู้เบิก × หมวดหมู่
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset("req_proj")}
                  className={`px-3 py-1 rounded-md transition text-xs font-bold cursor-pointer border ${
                    pivotPreset === "req_proj"
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-300"
                  }`}
                >
                  👤 ผู้เบิก × โครงการ
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset("custom")}
                  className={`px-3 py-1 rounded-md transition text-xs font-bold cursor-pointer border ${
                    pivotPreset === "custom"
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-300"
                  }`}
                >
                  กำหนดเอง
                </button>
              </div>

              {/* Metric Type Toggle */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-800 font-bold mr-1">ตัวเลขที่คำนวณ:</span>
                <div className="inline-flex p-0.5 bg-slate-100 rounded-md border border-slate-300">
                  <button
                    type="button"
                    onClick={() => setMetricType("transfer")}
                    className={`px-3 py-1 rounded-md font-bold transition text-xs cursor-pointer border ${
                      metricType === "transfer" ? "bg-slate-900 text-white border-slate-900" : "text-slate-700 hover:text-slate-900 border-transparent"
                    }`}
                  >
                    ยอดโอนสุทธิ (฿)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMetricType("amount")}
                    className={`px-3 py-1 rounded-md font-bold transition text-xs cursor-pointer border ${
                      metricType === "amount" ? "bg-slate-900 text-white border-slate-900" : "text-slate-700 hover:text-slate-900 border-transparent"
                    }`}
                  >
                    ยอดเงินบิล (฿)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMetricType("count")}
                    className={`px-3 py-1 rounded-md font-bold transition text-xs cursor-pointer border ${
                      metricType === "count" ? "bg-slate-900 text-white border-slate-900" : "text-slate-700 hover:text-slate-900 border-transparent"
                    }`}
                  >
                    จำนวนบิล
                  </button>
                </div>
              </div>
            </div>

            {/* Custom Dimension Selectors & Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-700">แกนแถว (Rows):</span>
                  <select
                    value={rowDimension}
                    onChange={(e) => {
                      setRowDimension(e.target.value as RowDimension);
                      setPivotPreset("custom");
                    }}
                    className="bg-white border border-slate-300 text-xs font-bold text-slate-900 px-3 py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-400"
                  >
                    <option value="project">โครงการ (Projects)</option>
                    <option value="vendor">ร้านค้า / ผู้รับเหมา (Vendors)</option>
                    <option value="category">หมวดหมู่หลัก (Categories)</option>
                    <option value="product_category">ประเภทสินค้า Master Data</option>
                    <option value="requester">ผู้เบิก (Requesters)</option>
                    <option value="month">รายเดือน (Monthly)</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-700">แกนคอลัมน์ (Cols):</span>
                  <select
                    value={colDimension}
                    onChange={(e) => {
                      setColDimension(e.target.value as ColumnDimension);
                      setPivotPreset("custom");
                    }}
                    className="bg-white border border-slate-300 text-xs font-bold text-slate-900 px-3 py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-400"
                  >
                    <option value="category">หมวดหมู่หลัก (Categories)</option>
                    <option value="product_category">ประเภทสินค้า Master Data</option>
                    <option value="project">โครงการ (Projects)</option>
                    <option value="requester">ผู้เบิก (Requesters)</option>
                    <option value="month">รายเดือน (Monthly)</option>
                    <option value="status">สถานะบิล</option>
                  </select>
                </div>
              </div>

              {/* Project Selector & Search Box */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="bg-white border border-slate-300 text-xs font-bold text-slate-900 px-3 py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-400 max-w-[200px]"
                >
                  <option value="all">📂 ทุกโครงการ ({projectsList.length})</option>
                  {projectsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>

                <div className="relative flex items-center">
                  <Search size={14} className="absolute left-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="ค้นหา..."
                    className="bg-white text-slate-900 text-xs pl-8 pr-7 py-1.5 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400 w-36 sm:w-48 font-semibold"
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

          {/* 3. VISUAL PIVOT CHARTS SECTION (GRAPH VISUALIZATION) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* PIVOT BAR CHART: DYNAMIC ROW DISTRIBUTION (2 Columns) */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 size={16} className="text-emerald-700" />
                  <span>กราฟเปรียบเทียบการจัดสรรตามแถว ({rowDimension === "project" ? "โครงการ" : rowDimension === "vendor" ? "ร้านค้า" : "แกนแถว"})</span>
                </h3>
                <span className="text-xs font-bold text-slate-600">Row Dimension Visual Chart</span>
              </div>

              <div className="space-y-2.5">
                {rowChartStats.list.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs font-bold">
                    ไม่มีข้อมูลแสดงกราฟสำหรับเงื่อนไขนี้
                  </div>
                ) : (
                  rowChartStats.list.slice(0, 7).map((item) => {
                    const percentOfGrand = rowChartStats.grandVal > 0 ? (item.val / rowChartStats.grandVal) * 100 : 0;
                    const barWidth = rowChartStats.maxVal > 0 ? (item.val / rowChartStats.maxVal) * 100 : 0;

                    return (
                      <div key={item.rKey} className="bg-slate-50 border border-slate-200 rounded-md p-2.5 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-900 truncate max-w-[60%]">{item.rKey}</span>
                          <div className="flex items-center gap-2 font-semibold">
                            <span className="text-emerald-800">
                              {metricType === "count" ? `${item.val} บิล` : `${money(item.val)} ฿`}
                            </span>
                            <span className="text-xs text-slate-600">({percentOfGrand.toFixed(1)}%)</span>
                          </div>
                        </div>

                        <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden border border-slate-300">
                          <div
                            className="h-full bg-slate-900 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, barWidth)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* TOP LEADERBOARD PIVOT CHART (1 Column) */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Sparkles size={16} className="text-amber-600" />
                  <span>5 อันดับสูงสุดตามมิติที่เลือก</span>
                </h3>
                <span className="text-xs font-bold text-slate-600">Top 5 Analytics</span>
              </div>

              <div className="space-y-2.5">
                {rowChartStats.list.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs font-bold">
                    ยังไม่มีข้อมูลอันดับ
                  </div>
                ) : (
                  rowChartStats.list.slice(0, 5).map((item, idx) => {
                    const percent = rowChartStats.grandVal > 0 ? (item.val / rowChartStats.grandVal) * 100 : 0;

                    return (
                      <div key={item.rKey} className="bg-slate-50 border border-slate-200 rounded-md p-2.5 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-900 flex items-center gap-2 truncate">
                            <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <span className="truncate">{item.rKey}</span>
                          </span>
                          <span className="font-semibold text-emerald-800 text-xs shrink-0">
                            {metricType === "count" ? `${item.val} บิล` : `${money(item.val)} ฿`}
                          </span>
                        </div>

                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden border border-slate-300">
                          <div
                            className="h-full bg-emerald-700 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, percent)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* 4. DYNAMIC CROSSTAB PIVOT MATRIX TABLE */}
          <div className="border border-slate-200 rounded-lg bg-white overflow-hidden space-y-3 p-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <TableIcon size={16} className="text-slate-800" />
                  <span>ตารางเมทริกซ์ Pivot Crosstab Matrix ({pivotMatrixData.rowKeys.length} แถว × {pivotMatrixData.colKeys.length} คอลัมน์)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  ตารางเปรียบเทียบไขว้สองมิติ พร้อมรหัสสี Heatmap แสดงความหนาแน่นยอดเงิน
                </p>
              </div>

              <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-md border border-emerald-200">
                รวมสุทธิ Pivot: {metricType === "count" ? `${grandTotalValue} บิล` : `${money(grandTotalValue)} ฿`}
              </span>
            </div>

            {/* Scrollable Pivot Grid */}
            <div className="overflow-x-auto max-h-[550px] border border-slate-200 rounded-md relative">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead className="sticky top-0 z-20 bg-slate-900 text-white font-bold border-b border-slate-900">
                  <tr>
                    <th className="py-3 px-3.5 border-r border-slate-800 min-w-[200px] sticky left-0 z-30 bg-slate-900">
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
                      <th key={cKey} className="py-3 px-3 text-right border-r border-slate-800 min-w-[120px]">
                        {cKey}
                      </th>
                    ))}
                    <th className="py-3 px-3.5 text-right bg-slate-800 text-emerald-300 min-w-[130px] font-bold border-l border-slate-700">
                      รวมแถว
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
                  {pivotMatrixData.rowKeys.length === 0 ? (
                    <tr>
                      <td
                        colSpan={pivotMatrixData.colKeys.length + 2}
                        className="py-12 text-center text-slate-500 font-bold"
                      >
                        ไม่พบข้อมูลสำหรับเงื่อนไขที่เลือก
                      </td>
                    </tr>
                  ) : (
                    pivotMatrixData.rowKeys.map((rKey) => {
                      let rowSum = 0;
                      const allRowCellBills: SheetRow[] = [];

                      return (
                        <tr key={rKey} className="hover:bg-slate-50 transition">
                          {/* Row Label (Sticky Left) */}
                          <td className="py-2.5 px-3.5 font-bold text-slate-900 border-r border-slate-200 sticky left-0 z-10 bg-white">
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

                            let heatmapBg = "bg-white";
                            if (hasVal) {
                              if (intensity > 0.6) heatmapBg = "bg-emerald-50 text-emerald-950 font-semibold";
                              else if (intensity > 0.3) heatmapBg = "bg-slate-50 text-slate-900 font-medium";
                              else heatmapBg = "bg-white text-slate-800 font-medium";
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
                                className={`py-2.5 px-3 text-right border-r border-slate-100 transition ${heatmapBg} ${
                                  hasVal ? "cursor-pointer hover:bg-emerald-100" : "text-slate-300"
                                }`}
                              >
                                {hasVal ? (
                                  metricType === "count" ? (
                                    <span>{val} บิล</span>
                                  ) : (
                                    <span>{money(val)}</span>
                                  )
                                ) : (
                                  "-"
                                )}
                              </td>
                            );
                          })}

                          {/* Row Total */}
                          <td
                            onClick={() => {
                              if (allRowCellBills.length) {
                                setDrilldownModal({
                                  title: `สรุปบิลรวมแถว: "${rKey}"`,
                                  rows: allRowCellBills,
                                });
                              }
                            }}
                            className="py-2.5 px-3.5 text-right font-semibold text-slate-900 bg-slate-50 border-l border-slate-200 cursor-pointer hover:bg-slate-100 transition"
                          >
                            {metricType === "count" ? `${rowSum} บิล` : money(rowSum)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

                {/* Matrix Footer Totals (Column Summary) */}
                {pivotMatrixData.rowKeys.length > 0 && (
                  <tfoot className="sticky bottom-0 z-20 bg-slate-100 text-slate-900 font-semibold text-xs border-t-2 border-slate-400">
                    <tr>
                      <td className="py-3 px-3.5 sticky left-0 z-30 font-semibold border-r border-slate-300 bg-slate-200 text-slate-950">
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
                            className={`py-3 px-3 text-right border-r border-slate-200 transition font-semibold bg-slate-100 ${
                              hasVal ? "cursor-pointer text-emerald-800 hover:bg-emerald-100" : "text-slate-400"
                            }`}
                          >
                            {hasVal ? (
                              metricType === "count" ? (
                                <span>{colData.val} บิล</span>
                              ) : (
                                <span>{money(colData.val)}</span>
                              )
                            ) : (
                              "-"
                            )}
                          </td>
                        );
                      })}
                      <td className="py-3 px-3.5 text-right font-semibold text-sm text-emerald-950 bg-emerald-200 border-l border-slate-300">
                        {metricType === "count" ? `${grandTotalValue} บิล` : money(grandTotalValue)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW TAB 2: BUDGET CONTROL MATRIX VIEW */}
      {mainTab === "budget_matrix" && (
        <ProjectBudgetControlMatrix
          projectRows={projectRows}
          dataRows={dataRows}
          selectedProjectId={selectedProjectId}
          onSelectProject={setSelectedProjectId}
        />
      )}

      {/* 5. CELL DRILLDOWN MODAL */}
      {drilldownModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-5xl w-full max-h-[85vh] flex flex-col border border-slate-300 shadow-2xl overflow-hidden animate-in fade-in duration-150">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">{drilldownModal.title}</h3>
              <button
                type="button"
                onClick={() => setDrilldownModal(null)}
                className="w-7 h-7 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center transition cursor-pointer font-bold"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content Table */}
            <div className="p-4 overflow-y-auto flex-1">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead className="bg-slate-900 text-white font-bold sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">ลำดับ</th>
                    <th className="py-2.5 px-3">ร้านค้า/ผู้รับเหมา</th>
                    <th className="py-2.5 px-3">รายละเอียดงาน / รายการ</th>
                    <th className="py-2.5 px-3 text-right">ยอดบิล</th>
                    <th className="py-2.5 px-3 text-right text-emerald-300">ยอดโอน</th>
                    <th className="py-2.5 px-3 text-center">วันที่</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {drilldownModal.rows.map((b, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition">
                      <td className="py-2 px-3 text-slate-600 font-semibold">{b["ลำดับ"] || i + 1}</td>
                      <td className="py-2 px-3 font-bold text-slate-900">
                        {b["ร้านค้า"] || b["ผู้รับเหมา"] || b["ร้าน/บุคคล"] || "-"}
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-800">{b["รายละเอียดงาน"] || b["สินค้า/ทำงาน"] || b["รายการ"] || "-"}</td>
                      <td className="py-2 px-3 text-right font-semibold text-slate-900">{money(getRowAmount(b))} ฿</td>
                      <td className="py-2 px-3 text-right font-semibold text-emerald-800 bg-emerald-50">
                        {money(getRowTransferAmount(b))} ฿
                      </td>
                      <td className="py-2 px-3 text-center text-slate-700 font-semibold">
                        {String(b["ว/ด/ป"] || b["วันที่"] || "-")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-100 flex items-center justify-between text-xs font-bold">
              <span className="text-slate-600">รวม {drilldownModal.rows.length} รายการ</span>
              <span className="text-emerald-800 font-semibold text-sm">
                ยอดโอนสุทธิรวม: {money(drilldownModal.rows.reduce((sum, b) => sum + getRowTransferAmount(b), 0))} ฿
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
