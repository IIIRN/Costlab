"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Database,
  ExternalLink,
  HardDrive,
  RefreshCw,
  Server,
  ShieldCheck,
  Zap,
} from "lucide-react";

type StatusData = {
  isConfigured: boolean;
  maskedUrl: string;
  isAnonKeySet: boolean;
  isServiceKeySet: boolean;
  connectionOk: boolean;
  latencyMs: number;
  connectionMessage: string;
  billsBucketStatus: string;
  tableStats: Array<{
    name: string;
    table: string;
    count: number | null;
    status: string;
  }>;
};

const STATUS_CACHE_KEY = "costlab_supabase_status_cache";

export default function SettingsPage() {
  // Ensure SSR and initial client hydration match exactly to prevent hydration warnings
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  async function fetchStatus(isManual = false) {
    if (isManual) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const res = await fetch("/api/supabase-status");
      const json = await res.json();
      if (json && typeof json.connectionOk === "boolean") {
        setData(json);
        sessionStorage.setItem(STATUS_CACHE_KEY, JSON.stringify(json));
      }
    } catch (err) {
      console.error("Failed to fetch Supabase status:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    // 1. Read cache on client side after mount to avoid hydration mismatch
    let hasCache = false;
    if (typeof window !== "undefined") {
      const cached = sessionStorage.getItem(STATUS_CACHE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setData(parsed);
          setLoading(false);
          hasCache = true;
        } catch (e) {}
      }
    }

    // 2. Perform fresh fetch
    fetchStatus(!hasCache);
  }, []);

  const handleCopySql = () => {
    navigator.clipboard.writeText(`npx tsx scripts/migrate-to-supabase.ts`);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="p-3 sm:p-5 max-w-5xl mx-auto space-y-4 font-sans text-xs">
      {/* Compact Page Header Title */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <Database size={20} className="text-emerald-600 shrink-0" />
          <h1 className="font-extrabold text-base text-slate-900 tracking-tight">สถานะ Supabase Database</h1>
          {refreshing && (
            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
              <RefreshCw size={11} className="animate-spin text-emerald-600" />
              <span>กำลังปรับปรุงข้อมูล...</span>
            </span>
          )}
        </div>
        <button
          onClick={() => fetchStatus(true)}
          disabled={loading || refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg border border-slate-200 transition disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw size={13} className={loading || refreshing ? "animate-spin" : ""} />
          <span>{loading ? "กำลังตรวจสอบ..." : "รีเฟรช"}</span>
        </button>
      </div>

      {/* Metric Cards (Compact) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Card 1 */}
        <div className="bg-white border border-slate-200 p-3.5 rounded-lg shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
            <span>การเชื่อมต่อ DB</span>
            <Activity size={15} className={data?.connectionOk ? "text-emerald-600" : "text-amber-500"} />
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${data?.connectionOk ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
            <span className="font-extrabold text-slate-900 text-xs sm:text-sm truncate">
              {data?.connectionOk ? "Supabase Active" : loading ? "กำลังตรวจสอบ..." : "Sheets Fallback"}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 font-mono truncate">{data?.connectionMessage || "กำลังตรวจสอบ..."}</p>
        </div>

        {/* Card 2 */}
        <div className="bg-white border border-slate-200 p-3.5 rounded-lg shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
            <span>ความเร็ว Latency</span>
            <Zap size={15} className="text-amber-500" />
          </div>
          <div className="text-lg font-extrabold text-slate-900">
            {data?.connectionOk ? `${data.latencyMs} ms` : "-"}
          </div>
          <p className="text-[10px] text-slate-500">{data?.connectionOk ? "ตอบสนองรวดเร็ว" : "รอเชื่อมต่อ"}</p>
        </div>

        {/* Card 3 */}
        <div className="bg-white border border-slate-200 p-3.5 rounded-lg shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
            <span>Storage Bucket (รูปบิล)</span>
            <HardDrive size={15} className="text-indigo-600" />
          </div>
          <div className="font-bold text-slate-900 truncate">{data?.billsBucketStatus || "กำลังตรวจสอบ..."}</div>
          <p className="text-[10px] text-slate-500">สำหรับรูปใบเสร็จ & ไฟล์แนบ</p>
        </div>
      </div>

      {/* Environment Verification */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-3">
        <div className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5 border-b border-slate-100 pb-2">
          <ShieldCheck size={15} className="text-indigo-600" /> ตรวจสอบไฟล์ `.env.local`
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-mono text-[11px]">
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-slate-400 text-[9px] font-bold">SUPABASE_URL</div>
              <div className="text-slate-800 font-bold truncate">{data?.maskedUrl || "-"}</div>
            </div>
            {data?.isConfigured ? <CheckCircle2 size={16} className="text-emerald-600 shrink-0 ml-1" /> : <AlertTriangle size={16} className="text-amber-500 shrink-0 ml-1" />}
          </div>

          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
            <div>
              <div className="text-slate-400 text-[9px] font-bold">ANON_KEY</div>
              <div className="text-slate-800 font-bold">{data?.isAnonKeySet ? "ตั้งค่าแล้ว" : "ยังไม่ได้ตั้งค่า"}</div>
            </div>
            {data?.isAnonKeySet ? <CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> : <AlertTriangle size={16} className="text-amber-500 shrink-0" />}
          </div>

          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
            <div>
              <div className="text-slate-400 text-[9px] font-bold">SERVICE_ROLE_KEY</div>
              <div className="text-slate-800 font-bold">{data?.isServiceKeySet ? "ตั้งค่าแล้ว" : "ยังไม่ได้ตั้งค่า"}</div>
            </div>
            {data?.isServiceKeySet ? <CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> : <AlertTriangle size={16} className="text-amber-500 shrink-0" />}
          </div>
        </div>
      </div>

      {/* Database Tables Statistics */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-3">
        <div className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5 border-b border-slate-100 pb-2">
          <Server size={15} className="text-emerald-600" /> สถิติข้อมูลในตาราง (Table Stats)
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {data?.tableStats ? (
            data.tableStats.map((t) => (
              <div key={t.table} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-bold text-slate-800 truncate text-[11px]">{t.name}</div>
                  <div className="text-[9px] text-slate-400 font-mono truncate">{t.table}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-extrabold text-emerald-600 text-xs">
                    {t.count !== null ? t.count.toLocaleString() : "-"}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-4 text-center text-slate-400">
              <RefreshCw size={16} className="animate-spin mx-auto mb-1 text-emerald-600" />
              <span>กำลังโหลดสถิติตาราง...</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Action Tools */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={handleCopySql}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg border border-slate-200 transition flex items-center gap-1.5 cursor-pointer"
        >
          <Copy size={13} />
          <span>{copiedSql ? "คัดลอกคำสั่งแล้ว!" : "คัดลอกคำสั่ง Migration"}</span>
        </button>
        <a
          href="https://supabase.com/dashboard"
          target="_blank"
          rel="noreferrer"
          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-lg transition shadow-sm flex items-center gap-1.5"
        >
          <ExternalLink size={13} />
          <span>เปิด Supabase Dashboard</span>
        </a>
      </div>
    </div>
  );
}
