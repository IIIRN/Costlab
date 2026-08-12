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
  Sliders,
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
    <aside className={`hidden md:flex fixed top-0 bottom-0 left-0 h-screen select-none bg-slate-800 text-slate-100 border-r border-slate-700/80 z-30 transition-all duration-300 ${collapsed ? "w-[68px]" : "w-[316px]"}`}>
      {/* 1. LEFT SLIM RAIL (Icon Rail - 68px) */}
      <div className="w-[68px] flex-shrink-0 h-full border-r border-slate-700/70 flex flex-col items-center justify-between py-4 bg-slate-900">
        {/* Top Brand Logo Box */}
        <div className="flex flex-col items-center gap-4">
          <Link
            href="/"
            onClick={() => {
              if (collapsed) onToggleCollapse();
            }}
            className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 text-white flex items-center justify-center hover:border-emerald-500 hover:bg-slate-700 transition group overflow-hidden shrink-0"
            title={companySettings.companyName || "CostCode Application"}
          >
            {companySettings.logoUrl ? (
              <img src={companySettings.logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <div className="flex gap-0.5 items-center justify-center">
                <span className="w-1 h-4 bg-emerald-400 rounded-full" />
                <span className="w-1 h-5 bg-white rounded-full" />
                <span className="w-1 h-3 bg-emerald-400 rounded-full" />
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
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition ${
                currentTab === "main" || (currentTab === "all" && !isSettingsActive && !pathname.startsWith("/views/"))
                  ? "bg-emerald-600 text-white font-bold shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
              title="เมนูหลัก (WORKPLACE)"
            >
              <LayoutGrid size={19} />
            </button>

            {/* Mode 2: Master Submenus (เมนูย่อย / ข้อมูลมาสเตอร์) */}
            <button
              type="button"
              onClick={() => {
                setActiveCategory("master");
                setFilterSearch("");
                if (collapsed) onToggleCollapse();
              }}
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition ${
                currentTab === "master" || (currentTab === "all" && pathname.startsWith("/views/"))
                  ? "bg-sky-600 text-white font-bold shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
              title="เมนูย่อย / ข้อมูลมาสเตอร์ (MANAGEMENT)"
            >
              <Layers size={19} />
            </button>

            <div className="w-6 h-px bg-slate-700/60 my-1" />

            {/* Mode 3: System & Settings (ตั้งค่าระบบ) */}
            <button
              type="button"
              onClick={() => {
                setActiveCategory("system");
                setFilterSearch("");
                if (collapsed) onToggleCollapse();
              }}
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition ${
                isSettingsActive || currentTab === "system"
                  ? "bg-amber-600 text-white font-bold shadow-sm"
                  : "text-slate-400 hover:text-amber-300 hover:bg-slate-800"
              }`}
              title="ตั้งค่าระบบ (SYSTEM)"
            >
              <Database size={19} />
            </button>
          </nav>
        </div>

        {/* Bottom Rail Dock Tools */}
        <div className="flex flex-col items-center gap-2">
          {/* Toggle Expand/Collapse */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="w-9 h-9 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 flex items-center justify-center transition cursor-pointer"
            title={collapsed ? "ขยายแถบข้าง" : "ย่อแถบข้าง"}
          >
            {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
          </button>

          {/* Notification Bell */}
          <button
            type="button"
            className="relative w-9 h-9 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 flex items-center justify-center transition cursor-pointer"
            title="การแจ้งเตือน"
          >
            <Bell size={18} />
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
        <div className="w-[248px] flex-shrink-0 flex flex-col h-full bg-slate-800/95 text-slate-100 overflow-hidden border-r border-slate-700/60">
          {/* Top Brand & Search Overlay Panel */}
          <div className="p-3 border-b border-slate-700/70 bg-slate-800 sticky top-0 z-10 space-y-2">
            {/* Expanded Company Brand Header (Text Only - Logo is on the Left Rail) */}
            <div className="px-1 py-0.5">
              <div className="text-xs font-bold text-white truncate leading-tight">
                {companySettings.companyName || "CostLab Executive"}
              </div>
              {companySettings.companySubTitle && (
                <div className="text-[11px] text-slate-400 font-normal truncate leading-tight mt-0.5">
                  {companySettings.companySubTitle}
                </div>
              )}
            </div>

            {/* Search Input Bar */}
            <div className="relative flex items-center">
              <Search size={14} className="absolute left-2.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="ค้นหาเมนู..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                autoComplete="off"
                className="w-full bg-slate-900 text-white text-xs pl-8 pr-3 py-1.5 rounded-md border border-slate-700 focus:border-slate-500 focus:outline-none placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Menu Items Container */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs font-normal">
            {/* SECTION 1: เมนูหลัก (WORKPLACE) */}
            {(currentTab === "all" || currentTab === "main") && (
              <div className="space-y-1">
                <div className="px-2 pb-1 flex items-center justify-between text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  <span>เมนูหลัก (WORKPLACE)</span>
                  <span className="text-[10px] bg-slate-700 text-emerald-300 px-1.5 py-0.2 rounded border border-slate-600 font-semibold">
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
                        className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md transition ${
                          active
                            ? "bg-slate-700 text-white font-bold border-l-2 border-emerald-400"
                            : "text-slate-300 hover:text-white hover:bg-slate-700/60 font-normal"
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded flex items-center justify-center ${
                            active ? "bg-emerald-600 text-white font-bold" : "bg-slate-700/80 text-emerald-400"
                          }`}
                        >
                          <Icon size={13} />
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
                <div className="px-2 pb-1 flex items-center justify-between text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  <span>เมนูย่อย (MANAGEMENT)</span>
                  <span className="text-[10px] bg-slate-700 text-sky-300 px-1.5 py-0.2 rounded border border-slate-600 font-semibold">
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
                        className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md transition ${
                          active
                            ? "bg-slate-700 text-white font-bold border-l-2 border-sky-400"
                            : "text-slate-300 hover:text-white hover:bg-slate-700/60 font-normal"
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded flex items-center justify-center ${
                            active ? "bg-sky-600 text-white font-bold" : "bg-slate-700/80 text-sky-400"
                          }`}
                        >
                          <Icon size={13} />
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
                <div className="px-2 pb-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  ตั้งค่าระบบ (SYSTEM & ACCOUNT)
                </div>
                <div className="space-y-0.5">
                  <Link
                    href="/settings/general"
                    className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md transition ${
                      isGeneralSettingsActive
                        ? "bg-slate-700 text-white font-bold border-l-2 border-amber-400"
                        : "text-slate-300 hover:text-white hover:bg-slate-700/60 font-normal"
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded flex items-center justify-center ${
                        isGeneralSettingsActive ? "bg-amber-600 text-white font-bold" : "bg-slate-700/80 text-amber-400"
                      }`}
                    >
                      <Building2 size={13} />
                    </span>
                    <span className="truncate">ตั้งค่าทั่วไป & โลโก้</span>
                  </Link>

                  <Link
                    href="/settings"
                    className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md transition ${
                      pathname === "/settings"
                        ? "bg-slate-700 text-white font-bold border-l-2 border-amber-400"
                        : "text-slate-300 hover:text-white hover:bg-slate-700/60 font-normal"
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded flex items-center justify-center ${
                        pathname === "/settings" ? "bg-amber-600 text-white font-bold" : "bg-slate-700/80 text-amber-400"
                      }`}
                    >
                      <Database size={13} />
                    </span>
                    <span className="truncate">สถานะ Supabase</span>
                  </Link>

                  <Link
                    href="/settings/options"
                    className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md transition ${
                      pathname.startsWith("/settings/options")
                        ? "bg-slate-700 text-white font-bold border-l-2 border-purple-400"
                        : "text-slate-300 hover:text-white hover:bg-slate-700/60 font-normal"
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded flex items-center justify-center ${
                        pathname.startsWith("/settings/options") ? "bg-purple-600 text-white font-bold" : "bg-slate-700/80 text-purple-400"
                      }`}
                    >
                      <Sliders size={13} />
                    </span>
                    <span className="truncate">ตั้งค่าตัวเลือกระบบ</span>
                  </Link>

                  <Link
                    href="/settings/line-system"
                    className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md transition ${
                      pathname.startsWith("/settings/line-system") || pathname.startsWith("/line-system")
                        ? "bg-slate-700 text-white font-bold border-l-2 border-emerald-400"
                        : "text-slate-300 hover:text-white hover:bg-slate-700/60 font-normal"
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded flex items-center justify-center ${
                        pathname.startsWith("/settings/line-system") || pathname.startsWith("/line-system") ? "bg-emerald-600 text-white font-bold" : "bg-slate-700/80 text-emerald-400"
                      }`}
                    >
                      <MessageSquare size={13} />
                    </span>
                    <span className="truncate">ระบบ LINE Bot</span>
                  </Link>

                  <Link
                    href="/settings/users"
                    className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md transition ${
                      pathname.startsWith("/settings/users") || pathname.startsWith("/users")
                        ? "bg-slate-700 text-white font-bold border-l-2 border-sky-400"
                        : "text-slate-300 hover:text-white hover:bg-slate-700/60 font-normal"
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded flex items-center justify-center ${
                        pathname.startsWith("/settings/users") || pathname.startsWith("/users") ? "bg-sky-600 text-white font-bold" : "bg-slate-700/80 text-sky-400"
                      }`}
                    >
                      <IdCard size={13} />
                    </span>
                    <span className="truncate">จัดการผู้ใช้ระบบ</span>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel Footer (User Switcher) */}
          <div className="p-3 border-t border-slate-700/80 bg-slate-900">
            <UserSwitcher currentUser={currentUser} compact theme="dark" />
          </div>
        </div>
      )}
    </aside>
  );
}
