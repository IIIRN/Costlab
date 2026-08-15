import { supabaseAdmin } from "@/lib/supabase-admin";
import { LINE_CONFIG } from "@/lib/line/config";

const LINE_API_BASE = "https://api.line.me/v2/bot/message";

export async function getDynamicAccessToken(): Promise<string> {
  try {
    const { data } = await supabaseAdmin
      .from("system_options")
      .select("data")
      .eq("id", "line_config")
      .maybeSingle();

    if (data?.data?.LINE_CHANNEL_ACCESS_TOKEN) {
      const token = String(data.data.LINE_CHANNEL_ACCESS_TOKEN).trim();
      if (token && !token.includes("your-line")) {
        return token;
      }
    }
  } catch (e) {
    // Fall back to process.env or LINE_CONFIG
  }
  return process.env.LINE_CHANNEL_ACCESS_TOKEN || LINE_CONFIG.CHANNEL_ACCESS_TOKEN || "";
}

export async function isLineApproverAuthorized(userId: string, targetId?: string): Promise<boolean> {
  if (!userId) return false;

  try {
    const { data: configData } = await supabaseAdmin
      .from("system_options")
      .select("data")
      .eq("id", "line_config")
      .maybeSingle();

    const cfg = configData?.data || {};
    const rawIds = [
      cfg.LINE_USER_ID_APPROVER,
      cfg.LINE_USER_ID_OWN,
      process.env.LINE_USER_ID_APPROVER,
      process.env.LINE_USER_ID_OWN,
      LINE_CONFIG.USER_ID_APPROVER,
      LINE_CONFIG.USER_ID_OWN,
    ];
    const allowedApprovers: string[] = rawIds
      .flatMap(v => String(v || "").split(","))
      .map(v => v.trim())
      .filter(Boolean);

    if (allowedApprovers.includes(userId) || (targetId && allowedApprovers.includes(targetId))) {
      return true;
    }

    const { data: member } = await supabaseAdmin
      .from("master_members")
      .select("*")
      .or(`line_user_id.eq.${userId},id.eq.${userId}`)
      .maybeSingle();

    if (member && (member.role === "Admin" || member["สิทธิ์การใช้งาน"] === "Admin")) {
      return true;
    }

    if (allowedApprovers.length === 0) {
      return true;
    }
  } catch (e) {
    console.warn("⚠️ Warning checking LINE approver authorization:", e);
  }

  return (
    userId === LINE_CONFIG.USER_ID_APPROVER ||
    userId === LINE_CONFIG.USER_ID_OWN
  );
}

export async function getLineTargetGroup(
  category: "task" | "work" | "pw" | "finance" | "summary" | "plan" | "paid"
): Promise<string> {
  try {
    const { data: configRow } = await supabaseAdmin
      .from("system_options")
      .select("data")
      .eq("id", "line_config")
      .maybeSingle();

    const cfg = configRow?.data || {};

    let target = "";
    switch (category) {
      case "task":
        target = cfg.LINE_GROUP_ID_TASK || process.env.LINE_GROUP_ID_TASK;
        break;
      case "work":
      case "pw":
        target = cfg.LINE_GROUP_ID_PW || process.env.LINE_GROUP_ID_PW;
        break;
      case "finance":
        target = cfg.LINE_GROUP_ID_FINANCE || process.env.LINE_GROUP_ID_FINANCE;
        break;
      case "paid":
        target = cfg.LINE_GROUP_ID_PAID || cfg.LINE_GROUP_ID_FINANCE || process.env.LINE_GROUP_ID_PAID;
        break;
      case "summary":
        target = cfg.LINE_GROUP_ID_SUMMARY || process.env.LINE_GROUP_ID_SUMMARY;
        break;
      case "plan":
        target = cfg.LINE_GROUP_ID_PLAN || process.env.LINE_GROUP_ID_PLAN;
        break;
    }

    if (target && String(target).trim()) return String(target).trim();

    return (
      cfg.LINE_USER_ID_OWN ||
      cfg.LINE_USER_ID_APPROVER ||
      process.env.LINE_USER_ID_OWN ||
      process.env.LINE_USER_ID_APPROVER ||
      ""
    );
  } catch (e) {
    console.error("Failed resolving target LINE group:", e);
    return "";
  }
}

export async function recordDiscoveredLineGroup(groupId: string, sourceName?: string): Promise<void> {
  if (!groupId || !groupId.startsWith("C")) return;
  try {
    const { data: existing } = await supabaseAdmin
      .from("system_options")
      .select("data")
      .eq("id", "line_group_activity")
      .maybeSingle();

    const currentGroups = existing?.data?.groups || {};
    currentGroups[groupId] = {
      groupId,
      name: sourceName || currentGroups[groupId]?.name || "LINE Group",
      lastActive: new Date().toISOString()
    };

    await supabaseAdmin.from("system_options").upsert({
      id: "line_group_activity",
      data: { groups: currentGroups },
      updated_at: new Date().toISOString()
    });
  } catch (e) {
    console.warn("⚠️ Warning recording discovered LINE group:", e);
  }
}

