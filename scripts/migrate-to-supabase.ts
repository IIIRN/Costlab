import fs from "fs";
import path from "path";
import { google } from "googleapis";
import { supabaseAdmin } from "../lib/supabase-admin";

// Load .env.local for standalone Node.js execution
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          val = val.replace(/\\n/g, "\n");
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

loadEnvLocal();

const SHEET_ID = process.env.GOOGLE_SHEET_ID || "1zD-AGWQopdm0gdNDdtPeZ0FlHmf6NG-__-CK1WD3PqY";

async function getSheetsClient() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) {
    throw new Error("Missing Google service account credentials in .env.local.");
  }
  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

async function fetchDirectFromGoogleSheets(tableName: string): Promise<Record<string, any>[]> {
  try {
    const sheets = await getSheetsClient();
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `'${tableName}'`,
    });
    const values = result.data.values || [];
    if (values.length < 2) return [];

    const headers = values[0].map(String);
    return values.slice(1).map((line) => {
      const row: Record<string, any> = {};
      headers.forEach((header, index) => {
        row[header] = line[index] !== undefined ? line[index] : "";
      });
      return row;
    });
  } catch (err: any) {
    console.warn(`⚠️ Warning fetching Google Sheet '${tableName}': ${err.message}`);
    return [];
  }
}

async function batchUpsert(tableName: string, rows: Record<string, any>[], chunkSize = 100, onConflict?: string) {
  if (rows.length === 0) return;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const batch = rows.slice(i, i + chunkSize);
    const options = onConflict ? { onConflict } : undefined;
    const { error } = await supabaseAdmin.from(tableName).upsert(batch, options);
    if (error) {
      console.error(`❌ Batch error on '${tableName}' (rows ${i}-${i + batch.length}):`, error.message);
    }
  }
}

