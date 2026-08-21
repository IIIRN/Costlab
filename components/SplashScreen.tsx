"use client";

import { useEffect, useState } from "react";

const TIPS = [
  "กำลังเชื่อมต่อระบบ...",
  "กำลังโหลดข้อมูลโครงการ...",
  "กำลังเตรียมแดชบอร์ด...",
  "เกือบพร้อมแล้ว...",
];

export function SplashScreen({ onDone }: { onDone?: () => void }) {
  const [tipIndex, setTipIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const tipInterval = setInterval(() => {
      setTipIndex((i) => (i + 1) % TIPS.length);
    }, 900);

    const startTime = Date.now();
    const duration = 3200;
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / duration) * 100, 95);
      setProgress(pct);
    }, 40);

    const hideTimer = setTimeout(() => {
      setProgress(100);
      clearInterval(tipInterval);
      clearInterval(progressInterval);
      setFadeOut(true);
      setTimeout(() => {
        setVisible(false);
        onDone?.();
      }, 450);
    }, 3500);

    return () => {
      clearInterval(tipInterval);
      clearInterval(progressInterval);
      clearTimeout(hideTimer);
    };
  }, [onDone]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(160deg, #062e2b 0%, #0b3531 45%, #0d4a44 100%)",
        transition: "opacity 0.45s ease",
        opacity: fadeOut ? 0 : 1,
      }}
    >
      {/* Animated blobs */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div className="sl-blob sl-blob-1" />
        <div className="sl-blob sl-blob-2" />
        <div className="sl-blob sl-blob-3" />
      </div>

      {/* Grid */}
      <div className="sl-grid" />

      {/* Main content */}
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>
        {/* Logo ring */}
        <div className="sl-logo-wrap">
          <div className="sl-ring sl-ring-outer" />
          <div className="sl-ring sl-ring-mid" />
          <div className="sl-logo-core">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <rect x="4" y="4" width="32" height="32" rx="9" fill="#d4f54e" opacity="0.12" />
              <text x="20" y="27" textAnchor="middle" fontSize="20" fontWeight="800" fill="#d4f54e" fontFamily="system-ui, sans-serif">C</text>
            </svg>
          </div>
        </div>

        {/* Title */}
        <div style={{ textAlign: "center" }}>
          <h1 className="sl-title">CostLab</h1>
          <p className="sl-subtitle">ระบบบริหารงบประมาณก่อสร้าง</p>
        </div>

        {/* Progress */}
        <div style={{ width: 210, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <div className="sl-bar-track">
            <div className="sl-bar-fill" style={{ width: `${progress}%` }} />
            <div className="sl-bar-glow" style={{ left: `${Math.max(progress, 2)}%` }} />
          </div>
          <p className="sl-tip" key={tipIndex}>{TIPS[tipIndex]}</p>
        </div>

        {/* Dots */}
        <div style={{ display: "flex", gap: 8 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="sl-dot" style={{ animationDelay: `${i * 0.2}s` }} />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="sl-footer">
        <span>Powered by</span>
        <strong>GIS PHARMA</strong>
      </div>

      <style>{`
        .sl-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(90px);
          opacity: 0.15;
        }
        .sl-blob-1 {
          width: 420px; height: 420px;
          background: #d4f54e;
          top: -130px; left: -110px;
          animation: slFloat 7s ease-in-out infinite;
        }
        .sl-blob-2 {
          width: 320px; height: 320px;
          background: #14883d;
          bottom: -90px; right: -90px;
          animation: slFloat 9s ease-in-out infinite reverse;
        }
        .sl-blob-3 {
          width: 220px; height: 220px;
          background: #4ade80;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          animation: slFloat 5s ease-in-out infinite;
        }
        @keyframes slFloat {
          0%, 100% { transform: translate(0,0) scale(1); }
          33% { transform: translate(28px,-18px) scale(1.08); }
          66% { transform: translate(-18px,14px) scale(0.96); }
        }
        .sl-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(212,245,78,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(212,245,78,0.04) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
        }
        .sl-logo-wrap {
          position: relative;
          width: 104px; height: 104px;
          display: flex; align-items: center; justify-content: center;
        }
        .sl-ring {
          position: absolute;
          border-radius: 50%;
          border: 2px solid rgba(212,245,78,0.3);
          animation: slRing 2.5s ease-in-out infinite;
        }
        .sl-ring-outer { width: 104px; height: 104px; }
        .sl-ring-mid  { width: 78px; height: 78px; border-color: rgba(212,245,78,0.5); animation-delay: 0.3s; }
        @keyframes slRing {
          0%,100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.06); }
        }
        .sl-logo-core {
          width: 60px; height: 60px;
          background: linear-gradient(135deg, #0d4a44, #0b3531);
          border: 2px solid rgba(212,245,78,0.4);
          border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          animation: slGlow 3s ease-in-out infinite;
        }
        @keyframes slGlow {
          0%,100% { box-shadow: 0 0 30px rgba(212,245,78,0.15); }
          50% { box-shadow: 0 0 60px rgba(212,245,78,0.38); }
        }
        .sl-title {
          margin: 0;
          font-size: 34px;
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.5px;
          line-height: 1.1;
        }
        .sl-subtitle {
          margin: 6px 0 0;
          font-size: 12.5px;
          color: rgba(212,245,78,0.7);
          font-weight: 500;
        }
        .sl-bar-track {
          position: relative;
          width: 100%;
          height: 4px;
          background: rgba(255,255,255,0.1);
          border-radius: 99px;
          overflow: visible;
        }
        .sl-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #14883d, #d4f54e);
          border-radius: 99px;
          transition: width 0.1s linear;
        }
        .sl-bar-glow {
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 10px; height: 10px;
          background: #d4f54e;
          border-radius: 50%;
          box-shadow: 0 0 14px 5px rgba(212,245,78,0.55);
          transition: left 0.1s linear;
        }
        .sl-tip {
          margin: 0;
          font-size: 12px;
          color: rgba(255,255,255,0.45);
          animation: slTip 0.35s ease;
        }
        @keyframes slTip {
          from { opacity: 0; transform: translateY(5px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .sl-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: rgba(212,245,78,0.4);
          animation: slDot 1.2s ease-in-out infinite;
        }
        @keyframes slDot {
          0%,100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.25); background: #d4f54e; }
        }
        .sl-footer {
          position: absolute;
          bottom: 26px;
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          color: rgba(255,255,255,0.22);
        }
        .sl-footer strong {
          color: rgba(212,245,78,0.4);
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
