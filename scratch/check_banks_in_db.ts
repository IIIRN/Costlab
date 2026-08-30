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

const DEFAULT_THAI_BANKS: Record<string, string> = {
  ba101: "กรุงเทพ",
  ba102: "กสิกรไทย",
  ba103: "ไทยพาณิชย์",
  ba104: "กรุงไทย",
  ba105: "ทหารไทยธนชาต",
  ba106: "ออมสิน",
  ba107: "กรุงศรีอยุธยา",
  ba108: "เกียรตินาคินภัทร",
  ba109: "ธนชาต",
  ba110: "เพื่อการเกษตรและสหกรณ์การเกษตร",
  ba111: "ยูโอบี",
  ba112: "ซีไอเอ็มบีไทย",
  ba113: "ทิสโก้",
  ba114: "อาคารสงเคราะห์",
};

function inferThaiBankFromAccount(accountNo?: string): string {
  if (!accountNo) return "";
  const raw = String(accountNo).trim();
  const digits = raw.replace(/\D/g, "");
  if (!digits || digits.length < 8) return "";

  if (digits.length === 12 && digits.startsWith("020")) return "ออมสิน";
  if (raw.startsWith("020-") || raw.startsWith("02-04")) return "ออมสิน";
  if (digits.length === 12 && digits.startsWith("0101")) return "เพื่อการเกษตรและสหกรณ์การเกษตร";

  if (
    digits.startsWith("051") || digits.startsWith("009") || digits.startsWith("024") ||
    digits.startsWith("411") || digits.startsWith("437") || digits.startsWith("984") ||
    digits.startsWith("563") || digits.startsWith("026") || digits.startsWith("052") ||
    digits.startsWith("102") || digits.startsWith("115") || digits.startsWith("120")
  ) {
    return "กรุงไทย";
  }

  if (/^\d{3}[-\s]?\d{6}[-\s]?\d$/.test(raw) || digits.startsWith("503") || digits.startsWith("248") || digits.startsWith("399") || digits.startsWith("071")) {
    return "ไทยพาณิชย์";
  }

  if (/^\d{3}[-\s]?[03][-\s]?\d{5}[-\s]?\d$/.test(raw) || digits.startsWith("114") || digits.startsWith("119") || digits.startsWith("0718")) {
    return "กรุงเทพ";
  }

  if (/^\d{3}[-\s]?[1246][-\s]?\d{5}[-\s]?\d$/.test(raw) || digits.startsWith("789") || digits.startsWith("725") || digits.startsWith("017") || digits.startsWith("019") || digits.startsWith("243") || digits.startsWith("322") || digits.startsWith("649") || digits.startsWith("760") || digits.startsWith("441") || digits.startsWith("164") || digits.startsWith("720") || digits.startsWith("139") || digits.startsWith("029") || digits.startsWith("296") || digits.startsWith("334") || digits.startsWith("983")) {
    return "กสิกรไทย";
  }

  return "";
}

async function test() {
  const { supabaseAdmin } = await import("../lib/supabase-db");
  const [bill16, bill15, bill11] = await Promise.all([
    supabaseAdmin.from("bills").select("*").eq("id", 16).single(),
    supabaseAdmin.from("bills").select("*").eq("id", 15).single(),
    supabaseAdmin.from("bills").select("*").eq("id", 11).single(),
  ]);

  const [storesRes, contractorsRes, membersRes, banksRes, sysOptRes] = await Promise.all([
    supabaseAdmin.from("stores").select("*"),
    supabaseAdmin.from("contractors").select("*"),
    supabaseAdmin.from("master_members").select("*"),
    supabaseAdmin.from("banks").select("*"),
    supabaseAdmin.from("system_options").select("*").eq("id", "entity_banks").maybeSingle(),
  ]);

  const entityBanksMap = sysOptRes.data?.data || {};
  const bankInfoMap = new Map();

  const cleanBank = (raw?: string, accountNo?: string) => {
    if (!raw || raw === "non" || raw === "-") return inferThaiBankFromAccount(accountNo);
    const trimmed = String(raw).trim();
    const lower = trimmed.toLowerCase();
    const mapped = DEFAULT_THAI_BANKS[lower];
    if (mapped) return mapped;
    const stripped = trimmed.replace(/^Ba\d+\s*[-–—]?\s*/i, "").replace(/^ธนาคาร\s*/, "").trim();
    if (stripped && stripped !== "non" && stripped !== "-") {
      return DEFAULT_THAI_BANKS[stripped.toLowerCase()] || stripped;
    }
    return inferThaiBankFromAccount(accountNo) || trimmed;
  };

  for (const s of storesRes.data || []) {
    const accountNo = s.bank_account;
    const rawBank = s.bank_name || entityBanksMap[s.id] || entityBanksMap[s.name] || "";
    const bankName = cleanBank(rawBank, accountNo);
    const info = { accountName: s.full_name || s.name, accountNo, bankName };
    bankInfoMap.set(s.id.toLowerCase(), info);
    bankInfoMap.set(s.name.toLowerCase(), info);
  }

  for (const c of contractorsRes.data || []) {
    const accountNo = c.bank_account;
    const rawBank = c.bank_name || entityBanksMap[c.id] || entityBanksMap[c.nickname] || "";
    const bankName = cleanBank(rawBank, accountNo);
    const info = { accountName: c.full_name || c.nickname, accountNo, bankName };
    bankInfoMap.set(c.id.toLowerCase(), info);
    bankInfoMap.set(c.nickname.toLowerCase(), info);
  }

  for (const m of membersRes.data || []) {
    const accountNo = m.bank_account;
    const rawBank = m.bank_name || entityBanksMap[m.id] || entityBanksMap[m.nickname] || "";
    const bankName = cleanBank(rawBank, accountNo);
    const info = { accountName: m.full_name || m.nickname, accountNo, bankName };
    bankInfoMap.set(m.id.toLowerCase(), info);
    bankInfoMap.set(m.nickname.toLowerCase(), info);
  }

  console.log("=== BILL 16 BANK INFO ===");
  const storeId16 = bill16.data.data?.["ร้านค้า"] || bill16.data.data?.data?.["ร้านค้า"] || bill16.data.vendor_or_person;
  console.log("Lookup key:", storeId16);
  console.log("Resolved:", bankInfoMap.get(storeId16.toLowerCase()));

  console.log("=== BILL 15 BANK INFO ===");
  const storeId15 = bill15.data.data?.["ร้านค้า"] || bill15.data.data?.data?.["ร้านค้า"] || bill15.data.vendor_or_person;
  console.log("Lookup key:", storeId15);
  console.log("Resolved:", bankInfoMap.get(storeId15.toLowerCase()));

  console.log("=== BILL 11 BANK INFO ===");
  const storeId11 = bill11.data.data?.["ผู้รับเหมา"] || bill11.data.data?.data?.["ผู้รับเหมา"] || bill11.data.vendor_or_person;
  console.log("Lookup key:", storeId11);
  console.log("Resolved:", bankInfoMap.get(storeId11.toLowerCase()));
}

test().catch(console.error);
