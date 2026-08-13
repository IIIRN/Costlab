"use client";

import { useEffect, useState } from "react";
import { LogIn, User, AlertCircle, Building2, ShieldCheck, RefreshCw } from "lucide-react";
import type { SheetRow } from "@/lib/types";

interface SystemUser {
  id?: string;
  username?: string;
  displayName?: string;
  role?: string;
  status?: string;
}

export function LoginScreen({ peopleRows = [] }: { peopleRows?: SheetRow[] }) {
  const [employeeId, setEmployeeId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [usersList, setUsersList] = useState<SystemUser[]>([]);
  const [companySettings, setCompanySettings] = useState({
    companyName: "CostLab Application",
    companySubTitle: "ระบบบริหารและติดตามงบประมาณก่อสร้าง",
    logoUrl: "",
  });

  useEffect(() => {
    // Load Company Settings
    const cached = localStorage.getItem("costlab_company_settings");
    if (cached) {
      try {
        setCompanySettings((prev) => ({ ...prev, ...JSON.parse(cached) }));
      } catch (e) {}
    }

    fetch("/api/company-settings")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.settings) {
          setCompanySettings((prev) => ({ ...prev, ...json.settings }));
        }
      })
      .catch(() => {});

    // Fetch System Users List (from /settings/users)
    fetch("/api/users")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.users)) {
          setUsersList(json.users);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = employeeId.trim().toLowerCase();
    if (!cleanId) return;

    setLoading(true);
    setError("");

    // 1. Search in /settings/users list first
    let foundUser = usersList.find(
      (u) =>
        (String(u.username || "").trim().toLowerCase() === cleanId ||
         String(u.id || "").trim().toLowerCase() === cleanId) &&
        u.status !== "Inactive"
    );

    // 2. Fallback to peopleRows if not found in /settings/users
    if (!foundUser && peopleRows.length > 0) {
      const person = peopleRows.find(
        (row) => String(row["รหัสพนักงาน"]).trim().toLowerCase() === cleanId
      );
      if (person) {
        foundUser = {
          id: String(person["รหัสพนักงาน"]),
          username: String(person["รหัสพนักงาน"]),
          displayName: String(person["ชื่อเล่น"] || person["ชื่อ-สกุล"] || person["ชื่อ"] || person["รหัสพนักงาน"]),
          role: String(person["สิทธิ์การใช้งาน"] || "User"),
          status: "Active",
        };
      }
    }

    if (!foundUser) {
      setError("ไม่พบรหัสผู้ใช้งานนี้ในระบบ หรือบัญชีถูกระงับ");
      setLoading(false);
      return;
    }

    try {
      await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: foundUser.username || foundUser.id,
          name: foundUser.displayName || foundUser.username || foundUser.id,
          role: foundUser.role || "User",
        }),
      });
      window.location.href = "/";
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#062e2b] flex items-center justify-center p-4 font-sans">
      {/* Compact Clean Card */}
      <div className="w-full max-w-sm bg-white rounded-lg p-6 shadow-2xl space-y-5 border border-slate-100">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 flex items-center justify-center">
            {companySettings.logoUrl ? (
              <img
                src={companySettings.logoUrl}
                alt="Logo"
                className="w-full h-full object-contain drop-shadow-sm"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-[#0b3531] text-[#d4f54e] flex items-center justify-center font-extrabold text-sm">
                CL
              </div>
            )}
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900 leading-tight">
              {companySettings.companyName || "CostLab Executive"}
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">
              {companySettings.companySubTitle || "ระบบบริหารและติดตามงบประมาณก่อสร้าง"}
            </p>
          </div>
        </div>

        {/* Form Input */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label htmlFor="employeeId" className="block text-xs font-bold text-slate-700 mb-1">
              รหัสผู้ใช้งาน (Username / รหัสพนักงาน)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                <User size={15} />
              </div>
              <input
                id="employeeId"
                name="employeeId"
                type="text"
                autoComplete="username"
                required
                value={employeeId}
                onChange={(e) => {
                  setEmployeeId(e.target.value);
                  if (error) setError("");
                }}
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:bg-white focus:border-[#0b3531] text-xs transition"
                placeholder="ระบุรหัสผู้ใช้งาน..."
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[11px] font-semibold flex items-center gap-1.5">
              <AlertCircle size={14} className="text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading || !employeeId.trim()}
            className="w-full py-2 px-4 bg-[#0b3531] hover:bg-[#062e2b] text-white font-extrabold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 text-xs shadow-sm"
          >
            {loading ? (
              <>
                <RefreshCw size={14} className="animate-spin text-[#d4f54e]" />
                <span>กำลังเข้าสู่ระบบ...</span>
              </>
            ) : (
              <>
                <LogIn size={14} className="text-[#d4f54e]" />
                <span>เข้าสู่ระบบ</span>
              </>
            )}
          </button>
        </form>

        {/* Footer Security Note */}
        <div className="pt-1 text-center text-[10px] text-slate-400 flex items-center justify-center gap-1">
          <ShieldCheck size={12} className="text-emerald-600" />
          <span>ระบบยืนยันตัวตนผู้ใช้จาก /settings/users</span>
        </div>
      </div>
    </div>
  );
}

