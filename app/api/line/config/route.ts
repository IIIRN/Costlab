import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { LINE_CONFIG } from "@/lib/line/config";

export const dynamic = "force-dynamic";

const DEFAULT_CONFIG = {
  LINE_CHANNEL_ACCESS_TOKEN: process.env.LINE_CHANNEL_ACCESS_TOKEN || LINE_CONFIG.CHANNEL_ACCESS_TOKEN || "",
  LINE_CHANNEL_SECRET: process.env.LINE_CHANNEL_SECRET || "",
  LINE_USER_ID_OWN: process.env.LINE_USER_ID_OWN || LINE_CONFIG.USER_ID_OWN || "",
  LINE_USER_ID_APPROVER: process.env.LINE_USER_ID_APPROVER || LINE_CONFIG.USER_ID_APPROVER || "",
  LINE_GROUP_ID_TASK: process.env.LINE_GROUP_ID_TASK || LINE_CONFIG.GROUP_ID_TASK || "",
  LINE_GROUP_ID_SUMMARY: process.env.LINE_GROUP_ID_SUMMARY || LINE_CONFIG.GROUP_ID_SUMMARY || "",
  LINE_GROUP_ID_PW: process.env.LINE_GROUP_ID_PW || LINE_CONFIG.GROUP_ID_PW || "",
  LINE_GROUP_ID_PLAN: process.env.LINE_GROUP_ID_PLAN || LINE_CONFIG.GROUP_ID_PLAN || "",
  LINE_GROUP_ID_FINANCE: process.env.LINE_GROUP_ID_FINANCE || LINE_CONFIG.GROUP_ID_FINANCE || "",
  LINE_GROUP_ID_PAID: process.env.LINE_GROUP_ID_PAID || LINE_CONFIG.GROUP_ID_PAID || "",
};

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("system_options")
      .select("*")
      .eq("id", "line_config")
      .maybeSingle();

    if (error) {
      console.warn("⚠️ Failed to load line_config from system_options:", error.message);
      return NextResponse.json({ success: true, config: DEFAULT_CONFIG, source: "env" });
    }

    if (data && data.data && typeof data.data === "object") {
      const mergedConfig = { ...DEFAULT_CONFIG, ...data.data };
      return NextResponse.json({ success: true, config: mergedConfig, source: "supabase" });
    }

    return NextResponse.json({ success: true, config: DEFAULT_CONFIG, source: "env" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { config } = body;

    if (!config || typeof config !== "object") {
      return NextResponse.json({ success: false, error: "Invalid config payload" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("system_options")
      .upsert({
        id: "line_config",
        data: config,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error("❌ Failed to save line_config to Supabase:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "บันทึกการตั้งค่า LINE ลง Supabase สำเร็จ!" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
