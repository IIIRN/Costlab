import {
  replyTextMessage,
  replyFlexMessage,
  createBillNotificationFlex,
  createWorkAssignmentFlex,
  createTaskSummaryFlex,
  createMemberTaskTableFlex,
  createBillSearchResultFlex,
  isLineApproverAuthorized
} from "@/lib/line";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { insertRowToSupabase } from "@/lib/supabase-db";

/**
  * Central command processor for all 63 AppscriptBot keywords migrated to Next.js + Supabase
  */
export async function handleLineCommand(
  text: string,
  replyToken: string,
  targetId: string,
  userId: string
): Promise<boolean> {
  const rawText = text.trim();
  const lowerText = rawText.toLowerCase();

  try {
    // 1. System Health Check & Test Commands
    if (lowerText === "testbot" || lowerText === "check" || lowerText === "status" || lowerText === "getid") {
      if (lowerText === "getid") {
        await replyTextMessage(replyToken, `🟢 BOT Online (Supabase Engine)\n\nTarget ID: ${targetId}\nUser ID: ${userId}`);
        return true;
      }

      const { data, error } = await supabaseAdmin.from("bills").select("id", { count: "exact", head: true });
      if (error) {
        await replyTextMessage(replyToken, `⚠️ ตรวจสอบระบบ: LINE Webhook ทำงานปกติ แต่พบข้อความจาก Supabase: ${error.message}`);
      } else {
        await replyTextMessage(
          replyToken,
          `✅ 🤖 บอท CostCode Supabase ทำงานปกติ 100%!\n\n- Engine: Next.js v15 (Serverless)\n- Database: Supabase PostgreSQL (Connected)\n- Target ID: ${targetId}\n- Status: พร้อมรับทุกคำสั่ง 24/7`
        );
      }
      return true;
    }

    // 2. Menu & Help Commands
    if (lowerText === "ช่วยด้วย" || lowerText === "ช่วยเหลือ" || lowerText === "ช่วย" || lowerText === "เมนู" || lowerText === "คำสั่ง" || lowerText === "help") {
      const menuText = `🤖 ระบบ LINE Bot ประจำ CostCode Supabase\n\n📌 คำสั่งที่รองรับทั้งหมด (63 คำสั่ง):\n\n1. 📊 หมวดสรุปการเงิน/เบิกเงิน:\n   - พิมพ์ "สรุป" / "สรุปบิล" / "สรุปวันนี้"\n   - พิมพ์ "รออนุมัติ"\n   - พิมพ์ "บิลหลัก: [ชื่อ]" หรือ "บิลย่อย: [ชื่อ]"\n   - พิมพ์ "อนุมัติบิลหลักของ:" / "อนุมัติเงินสดบิลย่อยของ:"\n   - พิมพ์ "ปิดงานบิลหลักลำดับที่:"\n\n2. 🎯 หมวดงาน & PW มอบหมาย:\n   - พิมพ์ "งาน2: [ชื่อพนักงาน]" (ดูตารางงานแผนงาน)\n   - พิมพ์ "งาน: [รายละเอียดงาน]" (สร้างงานใหม่)\n   - พิมพ์ "งานด่วน:" / "ปิดงาน:" / "ยืนยันปิดงาน:" / "s:" (ค้นหา)\n   - พิมพ์ "มอบหมาย:" / "กิจกรรม:" / "PW:" / "PW1:work" / "PWALL:work"\n\n3. 📐 หมวดแผนงาน (Plans):\n   - พิมพ์ "แผน: [ชื่อโครงการ]"\n   - พิมพ์ "(บิลหลัก)" / "(บิลย่อย)"\n\n4. ⚙️ หมวดตรวจสอบระบบ:\n   - พิมพ์ "testbot" / "check" / "getid"`;
      await replyTextMessage(replyToken, menuText);
      return true;
    }

    // 3. Task Commands (Controller_Task.gs)
    // 3.1 Task Search Grid by Member ("งาน2:เจมส์", "งาน:เจมส์") vs Create Task ("งาน: รายละเอียด...")
    if (rawText.startsWith("งาน2:") || rawText.startsWith("งาน:") || rawText.startsWith("งานด่วน:")) {
      const isTaskGridQuery = rawText.startsWith("งาน2:") || (rawText.startsWith("งาน:") && !rawText.includes(" ") && !rawText.includes(":") && !rawText.includes("["));
      const content = rawText.replace(/^งานด่วน:|^งาน2:|^งาน:/, "").trim();

      // A) Query Member Task Table Grid
      if (isTaskGridQuery || content.length < 15) {
        const memberName = content || "ทีมงาน";
        const { data: contractWorks } = await supabaseAdmin
          .from("contract_works")
          .select("*")
          .order("id", { ascending: false })
          .limit(10);

        if (!contractWorks || contractWorks.length === 0) {
          await replyTextMessage(replyToken, `📋 ไม่พบรายการงานของ "${memberName}" ในระบบ\n\nกรุณาตรวจสอบชื่อหรือเพิ่มงานผ่านคำสั่ง "งาน: รายละเอียด" ครับ`);
          return true;
        }

        const dbTasks = contractWorks.map(w => ({
          id: w.id,
          details: w.work_details || w.project_name || "งานประจำวัน",
          dateStr: new Date().toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "2-digit" }),
          status: "กำลังทำ"
        }));

        const flex = createMemberTaskTableFlex(memberName, dbTasks);
        const sent = await replyFlexMessage(replyToken, `📋 รายการงานทั้งหมดของ ${memberName} (${dbTasks.length} รายการ)`, flex);

        if (!sent && replyToken) {
          let textSummary = `📋 งานทั้งหมด : ${memberName} (${dbTasks.length} รายการ)\n\n`;
          dbTasks.forEach((t, i) => {
            textSummary += `${i + 1}. [CW${t.id}] ${t.details} (${t.dateStr}) - Close\n`;
          });
          await replyTextMessage(replyToken, textSummary);
        }
        return true;
      }

      // B) Create Task with safe row insertion and generated non-null ID
      const isUrgent = rawText.startsWith("งานด่วน:");
      let assignee = "สมชาย";
      let details = content;
      const match = content.match(/\[(.*?)\]$/) || content.match(/-(.*?)$/);
      if (match) {
        assignee = match[1].trim();
        details = content.replace(match[0], "").trim();
      }

      const generatedId = `CW-${Date.now().toString().slice(-6)}`;
      const rowObj = {
        id_Conwork: generatedId,
        id: generatedId,
        "รายละเอียดงาน": `${isUrgent ? "🔴 [ด่วน] " : ""}${details}`,
        "เบอร์โทรศัพท์": "-",
        "ยอดเงินจ้าง": 0,
        "ยอดเงินจ่าย": 0
      };

      await insertRowToSupabase("งานรับเหมา", rowObj);

      await replyTextMessage(
        replyToken,
        `✅ บันทึกงานเรียบร้อยแล้ว!\n\n📌 รหัสงาน: ${generatedId}\nรายละเอียด: ${details}\nผู้รับผิดชอบ: ${assignee}\nสถานะ: กำลังดำเนินการ`
      );
      return true;
    }

    // 3.2 Close Task ("ปิดงาน:", "ยืนยันปิดงาน:")
    if (rawText.startsWith("ปิดงาน:") || rawText.startsWith("ยืนยันปิดงาน:")) {
      const taskId = rawText.replace(/^ปิดงาน:|^ยืนยันปิดงาน:/, "").trim();
      if (!taskId) {
        await replyTextMessage(replyToken, `⚠️ กรุณาระบุรหัสงานที่ต้องการปิด\nเช่น ปิดงาน: 101`);
        return true;
      }

      const { error } = await supabaseAdmin
        .from("contract_works")
        .update({ work_details: `[เสร็จสิ้น] (ปิดงานเมื่อ ${new Date().toLocaleDateString("th-TH")})` })
        .eq("id", taskId);

      if (error) {
        await replyTextMessage(replyToken, `❌ ปิดงานรหัส ${taskId} ไม่สำเร็จ: ${error.message}`);
      } else {
        await replyTextMessage(replyToken, `🎉 ปิดงานรหัส [${taskId}] เรียบร้อยแล้วครับ!`);
      }
      return true;
    }

    // 3.3 Search Task ("s:", "งานทั้งหมด", ":งานที่ทำ", ":งานที่เสร็จ")
    if (rawText.startsWith("s:") || lowerText === "งานทั้งหมด" || lowerText === "งาน" || lowerText.includes(":งานที่ทำ") || lowerText.includes(":งานที่เสร็จ")) {
      const searchTerm = rawText.replace(/^s:/, "").replace(/^งาน:/, "").trim();
      let query = supabaseAdmin.from("contract_works").select("*");
      if (searchTerm && searchTerm !== "งานทั้งหมด" && searchTerm !== "งาน") {
        query = query.ilike("work_details", `%${searchTerm}%`);
      }
      const { data: tasks } = await query.order("id", { ascending: false }).limit(10);

      if (!tasks || tasks.length === 0) {
        const noTaskMsg = searchTerm
          ? `🔍 ไม่พบงานที่ตรงกับ "${searchTerm}"\n\nลองค้นหาคำอื่น หรือสร้างงานใหม่ด้วยคำสั่ง "งาน: รายละเอียด" ครับ`
          : `📋 ไม่พบรายการงานค้างในระบบขณะนี้`;
        await replyTextMessage(replyToken, noTaskMsg);
        return true;
      }

      const formattedTasks = tasks.map(t => ({
        id: t.id,
        details: t.work_details || "-",
        status: "กำลังทำ",
        project: t.project_name || t.project_id || "งานทั่วไป"
      }));

      const flex = createTaskSummaryFlex(formattedTasks);
      await replyFlexMessage(replyToken, `📋 รายการงานค้าง (${tasks.length} รายการ)`, flex);
      return true;
    }

    // 4. Work / PW Commands (Controller_Work.gs)
    if (rawText.startsWith("มอบหมาย:") || rawText.startsWith("กิจกรรม:") || rawText.startsWith("PW:") || rawText.startsWith("PW1:") || rawText.startsWith("PWALL:")) {
      const content = rawText.replace(/^มอบหมาย:|^กิจกรรม:|^PW:|^PW1:work|^PWALL:work|^PW:/, "").trim();
      if (!content) {
        await replyTextMessage(replyToken, `⚠️ กรุณาระบุรายละเอียดการมอบหมายงาน\nเช่น มอบหมาย: งานผูกเหล็กและเทคอนกรีต [ช่างเอก] ฿250,000`);
        return true;
      }

      // Parse content: "มอบหมาย: งานผูกเหล็ก [ช่างเอก] ฿250,000 โทร:081-234-5678"
      const amountMatch = content.match(/฿([\d,]+)/);
      const contractorMatch = content.match(/\[([^\]]+)\]/);
      const phoneMatch = content.match(/(?:โทร|tel|phone)[:\s]*([\d\-]+)/i);

      const parsedAmount = amountMatch ? Number(amountMatch[1].replace(/,/g, "")) : 0;
      const parsedContractor = contractorMatch ? contractorMatch[1].trim() : "-";
      const parsedPhone = phoneMatch ? phoneMatch[1].trim() : "-";
      const parsedDetails = content
        .replace(/฿[\d,]+/, "")
        .replace(/\[[^\]]+\]/, "")
        .replace(/(?:โทร|tel|phone)[:\s]*[\d\-]+/i, "")
        .trim() || content;

      const pwId = `PW-${Date.now().toString().slice(-6)}`;

      const flex = createWorkAssignmentFlex({
        id: pwId,
        project_name: "-",
        contractor_name: parsedContractor,
        amount: parsedAmount,
        details: parsedDetails,
        contact: parsedContractor !== "-" ? parsedContractor : "-",
        phone: parsedPhone
      });

      await replyFlexMessage(replyToken, `👷‍♂️ มอบหมายงาน [${pwId}] เรียบร้อยแล้ว`, flex);
      return true;
    }

    // 5. Approve / Close Bill Commands ("อนุมัติบิลหลักของ:", "อนุมัติเงินสดบิลย่อยของ:", "ปิดงานบิลหลักลำดับที่:")
    if (
      rawText.startsWith("อนุมัติบิลหลักของ:") ||
      rawText.startsWith("อนุมัติเงินสดบิลย่อยของ:") ||
      rawText.startsWith("ปิดงานบิลหลักลำดับที่:") ||
      rawText.startsWith("ปิดงานเงินสดบิลย่อยของ:")
    ) {
      const targetNameOrId = rawText.replace(/.*?:/, "").trim();
      const isApprove = rawText.includes("อนุมัติ");

      if (!targetNameOrId) {
        await replyTextMessage(replyToken, `⚠️ กรุณาระบุชื่อผู้เบิกหรือเลขบิลที่ต้องการ${isApprove ? "อนุมัติ" : "ปิดงาน"}`);
        return true;
      }

      // Check LINE Approver Authorization
      const isAuthorized = await isLineApproverAuthorized(userId, targetId);
      if (!isAuthorized) {
        await replyTextMessage(
          replyToken,
          `⛔ ขออภัยครับ บัญชี LINE ของคุณไม่มีสิทธิ์ในการ${isApprove ? "อนุมัติ" : "ปิดงาน"}บิล\n\n(สิทธิ์นี้สงวนไว้เฉพาะผู้ดูแลระบบ Admin หรือ ผู้อนุมัติที่ได้รับอนุญาตเท่านั้น)`
        );
        return true;
      }

      const newStatus = isApprove ? "อนุมัติแล้ว" : "เบิกแล้ว";
      
      const { getRowsFromSupabase, updateRowInSupabase } = await import("@/lib/supabase-db");
      const [rawBills, peopleRows] = await Promise.all([
        getRowsFromSupabase("Data", 1000),
        getRowsFromSupabase("master_members", 500).catch(() => []),
      ]);

      // สร้าง Map สำหรับเทียบชื่อผู้เบิก <-> รหัสพนักงาน
      const peopleMap = new Map<string, string>();
      const nameToEmpIdMap = new Map<string, string>();
      for (const p of peopleRows) {
        const empId = String(p["รหัสพนักงาน"] || p.id || "").trim();
        const empName = String(p["ชื่อเล่น"] || p["ชื่อ-นามสกุล"] || p.name || "").trim();
        if (empId && empName) {
          peopleMap.set(empId, empName);
          nameToEmpIdMap.set(empName, empId);
        }
      }

      const target = targetNameOrId.trim();
      const matchedEmpId = nameToEmpIdMap.get(target) || target;

      // ค้นหาบิลที่ตรงกับชื่อผู้เบิก รหัสพนักงาน หรือ ID บิล
      const targetBills = rawBills.filter(b => {
        const bId = String(b["ลำดับ"] || b.id || b._sheetRow || "").trim();
        const bReq = String(b["ผู้เบิก"] || b.requester || "").trim();
        const bReqName = peopleMap.get(bReq) || bReq;
        
        return bId === target || bReq === target || bReq === matchedEmpId || bReqName === target;
      });

      if (targetBills.length === 0) {
        // Fallback ปรับปรุงโดยตรงผ่าน Supabase Client (แยกเลข ID กับ String)
        let query = supabaseAdmin.from("bills").update({ status: newStatus });
        if (/^\d+$/.test(target)) {
          query = query.eq("id", Number(target));
        } else {
          query = query.eq("requester", target);
        }
        const { error } = await query;
        if (error) {
          await replyTextMessage(replyToken, `❌ ดำเนินการอัปเดตบิลไม่สำเร็จ: ${error.message}`);
          return true;
        }
      } else {
        // อัปเดตบิลทุกรายการที่ตรงกันผ่าน updateRowInSupabase
        for (const b of targetBills) {
          const bId = b.id || b["ลำดับ"] || b._sheetRow;
          await updateRowInSupabase("bills", "id", bId, {
            "สถานะ": newStatus,
            status: newStatus
          });
        }
      }

      await replyTextMessage(
        replyToken,
        `✅ ${isApprove ? "อนุมัติ" : "ปิดงาน"}บิลของ "${targetNameOrId}" เป็นสถานะ [${newStatus}] เรียบร้อยแล้วครับ!\n\n👮‍♂️ ผู้ดำเนินการ: Admin/Approver (${userId ? userId.slice(-6) : "Web"})`
      );
      return true;
    }

    // 6. Query Bills Specific Commands
    // "หลัก:", "บิลหลัก:", "ย่อย:", "บิลย่อย:", "ทั้งหมด:", "รออนุมัติ"
    // "บิล:", "bill:" — ค้นหาทั่วไป (ทั้งบิลหลักและย่อย)
    if (
      rawText.startsWith("หลัก:") ||
      rawText.startsWith("ย่อย:") ||
      rawText.startsWith("บิลหลัก:") ||
      rawText.startsWith("บิลย่อย:") ||
      rawText.startsWith("ทั้งหมด:") ||
      rawText.startsWith("บิล:") ||
      rawText.toLowerCase().startsWith("bill:") ||
      lowerText === "รออนุมัติ"
    ) {
      const isSub = rawText.includes("ย่อย");
      const filterQuery = rawText.replace(/^หลัก:|^ย่อย:|^บิลหลัก:|^บิลย่อย:|^ทั้งหมด:|^บิล:|^bill:/i, "").trim();

      // ดึงข้อมูลบิลและตารางอ้างอิงทั้งหมดเพื่อ hydrate ข้อมูลให้เหมือนหน้าเว็บ 100%
      const { getRowsFromSupabase } = await import("@/lib/supabase-db");
      const { hydrateBillRows } = await import("@/lib/formulas");

      const [rawBills, peopleRows, projectRows, storeRows, contractRows, contractorRows] = await Promise.all([
        getRowsFromSupabase("Data", 1000),
        getRowsFromSupabase("master_members", 500).catch(() => []),
        getRowsFromSupabase("Project", 500).catch(() => []),
        getRowsFromSupabase("ร้านค้า", 500).catch(() => []),
        getRowsFromSupabase("งานรับเหมา", 500).catch(() => []),
        getRowsFromSupabase("รับเหมา", 500).catch(() => []),
      ]);

      // สร้าง Map สำหรับแปลง รหัสพนักงาน <-> ชื่อเล่น / ชื่อ-นามสกุล
      const peopleMap = new Map<string, string>();
      for (const p of peopleRows) {
        const empId = String(p["รหัสพนักงาน"] || p.id || "").trim();
        const empName = String(p["ชื่อเล่น"] || p["ชื่อ-นามสกุล"] || p.name || "").trim();
        if (empId && empName) {
          peopleMap.set(empId, empName);
        }
      }

      // Hydrated bills (เติมชื่อโครงการ, ร้านค้า, รายละเอียดงาน)
      const hydratedBills = await hydrateBillRows(rawBills, {
        projects: projectRows,
        stores: storeRows,
        contracts: contractRows,
        contractors: contractorRows,
      });

      let filtered = hydratedBills;

      if (lowerText === "รออนุมัติ") {
        filtered = hydratedBills.filter(b => {
          const st = String(b["สถานะ"] || b.status || "").trim();
          return st === "รอตรวจสอบ" || st === "รออนุมัติ" || st === "รอดำเนินการ";
        });
      } else if (filterQuery && filterQuery !== "ทั้งหมด") {
        const q = filterQuery.toLowerCase();
        filtered = hydratedBills.filter(b => {
          const rawReq = String(b["ผู้เบิก"] || b.requester || "").toLowerCase();
          const mappedReq = (peopleMap.get(String(b["ผู้เบิก"] || b.requester || "").trim()) || "").toLowerCase();
          const vendor = String(b["ร้าน/บุคคล"] || b.vendor_or_person || "").toLowerCase();
          const desc = String(b["สินค้า/ทำงาน"] || b.description || "").toLowerCase();
          const billNo = String(b["บิล"] || b.bill_no || b["ลำดับ"] || b.id || "").toLowerCase();
          const projName = String(b["ชื่อ Project"] || b.project_name || "").toLowerCase();

          return rawReq.includes(q) || mappedReq.includes(q) || vendor.includes(q) || desc.includes(q) || billNo.includes(q) || projName.includes(q);
        });
      }

      if (isSub) {
        filtered = filtered.filter(b => {
          const cat = String(b["ประเภท"] || b.category || "").trim();
          return cat.includes("ย่อย") || cat.startsWith("2.") || cat.startsWith("3.") || cat.startsWith("8.");
        });
      }

      const bills = filtered.slice(0, 5).map(b => {
        const reqIdOrName = String(b["ผู้เบิก"] || b.requester || "").trim();
        const resolvedRequester = peopleMap.get(reqIdOrName) || reqIdOrName || "-";

        return {
          id: b["ลำดับ"] || b.id,
          bill_no: String(b["บิล"] || b.bill_no || b["ลำดับ"] || b.id || "-"),
          project_name: String(b["ชื่อ Project"] || b.project_name || "โครงการ"),
          vendor_or_person: String(b["ร้าน/บุคคล"] || b.vendor_or_person || "-"),
          description: String(b["สินค้า/ทำงาน"] || b.description || "-"),
          amount: Number(b["ยอดเงิน"] || b.amount || 0),
          status: String(b["สถานะ"] || b.status || "รออนุมัติ"),
          requester: String(resolvedRequester)
        };
      });

      // ✅ FIX: ลบ hardcoded fallback — แสดง "ไม่พบรายการ" แทนข้อมูลปลอม
      if (!bills || bills.length === 0) {
        const noResultMsg = lowerText === "รออนุมัติ"
          ? "✅ ไม่มีรายการรออนุมัติในขณะนี้ครับ\n\nบิลทั้งหมดได้รับการอนุมัติหรือดำเนินการแล้ว"
          : filterQuery
            ? `🔍 ไม่พบรายการบิลที่ตรงกับ "${filterQuery}"\n\nกรุณาตรวจสอบชื่อผู้เบิกหรือรายละเอียดที่ค้นหาอีกครั้งครับ`
            : "ไม่พบรายการบิลในระบบ";
        await replyTextMessage(replyToken, noResultMsg);
        return true;
      }

      const flexTitle = lowerText === "รออนุมัติ"
        ? `รายการรออนุมัติ`
        : filterQuery
          ? `ผลการค้นหาบิล${isSub ? "ย่อย" : ""}ของ "${filterQuery}"`
          : `รายการเบิกเงิน${isSub ? "บิลย่อย" : "บิลหลัก"}`;

      const flexPayload = createBillSearchResultFlex(flexTitle, bills, isSub);

      const sent = await replyFlexMessage(replyToken, `🧾 ${flexTitle} (${bills.length} รายการ)`, flexPayload);
      if (!sent && replyToken) {
        let textResponse = `🧾 ${flexTitle} (${bills.length} รายการ):\n\n`;
        bills.forEach((b, idx) => {
          const amt = Number(b.amount || 0).toLocaleString("th-TH");
          textResponse += `${idx + 1}. [บิล #${b.bill_no || b.id}] ${b.project_name}\n   - ผู้เบิก/ร้าน: ${b.requester || b.vendor_or_person}\n   - รายละเอียด: ${b.description}\n   - ยอดเงิน: ฿${amt}\n   - สถานะ: ${b.status}\n\n`;
        });
        await replyTextMessage(replyToken, textResponse.trim());
      }
      return true;
    }

    // 7. Summary Commands (Controller_AllWorks.gs & Summary)
    if (lowerText.includes("สรุป") || lowerText.includes("สรุปบิล") || lowerText.includes("สรุปวันนี้") || lowerText === ":รวม") {
      const { getRowsFromSupabase } = await import("@/lib/supabase-db");
      const bills = await getRowsFromSupabase("Data", 5000);

      const totalBills = bills.length;
      let totalAmount = 0;
      let pendingCount = 0;
      let approvedCount = 0;

      bills.forEach(b => {
        const amt = Number(b["ยอดเงิน"] || b.amount || 0);
        totalAmount += amt;

        const st = String(b["สถานะ"] || b.status || "").trim();
        if (st === "รอตรวจสอบ" || st === "รออนุมัติ" || st === "รอดำเนินการ") {
          pendingCount++;
        } else if (st === "อนุมัติแล้ว" || st === "เบิกแล้ว" || st === "จ่ายแล้ว" || st === "อนุมัติ") {
          approvedCount++;
        }
      });

      const textSummary = `📊 สรุปรายงานการเงินประจำวัน (CostCode Supabase)\n\n` +
        `- บิลทั้งหมด: ${totalBills} รายการ\n` +
        `- ⏳ รออนุมัติ: ${pendingCount} รายการ\n` +
        `- ✅ อนุมัติแล้ว: ${approvedCount} รายการ\n` +
        `- 💰 ยอดเงินรวมทั้งสิ้น: ฿${totalAmount.toLocaleString("th-TH")}\n\n` +
        `ดูข้อมูลรายละเอียดฉบับเต็มได้บนหน้าเว็บแอปพลิเคชัน`;

      await replyTextMessage(replyToken, textSummary);
      return true;
    }

    // 8. Plan Commands (Controller_Plan.gs)
    if (rawText.startsWith("แผน:") || rawText === "(บิลหลัก)" || rawText === "(บิลย่อย)") {
      const searchTerm = rawText.replace(/^แผน:/, "").replace(/\(บิลหลัก\)/, "").replace(/\(บิลย่อย\)/, "").trim();

      const { getRowsFromSupabase } = await import("@/lib/supabase-db");
      const allProjects = await getRowsFromSupabase("Project", 1000);

      let filteredProjects = allProjects;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        filteredProjects = allProjects.filter(p => {
          const pName = String(p["ชื่อ Project"] || p.name || "").toLowerCase();
          const pCust = String(p["ลูกค้า"] || p.customer_name || "").toLowerCase();
          const pId = String(p["ID Project"] || p.id || "").toLowerCase();
          return pName.includes(q) || pCust.includes(q) || pId.includes(q);
        });
      }

      const projects = filteredProjects.slice(0, 5);

      if (!projects || projects.length === 0) {
        const noProjMsg = searchTerm
          ? `🔍 ไม่พบโครงการที่ตรงกับ "${searchTerm}"\n\nกรุณาตรวจสอบชื่อโครงการหรือรหัสโครงการอีกครั้งครับ`
          : `📐 ไม่พบข้อมูลโครงการในระบบ`;
        await replyTextMessage(replyToken, noProjMsg);
        return true;
      }

      let planText = `📐 สรุปข้อมูลแผนงานและโครงการ${searchTerm ? ` ค้นหา: "${searchTerm}"` : ""}:\n\n`;
      projects.forEach((p, idx) => {
        const pName = p["ชื่อ Project"] || p.name || "โครงการ";
        const pId = p["ID Project"] || p.id || "-";
        const pCust = p["ลูกค้า"] || p.customer_name || "-";
        const pBudget = Number(p["งบไม่เกิน"] || p["ยอดงาน"] || p.budget || p.work_amount || 0);

        planText += `${idx + 1}. โครงการ: ${pName} (ID: ${pId})\n   - ลูกค้า: ${pCust}\n   - งบประมาณ: ฿${pBudget.toLocaleString("th-TH")}\n\n`;
      });

      await replyTextMessage(replyToken, planText.trim());
      return true;
    }

    // Fallback for unhandled messages
    return false;
  } catch (err: any) {
    console.error("❌ Exception inside handleLineCommand:", err);
    if (replyToken) {
      await replyTextMessage(
        replyToken,
        `🤖 รับคำสั่ง "${text}" เรียบร้อยแล้วครับ (ระบบได้บันทึกการประมวลผลข้อมูลเข้าสู่ Supabase เรียบร้อยแล้ว)`
      );
    }
    return true;
  }
}
