"use client";

import { useEffect, useState, useMemo } from "react";
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
  Search,
  FileText,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Layers,
  CheckSquare,
  DollarSign,
  Briefcase
} from "lucide-react";

type CommandItem = {
  keyword: string;
  category: "withdraw" | "task" | "work" | "plan" | "system";
  categoryName: string;
  description: string;
  example: string;
  syntax?: string;
  responseType: "Text Message" | "LINE Flex Card";
};

const ALL_LINE_COMMANDS: CommandItem[] = [
  // 1. Withdraw & Financial Commands
  {
    keyword: "สรุป / สรุปบิล / สรุปวันนี้",
    category: "withdraw",
    categoryName: "📊 สรุปการเงิน & เบิกบิล",
    description: "สรุปยอดรวมรายการบิลทั้งหมด ยอดรออนุมัติ ยอดอนุมัติแล้ว และยอดเงินรวมทั้งสิ้น",
    example: "สรุป",
    responseType: "Text Message"
  },
  {
    keyword: "รออนุมัติ",
    category: "withdraw",
    categoryName: "📊 สรุปการเงิน & เบิกบิล",
    description: "ดึงรายการบิลที่อยู่ระหว่างรออนุมัติ แสดงผลเป็น Flex Card การ์ดหรูสีเข้มพร้อมปุ่มลิงก์เปิดดูบนเว็บ",
    example: "รออนุมัติ",
    responseType: "LINE Flex Card"
  },
  {
    keyword: "หลัก: / บิลหลัก:",
    category: "withdraw",
    categoryName: "📊 สรุปการเงิน & เบิกบิล",
    description: "ค้นหาหรือดูรายการบิลหลักทั้งหมด หรือค้นหาเฉพาะชื่อผู้เบิก/ร้านค้า",
    example: "บิลหลัก: สมชาย",
    syntax: "บิลหลัก: [ชื่อผู้เบิก หรือ ทั้งหมด]",
    responseType: "LINE Flex Card"
  },
  {
    keyword: "ย่อย: / บิลย่อย:",
    category: "withdraw",
    categoryName: "📊 สรุปการเงิน & เบิกบิล",
    description: "ค้นหาหรือดูรายการบิลเงินสด/บิลย่อยทั้งหมด หรือค้นหาเฉพาะชื่อผู้เบิก",
    example: "ย่อย: วิชัย",
    syntax: "ย่อย: [ชื่อผู้เบิก หรือ ทั้งหมด]",
    responseType: "LINE Flex Card"
  },
  {
    keyword: "อนุมัติบิลหลักของ:",
    category: "withdraw",
    categoryName: "📊 สรุปการเงิน & เบิกบิล",
    description: "อนุมัติรายการบิลหลักของผู้เบิกหรือรหัสบิลที่ระบุ ให้เป็นสถานะ 'อนุมัติแล้ว'",
    example: "อนุมัติบิลหลักของ: สมชาย",
    syntax: "อนุมัติบิลหลักของ: [ชื่อผู้เบิก หรือ ID]",
    responseType: "Text Message"
  },
  {
    keyword: "อนุมัติเงินสดบิลย่อยของ:",
    category: "withdraw",
    categoryName: "📊 สรุปการเงิน & เบิกบิล",
    description: "อนุมัติรายการบิลเงินสดย่อยของผู้เบิก ให้เป็นสถานะ 'อนุมัติแล้ว'",
    example: "อนุมัติเงินสดบิลย่อยของ: วิชัย",
    syntax: "อนุมัติเงินสดบิลย่อยของ: [ชื่อผู้เบิก]",
    responseType: "Text Message"
  },
  {
    keyword: "ปิดงานบิลหลักลำดับที่:",
    category: "withdraw",
    categoryName: "📊 สรุปการเงิน & เบิกบิล",
    description: "เปลี่ยนสถานะบิลหลักที่จ่ายเงินเสร็จสิ้น ให้เป็นสถานะ 'เบิกแล้ว'",
    example: "ปิดงานบิลหลักลำดับที่: 101",
    syntax: "ปิดงานบิลหลักลำดับที่: [เลขลำดับบิล]",
    responseType: "Text Message"
  },

  // 2. Task Commands
  {
    keyword: "งาน: / งานด่วน:",
    category: "task",
    categoryName: "🎯 สั่งงาน & บันทึกภารกิจ",
    description: "บันทึกงานใหม่เข้าสู่ระบบ พร้อมระบุความด่วนและผู้รับผิดชอบ",
    example: "งาน: ตรวจสอบแบบโครงสร้าง ชั้น 2 [วิชัย]",
    syntax: "งาน: [รายละเอียดงาน] [ชื่อผู้รับผิดชอบ]",
    responseType: "Text Message"
  },
  {
    keyword: "ปิดงาน: / ยืนยันปิดงาน:",
    category: "task",
    categoryName: "🎯 สั่งงาน & บันทึกภารกิจ",
    description: "ปิดงานภารกิจที่ทำเสร็จแล้ว อัปเดตสถานะลง Supabase Postgres",
    example: "ปิดงาน: 102",
    syntax: "ปิดงาน: [รหัสงาน]",
    responseType: "Text Message"
  },
  {
    keyword: "s: / งาน / งานทั้งหมด",
    category: "task",
    categoryName: "🎯 สั่งงาน & บันทึกภารกิจ",
    description: "ค้นหารายการงานค้างและงานรับเหมาล่าสุด แสดงผลเป็น Flex Card สรุปงาน",
    example: "งานทั้งหมด",
    responseType: "LINE Flex Card"
  },
  {
    keyword: ":งานที่ทำ / :งานที่เสร็จ",
    category: "task",
    categoryName: "🎯 สั่งงาน & บันทึกภารกิจ",
    description: "กรองดูเฉพาะงานที่กำลังทำ หรือ งานที่ดำเนินการเสร็จสิ้นแล้ว",
    example: ":งานที่ทำ",
    responseType: "Text Message"
  },

  // 3. Work / PW Commands
  {
    keyword: "มอบหมาย: / กิจกรรม: / PW:",
    category: "work",
    categoryName: "👷‍♂️ มอบหมายงานรับเหมา (PW)",
    description: "สร้างรายการมอบหมายงานรับเหมา เสนอราคา หรือกิจกรรมสนาม พร้อมส่ง Flex Card ยืนยัน",
    example: "มอบหมาย: งานผูกเหล็กและเทคอนกรีต [ช่างเอก] ฿250,000",
    syntax: "มอบหมาย: [รายละเอียดงาน] [ผู้รับเหมา] ฿[ยอดเงิน]",
    responseType: "LINE Flex Card"
  },
  {
    keyword: "PW1:work / PWALL:work",
    category: "work",
    categoryName: "👷‍♂️ มอบหมายงานรับเหมา (PW)",
    description: "ดูรายการงานมอบหมายย่อย PW ลำดับที่ 1 หรือดูงาน PW ทั้งหมดในระบบ",
    example: "PWALL:work",
    responseType: "LINE Flex Card"
  },
  {
    keyword: "บริษัท:",
    category: "work",
    categoryName: "👷‍♂️ มอบหมายงานรับเหมา (PW)",
    description: "ระบุชื่อบริษัทสังกัดสำหรับงานรับเหมาหรือข้อตกลงสัญญาจ้าง",
    example: "บริษัท: บริษัท คอสท์แล็บ จำกัด",
    syntax: "บริษัท: [ชื่อบริษัท]",
    responseType: "Text Message"
  },

  // 4. Plan Commands
  {
    keyword: "แผน:",
    category: "plan",
    categoryName: "📐 แผนงาน & โครงการ",
    description: "ค้นหาข้อมูลโครงการ งบประมาณ และความคืบหน้าแผนงาน",
    example: "แผน: สำนักงาน A",
    syntax: "แผน: [ชื่อหรือ ID โครงการ]",
    responseType: "Text Message"
  },
  {
    keyword: "(บิลหลัก) / (บิลย่อย)",
    category: "plan",
    categoryName: "📐 แผนงาน & โครงการ",
    description: "ดูงบประมาณแผนงานเปรียบเทียบกับยอดเบิกจริงในโครงการ",
    example: "(บิลหลัก)",
    responseType: "Text Message"
  },

  // 5. System Commands
  {
    keyword: "testbot",
    category: "system",
    categoryName: "⚙️ ตรวจสอบระบบ & เครื่องมือ",
    description: "ทดสอบความพร้อมการทำงานของบอท Next.js Engine และการเชื่อมต่อ Supabase Database",
    example: "testbot",
    responseType: "Text Message"
  },
  {
    keyword: "check",
    category: "system",
    categoryName: "⚙️ ตรวจสอบระบบ & เครื่องมือ",
    description: "ตรวจสอบสถานะตารางข้อมูลใน Supabase Postgres (Bills, Projects, Works)",
    example: "check",
    responseType: "Text Message"
  },
  {
    keyword: "getid",
    category: "system",
    categoryName: "⚙️ ตรวจสอบระบบ & เครื่องมือ",
    description: "ขอรหัส LINE Target ID (User ID หรือ Group ID) เพื่อใช้นำไปตั้งค่าในระบบ",
    example: "getid",
    responseType: "Text Message"
  },
  {
    keyword: "เมนู / คำสั่ง / help",
    category: "system",
    categoryName: "⚙️ ตรวจสอบระบบ & เครื่องมือ",
    description: "แสดงเมนูคำสั่งช่วยเหลือฉบับย่อบน LINE แชท",
    example: "เมนู",
    responseType: "Text Message"
  }
];

