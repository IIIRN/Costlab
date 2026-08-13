"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Coins,
  Layers,
  PieChart,
  ShieldAlert,
  Sparkles,
  X,
  Building2,
  Home,
  Zap,
  Truck,
  Package,
  BarChart3,
  Table as TableIcon,
  LayoutGrid
} from "lucide-react";
import { money, toNumber } from "@/lib/numbers";
import type { SheetRow } from "@/lib/types";
import { getRowAmount, getRowTransferAmount } from "@/lib/reports";

export type ProjectBudgetControlMatrixProps = {
  projectRows: SheetRow[];
  dataRows: SheetRow[];
  selectedProjectId: string;
  onSelectProject?: (projId: string) => void;
};

type CategoryConfig = {
  field: string;
  label: string;
  group: string;
  icon?: string;
  matchKeys: string[];
};

type ViewMode = "all" | "chart" | "table";

const DEFAULT_CATEGORY_MAP: CategoryConfig[] = [
  { field: "งบไม่เกินเหล็กเส้น", label: "1. เหล็กเส้น", group: "หมวดงานโครงสร้าง", icon: "🏗️", matchKeys: ["1", "เหล็กเส้น"] },
  { field: "งบไม่เกินรูปพรรณ", label: "2. เหล็กรูปพรรณ", group: "หมวดงานโครงสร้าง", icon: "📐", matchKeys: ["2", "รูปพรรณ"] },
  { field: "งบไม่เกินคอนกรีต", label: "3. คอนกรีต", group: "หมวดงานโครงสร้าง", icon: "🧱", matchKeys: ["3", "คอนกรีต"] },
  { field: "งบไม่เกินไม้แบบ", label: "4. ไม้แบบ", group: "หมวดงานโครงสร้าง", icon: "🪵", matchKeys: ["4", "ไม้แบบ"] },

  { field: "งบไม่เกินวัสดุมุง", label: "5. วัสดุมุง", group: "หมวดงานสถาปัตยกรรม & ตกแต่ง", icon: "🏠", matchKeys: ["5", "วัสดุมุง"] },
  { field: "งบไม่เกินฝ้าผนัง", label: "6. ฝ้าผนัง", group: "หมวดงานสถาปัตยกรรม & ตกแต่ง", icon: "🖼️", matchKeys: ["6", "ฝ้าผนัง"] },
  { field: "งบไม่เกินปูพื้น", label: "7. ปูพื้น", group: "หมวดงานสถาปัตยกรรม & ตกแต่ง", icon: "🏁", matchKeys: ["7", "ปูพื้น"] },
  { field: "งบไม่เกินกระจก", label: "8. กระจก", group: "หมวดงานสถาปัตยกรรม & ตกแต่ง", icon: "🪟", matchKeys: ["8", "กระจก"] },
  { field: "งบไม่เกินสีเคมี", label: "12. สีเคมี", group: "หมวดงานสถาปัตยกรรม & ตกแต่ง", icon: "🎨", matchKeys: ["12", "สีเคมี"] },
  { field: "งบไม่เกินสุขภัณฑ์", label: "13. สุขภัณฑ์", group: "หมวดงานสถาปัตยกรรม & ตกแต่ง", icon: "🚽", matchKeys: ["13", "สุขภัณฑ์"] },
  { field: "งบไม่เกินบิวอิน", label: "14. บิวท์อิน", group: "หมวดงานสถาปัตยกรรม & ตกแต่ง", icon: "🛋️", matchKeys: ["14", "บิวอิน", "นั่งร้าน"] },

  { field: "งบไม่เกินไฟฟ้า", label: "9. ไฟฟ้า", group: "หมวดงานระบบ M&E", icon: "⚡", matchKeys: ["9", "ไฟฟ้า"] },
  { field: "งบไม่เกินประปา", label: "10. ประปา", group: "หมวดงานระบบ M&E", icon: "🚰", matchKeys: ["10", "ประปา"] },
  { field: "งบไม่เกินแอร์", label: "15. แอร์", group: "หมวดงานระบบ M&E", icon: "❄️", matchKeys: ["15", "แอร์"] },

  { field: "งบไม่เกินดิน", label: "16. ดิน", group: "หมวดงานเตรียมดิน & โลจิสติกส์", icon: "🌱", matchKeys: ["16", "ดิน"] },
  { field: "งบไม่เกินหินทราย", label: "17. หินทราย", group: "หมวดงานเตรียมดิน & โลจิสติกส์", icon: "🪨", matchKeys: ["17", "หินทราย"] },
  { field: "งบไม่เกินเตรียมงาน", label: "18. เตรียมงาน", group: "หมวดงานเตรียมดิน & โลจิสติกส์", icon: "🚜", matchKeys: ["18", "เตรียมงาน"] },
  { field: "งบไม่เกินน้ำมัน", label: "4. น้ำมันเชื้อเพลิง", group: "หมวดงานเตรียมดิน & โลจิสติกส์", icon: "⛽", matchKeys: ["101", "4.น้ำมัน", "น้ำมัน"] },
  { field: "งบไม่เกินซ่อมรถ", label: "5. ซ่อมแซมยานพาหนะ", group: "หมวดงานเตรียมดิน & โลจิสติกส์", icon: "🔧", matchKeys: ["102", "5.ซ่อมรถ", "ซ่อมรถ"] },
  { field: "งบไม่เกินเครื่องจักร", label: "6. เครื่องจักร", group: "หมวดงานเตรียมดิน & โลจิสติกส์", icon: "🏗️", matchKeys: ["103", "6.เครื่องจักร", "เครื่องจักร"] },

  { field: "งบไม่เกินค่าของ", label: "1. ค่าของ (ภาพรวม)", group: "ภาพรวมต้นทุนโครงการ", icon: "📦", matchKeys: ["1.ค่าของ", "ค่าของ"] },
  { field: "งบไม่เกินค่าแรง", label: "2. ค่าแรง (ภาพรวม)", group: "ภาพรวมต้นทุนโครงการ", icon: "👷", matchKeys: ["2.ค่าแรง", "ค่าแรง"] },
  { field: "งบไม่เกินพนักงาน", label: "3. พนักงาน", group: "หมวดงานทั่วไป & ดำเนินการ", icon: "👥", matchKeys: ["3.พนักงาน", "พนักงาน"] },
  { field: "งบไม่เกินเครื่องมือ", label: "7. เครื่องมือช่าง", group: "หมวดงานทั่วไป & ดำเนินการ", icon: "🔨", matchKeys: ["7.เครื่องมือ", "เครื่องมือ"] },
  { field: "งบไม่เกินอื่นๆ", label: "11. อื่นๆ (วัสดุ)", group: "หมวดงานทั่วไป & ดำเนินการ", icon: "📦", matchKeys: ["11", "อื่นๆ"] },
];

