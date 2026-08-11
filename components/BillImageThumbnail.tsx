"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Image as ImageIcon, Images, X, ZoomIn } from "lucide-react";

type BillImageThumbnailProps = {
  value: unknown;
  compact?: boolean;
};

export function BillImageThumbnail({ value, compact = false }: BillImageThumbnailProps) {
  const rawValue = formatValue(value).trim();
  const [open, setOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imgError, setImgError] = useState(false);

  const imageUrls = splitImageValues(rawValue).map(imagePreviewUrl).filter(Boolean);
  const firstImageUrl = imageUrls[0] || "";
  const currentImageUrl = imageUrls[currentIndex] || firstImageUrl;

  useEffect(() => {
    setImgError(false);
  }, [rawValue]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "ArrowLeft") setCurrentIndex((index) => previousIndex(index, imageUrls.length));
      if (event.key === "ArrowRight") setCurrentIndex((index) => nextIndex(index, imageUrls.length));
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [imageUrls.length, open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  // Empty or Invalid Image State
  if (!rawValue || rawValue === "ไม่มี" || rawValue === "-" || !imageUrls.length || imgError) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-400 bg-slate-100/80 border border-slate-200/60 whitespace-nowrap select-none">
        <ImageIcon size={13} className="text-slate-400" />
        <span>ไม่มีรูปภาพ</span>
      </span>
    );
  }

  return (
    <>
      {/* Modern Executive Thumbnail Button */}
      <button
        type="button"
        onClick={() => {
          setCurrentIndex(0);
          setOpen(true);
        }}
        className="group relative inline-flex items-center gap-2 p-1 pl-1 pr-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs hover:shadow-md hover:border-sky-500 transition-all duration-200 cursor-pointer select-none"
        title="คลิกเพื่อขยายดูรูปภาพ"
      >
        {/* Mini Preview Image Box */}
        <div className="relative w-7 h-7 rounded-lg overflow-hidden bg-slate-900 border border-slate-200 flex items-center justify-center shrink-0">
          <img
            src={firstImageUrl}
            alt="รูปถ่าย"
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-transparent transition-colors" />
        </div>

        {/* Label & Multi-image Badge */}
        <div className="flex items-center gap-1.5">
          {imageUrls.length > 1 ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gradient-to-r from-sky-500 to-indigo-600 text-white text-[11px] font-bold shadow-2xs">
              <Images size={12} />
              <span>{imageUrls.length} รูป</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 group-hover:text-sky-600 transition-colors">
              <ZoomIn size={13} className="text-sky-500" />
              <span>ดูรูปภาพ</span>
            </span>
          )}
        </div>
      </button>

      {/* Lightbox Gallery Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-3xl bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-800 animate-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Modal Header */}
            <header className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/90 text-white">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center font-bold text-xs">
                  <ImageIcon size={18} />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    รูปถ่ายเอกสาร / บิล {imageUrls.length > 1 ? `(${currentIndex + 1} / ${imageUrls.length})` : ""}
                  </h3>
                  <p className="text-[11px] text-slate-400">คลิกที่รูป หรือกดปุ่มลูกศรเพื่อเลื่อนรูปภาพ</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={currentImageUrl}
                  target="_blank"
                  rel="noreferrer"
                  title="เปิดรูปภาพขนาดใหญ่ในแท็บใหม่"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold transition border border-slate-700"
                >
                  <ExternalLink size={14} />
                  <span>เปิดรูปจริง</span>
                </a>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white flex items-center justify-center transition border border-slate-700 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </header>

            {/* Modal Main Image Stage */}
            <div className="relative p-6 bg-slate-950 flex flex-col items-center justify-center min-h-[380px] max-h-[70vh] overflow-hidden select-none">
              <img
                src={currentImageUrl}
                alt={`รูปถ่ายที่ ${currentIndex + 1}`}
                className="max-h-[60vh] max-w-full object-contain rounded-xl shadow-2xl transition-all duration-300"
              />

              {/* Navigation Arrows for Multi-images */}
              {imageUrls.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((index) => previousIndex(index, imageUrls.length))}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900/80 hover:bg-sky-600 text-white flex items-center justify-center shadow-lg transition border border-slate-700 cursor-pointer"
                    title="รูปก่อนหน้า"
                  >
                    <ChevronLeft size={20} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentIndex((index) => nextIndex(index, imageUrls.length))}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900/80 hover:bg-sky-600 text-white flex items-center justify-center shadow-lg transition border border-slate-700 cursor-pointer"
                    title="รูปถัดไป"
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}
            </div>

            {/* Multi-image Thumbnail Strip Footer */}
            {imageUrls.length > 1 && (
              <footer className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-center gap-2 overflow-x-auto">
                {imageUrls.map((url, idx) => (
                  <button
                    key={url + idx}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`relative w-12 h-12 rounded-xl overflow-hidden border-2 transition cursor-pointer shrink-0 ${
                      idx === currentIndex
                        ? "border-sky-500 scale-105 shadow-md"
                        : "border-slate-800 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={url} alt={`รูปที่ ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </footer>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  return String(value);
}

function splitImageValues(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(/\s*,\s*|\s*;\s*|\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function imagePreviewUrl(raw: string): string {
  if (!raw) return "";
  const trimmed = raw.trim();

  // 1. Full HTTP/HTTPS URLs (Supabase Storage, CDN, public URLs)
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  // 2. Absolute path (starts with /)
  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  // 3. Base64 data URL
  if (trimmed.startsWith("data:image/")) {
    return trimmed;
  }

  // 4. Invalid or local relative paths -> return empty string to show "ไม่มีรูปภาพ" badge safely
  return "";
}

function nextIndex(current: number, length: number): number {
  if (length <= 0) return 0;
  return (current + 1) % length;
}

function previousIndex(current: number, length: number): number {
  if (length <= 0) return 0;
  return (current - 1 + length) % length;
}
