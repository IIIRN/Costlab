"use client";

import { useMemo, useState } from "react";
import { BarChart3, Coins, Layers, Filter, PieChart, Search, X, SlidersHorizontal, ArrowUpDown } from "lucide-react";
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
type ColumnDimension = "category" | "product_category" | "project" | "month" | "status";
type MetricType = "transfer" | "amount" | "count";

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

  const totalBillAmountSum = useMemo(() => {
    return filteredDataRows.reduce((sum, r) => sum + getRowAmount(r), 0);
  }, [filteredDataRows]);

  return (
    <div className="w-full flex flex-col gap-4 p-4 sm:p-5 max-w-[1750px] mx-auto font-sans text-sm text-slate-800 print:p-0">
      {/* 1. COMPACT EXECUTIVE HEADER BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-600 text-white rounded-lg shadow-2xs">
            <BarChart3 size={20} />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>แดชบอร์ดวิเคราะห์การเงินและควบคุมงบประมาณ</span>
              <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                Real-time Analytics
              </span>
            </h1>
            <p className="text-xs text-slate-500">วิเคราะห์ข้อมูลการเบิกจ่าย เปรียบเทียบวงเงินคุมงบ (Risk Control Matrix) และตาราง Pivot สรุปต้นทุน</p>
          </div>
        </div>

        {/* Executive Quick Stats Strip */}
        <div className="flex items-center gap-2 text-xs">
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-right">
            <span className="text-[10px] text-slate-400 block font-semibold">โครงการทั้งหมด</span>
            <span className="font-extrabold text-slate-800">{projectsList.length} โครงการ</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-right">
            <span className="text-[10px] text-slate-400 block font-semibold">บิลเบิกจ่ายรวม</span>
            <span className="font-extrabold text-indigo-600">{filteredDataRows.length.toLocaleString()} บิล</span>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 text-right">
            <span className="text-[10px] text-emerald-700 block font-semibold">ยอดโอนเงินสะสมรวม</span>
            <span className="font-extrabold text-emerald-800">{money(totalTransferSum)} ฿</span>
          </div>
        </div>
      </div>

      {/* 2. EXECUTIVE CATEGORY BUDGET CONTROL MATRIX */}
      <ProjectBudgetControlMatrix
        projectRows={projectRows}
        dataRows={dataRows}
        selectedProjectId={selectedProjectId}
        onSelectProject={setSelectedProjectId}
      />

      {/* 3. CLEAN & COMPACT PIVOT CONTROLS TOOLBAR */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3 shadow-2xs">
        {/* Preset Tabs & Metric Toggle Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-bold flex items-center gap-1 mr-1">
              <SlidersHorizontal size={13} className="text-emerald-600" /> มิติมุมมอง:
            </span>
            <button
              type="button"
              onClick={() => handleSelectPreset("proj_cat")}
              className={`px-2.5 py-1 rounded-lg transition text-xs font-semibold cursor-pointer ${
                pivotPreset === "proj_cat"
                  ? "bg-emerald-700 text-white shadow-2xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              โครงการ × หมวดหมู่
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset("proj_prod")}
              className={`px-2.5 py-1 rounded-lg transition text-xs font-semibold cursor-pointer ${
                pivotPreset === "proj_prod"
                  ? "bg-emerald-700 text-white shadow-2xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              โครงการ × สินค้า
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset("vendor_cat")}
              className={`px-2.5 py-1 rounded-lg transition text-xs font-semibold cursor-pointer ${
                pivotPreset === "vendor_cat"
                  ? "bg-emerald-700 text-white shadow-2xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              ร้านค้า/ผู้รับเหมา × หมวดหมู่
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset("month_proj")}
              className={`px-2.5 py-1 rounded-lg transition text-xs font-semibold cursor-pointer ${
                pivotPreset === "month_proj"
                  ? "bg-emerald-700 text-white shadow-2xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              โครงการ × รายเดือน
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset("custom")}
              className={`px-2.5 py-1 rounded-lg transition text-xs font-semibold cursor-pointer ${
                pivotPreset === "custom"
                  ? "bg-emerald-700 text-white shadow-2xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              กำหนดเอง
            </button>
          </div>

          {/* Metric Type Selector */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-400 font-semibold mr-1">ตัวเลขที่แสดง:</span>
            <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setMetricType("transfer")}
                className={`px-2.5 py-0.5 rounded-md font-bold transition text-xs cursor-pointer ${
                  metricType === "transfer" ? "bg-emerald-600 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                ยอดโอนสุทธิ (฿)
              </button>
              <button
                type="button"
                onClick={() => setMetricType("amount")}
                className={`px-2.5 py-0.5 rounded-md font-bold transition text-xs cursor-pointer ${
                  metricType === "amount" ? "bg-emerald-600 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                ยอดเงินบิล (฿)
              </button>
              <button
                type="button"
                onClick={() => setMetricType("count")}
                className={`px-2.5 py-0.5 rounded-md font-bold transition text-xs cursor-pointer ${
                  metricType === "count" ? "bg-emerald-600 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                จำนวนบิล
              </button>
            </div>
          </div>
        </div>

        {/* Dimension Dropdowns & Search Input */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-600">แนวแถว:</span>
              <select
                value={rowDimension}
                onChange={(e) => {
                  setRowDimension(e.target.value as RowDimension);
                  setPivotPreset("custom");
                }}
                className="bg-slate-50 border border-slate-200 text-xs text-slate-800 font-semibold px-2.5 py-1 rounded-lg focus:outline-none focus:border-emerald-500"
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
              <span className="font-semibold text-slate-600">แนวคอลัมน์:</span>
              <select
                value={colDimension}
                onChange={(e) => {
                  setColDimension(e.target.value as ColumnDimension);
                  setPivotPreset("custom");
                }}
                className="bg-slate-50 border border-slate-200 text-xs text-slate-800 font-semibold px-2.5 py-1 rounded-lg focus:outline-none focus:border-emerald-500"
              >
                <option value="category">หมวดหมู่หลัก (Categories)</option>
                <option value="product_category">ประเภทสินค้า Master Data</option>
                <option value="project">โครงการ (Projects)</option>
                <option value="month">รายเดือน (Monthly)</option>
              </select>
            </div>
          </div>

          {/* Project & Search Filter */}
          <div className="flex items-center gap-2">
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 px-2.5 py-1 rounded-lg focus:outline-none focus:border-emerald-500 max-w-[200px]"
            >
              <option value="all">ทุกโครงการ ({projectsList.length})</option>
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
                placeholder="ค้นหารายการ..."
                className="bg-slate-50 text-slate-800 text-xs pl-8 pr-7 py-1 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500 w-40 sm:w-52 font-semibold"
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

      {/* 4. DYNAMIC PIVOT MATRIX TABLE */}
      <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-2xs flex flex-col">
        <div className="px-3.5 py-2.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700 flex items-center gap-1.5">
            <span>ตารางเมทริกซ์ Pivot</span>
            <span className="text-[11px] font-mono text-slate-400 font-normal">
              ({pivotMatrixData.rowKeys.length} แถว × {pivotMatrixData.colKeys.length} คอลัมน์)
            </span>
          </span>
          <span className="font-extrabold text-emerald-700 font-mono">
            รวมสุทธิ: {metricType === "count" ? `${grandTotalValue} รายการ` : money(grandTotalValue)}
          </span>
        </div>

        {/* Scrollable Pivot Grid */}
        <div className="overflow-auto max-h-[calc(100vh-220px)] relative">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead className="sticky top-0 z-20 bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 border-r border-slate-200 min-w-[200px] sticky left-0 z-30 bg-slate-100">
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
                  <th key={cKey} className="py-2.5 px-3 text-right border-r border-slate-200 min-w-[120px]">
                    {cKey}
                  </th>
                ))}
                <th className="py-2.5 px-3 text-right bg-slate-200 text-slate-900 min-w-[130px] font-bold border-l border-slate-300">
                  รวมแถว
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {pivotMatrixData.rowKeys.length === 0 ? (
                <tr>
                  <td
                    colSpan={pivotMatrixData.colKeys.length + 2}
                    className="py-12 text-center text-slate-400 font-medium"
                  >
                    ไม่พบข้อมูลสำหรับเงื่อนไขที่เลือก
                  </td>
                </tr>
              ) : (
                pivotMatrixData.rowKeys.map((rKey) => {
                  let rowSum = 0;
                  const allRowCellBills: SheetRow[] = [];

                  return (
                    <tr key={rKey} className="hover:bg-slate-50 transition-colors">
                      {/* Row Label (Sticky Left) */}
                      <td className="py-2.5 px-3 font-semibold text-slate-800 border-r border-slate-200 sticky left-0 z-10 bg-white">
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
                          if (intensity > 0.6) heatmapBg = "bg-emerald-50 text-emerald-900 font-bold";
                          else if (intensity > 0.3) heatmapBg = "bg-slate-50 text-slate-900 font-semibold";
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
                            className={`py-2 px-2.5 text-right border-r border-slate-100 transition ${heatmapBg} ${
                              hasVal ? "cursor-pointer hover:bg-emerald-100" : "text-slate-300"
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
                        className="py-2 px-3 text-right font-bold text-slate-900 bg-slate-50 border-l border-slate-200 cursor-pointer hover:bg-slate-100 transition"
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
              <tfoot className="sticky bottom-0 z-20 bg-slate-100 text-slate-900 font-bold text-xs border-t-2 border-slate-300">
                <tr>
                  <td className="py-2.5 px-3 sticky left-0 z-30 font-bold border-r border-slate-300 bg-slate-100">
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
                        className={`py-2.5 px-2.5 text-right border-r border-slate-300 transition font-bold ${
                          hasVal ? "cursor-pointer text-emerald-800 bg-emerald-50 hover:bg-emerald-100" : "text-slate-400"
                        }`}
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
                    style={{ color: "#020617", backgroundColor: "#a7f3d0" }}
                    className="py-2.5 px-3 text-right font-black text-xs border-l border-emerald-400"
                  >
                    {metricType === "count" ? `${grandTotalValue} รายการ` : money(grandTotalValue)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* 5. CELL DRILLDOWN MODAL */}
      {drilldownModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-5xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in duration-150">
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900">{drilldownModal.title}</h3>
              <button
                type="button"
                onClick={() => setDrilldownModal(null)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center transition cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Content Table */}
            <div className="p-3 overflow-y-auto flex-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="py-2 px-2.5">ลำดับ</th>
                    <th className="py-2 px-2.5">ร้านค้า/ผู้รับเหมา</th>
                    <th className="py-2 px-2.5">รายละเอียดงาน</th>
                    <th className="py-2 px-2.5 text-right">ยอดบิล</th>
                    <th className="py-2 px-2.5 text-right text-emerald-700">ยอดโอน</th>
                    <th className="py-2 px-2.5 text-center">วันที่</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {drilldownModal.rows.map((b, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition">
                      <td className="py-2 px-2.5 text-slate-500 font-semibold">{b["ลำดับ"] || i + 1}</td>
                      <td className="py-2 px-2.5 font-bold text-slate-900">
                        {b["ร้านค้า"] || b["ผู้รับเหมา"] || b["ร้าน/บุคคล"] || "-"}
                      </td>
                      <td className="py-2 px-2.5 text-slate-700">{b["รายละเอียดงาน"] || b["สินค้า/ทำงาน"] || b["รายการ"] || "-"}</td>
                      <td className="py-2 px-2.5 text-right font-mono font-bold">{money(getRowAmount(b))} ฿</td>
                      <td className="py-2 px-2.5 text-right font-mono font-bold text-emerald-700 bg-emerald-50">
                        {money(getRowTransferAmount(b))} ฿
                      </td>
                      <td className="py-2 px-2.5 text-center text-slate-500 font-mono">
                        {String(b["ว/ด/ป"] || b["วันที่"] || "-")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-500">รวม {drilldownModal.rows.length} รายการ</span>
              <span className="text-emerald-700 font-bold font-mono">
                ยอดโอนสุทธิรวม: {money(drilldownModal.rows.reduce((sum, b) => sum + getRowTransferAmount(b), 0))} ฿
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
