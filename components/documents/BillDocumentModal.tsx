"use client";

import React, { useState } from "react";
import {
  X,
  Printer,
  FileText,
  Receipt,
  FileCheck2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { BillContractDocument } from "@/components/documents/BillContractDocument";
import type { BillDocumentModel } from "@/lib/bill-document";

type BillDocumentModalProps = {
  data: BillDocumentModel | null;
  isOpen: boolean;
  onClose: () => void;
};

export function BillDocumentModal({
  data,
  isOpen,
  onClose,
}: BillDocumentModalProps) {
  const [activeTab, setActiveTab] = useState<"all" | "contract" | "voucher" | "tax50twi">("all");

  if (!isOpen || !data) return null;

  function handlePrint() {
    const iframe = document.querySelector(".bill-contract-exact-document iframe") as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } else {
      window.print();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white rounded-xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* MODAL HEADER (No Print) */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white shrink-0 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>เอกสารสัญญาจ้าง / ใบสำคัญจ่าย / 50 ทวิ</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 font-mono">
                  บิล #{data.billSequence}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                โครงการ: {data.project.name} | ผู้รับเหมา: {data.contractor.fullName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`/bills/${encodeURIComponent(data.billSequence)}/document`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
              title="เปิดหน้าพิมพ์เต็มจอในแท็บใหม่"
            >
              <ExternalLink size={14} />
              <span>เปิดแท็บใหม่</span>
            </a>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-sm transition active:scale-95"
            >
              <Printer size={15} />
              <span>พิมพ์เอกสาร (Print / PDF)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* TAB CONTROLS (No Print) */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2 shrink-0 no-print text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-md font-semibold transition whitespace-nowrap ${
                activeTab === "all"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              ครบชุด 3 หน้า
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("contract")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition whitespace-nowrap ${
                activeTab === "contract"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              <FileText size={13} />
              <span>1. สัญญาจ้างเหมา</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("voucher")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition whitespace-nowrap ${
                activeTab === "voucher"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              <Receipt size={13} />
              <span>2. ใบสำคัญจ่าย</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("tax50twi")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition whitespace-nowrap ${
                activeTab === "tax50twi"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              <FileCheck2 size={13} />
              <span>3. หนังสือรับรอง 50 ทวิ</span>
            </button>
          </div>

          <span className="text-[11px] text-slate-500 hidden md:block">
            * สั่งพิมพ์เลือก Destination เป็น "Save as PDF" เพื่อบันทึกเป็นไฟล์ PDF
          </span>
        </div>

        {/* DOCUMENT PREVIEW CONTAINER */}
        <div className="flex-1 overflow-y-auto bg-slate-200/70 p-2 sm:p-6 print:p-0 print:bg-white">
          <BillContractDocument
            data={data}
            pages={[activeTab]}
          />
        </div>
      </div>
    </div>
  );
}