export async function logSystemError(
  source: string,
  error: any,
  context?: Record<string, any>
): Promise<void> {
  const errMsg = typeof error === "string" ? error : error?.message || String(error);
  console.error(`❌ [System Error Log] (${source}):`, errMsg, context || "");

  try {
    const { data: existing } = await supabaseAdmin
      .from("system_options")
      .select("data")
      .eq("id", "system_error_logs")
      .maybeSingle();

    const logs: any[] = Array.isArray(existing?.data?.logs) ? existing.data.logs : [];

    const newLog = {
      id: `ERR-${Date.now()}`,
      timestamp: new Date().toISOString(),
      source,
      message: errMsg,
      context: context || {}
    };

    const updatedLogs = [newLog, ...logs].slice(0, 50);

    await supabaseAdmin.from("system_options").upsert({
      id: "system_error_logs",
      data: { logs: updatedLogs },
      updated_at: new Date().toISOString()
    });
  } catch (e) {
    console.warn("⚠️ Warning logging system error to Supabase:", e);
  }
}

export type LineSendResult = {
  success: boolean;
  error?: string;
};

export async function sendTextMessageDetailed(to: string, text: string): Promise<LineSendResult> {
  const token = await getDynamicAccessToken();
  if (!token || token.includes("your-line")) {
    return {
      success: false,
      error: "ยังไม่ได้ระบุ LINE Channel Access Token หรือ Token ไม่ถูกต้อง (กรุณาบันทึก Token ในระบบ)",
    };
  }
  if (!to) {
    return {
      success: false,
      error: "ยังไม่ได้ระบุปลายทาง (User ID หรือ Group ID)",
    };
  }
  try {
    const res = await fetch(`${LINE_API_BASE}/push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to,
        messages: [{ type: "text", text }],
      }),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      const lineMsg = errJson.message || errJson.details?.[0]?.message || `HTTP status ${res.status}`;
      return {
        success: false,
        error: `ส่งข้อความ LINE ไม่สำเร็จ (LINE API: "${lineMsg}")`,
      };
    }
    return { success: true };
  } catch (error: any) {
    console.error("❌ Failed to push text message to LINE:", error.message || error);
    return {
      success: false,
      error: `เกิดข้อผิดพลาดในการเชื่อมต่อ LINE API: ${error.message || String(error)}`,
    };
  }
}

export async function sendTextMessage(to: string, text: string): Promise<boolean> {
  const result = await sendTextMessageDetailed(to, text);
  return result.success;
}

export async function replyTextMessage(replyToken: string, text: string): Promise<boolean> {
  const token = await getDynamicAccessToken();
  if (!token || token.includes("your-line") || !replyToken) return false;
  try {
    const res = await fetch(`${LINE_API_BASE}/reply`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        replyToken,
        messages: [{ type: "text", text }],
      }),
    });
    return res.ok;
  } catch (error: any) {
    console.error("❌ Failed to reply text message to LINE:", error.message || error);
    return false;
  }
}

export async function sendFlexMessageDetailed(
  to: string,
  altText: string,
  flexContents: Record<string, any>
): Promise<LineSendResult> {
  const token = await getDynamicAccessToken();
  if (!token || token.includes("your-line")) {
    return {
      success: false,
      error: "ยังไม่ได้ระบุ LINE Channel Access Token หรือ Token ไม่ถูกต้อง (กรุณากรอกและบันทึก Access Token ในส่วนตั้งค่า)",
    };
  }
  if (!to) {
    return {
      success: false,
      error: "ยังไม่ได้ระบุปลายทาง (User ID หรือ Group ID)",
    };
  }
  try {
    const res = await fetch(`${LINE_API_BASE}/push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to,
        messages: [
          {
            type: "flex",
            altText,
            contents: flexContents,
          },
        ],
      }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      const lineMsg = errJson.message || errJson.details?.[0]?.message || `HTTP Status ${res.status}`;
      return {
        success: false,
        error: `ส่งข้อความ LINE ไม่สำเร็จ (LINE API ตอบกลับ: "${lineMsg}")`,
      };
    }
    return { success: true };
  } catch (error: any) {
    console.error("❌ Failed to push flex message to LINE:", error.message || error);
    return {
      success: false,
      error: `เกิดข้อผิดพลาดในการเชื่อมต่อ LINE API: ${error.message || String(error)}`,
    };
  }
}

export async function sendFlexMessage(to: string, altText: string, flexContents: Record<string, any>): Promise<boolean> {
  const result = await sendFlexMessageDetailed(to, altText, flexContents);
  return result.success;
}

export async function replyFlexMessage(replyToken: string, altText: string, flexContents: Record<string, any>): Promise<boolean> {
  const token = await getDynamicAccessToken();
  if (!token || token.includes("your-line") || !replyToken) {
    if (replyToken) {
      await replyTextMessage(replyToken, altText);
    }
    return false;
  }
  try {
    const res = await fetch(`${LINE_API_BASE}/reply`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        replyToken,
        messages: [
          {
            type: "flex",
            altText,
            contents: flexContents,
          },
        ],
      }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      console.warn("⚠️ Flex reply failed, falling back to text reply:", errJson);
      await replyTextMessage(replyToken, `${altText}\n\n(แสดงผลรายละเอียดเพิ่มเติมบนระบบเว็บ)`);
      return true;
    }
    return true;
  } catch (error: any) {
    console.error("❌ Failed to reply flex message to LINE:", error.message || error);
    await replyTextMessage(replyToken, altText);
    return false;
  }
}

