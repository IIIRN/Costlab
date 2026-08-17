"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  Eye,
  FolderKanban,
  LayoutGrid,
  List,
  Search,
  User,
  Users,
  Wallet,
} from "lucide-react";
import { money, toNumber } from "@/lib/numbers";
import type { SheetRow } from "@/lib/types";

type WorkStatusDashboardClientProps = {
  projects: SheetRow[];
};

export function WorkStatusDashboardClient({ projects }: WorkStatusDashboardClientProps) {
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get("search") || "";

  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const [filterTab, setFilterTab] = useState<"all" | "active" | "complete">("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  useEffect(() => {
    setSearchTerm(urlSearch);
  }, [urlSearch]);

  const filteredProjects = useMemo(() => {
    let list = projects;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter((p) =>
        Object.values(p).some((val) => String(val || "").toLowerCase().includes(q))
      );
    }
    return list;
  }, [projects, searchTerm]);

  const activeProjects = useMemo(() => {
    return filteredProjects.filter((p) => {
      const c = String(p.color || "").toLowerCase().trim();
      return c !== "black" && c !== "เสร็จแล้ว" && c !== "completed";
    });
  }, [filteredProjects]);

  const completeProjects = useMemo(() => {
    return filteredProjects.filter((p) => {
      const c = String(p.color || "").toLowerCase().trim();
      return c === "black" || c === "เสร็จแล้ว" || c === "completed";
    });
  }, [filteredProjects]);

  const displayList = useMemo(() => {
    if (filterTab === "active") return activeProjects;
    if (filterTab === "complete") return completeProjects;
    return filteredProjects;
  }, [filterTab, activeProjects, completeProjects, filteredProjects]);

  // Overall financial statistics
  const totalBudget = useMemo(() => {
    return projects.reduce((sum, p) => sum + toNumber(p["งบไม่เกิน"]), 0);
  }, [projects]);

  const totalSpent = useMemo(() => {
    return projects.reduce((sum, p) => sum + toNumber(p["รวม ALL"]), 0);
  }, [projects]);

  return (
    <div className="w-full flex flex-col gap-5 p-4 sm:p-6 max-w-[1600px] mx-auto font-sans">
      {/* 1. EXECUTIVE SUMMARY STRIP */}
      <div className="bg-white rounded-lg p-4 border border-slate-200/90 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Summary Metrics */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2 pr-4 border-r border-slate-200">
            <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <FolderKanban size={18} />
            </span>
            <div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase">โครงการทั้งหมด</div>
              <div className="text-base font-bold text-slate-900">{projects.length} รายการ</div>
            </div>
          </div>

          <div className="flex items-center gap-2 pr-4 border-r border-slate-200">
            <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Clock3 size={18} />
            </span>
            <div>
              <div className="text-[10px] text-emerald-600 font-semibold uppercase">กำลังทำอยู่</div>
              <div className="text-base font-bold text-emerald-700">{activeProjects.length} รายการ</div>
            </div>
          </div>

          <div className="flex items-center gap-2 pr-4 border-r border-slate-200">
            <span className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
              <CheckCircle2 size={18} />
            </span>
            <div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase">เสร็จสิ้นแล้ว</div>
              <div className="text-base font-bold text-slate-700">{completeProjects.length} รายการ</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Wallet size={18} />
            </span>
            <div>
              <div className="text-[10px] text-indigo-600 font-semibold uppercase">ยอดเบิกจ่ายรวม / งบรวม</div>
              <div className="text-base font-bold text-slate-900">
                {money(totalSpent)} <span className="text-xs font-normal text-slate-400">/ {money(totalBudget)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: View Switcher (Table vs Grid) */}
        <div className="flex items-center gap-2 self-start lg:self-auto">
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/60">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "table"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <List size={15} />
              <span>มุมมองตาราง</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "grid"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <LayoutGrid size={15} />
              <span>มุมมองการ์ด</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. FILTER TABS & SEARCH TOOLBAR */}
      <div className="bg-white rounded-lg p-3.5 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterTab("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterTab === "all"
                ? "bg-slate-900 text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            ทั้งหมด ({filteredProjects.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("active")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterTab === "active"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "text-emerald-700 hover:bg-emerald-50"
            }`}
          >
            🟢 กำลังทำอยู่ ({activeProjects.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("complete")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterTab === "complete"
                ? "bg-slate-700 text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            🏁 เสร็จแล้ว ({completeProjects.length})
          </button>
        </div>

        {/* Live Search Input Box */}
        <div className="relative flex items-center w-full sm:w-80">
          <Search size={15} className="absolute left-3 text-slate-400 pointer-events-none z-10" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ Project, ID, ลูกค้า, ผู้รับผิดชอบ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: "36px" }}
            className="w-full bg-slate-100/80 hover:bg-slate-100 focus:bg-white text-slate-800 text-xs font-medium rounded-xl border border-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* 3. MAIN WORKFLOW CONTENT (TABLE OR GRID) */}
      {viewMode === "table" ? (
        /* PROFESSIONAL HIGH-DENSITY WORK TABLE */
        <div className="bg-white rounded-lg border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 border-collapse">
              <thead>
                <tr className="bg-slate-100/90 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-3.5 w-24">รหัส (ID)</th>
                  <th className="py-3 px-3.5 min-w-[220px]">ชื่อโครงการ (Project)</th>
                  <th className="py-3 px-3.5">ลูกค้า</th>
                  <th className="py-3 px-3.5">บริษัท</th>
                  <th className="py-3 px-3.5">ผู้รับผิดชอบ</th>
                  <th className="py-3 px-3.5 w-28 text-center">สถานะ</th>
                  <th className="py-3 px-3.5 text-right">ยอดเบิกจ่ายรวม</th>
                  <th className="py-3 px-3.5 text-right">งบไม่เกิน</th>
                  <th className="py-3 px-3.5 text-right">คงเหลือ</th>
                  <th className="py-3 px-3.5 w-16 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayList.map((p) => {
                  const id = String(p["ID Project"] || p.id || "-");
                  const name = String(p["ชื่อ Project"] || p.name || "-");
                  const customer = String(p["ชื่อลูกค้า"] || p.customer_name || "-");
                  const company = String(p["บริษัท"] || p.company || "-");
                  const owner = String(p["รับผิดชอบ"] || p.responsible_person || "-");

                  const spent = toNumber(p["รวม ALL"]);
                  const budget = toNumber(p["งบไม่เกิน"]);
                  const remaining = budget - spent;

                  const rawColor = String(p.color || "").toLowerCase().trim();
                  const isComplete = rawColor === "black" || rawColor === "เสร็จแล้ว" || rawColor === "completed";
                  const isRed = rawColor === "red";

                  return (
                    <tr key={id} className="hover:bg-slate-50/80 transition-colors group">
                      {/* Project ID */}
                      <td className="py-2.5 px-3.5 font-mono font-bold text-slate-800">
                        #{id}
                      </td>

                      {/* Project Name */}
                      <td className="py-2.5 px-3.5 font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        <Link href={`/work-status/${encodeURIComponent(id)}`} className="hover:underline">
                          {name}
                        </Link>
                      </td>

                      {/* Customer */}
                      <td className="py-2.5 px-3.5 text-slate-600">{customer}</td>

                      {/* Company */}
                      <td className="py-2.5 px-3.5 text-slate-600">{company}</td>

                      {/* Owner */}
                      <td className="py-2.5 px-3.5 text-slate-600">{owner}</td>

                      {/* Status Tag */}
                      <td className="py-2.5 px-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${
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
                          {isComplete ? "เสร็จแล้ว" : isRed ? "เร่งด่วน" : "กำลังทำ"}
                        </span>
                      </td>

                      {/* Spent */}
                      <td className="py-2.5 px-3.5 text-right font-bold text-slate-900">
                        {money(spent)}
                      </td>

                      {/* Budget */}
                      <td className="py-2.5 px-3.5 text-right font-medium text-slate-500">
                        {money(budget)}
                      </td>

                      {/* Remaining */}
                      <td
                        className={`py-2.5 px-3.5 text-right font-bold ${
                          remaining < 0 ? "text-rose-600 font-bold" : "text-emerald-700"
                        }`}
                      >
                        {money(remaining)}
                      </td>

                      {/* Action detail link */}
                      <td className="py-2.5 px-3.5 text-center">
                        <Link
                          href={`/work-status/${encodeURIComponent(id)}`}
                          className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-indigo-600 text-slate-600 group-hover:text-white flex items-center justify-center transition mx-auto shadow-2xs"
                          title="ดูรายละเอียดโครงการ"
                        >
                          <Eye size={15} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}

                {!displayList.length && (
                  <tr>
                    <td colSpan={10} className="py-10 text-center text-slate-400">
                      ไม่พบโครงการที่ค้นหา
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* COMPACT CARD GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayList.map((p) => {
            const id = String(p["ID Project"] || p.id || "-");
            const name = String(p["ชื่อ Project"] || p.name || "-");
            const customer = String(p["ชื่อลูกค้า"] || p.customer_name || "-");
            const company = String(p["บริษัท"] || p.company || "-");
            const owner = String(p["รับผิดชอบ"] || p.responsible_person || "-");

            const spent = toNumber(p["รวม ALL"]);
            const budget = toNumber(p["งบไม่เกิน"]);

            const rawColor = String(p.color || "").toLowerCase().trim();
            const isComplete = rawColor === "black" || rawColor === "เสร็จแล้ว" || rawColor === "completed";
            const isRed = rawColor === "red";

            return (
              <Link
                key={id}
                href={`/work-status/${encodeURIComponent(id)}`}
                className="bg-white rounded-lg p-4 border border-slate-200/90 hover:border-indigo-400 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between gap-3 group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${
                      isComplete
                        ? "bg-slate-100 text-slate-700"
                        : isRed
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    }`}
                  >
                    {isComplete ? "เสร็จแล้ว" : isRed ? "เร่งด่วน" : "กำลังทำ"}
                  </span>
                  <span className="font-mono text-[11px] font-bold text-slate-400">#{id}</span>
                </div>

                <h3 className="font-bold text-slate-900 text-xs group-hover:text-indigo-600 transition-colors line-clamp-2">
                  {name}
                </h3>

                <div className="text-[11px] text-slate-500 space-y-1 border-t border-slate-100 pt-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">ลูกค้า/บริษัท</span>
                    <span className="font-semibold text-slate-800 truncate max-w-[140px]">{customer} ({company})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">ผู้รับผิดชอบ</span>
                    <span className="font-semibold text-slate-800">{owner}</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl flex items-center justify-between text-xs mt-1">
                  <span className="text-slate-400 text-[10px]">ยอดเบิกจ่าย</span>
                  <span className="font-bold text-slate-900">{money(spent)}</span>
                </div>
              </Link>
            );
          })}
          {!displayList.length && (
            <div className="col-span-full bg-white rounded-lg p-8 text-center text-slate-400 border border-slate-200/80 text-xs">
              ไม่พบโครงการที่ค้นหา
            </div>
          )}
        </div>
      )}
    </div>
  );
}

