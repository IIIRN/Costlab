import { NextResponse } from "next/server";
import { getRows, bulkAppendRows, getSystemOptions } from "@/lib/db";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase-db";
import { clearCache } from "@/lib/cache";

const ALL_SYSTEM_TABLES = [
  { id: "banks", tableName: "ธนาคาร" },
  { id: "stores", tableName: "ร้านค้า" },
  { id: "contractors", tableName: "รับเหมา" },
  { id: "people", tableName: "รายชื่อ" },
  { id: "cars", tableName: "ทะเบียน" },
  { id: "customers", tableName: "ลูกค้า" },
  { id: "companies", tableName: "บริษัท" },
  { id: "products", tableName: "สินค้า" },
  { id: "projects", tableName: "Project" },
  { id: "contract_works", tableName: "งานรับเหมา" },
  { id: "bills", tableName: "Data" },
  { id: "loans", tableName: "ยืมเงิน" }
];

export async function GET() {
  try {
    const backupData: Record<string, any[]> = {};
    let totalRows = 0;

    for (const item of ALL_SYSTEM_TABLES) {
      try {
        const rows = await getRows(item.tableName, 0, 50000);
        // Clean system internal properties like _sheetRow
        const cleanRows = (rows || []).map((r) => {
          const clean: Record<string, any> = {};
          for (const [k, v] of Object.entries(r)) {
            if (!k.startsWith("_") && v !== undefined && v !== null) {
              clean[k] = v;
            }
          }
          return clean;
        });
        backupData[item.tableName] = cleanRows;
        totalRows += cleanRows.length;
      } catch (err) {
        backupData[item.tableName] = [];
      }
    }

    // Backup system options as well
    let systemOptionsData: any = {};
    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabaseAdmin.from("system_options").select("*");
        systemOptionsData = data || [];
      } catch (e) {
        systemOptionsData = await getSystemOptions();
      }
    } else {
      systemOptionsData = await getSystemOptions();
    }

    const fullBackup = {
      version: "1.0",
      type: "COSTLAB_FULL_SYSTEM_BACKUP",
      appName: "CostLab",
      exportedAt: new Date().toISOString(),
      summary: {
        totalTables: ALL_SYSTEM_TABLES.length,
        totalRows,
        tablesSummary: Object.fromEntries(
          Object.entries(backupData).map(([k, v]) => [k, v.length])
        )
      },
      tables: backupData,
      system_options: systemOptionsData
    };

    return NextResponse.json(fullBackup);
  } catch (error) {
    console.error("Backup generation failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate backup" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid backup file payload" }, { status: 400 });
    }

    const tablesData = body.tables || body.data || body;
    const restoredSummary: { tableName: string; count: number; success: boolean; error?: string }[] = [];
    let totalRestored = 0;

    for (const item of ALL_SYSTEM_TABLES) {
      // Check variations of table names in backup
      const rows =
        tablesData[item.tableName] ||
        tablesData[item.id] ||
        (tablesData[item.tableName.toLowerCase()] ? tablesData[item.tableName.toLowerCase()] : []);

      if (Array.isArray(rows) && rows.length > 0) {
        try {
          const inserted = await bulkAppendRows(item.tableName, rows);
          const count = inserted && Array.isArray(inserted) ? inserted.length : rows.length;
          totalRestored += count;
          restoredSummary.push({
            tableName: item.tableName,
            count,
            success: true
          });
        } catch (err: any) {
          restoredSummary.push({
            tableName: item.tableName,
            count: 0,
            success: false,
            error: err instanceof Error ? err.message : String(err)
          });
        }
      }
    }

    // Restore system options if present
    if (body.system_options && isSupabaseConfigured()) {
      try {
        if (Array.isArray(body.system_options)) {
          for (const opt of body.system_options) {
            if (opt.id) {
              await supabaseAdmin.from("system_options").upsert({
                id: opt.id,
                data: opt.data || opt.value || opt,
                updated_at: new Date().toISOString()
              });
            }
          }
        } else if (typeof body.system_options === "object") {
          for (const [optId, optVal] of Object.entries(body.system_options)) {
            await supabaseAdmin.from("system_options").upsert({
              id: optId,
              data: optVal,
              updated_at: new Date().toISOString()
            });
          }
        }
      } catch (e) {
        console.warn("Failed to restore system_options:", e);
      }
    }

    clearCache();

    return NextResponse.json({
      success: true,
      message: `กู้คืนข้อมูลสำเร็จ ${totalRestored} รายการ`,
      totalRestored,
      details: restoredSummary
    });
  } catch (error) {
    console.error("Backup restore failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to restore backup" },
      { status: 500 }
    );
  }
}
