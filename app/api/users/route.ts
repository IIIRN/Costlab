import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const DEFAULT_USERS = [
  { id: "PT101", username: "PT101", displayName: "คุณแมน", role: "Admin", status: "Active", phone: "081-999-9999", createdAt: "2026-01-01" },
  { id: "PT102", username: "PT102", displayName: "คุณซ้อ", role: "Manager", status: "Active", phone: "081-888-8888", createdAt: "2026-01-01" },
  { id: "PT103", username: "PT103", displayName: "บัญชี/การเงิน", role: "Manager", status: "Active", phone: "081-777-7777", createdAt: "2026-01-02" },
  { id: "PT104", username: "PT104", displayName: "ช่างรับเหมา 1", role: "User", status: "Active", phone: "081-666-6666", createdAt: "2026-01-05" },
];

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("system_options")
      .select("*")
      .eq("id", "users_list")
      .maybeSingle();

    if (error) {
      console.warn("⚠️ Failed to fetch users_list from Supabase:", error.message);
      return NextResponse.json({ success: true, users: DEFAULT_USERS });
    }

    if (data && data.data && Array.isArray(data.data) && data.data.length > 0) {
      return NextResponse.json({ success: true, users: data.data });
    }

    return NextResponse.json({ success: true, users: DEFAULT_USERS });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { users } = body;

    if (!Array.isArray(users)) {
      return NextResponse.json({ success: false, error: "Invalid users payload" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("system_options")
      .upsert({
        id: "users_list",
        data: users,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error("❌ Failed to save users_list to Supabase:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "บันทึกข้อมูลผู้ใช้งานระบบลง Supabase สำเร็จ!" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
