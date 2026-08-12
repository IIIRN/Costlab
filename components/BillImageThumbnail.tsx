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
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-300 select-none" title="ไม่มีรูปภาพ">
        <ImageIcon size={14} />
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
        className="group relative inline-flex items-center justify-center rounded border border-slate-300 bg-white hover:border-slate-800 transition duration-150 cursor-pointer select-none overflow-hidden shrink-0"
        title="คลิกเพื่อขยายดูรูปภาพ"
        style={{ width: 32, height: 32 }}
      >
        {/* Mini Preview Image */}
        <img
          src={firstImageUrl}
          alt="รูปถ่าย"
          loading="lazy"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
        />
        {imageUrls.length > 1 && (
          <span className="absolute bottom-0 right-0 bg-slate-900 text-white text-[9px] font-bold leading-none px-1 py-0.5 rounded-tl">
            +{imageUrls.length - 1}
          </span>
        )}
      </button>

      {/* Lightbox Gallery Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-150"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-4xl bg-white rounded-md shadow-2xl overflow-hidden flex flex-col border border-slate-200 animate-in zoom-in-95 duration-150 text-slate-800"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Modal Header */}
            <header className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white text-slate-900">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                  <ImageIcon size={16} />
                </span>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    รูปถ่ายเอกสาร / บิล {imageUrls.length > 1 ? `(${currentIndex + 1} / ${imageUrls.length})` : ""}
                  </h3>
                  <p className="text-[10px] text-slate-500">กดปุ่มลูกศร หรือคลิกรูปย่อยด้านล่างเพื่อสลับรูปภาพ</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={currentImageUrl}
                  target="_blank"
                  rel="noreferrer"
                  title="เปิดรูปภาพขนาดใหญ่ในแท็บใหม่"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  <ExternalLink size={13} />
                  <span>เปิดรูปจริง</span>
                </a>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-7 h-7 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-600 flex items-center justify-center transition cursor-pointer"
                  title="ปิดหน้าต่าง"
                >
                  <X size={16} />
                </button>
              </div>
            </header>

            {/* Modal Main Image Stage */}
            <div className="relative p-4 bg-slate-950 flex flex-col items-center justify-center min-h-[360px] max-h-[70vh] overflow-hidden select-none">
              <img
                src={currentImageUrl}
                alt={`รูปถ่ายที่ ${currentIndex + 1}`}
                className="max-h-[65vh] max-w-full object-contain rounded border border-slate-800 shadow-md transition-all duration-200"
              />

              {/* Navigation Arrows for Multi-images */}
              {imageUrls.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((index) => previousIndex(index, imageUrls.length))}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white flex items-center justify-center shadow transition border border-slate-700 cursor-pointer"
                    title="รูปก่อนหน้า"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentIndex((index) => nextIndex(index, imageUrls.length))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white flex items-center justify-center shadow transition border border-slate-700 cursor-pointer"
                    title="รูปถัดไป"
                  >
                    <ChevronRight size={18} />
                  </button>
                </>
              )}
            </div>

            {/* Multi-image Thumbnail Strip Footer */}
            {imageUrls.length > 1 && (
              <footer className="p-2.5 bg-slate-100 border-t border-slate-200 flex items-center justify-center gap-2 overflow-x-auto">
                {imageUrls.map((url, idx) => (
                  <button
                    key={url + idx}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`relative w-11 h-11 rounded overflow-hidden border-2 transition cursor-pointer shrink-0 ${
                      idx === currentIndex
                        ? "border-slate-900 scale-105"
                        : "border-slate-300 opacity-60 hover:opacity-100"
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

