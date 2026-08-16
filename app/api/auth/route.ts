import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

function normalizePhone(p?: string) {
  return String(p || "").replace(/\D/g, "");
}

async function getUsersList(): Promise<any[]> {
  try {
    const { data } = await supabaseAdmin
      .from("system_options")
      .select("data")
      .eq("id", "users_list")
      .maybeSingle();

    if (data?.data && Array.isArray(data.data)) {
      return data.data;
    }
  } catch (e) {}
  return [];
}

async function saveUsersList(users: any[]) {
  return await supabaseAdmin
    .from("system_options")
    .upsert({
      id: "users_list",
      data: users,
      updated_at: new Date().toISOString(),
    });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, lineUserId, displayName, pictureUrl, phone, employeeId, name, role } = body;
    const cookieStore = await cookies();
    const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    // ==========================================
    // 1. ACTION: LOGIN WITH LINE USER ID
    // ==========================================
    if (action === "login") {
      if (!lineUserId) {
        return NextResponse.json({ success: false, error: "Missing LINE User ID" }, { status: 400 });
      }

      const users = await getUsersList();
      let matchedUser = users.find(u =>
        u.status === "Active" && (
          u.lineUserId === lineUserId ||
          u.line_user_id === lineUserId
        )
      );

      if (!matchedUser) {
        return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
      }

      if (pictureUrl && matchedUser.pictureUrl !== pictureUrl) {
        matchedUser.pictureUrl = pictureUrl;
        await saveUsersList(users);
      }

      const empId = matchedUser.username || matchedUser.id;
      const userName = matchedUser.displayName || matchedUser.name || empId;
      const userRole = matchedUser.role || "User";

      cookieStore.set("auth_employee_id", empId, { expires, path: "/" });
      cookieStore.set("auth_name", userName, { expires, path: "/" });
      cookieStore.set("auth_role", userRole, { expires, path: "/" });
      if (pictureUrl) cookieStore.set("auth_picture_url", pictureUrl, { expires, path: "/" });
      cookieStore.set("auth_line_user_id", lineUserId, { expires, path: "/" });

      return NextResponse.json({
        success: true,
        user: matchedUser,
        message: `ยินดีต้อนรับ ${userName} เข้าสู่ระบบ`
      });
    }

    // ==========================================
    // 2. ACTION: REGISTER / ACCOUNT LINKING VIA PHONE
    // ==========================================
    if (action === "register") {
      if (!lineUserId) {
        return NextResponse.json({ success: false, error: "Missing LINE User ID" }, { status: 400 });
      }
      if (!phone) {
        return NextResponse.json({ success: false, error: "กรุณาระบุเบอร์โทรศัพท์เพื่อยืนยันตัวตน" }, { status: 400 });
      }

      const inputPhoneClean = normalizePhone(phone);
      if (!inputPhoneClean || inputPhoneClean.length < 9) {
        return NextResponse.json({ success: false, error: "รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง" }, { status: 400 });
      }

      const users = await getUsersList();
      const existingUserIndex = users.findIndex(u => {
        const uPhoneClean = normalizePhone(u.phone);
        const uUsernameClean = normalizePhone(u.username);
        const uIdClean = normalizePhone(u.id);
        return inputPhoneClean && (
          (uPhoneClean && uPhoneClean === inputPhoneClean) ||
          (uUsernameClean && uUsernameClean === inputPhoneClean) ||
          (uIdClean && uIdClean === inputPhoneClean)
        );
      });

      if (existingUserIndex !== -1) {
        const existingUser = users[existingUserIndex];
        existingUser.lineUserId = lineUserId;
        if (pictureUrl) existingUser.pictureUrl = pictureUrl;
        if (!existingUser.phone) existingUser.phone = phone;

        users[existingUserIndex] = existingUser;
        await saveUsersList(users);

        const empId = existingUser.username || existingUser.id;
        const userName = existingUser.displayName || existingUser.name || empId;
        const userRole = existingUser.role || "User";

        cookieStore.set("auth_employee_id", empId, { expires, path: "/" });
        cookieStore.set("auth_name", userName, { expires, path: "/" });
        cookieStore.set("auth_role", userRole, { expires, path: "/" });
        if (pictureUrl) cookieStore.set("auth_picture_url", pictureUrl, { expires, path: "/" });
        cookieStore.set("auth_line_user_id", lineUserId, { expires, path: "/" });

        return NextResponse.json({
          success: true,
          isLinked: true,
          user: existingUser,
          message: `ผูกบัญชี LINE กับผู้ใช้งาน "${userName}" สำเร็จ!`
        });
      }

      const newUserId = phone;
      const newUser = {
        id: newUserId,
        username: phone,
        displayName: displayName || `ผู้ใช้ LINE (${phone})`,
        role: "User",
        status: "Active",
        phone: phone,
        lineUserId: lineUserId,
        pictureUrl: pictureUrl || "",
        createdAt: new Date().toISOString().slice(0, 10)
      };

      users.push(newUser);
      await saveUsersList(users);

      cookieStore.set("auth_employee_id", newUserId, { expires, path: "/" });
      cookieStore.set("auth_name", newUser.displayName, { expires, path: "/" });
      cookieStore.set("auth_role", "User", { expires, path: "/" });
      if (pictureUrl) cookieStore.set("auth_picture_url", pictureUrl, { expires, path: "/" });
      cookieStore.set("auth_line_user_id", lineUserId, { expires, path: "/" });

      return NextResponse.json({
        success: true,
        isLinked: false,
        user: newUser,
        message: "ลงทะเบียนบัญชีใหม่สำเร็จ!"
      });
    }

    // ==========================================
    // 3. STANDARD PHONE / EMPLOYEE ID LOGIN
    // ==========================================
    if (!employeeId) {
      return NextResponse.json({ error: "Missing employee ID" }, { status: 400 });
    }

    cookieStore.set("auth_employee_id", employeeId, { expires, path: "/" });
    cookieStore.set("auth_name", name || "", { expires, path: "/" });
    cookieStore.set("auth_role", role || "User", { expires, path: "/" });
    if (pictureUrl) {
      cookieStore.set("auth_picture_url", pictureUrl, { expires, path: "/" });
    }
    if (lineUserId) {
      cookieStore.set("auth_line_user_id", lineUserId, { expires, path: "/" });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to set auth cookies" }, { status: 500 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("auth_employee_id");
  cookieStore.delete("auth_name");
  cookieStore.delete("auth_role");
  cookieStore.delete("auth_picture_url");
  cookieStore.delete("auth_line_user_id");
  return NextResponse.json({ success: true });
}

