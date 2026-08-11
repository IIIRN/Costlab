"use client";

import { useState } from "react";
import { Check, FolderPlus, Layers, Plus, Save, Sparkles, Trash2, Users, Store, Package } from "lucide-react";

type CategoryManagementClientProps = {
  initialOptions: Record<string, string[]>;
};

const DEFAULT_MASTER = [
  "1.ค่าของ",
  "2.ค่าแรง",
  "3.พนักงาน",
  "4.น้ำมัน",
  "5.ซ่อมรถ",
  "6.เครื่องจักร",
  "7.เครื่องมือ",
  "8.อื่นๆ"
];

const DEFAULT_CONTRACTOR = ["2.ค่าแรง", "3.พนักงาน", "8.อื่นๆ"];
const DEFAULT_STORE = ["1.ค่าของ", "4.น้ำมัน", "5.ซ่อมรถ", "6.เครื่องจักร", "7.เครื่องมือ", "8.อื่นๆ"];
const DEFAULT_STORE_ITEM = ["4.น้ำมัน", "5.ซ่อมรถ", "6.เครื่องจักร"];

export function CategoryManagementClient({ initialOptions }: CategoryManagementClientProps) {
  const [masterCategories, setMasterCategories] = useState<string[]>(() => {
    const fromSys = initialOptions["รายการประเภททั้งหมด"] || initialOptions["ประเภท"];
    if (fromSys && fromSys.length > 0) return fromSys;
    // Extract unique from groups if available
    const g1 = initialOptions["ประเภท (ผู้รับเหมา)"] || [];
    const g2 = initialOptions["ประเภท (ร้านค้า)"] || [];
    const g3 = initialOptions["ประเภท (ร้านค้า+เลือกสินค้า)"] || [];
    const combined = Array.from(new Set([...g1, ...g2, ...g3, ...DEFAULT_MASTER]));
    return combined.length > 0 ? combined : DEFAULT_MASTER;
  });

  const [contractorGroup, setContractorGroup] = useState<string[]>(() => {
    const val = initialOptions["ประเภท (ผู้รับเหมา)"];
    return val && val.length > 0 ? val : DEFAULT_CONTRACTOR;
  });

  const [storeGroup, setStoreGroup] = useState<string[]>(() => {
    const val = initialOptions["ประเภท (ร้านค้า)"];
    return val && val.length > 0 ? val : DEFAULT_STORE;
  });

  const [storeItemGroup, setStoreItemGroup] = useState<string[]>(() => {
    const val = initialOptions["ประเภท (ร้านค้า+เลือกสินค้า)"];
    return val && val.length > 0 ? val : DEFAULT_STORE_ITEM;
  });

  const [newCatInput, setNewCatInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState("");

  function handleAddMasterCategory() {
    const val = newCatInput.trim();
    if (!val) return;
    if (masterCategories.includes(val)) {
      setError(`ประเภท "${val}" มีอยู่ในรายการแล้ว`);
      return;
    }
    setError("");
    setMasterCategories((prev) => [...prev, val]);
    setNewCatInput("");
  }

  function handleRemoveMasterCategory(itemToRemove: string) {
    setMasterCategories((prev) => prev.filter((cat) => cat !== itemToRemove));
    setContractorGroup((prev) => prev.filter((cat) => cat !== itemToRemove));
    setStoreGroup((prev) => prev.filter((cat) => cat !== itemToRemove));
    setStoreItemGroup((prev) => prev.filter((cat) => cat !== itemToRemove));
  }

  function toggleCategoryInGroup(group: "contractor" | "store" | "storeItem", categoryName: string) {
    if (group === "contractor") {
      setContractorGroup((prev) =>
        prev.includes(categoryName) ? prev.filter((c) => c !== categoryName) : [...prev, categoryName]
      );
    } else if (group === "store") {
      setStoreGroup((prev) =>
        prev.includes(categoryName) ? prev.filter((c) => c !== categoryName) : [...prev, categoryName]
      );
    } else if (group === "storeItem") {
      setStoreItemGroup((prev) =>
        prev.includes(categoryName) ? prev.filter((c) => c !== categoryName) : [...prev, categoryName]
      );
    }
  }

  async function handleSaveAll() {
    setSaving(true);
    setSavedSuccess(false);
    setError("");

    try {
      const payloadOptions: Record<string, string[]> = {
        ...initialOptions,
        "รายการประเภททั้งหมด": masterCategories,
        "ประเภท (ผู้รับเหมา)": contractorGroup,
        "ประเภท (ร้านค้า)": storeGroup,
        "ประเภท (ร้านค้า+เลือกสินค้า)": storeItemGroup
      };

      const res = await fetch("/api/system-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ options: payloadOptions })
      });

      if (!res.ok) {
        throw new Error("ไม่สามารถบันทึกข้อมูลได้");
      }

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full flex-1 flex flex-col bg-slate-50 overflow-y-auto">
      {/* Top Banner Header */}
      <div className="bg-slate-900 text-white px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 shadow-md">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 text-indigo-400 flex items-center justify-center shadow-inner">
            <Layers size={22} strokeWidth={2.2} />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-white tracking-wide flex items-center gap-2">
              จัดการประเภทและกลุ่มประเภทสำหรับสร้างบิล
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              กำหนดรายการประเภททั้งหมด และจัดกลุ่มประเภทเพื่อใช้กำหนดตัวเลือกในฟอร์มสร้างบิล
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {savedSuccess && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold rounded-xl animate-fade-in">
              <Check size={15} />
              <span>บันทึกเรียบร้อยแล้ว</span>
            </div>
          )}
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={saving}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer"
          >
            <Save size={16} />
            <span>{saving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} className="text-rose-500 hover:text-rose-800">
            ✕
          </button>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* LEFT COLUMN: รายการประเภททั้งหมด (Master Categories List - 5 Columns) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                1
              </span>
              <div>
                <h2 className="text-sm font-extrabold text-slate-800">รายการประเภททั้งหมด</h2>
                <p className="text-[11px] text-slate-400">มาสเตอร์ประเภทสินค้า/ค่าใช้จ่ายทั้งหมดในระบบ</p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-full border border-slate-200">
              {masterCategories.length} รายการ
            </span>
          </div>

          {/* Add New Category Form */}
          <div className="mt-4 flex items-center gap-2">
            <input
              type="text"
              value={newCatInput}
              onChange={(e) => setNewCatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddMasterCategory())}
              placeholder="เพิ่มชื่อประเภทใหม่ เช่น 9.ค่าขนส่ง..."
              className="flex-1 bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold px-3 py-2 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 transition-all placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={handleAddMasterCategory}
              className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-2xs cursor-pointer"
            >
              <Plus size={15} />
              <span>เพิ่ม</span>
            </button>
          </div>

          {/* Master Categories Badge Container */}
          <div className="mt-4 flex-1 overflow-y-auto space-y-2 max-h-[500px] pr-1">
            {masterCategories.map((cat, idx) => (
              <div
                key={cat}
                className="flex items-center justify-between bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 px-3.5 py-2.5 rounded-xl transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-md bg-white border border-slate-200 text-slate-500 flex items-center justify-center text-[10px] font-bold">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-bold text-slate-800">{cat}</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveMasterCategory(cat)}
                  className="w-6 h-6 rounded-full bg-rose-50 text-rose-500 hover:bg-rose-600 hover:text-white flex items-center justify-center transition-all shadow-2xs cursor-pointer opacity-80 group-hover:opacity-100"
                  title={`ลบประเภท ${cat}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: การจัดกลุ่มประเภทสำหรับสร้างบิล (Bill Category Groups - 7 Columns) */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5">
            <div className="flex items-center gap-2 pb-3.5 border-b border-slate-100">
              <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">
                2
              </span>
              <div>
                <h2 className="text-sm font-extrabold text-slate-800">จัดกลุ่มประเภทสำหรับสร้างบิล</h2>
                <p className="text-[11px] text-slate-400">เลือกประเภทที่จะให้แสดงเป็นตัวเลือกในฟอร์มสร้างบิลแต่ละรูปแบบ</p>
              </div>
            </div>

            {/* 3 GROUP CARDS */}
            <div className="mt-4 space-y-4">
              {/* GROUP 1: ผู้รับเหมา */}
              <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                      <Users size={15} />
                    </div>
                    <div>
                      <h3 className="text-xs font-extrabold text-slate-900">กลุ่มประเภท (ผู้รับเหมา)</h3>
                      <p className="text-[10px] text-slate-500">แสดงในฟอร์มบิลเมื่อเลือกร้านค้าประเภทผู้รับเหมา</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-lg">
                    {contractorGroup.length} เลือกแล้ว
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {masterCategories.map((cat) => {
                    const isSelected = contractorGroup.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCategoryInGroup("contractor", cat)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                          isSelected
                            ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        {isSelected && <Check size={13} strokeWidth={2.5} />}
                        <span>{cat}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* GROUP 2: ร้านค้า */}
              <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                      <Store size={15} />
                    </div>
                    <div>
                      <h3 className="text-xs font-extrabold text-slate-900">กลุ่มประเภท (ร้านค้าทั่วไป)</h3>
                      <p className="text-[10px] text-slate-500">แสดงในฟอร์มบิลเมื่อเลือกร้านค้าทั่วไป</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-lg">
                    {storeGroup.length} เลือกแล้ว
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {masterCategories.map((cat) => {
                    const isSelected = storeGroup.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCategoryInGroup("store", cat)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                          isSelected
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        {isSelected && <Check size={13} strokeWidth={2.5} />}
                        <span>{cat}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* GROUP 3: ร้านค้า+เลือกสินค้า */}
              <div className="p-4 rounded-xl border border-purple-100 bg-purple-50/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center">
                      <Package size={15} />
                    </div>
                    <div>
                      <h3 className="text-xs font-extrabold text-slate-900">กลุ่มประเภท (ร้านค้า + เลือกสินค้า)</h3>
                      <p className="text-[10px] text-slate-500">แสดงเมื่อมีการกรอกเลือกรายละเอียดสินค้าเฉพาะเจาะจง</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 bg-purple-100 text-purple-800 rounded-lg">
                    {storeItemGroup.length} เลือกแล้ว
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {masterCategories.map((cat) => {
                    const isSelected = storeItemGroup.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCategoryInGroup("storeItem", cat)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                          isSelected
                            ? "bg-purple-600 text-white border-purple-600 shadow-2xs"
                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        {isSelected && <Check size={13} strokeWidth={2.5} />}
                        <span>{cat}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
