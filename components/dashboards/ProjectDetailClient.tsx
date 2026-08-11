"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock3,
  DollarSign,
  FileText,
  FolderKanban,
  Layers,
  MapPin,
  PieChart,
  Receipt,
  User,
  Users,
  Wallet,
} from "lucide-react";
import { DataTable } from "@/components/tables/DataTable";
import { ProjectDetailEditor } from "@/components/ProjectDetailEditor";
import { money, toNumber } from "@/lib/numbers";
import type { SheetRow } from "@/lib/types";

type ProjectDetailClientProps = {
  projectId: string;
  projectName: string;
  hydratedProject: SheetRow;
  customerDisplay?: string;
  companyDisplay?: string;
  totals: {
    workTotal: number;
    totalVat: number;
    budget: number;
    totalAll: number;
    billCount: number;
    remaining: number;
  };
  summaryRows: SheetRow[];
  expenseBreakdown: Record<string, number>;
  detailFields: string[];
  relatedColumns: string[];
  expenseCategories: string[];
};

export function ProjectDetailClient({
  projectId,
  projectName,
  hydratedProject,
  customerDisplay,
  companyDisplay,
  totals,
  summaryRows,
  expenseBreakdown,
  detailFields,
  relatedColumns,
  expenseCategories,
}: ProjectDetailClientProps) {
  const [activeTab, setActiveTab] = useState<"bills" | "expenses" | "edit">("bills");

  const rawColor = String(hydratedProject.color || "").toLowerCase().trim();
  const isComplete = rawColor === "black" || rawColor === "เสร็จแล้ว" || rawColor === "completed";
  const isRed = rawColor === "red";

  // Financial calculations
  const percentUsed = totals.budget > 0 ? Math.min(100, Math.round((totals.totalAll / totals.budget) * 100)) : 0;

  const customer = customerDisplay || String(hydratedProject["ชื่อลูกค้า"] || hydratedProject["ลูกค้า"] || "-");
  const company = companyDisplay || String(hydratedProject["บริษัท"] || hydratedProject["บริษัทรับงาน"] || "-");
  const owner = String(hydratedProject["รับผิดชอบ"] || "-");
  const date = formatDateThai(hydratedProject["วันที่"]);
  const location = String(hydratedProject["สถานที่"] || "-");

  return (
    <div className="w-full flex flex-col gap-5 p-4 sm:p-6 max-w-[1600px] mx-auto font-sans">
      {/* 1. TOP NAVBAR */}
      <div className="flex items-center justify-between gap-4 bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-3">
          <Link
            href="/work-status"
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition"
            title="ย้อนกลับไปหน้าสถานะงาน"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                #{projectId}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-extrabold flex items-center gap-1.5 ${
                  isComplete
                    ? "bg-slate-100 text-slate-700 border border-slate-200"
                    : isRed
                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isComplete ? "bg-slate-600" : isRed ? "bg-rose-600 animate-pulse" : "bg-emerald-600"
                  }`}
                />
                {isComplete ? "เสร็จสิ้นแล้ว" : isRed ? "เร่งด่วน" : "กำลังทำอยู่"}
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">{projectName}</h1>
          </div>
        </div>
      </div>

      {/* 2. TOP SUMMARY GRID (SPLIT 2-COLUMNS: FINANCIAL KPI + PROJECT INFO) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Financial Summary Box */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Wallet size={15} className="text-indigo-600" />
              สรุปงบประมาณและการใช้จ่าย
            </h2>
            <span className="text-xs font-bold text-slate-500">
              บิลทั้งหมด <span className="text-slate-900 font-extrabold">{totals.billCount}</span> รายการ
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <span className="text-[11px] font-medium text-slate-400">งบไม่เกิน (งบประมาณ)</span>
              <div className="text-lg font-extrabold text-indigo-900">{money(totals.budget)}</div>
            </div>

            <div>
              <span className="text-[11px] font-medium text-slate-400">เบิกจ่ายรวม (รวม ALL)</span>
              <div className="text-lg font-extrabold text-emerald-700">{money(totals.totalAll)}</div>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <span className="text-[11px] font-medium text-slate-400">ยอดคงเหลือ</span>
              <div className={`text-lg font-extrabold ${totals.remaining < 0 ? "text-rose-600" : "text-emerald-700"}`}>
                {money(totals.remaining)}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {totals.budget > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <div className="flex justify-between text-xs font-medium text-slate-500">
                <span>ใช้วงเงินไปแล้ว</span>
                <span className="font-extrabold text-slate-900">{percentUsed}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    percentUsed > 90 ? "bg-rose-500" : percentUsed > 75 ? "bg-amber-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${percentUsed}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right: Project Metadata Info Box */}
        <div className="lg:col-span-5 bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-2xs flex flex-col justify-between gap-3 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 text-xs text-slate-400 font-semibold">
            <span>ข้อมูลโครงการ</span>
            <span className="font-mono">ID: #{projectId}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="min-w-0">
              <div className="text-slate-400 text-[10px] flex items-center gap-1 font-semibold">
                <User size={12} className="text-indigo-400 shrink-0" /> ลูกค้า
              </div>
              <div className="font-bold text-slate-100 truncate mt-0.5" title={customer}>{customer}</div>
            </div>

            <div className="min-w-0">
              <div className="text-slate-400 text-[10px] flex items-center gap-1 font-semibold">
                <Building2 size={12} className="text-indigo-400 shrink-0" /> บริษัท
              </div>
              <div className="font-bold text-slate-100 truncate mt-0.5" title={company}>{company}</div>
            </div>

            <div className="min-w-0">
              <div className="text-slate-400 text-[10px] flex items-center gap-1 font-semibold">
                <Users size={12} className="text-indigo-400 shrink-0" /> ผู้รับผิดชอบ
              </div>
              <div className="font-bold text-slate-100 truncate mt-0.5">{owner}</div>
            </div>

            <div className="min-w-0">
              <div className="text-slate-400 text-[10px] flex items-center gap-1 font-semibold">
                <Calendar size={12} className="text-indigo-400 shrink-0" /> วันที่
              </div>
              <div className="font-bold text-slate-100 truncate mt-0.5">{date}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. WORKSPACE TABS NAVBAR */}
      <div className="bg-white rounded-2xl p-2 border border-slate-200/90 shadow-2xs flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("bills")}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "bills" ? "bg-slate-900 text-white shadow-2xs" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Receipt size={15} />
          <span>รายการบิลเบิกจ่าย ({totals.billCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("expenses")}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "expenses" ? "bg-slate-900 text-white shadow-2xs" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Layers size={15} />
          <span>สรุปหมวดหมู่ค่าใช้จ่าย</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("edit")}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "edit" ? "bg-slate-900 text-white shadow-2xs" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <FileText size={15} />
          <span>รายละเอียด & แก้ไขข้อมูล</span>
        </button>
      </div>

      {/* 4. TABBED CONTENT PANELS */}
      {activeTab === "bills" && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
          <DataTable
            columns={relatedColumns}
            rows={summaryRows}
            limit={100}
            title="รายการบิลเบิกจ่ายที่เกี่ยวข้อง"
            subtitle={`ทั้งหมด ${summaryRows.length} รายการ`}
            showSearch
            detailBasePath="/bills"
            detailKeyColumn="ลำดับ"
            cellFormatters={{
              "ว/ด/ป": (v) => formatDateThai(v),
              "วันที่": (v) => formatDateThai(v),
            }}
          />
        </div>
      )}

      {activeTab === "expenses" && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-4">
          <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">
            ยอดสรุปค่าใช้จ่ายจำแนกตามประเภท
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {expenseCategories.map((cat) => {
              const amount = expenseBreakdown[cat] || 0;
              return (
                <div key={cat} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <div className="text-slate-400 font-semibold text-[11px]">{cat}</div>
                  <div className="font-extrabold text-slate-900 text-sm">{money(amount)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "edit" && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs">
          <ProjectDetailEditor
            fields={detailFields}
            project={hydratedProject}
            customerDisplay={customer}
            companyDisplay={company}
          />
        </div>
      )}
    </div>
  );
}

function formatDateThai(value: unknown): string {
  const str = String(value || "").trim();
  if (!str) return "-";
  const m = str.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return str;
}
