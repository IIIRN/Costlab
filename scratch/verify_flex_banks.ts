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
  const { getBankInfoMap, resolveBankInfo, createBillNotificationFlex, createBillSearchResultFlex, createMultiBillFlex } = await import("../lib/line");
  const { supabaseAdmin } = await import("../lib/supabase-db");

  const [bankMap, bill16, bill15, bill11] = await Promise.all([
    getBankInfoMap(true),
    supabaseAdmin.from("bills").select("*").eq("id", 16).single(),
    supabaseAdmin.from("bills").select("*").eq("id", 15).single(),
    supabaseAdmin.from("bills").select("*").eq("id", 11).single(),
  ]);

  console.log("=== BILL 16 RESOLVED BANK INFO ===");
  const bankInfo16 = resolveBankInfo(bill16.data, bankMap);
  console.log(bankInfo16);

  console.log("=== BILL 15 RESOLVED BANK INFO ===");
  const bankInfo15 = resolveBankInfo(bill15.data, bankMap);
  console.log(bankInfo15);

  console.log("=== BILL 11 RESOLVED BANK INFO ===");
  const bankInfo11 = resolveBankInfo(bill11.data, bankMap);
  console.log(bankInfo11);

  console.log("=== TESTING createMultiBillFlex FOR BILL 16 (EXACT SCREENSHOT CASE) ===");
  const multiFlex = createMultiBillFlex(
    [bill16.data],
    {
      title: "🎉 รายการเบิกเงินสำเร็จเรียบร้อย (ปิดงาน)",
      mode: "completed"
    },
    undefined,
    bankMap
  );

  // Print the bank box in createMultiBillFlex
  const bubble = multiFlex.contents ? multiFlex.contents[0] : multiFlex;
  console.log("MultiBillFlex Bubble generated!");
  const jsonStr = JSON.stringify(bubble, null, 2);
  const hasBankRow = jsonStr.includes("ธนาคาร:");
  console.log("Does Flex contain 'ธนาคาร:' row?", hasBankRow);
  console.log("Does Flex contain bank name 'กรุงไทย'?", jsonStr.includes("กรุงไทย"));
}

verify().catch(console.error);
