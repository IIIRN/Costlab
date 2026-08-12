import { NextRequest, NextResponse } from "next/server";
import { sendFlexMessageDetailed, createDailySummaryFlex } from "@/lib/line";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // 1. Check custom target query parameter ?target=...
    const searchTarget = req.nextUrl.searchParams.get("target")?.trim();

    // 2. Fetch dynamic LINE config from Supabase system_options
    const { data: configRow } = await supabaseAdmin
      .from("system_options")
      .select("data")
      .eq("id", "line_config")
      .maybeSingle();

    const config = configRow?.data || {};

    // Pure dynamic resolution without hardcoded fallback strings
    const targetGroup =
      searchTarget ||
      config.LINE_GROUP_ID_SUMMARY ||
      config.LINE_GROUP_ID_FINANCE ||
      config.LINE_USER_ID_OWN;

    if (!targetGroup) {
      return NextResponse.json(
        { error: "ไม่พบรหัสปลายทาง! กรุณาระบุรหัสกลุ่มไลน์หรือ User ID ในช่องทดสอบ หรือบันทึกในหน้าตั้งค่าก่อนครับ" },
        { status: 400 }
      );
    }

    // 3. Fetch summary statistics from Supabase PostgreSQL
    const { data: bills, error } = await supabaseAdmin.from("bills").select("amount, status");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const totalBills = bills?.length || 0;
    const totalAmount = bills?.reduce((acc, b) => acc + (Number(b.amount) || 0), 0) || 0;
    const pendingCount = bills?.filter((b) => b.status === "รอตรวจสอบ" || b.status === "รออนุมัติ").length || 0;
    const approvedCount = bills?.filter((b) => b.status === "อนุมัติแล้ว" || b.status === "จ่ายแล้ว").length || 0;

    const todayStr = new Date().toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    const flex = createDailySummaryFlex({
      dateStr: todayStr,
      totalBills,
      totalAmount,
      pendingCount,
      approvedCount,
    });

    const sendResult = await sendFlexMessageDetailed(targetGroup, `📊 สรุปรายงานประจำวัน ${todayStr}`, flex);

    if (!sendResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: sendResult.error || "เกิดข้อผิดพลาดในการส่งข้อความเข้า LINE",
          targetGroup,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      targetGroup,
      summary: { dateStr: todayStr, totalBills, totalAmount, pendingCount, approvedCount },
    });
  } catch (err: any) {
    console.error("❌ Cron daily summary error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