export function createBillNotificationFlex(bill: {
  id?: string | number;
  project_name?: string;
  vendor_or_person?: string;
  description?: string;
  amount?: number;
  requester?: string;
  status?: string;
}): Record<string, any> {
  const formattedAmount = Number(bill.amount || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#0F172A",
      paddingAll: "15px",
      contents: [
        {
          type: "text",
          text: "🧾 รายการแจ้งเตือนการเบิกเงิน",
          weight: "bold",
          color: "#FFFFFF",
          size: "md",
        },
        {
          type: "text",
          text: `สถานะ: ${bill.status || "ตั้งเบิก"}`,
          color: "#94A3B8",
          size: "xs",
          margin: "xs",
        },
      ],
    },
    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "16px",
      spacing: "md",
      contents: [
        {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          contents: [
            {
              type: "box",
              layout: "baseline",
              contents: [
                { type: "text", text: "โครงการ:", color: "#64748B", size: "xs", flex: 2 },
                { type: "text", text: bill.project_name || "-", weight: "bold", color: "#1E293B", size: "xs", flex: 5, wrap: true },
              ],
            },
            {
              type: "box",
              layout: "baseline",
              contents: [
                { type: "text", text: "ร้าน/บุคคล:", color: "#64748B", size: "xs", flex: 2 },
                { type: "text", text: bill.vendor_or_person || "-", color: "#1E293B", size: "xs", flex: 5, wrap: true },
              ],
            },
            {
              type: "box",
              layout: "baseline",
              contents: [
                { type: "text", text: "รายละเอียด:", color: "#64748B", size: "xs", flex: 2 },
                { type: "text", text: bill.description || "-", color: "#1E293B", size: "xs", flex: 5, wrap: true },
              ],
            },
            {
              type: "box",
              layout: "baseline",
              contents: [
                { type: "text", text: "ผู้เบิก:", color: "#64748B", size: "xs", flex: 2 },
                { type: "text", text: bill.requester || "-", color: "#1E293B", size: "xs", flex: 5 },
              ],
            },
          ],
        },
        { type: "separator" },
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "จำนวนเงินรวม", weight: "bold", color: "#0F172A", size: "sm" },
            { type: "text", text: `฿${formattedAmount}`, weight: "bold", color: "#2563EB", size: "lg", align: "end" },
          ],
        },
      ],
    },
  };
}

export function createDailySummaryFlex(summary: {
  dateStr: string;
  totalBills: number;
  totalAmount: number;
  pendingCount: number;
  approvedCount: number;
}): Record<string, any> {
  const formattedAmount = Number(summary.totalAmount || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return {
    type: "bubble",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#1E293B",
      paddingAll: "15px",
      contents: [
        {
          type: "text",
          text: "📊 สรุปรายงานประจำวัน",
          weight: "bold",
          color: "#FFFFFF",
          size: "lg",
        },
        {
          type: "text",
          text: `ประจำวันที่ ${summary.dateStr}`,
          color: "#94A3B8",
          size: "xs",
          margin: "xs",
        },
      ],
    },
    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "16px",
      spacing: "md",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "รายการบิลทั้งหมด", color: "#64748B", size: "sm" },
            { type: "text", text: `${summary.totalBills} รายการ`, weight: "bold", color: "#0F172A", size: "sm", align: "end" },
          ],
        },
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "รออนุมัติ", color: "#64748B", size: "sm" },
            { type: "text", text: `${summary.pendingCount} รายการ`, weight: "bold", color: "#D97706", size: "sm", align: "end" },
          ],
        },
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "อนุมัติแล้ว", color: "#64748B", size: "sm" },
            { type: "text", text: `${summary.approvedCount} รายการ`, weight: "bold", color: "#16A34A", size: "sm", align: "end" },
          ],
        },
        { type: "separator" },
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "รวมยอดเงินทั้งสิ้น", weight: "bold", color: "#0F172A", size: "sm" },
            { type: "text", text: `฿${formattedAmount}`, weight: "bold", color: "#2563EB", size: "lg", align: "end" },
          ],
        },
      ],
    },
  };
}

