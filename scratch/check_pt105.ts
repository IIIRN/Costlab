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

async function check() {
  const { supabaseAdmin } = await import("../lib/supabase-db");
  const { data: pt105 } = await supabaseAdmin.from("master_members").select("*").eq("id", "PT105").single();
  const { data: pt104 } = await supabaseAdmin.from("master_members").select("*").eq("id", "PT104").single();
  console.log("=== PT105 (ต้อม) ===");
  console.log(pt105);
  console.log("=== PT104 (ช่างรับเหมา 1) ===");
  console.log(pt104);
}

check().catch(console.error);
