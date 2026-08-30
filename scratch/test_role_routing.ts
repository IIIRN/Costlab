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

async function testRoles() {
  const { supabaseAdmin } = await import("../lib/supabase-db");
  const { data: members } = await supabaseAdmin.from("master_members").select("*");

  let ownerId = "";
  const approverSet = new Set<string>();
  const financeSet = new Set<string>();

  for (const m of members || []) {
    if (m.status === "Inactive") continue;
    const lineId = String(m.line_user_id || m["LINE User ID"] || m.data?.line_user_id || m.data?.["LINE User ID"] || "").trim();
    if (!lineId) continue;

    const d = (m.data && typeof m.data === "object") ? m.data : {};
    const permStr = String(m["สิทธิ์การใช้งาน"] || d["สิทธิ์การใช้งาน"] || "");

    // 1. Owner
    const isOwner = Boolean(
      m.is_owner || d.is_owner || d["เจ้าของระบบ"] || m["เจ้าของระบบ"] ||
      m.role === "Owner" || m.system_role === "Owner" ||
      permStr.includes("Owner") || permStr.includes("เจ้าของระบบ")
    );
    if (isOwner) {
      if (!ownerId) ownerId = lineId;
      approverSet.add(lineId);
    }

    // 2. Approver (ผู้อนุมัติบิล)
    const isApprover = Boolean(
      m.can_close_bill || d.can_close_bill || d["อนุมัติบิล"] || m["อนุมัติบิล"] ||
      m.system_role === "Admin_Approver" ||
      permStr.includes("Approver") || permStr.includes("อนุมัติบิล")
    );
    if (isApprover) {
      approverSet.add(lineId);
    }

    // 3. Finance (ฝ่ายการเงิน / ปิดงาน)
    const isFinance = Boolean(
      m.can_approve || d.can_approve || d["ฝ่ายการเงิน"] || m["ฝ่ายการเงิน"] ||
      m.system_role === "Admin_Closer" ||
      permStr.includes("Finance") || permStr.includes("ฝ่ายการเงิน") || permStr.includes("ปิดบิล")
    );
    if (isFinance) {
      financeSet.add(lineId);
    }

    console.log(`Member: ${m.id} (${m.nickname || m.full_name}) | Line: ${lineId} -> Owner: ${isOwner}, Approver: ${isApprover}, Finance: ${isFinance}`);
  }

  console.log("=== FINAL TARGET IDS ===");
  console.log("ownerId:", ownerId);
  console.log("approverIds (ผู้อนุมัติบิล):", Array.from(approverSet));
  console.log("financeIds / closerIds (ฝ่ายการเงิน):", Array.from(financeSet));
}

testRoles().catch(console.error);
