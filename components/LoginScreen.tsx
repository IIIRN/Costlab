"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, User, AlertCircle, Building } from "lucide-react";
import type { SheetRow } from "@/lib/types";

export function LoginScreen({ peopleRows }: { peopleRows: SheetRow[] }) {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId.trim()) return;

    setLoading(true);
    setError("");

    // Find user in peopleRows
    const person = peopleRows.find(
      row => String(row["รหัสพนักงาน"]).trim().toLowerCase() === employeeId.trim().toLowerCase()
    );

    if (!person) {
      setError("ไม่พบรหัสพนักงานนี้ในระบบ");
      setLoading(false);
      return;
    }

    try {
      await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: person["รหัสพนักงาน"],
          name: person["ชื่อเล่น"],
          role: person["สิทธิ์การใช้งาน"] || "User"
        })
      });
      // Force a hard navigation to reload layout and server components
      window.location.href = "/";
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 bg-[#14883d] rounded-full flex items-center justify-center shadow-lg">
            <Building className="h-8 w-8 text-white" />
          </div>
        </div>
        <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900">
          Cost Control
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          กรุณาเข้าสู่ระบบด้วยรหัสพนักงานของคุณ
        </p>
      </div>

      <div className="mt-8 mx-auto w-full max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-green-900/5 rounded-2xl sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700">
                รหัสพนักงาน
              </label>
              <div className="mt-2 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="employeeId"
                  name="employeeId"
                  type="text"
                  autoComplete="username"
                  required
                  value={employeeId}
                  onChange={e => {
                    setEmployeeId(e.target.value);
                    if (error) setError("");
                  }}
                  className="appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#14883d] focus:border-[#14883d] sm:text-sm transition-colors"
                  style={{ paddingLeft: '2.75rem' }}
                  placeholder="เช่น PT101"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-3 border border-red-200 animate-in fade-in slide-in-from-top-1">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  </div>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading || !employeeId.trim()}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#14883d] hover:bg-[#116d31] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14883d] disabled:opacity-70 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <LogIn className="mr-2 h-5 w-5" />
                )}
                เข้าสู่ระบบ
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
