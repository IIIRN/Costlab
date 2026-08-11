"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BriefcaseBusiness,
  Building2,
  Car,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Database,
  FolderKanban,
  Gauge,
  HandCoins,
  IdCard,
  Layers,
  LayoutGrid,
  MessageSquare,
  Package,
  PieChart,
  ReceiptText,
  Search,
  Store,
  Users,
  WalletCards,
} from "lucide-react";
import { PRIMARY_VIEWS } from "@/lib/config";
import { UserSwitcher } from "@/components/UserSwitcher";

type DualSidebarProps = {
  collapsed: boolean;
  onToggleCollapse: () => void;
  currentUser?: any;
};

const ICONS: Record<string, any> = {
  "dashboard-main": Gauge,
  "bill-entry": ReceiptText,
  "withdraw-request": WalletCards,
  "contract-open": BriefcaseBusiness,
  "bill-follow": ClipboardList,
  "work-status": FolderKanban,
  reports: PieChart,
  "project-analytics": Package,
  "project-all": FolderKanban,
  banks: WalletCards,
  categories: ClipboardList,
  stores: Store,
  contractors: Users,
  people: IdCard,
  cars: Car,
  customers: Users,
  companies: Building2,
  loans: HandCoins,
  settings: Database,
  "settings-general": Building2,
};

function hrefFor(viewId: string) {
  if (viewId === "dashboard-main") return "/";
  if (viewId === "bill-entry") return "/bills";
  if (viewId === "withdraw-request") return "/withdraw-request";
  if (viewId === "contract-open") return "/contract-open";
  if (viewId === "bill-follow") return "/bill-follow";
  if (viewId === "work-status") return "/work-status";
  if (viewId === "reports") return "/reports";
  if (viewId === "project-analytics") return "/project-analytics";
  if (viewId === "settings") return "/settings";
  if (viewId === "settings-general") return "/settings/general";
  return `/views/${viewId}`;
}