export function createMorningTasksCarouselFlex(data: {
  dateStr: string;
  tasks: Array<{ id: any; details: string; status?: string; project?: string }>;
  works: Array<{ id: any; details: string; contractor?: string; project?: string }>;
  pendingBills: Array<{ id: any; requester?: string; amount?: number | string }>;
}): Record<string, any> {
  const { dateStr, tasks = [], works = [], pendingBills = [] } = data;

  // Tab 1: 📋 รายการงานค้างประจำวัน (Daily Tasks)
  const tab1 = {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#0F172A",
      paddingAll: "15px",
      contents: [
        { type: "text", text: "📋 แท็บ 1/3: งานค้างประจำวัน", weight: "bold", color: "#FFFFFF", size: "sm" },
        { type: "text", text: `ประจำวันที่ ${dateStr} (${tasks.length} รายการ)`, color: "#38BDF8", size: "xs", margin: "xs" }
      ]
    },
    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "14px",
      spacing: "xs",
      contents: tasks.length > 0 ? tasks.slice(0, 5).map((t, idx) => ({
        type: "box",
        layout: "vertical",
        margin: idx > 0 ? "xs" : "none",
        paddingAll: "6px",
        backgroundColor: "#F8FAFC",
        cornerRadius: "6px",
        contents: [
          { type: "text", text: `${idx + 1}. [${t.project || "งานทั่วไป"}] ${t.details}`, size: "xs", weight: "bold", color: "#0F172A", wrap: true },
          { type: "text", text: `สถานะ: ${t.status || "กำลังทำ"}`, size: "xxs", color: "#059669" }
        ]
      })) : [
        { type: "text", text: "✅ ไม่มีรายการงานค้างในวันนี้", size: "xs", color: "#059669", align: "center" }
      ]
    }
  };

  // Tab 2: 👷‍♂️ งานรับเหมา & PW มอบหมาย (Contract Works)
  const tab2 = {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#1E1B4B",
      paddingAll: "15px",
      contents: [
        { type: "text", text: "👷‍♂️ แท็บ 2/3: งานรับเหมา & PW", weight: "bold", color: "#FFFFFF", size: "sm" },
        { type: "text", text: `รายการเปิดจ้างค้าง (${works.length} รายการ)`, color: "#A5B4FC", size: "xs", margin: "xs" }
      ]
    },
    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "14px",
      spacing: "xs",
      contents: works.length > 0 ? works.slice(0, 5).map((w, idx) => ({
        type: "box",
        layout: "vertical",
        margin: idx > 0 ? "xs" : "none",
        paddingAll: "6px",
        backgroundColor: "#F8FAFC",
        cornerRadius: "6px",
        contents: [
          { type: "text", text: `${idx + 1}. [CW${w.id}] ${w.details}`, size: "xs", weight: "bold", color: "#1E293B", wrap: true },
          { type: "text", text: `ผู้รับเหมา: ${w.contractor || "-"} | โครงการ: ${w.project || "ทั่วไป"}`, size: "xxs", color: "#64748B" }
        ]
      })) : [
        { type: "text", text: "✅ ไม่มีรายการงานรับเหมาค้าง", size: "xs", color: "#059669", align: "center" }
      ]
    }
  };

  // Tab 3: 🧾 บิลตั้งเบิกที่ต้องตรวจสอบ (Pending Bills)
  const tab3 = {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#065F46",
      paddingAll: "15px",
      contents: [
        { type: "text", text: "🧾 แท็บ 3/3: บิลรอตรวจสอบ/ตั้งเบิก", weight: "bold", color: "#FFFFFF", size: "sm" },
        { type: "text", text: `รายการบิลรออนุมัติ (${pendingBills.length} รายการ)`, color: "#A7F3D0", size: "xs", margin: "xs" }
      ]
    },
    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "14px",
      spacing: "xs",
      contents: pendingBills.length > 0 ? pendingBills.slice(0, 5).map((b, idx) => ({
        type: "box",
        layout: "horizontal",
        margin: idx > 0 ? "xs" : "none",
        paddingAll: "6px",
        backgroundColor: "#F8FAFC",
        cornerRadius: "6px",
        contents: [
          { type: "text", text: `#${b.id} ${b.requester || "สมชาย"}`, size: "xs", weight: "bold", color: "#0F172A", flex: 6, wrap: true },
          { type: "text", text: `฿${Number(b.amount || 0).toLocaleString("th-TH")}`, size: "xs", weight: "bold", color: "#059669", flex: 4, align: "end" }
        ]
      })) : [
        { type: "text", text: "✅ ไม่มีรายการบิลรออนุมัติ", size: "xs", color: "#059669", align: "center" }
      ]
    }
  };

  return {
    type: "carousel",
    contents: [tab1, tab2, tab3]
  };
}

