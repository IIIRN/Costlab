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

async function cleanConfig() {
  const { supabaseAdmin } = await import("../lib/supabase-db");
  const { data: sysOpt } = await supabaseAdmin.from("system_options").select("*").eq("id", "line_config").maybeSingle();
  const cfg = sysOpt?.data || {};

  cfg.LINE_USER_ID_OWN = "U8d286780c70cf7d60a0ff5704dcf2319";
  cfg.LINE_USER_ID_APPROVER = "U8d286780c70cf7d60a0ff5704dcf2319";
  cfg.LINE_USER_ID_CLOSER = "U5f1c95cd3d2b944915cd71ea4af073b8";
  cfg.updated_at = new Date().toISOString();

  await supabaseAdmin.from("system_options").update({ data: cfg }).eq("id", "line_config");
  console.log("Updated line_config:", cfg);
}

cleanConfig().catch(console.error);