export function DualSidebar({ collapsed, onToggleCollapse, currentUser }: DualSidebarProps) {
  const pathname = usePathname();
  const [filterSearch, setFilterSearch] = useState("");
  const [companySettings, setCompanySettings] = useState({
    companyName: "CostLab Executive",
    companySubTitle: "ระบบบริหารและติดตามงบประมาณ",
    logoUrl: "",
  });

  const loadCompanySettings = async () => {
    try {
      const cached = localStorage.getItem("costlab_company_settings");
      if (cached) {
        setCompanySettings(JSON.parse(cached));
      }
      const res = await fetch("/api/company-settings");
      const json = await res.json();
      if (json.success && json.settings) {
        setCompanySettings(json.settings);
        localStorage.setItem("costlab_company_settings", JSON.stringify(json.settings));
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadCompanySettings();

    const handleUpdate = () => {
      loadCompanySettings();
    };

    window.addEventListener("company-settings-updated", handleUpdate);
    return () => {
      window.removeEventListener("company-settings-updated", handleUpdate);
    };
  }, []);

  const getInitialCategory = (path: string): "all" | "main" | "master" | "system" => {
    if (path.startsWith("/settings") || path.startsWith("/line-system") || path.startsWith("/users")) {
      return "system";
    }
    if (path.startsWith("/views/")) {
      return "master";
    }
    return "main";
  };

  const [activeCategory, setActiveCategory] = useState<"all" | "main" | "master" | "system">(() => getInitialCategory(pathname));

  // Automatically select category based on current pathname
  useEffect(() => {
    setActiveCategory(getInitialCategory(pathname));
  }, [pathname]);

  const mainViews = PRIMARY_VIEWS.filter((view) => view.position !== "menu");
  const masterViews = PRIMARY_VIEWS.filter((view) => view.position === "menu");

  const filterText = filterSearch.toLowerCase().trim();

  const filteredMainViews = mainViews.filter((v) => !filterText || v.name.toLowerCase().includes(filterText));
  const filteredMasterViews = masterViews.filter((v) => !filterText || v.name.toLowerCase().includes(filterText));

  const isSettingsActive = pathname.startsWith("/settings");
  const isGeneralSettingsActive = pathname === "/settings/general";

  // If user types search, show all sections
  const currentTab = filterText ? "all" : activeCategory;

  return (
    <aside className={`hidden md:flex fixed top-0 bottom-0 left-0 h-screen select-none bg-slate-900 text-slate-100 border-r border-slate-800 z-30 transition-all duration-300 ${collapsed ? "w-[68px]" : "w-[316px]"}`}>
      {/* 1. LEFT SLIM RAIL (Icon Rail - 68px) */}
      <div className="w-[68px] flex-shrink-0 h-full border-r border-slate-800 flex flex-col items-center justify-between py-4 bg-slate-950">
        {/* Top Brand Logo Box */}
        <div className="flex flex-col items-center gap-5">
          <Link
            href="/"
            onClick={() => {
              if (collapsed) onToggleCollapse();
            }}
            className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700/80 text-white flex items-center justify-center shadow-md hover:border-emerald-400 hover:bg-slate-800 transition-all group overflow-hidden shrink-0"
            title={companySettings.companyName || "CostCode Application"}
          >
            {companySettings.logoUrl ? (
              <img src={companySettings.logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <div className="flex gap-0.5 items-center justify-center">
                <span className="w-1 h-4 bg-emerald-400 rounded-full group-hover:h-5 transition-all" />
                <span className="w-1 h-5 bg-white rounded-full" />
                <span className="w-1 h-3 bg-emerald-400 rounded-full group-hover:h-4 transition-all" />
              </div>
            )}
          </Link>

          {/* Rail Mode Switchers */}
          <nav className="flex flex-col items-center gap-2 mt-2">
            {/* Mode 1: Main Menus (เมนูหลัก) */}
            <button
              type="button"
              onClick={() => {
                setActiveCategory("main");
                setFilterSearch("");
                if (collapsed) onToggleCollapse();
              }}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${currentTab === "main" || (currentTab === "all" && !isSettingsActive && !pathname.startsWith("/views/"))
                  ? "bg-emerald-500 text-white font-bold shadow-md shadow-emerald-500/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/80"
                }`}
              title="เมนูหลัก (WORKPLACE)"
            >
              <LayoutGrid size={20} strokeWidth={2.2} />
            </button>

            {/* Mode 2: Master Submenus (เมนูย่อย / ข้อมูลมาสเตอร์) */}
            <button
              type="button"
              onClick={() => {
                setActiveCategory("master");
                setFilterSearch("");
                if (collapsed) onToggleCollapse();
              }}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${currentTab === "master" || (currentTab === "all" && pathname.startsWith("/views/"))
                  ? "bg-emerald-500 text-white font-bold shadow-md shadow-emerald-500/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/80"
                }`}
              title="เมนูย่อย / ข้อมูลมาสเตอร์ (MANAGEMENT)"
            >
              <Layers size={20} strokeWidth={2.2} />
            </button>

            <div className="w-6 h-px bg-slate-800 my-1" />

            {/* Mode 3: System & Settings (ตั้งค่าระบบ) */}
            <button
              type="button"
              onClick={() => {
                setActiveCategory("system");
                setFilterSearch("");
                if (collapsed) onToggleCollapse();
              }}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isSettingsActive || currentTab === "system"
                  ? "bg-amber-500 text-white font-bold shadow-md shadow-amber-500/30"
                  : "text-amber-400/80 hover:text-amber-200 hover:bg-slate-800/80"
                }`}
              title="ตั้งค่าระบบ (SYSTEM)"
            >
              <Database size={20} strokeWidth={2.2} />
            </button>
          </nav>
        </div>

        {/* Bottom Rail Dock Tools */}
        <div className="flex flex-col items-center gap-3">
          {/* Toggle Expand/Collapse */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="w-9 h-9 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 flex items-center justify-center transition shadow-2xs cursor-pointer"
            title={collapsed ? "ขยายแถบข้าง" : "ย่อแถบข้าง"}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>

          {/* Notification Bell */}
          <button
            type="button"
            className="relative w-9 h-9 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 flex items-center justify-center transition cursor-pointer"
            title="การแจ้งเตือน"
          >
            <Bell size={19} />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>

          {/* User Profile Avatar (Only when collapsed to avoid redundancy) */}
          {collapsed && (
            <UserSwitcher currentUser={currentUser} compact isCollapsed theme="dark" />
          )}
        </div>
      </div>

      {/* 2. RIGHT SECONDARY DRAWER PANEL (248px) */}
      {!collapsed && (
        <div className="w-[248px] flex-shrink-0 flex flex-col h-full bg-slate-900 text-slate-100 overflow-hidden border-r border-slate-800">
          {/* Top Brand & Search Overlay Panel */}
          <div className="p-3.5 border-b border-slate-800/80 bg-slate-900/95 sticky top-0 z-10 space-y-2.5">
            {/* Expanded Company Brand Header (Text Only - Logo is on the Left Rail) */}
            <div className="px-1 py-0.5">
              <div className="text-xs font-extrabold text-white truncate leading-tight">
                {companySettings.companyName || "CostLab Executive"}
              </div>
              {companySettings.companySubTitle && (
                <div className="text-[10px] text-slate-400 font-medium truncate leading-tight mt-0.5">
                  {companySettings.companySubTitle}
                </div>
              )}
            </div>

            {/* Search Input Bar */}
            <div className="relative flex items-center h-9">
              <Search size={14} className="absolute left-3 text-slate-400 pointer-events-none z-10" />
              <input
                type="text"
                placeholder="ค้นหาเมนู..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                autoComplete="off"
                style={{ paddingLeft: "32px", paddingRight: "36px" }}
                className="w-full h-full bg-slate-950 text-white text-xs font-medium rounded-xl border border-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-slate-500 leading-normal"
              />
              <span className="absolute right-2 px-1.5 py-0.5 bg-slate-800 border border-slate-700/60 rounded text-[10px] font-mono text-slate-400 pointer-events-none">
                ⌘K
              </span>
            </div>
          </div>

          {/* Menu Items Container */}
          <div className="flex-1 overflow-y-auto p-3 space-y-5 text-xs font-medium scrollbar-thin">
            {/* SECTION 1: เมนูหลัก (WORKPLACE) */}
            {(currentTab === "all" || currentTab === "main") && (
              <div className="space-y-1">
                <div className="px-2 pb-1.5 flex items-center justify-between text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">
                  <span>เมนูหลัก (WORKPLACE)</span>
                  <span className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded-md border border-slate-700/60 font-semibold">
                    {filteredMainViews.length}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {filteredMainViews.map((view) => {
                    const href = hrefFor(view.id);
                    const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
                    const Icon = ICONS[view.id] || Gauge;
                    return (
                      <Link
                        key={view.id}
                        href={href}
                        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all ${active
                            ? "bg-emerald-500 text-white font-extrabold shadow-md shadow-emerald-500/25"
                            : "text-slate-200 hover:text-white hover:bg-slate-800/80 font-medium"
                          }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-lg flex items-center justify-center ${active ? "bg-emerald-400 text-emerald-950 font-bold" : "bg-slate-800 text-emerald-400"
                            }`}
                        >
                          <Icon size={14} strokeWidth={2.2} />
                        </span>
                        <span className="truncate">{view.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SECTION 2: เมนูย่อย / ข้อมูลมาสเตอร์ (MANAGEMENT) */}
            {(currentTab === "all" || currentTab === "master") && (
              <div className="space-y-1">
                <div className="px-2 pb-1.5 flex items-center justify-between text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">
                  <span>เมนูย่อย (MANAGEMENT)</span>
                  <span className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded-md border border-slate-700/60 font-semibold">
                    {filteredMasterViews.length}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {filteredMasterViews.map((view) => {
                    const href = hrefFor(view.id);
                    const active = pathname.startsWith(href);
                    const Icon = ICONS[view.id] || Layers;
                    return (
                      <Link
                        key={view.id}
                        href={href}
                        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all ${active
                            ? "bg-emerald-500 text-white font-extrabold shadow-md shadow-emerald-500/25"
                            : "text-slate-200 hover:text-white hover:bg-slate-800/80 font-medium"
                          }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-lg flex items-center justify-center ${active ? "bg-emerald-400 text-emerald-950 font-bold" : "bg-slate-800 text-emerald-400"
                            }`}
                        >
                          <Icon size={14} strokeWidth={2.2} />
                        </span>
                        <span className="truncate">{view.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SECTION 3: ตั้งค่าระบบ (SYSTEM & ACCOUNT) */}
            {(currentTab === "all" || currentTab === "system") && (
              <div className="space-y-1">
                <div className="px-2 pb-1.5 text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">
                  ตั้งค่าระบบ (SYSTEM & ACCOUNT)
                </div>
                <div className="space-y-0.5">
                  <Link
                    href="/settings/general"
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all ${isGeneralSettingsActive
                        ? "bg-emerald-600 text-white font-extrabold shadow-md shadow-emerald-600/25"
                        : "text-slate-200 hover:text-white hover:bg-slate-800/80 font-medium"
                      }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center ${isGeneralSettingsActive ? "bg-emerald-200 text-emerald-950 font-bold" : "bg-slate-800 text-emerald-400"
                        }`}
                    >
                      <Building2 size={14} strokeWidth={2.2} />
                    </span>
                    <span className="truncate">ตั้งค่าทั่วไป & โลโก้</span>
                  </Link>

                  <Link
                    href="/settings"
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all ${pathname === "/settings"
                        ? "bg-amber-500 text-white font-extrabold shadow-md shadow-amber-500/25"
                        : "text-slate-200 hover:text-white hover:bg-slate-800/80 font-medium"
                      }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center ${pathname === "/settings" ? "bg-amber-300 text-amber-950 font-bold" : "bg-slate-800 text-amber-400"
                        }`}
                    >
                      <Database size={14} strokeWidth={2.2} />
                    </span>
                    <span className="truncate">สถานะ Supabase</span>
                  </Link>

                  <Link
                    href="/settings/line-system"
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all ${pathname.startsWith("/settings/line-system") || pathname.startsWith("/line-system")
                        ? "bg-emerald-500 text-white font-extrabold shadow-md shadow-emerald-500/25"
                        : "text-slate-200 hover:text-white hover:bg-slate-800/80 font-medium"
                      }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center ${pathname.startsWith("/settings/line-system") || pathname.startsWith("/line-system") ? "bg-emerald-300 text-emerald-950 font-bold" : "bg-slate-800 text-emerald-400"
                        }`}
                    >
                      <MessageSquare size={14} strokeWidth={2.2} />
                    </span>
                    <span className="truncate">ระบบ LINE Bot</span>
                  </Link>

                  <Link
                    href="/settings/users"
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all ${pathname.startsWith("/settings/users") || pathname.startsWith("/users")
                        ? "bg-sky-500 text-white font-extrabold shadow-md shadow-sky-500/25"
                        : "text-slate-200 hover:text-white hover:bg-slate-800/80 font-medium"
                      }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center ${pathname.startsWith("/settings/users") || pathname.startsWith("/users") ? "bg-sky-300 text-sky-950 font-bold" : "bg-slate-800 text-sky-400"
                        }`}
                    >
                      <IdCard size={14} strokeWidth={2.2} />
                    </span>
                    <span className="truncate">จัดการผู้ใช้ระบบ</span>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel Footer (User Switcher) */}
          <div className="p-3 border-t border-slate-800/80 bg-slate-950">
            <UserSwitcher currentUser={currentUser} compact theme="dark" />
          </div>
        </div>
      )}
    </aside>
  );
}