export function createEveningSummaryCarouselFlex(summary: {
  dateStr: string;
  totalBills: number;
  totalAmount: number;
  pendingCount: number;
  approvedCount: number;
  activeWorksCount: number;
  completedWorksCount: number;
  lateTasks?: Array<{ id: any; details: string; assignee?: string }>;
}): Record<string, any> {
  const formattedAmount = Number(summary.totalAmount || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const lateList = summary.lateTasks || [];

  // Tab 1: 📊 สรุปยอดรวมการเงิน & บิล
  const tab1 = {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#0F172A",
      paddingAll: "15px",
      contents: [
        { type: "text", text: "📊 แท็บ 1/3: สรุปภาพรวมการเงิน & บิล", weight: "bold", color: "#FFFFFF", size: "sm" },
        { type: "text", text: `ประจำวันที่ ${summary.dateStr}`, color: "#38BDF8", size: "xs", margin: "xs" }
      ]
    },
    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "16px",
      spacing: "md",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "รายการบิลทั้งหมด", color: "#64748B", size: "sm" },
            { type: "text", text: `${summary.totalBills} รายการ`, weight: "bold", color: "#0F172A", size: "sm", align: "end" },
          ],
        },
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "รออนุมัติ", color: "#64748B", size: "sm" },
            { type: "text", text: `${summary.pendingCount} รายการ`, weight: "bold", color: "#D97706", size: "sm", align: "end" },
          ],
        },
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "อนุมัติแล้ว", color: "#64748B", size: "sm" },
            { type: "text", text: `${summary.approvedCount} รายการ`, weight: "bold", color: "#16A34A", size: "sm", align: "end" },
          ],
        },
        { type: "separator" },
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "รวมยอดเงินทั้งสิ้น", weight: "bold", color: "#0F172A", size: "sm" },
            { type: "text", text: `฿${formattedAmount}`, weight: "bold", color: "#2563EB", size: "lg", align: "end" },
          ],
        },
      ]
    }
  };

  // Tab 2: 🎯 สรุปผลงานทีมและการดำเนินการ
  const tab2 = {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#1E1B4B",
      paddingAll: "15px",
      contents: [
        { type: "text", text: "🎯 แท็บ 2/3: สรุปผลงานทีม & PW", weight: "bold", color: "#FFFFFF", size: "sm" },
        { type: "text", text: `สรุปความคืบหน้า (${summary.dateStr})`, color: "#A5B4FC", size: "xs", margin: "xs" }
      ]
    },
    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "16px",
      spacing: "md",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "งานที่กำลังดำเนินการ", color: "#64748B", size: "sm" },
            { type: "text", text: `${summary.activeWorksCount} รายการ`, weight: "bold", color: "#2563EB", size: "sm", align: "end" },
          ],
        },
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "งานที่เสร็จสิ้นแล้ว", color: "#64748B", size: "sm" },
            { type: "text", text: `${summary.completedWorksCount} รายการ`, weight: "bold", color: "#16A34A", size: "sm", align: "end" },
          ],
        },
        { type: "separator" },
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "อัตราความสำเร็จ (Success Rate)", color: "#0F172A", size: "xs", weight: "bold" },
            {
              type: "text",
              text: `${summary.activeWorksCount + summary.completedWorksCount > 0
                ? Math.round((summary.completedWorksCount / (summary.activeWorksCount + summary.completedWorksCount)) * 100)
                : 100}%`,
              weight: "bold",
              color: "#4F46E5",
              size: "md",
              align: "end"
            },
          ],
        },
      ]
    }
  };

  // Tab 3: ⏳ รายการงานที่เกินกำหนด/ล่าช้า (Late Tasks Warning)
  const tab3 = {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#991B1B",
      paddingAll: "15px",
      contents: [
        { type: "text", text: "⏳ แท็บ 3/3: รายการงานค้าง/ต้องติดตาม", weight: "bold", color: "#FFFFFF", size: "sm" },
        { type: "text", text: `งานค้างที่รอดำเนินการ (${summary.activeWorksCount} รายการ)`, color: "#FCA5A5", size: "xs", margin: "xs" }
      ]
    },
    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "14px",
      spacing: "xs",
      contents: lateList.length > 0 ? lateList.slice(0, 5).map((l, idx) => ({
        type: "box",
        layout: "vertical",
        margin: idx > 0 ? "xs" : "none",
        paddingAll: "6px",
        backgroundColor: "#FEF2F2",
        cornerRadius: "6px",
        contents: [
          { type: "text", text: `${idx + 1}. [CW${l.id}] ${l.details}`, size: "xs", weight: "bold", color: "#991B1B", wrap: true },
          { type: "text", text: `ผู้รับผิดชอบ: ${l.assignee || "ทีมงาน"}`, size: "xxs", color: "#991B1B" }
        ]
      })) : [
        { type: "text", text: "🎉 ไม่มีรายการงานที่ล่าช้า", size: "xs", color: "#16A34A", align: "center", weight: "bold" }
      ]
    }
  };

  return {
    type: "carousel",
    contents: [tab1, tab2, tab3]
  };
}

