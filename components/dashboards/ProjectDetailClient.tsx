"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
    <div className="w-full flex flex-col gap-4 p-4 sm:p-5 max-w-[1400px] mx-auto font-sans text-sm text-slate-800">
      {/* 1. HEADER ROW */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-3">
          <Link
            href="/work-status"
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition"
          >
            <ArrowLeft size={14} />
            <span>รายการสถานะงาน</span>
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-bold text-slate-700">#{projectId}</span>
          <span
            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
              isComplete
                ? "bg-slate-100 text-slate-600 border border-slate-200"
                : isRed
                ? "bg-rose-50 text-rose-700 border border-rose-200"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
            }`}
          >
            {isComplete ? "เสร็จสิ้นแล้ว" : isRed ? "เร่งด่วน" : "กำลังทำอยู่"}
          </span>
        </div>
      </div>

      {/* 2. TITLE & META */}
      <div>
        <h1 className="text-lg font-bold text-slate-900">{projectName}</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          ลูกค้า: <span className="font-semibold text-slate-700">{customer}</span> · บริษัท: <span className="font-semibold text-slate-700">{company}</span> · ผู้รับผิดชอบ: <span className="font-semibold text-slate-700">{owner}</span>
        </p>
      </div>

      {/* 3. FINANCIAL SUMMARY */}
      <div className="grid grid-cols-3 gap-3">
        <div className="border border-slate-200 rounded-md p-3 bg-white">
          <div className="text-[11px] text-slate-400 font-medium mb-1">งบประมาณ</div>
          <div className="text-base font-bold text-slate-900">{money(totals.budget)}</div>
        </div>
        <div className="border border-slate-200 rounded-md p-3 bg-white">
          <div className="text-[11px] text-slate-400 font-medium mb-1">เบิกจ่ายรวม</div>
          <div className="text-base font-bold text-indigo-700">{money(totals.totalAll)}</div>
          {totals.budget > 0 && (
            <div className="mt-1.5 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  percentUsed > 90 ? "bg-rose-500" : percentUsed > 75 ? "bg-amber-500" : "bg-emerald-500"
                }`}
                style={{ width: `${percentUsed}%` }}
              />
            </div>
          )}
        </div>
        <div className="border border-slate-200 rounded-md p-3 bg-white">
          <div className="text-[11px] text-slate-400 font-medium mb-1">ยอดคงเหลือ</div>
          <div className={`text-base font-bold ${totals.remaining < 0 ? "text-rose-600" : "text-emerald-700"}`}>
            {money(totals.remaining)}
          </div>
        </div>
      </div>

      {/* 4. WORKSPACE TABS */}
      <div className="flex items-center gap-1 border-b border-slate-200 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab("bills")}
          className={`px-3 py-2 border-b-2 transition ${
            activeTab === "bills"
              ? "border-slate-900 text-slate-900 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          รายการบิลเบิกจ่าย ({totals.billCount})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("expenses")}
          className={`px-3 py-2 border-b-2 transition ${
            activeTab === "expenses"
              ? "border-slate-900 text-slate-900 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          สรุปหมวดหมู่ค่าใช้จ่าย
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("edit")}
          className={`px-3 py-2 border-b-2 transition ${
            activeTab === "edit"
              ? "border-slate-900 text-slate-900 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          รายละเอียด & แก้ไขข้อมูล
        </button>
      </div>

      {/* 5. TABBED CONTENT PANELS */}
      {activeTab === "bills" && (
        <div className="border border-slate-200 rounded-md bg-white overflow-hidden">
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
        <div className="border border-slate-200 rounded-md bg-white overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-200 bg-slate-50">
            <h2 className="text-xs font-bold text-slate-700">ยอดสรุปค่าใช้จ่ายจำแนกตามประเภท</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 text-xs">
            {expenseCategories.map((cat) => {
              const amount = expenseBreakdown[cat] || 0;
              return (
                <div key={cat} className="p-3 bg-slate-50 rounded-md border border-slate-200">
                  <div className="text-slate-400 font-medium text-[11px] mb-0.5">{cat}</div>
                  <div className="font-bold text-slate-900 text-sm">{money(amount)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "edit" && (
        <div className="border border-slate-200 rounded-md bg-white p-4">
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

