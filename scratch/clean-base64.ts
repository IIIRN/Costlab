import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || "";
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      process.env[key] = value.trim();
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase URL or Key");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanBase64() {
  console.log("Cleaning Base64 from system_options...");
  const { data, error } = await supabase
    .from("system_options")
    .select("*")
    .eq("id", "company_settings")
    .single();

  if (error) {
    console.error("Error fetching company_settings:", error);
    return;
  }

  if (data && data.data) {
    console.log("Current company_settings data:", JSON.stringify(data.data).slice(0, 150) + "...");
    const updatedData = { ...data.data };
    
    if (updatedData.logoUrl && (updatedData.logoUrl.startsWith("data:") || updatedData.logoUrl.length > 500)) {
      console.log("Found Base64 / large string in logoUrl (length:", updatedData.logoUrl.length, "). Purging...");
      updatedData.logoUrl = "";
    }

    const { error: updateError } = await supabase
      .from("system_options")
      .upsert({
        id: "company_settings",
        data: updatedData,
        updated_at: new Date().toISOString()
      });

    if (updateError) {
      console.error("Failed to update system_options:", updateError);
    } else {
      console.log("SUCCESS: Base64 logo purged from system_options!");
    }
  } else {
    console.log("No company_settings found.");
  }
}

cleanBase64();