export function createBillSearchResultFlex(
  title: string,
  bills: Array<{
    id: any;
    bill_no?: string;
    bill_type?: string;
    project_name?: string;
    vendor_or_person?: string;
    description?: string;
    requester?: string;
    amount?: number | string;
    status?: string;
    image_url?: string;
    image_urls?: string[];
  }>,
  isSub: boolean = false,
  isMain: boolean = false,
  totalCount?: number,
  totalSumAmount?: number,
  filterQuery: string = ""
): Record<string, any> {
  const count = totalCount ?? bills.length;
  const grandTotal = totalSumAmount ?? bills.reduce((sum, b) => sum + Number(b.amount || 0), 0);
  const formattedTotal = grandTotal.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const batchParam = isSub
    ? (filterQuery ? `ย่อย:${filterQuery}` : "ย่อย")
    : isMain
      ? (filterQuery ? `หลัก:${filterQuery}` : "หลัก")
      : filterQuery;

  const pageSize = 4;
  const maxBubbles = 10; // LINE Flex Carousel supports up to 10 bubbles
  const displayBills = bills.slice(0, pageSize * maxBubbles);
  const totalPages = Math.max(1, Math.ceil(displayBills.length / pageSize));

  function buildBubblePage(pageBills: typeof displayBills, pageIndex: number) {
    const startNum = pageIndex * pageSize + 1;
    const endNum = startNum + pageBills.length - 1;

    return {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#0F172A",
        paddingAll: "12px",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              {
                type: "text",
                text: title.replace(/^[^\w\s\u0E00-\u0E7F]+/gu, "").trim(),
                weight: "bold",
                color: "#FFFFFF",
                size: "sm",
                flex: 7,
                wrap: true,
              },
              {
                type: "text",
                text: `รวม ฿${formattedTotal}`,
                color: "#38BDF8",
                size: "xs",
                weight: "bold",
                align: "end",
                flex: 5
              }
            ]
          },
          {
            type: "box",
            layout: "horizontal",
            margin: "xs",
            contents: [
              {
                type: "text",
                text: totalPages > 1
                  ? `หน้า ${pageIndex + 1}/${totalPages} (${startNum}-${endNum} จาก ${count} บิล)`
                  : `พบทั้งหมด ${count} รายการ`,
                color: "#94A3B8",
                size: "xxs",
                flex: 1
              }
            ]
          }
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "10px",
        spacing: "sm",
        contents: pageBills.map((b, idx) => {
          const amt = Number(b.amount || 0).toLocaleString("th-TH");
          const billId = String(b.id || b.bill_no || startNum + idx);
          const requesterName = b.requester || b.vendor_or_person || "สมชาย";

          // Parse single or multiple images
          let imgList: string[] = [];
          if (Array.isArray(b.image_urls) && b.image_urls.length > 0) {
            imgList = b.image_urls.flatMap(u => String(u || "").split(",")).map(s => s.trim()).filter(s => s.startsWith("http"));
          }
          if (imgList.length === 0 && b.image_url) {
            imgList = String(b.image_url).split(",").map(s => s.trim()).filter(s => s.startsWith("http"));
          }

          const hasImages = imgList.length > 0;

          const textDetailsBox = {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: `#${billId}${b.bill_type ? ` [บิล${b.bill_type}]` : ""} | ${b.project_name || "โครงการทั่วไป"}`, weight: "bold", size: "xs", color: "#0F172A", flex: 7, wrap: true },
                  { type: "text", text: `฿${amt}`, weight: "bold", size: "xs", color: "#059669", flex: 3, align: "end" }
                ]
              },
              {
                type: "box",
                layout: "baseline",
                margin: "xs",
                contents: [
                  { type: "text", text: "ผู้เบิก/ร้าน:", size: "xxs", color: "#64748B", flex: 3 },
                  { type: "text", text: requesterName, size: "xxs", color: "#1E293B", flex: 7, wrap: true }
                ]
              },
              {
                type: "box",
                layout: "baseline",
                margin: "xs",
                contents: [
                  { type: "text", text: "รายละเอียด:", size: "xxs", color: "#64748B", flex: 3 },
                  { type: "text", text: b.description || "-", size: "xxs", color: "#334155", flex: 7, wrap: true }
                ]
              },
              {
                type: "box",
                layout: "horizontal",
                margin: "xs",
                contents: [
                  { type: "text", text: `สถานะ: ${b.status || "รออนุมัติ"}`, size: "xxs", color: b.status === "อนุมัติแล้ว" || b.status === "เบิกแล้ว" ? "#059669" : "#D97706", weight: "bold", flex: 5 },
                  {
                    type: "text",
                    text: "[อนุมัติ]",
                    size: "xxs",
                    color: "#2563EB",
                    align: "end",
                    weight: "bold",
                    flex: 3,
                    action: {
                      type: "message",
                      label: "อนุมัติ",
                      text: isSub ? `อนุมัติเงินสดบิลย่อยลำดับที่: ${billId}` : `อนุมัติบิลหลักลำดับที่: ${billId}`
                    }
                  },
                  {
                    type: "text",
                    text: "[ปิดงาน]",
                    size: "xxs",
                    color: "#DC2626",
                    align: "end",
                    weight: "bold",
                    flex: 2,
                    action: {
                      type: "message",
                      label: "ปิดงาน",
                      text: isSub ? `ปิดงานเงินสดบิลย่อยลำดับที่: ${billId}` : `ปิดงานบิลหลักลำดับที่: ${billId}`
                    }
                  }
                ]
              }
            ]
          };

          if (hasImages) {
            const displayedImgs = imgList.slice(0, 4);
            const imgColumns: any[] = displayedImgs.map((imgUrl, imgIdx) => ({
              type: "image",
              url: imgUrl,
              aspectRatio: "1:1",
              aspectMode: "cover",
              flex: 1,
              action: {
                type: "uri",
                label: `รูปที่ ${imgIdx + 1}`,
                uri: normalizeUri(imgUrl)
              }
            }));

            // Always pad up to 4 columns using filler components so each column slot takes exactly 25% width
            while (imgColumns.length < 4) {
              imgColumns.push({
                type: "filler"
              });
            }

            const multiImgRow = {
              type: "box",
              layout: "horizontal",
              margin: "xs",
              spacing: "xs",
              contents: imgColumns
            };

            return {
              type: "box",
              layout: "vertical",
              margin: "xs",
              paddingAll: "8px",
              backgroundColor: "#F8FAFC",
              cornerRadius: "6px",
              contents: [
                textDetailsBox,
                {
                  type: "box",
                  layout: "horizontal",
                  margin: "xs",
                  contents: [
                    { type: "text", text: `รูปแนบใบเสร็จ (${imgList.length} รูป - แตะรูปเพื่อดูภาพเต็ม):`, size: "xxs", color: "#475569", weight: "bold" }
                  ]
                },
                multiImgRow
              ]
            };
          }

          return {
            type: "box",
            layout: "vertical",
            margin: "xs",
            paddingAll: "8px",
            backgroundColor: "#F8FAFC",
            cornerRadius: "6px",
            contents: [textDetailsBox]
          };
        })
      },
      footer: count > 0 && batchParam ? {
        type: "box",
        layout: "horizontal",
        spacing: "sm",
        paddingAll: "10px",
        backgroundColor: "#F1F5F9",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#059669",
            height: "sm",
            flex: 6,
            action: {
              type: "message",
              label: `อนุมัติทั้งหมด (${count})`,
              text: `อนุมัติทั้งหมด:${batchParam}`
            }
          },
          {
            type: "button",
            style: "primary",
            color: "#DC2626",
            height: "sm",
            flex: 6,
            action: {
              type: "message",
              label: `ปิดงานทั้งหมด (${count})`,
              text: `ปิดงานทั้งหมด:${batchParam}`
            }
          }
        ]
      } : undefined
    };
  }

  const bubbles: any[] = [];
  for (let i = 0; i < totalPages; i++) {
    const chunk = displayBills.slice(i * pageSize, (i + 1) * pageSize);
    bubbles.push(buildBubblePage(chunk, i));
  }

  if (bubbles.length === 1) {
    return bubbles[0];
  }

  return {
    type: "carousel",
    contents: bubbles
  };
}

