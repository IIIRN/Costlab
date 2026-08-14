"use client";

import { useEffect, useState, useMemo } from "react";
import {
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
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
  Clock
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
    description: "ค้นหาหรือดูรายการบิลหลักทั้งหมด หรือค้นหาเฉพาะชื่อผู้เบิก/ร้านค้า แสดงผล Flex รูป 4 คอลัมน์",
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
    keyword: "อนุมัติบิลหลักลำดับที่: / อนุมัติเงินสดบิลย่อยลำดับที่:",
    category: "withdraw",
    categoryName: "📊 สรุปการเงิน & เบิกบิล",
    description: "อนุมัติบิลเจาะจงเฉพาะรายบิล ID (เช่น ลำดับที่ 101) เพื่อป้องกันการอนุมัติซ้ำ",
    example: "อนุมัติบิลหลักลำดับที่: 101",
    syntax: "อนุมัติบิลหลักลำดับที่: [เลขบิล ID]",
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
    keyword: "ส่ง:",
    category: "task",
    categoryName: "🎯 สั่งงาน & บันทึกภารกิจ",
    description: "สร้าง 3 งานย่อยต่อเนื่องกันอัตโนมัติ (งานปฏิบัติ -> งานส่งหัวหน้า -> งานส่งผู้รับ)",
    example: "ส่ง: งานเทคอนกรีตเสา A\nผู้รับ: ช่างเอก\nหัวหน้า: วิชัย",
    syntax: "ส่ง: [ชื่อรายการ]\nผู้รับ: [ชื่อ]\nหัวหน้า: [ชื่อ]",
    responseType: "Text Message"
  },
  {
    keyword: "ลำดับ: / รายการ: / ดู/ทำ:",
    category: "task",
    categoryName: "🎯 สั่งงาน & บันทึกภารกิจ",
    description: "สร้างหรือแก้ไขงานด้วยข้อมูลมัลติไลน์ พร้อมคัดกรองประเภทงาน (1=เอกสาร, 2=แผนงาน, 3=PJSA)",
    example: "ลำดับ: CW-101\nรายการ: ตรวจสอบแบบ\nดู/ทำ: 16/08/26\nผู้รับ: วิชัย\nประเภท: 1",
    syntax: "ลำดับ: [ID]\nรายการ: [ชื่อ]\nประเภท: [1|2|3]",
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
    keyword: "เรื่อง: / PR: / สถานที่: / นัดดู:",
    category: "work",
    categoryName: "👷‍♂️ มอบหมายงานรับเหมา (PW)",
    description: "บันทึกเปิดจ้างงานรับเหมาแบบมัลติไลน์เชิงลึก พร้อมข้อมูล PR, สถานที่ และวันนัดเสนอราคา",
    example: "เรื่อง: งานผูกเหล็ก\nPR: PR-001\nสถานที่: ไซต์ B\nนัดดู: 16/08/26\nติดต่อ1: ช่างเอก\nบริษัท: คอสท์แล็บ",
    syntax: "เรื่อง: [งาน]\nPR: [เลข PR]\nสถานที่: [ไซต์]",
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

  // 5. Shortcuts Commands
  {
    keyword: "copy / work",
    category: "system",
    categoryName: "⚡ คำสั่งลัด (Shortcuts)",
    description: "ส่งแม่แบบข้อความสำหรับสร้างงานทั่วไป",
    example: "copy",
    responseType: "Text Message"
  },
  {
    keyword: "add1",
    category: "system",
    categoryName: "⚡ คำสั่งลัด (Shortcuts)",
    description: "ส่งแม่แบบข้อความสำหรับสร้างงานมัลติไลน์",
    example: "add1",
    responseType: "Text Message"
  },
  {
    keyword: "add3",
    category: "system",
    categoryName: "⚡ คำสั่งลัด (Shortcuts)",
    description: "ส่งแม่แบบข้อความสำหรับสร้าง 3 งานย่อยต่อกัน (`ส่ง:`)",
    example: "add3",
    responseType: "Text Message"
  },
  {
    keyword: "addp",
    category: "system",
    categoryName: "⚡ คำสั่งลัด (Shortcuts)",
    description: "ส่งแม่แบบข้อความเปิดจ้าง PW มัลติไลน์ (`เรื่อง:`, `PR:`, `สถานที่:`)",
    example: "addp",
    responseType: "Text Message"
  },
  {
    keyword: "doo / doo2",
    category: "system",
    categoryName: "⚡ คำสั่งลัด (Shortcuts)",
    description: "ทางลัดดึงสรุปรายการงานค้างล่าสุด",
    example: "doo",
    responseType: "Text Message"
  },

  // 6. System Commands
  {
    keyword: "testbot / check / getid",
    category: "system",
    categoryName: "⚙️ ตรวจสอบระบบ & เครื่องมือ",
    description: "ทดสอบการทำงานบอท เช็คการเชื่อมต่อ Supabase Postgres และขอรหัส Target ID",
    example: "testbot",
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
  const [activeMainTab, setActiveMainTab] = useState<"tokens" | "schedules" | "manual" | "logs">("tokens");
  const [copied, setCopied] = useState(false);
  const [copiedKeyword, setCopiedKeyword] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [configSource, setConfigSource] = useState<"supabase" | "env">("env");
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testTargetId, setTestTargetId] = useState("");

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
    CRON_TIME_MORNING: "07:30",
    CRON_TIME_EVENING: "17:00",
  });

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/line/webhook`
    : `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") || "https://costlab-steel.vercel.app"}/api/line/webhook`;

  const [discoveredGroups, setDiscoveredGroups] = useState<any[]>([]);
  const [errorLogs, setErrorLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  async function fetchErrorLogs() {
    try {
      setLoadingLogs(true);
      const res = await fetch("/api/line/logs");
      const data = await res.json();
      if (res.ok && Array.isArray(data.logs)) {
        setErrorLogs(data.logs);
      }
    } catch (e) {
      console.error("Failed to load system error logs:", e);
    } finally {
      setLoadingLogs(false);
    }
  }

  async function handleClearLogs() {
    try {
      setLoadingLogs(true);
      const res = await fetch("/api/line/logs", { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        setErrorLogs([]);
      }
    } catch (e) {
      console.error("Failed to clear error logs:", e);
    } finally {
      setLoadingLogs(false);
    }
  }

  useEffect(() => {
    async function loadConfig() {
      try {
        setLoadingConfig(true);
        const res = await fetch("/api/line/config");
        const data = await res.json();
        if (res.ok && data.config) {
          setFormConfig(data.config);
          setConfigSource(data.source || "env");
          if (Array.isArray(data.discoveredGroups)) {
            setDiscoveredGroups(data.discoveredGroups);
          }
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
    fetchErrorLogs();
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

  async function handleTestMorningTasks() {
    setTesting(true);
    setTestResult(null);
    try {
      const url = testTargetId.trim()
        ? `/api/cron/daily-tasks?target=${encodeURIComponent(testTargetId.trim())}`
        : "/api/cron/daily-tasks";

      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: `ส่งการ์ดสรุปงานเช้า (07:30 น.) เข้า LINE ปลายทาง (${data.targetGroup || testTargetId}) เรียบร้อยแล้ว!`,
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
          message: `ส่งการ์ดสรุปรายงานเย็น (17:00 น.) เข้า LINE ปลายทาง (${data.targetGroup || testTargetId}) เรียบร้อยแล้ว!`,
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
    <div className="space-y-4 font-sans text-xs text-slate-800 max-w-7xl mx-auto pb-10">
      {/* Top Header - Compact Bills Theme */}
      <div className="bg-white p-3.5 rounded-md border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-base text-slate-900 tracking-tight">ตั้งค่าระบบ LINE Bot & คู่มือคำสั่ง</h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              V2.0 Active
            </span>
          </div>
          <p className="text-slate-600 text-xs mt-0.5">
            จัดการ Token, กำหนดเวลาส่งสรุปงานเช้า/เย็น, คู่มือคำสั่ง 63 คีย์เวิร์ด และตรวจ Error Logs
          </p>
        </div>

        {/* Global Test Target ID Input & Quick Action */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-1.5 rounded border border-slate-200">
          <input
            type="text"
            value={testTargetId}
            onChange={(e) => setTestTargetId(e.target.value)}
            placeholder="Target ID ทดสอบ..."
            className="px-2.5 py-1 bg-white border border-slate-300 rounded text-slate-900 font-mono text-xs focus:outline-none focus:border-slate-500 w-44 sm:w-48"
          />
          <button
            type="button"
            disabled={testing}
            onClick={handleTestMorningTasks}
            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded text-xs transition flex items-center gap-1 cursor-pointer disabled:opacity-50 shrink-0"
          >
            {testing ? <RefreshCw size={12} className="animate-spin" /> : <Clock size={12} />}
            <span>ยิงสรุปเช้า</span>
          </button>
          <button
            type="button"
            disabled={testing}
            onClick={handleTestNotification}
            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded text-xs transition flex items-center gap-1 cursor-pointer disabled:opacity-50 shrink-0"
          >
            {testing ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
            <span>ยิงสรุปเย็น</span>
          </button>
        </div>
      </div>

      {testResult && (
        <div
          className={`p-3 rounded-md border text-xs font-bold flex items-center justify-between gap-2 animate-in fade-in ${
            testResult.success ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-1.5">
            {testResult.success ? <CheckCircle2 size={15} /> : <Zap size={15} />}
            <span>{testResult.message}</span>
          </div>
          <button type="button" onClick={() => setTestResult(null)} className="text-slate-400 hover:text-slate-600 font-bold px-1">
            ✕
          </button>
        </div>
      )}

      {/* Main Tab Navigation Bar - Compact Bills Theme */}
      <div className="flex items-center gap-1.5 border-b border-slate-300 overflow-x-auto pb-0.5">
        <button
          type="button"
          onClick={() => setActiveMainTab("tokens")}
          className={`px-3.5 py-2 text-xs font-bold rounded-t-md transition flex items-center gap-1.5 border-t border-x cursor-pointer ${
            activeMainTab === "tokens"
              ? "bg-white text-slate-900 border-slate-300 border-b-white -mb-px shadow-sm"
              : "bg-slate-100 text-slate-600 border-transparent hover:bg-slate-200"
          }`}
        >
          <SlidersHorizontal size={14} className={activeMainTab === "tokens" ? "text-emerald-700" : "text-slate-400"} />
          <span>1. ตั้งค่า Token & Group IDs</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab("schedules")}
          className={`px-3.5 py-2 text-xs font-bold rounded-t-md transition flex items-center gap-1.5 border-t border-x cursor-pointer ${
            activeMainTab === "schedules"
              ? "bg-white text-slate-900 border-slate-300 border-b-white -mb-px shadow-sm"
              : "bg-slate-100 text-slate-600 border-transparent hover:bg-slate-200"
          }`}
        >
          <Clock size={14} className={activeMainTab === "schedules" ? "text-amber-600" : "text-slate-400"} />
          <span>2. เวลาส่งสรุปงานประจำวัน</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab("manual")}
          className={`px-3.5 py-2 text-xs font-bold rounded-t-md transition flex items-center gap-1.5 border-t border-x cursor-pointer ${
            activeMainTab === "manual"
              ? "bg-white text-slate-900 border-slate-300 border-b-white -mb-px shadow-sm"
              : "bg-slate-100 text-slate-600 border-transparent hover:bg-slate-200"
          }`}
        >
          <BookOpen size={14} className={activeMainTab === "manual" ? "text-blue-600" : "text-slate-400"} />
          <span>3. คู่มือคำสั่ง LINE Bot</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab("logs")}
          className={`px-3.5 py-2 text-xs font-bold rounded-t-md transition flex items-center gap-1.5 border-t border-x cursor-pointer ${
            activeMainTab === "logs"
              ? "bg-white text-slate-900 border-slate-300 border-b-white -mb-px shadow-sm"
              : "bg-slate-100 text-slate-600 border-transparent hover:bg-slate-200"
          }`}
        >
          <FileText size={14} className={activeMainTab === "logs" ? "text-rose-600" : "text-slate-400"} />
          <span>4. ประวัติข้อผิดพลาดระบบ (Logs)</span>
          {errorLogs.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-800 font-bold border border-rose-300">
              {errorLogs.length}
            </span>
          )}
        </button>
      </div>

      {/* ─── TAB 1: ตั้งค่า Token & Group IDs ─── */}
      {activeMainTab === "tokens" && (
        <div className="space-y-3.5 animate-in fade-in">
          {/* System Status Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white p-3 rounded-md border border-slate-200 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                <Server size={15} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-slate-500 uppercase">Engine Status</div>
                <div className="font-bold text-slate-900 text-xs truncate">Next.js Webhook</div>
              </div>
            </div>

            <div className="bg-white p-3 rounded-md border border-slate-200 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                <Database size={15} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-slate-500 uppercase">Config Source</div>
                <div className="font-bold text-slate-900 text-xs truncate">{configSource === "supabase" ? "Supabase DB" : "Environment (.env)"}</div>
              </div>
            </div>

            <div className="bg-white p-3 rounded-md border border-slate-200 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                <ShieldCheck size={15} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-slate-500 uppercase">LINE Token</div>
                <div className="font-bold text-slate-900 text-xs truncate">{formConfig.LINE_CHANNEL_ACCESS_TOKEN ? "พร้อมใช้งาน 100%" : "ยังไม่ได้ตั้งค่า"}</div>
              </div>
            </div>

            <div className="bg-white p-3 rounded-md border border-slate-200 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                <Radio size={15} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-slate-500 uppercase">Target Groups</div>
                <div className="font-bold text-slate-900 text-xs truncate">5 กลุ่มระบบหลัก</div>
              </div>
            </div>
          </div>

          {/* Webhook Configuration Section */}
          <div className="bg-white p-3.5 rounded-md border border-slate-200 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Terminal size={15} className="text-slate-700" /> Webhook URL (วางใน LINE Console)
              </span>
              <a
                href="https://developers.line.biz"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-bold text-slate-700 hover:underline flex items-center gap-1"
              >
                <span>LINE Console</span> <ExternalLink size={12} />
              </a>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={webhookUrl}
                className="flex-1 bg-slate-50 border border-slate-300 rounded px-3 py-1 font-mono text-slate-900 text-xs font-semibold focus:outline-none"
              />
              <button
                type="button"
                onClick={copyWebhook}
                className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded transition flex items-center gap-1 cursor-pointer shrink-0 text-xs"
              >
                {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                <span>{copied ? "คัดลอกแล้ว" : "คัดลอก URL"}</span>
              </button>
            </div>
          </div>

          {/* Discovered Groups Panel */}
          {discoveredGroups.length > 0 && (
            <div className="bg-amber-50/70 p-3.5 rounded-md border border-amber-200 space-y-2">
              <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
                <span className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                  <Radio size={15} className="text-amber-700 animate-pulse" />
                  <span>รหัสกลุ่ม LINE ที่บอทตรวจพบอัตโนมัติ (Discovered LINE Groups)</span>
                </span>
                <span className="text-[10px] font-bold text-amber-900 bg-amber-200 px-2 py-0.5 rounded border border-amber-300">
                  พบ {discoveredGroups.length} กลุ่ม
                </span>
              </div>
              <p className="text-slate-600 text-xs">
                เมื่อพิมพ์คำสั่งในกลุ่ม LINE บอทจะตรวจจับ Group ID อัตโนมัติ สามารถกดคัดลอกรหัส <code className="font-mono font-bold bg-white px-1 border border-amber-300 rounded text-amber-900">C...</code> ไปใส่ในช่อง Group ID ด้านล่างได้ทันที:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                {discoveredGroups.map((g: any, idx: number) => (
                  <div key={idx} className="bg-white p-2 rounded border border-amber-200 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-bold text-slate-900 block text-xs truncate">{g.name || "LINE Group"}</span>
                      <code className="text-[11px] font-mono text-amber-900 font-bold truncate block">{g.groupId}</code>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyTextSnippet(g.groupId)}
                      className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold rounded text-[10px] transition shrink-0 border border-amber-300"
                    >
                      {copiedKeyword === g.groupId ? "คัดลอกแล้ว" : "คัดลอก ID"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Form: Editable LINE Configurations */}
          <form onSubmit={handleSaveConfig} className="bg-white p-4 rounded-md border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <SlidersHorizontal size={15} className="text-slate-700" /> ตั้งค่า Token & Group IDs (บันทึกลง Supabase)
              </span>
              <button
                type="submit"
                disabled={savingConfig || loadingConfig}
                className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded transition flex items-center gap-1 cursor-pointer disabled:opacity-50 text-xs"
              >
                {savingConfig ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                <span>{savingConfig ? "บันทึก..." : "บันทึกข้อมูล"}</span>
              </button>
            </div>

            {saveResult && (
              <div
                className={`p-3 rounded-md border text-xs font-bold flex items-center justify-between gap-2 animate-in fade-in ${
                  saveResult.success ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {saveResult.success ? <CheckCircle2 size={15} /> : <Zap size={15} />}
                  <span>{saveResult.message}</span>
                </div>
                <button type="button" onClick={() => setSaveResult(null)} className="text-slate-400 hover:text-slate-600 font-bold">
                  ✕
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Credentials */}
              <div className="sm:col-span-2 border-b border-slate-100 pb-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">🔑 Credentials (Token & Secret)</span>
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="font-bold text-slate-700 block text-xs">LINE Channel Access Token *</label>
                <div className="relative flex items-center">
                  <input
                    type={showToken ? "text" : "password"}
                    required
                    value={formConfig.LINE_CHANNEL_ACCESS_TOKEN}
                    onChange={(e) => setFormConfig({ ...formConfig, LINE_CHANNEL_ACCESS_TOKEN: e.target.value })}
                    placeholder="วาง Access Token..."
                    className="w-full bg-white border border-slate-300 rounded pl-3 pr-8 py-1.5 font-mono text-slate-900 text-xs focus:outline-none focus:border-slate-500"
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

              <div className="sm:col-span-2 space-y-1">
                <label className="font-bold text-slate-700 block text-xs">LINE Channel Secret</label>
                <div className="relative flex items-center">
                  <input
                    type={showSecret ? "text" : "password"}
                    value={formConfig.LINE_CHANNEL_SECRET}
                    onChange={(e) => setFormConfig({ ...formConfig, LINE_CHANNEL_SECRET: e.target.value })}
                    placeholder="วาง Channel Secret..."
                    className="w-full bg-white border border-slate-300 rounded pl-3 pr-8 py-1.5 font-mono text-slate-900 text-xs focus:outline-none focus:border-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* User IDs */}
              <div className="sm:col-span-2 border-b border-slate-100 pb-1 mt-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">👤 User IDs (ผู้ดูแลระบบ)</span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 text-xs">USER_ID_OWN (เจ้าของ)</label>
                  <button type="button" onClick={() => setTestTargetId(formConfig.LINE_USER_ID_OWN)} className="text-[10px] text-slate-500 hover:underline">
                    ใส่ช่องทดสอบ
                  </button>
                </div>
                <input
                  type="text"
                  value={formConfig.LINE_USER_ID_OWN}
                  onChange={(e) => setFormConfig({ ...formConfig, LINE_USER_ID_OWN: e.target.value })}
                  placeholder="Uxxxxxxxx... (เจ้าของระบบ)"
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 font-mono text-slate-900 text-xs focus:outline-none focus:border-slate-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 text-xs">USER_ID_APPROVER (ผู้อนุมัติ)</label>
                  <button type="button" onClick={() => setTestTargetId(formConfig.LINE_USER_ID_APPROVER)} className="text-[10px] text-slate-500 hover:underline">
                    ใส่ช่องทดสอบ
                  </button>
                </div>
                <input
                  type="text"
                  value={formConfig.LINE_USER_ID_APPROVER}
                  onChange={(e) => setFormConfig({ ...formConfig, LINE_USER_ID_APPROVER: e.target.value })}
                  placeholder="Uxxxxxxxx... (ผู้อนุมัติ)"
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 font-mono text-slate-900 text-xs focus:outline-none focus:border-slate-500"
                />
              </div>

              {/* Group IDs */}
              <div className="sm:col-span-2 border-b border-slate-100 pb-1 mt-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">📢 Group IDs (กลุ่ม LINE ปลายทาง)</span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 text-xs">GROUP_ID_TASK (งานทั่วไป)</label>
                  <button type="button" onClick={() => setTestTargetId(formConfig.LINE_GROUP_ID_TASK)} className="text-[10px] text-slate-500 hover:underline">ใส่ช่องทดสอบ</button>
                </div>
                <input
                  type="text"
                  value={formConfig.LINE_GROUP_ID_TASK}
                  onChange={(e) => setFormConfig({ ...formConfig, LINE_GROUP_ID_TASK: e.target.value })}
                  placeholder="Cxxxxxxxx... (กลุ่มงานทั่วไป)"
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 font-mono text-slate-900 text-xs focus:outline-none focus:border-slate-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 text-xs">GROUP_ID_PW (งานรับเหมา PW)</label>
                  <button type="button" onClick={() => setTestTargetId(formConfig.LINE_GROUP_ID_PW)} className="text-[10px] text-slate-500 hover:underline">ใส่ช่องทดสอบ</button>
                </div>
                <input
                  type="text"
                  value={formConfig.LINE_GROUP_ID_PW}
                  onChange={(e) => setFormConfig({ ...formConfig, LINE_GROUP_ID_PW: e.target.value })}
                  placeholder="Cxxxxxxxx... (กลุ่มงาน PW)"
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 font-mono text-slate-900 text-xs focus:outline-none focus:border-slate-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 text-xs">GROUP_ID_SUMMARY (สรุปงานประจำวัน)</label>
                  <button type="button" onClick={() => setTestTargetId(formConfig.LINE_GROUP_ID_SUMMARY)} className="text-[10px] text-slate-500 hover:underline">ใส่ช่องทดสอบ</button>
                </div>
                <input
                  type="text"
                  value={formConfig.LINE_GROUP_ID_SUMMARY}
                  onChange={(e) => setFormConfig({ ...formConfig, LINE_GROUP_ID_SUMMARY: e.target.value })}
                  placeholder="Cxxxxxxxx... (กลุ่มสรุปรายงาน)"
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 font-mono text-slate-900 text-xs focus:outline-none focus:border-slate-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 text-xs">GROUP_ID_PLAN (แผนงานโครงการ)</label>
                  <button type="button" onClick={() => setTestTargetId(formConfig.LINE_GROUP_ID_PLAN)} className="text-[10px] text-slate-500 hover:underline">ใส่ช่องทดสอบ</button>
                </div>
                <input
                  type="text"
                  value={formConfig.LINE_GROUP_ID_PLAN}
                  onChange={(e) => setFormConfig({ ...formConfig, LINE_GROUP_ID_PLAN: e.target.value })}
                  placeholder="Cxxxxxxxx... (กลุ่มแผนงาน)"
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 font-mono text-slate-900 text-xs focus:outline-none focus:border-slate-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 text-xs">GROUP_ID_FINANCE (การเงินและเบิกบิล)</label>
                  <button type="button" onClick={() => setTestTargetId(formConfig.LINE_GROUP_ID_FINANCE)} className="text-[10px] text-slate-500 hover:underline">ใส่ช่องทดสอบ</button>
                </div>
                <input
                  type="text"
                  value={formConfig.LINE_GROUP_ID_FINANCE}
                  onChange={(e) => setFormConfig({ ...formConfig, LINE_GROUP_ID_FINANCE: e.target.value })}
                  placeholder="Cxxxxxxxx... (กลุ่มการเงิน)"
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 font-mono text-slate-900 text-xs focus:outline-none focus:border-slate-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 text-xs">GROUP_ID_PAID (บิลจ่ายเงินเรียบร้อย)</label>
                  <button type="button" onClick={() => setTestTargetId(formConfig.LINE_GROUP_ID_PAID)} className="text-[10px] text-slate-500 hover:underline">ใส่ช่องทดสอบ</button>
                </div>
                <input
                  type="text"
                  value={formConfig.LINE_GROUP_ID_PAID}
                  onChange={(e) => setFormConfig({ ...formConfig, LINE_GROUP_ID_PAID: e.target.value })}
                  placeholder="Cxxxxxxxx... (กลุ่มจ่ายแล้ว)"
                  className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 font-mono text-slate-900 text-xs focus:outline-none focus:border-slate-500"
                />
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ─── TAB 2: เวลาส่งสรุปงานประจำวัน (เช้า/เย็น) ─── */}
      {activeMainTab === "schedules" && (
        <div className="space-y-3.5 animate-in fade-in">
          <form onSubmit={handleSaveConfig} className="bg-white p-4 rounded-md border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-2 gap-2">
              <div>
                <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Clock size={15} className="text-amber-600" />
                  <span>ตั้งค่าเวลาส่งสรุปและแจ้งเตือนอัตโนมัติประจำวัน (Daily Cron Alert Times)</span>
                </span>
              </div>
              <button
                type="submit"
                disabled={savingConfig || loadingConfig}
                className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded transition flex items-center gap-1 cursor-pointer disabled:opacity-50 text-xs shrink-0"
              >
                {savingConfig ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                <span>{savingConfig ? "บันทึก..." : "บันทึกเวลาที่ตั้งค่า"}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Morning Schedule Box */}
              <div className="p-3.5 rounded-md border border-amber-200 bg-amber-50/50 space-y-2">
                <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
                  <span className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                    ☀️ สรุปงานประจำวันช่วงเช้า (Morning Tasks Alert)
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900">
                    3 แท็บ Carousel
                  </span>
                </div>
                <p className="text-slate-600 text-xs leading-relaxed">
                  ส่งแจ้งเตือนรายการงานค้างประจำวัน, รายการเปิดจ้าง PW และรายการบิลตั้งเบิกที่อยู่ระหว่างรออนุมัติ
                </p>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block text-xs">เวลาแจ้งเตือนช่วงเช้า:</label>
                  <input
                    type="text"
                    value={formConfig.CRON_TIME_MORNING || "07:30"}
                    onChange={(e) => setFormConfig({ ...formConfig, CRON_TIME_MORNING: e.target.value })}
                    placeholder="07:30"
                    className="w-full bg-white border border-amber-300 rounded px-3 py-1 font-mono text-amber-950 font-bold text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="pt-1">
                  <button
                    type="button"
                    disabled={testing}
                    onClick={handleTestMorningTasks}
                    className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded text-xs transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {testing ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                    <span>ทดสอบยิงสรุปงานเช้าเข้า LINE ({formConfig.CRON_TIME_MORNING || "07:30"} น.)</span>
                  </button>
                </div>
              </div>

              {/* Evening Schedule Box */}
              <div className="p-3.5 rounded-md border border-slate-300 bg-slate-50/70 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    📊 สรุปผลงานทีม & การเงินช่วงเย็น (Evening Summary)
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-800">
                    3 แท็บ Carousel
                  </span>
                </div>
                <p className="text-slate-600 text-xs leading-relaxed">
                  สรุปยอดเงินรวมรายการบิล, อัตราความสำเร็จผลงานทีม (Success Rate %), และรายการงานค้างที่ต้องติดตาม
                </p>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block text-xs">เวลาแจ้งเตือนช่วงเย็น:</label>
                  <input
                    type="text"
                    value={formConfig.CRON_TIME_EVENING || "17:00"}
                    onChange={(e) => setFormConfig({ ...formConfig, CRON_TIME_EVENING: e.target.value })}
                    placeholder="17:00"
                    className="w-full bg-white border border-slate-300 rounded px-3 py-1 font-mono text-slate-900 font-bold text-sm focus:outline-none focus:border-slate-500"
                  />
                </div>
                <div className="pt-1">
                  <button
                    type="button"
                    disabled={testing}
                    onClick={handleTestNotification}
                    className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded text-xs transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {testing ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                    <span>ทดสอบยิงสรุปผลงานเย็นเข้า LINE ({formConfig.CRON_TIME_EVENING || "17:00"} น.)</span>
                  </button>
                </div>
              </div>
            </div>
          </form>

          {/* Vercel Cron Status Box */}
          <div className="bg-white p-3.5 rounded-md border border-slate-200 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
              <Server size={15} className="text-emerald-700" />
              <span>การประมวลผลอัตโนมัติ (Vercel Serverless Cron Engine)</span>
            </div>
            <p className="text-slate-600 text-xs leading-relaxed">
              ระบบใช้ไฟล์ตั้งค่า <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-900 font-bold border border-slate-200">vercel.json</code> ในการสั่งให้ Vercel Serverless Function ทำงานอัตโนมัติทุกวันตามเวลาที่ระบุ
            </p>
          </div>
        </div>
      )}

      {/* ─── TAB 3: คู่มือคำสั่ง LINE Bot (LINE Commands Manual) ─── */}
      {activeMainTab === "manual" && (
        <div className="bg-white p-4 rounded-md border border-slate-200 space-y-3 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-200 pb-2.5">
            <div>
              <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <BookOpen size={15} className="text-blue-600" />
                <span>คู่มือการใช้งานคีย์เวิร์ดคำสั่ง LINE Bot (LINE Commands Manual)</span>
              </span>
              <p className="text-slate-500 text-[11px] mt-0.5">
                รวม 63 คำสั่ง สามารถกดคัดลอกตัวอย่างเพื่อนำไปลองพิมพ์ในไลน์ได้ทันที
              </p>
            </div>

            {/* Search Filter Box */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={manualSearch}
                onChange={(e) => setManualSearch(e.target.value)}
                placeholder="ค้นหาคำสั่ง..."
                className="pl-7 pr-3 py-1 bg-white border border-slate-300 rounded font-mono text-xs text-slate-900 focus:outline-none focus:border-slate-500 w-full sm:w-56"
              />
            </div>
          </div>

          {/* Category Tabs Filter */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {[
              { id: "all", label: "ทั้งหมด", count: ALL_LINE_COMMANDS.length },
              { id: "withdraw", label: "การเงิน & บิล", count: ALL_LINE_COMMANDS.filter((c) => c.category === "withdraw").length },
              { id: "task", label: "สั่งงาน", count: ALL_LINE_COMMANDS.filter((c) => c.category === "task").length },
              { id: "work", label: "มอบหมาย PW", count: ALL_LINE_COMMANDS.filter((c) => c.category === "work").length },
              { id: "plan", label: "แผนงาน", count: ALL_LINE_COMMANDS.filter((c) => c.category === "plan").length },
              { id: "system", label: "ระบบ & คำสั่งลัด", count: ALL_LINE_COMMANDS.filter((c) => c.category === "system").length },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCategory(tab.id)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition shrink-0 cursor-pointer flex items-center gap-1 border ${
                  selectedCategory === tab.id
                    ? "bg-slate-900 text-white border-slate-900 font-bold"
                    : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    selectedCategory === tab.id ? "bg-slate-800 text-white" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Command Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {filteredCommands.length > 0 ? (
              filteredCommands.map((cmd, idx) => (
                <div key={idx} className="p-3 rounded-md border border-slate-200 bg-white hover:border-slate-300 transition space-y-2">
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-1.5">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                        {cmd.categoryName}
                      </span>
                      <span className="font-bold text-slate-900 text-xs font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block">
                        {cmd.keyword}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 border ${
                        cmd.responseType === "LINE Flex Card"
                          ? "bg-slate-100 text-slate-800 border-slate-200"
                          : "bg-slate-50 text-slate-700 border-slate-200"
                      }`}
                    >
                      {cmd.responseType}
                    </span>
                  </div>

                  <p className="text-slate-700 text-xs leading-normal font-normal">{cmd.description}</p>

                  {cmd.syntax && (
                    <div className="text-[11px] font-mono text-slate-700 bg-slate-50 p-2 rounded border border-slate-200 whitespace-pre-wrap">
                      <span className="text-slate-500 font-sans text-[10px] font-bold block mb-0.5">ไวยากรณ์ (Syntax):</span>
                      <code className="text-slate-900 font-bold">{cmd.syntax}</code>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold text-slate-500 block">ตัวอย่างพิมพ์ใน LINE:</span>
                      <code className="text-slate-900 font-mono font-bold text-xs truncate block">{cmd.example}</code>
                    </div>

                    <button
                      type="button"
                      onClick={() => copyTextSnippet(cmd.example)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold rounded border border-slate-300 text-[11px] transition flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      {copiedKeyword === cmd.example ? (
                        <>
                          <Check size={12} className="text-emerald-700" />
                          <span>คัดลอกแล้ว</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>คัดลอก</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-8 text-center bg-slate-50 rounded border border-dashed border-slate-300 text-slate-600">
                <Search size={20} className="mx-auto mb-1 opacity-40 text-slate-500" />
                <p className="font-bold text-xs text-slate-900">ไม่พบคำสั่งที่ตรงกับคำค้นหา "{manualSearch}"</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 4: ประวัติข้อผิดพลาดระบบ (System Error Logs) ─── */}
      {activeMainTab === "logs" && (
        <div className="bg-white p-4 rounded-md border border-slate-200 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div>
              <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <FileText size={15} className="text-rose-600" />
                <span>ประวัติข้อผิดพลาดระบบ (System Error Logs Inspector)</span>
              </span>
              <p className="text-slate-500 text-[11px] mt-0.5">
                ติดตามและตรวจสอบรายการข้อผิดพลาดจากการประมวลผลคำสั่ง LINE Bot ย้อนหลัง Real-time
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={fetchErrorLogs}
                disabled={loadingLogs}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold rounded border border-slate-300 text-xs transition flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw size={13} className={loadingLogs ? "animate-spin" : ""} />
                <span>รีเฟรช</span>
              </button>
              {errorLogs.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearLogs}
                  disabled={loadingLogs}
                  className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold rounded border border-rose-300 text-xs transition flex items-center gap-1 cursor-pointer"
                >
                  <span>ล้างประวัติ</span>
                </button>
              )}
            </div>
          </div>

          {errorLogs.length > 0 ? (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {errorLogs.map((log: any, idx: number) => (
                <div key={idx} className="p-3 rounded bg-rose-50 border border-rose-200 space-y-1.5 font-mono text-xs">
                  <div className="flex items-center justify-between text-rose-950 font-bold">
                    <span className="bg-rose-200 text-rose-950 px-2 py-0.5 rounded text-[10px] border border-rose-300">
                      [{log.source || "System"}]
                    </span>
                    <span className="text-[11px] text-slate-500 font-normal">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString("th-TH") : "-"}
                    </span>
                  </div>
                  <p className="text-rose-900 font-bold leading-normal text-xs">{log.message}</p>
                  {log.context && Object.keys(log.context).length > 0 && (
                    <div className="text-[11px] text-slate-700 bg-white p-2 rounded border border-rose-200 overflow-x-auto font-mono">
                      {JSON.stringify(log.context, null, 2)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center bg-slate-50 rounded border border-dashed border-slate-300 text-slate-600">
              <CheckCircle2 size={24} className="mx-auto mb-1 text-emerald-600 opacity-90" />
              <p className="font-bold text-xs text-slate-900">ไม่พบประวัติข้อผิดพลาดในระบบ (System Log Clean 100%)</p>
              <p className="text-[11px] text-slate-400 mt-0.5">ระบบทำงานราบรื่นและบันทึกประวัติการทำงานลง Supabase เสมอ</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
