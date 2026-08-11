"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  RefreshCw,
  Send,
  Zap,
  BookOpen,
  Terminal,
  Server,
  Database,
  Radio,
  Save,
  Eye,
  EyeOff,
  SlidersHorizontal,
  ShieldCheck,
  Target
} from "lucide-react";

export function LineSystemDashboardClient() {
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [configSource, setConfigSource] = useState<"supabase" | "env">("env");
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testTargetId, setTestTargetId] = useState("");

  const [formConfig, setFormConfig] = useState({
    LINE_CHANNEL_ACCESS_TOKEN: "",
    LINE_CHANNEL_SECRET: "",
    LINE_USER_ID_OWN: "",
    LINE_USER_ID_APPROVER: "",
    LINE_GROUP_ID_TASK: "",
    LINE_GROUP_ID_SUMMARY: "",
    LINE_GROUP_ID_PW: "",
    LINE_GROUP_ID_PLAN: "",
    LINE_GROUP_ID_FINANCE: "",
    LINE_GROUP_ID_PAID: "",
  });

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/line/webhook`
    : "https://coscosesuperbase.vercel.app/api/line/webhook";

  useEffect(() => {
    async function loadConfig() {
      try {
        setLoadingConfig(true);
        const res = await fetch("/api/line/config");
        const data = await res.json();
        if (res.ok && data.config) {
          setFormConfig(data.config);
          setConfigSource(data.source || "env");
          if (data.config.LINE_USER_ID_OWN) {
            setTestTargetId(data.config.LINE_USER_ID_OWN);
          }
        }
      } catch (e) {
        console.error("Failed to load line config:", e);
      } finally {
        setLoadingConfig(false);
      }
    }
    loadConfig();
  }, []);

  function copyWebhook() {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSaveConfig(e: React.FormEvent) {
    e.preventDefault();
    setSavingConfig(true);
    setSaveResult(null);
    try {
      const res = await fetch("/api/line/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: formConfig }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSaveResult({ success: true, message: "บันทึกการตั้งค่า LINE Bot ลง Supabase เรียบร้อยแล้ว!" });
        setConfigSource("supabase");
      } else {
        setSaveResult({ success: false, message: data.error || "เกิดข้อผิดพลาดในการบันทึก" });
      }
    } catch (err: any) {
      setSaveResult({ success: false, message: err.message || "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" });
    } finally {
      setSavingConfig(false);
    }
  }

  async function handleTestNotification() {
    setTesting(true);
    setTestResult(null);
    try {
      const url = testTargetId.trim()
        ? `/api/cron/daily-summary?target=${encodeURIComponent(testTargetId.trim())}`
        : "/api/cron/daily-summary";

      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: `ส่งการ์ดสรุปเข้า LINE ปลายทาง (${data.targetGroup || testTargetId}) เรียบร้อยแล้ว!`,
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || "เกิดข้อผิดพลาดในการส่งข้อความ",
        });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* Compact Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <MessageSquare size={20} className="text-emerald-600 shrink-0" />
          <h1 className="font-extrabold text-base text-slate-900 tracking-tight">ระบบจัดการ LINE Bot & Webhook</h1>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            Active
          </span>
        </div>

        {/* Test Trigger Input */}
        <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200">
          <input
            type="text"
            value={testTargetId}
            onChange={(e) => setTestTargetId(e.target.value)}
            placeholder="Target ID สำหรับทดสอบ..."
            className="px-2.5 py-1 bg-white border border-slate-200 rounded text-slate-800 font-mono text-[11px] focus:outline-none focus:border-emerald-500 w-44 sm:w-56"
          />
          <button
            type="button"
            disabled={testing}
            onClick={handleTestNotification}
            className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded text-[11px] transition flex items-center gap-1 cursor-pointer disabled:opacity-50 shrink-0"
          >
            {testing ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
            <span>ทดสอบส่ง</span>
          </button>
        </div>
      </div>

      {testResult && (
        <div
          className={`px-3 py-2 rounded-lg border font-bold flex items-center justify-between gap-2 animate-in fade-in ${
            testResult.success ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          <div className="flex items-center gap-1.5">
            {testResult.success ? <CheckCircle2 size={15} /> : <Zap size={15} />}
            <span>{testResult.message}</span>
          </div>
          <button type="button" onClick={() => setTestResult(null)} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>
      )}

      {/* System Status Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <Server size={16} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Engine Status</div>
            <div className="font-bold text-slate-900 truncate">Next.js Route API</div>
          </div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <Database size={16} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Config Source</div>
            <div className="font-bold text-slate-900 truncate">{configSource === "supabase" ? "Supabase DB" : "Environment (.env)"}</div>
          </div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
            <ShieldCheck size={16} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-slate-400 uppercase">LINE Token</div>
            <div className="font-bold text-slate-900 truncate">{formConfig.LINE_CHANNEL_ACCESS_TOKEN ? "ตั้งค่าพร้อมใช้งาน" : "ยังไม่ได้ตั้งค่า"}</div>
          </div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <Radio size={16} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Target Groups</div>
            <div className="font-bold text-slate-900 truncate">5 กลุ่มหลักระบบ</div>
          </div>
        </div>
      </div>

      {/* Webhook Configuration Section */}
      <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs space-y-2">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
            <Terminal size={15} className="text-indigo-600" /> Webhook URL (LINE Console)
          </span>
          <a
            href="https://developers.line.biz"
            target="_blank"
            rel="noreferrer"
            className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1"
          >
            <span>LINE Console</span> <ExternalLink size={12} />
          </a>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={webhookUrl}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-mono text-slate-800 focus:outline-none"
          />
          <button
            type="button"
            onClick={copyWebhook}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg border border-slate-200 transition flex items-center gap-1 cursor-pointer shrink-0"
          >
            {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
            <span>{copied ? "คัดลอกแล้ว" : "คัดลอก URL"}</span>
          </button>
        </div>
      </div>

      {/* Form: Editable LINE Configurations */}
      <form onSubmit={handleSaveConfig} className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
            <SlidersHorizontal size={15} className="text-emerald-600" /> ตั้งค่า Token & Group IDs (บันทึกใน Supabase)
          </span>
          <button
            type="submit"
            disabled={savingConfig || loadingConfig}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-lg transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {savingConfig ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
            <span>{savingConfig ? "บันทึก..." : "บันทึกข้อมูล"}</span>
          </button>
        </div>

        {saveResult && (
          <div
            className={`px-3 py-2 rounded-lg border font-bold flex items-center justify-between gap-2 animate-in fade-in ${
              saveResult.success ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-rose-50 border-rose-200 text-rose-900"
            }`}
          >
            <div className="flex items-center gap-1.5">
              {saveResult.success ? <CheckCircle2 size={15} /> : <Zap size={15} />}
              <span>{saveResult.message}</span>
            </div>
            <button type="button" onClick={() => setSaveResult(null)} className="text-slate-400 hover:text-slate-600">
              ✕
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Access Token */}
          <div className="sm:col-span-2 space-y-1">
            <label className="font-bold text-slate-700 block">LINE Channel Access Token *</label>
            <div className="relative flex items-center">
              <input
                type={showToken ? "text" : "password"}
                required
                value={formConfig.LINE_CHANNEL_ACCESS_TOKEN}
                onChange={(e) => setFormConfig({ ...formConfig, LINE_CHANNEL_ACCESS_TOKEN: e.target.value })}
                placeholder="วาง Access Token..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-9 py-1.5 font-mono text-slate-800 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2.5 text-slate-400 hover:text-slate-600"
              >
                {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Channel Secret */}
          <div className="sm:col-span-2 space-y-1">
            <label className="font-bold text-slate-700 block">LINE Channel Secret</label>
            <input
              type="text"
              value={formConfig.LINE_CHANNEL_SECRET}
              onChange={(e) => setFormConfig({ ...formConfig, LINE_CHANNEL_SECRET: e.target.value })}
              placeholder="วาง Channel Secret..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-mono text-slate-800 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* User IDs */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700">USER_ID_OWN (คุณแมน)</label>
              <button type="button" onClick={() => setTestTargetId(formConfig.LINE_USER_ID_OWN)} className="text-[10px] text-indigo-600 hover:underline">
                ใส่ช่องทดสอบ
              </button>
            </div>
            <input
              type="text"
              value={formConfig.LINE_USER_ID_OWN}
              onChange={(e) => setFormConfig({ ...formConfig, LINE_USER_ID_OWN: e.target.value })}
              placeholder="Uxxxxxxxx..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-mono text-slate-800 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700">USER_ID_APPROVER (คุณซ้อ)</label>
              <button type="button" onClick={() => setTestTargetId(formConfig.LINE_USER_ID_APPROVER)} className="text-[10px] text-indigo-600 hover:underline">
                ใส่ช่องทดสอบ
              </button>
            </div>
            <input
              type="text"
              value={formConfig.LINE_USER_ID_APPROVER}
              onChange={(e) => setFormConfig({ ...formConfig, LINE_USER_ID_APPROVER: e.target.value })}
              placeholder="Uxxxxxxxx..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-mono text-slate-800 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Group IDs */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700">GROUP_ID_TASK (แจ้งงาน)</label>
              <button type="button" onClick={() => setTestTargetId(formConfig.LINE_GROUP_ID_TASK)} className="text-[10px] text-indigo-600 hover:underline">
                ใส่ช่องทดสอบ
              </button>
            </div>
            <input
              type="text"
              value={formConfig.LINE_GROUP_ID_TASK}
              onChange={(e) => setFormConfig({ ...formConfig, LINE_GROUP_ID_TASK: e.target.value })}
              placeholder="Cxxxxxxxx..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-mono text-slate-800 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700">GROUP_ID_FINANCE (การเงิน)</label>
              <button type="button" onClick={() => setTestTargetId(formConfig.LINE_GROUP_ID_FINANCE)} className="text-[10px] text-indigo-600 hover:underline">
                ใส่ช่องทดสอบ
              </button>
            </div>
            <input
              type="text"
              value={formConfig.LINE_GROUP_ID_FINANCE}
              onChange={(e) => setFormConfig({ ...formConfig, LINE_GROUP_ID_FINANCE: e.target.value })}
              placeholder="Cxxxxxxxx..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-mono text-slate-800 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700">GROUP_ID_SUMMARY (สรุปเย็น)</label>
              <button type="button" onClick={() => setTestTargetId(formConfig.LINE_GROUP_ID_SUMMARY)} className="text-[10px] text-indigo-600 hover:underline">
                ใส่ช่องทดสอบ
              </button>
            </div>
            <input
              type="text"
              value={formConfig.LINE_GROUP_ID_SUMMARY}
              onChange={(e) => setFormConfig({ ...formConfig, LINE_GROUP_ID_SUMMARY: e.target.value })}
              placeholder="Cxxxxxxxx..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-mono text-slate-800 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700">GROUP_ID_PAID (บิลจ่ายแล้ว)</label>
              <button type="button" onClick={() => setTestTargetId(formConfig.LINE_GROUP_ID_PAID)} className="text-[10px] text-indigo-600 hover:underline">
                ใส่ช่องทดสอบ
              </button>
            </div>
            <input
              type="text"
              value={formConfig.LINE_GROUP_ID_PAID}
              onChange={(e) => setFormConfig({ ...formConfig, LINE_GROUP_ID_PAID: e.target.value })}
              placeholder="Cxxxxxxxx..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-mono text-slate-800 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </form>

      {/* Keyword Commands Directory */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
        <div className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5 border-b border-slate-100 pb-2">
          <BookOpen size={15} className="text-indigo-600" /> คู่มือคีย์เวิร์ดคำสั่ง (LINE Bot Keywords)
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>1. สรุป & การเงิน</span>
            </div>
            <div className="text-slate-600">
              <code className="bg-slate-200 px-1 py-0.5 rounded font-mono font-bold">สรุป</code>, <code className="bg-slate-200 px-1 py-0.5 rounded font-mono font-bold">รออนุมัติ</code>, <code className="bg-slate-200 px-1 py-0.5 rounded font-mono font-bold">บิลหลัก:</code>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              <span>2. งาน & รับเหมา (PW)</span>
            </div>
            <div className="text-slate-600">
              <code className="bg-slate-200 px-1 py-0.5 rounded font-mono font-bold">งาน</code>, <code className="bg-slate-200 px-1 py-0.5 rounded font-mono font-bold">มอบหมาย:</code>, <code className="bg-slate-200 px-1 py-0.5 rounded font-mono font-bold">แผน:</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