export function createWorkAssignmentFlex(work: {
  id?: string | number;
  title?: string;
  project_name?: string;
  contractor_name?: string;
  amount?: number;
  details?: string;
  contact?: string;
  phone?: string;
}): Record<string, any> {
  const formattedAmount = Number(work.amount || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#1E1B4B",
      paddingAll: "15px",
      contents: [
        {
          type: "text",
          text: "👷‍♂️ รายการมอบหมายงาน (PW)",
          weight: "bold",
          color: "#FFFFFF",
          size: "md",
        },
        {
          type: "text",
          text: `รหัสงาน: ${work.id || "-"}`,
          color: "#A5B4FC",
          size: "xs",
          margin: "xs",
        },
      ],
    },
    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "16px",
      spacing: "md",
      contents: [
        {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          contents: [
            {
              type: "box",
              layout: "baseline",
              contents: [
                { type: "text", text: "โครงการ:", color: "#64748B", size: "xs", flex: 2 },
                { type: "text", text: work.project_name || "-", weight: "bold", color: "#1E293B", size: "xs", flex: 5, wrap: true },
              ],
            },
            {
              type: "box",
              layout: "baseline",
              contents: [
                { type: "text", text: "ผู้รับเหมา:", color: "#64748B", size: "xs", flex: 2 },
                { type: "text", text: work.contractor_name || "-", color: "#1E293B", size: "xs", flex: 5, wrap: true },
              ],
            },
            {
              type: "box",
              layout: "baseline",
              contents: [
                { type: "text", text: "รายละเอียด:", color: "#64748B", size: "xs", flex: 2 },
                { type: "text", text: work.details || "-", color: "#1E293B", size: "xs", flex: 5, wrap: true },
              ],
            },
            {
              type: "box",
              layout: "baseline",
              contents: [
                { type: "text", text: "ติดต่อ:", color: "#64748B", size: "xs", flex: 2 },
                { type: "text", text: `${work.contact || "-"} (${work.phone || "-"})`, color: "#1E293B", size: "xs", flex: 5, wrap: true },
              ],
            },
          ],
        },
        { type: "separator" },
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "ยอดเงินว่าจ้าง", weight: "bold", color: "#0F172A", size: "sm" },
            { type: "text", text: `฿${formattedAmount}`, weight: "bold", color: "#4F46E5", size: "lg", align: "end" },
          ],
        },
      ],
    },
  };
}

export function createTaskSummaryFlex(tasks: Array<{ id: any; details: string; status: string; project: string }>): Record<string, any> {
  return {
    type: "bubble",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#065F46",
      paddingAll: "15px",
      contents: [
        {
          type: "text",
          text: "🎯 สรุปงานค้างที่ต้องดำเนินการ",
          weight: "bold",
          color: "#FFFFFF",
          size: "md",
        },
        {
          type: "text",
          text: `ทั้งหมด ${tasks.length} รายการ`,
          color: "#A7F3D0",
          size: "xs",
          margin: "xs",
        },
      ],
    },
    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "16px",
      spacing: "sm",
      contents: tasks.slice(0, 5).map((t, idx) => ({
        type: "box",
        layout: "vertical",
        margin: idx > 0 ? "sm" : "none",
        contents: [
          {
            type: "text",
            text: `${idx + 1}. [${t.project || "งานทั่วไป"}] ${t.details}`,
            size: "xs",
            weight: "bold",
            color: "#1E293B",
            wrap: true,
          },
          {
            type: "text",
            text: `สถานะ: ${t.status || "กำลังทำ"}`,
            size: "xxs",
            color: "#059669",
          },
        ],
      })),
    },
  };
}

