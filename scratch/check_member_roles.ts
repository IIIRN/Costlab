import fs from "fs";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      process.env[key] = val;
    }
  }
}

async function checkMembers() {
  const { supabaseAdmin } = await import("../lib/supabase-db");
  const { data: members } = await supabaseAdmin.from("master_members").select("*");
  console.log("=== MASTER MEMBERS ===");
  for (const m of members || []) {
    console.log({
      id: m.id,
      nickname: m.nickname,
      full_name: m.full_name,
      line_user_id: m.line_user_id,
      is_owner: m.is_owner,
      can_approve: m.can_approve,
      can_close_bill: m.can_close_bill,
      role: m.role,
      system_role: m.system_role,
      data: m.data,
    });
  }

  const { data: sysOpt } = await supabaseAdmin.from("system_options").select("*").eq("id", "line_config").maybeSingle();
  console.log("=== LINE CONFIG ===");
  console.log(sysOpt?.data);
}

checkMembers().catch(console.error);
