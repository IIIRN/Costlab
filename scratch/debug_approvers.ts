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

async function debugApprovers() {
  const { supabaseAdmin } = await import("../lib/supabase-db");
  const { data: sysOpt } = await supabaseAdmin.from("system_options").select("*").eq("id", "line_config").maybeSingle();
  console.log("=== line_config from system_options ===");
  console.log(sysOpt?.data);

  const { getLineTargetIds, getPeopleMap } = await import("../lib/line");
  const peopleMap = await getPeopleMap();
  const { ownerId, approverIds, closerIds } = await getLineTargetIds();
  console.log("=== getLineTargetIds() ===");
  console.log("ownerId:", ownerId, "name:", peopleMap.get(ownerId));
  console.log("approverIds:", approverIds, "names:", approverIds.map(id => peopleMap.get(id)));
  console.log("closerIds:", closerIds, "names:", closerIds.map(id => peopleMap.get(id)));

  const targetApprovers = Array.from(new Set([ownerId, ...(approverIds || [])].filter(Boolean)));
  console.log("targetApprovers ([ownerId, ...approverIds]):", targetApprovers, "count:", targetApprovers.length);
}

debugApprovers().catch(console.error);
