import React from "react";
import {
  Loader2,
  Filter,
  Search,
  Download,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  Table as TableIcon,
  TrendingUp,
  CreditCard,
  Building2,
  Clock,
  Layers
} from "lucide-react";

export function RealHeaderShell({ title, subtitle, actionLabel, onAction }: { title: string; subtitle: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200/80">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          {title}
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">{subtitle}</p>
      </div>

      <div className="flex items-center gap-2">
        <button disabled className="px-3.5 py-2 bg-white border border-slate-200 text-slate-400 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 opacity-60">
          <RefreshCw size={14} className="animate-spin text-emerald-600" />
          <span>กำลังซิงค์...</span>
        </button>
        {actionLabel && (
          <button disabled className="px-3.5 py-2 bg-emerald-600/60 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-not-allowed">
            <Plus size={14} />
            <span>{actionLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
}

export function RealKpiCardsShell({ cards }: { cards: Array<{ label: string; value: string; subtext: string; icon: any; color?: string }> }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${cards.length} gap-4 mb-6`}>
      {cards.map((c, i) => {
        const IconComponent = c.icon;
        return (
          <div key={i} className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 block">{c.label}</span>
              <div className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <span>{c.value}</span>
                <Loader2 size={14} className="animate-spin text-emerald-600/70" />
              </div>
              <span className="text-[11px] text-slate-400 font-medium block">{c.subtext}</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-600">
              <IconComponent size={20} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function RealTableShell({ title, columns, rowPlaceholderCount = 5 }: { title: string; columns: string[]; rowPlaceholderCount?: number }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
      {/* Real Filter Controls Bar */}
      <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              disabled
              type="text"
              placeholder="ค้นหาข้อมูล..."
              className="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-400 font-medium focus:outline-none cursor-not-allowed opacity-75"
            />
          </div>
          <button disabled className="px-3 py-1.5 bg-white border border-slate-200 text-slate-400 rounded-xl text-xs font-bold flex items-center gap-1.5 opacity-75">
            <Filter size={13} />
            <span>กรอง</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100/80 flex items-center gap-1.5">
            <Loader2 size={13} className="animate-spin text-emerald-600" />
            <span>กำลังโหลดข้อมูลในตาราง...</span>
          </span>
        </div>
      </div>

      {/* Real Table Header */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100/70 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              {columns.map((col, idx) => (
                <th key={idx} className="px-4 py-3">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-600 font-medium">
            {Array.from({ length: rowPlaceholderCount }).map((_, r) => (
              <tr key={r} className="hover:bg-slate-50/50 transition">
                {columns.map((_, c) => (
                  <td key={c} className="px-4 py-3.5">
                    {c === 0 ? (
                      <div className="h-4 w-12 bg-slate-100 rounded-md animate-pulse" />
                    ) : c === columns.length - 1 ? (
                      <div className="h-5 w-16 bg-emerald-50 text-emerald-600 rounded-lg animate-pulse" />
                    ) : (
                      <div className="h-4 w-28 bg-slate-100 rounded-md animate-pulse" />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
