"use client";

import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Image as ImageIcon,
  RotateCw,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from "lucide-react";

type BillImageThumbnailProps = {
  value: unknown;
  compact?: boolean;
};

export function BillImageThumbnail({ value, compact = false }: BillImageThumbnailProps) {
  const rawValue = formatValue(value).trim();
  const [open, setOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imgError, setImgError] = useState(false);

  // Advanced Controls: Zoom & Rotation
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const imageUrls = splitImageValues(rawValue).map(imagePreviewUrl).filter(Boolean);
  const firstImageUrl = imageUrls[0] || "";
  const currentImageUrl = imageUrls[currentIndex] || firstImageUrl;

  useEffect(() => {
    setImgError(false);
  }, [rawValue]);

  // Reset zoom & rotation when switching images or opening modal
  useEffect(() => {
    setZoom(1);
    setRotation(0);
  }, [currentIndex, open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "ArrowLeft") setCurrentIndex((index) => previousIndex(index, imageUrls.length));
      if (event.key === "ArrowRight") setCurrentIndex((index) => nextIndex(index, imageUrls.length));
      if (event.key === "+") handleZoomIn();
      if (event.key === "-") handleZoomOut();
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

  function handleZoomIn() {
    setZoom((z) => Math.min(z + 0.5, 3.5));
  }

  function handleZoomOut() {
    setZoom((z) => Math.max(z - 0.5, 0.75));
  }

  function handleRotate() {
    setRotation((r) => (r + 90) % 360);
  }

  function handleResetView() {
    setZoom(1);
    setRotation(0);
  }

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
        className="group relative inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:border-emerald-500 hover:shadow-md transition-all duration-200 cursor-pointer select-none overflow-hidden shrink-0"
        title="คลิกเพื่อขยายดูรูปภาพ"
        style={{ width: compact ? 28 : 34, height: compact ? 28 : 34 }}
      >
        {/* Mini Preview Image */}
        <img
          src={firstImageUrl}
          alt="รูปถ่าย"
          loading="lazy"
          decoding="async"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
        />
        {imageUrls.length > 1 && (
          <span className="absolute bottom-0 right-0 bg-slate-900/90 text-emerald-400 text-[9px] font-extrabold leading-none px-1 py-0.5 rounded-tl shadow-xs">
            +{imageUrls.length - 1}
          </span>
        )}
      </button>

      {/* Lightbox Gallery Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-[620px] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 animate-in zoom-in-95 duration-200 text-slate-800 max-h-[90vh]"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Modal Header */}
            <header className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-3 border-b border-slate-200/90 bg-white text-slate-900">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0">
                  <ImageIcon size={18} />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-slate-900 tracking-wide">
                      รูปถ่ายเอกสาร / บิล
                    </h3>
                    {imageUrls.length > 1 && (
                      <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded-full bg-slate-100 text-emerald-700 border border-slate-200">
                        {currentIndex + 1} / {imageUrls.length}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500">ใช้ปุ่มซูม หมุนรูปภาพ หรือคลิกรูปย่อยสลับรูป</p>
                </div>
              </div>

              {/* Toolbar Controls */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Zoom & Rotate Tools */}
                <div className="flex items-center gap-0.5 bg-slate-100/90 p-0.5 rounded-lg border border-slate-200 mr-0.5">
                  <button
                    type="button"
                    onClick={handleZoomIn}
                    disabled={zoom >= 3.5}
                    className="w-7 h-7 rounded hover:bg-white text-slate-600 hover:text-slate-900 hover:shadow-2xs flex items-center justify-center transition disabled:opacity-30 cursor-pointer"
                    title="ซูมขยาย (+)"
                  >
                    <ZoomIn size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    disabled={zoom <= 0.75}
                    className="w-7 h-7 rounded hover:bg-white text-slate-600 hover:text-slate-900 hover:shadow-2xs flex items-center justify-center transition disabled:opacity-30 cursor-pointer"
                    title="ซูมย่อ (-)"
                  >
                    <ZoomOut size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={handleRotate}
                    className="w-7 h-7 rounded hover:bg-white text-slate-600 hover:text-slate-900 hover:shadow-2xs flex items-center justify-center transition cursor-pointer"
                    title="หมุนรูปภาพ 90°"
                  >
                    <RotateCw size={14} />
                  </button>

                  {(zoom !== 1 || rotation !== 0) && (
                    <button
                      type="button"
                      onClick={handleResetView}
                      className="px-1.5 h-7 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                      title="คืนค่าขนาดดั้งเดิม"
                    >
                      <RotateCcw size={11} />
                      <span>{Math.round(zoom * 100)}%</span>
                    </button>
                  )}
                </div>

                <a
                  href={currentImageUrl}
                  target="_blank"
                  rel="noreferrer"
                  title="เปิดรูปภาพขนาดใหญ่ในแท็บใหม่"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-semibold shadow-2xs transition cursor-pointer"
                >
                  <ExternalLink size={13} />
                  <span>เปิดรูปจริง</span>
                </a>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-500 hover:text-rose-600 flex items-center justify-center transition cursor-pointer"
                  title="ปิดหน้าต่าง (Esc)"
                >
                  <X size={15} />
                </button>
              </div>
            </header>

            {/* Modal Main Image Stage: Balanced Square Aspect Ratio Frame */}
            <div className="relative p-3 bg-slate-50 flex flex-col items-center justify-center select-none overflow-hidden min-h-[320px] max-h-[58vh]">
              <div className="relative w-full max-w-[460px] aspect-square flex items-center justify-center p-2 bg-white rounded-2xl border border-slate-200 shadow-sm transition-all duration-200 overflow-hidden">
                <img
                  src={currentImageUrl}
                  alt={`รูปถ่ายที่ ${currentIndex + 1}`}
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transition: "transform 0.25s ease-out"
                  }}
                  className="w-full h-full object-contain rounded-xl"
                />
              </div>

              {/* Navigation Arrows for Multi-images */}
              {imageUrls.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((index) => previousIndex(index, imageUrls.length))}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-emerald-600 hover:text-white text-slate-700 flex items-center justify-center shadow-md transition border border-slate-200 cursor-pointer backdrop-blur-xs"
                    title="รูปก่อนหน้า"
                  >
                    <ChevronLeft size={19} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentIndex((index) => nextIndex(index, imageUrls.length))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-emerald-600 hover:text-white text-slate-700 flex items-center justify-center shadow-md transition border border-slate-200 cursor-pointer backdrop-blur-xs"
                    title="รูปถัดไป"
                  >
                    <ChevronRight size={19} />
                  </button>
                </>
              )}
            </div>

            {/* Multi-image Thumbnail Strip Footer */}
            {imageUrls.length > 1 && (
              <footer className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-center gap-2 overflow-x-auto">
                {imageUrls.map((url, idx) => (
                  <button
                    key={url + idx}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 transition cursor-pointer shrink-0 ${
                      idx === currentIndex
                        ? "border-emerald-600 ring-2 ring-emerald-200 scale-105"
                        : "border-slate-200 opacity-60 hover:opacity-100 hover:border-slate-400"
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

