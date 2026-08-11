"use client";

import { LoaderCircle } from "lucide-react";

export type LoadingStateProps = {
  title?: string;
  message?: string;
  compact?: boolean;
  type?: "dashboard" | "table" | "detail" | "compact";
};

export function LoadingState({
  title = "กำลังโหลดข้อมูล...",
  compact = false,
  type = "dashboard",
}: LoadingStateProps) {
  if (compact || type === "compact") {
    return (
      <div className="flex items-center justify-center gap-2 p-3 text-slate-600 text-sm font-medium">
        <LoaderCircle size={18} className="animate-spin text-indigo-600 shrink-0" />
        {title ? <span>{title}</span> : null}
      </div>
    );
  }

  return (
    <div className="w-full min-h-[40vh] flex flex-col items-center justify-center p-8 text-center select-none">
      <LoaderCircle size={38} className="animate-spin text-indigo-600 mb-3" />
      {title ? (
        <p className="text-sm font-semibold text-slate-700">
          {title}
        </p>
      ) : null}
    </div>
  );
}
