"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Mail,
  MapPin,
  Phone,
  Receipt,
  RefreshCw,
  Save,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import type { CompanySettings } from "@/lib/types";
import { DEFAULT_COMPANY_SETTINGS } from "@/lib/types";

export default function GeneralSettingsPage() {
  const [settings, setSettings] = useState<CompanySettings>(DEFAULT_COMPANY_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const cached = localStorage.getItem("costlab_company_settings");
    if (cached) {
      try {
        setSettings({ ...DEFAULT_COMPANY_SETTINGS, ...JSON.parse(cached) });
      } catch (e) {}
    }

    async function loadSettings() {
      try {
        const res = await fetch("/api/company-settings");
        const json = await res.json();
        if (json.success && json.settings) {
          setSettings(json.settings);
          localStorage.setItem("costlab_company_settings", JSON.stringify(json.settings));
        }
      } catch (err) {}
    }
    loadSettings();
  }, []);

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg("ขนาดไฟล์ต้องไม่เกิน 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setSettings((prev) => ({ ...prev, logoUrl: base64 }));
        setErrorMsg("");
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      localStorage.setItem("costlab_company_settings", JSON.stringify(settings));
      const res = await fetch("/api/company-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "บันทึกไม่สำเร็จ");

      setSuccessMsg("บันทึกสำเร็จแล้ว");
      window.dispatchEvent(new Event("company-settings-updated"));
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-3 sm:p-5 max-w-5xl mx-auto space-y-4 font-sans text-xs">
      {/* Compact Page Header Title */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <Building2 size={20} className="text-emerald-600 shrink-0" />
          <h1 className="font-extrabold text-base text-slate-900 tracking-tight">ตั้งค่าทั่วไป & ข้อมูลบริษัท</h1>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="px-3.5 py-2 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg flex items-center gap-2 font-bold animate-in fade-in">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="px-3.5 py-2 bg-rose-50 border border-rose-200 text-rose-900 rounded-lg flex items-center gap-2 font-bold animate-in fade-in">
          <ShieldCheck size={16} className="text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Compact Main Form */}
      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Form Controls (2 cols) */}
        <div className="lg:col-span-2 space-y-3.5">
          {/* Section 1: Logo & Company Name */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                <Building2 size={15} className="text-emerald-600" /> ชื่อองค์กร & โลโก้
              </span>
            </div>

            {/* Logo Row */}
            <div className="flex items-center gap-3">
              <div className="relative w-14 h-14 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 group">
                {settings.logoUrl ? (
                  <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                ) : (
                  <Building2 size={22} className="text-slate-400" />
                )}
                {settings.logoUrl && (
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, logoUrl: "" })}
                    className="absolute inset-0 bg-slate-900/70 text-white font-bold opacity-0 group-hover:opacity-100 flex items-center justify-center transition"
                    title="ลบโลโก้"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              <div className="flex-1 space-y-1.5 min-w-0">
                <div className="flex items-center gap-2">
                  <label className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold rounded-lg border border-slate-200 transition cursor-pointer flex items-center gap-1.5 shrink-0">
                    <Upload size={13} />
                    <span>อัปโหลดรูป</span>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                  <input
                    type="text"
                    value={settings.logoUrl}
                    onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                    placeholder="URL รูปภาพโลโก้..."
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Name Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="font-bold text-slate-700 block mb-1">ชื่อบริษัท / องค์กร</label>
                <input
                  type="text"
                  value={settings.companyName}
                  onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                  placeholder="ระบุชื่อบริษัท..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">สโลแกน / แท็กไลน์</label>
                <input
                  type="text"
                  value={settings.companySubTitle}
                  onChange={(e) => setSettings({ ...settings, companySubTitle: e.target.value })}
                  placeholder="ระบุคำอธิบายย่อย..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Contact & Tax Info */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                <Receipt size={15} className="text-amber-500" /> ข้อมูลติดต่อ & ออกบิล
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tax ID</label>
                <input
                  type="text"
                  value={settings.taxId}
                  onChange={(e) => setSettings({ ...settings, taxId: e.target.value })}
                  placeholder="เลขผู้เสียภาษี..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">เบอร์โทรศัพท์</label>
                <input
                  type="text"
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  placeholder="เบอร์โทรศัพท์..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">อีเมล</label>
                <input
                  type="email"
                  value={settings.email}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  placeholder="อีเมล..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">ที่อยู่บริษัท</label>
              <textarea
                rows={2}
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                placeholder="ที่อยู่บริษัท..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-900 focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>
          </div>

          {/* Action Button */}
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-lg transition shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              <span>{saving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Live Sidebar Preview (1 col) */}
        <div>
          <div className="bg-emerald-950 border border-emerald-900/80 rounded-lg p-4 text-slate-100 shadow-md space-y-3 sticky top-4">
            <div className="text-[11px] font-extrabold uppercase text-emerald-400 flex items-center justify-between border-b border-emerald-900/80 pb-2">
              <span>Sidebar Live Preview</span>
              <span className="text-[9px] bg-emerald-900 px-1.5 py-0.5 rounded text-emerald-300 border border-emerald-800 font-mono">
                Live
              </span>
            </div>

            {/* Sidebar Preview Component */}
            <div className="p-3 bg-emerald-900 rounded-lg border border-emerald-800 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-700/60 text-white flex items-center justify-center overflow-hidden shrink-0">
                {settings.logoUrl ? (
                  <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Building2 size={16} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-extrabold text-white truncate leading-tight">
                  {settings.companyName || "ชื่อบริษัท..."}
                </div>
                <div className="text-[10px] text-emerald-400/80 truncate leading-tight mt-0.5">
                  {settings.companySubTitle || "คำอธิบายย่อย..."}
                </div>
              </div>
            </div>

            {/* Header Document Preview */}
            <div className="p-3 bg-white text-slate-900 rounded-lg border border-slate-200 space-y-1">
              <div className="text-[9px] font-bold text-slate-400 uppercase">ตัวอย่างหัวรายงาน</div>
              <div className="flex items-center gap-2 pt-0.5">
                <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center shrink-0">
                  {settings.logoUrl ? (
                    <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain p-0.5" />
                  ) : (
                    <Building2 size={12} className="text-slate-600" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="font-bold truncate text-[11px]">{settings.companyName || "ชื่อบริษัท..."}</div>
                  <div className="text-[9px] text-slate-500 font-mono">Tax ID: {settings.taxId || "-"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
