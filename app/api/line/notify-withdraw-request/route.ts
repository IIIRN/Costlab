import { NextRequest, NextResponse } from "next/server";
import {
  sendFlexMessageDetailed,
  getLineUserIdByRequester,
  getLineTargetGroup,
  createWithdrawRequesterFlex
} from "@/lib/line";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { row } = body;

    if (!row) {
      return NextResponse.json({ error: "Missing row data" }, { status: 400 });
    }

    const requesterKey = row["ผู้เบิก"] || row.requester || "";
    const targetUserId = await getLineUserIdByRequester(requesterKey);
    const fallbackGroup = await getLineTargetGroup("finance");

    const sendTo = targetUserId || fallbackGroup;

    if (!sendTo) {
      return NextResponse.json({ error: "No LINE User ID or Group target found for requester" }, { status: 400 });
    }

    const flex = createWithdrawRequesterFlex(row);
    const sheetRow = row._sheetRow || row.id || row["ลำดับ"] || "-";
    const amount = Number(row["ยอดเงิน"] || row.amount || 0).toLocaleString("th-TH");

    const result = await sendFlexMessageDetailed(
      sendTo,
      `📄 แจ้งเตือนรายการตั้งเบิกเงิน #${sheetRow} (฿${amount})`,
      flex
    );

    return NextResponse.json({ success: result.success, error: result.error, target: sendTo });
  } catch (err: any) {
    console.error("❌ Withdraw notification error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
