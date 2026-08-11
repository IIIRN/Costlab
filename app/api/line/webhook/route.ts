import { NextRequest, NextResponse } from "next/server";
import { replyTextMessage, replyFlexMessage, createBillNotificationFlex } from "@/lib/line";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const events = body.events || [];

    for (const event of events) {
      const replyToken = event.replyToken;

      // Handle Text Message Commands
      if (event.type === "message" && event.message?.type === "text") {
        const text = String(event.message.text || "").trim();
        const lowerText = text.toLowerCase();

        // 1. System Health Check & Test Commands
        if (lowerText === "testbot" || lowerText === "check" || lowerText === " status") {
          const { data, error } = await supabaseAdmin.from("bills").select("id", { count: "exact", head: true });
          if (error) {
            await replyTextMessage(replyToken, `⚠️ ตรวจสอบระบบ: สื่อสารกับ LINE ได้ปกติ แต่พบปัญหา Supabase: ${error.message}`);
          } else {
            await replyTextMessage(
              replyToken,
              `✅ 🤖 บอททำงานปกติ 100%!\n\n- Engine: Next.js v15 (Serverless)\n- Database: Supabase PostgreSQL (Connected)\n- Status: พร้อมรับคำสั่งตลอด 24 ชั่วโมง`
            );
          }
          continue;
        }

        // 2. Menu & Help Commands
        if (lowerText === "ช่วยด้วย" || lowerText === "เมนู" || lowerText === "คำสั่ง" || lowerText === "help") {
          const menuText = `🤖 ระบบ LINE Bot ประจำ CostCode Supabase\n\n📌 คำสั่งที่สามารถใช้ได้:\n\n1. 📊 หมวดสรุปการเงิน/บิล:\n   - พิมพ์ "สรุป" หรือ "สรุปบิล" (สรุปภาพรวมวันนี้)\n   - พิมพ์ "รออนุมัติ" (ดูบิลที่รอการตรวจสอบ)\n   - พิมพ์ "บิลหลัก:" หรือ "บิลย่อย:"\n\n2. 🎯 หมวดงาน/รับเหมา (PW):\n   - พิมพ์ "งาน" หรือ "งานทั้งหมด"\n   - พิมพ์ "มอบหมาย:" หรือ "PW:"\n\n3. ⚙️ หมวดตรวจสอบระบบ:\n   - พิมพ์ "testbot" หรือ "check"`;
          await replyTextMessage(replyToken, menuText);
          continue;
        }

        // 3. Withdraw & Bills Commands (Controller_Withdraw & Controller_AllWorks)
        if (lowerText.includes("สรุป") || lowerText.includes("สรุปบิล") || lowerText.includes("บิลวันนี้")) {
          const { data: bills, error } = await supabaseAdmin.from("bills").select("amount, status");

          if (error) {
            await replyTextMessage(replyToken, `❌ เกิดข้อผิดพลาดในการดึงข้อมูลบิล: ${error.message}`);
            continue;
          }

          const totalBills = bills?.length || 0;
          const totalAmount = bills?.reduce((acc, row) => acc + (Number(row.amount) || 0), 0) || 0;
          const pendingBills = bills?.filter((row) => row.status === "รอตรวจสอบ" || row.status === "รออนุมัติ") || [];
          const approvedBills = bills?.filter((row) => row.status === "อนุมัติแล้ว" || row.status === "จ่ายแล้ว") || [];

          const summaryText = `📊 สรุปยอดรายการเบิกเงินระบบ CostCode Supabase\n\n- รายการบิลทั้งหมด: ${totalBills} รายการ\n- ยอดเงินรวมทั้งสิ้น: ฿${totalAmount.toLocaleString("th-TH")}\n- ⏳ รออนุมัติ: ${pendingBills.length} รายการ\n- ✅ อนุมัติแล้ว/จ่ายแล้ว: ${approvedBills.length} รายการ\n\nสามารถดูรายละเอียดฉบับเต็มได้บนหน้าเว็บ`;
          await replyTextMessage(replyToken, summaryText);
          continue;
        }

        if (lowerText.includes("รออนุมัติ")) {
          const { data: pendingBills } = await supabaseAdmin
            .from("bills")
            .select("*")
            .or("status.eq.รอตรวจสอบ,status.eq.รออนุมัติ")
            .limit(5);

          if (!pendingBills || pendingBills.length === 0) {
            await replyTextMessage(replyToken, "✅ ไม่มีรายการบิลที่รออนุมัติในขณะนี้ครับ");
            continue;
          }

          const firstBill = pendingBills[0];
          const flex = createBillNotificationFlex({
            id: firstBill.id,
            project_name: firstBill.project_name || firstBill.project_id || "-",
            vendor_or_person: firstBill.vendor_or_person || "-",
            description: firstBill.description || "-",
            amount: firstBill.amount || 0,
            requester: firstBill.requester || "-",
            status: firstBill.status || "รอตรวจสอบ",
          });

          await replyFlexMessage(replyToken, `พบ ${pendingBills.length} รายการรออนุมัติ`, flex);
          continue;
        }

        // 4. Task & Work Assignment Commands (Controller_Task & Controller_Work)
        if (lowerText === "งาน" || lowerText === "งานทั้งหมด" || lowerText.startsWith("งาน:")) {
          const { data: contractWorks } = await supabaseAdmin
            .from("contract_works")
            .select("*")
            .limit(5);

          if (!contractWorks || contractWorks.length === 0) {
            await replyTextMessage(replyToken, "📋 ยังไม่มีรายการงานในระบบ");
            continue;
          }

          let workText = `📋 รายการงานและงานรับเหมาล่าสุด (${contractWorks.length} รายการ):\n\n`;
          contractWorks.forEach((item, index) => {
            workText += `${index + 1}. [${item.id}] ${item.project_name || item.project_id || "งานจ้าง"}\n   - รายละเอียด: ${item.work_details || "-"}\n   - ยอดจ้าง: ฿${Number(item.total_contract_amount || 0).toLocaleString("th-TH")}\n\n`;
          });

          await replyTextMessage(replyToken, workText.trim());
          continue;
        }

        // 5. Plan & Contract Commands (Controller_Plan)
        if (lowerText.startsWith("แผน:") || lowerText.includes("บิลหลัก") || lowerText.includes("บิลย่อย")) {
          const { data: projects } = await supabaseAdmin
            .from("projects")
            .select("id, name, customer_name, budget")
            .limit(5);

          let planText = `📐 สรุปข้อมูลแผนงานและโครงการ:\n\n`;
          if (projects && projects.length > 0) {
            projects.forEach((p, idx) => {
              planText += `${idx + 1}. โครงการ: ${p.name} (ID: ${p.id})\n   - ลูกค้า: ${p.customer_name || "-"}\n   - งบประมาณ: ฿${Number(p.budget || 0).toLocaleString("th-TH")}\n\n`;
            });
          } else {
            planText += "ไม่พบข้อมูลโครงการในระบบ";
          }
          await replyTextMessage(replyToken, planText.trim());
          continue;
        }

        // Default Auto Reply
        await replyTextMessage(
          replyToken,
          `ได้รับคำสั่ง "${text}" เรียบร้อยแล้วครับ พิมพ์ "ช่วยเหลือ" หรือ "เมนู" เพื่อดูคำสั่งทั้งหมดได้ครับ`
        );
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error: any) {
    console.error("❌ LINE Webhook error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