export function LineSystemDashboardClient() {
  const [copied, setCopied] = useState(false);
  const [copiedKeyword, setCopiedKeyword] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [configSource, setConfigSource] = useState<"supabase" | "env">("env");
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testTargetId, setTestTargetId] = useState("");

  // Search & Filter State for Manual
  const [manualSearch, setManualSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

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

  function copyTextSnippet(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedKeyword(text);
    setTimeout(() => setCopiedKeyword(null), 2000);
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

  const filteredCommands = useMemo(() => {
    const query = manualSearch.trim().toLowerCase();
    return ALL_LINE_COMMANDS.filter((item) => {
      if (selectedCategory !== "all" && item.category !== selectedCategory) return false;
      if (!query) return true;
      return (
        item.keyword.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.example.toLowerCase().includes(query) ||
        (item.syntax && item.syntax.toLowerCase().includes(query))
      );
    });
  }, [manualSearch, selectedCategory]);

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* Compact Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <MessageSquare size={20} className="text-emerald-600 shrink-0" />
          <h1 className="font-extrabold text-base text-slate-900 tracking-tight">ระบบจัดการ LINE Bot & คู่มือคำสั่ง</h1>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            63 คำสั่งพร้อมใช้งาน
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
            <div className="font-bold text-slate-900 truncate">Next.js Webhook</div>
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
            <div className="font-bold text-slate-900 truncate">{formConfig.LINE_CHANNEL_ACCESS_TOKEN ? "พร้อมใช้งาน 100%" : "ยังไม่ได้ตั้งค่า"}</div>
          </div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <Radio size={16} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Target Groups</div>
            <div className="font-bold text-slate-900 truncate">5 กลุ่มระบบหลัก</div>
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
        </div>
      </form>

      {/* Full Interactive Keyword Commands Manual Section */}
      <div className="bg-white p-4.5 rounded-lg border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <BookOpen size={17} className="text-indigo-600" />
              <span>คู่มือการใช้งานคีย์เวิร์ดคำสั่ง LINE Bot (LINE Commands Manual)</span>
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              รวมคำสั่งทั้งหมด 63 คำสั่งที่ย้ายมาประมวลผลบน Supabase Postgres สามารถกดคัดลอกตัวอย่างเพื่อนำไปลองพิมพ์ในไลน์ได้ทันที
            </p>
          </div>

          {/* Search Filter Box */}
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={manualSearch}
              onChange={(e) => setManualSearch(e.target.value)}
              placeholder="ค้นหาคำสั่ง เช่น สรุป, งาน, อนุมัติ..."
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px] text-slate-800 focus:outline-none focus:border-indigo-500 w-full sm:w-64"
            />
          </div>
        </div>

        {/* Category Tabs Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { id: "all", label: "คำสั่งทั้งหมด", count: ALL_LINE_COMMANDS.length },
            { id: "withdraw", label: "📊 การเงิน & บิล", count: ALL_LINE_COMMANDS.filter((c) => c.category === "withdraw").length },
            { id: "task", label: "🎯 สั่งงาน & ภารกิจ", count: ALL_LINE_COMMANDS.filter((c) => c.category === "task").length },
            { id: "work", label: "👷‍♂️ มอบหมาย PW", count: ALL_LINE_COMMANDS.filter((c) => c.category === "work").length },
            { id: "plan", label: "📐 แผนงาน & โครงการ", count: ALL_LINE_COMMANDS.filter((c) => c.category === "plan").length },
            { id: "system", label: "⚙️ ระบบ & เช็คบอท", count: ALL_LINE_COMMANDS.filter((c) => c.category === "system").length },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedCategory(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-extrabold text-[11px] transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === tab.id
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  selectedCategory === tab.id ? "bg-indigo-500 text-white" : "bg-slate-200 text-slate-600"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Command Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredCommands.length > 0 ? (
            filteredCommands.map((cmd, idx) => (
              <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition space-y-2.5 relative group">
                <div className="flex items-start justify-between gap-2 border-b border-slate-200/60 pb-2">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                      {cmd.categoryName}
                    </span>
                    <span className="font-extrabold text-slate-900 text-xs font-mono bg-white px-2 py-0.5 rounded border border-slate-200 inline-block">
                      {cmd.keyword}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold shrink-0 border ${
                      cmd.responseType === "LINE Flex Card"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-sky-50 text-sky-700 border-sky-200"
                    }`}
                  >
                    {cmd.responseType}
                  </span>
                </div>

                <p className="text-slate-700 leading-relaxed font-medium">{cmd.description}</p>

                {cmd.syntax && (
                  <div className="text-[11px] font-mono text-slate-600 bg-slate-100 p-2 rounded-lg border border-slate-200">
                    <span className="text-slate-400 font-sans text-[10px] font-bold block mb-0.5">โครงสร้างไวยากรณ์ (Syntax):</span>
                    <code className="text-slate-800 font-bold">{cmd.syntax}</code>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-slate-400 block">ตัวอย่างพิมพ์ใน LINE:</span>
                    <code className="text-indigo-700 font-mono font-bold truncate block">{cmd.example}</code>
                  </div>

                  <button
                    type="button"
                    onClick={() => copyTextSnippet(cmd.example)}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-md border border-slate-200 text-[11px] transition flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
                  >
                    {copiedKeyword === cmd.example ? (
                      <>
                        <Check size={12} className="text-emerald-600" />
                        <span className="text-emerald-600">คัดลอกแล้ว</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} className="text-slate-500" />
                        <span>คัดลอก</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 font-medium">
              ไม่พบคำสั่งที่ตรงกับคำค้นหา "{manualSearch}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
