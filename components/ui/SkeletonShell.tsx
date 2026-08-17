import React from "react";

export function SkeletonBox({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-slate-200/80 rounded-xl animate-pulse ${className}`} />
  );
}

export function PageHeaderSkeleton({ titleWidth = "w-48", subtitleWidth = "w-72" }: { titleWidth?: string; subtitleWidth?: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div className="space-y-2">
        <SkeletonBox className={`h-7 ${titleWidth} rounded-lg`} />
        <SkeletonBox className={`h-4 ${subtitleWidth} rounded-md`} />
      </div>
      <div className="flex items-center gap-2">
        <SkeletonBox className="h-9 w-28 rounded-xl" />
        <SkeletonBox className="h-9 w-28 rounded-xl" />
      </div>
    </div>
  );
}

export function KpiGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${count} gap-4 mb-6`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <SkeletonBox className="h-4 w-24 rounded-md" />
            <SkeletonBox className="h-7 w-7 rounded-lg" />
          </div>
          <SkeletonBox className="h-8 w-36 rounded-lg" />
          <SkeletonBox className="h-3 w-28 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Table Filter Bar */}
      <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <SkeletonBox className="h-9 w-64 rounded-xl" />
        <div className="flex gap-2">
          <SkeletonBox className="h-9 w-24 rounded-xl" />
          <SkeletonBox className="h-9 w-24 rounded-xl" />
        </div>
      </div>

      {/* Table Header */}
      <div className="bg-slate-50/90 px-4 py-3 border-b border-slate-200/80 flex items-center justify-between">
        {Array.from({ length: cols }).map((_, c) => (
          <SkeletonBox key={c} className="h-4 w-20 rounded-md" />
        ))}
      </div>

      {/* Table Rows */}
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="px-4 py-3.5 flex items-center justify-between">
            {Array.from({ length: cols }).map((_, c) => (
              <SkeletonBox key={c} className={`h-4 rounded-md ${c === 0 ? "w-28" : c === 1 ? "w-44" : "w-16"}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="p-4 sm:p-6 max-w-[1500px] mx-auto space-y-6 bg-slate-50/30 rounded-3xl">
      <PageHeaderSkeleton titleWidth="w-56" subtitleWidth="w-80" />
      <KpiGridSkeleton count={4} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <SkeletonBox className="h-5 w-40 rounded-md" />
            <SkeletonBox className="h-8 w-24 rounded-xl" />
          </div>
          <SkeletonBox className="h-64 w-full rounded-xl" />
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <SkeletonBox className="h-5 w-32 rounded-md" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-50/80 rounded-xl">
                <SkeletonBox className="h-4 w-28 rounded-md" />
                <SkeletonBox className="h-4 w-16 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <TableSkeleton rows={5} cols={5} />
    </div>
  );
}
