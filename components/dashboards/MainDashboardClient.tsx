"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  DollarSign,
  FileCheck,
  Filter,
  FolderKanban,
  Layers,
  PieChart,
  Receipt,
  RotateCw,
  TrendingUp,
  UserCheck,
  Wallet,
} from "lucide-react";
import { money, toNumber } from "@/lib/numbers";
import type { SheetRow } from "@/lib/types";

type MainDashboardClientProps = {
  initialDataRows: SheetRow[];
  initialProjectRows: SheetRow[];
};

type Preset = "today" | "yesterday" | "month" | "previousMonth" | "all" | "custom";

const COST_COLUMNS = ["ค่าของ", "ค่าแรง", "พนักงาน", "น้ำมัน", "ซ่อมรถ", "เครื่องจักร", "เครื่องมือ", "อื่นๆ"];

export function MainDashboardClient({ initialDataRows, initialProjectRows }: MainDashboardClientProps) {
  const [dataRows, setDataRows] = useState(initialDataRows);
  const [projectRows, setProjectRows] = useState(initialProjectRows);
  const [preset, setPreset] = useState<Preset>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"vat" | "natural" | "equipment">("vat");

  const range = useMemo(() => getRange(preset, from, to), [preset, from, to]);
  const filteredDataRows = useMemo(() => filterRowsByDate(dataRows, range, ["ว/ด/ป", "วันที่"]), [dataRows, range]);
  const filteredProjectRows = useMemo(() => filterRowsByDate(projectRows, range, ["วันที่"]), [projectRows, range]);
  const summary = useMemo(() => buildMainSummary(filteredDataRows, filteredProjectRows), [filteredDataRows, filteredProjectRows]);

  async function refreshData() {
    setRefreshing(true);
    try {
      const response = await fetch("/api/dashboard?refresh=1", { cache: "no-store" });
      if (!response.ok) throw new Error("Refresh failed");
      const payload = await response.json();
      setDataRows(payload.dataRows || []);
      setProjectRows(payload.projectRows || []);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="w-full flex flex-col gap-4 p-3 sm:p-5 max-w-[1600px] mx-auto font-sans text-xs text-slate-800">
      {/* 1. EXECUTIVE FILTER & DATE RANGE BAR */}
      <div className="bg-white rounded-md p-3 border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Date Presets */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] font-bold text-slate-500 mr-1 uppercase">ช่วงเวลา:</span>
          {(
            [
              ["all", "ทั้งหมด"],
              ["today", "วันนี้"],
              ["yesterday", "เมื่อวาน"],
              ["month", "เดือนนี้"],
              ["previousMonth", "เดือนก่อน"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setPreset(key as Preset)}
              className={`px-3 py-1 rounded-md font-semibold transition cursor-pointer text-xs ${
                preset === key
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Custom Range & Refresh */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">เริ่ม:</span>
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPreset("custom");
              }}
              className="bg-white text-slate-800 font-medium px-2 py-1 rounded border border-slate-300 focus:outline-none focus:border-slate-500 text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">ถึง:</span>
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPreset("custom");
              }}
              className="bg-white text-slate-800 font-medium px-2 py-1 rounded border border-slate-300 focus:outline-none focus:border-slate-500 text-xs"
            />
          </div>

          <button
            type="button"
            onClick={refreshData}
            disabled={refreshing}
            className="flex items-center gap-1 px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded border border-slate-300 transition cursor-pointer text-xs"
          >
            <RotateCw size={13} className={refreshing ? "animate-spin" : ""} />
            <span>{refreshing ? "รีเฟรช..." : "รีเฟรช"}</span>
          </button>
        </div>
      </div>

      {/* 2. EXECUTIVE METRICS STAT GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Expenses */}
        <div className="bg-white rounded-md p-4 border border-slate-200 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">ยอดค่าใช้จ่ายรวม</span>
            <span className="w-7 h-7 rounded bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold">
              <Wallet size={15} />
            </span>
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">{money(summary.total)}</div>
            <div className="text-xs text-slate-500 font-normal mt-0.5">รวมทั้งสิ้น {summary.dataCount} บิล</div>
          </div>
        </div>

        {/* Revenue */}
        <div className="bg-white rounded-md p-4 border border-slate-200 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">ยอดงานรวมภาษี (Revenue)</span>
            <span className="w-7 h-7 rounded bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold">
              <TrendingUp size={15} />
            </span>
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">{money(summary.revenue)}</div>
            <div className="text-xs text-slate-500 font-normal mt-0.5">รวม {summary.projectCount} โครงการ</div>
          </div>
        </div>

        {/* Project Status */}
        <div className="bg-white rounded-md p-4 border border-slate-200 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">สถานะโครงการ</span>
            <span className="w-7 h-7 rounded bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold">
              <FolderKanban size={15} />
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div>
              <div className="text-[11px] text-slate-500 font-medium">กำลังทำอยู่</div>
              <div className="text-lg font-bold text-slate-900">{summary.activeProjects}</div>
            </div>
            <div className="h-7 w-px bg-slate-200" />
            <div>
              <div className="text-[11px] text-slate-500 font-medium">เสร็จสิ้นแล้ว</div>
              <div className="text-lg font-bold text-slate-700">{summary.completeProjects}</div>
            </div>
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-white rounded-md p-4 border border-slate-200 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">กำไรสุทธิ (Net Profit)</span>
            <span className="w-7 h-7 rounded bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold">
              <DollarSign size={15} />
            </span>
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">{money(summary.profit)}</div>
            <div className="space-y-1 mt-1">
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200">
                <div
                  className="h-full bg-slate-800 transition-all duration-500"
                  style={{ width: `${Math.max(0, Math.min(100, summary.profitPercent))}%` }}
                />
              </div>
              <div className="text-[10px] font-mono text-slate-500 text-right">
                อัตรากำไร: {summary.profitPercent.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. STATUS COUNTERS STRIP */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="bg-white p-3 rounded-md border border-slate-200 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold shrink-0">
            <FileCheck size={14} />
          </div>
          <div className="min-w-0">
            <div className="text-slate-500 text-[10px] font-semibold">ตาม VAT (รอได้บิล)</div>
            <div className="font-bold text-slate-900 truncate">{summary.vatCount} บิล</div>
          </div>
        </div>

        <div className="bg-white p-3 rounded-md border border-slate-200 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold shrink-0">
            <UserCheck size={14} />
          </div>
          <div className="min-w-0">
            <div className="text-slate-500 text-[10px] font-semibold">ตาม หัก 3% บุคคล</div>
            <div className="font-bold text-slate-900 truncate">{summary.naturalDeductCount} บิล</div>
          </div>
        </div>

        <div className="bg-white p-3 rounded-md border border-slate-200 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold shrink-0">
            <Building2 size={14} />
          </div>
          <div className="min-w-0">
            <div className="text-slate-500 text-[10px] font-semibold">ตาม หัก 3% บริษัท</div>
            <div className="font-bold text-slate-900 truncate">{summary.companyDeductCount} บิล</div>
          </div>
        </div>

        <div className="bg-white p-3 rounded-md border border-slate-200 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold shrink-0">
            <Clock3 size={14} />
          </div>
          <div className="min-w-0">
            <div className="text-slate-500 text-[10px] font-semibold">ตาม เครดิต (รอจ่าย)</div>
            <div className="font-bold text-slate-900 truncate">{summary.creditCount} บิล</div>
          </div>
        </div>
      </div>

      {/* 4. TABBED BREAKDOWN TABLES */}
      <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
        {/* Tabs Bar */}
        <div className="p-3 border-b border-slate-200 flex flex-wrap items-center gap-2 bg-white">
          <button
            type="button"
            onClick={() => setActiveTab("vat")}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
              activeTab === "vat"
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
            }`}
          >
            ค่าแรงบริษัท & ภาษี VAT
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("natural")}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
              activeTab === "natural"
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
            }`}
          >
            ค่าแรงบุคคล & ดำเนินงาน
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("equipment")}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
              activeTab === "equipment"
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
            }`}
          >
            เครื่องจักร เครื่องมือ & อื่นๆ
          </button>
        </div>

        {/* Tab 1 Content: VAT & Company Labor */}
        {activeTab === "vat" && (
          <div className="p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              รายงานสรุปค่าใช้จ่าย ค่าแรงบริษัท และภาษี VAT
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200 text-xs">
                    <th className="py-2.5 px-3 border-r border-slate-200">รายการ</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-right">ก่อน VAT (บาท)</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-right">คำนวณ VAT (บาท)</th>
                    <th className="py-2.5 px-3 text-right">ยอดดำเนินการ (บาท)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal">
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-3 border-r border-slate-100 font-bold text-slate-900">ค่าแรง</td>
                    <td className="py-2 px-3 border-r border-slate-100 text-right font-medium">{money(summary.main3.laborBeforeVat)}</td>
                    <td className="py-2 px-3 border-r border-slate-100 text-right font-medium">{money(summary.main3.laborVat)}</td>
                    <td className="py-2 px-3 text-right font-medium">{money(0)}</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-3 border-r border-slate-100 font-bold text-slate-900">ค่าของ</td>
                    <td className="py-2 px-3 border-r border-slate-100 text-right font-medium">{money(summary.main3.materialBeforeVat)}</td>
                    <td className="py-2 px-3 border-r border-slate-100 text-right font-medium">{money(summary.main3.materialVat)}</td>
                    <td className="py-2 px-3 text-right font-medium">{money(summary.main4.operatingMaterial)}</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-3 border-r border-slate-100 font-bold text-slate-900">น้ำมัน</td>
                    <td className="py-2 px-3 border-r border-slate-100 text-right font-medium">{money(summary.main3.fuelBeforeVat)}</td>
                    <td className="py-2 px-3 border-r border-slate-100 text-right font-medium">{money(summary.main3.fuelVat)}</td>
                    <td className="py-2 px-3 text-right font-medium">{money(0)}</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-3 border-r border-slate-100 font-bold text-slate-900">ซ่อมรถ</td>
                    <td className="py-2 px-3 border-r border-slate-100 text-right font-medium">{money(summary.main3.repairBeforeVat)}</td>
                    <td className="py-2 px-3 border-r border-slate-100 text-right font-medium">{money(summary.main3.repairVat)}</td>
                    <td className="py-2 px-3 text-right font-medium">{money(0)}</td>
                  </tr>
                  <tr className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200">
                    <td className="py-2.5 px-3 border-r border-slate-200">รวมทั้งสิ้น</td>
                    <td className="py-2.5 px-3 border-r border-slate-200 text-right">-</td>
                    <td className="py-2.5 px-3 border-r border-slate-200 text-right text-slate-900 font-extrabold">{money(summary.main3Total)}</td>
                    <td className="py-2.5 px-3 text-right">-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2 Content: Natural Labor & Operating Costs */}
        {activeTab === "natural" && (
          <div className="p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              รายงานสรุปค่าแรงบุคคลธรรมดา และงานดำเนินการ
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200 text-xs">
                    <th className="py-2.5 px-3 border-r border-slate-200">รายการ</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-right">ก่อน VAT (บาท)</th>
                    <th className="py-2.5 px-3 text-right">ยอดดำเนินการ (บาท)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal">
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-3 border-r border-slate-100 font-bold text-slate-900">ค่าแรง</td>
                    <td className="py-2 px-3 border-r border-slate-100 text-right font-medium">{money(summary.main4.naturalLabor)}</td>
                    <td className="py-2 px-3 text-right font-medium">{money(summary.main4.operatingLabor)}</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-3 border-r border-slate-100 font-bold text-slate-900">พนักงาน</td>
                    <td className="py-2 px-3 border-r border-slate-100 text-right font-medium">{money(summary.main4.staff)}</td>
                    <td className="py-2 px-3 text-right font-medium">{money(summary.main4.operatingStaff)}</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-3 border-r border-slate-100 font-bold text-slate-900">ค่าของ</td>
                    <td className="py-2 px-3 border-r border-slate-100 text-right font-medium">{money(summary.main4.material)}</td>
                    <td className="py-2 px-3 text-right font-medium">{money(summary.main4.operatingMaterial)}</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-3 border-r border-slate-100 font-bold text-slate-900">น้ำมัน</td>
                    <td className="py-2 px-3 border-r border-slate-100 text-right font-medium">{money(summary.main4.fuel)}</td>
                    <td className="py-2 px-3 text-right font-medium">{money(summary.main4.operatingFuel)}</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-3 border-r border-slate-100 font-bold text-slate-900">ซ่อมรถ</td>
                    <td className="py-2 px-3 border-r border-slate-100 text-right font-medium">{money(summary.main4.repair)}</td>
                    <td className="py-2 px-3 text-right font-medium">{money(summary.main4.operatingRepair)}</td>
                  </tr>
                  <tr className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200">
                    <td className="py-2.5 px-3 border-r border-slate-200">รวมทั้งสิ้น</td>
                    <td className="py-2.5 px-3 border-r border-slate-200 text-right text-slate-900 font-extrabold">{money(summary.main4Total)}</td>
                    <td className="py-2.5 px-3 text-right">-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3 Content: Machines, Tools & Others */}
        {activeTab === "equipment" && (
          <div className="p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              รายงานสรุปเครื่องจักร เครื่องมือ และหมวดอื่นๆ
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200 text-xs">
                    <th className="py-2.5 px-3 border-r border-slate-200">รายการ</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-right">เครื่องจักร (บาท)</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-right">เครื่องมือ (บาท)</th>
                    <th className="py-2.5 px-3 text-right">อื่นๆ (บาท)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal">
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-3 border-r border-slate-100 font-bold text-slate-900">ก่อน VAT</td>
                    <td className="py-2 px-3 border-r border-slate-100 text-right font-medium">{money(summary.main5.machineBeforeVat)}</td>
                    <td className="py-2 px-3 border-r border-slate-100 text-right font-medium">{money(summary.main5.toolBeforeVat)}</td>
                    <td className="py-2 px-3 text-right font-medium">{money(summary.main5.otherBeforeVat)}</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-3 border-r border-slate-100 font-bold text-slate-900">คำนวณ VAT (บาท)</td>
                    <td className="py-2 px-3 border-r border-slate-100 text-right font-medium">{money(summary.main5.machineVat)}</td>
                    <td className="py-2 px-3 border-r border-slate-100 text-right font-medium">{money(summary.main5.toolVat)}</td>
                    <td className="py-2 px-3 text-right font-medium">{money(summary.main5.otherVat)}</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-3 border-r border-slate-100 font-bold text-slate-900">ไม่มี VAT</td>
                    <td className="py-2 px-3 border-r border-slate-100 text-right font-medium">{money(summary.main5.machineNoVat)}</td>
                    <td className="py-2 px-3 border-r border-slate-100 text-right font-medium">{money(summary.main5.toolNoVat)}</td>
                    <td className="py-2 px-3 text-right font-medium">{money(summary.main5.otherNoVat)}</td>
                  </tr>
                  <tr className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200">
                    <td className="py-2.5 px-3 border-r border-slate-200">รวมก่อน VAT</td>
                    <td className="py-2.5 px-3 text-right text-slate-900 font-extrabold" colSpan={3}>
                      {money(summary.main5BeforeVatTotal)}
                    </td>
                  </tr>
                  <tr className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200">
                    <td className="py-2.5 px-3 border-r border-slate-200">รวมไม่มี VAT</td>
                    <td className="py-2.5 px-3 text-right text-slate-900 font-extrabold" colSpan={3}>
                      {money(summary.main5NoVatTotal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getBillAmount(row: SheetRow): number {
  if (!row) return 0;
  const direct = toNumber(row["ยอดเงิน"]);
  if (direct > 0) return direct;
  return COST_COLUMNS.reduce((sum, col) => sum + toNumber(row[col]), 0);
}

function getCategoryAmount(row: SheetRow, categoryKeyword: string): number {
  if (!row) return 0;
  const legacyVal = toNumber(row[categoryKeyword]);
  if (legacyVal > 0) return legacyVal;

  const categoryType = String(row["ประเภท"] || "").toLowerCase();
  if (categoryType.includes(categoryKeyword.toLowerCase())) {
    return getBillAmount(row);
  }

  return 0;
}

function sumRowsTotal(rows: SheetRow[]): number {
  return rows.reduce((sum, row) => sum + getBillAmount(row), 0);
}

function sumCategoryRows(rows: SheetRow[], categoryKeyword: string): number {
  return rows.reduce((sum, row) => sum + getCategoryAmount(row, categoryKeyword), 0);
}

function buildMainSummary(dataRows: SheetRow[], projectRows: SheetRow[]) {
  const total = sumRowsTotal(dataRows);
  const vatCount = dataRows.filter(row => (hasValue(row.vat) || toNumber(row.vat) > 0) && !hasValue(row["วันได้บิล"])).length;
  const naturalDeductCount = dataRows.filter(row => (hasValue(row["หัก"]) || toNumber(row["หัก"]) > 0) && !hasValue(row["วันออก 3%"]) && !String(row["statusค่าแรง"] || "").includes("บริษัท")).length;
  const companyDeductCount = dataRows.filter(row => (hasValue(row["หัก"]) || toNumber(row["หัก"]) > 0) && !hasValue(row["วันออก 3%"]) && String(row["statusค่าแรง"] || "").includes("บริษัท")).length;
  const creditCount = dataRows.filter(row => hasValue(row["เครดิต"]) && !hasValue(row["วันจ่าย"])).length;
  const activeProjects = projectRows.filter(row => lower(row.color) === "red" || lower(row.color) === "green").length;
  const completeProjects = projectRows.filter(row => lower(row.color) === "black").length;

  const companyRows = dataRows.filter(row => String(row["statusค่าแรง"] || "").includes("บริษัท"));
  const naturalRows = dataRows.filter(row => !String(row["statusค่าแรง"] || "").includes("บริษัท"));
  const vatRows = dataRows.filter(row => hasValue(row.vat) || toNumber(row.vat) > 0);
  const noVatRows = dataRows.filter(row => !hasValue(row.vat) && toNumber(row.vat) === 0);
  const operatingRows = dataRows.filter(row => String(row["ชื่อ Project"] || "").includes("ดำเนินการ"));

  const main3 = {
    laborBeforeVat: sumCategoryRows(companyRows, "ค่าแรง"),
    materialBeforeVat: sumCategoryRows(vatRows, "ค่าของ"),
    fuelBeforeVat: sumCategoryRows(vatRows, "น้ำมัน"),
    repairBeforeVat: sumCategoryRows(vatRows, "ซ่อมรถ"),
    laborVat: sumCategoryRows(companyRows, "ค่าแรง") * 100 / 103,
    materialVat: sumCategoryRows(vatRows, "ค่าของ") * 100 / 107,
    fuelVat: sumCategoryRows(vatRows, "น้ำมัน") * 100 / 107,
    repairVat: sumCategoryRows(vatRows, "ซ่อมรถ") * 100 / 107
  };
  const main3Total = main3.laborVat + main3.materialVat + main3.fuelVat + main3.repairVat;

  const main4 = {
    naturalLabor: sumCategoryRows(naturalRows, "ค่าแรง"),
    staff: sumCategoryRows(dataRows, "พนักงาน"),
    material: sumCategoryRows(noVatRows, "ค่าของ"),
    fuel: sumCategoryRows(noVatRows, "น้ำมัน"),
    repair: sumCategoryRows(noVatRows, "ซ่อมรถ"),
    operatingLabor: sumCategoryRows(operatingRows, "ค่าแรง"),
    operatingStaff: sumCategoryRows(operatingRows, "พนักงาน"),
    operatingMaterial: sumCategoryRows(operatingRows, "ค่าของ"),
    operatingFuel: sumCategoryRows(operatingRows, "น้ำมัน"),
    operatingRepair: sumCategoryRows(operatingRows, "ซ่อมรถ")
  };
  const main4Total = main4.naturalLabor + main4.staff + main4.material + main4.fuel + main4.repair;

  const main5 = {
    machineBeforeVat: sumCategoryRows(vatRows, "เครื่องจักร"),
    toolBeforeVat: sumCategoryRows(vatRows, "เครื่องมือ"),
    otherBeforeVat: sumCategoryRows(vatRows, "อื่นๆ"),
    machineVat: sumCategoryRows(vatRows, "เครื่องจักร") * 100 / 107,
    toolVat: sumCategoryRows(vatRows, "เครื่องมือ") * 100 / 107,
    otherVat: sumCategoryRows(vatRows, "อื่นๆ") * 100 / 107,
    machineNoVat: sumCategoryRows(noVatRows, "เครื่องจักร"),
    toolNoVat: sumCategoryRows(noVatRows, "เครื่องมือ"),
    otherNoVat: sumCategoryRows(noVatRows, "อื่นๆ")
  };
  const main5BeforeVatTotal = main5.machineVat + main5.toolVat + main5.otherVat;
  const main5NoVatTotal = main5.machineNoVat + main5.toolNoVat + main5.otherNoVat;

  const revenue = sumColumns(projectRows, ["ยอดรวม vat", "ยอดงาน"]);
  const investment = total;
  const operating = sumRowsTotal(operatingRows);
  const profit = revenue - investment;
  const profitPercent = revenue > 0 ? (profit / revenue) * 100 : 0;

  return {
    filterLabel: "ข้อมูลทั้งหมด",
    dataCount: dataRows.length,
    projectCount: projectRows.length,
    total,
    vatCount,
    naturalDeductCount,
    companyDeductCount,
    creditCount,
    activeProjects,
    completeProjects,
    revenue,
    investment,
    operating,
    profit,
    profitPercent,
    main3,
    main3Total,
    main4,
    main4Total,
    main5,
    main5BeforeVatTotal,
    main5NoVatTotal
  };
}

function filterRowsByDate(rows: SheetRow[], range: { from?: Date; to?: Date } | null, dateColumns: string[]) {
  if (!range || (!range.from && !range.to)) return rows;
  return rows.filter(row => {
    const rawDate = firstValue(row, dateColumns);
    const date = parseDateCell(rawDate);
    if (!date) return true;
    if (range.from && date < range.from) return false;
    if (range.to && date > range.to) return false;
    return true;
  });
}

function getRange(preset: Preset, from: string, to: string) {
  if (preset === "all") return null;
  const now = new Date();

  if (preset === "today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { from: start, to: end };
  }

  if (preset === "yesterday") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
    return { from: start, to: end };
  }

  if (preset === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { from: start, to: end };
  }

  if (preset === "previousMonth") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { from: start, to: end };
  }

  const fromDate = parseInputDate(from);
  const toDate = parseInputDate(to);
  if (toDate) toDate.setHours(23, 59, 59, 999);
  return { from: fromDate || undefined, to: toDate || undefined };
}

function parseInputDate(value: string) {
  if (!value) return null;
  const parts = value.split("-");
  if (parts.length !== 3) return null;
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

function parseDateCell(value: unknown) {
  if (!value) return null;
  const text = String(value).trim();
  if (!text) return null;

  const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
  }

  const dmMatch = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmMatch) {
    const day = Number(dmMatch[1]);
    const month = Number(dmMatch[2]) - 1;
    const rawYear = Number(dmMatch[3]);
    const year = rawYear > 2400 ? rawYear - 543 : rawYear;
    return new Date(year, month, day);
  }

  const d = new Date(text);
  return Number.isNaN(d.getTime()) ? null : d;
}

function sumColumns(rows: SheetRow[], columns: string[]) {
  return rows.reduce((sum, row) => sum + columns.reduce((inner, column) => inner + toNumber(row[column]), 0), 0);
}

function firstValue(row: SheetRow, columns: string[]) {
  for (const column of columns) {
    if (hasValue(row[column])) return row[column];
  }
  return "";
}

function hasValue(value: unknown) {
  return value !== null && value !== undefined && value !== "";
}

function lower(value: unknown) {
  return String(value || "").toLowerCase();
}

