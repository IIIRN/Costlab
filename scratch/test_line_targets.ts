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

async function verify() {
  const { getLineTargetIds, getPeopleMap } = await import("../lib/line");
  const peopleMap = await getPeopleMap();
  const targets = await getLineTargetIds();
  console.log("=== TARGET IDS ===");
  console.log("Owner ID:", targets.ownerId, peopleMap.get(targets.ownerId));
  console.log("Approver IDs (ผู้อนุมัติบิล):", targets.approverIds.map(id => ({ id, name: peopleMap.get(id) })));
  console.log("Finance / Closer IDs (ฝ่ายการเงิน):", targets.closerIds.map(id => ({ id, name: peopleMap.get(id) })));
}

verify().catch(console.error);