async function runMigration() {
  console.log("🚀 Starting Optimized Batch Data Migration to Supabase PostgreSQL...\n");

  try {
    // 1. System Options
    console.log("📦 [1/12] Migrating System Options...");
    const optionRows = await fetchDirectFromGoogleSheets("ตัวเลือกระบบ");
    const systemOptions: Record<string, string[]> = {};
    for (const row of optionRows) {
      for (const [col, val] of Object.entries(row)) {
        if (!col.startsWith("_") && val !== undefined && val !== null) {
          const strVal = String(val).trim();
          if (strVal !== "") {
            if (!systemOptions[col]) systemOptions[col] = [];
            systemOptions[col].push(strVal);
          }
        }
      }
    }
    if (Object.keys(systemOptions).length > 0) {
      const { error } = await supabaseAdmin.from("system_options").upsert({
        id: "system_options",
        data: systemOptions,
        updated_at: new Date().toISOString(),
      });
      if (error) console.error("Error migrating system options:", error.message);
      else console.log("✅ System Options migrated successfully.");
    }

    // 2. Projects
    console.log("📦 [2/12] Migrating Projects...");
    const projectRows = await fetchDirectFromGoogleSheets("Project");
    const projectItems = projectRows
      .filter((row) => row["ID Project"])
      .map((row) => ({
        id: String(row["ID Project"]).trim(),
        name: row["ชื่อ Project"] || "",
        customer_name: row["ชื่อลูกค้า"] || "",
        budget: Number(row["งบไม่เกิน"] || 0),
        vat_total: Number(row["ยอดรวม vat"] || 0),
        color: row["color"] || "Green",
        company: row["บริษัท"] || "",
        responsible_person: row["รับผิดชอบ"] || "",
      }));
    await batchUpsert("projects", projectItems);
    console.log(`✅ Projects migrated (${projectItems.length} rows).`);

    // 3. Stores
    console.log("📦 [3/12] Migrating Stores...");
    const storeRows = await fetchDirectFromGoogleSheets("ร้านค้า");
    const storeItems = storeRows
      .filter((row) => row["id_store"])
      .map((row) => ({
        id: String(row["id_store"]).trim(),
        name: row["ชื่อร้านค้า"] || "",
        full_name: row["ชื่อเต็ม"] || "",
        bank_account: row["เลขบัญชี"] || "",
        phone: row["เบอร์โทร"] || "",
        address: row["ที่อยู่"] || "",
        tax_id: row["เลขที่ผู้เสียภาษี"] || "",
      }));
    await batchUpsert("stores", storeItems);
    console.log(`✅ Stores migrated (${storeItems.length} rows).`);

    // 4. Contractors
    console.log("📦 [4/12] Migrating Contractors...");
    const contractorRows = await fetchDirectFromGoogleSheets("รับเหมา");
    const contractorItems = contractorRows
      .filter((row) => row["id_Contractor"])
      .map((row) => ({
        id: String(row["id_Contractor"]).trim(),
        nickname: row["ชื่อเล่น"] || "",
        full_name: row["ชื่อ-นามสกุล"] || "",
        bank_account: row["เลขบัญชี"] || "",
        id_card: row["บัตรประจำตัวประชาชน"] || "",
        phone: row["เบอร์โทรศัพท์"] || "",
        address: row["ที่อยู่"] || "",
        annual_limit: Number(row["จำกัดยอด/ปี"] || 0),
      }));
    await batchUpsert("contractors", contractorItems);
    console.log(`✅ Contractors migrated (${contractorItems.length} rows).`);

    // 5. Contract Works
    console.log("📦 [5/12] Migrating Contract Works...");
    const contractWorkRows = await fetchDirectFromGoogleSheets("งานรับเหมา");
    const contractWorkItems = contractWorkRows
      .filter((row) => row["id_Conwork"])
      .map((row) => ({
        id: String(row["id_Conwork"]).trim(),
        contractor_id: row["id_Contractor"] ? String(row["id_Contractor"]).trim() : null,
        project_id: row["ID Project"] ? String(row["ID Project"]).trim() : null,
        project_name: row["ชื่อ Project"] || "",
        total_contract_amount: Number(row["ยอดเงินจ้าง"] || 0),
        work_details: row["รายละเอียดงาน"] || "",
        phone: row["เบอร์โทรศัพท์"] || "",
        paid_amount: Number(row["ยอดเงินจ่าย"] || 0),
      }));
    await batchUpsert("contract_works", contractWorkItems);
    console.log(`✅ Contract Works migrated (${contractWorkItems.length} rows).`);

    // 6. Master Members (รายชื่อ)
    console.log("📦 [6/12] Migrating Members...");
    const memberRows = await fetchDirectFromGoogleSheets("รายชื่อ");
    const memberItems = memberRows
      .filter((row) => row["รหัสพนักงาน"])
      .map((row) => ({
        id: String(row["รหัสพนักงาน"]).trim(),
        nickname: row["ชื่อเล่น"] || "",
        full_name: row["ชื่อ-นามสกุล"] || "",
        bank_account: row["เลขบัญชี"] || "",
        phone: row["เบอร์โทร"] || "",
        address: row["ที่อยู่"] || "",
        id_card: row["เลขที่บัตรประชาชน"] || "",
        role: row["สิทธิ์การใช้งาน"] || "",
      }));
    await batchUpsert("master_members", memberItems);
    console.log(`✅ Members migrated (${memberItems.length} rows).`);

    // 7. Banks
    console.log("📦 [7/12] Migrating Banks...");
    const bankRows = await fetchDirectFromGoogleSheets("ธนาคาร");
    const bankItems = bankRows
      .filter((row) => row["id_bank"])
      .map((row) => ({
        id: String(row["id_bank"]).trim(),
        name: row["ชื่อธนาคาร"] || "",
        image: row["image"] || "",
      }));
    await batchUpsert("banks", bankItems);
    console.log(`✅ Banks migrated (${bankItems.length} rows).`);

    // 8. Cars
    console.log("📦 [8/12] Migrating Cars...");
    const carRows = await fetchDirectFromGoogleSheets("ทะเบียน");
    const carItems = carRows
      .filter((row) => row["id_car"])
      .map((row) => ({
        id: String(row["id_car"]).trim(),
        plate_no: row["หมายเลขทะเบียน"] || "",
        brand: row["ยี่ห้อรถ"] || "",
        color: row["สี"] || "",
        responsible_person: row["รับผิดชอบ"] || "",
        owner: row["รถของ"] || "",
      }));
    await batchUpsert("cars", carItems);
    console.log(`✅ Cars migrated (${carItems.length} rows).`);

    // 9. Customers
    console.log("📦 [9/12] Migrating Customers...");
    const customerRows = await fetchDirectFromGoogleSheets("ลูกค้า");
    const customerItems = customerRows
      .filter((row) => row["id_cus"])
      .map((row) => ({
        id: String(row["id_cus"]).trim(),
        name: row["ชื่อลูกค้า"] || "",
        address: row["ที่อยู่"] || "",
        tax_id: row["เลขที่ผู้เสียภาษี"] || "",
      }));
    await batchUpsert("customers", customerItems);
    console.log(`✅ Customers migrated (${customerItems.length} rows).`);

    // 10. Companies
    console.log("📦 [10/12] Migrating Companies...");
    const companyRows = await fetchDirectFromGoogleSheets("บริษัท");
    const companyItems = companyRows
      .filter((row) => row["id_Company"])
      .map((row) => ({
        id: String(row["id_Company"]).trim(),
        name_en: row["ชื่ออังกฤษ"] || "",
        name_th: row["ชื่อบริษัท"] || "",
        branch: row["สำนักงาน"] || "",
        address: row["ที่อยู่"] || "",
        tax_id: row["เลขที่สียภาษี "] || row["เลขที่ผู้เสียภาษี"] || "",
        phone: row["เบอร์โทร"] || "",
      }));
    await batchUpsert("companies", companyItems);
    console.log(`✅ Companies migrated (${companyItems.length} rows).`);

    // 11. Loans
    console.log("📦 [11/12] Migrating Loans...");
    const loanRows = await fetchDirectFromGoogleSheets("ยืมเงิน");
    const loanItems = loanRows
      .filter((row) => row["id"])
      .map((row) => ({
        id: String(row["id"]).trim(),
        borrower_name: row["ชื่อ"] || "",
        type: row["type"] || "",
        amount: Number(row["จำนวนเงิน"] || 0),
      }));
    await batchUpsert("loans", loanItems);
    console.log(`✅ Loans migrated (${loanItems.length} rows).`);

    // 12. Bills (Data Sheet)
    console.log("📦 [12/12] Migrating Bills (Data Sheet)...");
    const billRows = await fetchDirectFromGoogleSheets("Data");
    const billItems = billRows
      .filter((row) => row["ลำดับ"] || row["ID Project"])
      .map((row) => ({
        project_id: row["ID Project"] ? String(row["ID Project"]).trim() : null,
        project_name: row["ชื่อ Project"] || "",
        vendor_or_person: row["ร้าน/บุคคล"] || "",
        description: row["สินค้า/ทำงาน"] || "",
        bill_no: row["บิล"] || "",
        category: row["ประเภท"] || "",
        amount: Number(row["ยอดเงิน"] || 0),
        vat_amount: Number(row["vat"] || 0),
        withholding_tax: Number(row["หัก"] || 0),
        credit_days: Number(row["เครดิต"] || 0),
        requester: row["ผู้เบิก"] || "",
        image_url: row["รูปถ่ายบิล"] || "",
        status: row["สถานะ"] || "รอตรวจสอบ",
      }));
    await batchUpsert("bills", billItems);
    console.log(`✅ Bills migrated (${billItems.length} rows).`);

    console.log("\n🎉 ALL DATA MIGRATED TO SUPABASE POSTGRESQL SUCCESSFULLY!");
  } catch (err) {
    console.error("❌ Migration failed with error:", err);
  }
}

runMigration();
