"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PRIMARY_VIEWS } from "@/lib/config";
import { IdCard, MessageSquare, Settings, Sliders } from "lucide-react";

type AppNavProps = {
  icons?: Record<string, ComponentType<{ size?: number; strokeWidth?: number }>>;
  isCollapsed?: boolean;
};

function hrefFor(view: (typeof PRIMARY_VIEWS)[number]) {
  if (view.id === "dashboard-main") return "/";
  if (view.id === "bill-entry") return "/bills";
  if (view.id === "withdraw-request") return "/withdraw-request";
  if (view.id === "contract-open") return "/contract-open";
  if (view.id === "bill-follow") return "/bill-follow";
  if (view.id === "work-status") return "/work-status";
  if (view.id === "reports") return "/reports";
  if (view.id === "project-analytics") return "/project-analytics";
  return `/views/${view.id}`;
}

export function AppNav({ icons = {}, isCollapsed = false }: AppNavProps) {
  const pathname = usePathname();

  const mainViews = PRIMARY_VIEWS.filter(view => view.position !== "menu");
  const masterViews = PRIMARY_VIEWS.filter(view => view.position === "menu");

  const renderLink = (view: (typeof PRIMARY_VIEWS)[number]) => {
    const href = hrefFor(view);
    const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
    const Icon = icons[view.id];
    return (
      <Link key={view.id} className={active ? "active" : ""} href={href} prefetch={false} title={view.name}>
        <span className="nav-icon" aria-hidden="true">
          {Icon ? <Icon size={18} strokeWidth={2.2} /> : view.name.slice(0, 1)}
        </span>
        {!isCollapsed && <span className="nav-label">{view.name}</span>}
      </Link>
    );
  };

  const isSettingsActive = pathname === "/settings";
  const isOptionsActive = pathname.startsWith("/settings/options");
  const isLineSystemActive = pathname.startsWith("/settings/line-system") || pathname.startsWith("/line-system");
  const isUsersActive = pathname.startsWith("/settings/users") || pathname.startsWith("/users");

  return (
    <nav className="nav">
      <Link
        className={isOptionsActive ? "active" : ""}
        href="/settings/options"
        prefetch={false}
        title="ตั้งค่าตัวเลือกระบบ"
      >
        <span className="nav-icon" aria-hidden="true">
          <Sliders size={18} strokeWidth={2} />
        </span>
        {!isCollapsed && <span className="nav-label font-semibold text-slate-200">ตั้งค่าตัวเลือกระบบ</span>}
      </Link>

      <Link
        className={isSettingsActive ? "active" : ""}
        href="/settings"
        prefetch={false}
        title="สถานะ Supabase"
      >
        <span className="nav-icon" aria-hidden="true">
          <Settings size={18} strokeWidth={2} />
        </span>
        {!isCollapsed && <span className="nav-label font-semibold text-slate-200">สถานะ Supabase</span>}
      </Link>

      <Link
        className={isLineSystemActive ? "active" : ""}
        href="/settings/line-system"
        prefetch={false}
        title="ระบบ LINE Bot & Webhook"
      >
        <span className="nav-icon" aria-hidden="true">
          <MessageSquare size={18} strokeWidth={2} />
        </span>
        {!isCollapsed && <span className="nav-label font-semibold text-slate-200">ระบบ LINE Bot</span>}
      </Link>

      <Link
        className={isUsersActive ? "active" : ""}
        href="/settings/users"
        prefetch={false}
        title="จัดการผู้ใช้ระบบ"
      >
        <span className="nav-icon" aria-hidden="true">
          <IdCard size={18} strokeWidth={2} />
        </span>
        {!isCollapsed && <span className="nav-label font-semibold text-slate-200">จัดการผู้ใช้ระบบ</span>}
      </Link>

      {!isCollapsed && <div className="nav-section-title mt-2">เมนูการทำงาน</div>}
      {mainViews.map(renderLink)}

      {isCollapsed ? (
        <div className="my-1.5 border-t border-white/15 w-8 mx-auto" />
      ) : (
        <div className="nav-section-title mt-2">จัดการข้อมูล</div>
      )}
      {masterViews.map(renderLink)}
    </nav>
  );
}

