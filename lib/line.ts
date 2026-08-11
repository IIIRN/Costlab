import { supabaseAdmin } from "@/lib/supabase-admin";

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
    // Fall back to process.env
  }
  return process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
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
        messages: [
          {
            type: "flex",
            altText,
            contents: flexContents,
          },
        ],
      }),
    });
    return res.ok;
  } catch (error: any) {
    console.error("❌ Failed to reply flex message to LINE:", error.message || error);
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
          text: `สถานะ: ${bill.status || "รอตรวจสอบ"}`,
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
    footer: {
      type: "box",
      layout: "horizontal",
      spacing: "sm",
      contents: [
        {
          type: "button",
          style: "primary",
          color: "#0F172A",
          height: "sm",
          action: {
            type: "uri",
            label: "เปิดดูบนระบบเว็บ",
            uri: normalizeUri(process.env.NEXT_PUBLIC_APP_URL),
          },
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
    footer: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "button",
          style: "primary",
          color: "#2563EB",
          height: "sm",
          action: {
            type: "uri",
            label: "เข้าสู่ระบบเพื่อจัดการ",
            uri: normalizeUri(process.env.NEXT_PUBLIC_APP_URL),
          },
        },
      ],
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
