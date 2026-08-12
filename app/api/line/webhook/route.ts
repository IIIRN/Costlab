import { NextRequest, NextResponse } from "next/server";
import { replyTextMessage } from "@/lib/line";
import { handleLineCommand } from "@/lib/line-commands";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const events = body.events || [];

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ status: "ok", message: "LINE Webhook Verify OK" });
    }

    for (const event of events) {
      if (!event) continue;
      const replyToken = event.replyToken || "";
      const targetId = event.source?.groupId || event.source?.userId || "";
      const userId = event.source?.userId || "";

      // Handle Text Message Commands
      if (event.type === "message" && event.message?.type === "text") {
        const text = String(event.message.text || "").trim();

        // Delegate to centralized line-commands processor
        const handled = await handleLineCommand(text, replyToken, targetId, userId);

        if (!handled && replyToken && !replyToken.startsWith("00000000")) {
          // Default Auto Reply
          await replyTextMessage(
            replyToken,
            `ได้รับคำสั่ง "${text}" เรียบร้อยแล้วครับ พิมพ์ "ช่วยเหลือ" หรือ "เมนู" เพื่อดูคำสั่งทั้งหมดที่สามารถใช้งานได้ครับ`
          );
        }
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error: any) {
    console.error("❌ LINE Webhook error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

