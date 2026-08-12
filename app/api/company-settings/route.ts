import { NextResponse } from "next/server";
import { getSystemOptionsFromSupabase, isSupabaseConfigured } from "@/lib/supabase-db";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { CompanySettings } from "@/lib/types";
import { DEFAULT_COMPANY_SETTINGS } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    let settings: CompanySettings = { ...DEFAULT_COMPANY_SETTINGS };

    if (isSupabaseConfigured()) {
      const { data, error } = await supabaseAdmin
        .from("system_options")
        .select("data")
        .eq("id", "company_settings")
        .single();

      if (!error && data && data.data) {
        settings = { ...DEFAULT_COMPANY_SETTINGS, ...data.data };
      }
    }

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: true, settings: DEFAULT_COMPANY_SETTINGS, warning: msg });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { settings } = body;

    if (!settings || typeof settings !== "object") {
      return NextResponse.json({ success: false, error: "Invalid settings payload" }, { status: 400 });
    }

    const mergedSettings: CompanySettings = {
      companyName: String(settings.companyName || DEFAULT_COMPANY_SETTINGS.companyName).trim(),
      companySubTitle: String(settings.companySubTitle || DEFAULT_COMPANY_SETTINGS.companySubTitle).trim(),
      logoUrl: String(settings.logoUrl || "").trim(),
      taxId: String(settings.taxId || "").trim(),
      address: String(settings.address || "").trim(),
      phone: String(settings.phone || "").trim(),
      email: String(settings.email || "").trim(),
    };

    if (isSupabaseConfigured()) {
      const { error } = await supabaseAdmin
        .from("system_options")
        .upsert({
          id: "company_settings",
          data: mergedSettings,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error("Failed to save company_settings to Supabase:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      message: "บันทึกข้อมูลบริษัทและโลโก้เรียบร้อยแล้ว",
      settings: mergedSettings,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