function getGroupIcon(groupName: string) {
  if (groupName.includes("โครงสร้าง")) return <Building2 size={14} className="text-amber-600 shrink-0" />;
  if (groupName.includes("สถาปัตยกรรม")) return <Home size={14} className="text-indigo-600 shrink-0" />;
  if (groupName.includes("ระบบ")) return <Zap size={14} className="text-cyan-600 shrink-0" />;
  if (groupName.includes("เตรียมดิน") || groupName.includes("โลจิสติกส์")) return <Truck size={14} className="text-emerald-600 shrink-0" />;
  if (groupName.includes("ภาพรวม")) return <PieChart size={14} className="text-emerald-600 shrink-0" />;
  return <Package size={14} className="text-slate-500 shrink-0" />;
}

export function ProjectBudgetControlMatrix({
  projectRows,
  dataRows,
  selectedProjectId,
  onSelectProject
}: ProjectBudgetControlMatrixProps) {
  const [categoryMap, setCategoryMap] = useState<CategoryConfig[]>(DEFAULT_CATEGORY_MAP);
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [drilldownModal, setDrilldownModal] = useState<{ title: string; rows: SheetRow[] } | null>(null);

  // Dynamically load options from /api/system-options
  useEffect(() => {
    async function loadMasterOptions() {
      try {
        const res = await fetch("/api/system-options");
        const json = await res.json();
        if (json.success && json.options && Array.isArray(json.options["PRODUCT_MASTER_DATA"])) {
          const masterList = json.options["PRODUCT_MASTER_DATA"];
          const dynamicMap: CategoryConfig[] = masterList.map((item: any) => {
            const code = item.code || "";
            const name = item.name || "";
            const group = (item.group || "").replace(/^[\p{Emoji}\s]+/gu, "").trim() || "หมวดงานทั่วไป & ดำเนินการ";
            const fieldName = `งบไม่เกิน${name.replace(/อื่นๆ\(วัสดุ\)/, "อื่นๆ").replace(/เหล็กรูปพรรณ/, "รูปพรรณ").replace(/[^a-zA-Z0-9ก-๙]/g, "")}`;
            return {
              field: fieldName,
              label: `${code ? code + ". " : ""}${name}`,
              group,
              matchKeys: [code, name]
            };
          });

          // Include MAIN_CATEGORIES
          const fullMap = [
            { field: "งบไม่เกินค่าของ", label: "1. ค่าของ (ภาพรวม)", group: "ภาพรวมต้นทุนโครงการ", icon: "📦", matchKeys: ["1.ค่าของ", "ค่าของ"] },
            { field: "งบไม่เกินค่าแรง", label: "2. ค่าแรง (ภาพรวม)", group: "ภาพรวมต้นทุนโครงการ", icon: "👷", matchKeys: ["2.ค่าแรง", "ค่าแรง"] },
            ...dynamicMap
          ];

          // Deduplicate by field
          const seen = new Set<string>();
          const cleanMap = fullMap.filter(c => {
            if (seen.has(c.field)) return false;
            seen.add(c.field);
            return true;
          });
          setCategoryMap(cleanMap);
        }
      } catch (err) {
        console.error("Failed to load master options for budget matrix:", err);
      }
    }
    loadMasterOptions();
  }, []);

  // Selected project object
  const selectedProject = useMemo(() => {
    if (!selectedProjectId || selectedProjectId === "all") return null;
    return projectRows.find(p => String(p["ID Project"] || "").trim() === selectedProjectId) || null;
  }, [projectRows, selectedProjectId]);

  // Bills for selected project
  const projectBills = useMemo(() => {
    if (!selectedProjectId || selectedProjectId === "all") return dataRows;
    return dataRows.filter(b => String(b["ID Project"] || "").trim() === selectedProjectId);
  }, [dataRows, selectedProjectId]);

  // Category analysis statistics
  const categoryAnalysis = useMemo(() => {
    return categoryMap.map((cat) => {
      const budgetCap = selectedProject ? toNumber(selectedProject[cat.field]) : 0;

      // Filter matching bills
      const matchingBills = projectBills.filter((b) => {
        const prod = String(b["สินค้า"] || b["สินค้า/ทำงาน"] || "").trim().toLowerCase();
        const typeCat = String(b["ประเภท"] || "").trim().toLowerCase();

        return cat.matchKeys.some(key => {
          if (!key) return false;
          const k = key.toLowerCase();
          return prod.startsWith(k) || prod.includes(k) || typeCat.includes(k);
        });
      });

      const actualSpent = matchingBills.reduce((sum, b) => sum + getRowTransferAmount(b), 0);
      const remaining = budgetCap > 0 ? budgetCap - actualSpent : 0;
      const usagePercent = budgetCap > 0 ? Number(((actualSpent / budgetCap) * 100).toFixed(1)) : 0;
      const isOver = budgetCap > 0 && actualSpent > budgetCap;
      const isWarning = budgetCap > 0 && !isOver && usagePercent >= 85;

      return {
        ...cat,
        budgetCap,
        actualSpent,
        remaining,
        usagePercent,
        isOver,
        isWarning,
        matchingBills
      };
    }).filter(c => c.budgetCap > 0 || c.actualSpent > 0);
  }, [selectedProject, projectBills, categoryMap]);

  // Group analysis items by Group Category
  const groupedAnalysis = useMemo(() => {
    const map: Record<string, typeof categoryAnalysis> = {};
    categoryAnalysis.forEach(c => {
      const g = c.group || "หมวดงานทั่วไป & ดำเนินการ";
      if (!map[g]) map[g] = [];
      map[g].push(c);
    });
    return map;
  }, [categoryAnalysis]);

  // Work Group Aggregation Stats for Chart View
  const workGroupChartStats = useMemo(() => {
    return Object.entries(groupedAnalysis).map(([groupTitle, items]) => {
      const capSum = items.reduce((s, i) => s + i.budgetCap, 0);
      const spentSum = items.reduce((s, i) => s + i.actualSpent, 0);
      const usagePercent = capSum > 0 ? Number(((spentSum / capSum) * 100).toFixed(1)) : 0;
      const isOver = capSum > 0 && spentSum > capSum;
      const isWarning = capSum > 0 && !isOver && usagePercent >= 85;
      const totalBills = items.reduce((s, i) => s + i.matchingBills.length, 0);

      return {
        groupTitle,
        capSum,
        spentSum,
        usagePercent,
        isOver,
        isWarning,
        totalBills,
        itemsCount: items.length
      };
    });
  }, [groupedAnalysis]);

  // Top 5 Highest Spent Categories for Chart
  const topCategoriesChart = useMemo(() => {
    return [...categoryAnalysis]
      .filter(c => c.actualSpent > 0)
      .sort((a, b) => b.actualSpent - a.actualSpent)
      .slice(0, 5);
  }, [categoryAnalysis]);

  // Project KPI summaries
  const totalProjectCap = selectedProject ? toNumber(selectedProject["งบไม่เกิน"] || selectedProject["ยอดงาน"]) : 0;
  const totalCategoryCapAllocated = categoryAnalysis.reduce((sum, c) => sum + c.budgetCap, 0);
  const totalActualSpent = projectBills.reduce((sum, b) => sum + getRowTransferAmount(b), 0);
  const overallUsagePercent = totalProjectCap > 0 ? Number(((totalActualSpent / totalProjectCap) * 100).toFixed(1)) : 0;

  return (
    <div className="bg-white text-slate-800 rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4 font-sans my-4">
      {/* 1. SECTION HEADER & VIEW MODE CONTROLS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200 shadow-2xs">
            <BarChart3 size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              รายงานวิเคราะห์ความเสี่ยงงบประมาณ (Budget Control Matrix & Charts)
            </h2>
            <p className="text-xs text-slate-500">
              วิเคราะห์ภาพรวมวงเงินคุมงบ (Budget Cap) vs ยอดจ่ายจริง (Actual) ด้วยกราฟและตารางเมทริกซ์
            </p>
          </div>
        </div>

        {/* View Mode Toggle & Project Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Mode Switcher */}
          <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("all")}
              className={`px-2.5 py-1 rounded-md font-semibold transition flex items-center gap-1 cursor-pointer ${
                viewMode === "all" ? "bg-white text-emerald-800 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <LayoutGrid size={13} />
              <span>ทั้งคู่</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("chart")}
              className={`px-2.5 py-1 rounded-md font-semibold transition flex items-center gap-1 cursor-pointer ${
                viewMode === "chart" ? "bg-white text-emerald-800 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BarChart3 size={13} />
              <span>กราฟ</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-2.5 py-1 rounded-md font-semibold transition flex items-center gap-1 cursor-pointer ${
                viewMode === "table" ? "bg-white text-emerald-800 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <TableIcon size={13} />
              <span>ตาราง</span>
            </button>
          </div>

          {/* Project Switcher */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-slate-600 font-bold">โครงการ:</label>
            <select
              value={selectedProjectId}
              onChange={(e) => onSelectProject?.(e.target.value)}
              className="bg-white border border-slate-300 text-xs font-semibold text-slate-800 px-3 py-1.5 rounded-lg focus:outline-none focus:border-emerald-500 max-w-[220px]"
            >
              <option value="all">แสดงรวมทุกโครงการ</option>
              {projectRows.map((p) => {
                const id = String(p["ID Project"] || p.id || "").trim();
                const name = String(p["ชื่อ Project"] || p.name || "").trim();
                return (
                  <option key={id} value={id}>
                    {id} - {name}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* 2. EXECUTIVE KPI STRIP */}
      {selectedProject ? (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <div className="space-y-1">
            <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
              <Coins size={13} className="text-amber-600" /> งบโครงการรวม (Project Cap)
            </span>
            <p className="text-base font-extrabold text-slate-900">{money(totalProjectCap)} ฿</p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
              <Layers size={13} className="text-cyan-600" /> รวมงบจัดสรรรายหมวด
            </span>
            <p className="text-base font-extrabold text-cyan-700">{money(totalCategoryCapAllocated)} ฿</p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
              <CheckCircle2 size={13} className="text-emerald-600" /> ยอดเบิกจ่ายจริงสะสม
            </span>
            <p className="text-base font-extrabold text-emerald-700">{money(totalActualSpent)} ฿</p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
              {overallUsagePercent > 100 ? (
                <ShieldAlert size={13} className="text-rose-600 animate-pulse" />
              ) : (
                <Sparkles size={13} className="text-emerald-600" />
              )}
              อัตราการใช้วงเงินรวม
            </span>
            <p className={`text-base font-extrabold ${overallUsagePercent > 100 ? "text-rose-600" : "text-slate-900"}`}>
              {overallUsagePercent}%
            </p>
          </div>
        </div>
      ) : null}

      {/* 3. VISUAL CHARTS SECTION */}
      {(viewMode === "all" || viewMode === "chart") && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* CHART A: WORK GROUP BUDGET CAP VS ACTUAL SPEND (2 Columns) */}
          <div className="lg:col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <BarChart3 size={15} className="text-emerald-600" />
                <span>เปรียบเทียบ วงเงินคุมงบ (Cap) vs ยอดจ่ายจริง (Actual) แยกตามหมวดงาน</span>
              </h3>
              <span className="text-[10px] text-slate-400 font-medium">Work Group Visual Analysis</span>
            </div>

            <div className="space-y-3">
              {workGroupChartStats.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs font-medium">
                  ไม่มีข้อมูลเปรียบเทียบสำหรับเงื่อนไขนี้
                </div>
              ) : (
                workGroupChartStats.map((wg) => (
                  <div key={wg.groupTitle} className="bg-white border border-slate-200 rounded-lg p-3 space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        {getGroupIcon(wg.groupTitle)}
                        <span>{wg.groupTitle}</span>
                        <span className="text-[10px] text-slate-400 font-normal">({wg.itemsCount} หมวดย่อย)</span>
                      </span>

                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <span className="text-slate-500">Cap: <strong className="text-slate-800">{money(wg.capSum)}</strong> ฿</span>
                        <span className="text-slate-300">|</span>
                        <span className="text-slate-500">Spent: <strong className="text-emerald-700">{money(wg.spentSum)}</strong> ฿</span>
                        {wg.isOver ? (
                          <span className="px-1.5 py-0.2 bg-rose-100 text-rose-700 rounded-full font-sans font-bold text-[9px]">เกินงบ</span>
                        ) : wg.isWarning ? (
                          <span className="px-1.5 py-0.2 bg-amber-100 text-amber-700 rounded-full font-sans font-bold text-[9px]">เฝ้าระวัง</span>
                        ) : (
                          <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-700 rounded-full font-sans font-bold text-[9px]">ปกติ</span>
                        )}
                      </div>
                    </div>

                    {/* Progress Visual Bar */}
                    <div className="space-y-0.5">
                      <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200 flex">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            wg.isOver ? "bg-rose-500" : wg.isWarning ? "bg-amber-400" : "bg-emerald-600"
                          }`}
                          style={{ width: `${Math.min(100, wg.usagePercent)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-mono text-slate-500">
                        <span>ใช้วงเงินไป {wg.usagePercent}%</span>
                        <span>
                          {wg.capSum > 0
                            ? wg.capSum - wg.spentSum >= 0
                              ? `คงเหลือ ${money(wg.capSum - wg.spentSum)} ฿`
                              : `เกินงบ ${money(Math.abs(wg.capSum - wg.spentSum))} ฿`
                            : `จ่ายสะสม ${money(wg.spentSum)} ฿`}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* CHART B: TOP 5 HIGHEST SPENDING CATEGORIES (1 Column) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles size={15} className="text-amber-500" />
                <span>5 อันดับหมวดสินค้าที่เบิกจ่ายสูงสุด</span>
              </h3>
              <span className="text-[10px] text-slate-400 font-medium">Top 5 Spending</span>
            </div>

            <div className="space-y-2.5">
              {topCategoriesChart.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs font-medium">
                  ยังไม่มีรายการเบิกจ่ายในหมวดสินค้า
                </div>
              ) : (
                topCategoriesChart.map((cat, idx) => {
                  const shareOfTotal = totalActualSpent > 0 ? (cat.actualSpent / totalActualSpent) * 100 : 0;

                  return (
                    <div key={cat.field} className="bg-white border border-slate-200 rounded-lg p-2.5 space-y-1 shadow-2xs">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800 flex items-center gap-1.5 truncate">
                          <span className="w-4 h-4 rounded-full bg-slate-800 text-white text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="truncate">{cat.label}</span>
                        </span>
                        <span className="font-extrabold text-emerald-700 font-mono text-[11px] shrink-0">
                          {money(cat.actualSpent)} ฿
                        </span>
                      </div>

                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-slate-800 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, shareOfTotal)}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                        <span>{cat.matchingBills.length} บิล</span>
                        <span>{shareOfTotal.toFixed(1)}% ของยอดรวม</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. CATEGORY CONTROL BREAKDOWN TABLE */}
      {(viewMode === "all" || viewMode === "table") && (
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
          <div className="overflow-x-auto max-h-[460px]">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead className="bg-slate-100 text-slate-800 font-bold sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">หมวดสินค้า / ประเภทงาน</th>
                  <th className="py-2.5 px-3 text-right">วงเงินคุมงบ (Cap)</th>
                  <th className="py-2.5 px-3 text-right text-emerald-700">จ่ายจริง (Actual)</th>
                  <th className="py-2.5 px-3 text-right">งบคงเหลือ / เกินงบ</th>
                  <th className="py-2.5 px-3 text-center w-36">สัดส่วนการใช้วงเงิน</th>
                  <th className="py-2.5 px-3 text-center">สถานะ</th>
                  <th className="py-2.5 px-3 text-center">ดูรายการบิล</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-slate-800 bg-white">
                {categoryAnalysis.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                      ยังไม่มีการตั้งวงเงินคุมงบประมาณรายหมวดในโครงการนี้
                    </td>
                  </tr>
                ) : (
                  Object.entries(groupedAnalysis).map(([groupTitle, groupItems]) => (
                    <tbody key={groupTitle} className="divide-y divide-slate-100">
                      {/* Group Header Row */}
                      <tr className="bg-slate-100/90 font-bold text-slate-800 border-t border-b border-slate-200">
                        <td colSpan={7} className="py-2 px-3 flex items-center justify-between text-xs bg-slate-100/80">
                          <div className="flex items-center gap-2">
                            {getGroupIcon(groupTitle)}
                            <span className="text-slate-900 font-extrabold">{groupTitle}</span>
                            <span className="text-[10px] font-mono text-slate-500 font-normal">({groupItems.length} รายการ)</span>
                          </div>
                          <span className="text-[11px] font-mono text-emerald-700 font-extrabold">
                            รวมเบิกจ่ายหมวดนี้: {money(groupItems.reduce((s, i) => s + i.actualSpent, 0))} ฿
                          </span>
                        </td>
                      </tr>

                      {/* Group Items */}
                      {groupItems.map((cat, idx) => (
                        <tr key={`${cat.field}-${idx}`} className="hover:bg-slate-50 transition">
                          {/* Category Label */}
                          <td className="py-2.5 px-3 font-semibold text-slate-800 flex items-center gap-1.5 pl-6">
                            <span>{cat.icon || "📦"}</span> {cat.label}
                          </td>

                          {/* Budget Cap */}
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            {cat.budgetCap > 0 ? `${money(cat.budgetCap)} ฿` : "-"}
                          </td>

                          {/* Actual Spend */}
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                            {cat.actualSpent > 0 ? `${money(cat.actualSpent)} ฿` : "0 ฿"}
                          </td>

                          {/* Remaining / Over */}
                          <td
                            className={`py-2.5 px-3 text-right font-mono font-bold ${
                              cat.isOver ? "text-rose-600 font-extrabold" : cat.remaining > 0 ? "text-cyan-700" : "text-slate-400"
                            }`}
                          >
                            {cat.budgetCap > 0
                              ? cat.remaining < 0
                                ? `เกินงบ ${money(Math.abs(cat.remaining))} ฿`
                                : `เหลือ ${money(cat.remaining)} ฿`
                              : "-"}
                          </td>

                          {/* Progress Bar */}
                          <td className="py-2.5 px-3 align-middle">
                            {cat.budgetCap > 0 ? (
                              <div className="space-y-1">
                                <div className="flex justify-between text-[10px] text-slate-500 font-mono font-bold">
                                  <span>{cat.usagePercent}%</span>
                                </div>
                                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden p-0.5 border border-slate-200">
                                  <div
                                    className={`h-full rounded-full transition-all duration-300 ${
                                      cat.isOver ? "bg-rose-500" : cat.isWarning ? "bg-amber-400" : "bg-emerald-500"
                                    }`}
                                    style={{ width: `${Math.min(100, cat.usagePercent)}%` }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 block text-center">-</span>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="py-2.5 px-3 text-center">
                            {cat.budgetCap === 0 ? (
                              <span className="text-[10px] font-medium text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">ทั่วไป</span>
                            ) : cat.isOver ? (
                              <span className="text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full flex items-center justify-center gap-1">
                                <AlertCircle size={11} /> เกินงบ
                              </span>
                            ) : cat.isWarning ? (
                              <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full flex items-center justify-center gap-1">
                                <AlertTriangle size={11} /> เฝ้าระวัง
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center justify-center gap-1">
                                <CheckCircle2 size={11} /> ปกติ
                              </span>
                            )}
                          </td>

                          {/* Drilldown Action */}
                          <td className="py-2.5 px-3 text-center">
                            {cat.matchingBills.length > 0 ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setDrilldownModal({
                                    title: `รายการบิลเบิกจ่ายหมวด "${cat.label}" (${cat.matchingBills.length} รายการ)`,
                                    rows: cat.matchingBills
                                  })
                                }
                                className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold rounded-md border border-slate-200 shadow-2xs transition flex items-center justify-center gap-1 mx-auto cursor-pointer"
                              >
                                <span>{cat.matchingBills.length} บิล</span>
                                <ChevronRight size={12} />
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. DRILLDOWN BILLS MODAL */}
      {drilldownModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-slate-800 rounded-xl max-w-4xl w-full max-h-[85vh] flex flex-col border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in duration-150">
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

            <div className="p-3 overflow-y-auto flex-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="py-2 px-2.5">ลำดับ</th>
                    <th className="py-2 px-2.5">ร้านค้า/ผู้รับเหมา</th>
                    <th className="py-2 px-2.5">รายละเอียดรายการ</th>
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

            <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs font-semibold">
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
