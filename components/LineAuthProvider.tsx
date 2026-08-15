"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { MessageSquare, Phone, UserCheck, Shield, RefreshCw, X, LogIn } from "lucide-react";

interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

interface LineAuthContextType {
  isLiffReady: boolean;
  liffId: string;
  lineProfile: LineProfile | null;
  isLoading: boolean;
  loginWithLine: () => void;
  openPhoneModal: (profile?: LineProfile) => void;
}

const LineAuthContext = createContext<LineAuthContextType>({
  isLiffReady: false,
  liffId: "",
  lineProfile: null,
  isLoading: false,
  loginWithLine: () => {},
  openPhoneModal: () => {},
});

export const useLineAuth = () => useContext(LineAuthContext);

export function LineAuthProvider({ children }: { children: React.ReactNode }) {
  const [liffId, setLiffId] = useState("");
  const [isLiffReady, setIsLiffReady] = useState(false);
  const [lineProfile, setLineProfile] = useState<LineProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [liffInstance, setLiffInstance] = useState<any>(null);

  // Registration / Account Linking Modal State
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [registering, setRegistering] = useState(false);

  // 1. Fetch LIFF ID dynamically from Server
  useEffect(() => {
    async function initLiff() {
      try {
        const res = await fetch("/api/line/config");
        const data = await res.json();
        const activeLiffId = data?.liffId || process.env.NEXT_PUBLIC_LINE_LIFF_ID || "";
        if (activeLiffId) {
          setLiffId(activeLiffId);
          await loadLiffSdk(activeLiffId);
        }
      } catch (err) {
        console.warn("⚠️ Failed to load LIFF config:", err);
      }
    }
    initLiff();
  }, []);

  // 2. Load & Init @line/liff SDK
  async function loadLiffSdk(id: string) {
    try {
      const liff = (await import("@line/liff")).default;
      await liff.init({ liffId: id });
      setLiffInstance(liff);
      setIsLiffReady(true);

      if (liff.isLoggedIn()) {
        const profile = await liff.getProfile();
        const pData: LineProfile = {
          userId: profile.userId,
          displayName: profile.displayName,
          pictureUrl: profile.pictureUrl,
          statusMessage: profile.statusMessage,
        };
        setLineProfile(pData);
        await checkAndLoginLineUser(pData);
      }
    } catch (err: any) {
      console.warn("⚠️ LIFF SDK init error:", err);
    }
  }

  // 3. Attempt LINE Auto-Login
  async function checkAndLoginLineUser(profile: LineProfile) {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/line", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          lineUserId: profile.userId,
          pictureUrl: profile.pictureUrl,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // Logged in successfully! Reload to apply cookie session
        window.location.reload();
      } else {
        // User not found in DB ➡️ Prompt for Phone Registration / Account Linking
        setShowPhoneModal(true);
      }
    } catch (err) {
      console.error("❌ LINE Auth login check failed:", err);
    } finally {
      setIsLoading(false);
    }
  }

  // 4. Trigger LINE Login (Redirects to LINE OAuth if not logged in)
  function loginWithLine() {
    if (!liffId) {
      alert("⚠️ กรุณากำหนดค่า LIFF ID ในการตั้งค่า LINE System (/settings/line-system) ครับ");
      return;
    }

    if (liffInstance) {
      if (!liffInstance.isLoggedIn()) {
        liffInstance.login();
      } else {
        liffInstance
          .getProfile()
          .then((profile: any) => {
            const pData: LineProfile = {
              userId: profile.userId,
              displayName: profile.displayName,
              pictureUrl: profile.pictureUrl,
              statusMessage: profile.statusMessage,
            };
            setLineProfile(pData);
            checkAndLoginLineUser(pData);
          })
          .catch((err: any) => {
            alert(`⚠️ ไม่สามารถดึงโปรไฟล์ LINE ได้: ${err?.message || "โปรดลองใหม่อีกครั้ง"}`);
          });
      }
    } else {
      alert("⚠️ ระบบกำลังเชื่อมต่อ LIFF SDK กรุณาลองใหม่อีกครั้งในครู่เดียวครับ");
    }
  }

  function openPhoneModal(profile?: LineProfile) {
    if (profile) setLineProfile(profile);
    setShowPhoneModal(true);
  }

  // 5. Submit Registration / Account Linking Form
  async function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phoneInput.trim() || !lineProfile) return;

    setRegistering(true);
    setRegisterError("");
    try {
      const res = await fetch("/api/auth/line", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register",
          lineUserId: lineProfile.userId,
          displayName: lineProfile.displayName,
          pictureUrl: lineProfile.pictureUrl,
          phone: phoneInput.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowPhoneModal(false);
        window.location.reload();
      } else {
        setRegisterError(data.error || "เกิดข้อผิดพลาดในการลงทะเบียน");
      }
    } catch (err: any) {
      setRegisterError(err.message || "เกิดข้อผิดพลาดในการลงทะเบียน");
    } finally {
      setRegistering(false);
    }
  }

  return (
    <LineAuthContext.Provider
      value={{
        isLiffReady,
        liffId,
        lineProfile,
        isLoading,
        loginWithLine,
        openPhoneModal,
      }}
    >
      {children}

      {/* Account Linking / Registration Modal */}
      {showPhoneModal && lineProfile && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">ลงทะเบียน / ผูกบัญชี LINE</h3>
                  <p className="text-[11px] text-slate-500 font-medium">ยืนยันตัวตนเพื่อเข้าใช้งานระบบ</p>
                </div>
              </div>
              <button
                onClick={() => setShowPhoneModal(false)}
                className="text-slate-400 hover:text-slate-600 transition p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Profile Avatar & Display Name from LINE */}
            <div className="flex items-center gap-3 p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl">
              {lineProfile.pictureUrl ? (
                <img
                  src={lineProfile.pictureUrl}
                  alt={lineProfile.displayName}
                  className="w-11 h-11 rounded-full object-cover border-2 border-emerald-400 shadow-xs shrink-0"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-base shrink-0">
                  {lineProfile.displayName.charAt(0)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900 truncate">{lineProfile.displayName}</div>
                <div className="text-[10px] text-emerald-700 font-mono truncate">{lineProfile.userId}</div>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <Shield size={13} className="text-slate-500" />
                <span>คำแนะนำการลงทะเบียน:</span>
              </div>
              <p className="m-0 leading-relaxed">
                • หากมีบัญชีในระบบแล้ว: กรอก<b>เบอร์โทรศัพท์เดิม</b> เพื่อผูกบัญชีอัตโนมัติ<br />
                • หากยังไม่มีบัญชี: กรอกเบอร์โทรศัพท์เพื่อสร้างบัญชีใหม่
              </p>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1">
                  <Phone size={13} className="text-slate-500" />
                  <span>เบอร์โทรศัพท์ *</span>
                </label>
                <input
                  type="tel"
                  placeholder="เช่น 0812345678"
                  value={phoneInput}
                  onChange={e => setPhoneInput(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                  required
                  autoFocus
                />
              </div>

              {registerError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold">
                  {registerError}
                </div>
              )}

              <div className="pt-1 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPhoneModal(false)}
                  className="flex-1 py-2.5 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={registering || !phoneInput.trim()}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {registering ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <>
                      <UserCheck size={15} />
                      <span>ยืนยันข้อมูล</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </LineAuthContext.Provider>
  );
}
