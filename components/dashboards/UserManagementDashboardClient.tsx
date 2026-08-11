"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Plus,
  RefreshCw,
  Search,
  Shield,
  UserCheck,
  User,
  Users,
  Pencil,
  Trash2,
  X,
  Save,
  ShieldAlert,
  Phone
} from "lucide-react";

type SystemUser = {
  id: string;
  username: string;
  displayName: string;
  role: "Admin" | "Manager" | "User";
  status: "Active" | "Inactive";
  phone?: string;
  createdAt?: string;
};

export function UserManagementDashboardClient() {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<SystemUser>({
    id: "",
    username: "",
    displayName: "",
    role: "User",
    status: "Active",
    phone: "",
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (res.ok && data.users) {
        setUsers(data.users);
      }
    } catch (e) {
      console.error("Failed to fetch users:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveUsersToDb(updatedUsers: SystemUser[]) {
    setSaving(true);
    setSaveResult(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ users: updatedUsers }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSaveResult({ success: true, message: "บันทึกข้อมูลผู้ใช้งานลง Supabase เรียบร้อยแล้ว!" });
      } else {
        setSaveResult({ success: false, message: data.error || "เกิดข้อผิดพลาดในการบันทึก" });
      }
    } catch (err: any) {
      setSaveResult({ success: false, message: err.message || "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" });
    } finally {
      setSaving(false);
    }
  }

  function handleOpenCreateModal() {
    setEditingIndex(null);
    setFormData({
      id: `PT${100 + users.length + 1}`,
      username: `PT${100 + users.length + 1}`,
      displayName: "",
      role: "User",
      status: "Active",
      phone: "",
    });
    setModalOpen(true);
  }

  function handleOpenEditModal(index: number) {
    setEditingIndex(index);
    setFormData({ ...users[index] });
    setModalOpen(true);
  }

  function handleDeleteUser(index: number) {
    if (!confirm(`คุณต้องการลบบัญชีผู้ใช้ "${users[index].displayName || users[index].username}" ใช่หรือไม่?`)) return;
    const nextUsers = users.filter((_, i) => i !== index);
    setUsers(nextUsers);
    handleSaveUsersToDb(nextUsers);
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.username.trim() || !formData.displayName.trim()) return;

    let nextUsers: SystemUser[];
    if (editingIndex !== null) {
      nextUsers = [...users];
      nextUsers[editingIndex] = { ...formData, id: formData.username.trim() };
    } else {
      const newUser: SystemUser = {
        ...formData,
        id: formData.username.trim(),
        createdAt: new Date().toISOString().split("T")[0],
      };
      nextUsers = [newUser, ...users];
    }

    setUsers(nextUsers);
    setModalOpen(false);
    handleSaveUsersToDb(nextUsers);
  }

  const filteredUsers = users.filter(
    (u) =>
      u.displayName.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      (u.phone && u.phone.includes(search)) ||
      u.role.toLowerCase().includes(search.toLowerCase())
  );

  const adminCount = users.filter((u) => u.role === "Admin").length;
  const managerCount = users.filter((u) => u.role === "Manager").length;
  const activeCount = users.filter((u) => u.status === "Active").length;

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* Compact Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <Users size={20} className="text-sky-600 shrink-0" />
          <h1 className="font-extrabold text-base text-slate-900 tracking-tight">จัดการผู้ใช้ระบบ</h1>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
            {users.length} บัญชี
          </span>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-extrabold transition shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus size={14} />
          <span>เพิ่มผู้ใช้ใหม่</span>
        </button>
      </div>

      {saveResult && (
        <div
          className={`px-3 py-2 rounded-lg border font-bold flex items-center justify-between gap-2 animate-in fade-in ${
            saveResult.success ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          <div className="flex items-center gap-1.5">
            {saveResult.success ? <CheckCircle2 size={15} /> : <ShieldAlert size={15} />}
            <span>{saveResult.message}</span>
          </div>
          <button type="button" onClick={() => setSaveResult(null)} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
            <Users size={16} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-slate-400 uppercase">ผู้ใช้ทั้งหมด</div>
            <div className="font-extrabold text-slate-900 truncate">{users.length} บัญชี</div>
          </div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
            <Shield size={16} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Admin</div>
            <div className="font-extrabold text-slate-900 truncate">{adminCount} บัญชี</div>
          </div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <UserCheck size={16} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Manager</div>
            <div className="font-extrabold text-slate-900 truncate">{managerCount} บัญชี</div>
          </div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 size={16} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-slate-400 uppercase">ใช้งานได้</div>
            <div className="font-extrabold text-slate-900 truncate">{activeCount} บัญชี</div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        {/* Table Topbar */}
        <div className="p-3 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50/50">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อผู้ใช้, Username หรือ เบอร์โทร..."
              className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1 text-slate-800 focus:outline-none focus:border-sky-500 font-medium"
            />
          </div>

          <button
            type="button"
            onClick={fetchUsers}
            disabled={loading}
            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold transition flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            <span>รีเฟรช</span>
          </button>
        </div>

        {/* User Accounts Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/90 text-slate-600 font-extrabold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <th className="py-2 px-3 w-28">Username</th>
                <th className="py-2 px-3 min-w-[150px]">ชื่อผู้ใช้งาน</th>
                <th className="py-2 px-3 min-w-[130px]">เบอร์โทรศัพท์</th>
                <th className="py-2 px-3 w-28">สิทธิ์ (Role)</th>
                <th className="py-2 px-3 w-24">สถานะ</th>
                <th className="py-2 px-3 w-20 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-[11px]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    <RefreshCw size={18} className="animate-spin mx-auto mb-2 text-sky-600" />
                    <span>กำลังโหลด...</span>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">
                    ไม่พบข้อมูลผู้ใช้ระบบ
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u, idx) => (
                  <tr key={u.id || idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2 px-3 font-mono font-bold text-slate-800">{u.username}</td>
                    <td className="py-2 px-3 font-bold text-slate-800">{u.displayName}</td>
                    <td className="py-2 px-3 text-slate-600 font-mono text-[10px]">
                      {u.phone ? (
                        <span className="inline-flex items-center gap-1">
                          <Phone size={11} className="text-slate-400" />
                          <span>{u.phone}</span>
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          u.role === "Admin"
                            ? "bg-purple-100 text-purple-700 border border-purple-200"
                            : u.role === "Manager"
                            ? "bg-amber-100 text-amber-700 border border-amber-200"
                            : "bg-sky-100 text-sky-700 border border-sky-200"
                        }`}
                      >
                        {u.role === "Admin" ? (
                          <>
                            <Shield size={11} className="text-purple-600 shrink-0" />
                            <span>Admin</span>
                          </>
                        ) : u.role === "Manager" ? (
                          <>
                            <UserCheck size={11} className="text-amber-600 shrink-0" />
                            <span>Manager</span>
                          </>
                        ) : (
                          <>
                            <User size={11} className="text-sky-600 shrink-0" />
                            <span>User</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.status === "Active"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            u.status === "Active" ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                          }`}
                        />
                        <span>{u.status === "Active" ? "ใช้งานได้" : "ระงับ"}</span>
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(idx)}
                          className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
                          title="แก้ไขผู้ใช้"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(idx)}
                          className="w-6 h-6 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition cursor-pointer"
                          title="ลบบัญชีผู้ใช้"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit User Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in">
            <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
              <h3 className="font-bold text-xs flex items-center gap-1.5">
                <Users size={14} className="text-sky-400" />
                <span>{editingIndex !== null ? "แก้ไขผู้ใช้งาน" : "เพิ่มผู้ใช้งานใหม่"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-4 space-y-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Username / รหัส *</label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="เช่น PT101"
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-slate-800 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">ชื่อผู้ใช้งาน *</label>
                <input
                  type="text"
                  required
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="เช่น คุณแมน"
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">เบอร์โทรศัพท์</label>
                <input
                  type="tel"
                  value={formData.phone || ""}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="081-234-5678"
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-slate-800 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">สิทธิ์การใช้งาน</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-slate-800 focus:outline-none focus:border-sky-500"
                  >
                    <option value="Admin">Admin</option>
                    <option value="Manager">Manager</option>
                    <option value="User">User</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">สถานะ</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-slate-800 focus:outline-none focus:border-sky-500"
                  >
                    <option value="Active">ใช้งานได้</option>
                    <option value="Inactive">ระงับใช้งาน</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-extrabold transition flex items-center gap-1"
                >
                  {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                  <span>บันทึก</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
