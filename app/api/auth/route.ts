import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { employeeId, name, role, pictureUrl, lineUserId } = body;
    
    if (!employeeId) {
      return NextResponse.json({ error: "Missing employee ID" }, { status: 400 });
    }

    const cookieStore = await cookies();
    
    // Set cookies with a very long expiration (1 year)
    const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    
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
  } catch (error) {
    return NextResponse.json({ error: "Failed to set auth cookies" }, { status: 500 });
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