export function createMemberTaskTableFlex(
  memberName: string,
  tasks: Array<{ id: any; details: string; dateStr?: string; days?: number; status?: string }>
): Record<string, any> {
  const planTasks = tasks;
  const todayDateStr = new Date().toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "2-digit" });
  const todayDate = new Date();
  const currentMonth = todayDate.getMonth() + 1;
  const d0 = todayDate.getDate();
  const d_minus_1 = new Date(todayDate.getTime() - 86400000).getDate();
  const d_plus_1 = new Date(todayDate.getTime() + 86400000).getDate();
  const d_plus_2 = new Date(todayDate.getTime() + 2 * 86400000).getDate();

  return {
    type: "bubble",
    size: "giga",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#525252",
      paddingAll: "15px",
      contents: [
        {
          type: "text",
          text: `งานทั้งหมด : ${memberName}(${tasks.length})`,
          weight: "bold",
          color: "#FFFFFF",
          size: "lg",
        },
        {
          type: "box",
          layout: "horizontal",
          margin: "md",
          contents: [
            { type: "text", text: `เอกสาร 0 งาน`, color: "#E5E7EB", size: "xs", weight: "bold" },
            { type: "text", text: `แผนงาน ${tasks.length} งาน`, color: "#F97316", size: "xs", weight: "bold" },
            { type: "text", text: `PJSA 0 งาน`, color: "#E5E7EB", size: "xs", weight: "bold", align: "end" },
          ],
        },
      ],
    },
    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "12px",
      spacing: "sm",
      contents: [
        // Category Banner
        {
          type: "box",
          layout: "vertical",
          backgroundColor: "#F97316",
          paddingAll: "6px",
          contents: [
            { type: "text", text: `แผนงาน ${tasks.length} งาน (ไทม์ไลน์ 4 วัน - เดือน ${currentMonth})`, color: "#FFFFFF", weight: "bold", size: "xs" }
          ]
        },
        // Table Column Header Row
        {
          type: "box",
          layout: "horizontal",
          margin: "xs",
          contents: [
            { type: "text", text: "รายการทั้งหมด", size: "xxs", weight: "bold", color: "#6B7280", flex: 6 },
            { type: "separator" },
            { type: "text", text: "เริ่ม/เสร็จ", size: "xxs", weight: "bold", color: "#6B7280", flex: 3, align: "center" },
            { type: "separator" },
            { type: "text", text: "num", size: "xxs", weight: "bold", color: "#6B7280", flex: 1, align: "center" },
            { type: "separator" },
            {
              type: "box",
              layout: "vertical",
              flex: 5,
              contents: [
                { type: "text", text: "ไทม์ไลน์ 4 วัน", size: "xxs", weight: "bold", color: "#6B7280", align: "center" },
                {
                  type: "box",
                  layout: "horizontal",
                  contents: [
                    { type: "text", text: `${d_minus_1}`, size: "xxs", align: "center", flex: 1, color: "#6B7280" },
                    { type: "separator", color: "#EF4444" },
                    { type: "text", text: `${d0}`, size: "xxs", align: "center", flex: 1, color: "#EF4444", weight: "bold" },
                    { type: "separator", color: "#EF4444" },
                    { type: "text", text: `${d_plus_1}`, size: "xxs", align: "center", flex: 1, color: "#6B7280" },
                    { type: "separator" },
                    { type: "text", text: `${d_plus_2}`, size: "xxs", align: "center", flex: 1, color: "#6B7280" }
                  ]
                }
              ]
            },
            { type: "separator" },
            { type: "text", text: "สถานะ", size: "xxs", weight: "bold", color: "#6B7280", flex: 2, align: "end" }
          ]
        },
        { type: "separator", margin: "xs" },
        // Table Task Items
        ...planTasks.slice(0, 8).map((t, index) => {
          const taskIdStr = String(t.id || index + 100);
          return {
            type: "box",
            layout: "vertical",
            margin: "sm",
            contents: [
              {
                type: "box",
                layout: "horizontal",
                spacing: "xs",
                contents: [
                  {
                    type: "text",
                    text: `[${taskIdStr}]${t.details}`,
                    size: "xs",
                    color: "#1F2937",
                    flex: 6,
                    wrap: true,
                    weight: "bold"
                  },
                  { type: "separator" },
                  {
                    type: "text",
                    text: t.dateStr || todayDateStr,
                    size: "xxs",
                    color: "#6B7280",
                    flex: 3,
                    align: "center"
                  },
                  { type: "separator" },
                  {
                    type: "text",
                    text: "1",
                    size: "xs",
                    color: "#374151",
                    flex: 1,
                    align: "center"
                  },
                  { type: "separator" },
                  // 4-Day Timeline Grid with Red Today Column Border Line
                  {
                    type: "box",
                    layout: "horizontal",
                    flex: 5,
                    contents: [
                      { type: "text", text: index % 3 === 0 ? "🟦" : "⬜", size: "xxs", align: "center", flex: 1 },
                      { type: "separator", color: "#EF4444" },
                      { type: "text", text: "🟦", size: "xxs", align: "center", flex: 1, color: "#EF4444" },
                      { type: "separator", color: "#EF4444" },
                      { type: "text", text: index % 2 === 0 ? "🟦" : "⬜", size: "xxs", align: "center", flex: 1 },
                      { type: "separator" },
                      { type: "text", text: "⬜", size: "xxs", align: "center", flex: 1 }
                    ]
                  },
                  { type: "separator" },
                  {
                    type: "text",
                    text: t.status === "เสร็จ" ? "✅" : "Close",
                    size: "xs",
                    color: t.status === "เสร็จ" ? "#16A34A" : "#DC2626",
                    flex: 2,
                    align: "end",
                    weight: "bold",
                    action: {
                      type: "message",
                      label: "Close",
                      text: `ปิดงาน: ${taskIdStr}`
                    }
                  }
                ]
              },
              { type: "separator", margin: "xs" }
            ]
          };
        })
      ]
    },
  };
}

function normalizeUri(uri?: string): string {
  let str = (uri || "").trim();
  if (!str) return "https://coscosesuperbase.vercel.app";
  if (!str.startsWith("http://") && !str.startsWith("https://")) {
    str = `https://${str}`;
  }
  return str;
}

