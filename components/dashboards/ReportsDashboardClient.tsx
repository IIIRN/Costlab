"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  Boxes,
  Briefcase,
  Building2,
  Calculator,
  ChevronDown,
  DollarSign,
  Download,
  FileSpreadsheet,
  Filter,
  FolderKanban,
  HardHat,
  Layers,
  Package,
  Printer,
  Receipt,
  RotateCw,
  Search,
  Store,
  Tag,
  Users,
  Wallet,
  Wrench,
  X,
} from "lucide-react";
import { money, toNumber } from "@/lib/numbers";
import type { SheetRow } from "@/lib/types";
import {
  filterBillsByProject,
  getRowAmount,
  getRowCategory,
  getRowCategoryAmount,
  getRowTransferAmount,
  isLaborRow,
  isMaterialOrExpenseRow,
} from "@/lib/reports";

type ReportsDashboardClientProps = {
  initialDataRows: SheetRow[];
  initialProjectRows: SheetRow[];
  initialStoreRows: SheetRow[];
  initialContractorRows: SheetRow[];
  initialPeopleRows: SheetRow[];
};

type ActiveTab = "material" | "product_category" | "labor" | "category" | "contractor" | "store";

const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
];

function formatDateThai(dateVal: unknown): string {
  if (!dateVal) return "-";
  const str = String(dateVal).trim();
  if (!str) return "-";

  // Match YYYY-MM-DD or YYYY/MM/DD
  const matchISO = str.match(/^(\d{4})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])$/);
  if (matchISO) {
    const [, y, m, d] = matchISO;
    const dayNum = parseInt(d, 10);
    const monthIdx = parseInt(m, 10) - 1;
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${dayNum} ${THAI_MONTHS_SHORT[monthIdx]} ${y}`;
    }
    return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
  }

  // Match DD-MM-YYYY or DD/MM/YYYY
  const matchDDMM = str.match(/^(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.](20\d\d|\d\d)$/);
  if (matchDDMM) {
    const [, d, m, y] = matchDDMM;
    const dayNum = parseInt(d, 10);
    const monthIdx = parseInt(m, 10) - 1;
    const fullYear = y.length === 2 ? `20${y}` : y;
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${dayNum} ${THAI_MONTHS_SHORT[monthIdx]} ${fullYear}`;
    }
    return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${fullYear}`;
  }

  return str;
}

const CATEGORIES_LIST = [
  { key: "1.ค่าของ", label: "1.ค่าของ", searchKey: "ค่าของ", color: "bg-emerald-50 text-emerald-900 border-emerald-200" },
  { key: "2.ค่าแรง", label: "2.ค่าแรง", searchKey: "ค่าแรง", color: "bg-indigo-50 text-indigo-900 border-indigo-200" },
  { key: "3.พนักงาน", label: "3.พนักงาน", searchKey: "พนักงาน", color: "bg-purple-50 text-purple-900 border-purple-200" },
  { key: "4.น้ำมัน", label: "4.น้ำมัน", searchKey: "น้ำมัน", color: "bg-amber-50 text-amber-900 border-amber-200" },
  { key: "5.ซ่อมรถ", label: "5.ซ่อมรถ", searchKey: "ซ่อมรถ", color: "bg-orange-50 text-orange-900 border-orange-200" },
  { key: "6.เครื่องจักร", label: "6.เครื่องจักร", searchKey: "เครื่องจักร", color: "bg-blue-50 text-blue-900 border-blue-200" },
  { key: "7.เครื่องมือ", label: "7.เครื่องมือ", searchKey: "เครื่องมือ", color: "bg-cyan-50 text-cyan-900 border-cyan-200" },
  { key: "8.อื่นๆ", label: "8.อื่นๆ", searchKey: "อื่นๆ", color: "bg-rose-50 text-rose-900 border-rose-200" },
];

const PRODUCT_CATEGORIES_LIST = [
  { code: "1", label: "1. เหล็กเส้น", searchKeys: ["1", "เหล็กเส้น"] },
  { code: "2", label: "2. รูปพรรณ", searchKeys: ["2", "รูปพรรณ"] },
  { code: "3", label: "3. คอนกรีต", searchKeys: ["3", "คอนกรีต"] },
  { code: "4", label: "4. ไม้แบบ", searchKeys: ["4", "ไม้แบบ"] },
  { code: "5", label: "5. วัสดุมุง", searchKeys: ["5", "วัสดุมุง"] },
  { code: "6", label: "6. ฝ้าผนัง", searchKeys: ["6", "ฝ้าผนัง"] },
  { code: "7", label: "7. ปูพื้น", searchKeys: ["7", "ปูพื้น"] },
  { code: "8", label: "8. กระจก", searchKeys: ["8", "กระจก"] },
  { code: "9", label: "9. ไฟฟ้า", searchKeys: ["9", "ไฟฟ้า"] },
  { code: "10", label: "10. ประปา", searchKeys: ["10", "ประปา"] },
  { code: "11", label: "11. อื่นๆ", searchKeys: ["11", "อื่นๆ"] },
  { code: "12", label: "12. สีเคมี", searchKeys: ["12", "สีเคมี"] },
  { code: "13", label: "13. สุขภัณฑ์", searchKeys: ["13", "สุขภัณฑ์"] },
  { code: "14", label: "14. นั่งร้าน", searchKeys: ["14", "นั่งร้าน", "บิวอิน"] },
  { code: "15", label: "15. แอร์", searchKeys: ["15", "แอร์"] },
  { code: "16", label: "16. ดิน", searchKeys: ["16", "ดิน"] },
  { code: "17", label: "17. หินทราย", searchKeys: ["17", "หินทราย"] },
  { code: "18", label: "18. เตรียมงาน", searchKeys: ["18", "เตรียมงาน"] },
  { code: "101", label: "101. น้ำมัน", searchKeys: ["101", "น้ำมัน"] },
  { code: "102", label: "102. ค่าขนส่ง", searchKeys: ["102", "ค่าขนส่ง"] },
  { code: "103", label: "103. เครื่องจักร", searchKeys: ["103", "เครื่องจักร"] },
  { code: "200", label: "200. ดำเนินการ(อื่นๆ)", searchKeys: ["200", "ดำเนินการ"] },
  { code: "non", label: "non (7.เครื่องมือ 8.อื่นๆ ที่พัก)", searchKeys: ["non"] },
];

export function ReportsDashboardClient({
  initialDataRows,
  initialProjectRows,
  initialStoreRows,
  initialContractorRows,
  initialPeopleRows,
}: ReportsDashboardClientProps) {
  const [dataRows, setDataRows] = useState<SheetRow[]>(initialDataRows);
  const [projectRows, setProjectRows] = useState<SheetRow[]>(initialProjectRows);
  const [activeTab, setActiveTab] = useState<ActiveTab>("material");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [selectedContractor, setSelectedContractor] = useState<string>("all");
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedProductCategory, setSelectedProductCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [refreshing, setRefreshing] = useState(false);

  // Entrepreneur Financial Calculator States
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcBaseAmount, setCalcBaseAmount] = useState<string>("100000");
  const [calcVatPercent, setCalcVatPercent] = useState<number>(7);
  const [calcWhtPercent, setCalcWhtPercent] = useState<number>(3);

  const [calcContractValue, setCalcContractValue] = useState<string>("5000000");

  // Build People lookup map (Code -> Name/Nickname)
  const peopleMap = useMemo(() => {
    const map: Record<string, string> = {};
    (initialPeopleRows || []).forEach((r) => {
      const code = String(r["รหัสพนักงาน"] || r["รหัส"] || r["ID"] || "").trim().toLowerCase();
      const nickname = String(r["ชื่อเล่น"] || "").trim();
      const fullName = String(r["ชื่อ-นามสกุล"] || r["ชื่อ"] || "").trim();
      const displayName = nickname || fullName;
      if (code && displayName) {
        map[code] = displayName;
      }
    });
    return map;
  }, [initialPeopleRows]);

  function getRequesterDisplayName(raw: unknown): string {
    const val = String(raw || "").trim();
    if (!val) return "-";
    const mappedName = peopleMap[val.toLowerCase()];
    if (mappedName) {
      return mappedName;
    }
    return val;
  }

  // Extract unique projects list
  const projectsList = useMemo(() => {
    return projectRows
      .map((p) => {
        const id = String(p["ID Project"] || p.id || "").trim();
        const name = String(p["ชื่อ Project"] || p.name || "").trim();
        return { id, name, label: id && name ? `${id} - ${name}` : id || name };
      })
      .filter((p) => p.id || p.name);
  }, [projectRows]);

  // Extract unique contractors list
  const contractorsList = useMemo(() => {
    const set = new Set<string>();
    dataRows.forEach((r) => {
      if (isLaborRow(r)) {
        const contractor = String(r["ชื่อผู้รับเหมา"] || r["ผู้รับเหมา"] || r["ร้าน/บุคคล"] || "").trim();
        if (contractor) set.add(contractor);
      }
    });
    initialContractorRows.forEach((c) => {
      const name = String(c["ชื่อเล่น"] || c["ชื่อ-นามสกุล"] || c["รายละเอียดงาน"] || "").trim();
      if (name) set.add(name);
    });
    return Array.from(set).sort();
  }, [dataRows, initialContractorRows]);

  // Extract unique stores list
  const storesList = useMemo(() => {
    const set = new Set<string>();
    dataRows.forEach((r) => {
      if (isMaterialOrExpenseRow(r)) {
        const store = String(r["ร้านค้า"] || r["ร้าน/บุคคล"] || r["ร้านค้า/ผู้รับเหมา"] || "").trim();
        if (store) set.add(store);
      }
    });
    initialStoreRows.forEach((s) => {
      const name = String(s["ชื่อร้านค้า"] || s.name || "").trim();
      if (name) set.add(name);
    });
    return Array.from(set).sort();
  }, [dataRows, initialStoreRows]);

  // Filter rows by Project
  const projectFilteredRows = useMemo(() => {
    return filterBillsByProject(dataRows, selectedProjectId);
  }, [dataRows, selectedProjectId]);

  // Search filter
  const searchFilteredRows = useMemo(() => {
    if (!searchTerm.trim()) return projectFilteredRows;
    const q = searchTerm.toLowerCase().trim();
    return projectFilteredRows.filter((r) => {
      const reqName = getRequesterDisplayName(r["ผู้เบิก"]);
      return (
        String(r["ลำดับ"] || "").toLowerCase().includes(q) ||
        String(r["ร้าน/บุคคล"] || "").toLowerCase().includes(q) ||
        String(r["ร้านค้า"] || "").toLowerCase().includes(q) ||
        String(r["ผู้รับเหมา"] || "").toLowerCase().includes(q) ||
        String(r["สินค้า/ทำงาน"] || "").toLowerCase().includes(q) ||
        String(r["รายละเอียดงาน"] || "").toLowerCase().includes(q) ||
        String(r["ประเภท"] || "").toLowerCase().includes(q) ||
        String(r["ผู้เบิก"] || "").toLowerCase().includes(q) ||
        reqName.toLowerCase().includes(q)
      );
    });
  }, [projectFilteredRows, searchTerm, peopleMap]);

  // Tab 1: Material rows
  const materialRows = useMemo(() => {
    return searchFilteredRows.filter(isMaterialOrExpenseRow);
  }, [searchFilteredRows]);

  // Tab 2: Product Categories rows breakdown (18สินค้า)
  const productCategoryMetrics = useMemo(() => {
    const grandTotal = materialRows.reduce((sum, r) => sum + getRowTransferAmount(r), 0);

    const breakdown = PRODUCT_CATEGORIES_LIST.map((cat) => {
      const rows = materialRows.filter((r) => {
        const itemVal = String(r["สินค้า"] || r["สินค้า/ทำงาน"] || r["รายการ"] || "").trim().toLowerCase();
        if (cat.code === "non") {
          return itemVal.includes("non") || itemVal.includes("ที่พัก");
        }
        if (itemVal.startsWith(cat.code.toLowerCase())) return true;
        return cat.searchKeys.some((k) => itemVal.includes(k.toLowerCase()));
      });

      const count = rows.length;
      const amount = rows.reduce((sum, r) => sum + getRowAmount(r), 0);
      const transfer = rows.reduce((sum, r) => sum + getRowTransferAmount(r), 0);
      const percent = grandTotal > 0 ? (transfer / grandTotal) * 100 : 0;
      return { ...cat, count, amount, transfer, percent, rows };
    });

    return { grandTotal, breakdown };
  }, [materialRows]);

  const productCategoryFilteredRows = useMemo(() => {
    if (selectedProductCategory === "all") return materialRows;
    const catObj = PRODUCT_CATEGORIES_LIST.find((c) => c.code === selectedProductCategory);
    if (!catObj) return materialRows;

    return materialRows.filter((r) => {
      const itemVal = String(r["สินค้า"] || r["สินค้า/ทำงาน"] || r["รายการ"] || "").trim().toLowerCase();
      if (catObj.code === "non") {
        return itemVal.includes("non") || itemVal.includes("ที่พัก");
      }
      if (itemVal.startsWith(catObj.code.toLowerCase())) return true;
      return catObj.searchKeys.some((k) => itemVal.includes(k.toLowerCase()));
    });
  }, [materialRows, selectedProductCategory]);

  const productCategoryBillTotal = useMemo(() => {
    return productCategoryFilteredRows.reduce((sum, r) => sum + getRowAmount(r), 0);
  }, [productCategoryFilteredRows]);

  const productCategoryTransferTotal = useMemo(() => {
    return productCategoryFilteredRows.reduce((sum, r) => sum + getRowTransferAmount(r), 0);
  }, [productCategoryFilteredRows]);

  // Tab 3: Labor rows
  const laborRows = useMemo(() => {
    return searchFilteredRows.filter(isLaborRow);
  }, [searchFilteredRows]);

  // Tab 4: Category rows breakdown (8หมวดหมู่)
  const categoryMetrics = useMemo(() => {
    const grandTotal = searchFilteredRows.reduce((sum, r) => sum + getRowTransferAmount(r), 0);

    const breakdown = CATEGORIES_LIST.map((cat) => {
      const rows = searchFilteredRows.filter((r) => {
        const rowCat = getRowCategory(r).toLowerCase();
        return rowCat.includes(cat.searchKey) || rowCat.includes(cat.key.toLowerCase());
      });
      const count = rows.length;
      const amount = rows.reduce((sum, r) => sum + getRowAmount(r), 0);
      const transfer = rows.reduce((sum, r) => sum + getRowTransferAmount(r), 0);
      const percent = grandTotal > 0 ? (transfer / grandTotal) * 100 : 0;
      return { ...cat, count, amount, transfer, percent, rows };
    });

    return { grandTotal, breakdown };
  }, [searchFilteredRows]);

  // Filtered rows for Category Tab
  const categoryFilteredRows = useMemo(() => {
    if (selectedCategory === "all") return searchFilteredRows;
    const catObj = CATEGORIES_LIST.find((c) => c.key === selectedCategory);
    const searchKey = catObj ? catObj.searchKey : selectedCategory.toLowerCase();
    return searchFilteredRows.filter((r) => {
      const rowCat = getRowCategory(r).toLowerCase();
      return rowCat.includes(searchKey) || rowCat.includes(selectedCategory.toLowerCase());
    });
  }, [searchFilteredRows, selectedCategory]);

  const categoryFilteredBillTotal = useMemo(() => {
    return categoryFilteredRows.reduce((sum, r) => sum + getRowAmount(r), 0);
  }, [categoryFilteredRows]);

  const categoryFilteredTransferTotal = useMemo(() => {
    return categoryFilteredRows.reduce((sum, r) => sum + getRowTransferAmount(r), 0);
  }, [categoryFilteredRows]);

  // Tab 5: Contractor specific rows
  const contractorRows = useMemo(() => {
    const base = searchFilteredRows.filter(isLaborRow);
    if (selectedContractor === "all") return base;
    return base.filter((r) => {
      const name = String(r["ชื่อผู้รับเหมา"] || r["ผู้รับเหมา"] || r["ร้าน/บุคคล"] || "").trim();
      return name.toLowerCase().includes(selectedContractor.toLowerCase());
    });
  }, [searchFilteredRows, selectedContractor]);

  // Tab 6: Store specific rows
  const storeRows = useMemo(() => {
    const base = searchFilteredRows.filter(isMaterialOrExpenseRow);
    if (selectedStore === "all") return base;
    return base.filter((r) => {
      const name = String(r["ร้านค้า"] || r["ร้าน/บุคคล"] || r["ร้านค้า/ผู้รับเหมา"] || "").trim();
      return name.toLowerCase().includes(selectedStore.toLowerCase());
    });
  }, [searchFilteredRows, selectedStore]);

  // Metrics for Tab 1 (Material)
  const materialMetrics = useMemo(() => {
    const totalAmount = materialRows.reduce((sum, r) => sum + getRowAmount(r), 0);
    const totalTransfer = materialRows.reduce((sum, r) => sum + getRowTransferAmount(r), 0);
    const catMaterial = materialRows.reduce((sum, r) => sum + getRowCategoryAmount(r, "ค่าของ"), 0);
    const catFuel = materialRows.reduce((sum, r) => sum + getRowCategoryAmount(r, "น้ำมัน"), 0);
    const catRepair = materialRows.reduce((sum, r) => sum + getRowCategoryAmount(r, "ซ่อมรถ"), 0);
    const catMachine = materialRows.reduce((sum, r) => sum + getRowCategoryAmount(r, "เครื่องจักร"), 0);
    const catTool = materialRows.reduce((sum, r) => sum + getRowCategoryAmount(r, "เครื่องมือ"), 0);
    const catOther = materialRows.reduce((sum, r) => sum + getRowCategoryAmount(r, "อื่นๆ"), 0);
    const vatTotal = materialRows.reduce((sum, r) => sum + (toNumber(r.vat) || 0), 0);

    return {
      count: materialRows.length,
      totalAmount,
      totalTransfer,
      catMaterial,
      catFuel,
      catRepair,
      catMachine,
      catTool,
      catOther,
      vatTotal,
    };
  }, [materialRows]);

  // Metrics for Tab 3 (Labor)
  const laborMetrics = useMemo(() => {
    const totalLabor = laborRows.reduce((sum, r) => sum + (toNumber(r["ค่าแรง"]) || getRowAmount(r)), 0);
    const totalTransfer = laborRows.reduce((sum, r) => sum + getRowTransferAmount(r), 0);
    const totalOpenHire = laborRows.reduce((sum, r) => sum + toNumber(r["เปิดจ้าง"]), 0);
    const totalAccumPaid = laborRows.reduce((sum, r) => sum + toNumber(r["จ่ายสะสม"]), 0);

    return {
      count: laborRows.length,
      totalLabor,
      totalTransfer,
      totalOpenHire,
      totalAccumPaid,
    };
  }, [laborRows]);

  // Metrics for Tab 5 (Contractor)
  const contractorMetrics = useMemo(() => {
    const totalLabor = contractorRows.reduce((sum, r) => sum + (toNumber(r["ค่าแรง"]) || getRowAmount(r)), 0);
    const totalTransfer = contractorRows.reduce((sum, r) => sum + getRowTransferAmount(r), 0);
    const totalOpenHire = contractorRows.reduce((sum, r) => sum + toNumber(r["เปิดจ้าง"]), 0);
    const totalAccumPaid = contractorRows.reduce((sum, r) => sum + toNumber(r["จ่ายสะสม"]), 0);
    const remaining = totalOpenHire - totalAccumPaid;

    return {
      count: contractorRows.length,
      totalLabor,
      totalTransfer,
      totalOpenHire,
      totalAccumPaid,
      remaining,
    };
  }, [contractorRows]);

  // Metrics for Tab 6 (Store)
  const storeMetrics = useMemo(() => {
    const totalAmount = storeRows.reduce((sum, r) => sum + getRowAmount(r), 0);
    const totalTransfer = storeRows.reduce((sum, r) => sum + getRowTransferAmount(r), 0);

    return {
      count: storeRows.length,
      totalAmount,
      totalTransfer,
    };
  }, [storeRows]);

  // Overall Financial Totals
  const totalTransferAll = useMemo(() => {
    return searchFilteredRows.reduce((sum, r) => sum + getRowTransferAmount(r), 0);
  }, [searchFilteredRows]);

  const totalBillAmountAll = useMemo(() => {
    return searchFilteredRows.reduce((sum, r) => sum + getRowAmount(r), 0);
  }, [searchFilteredRows]);

  // Entrepreneur VAT & Tax Calculator Computations
  const calcResults = useMemo(() => {
    const base = parseFloat(calcBaseAmount) || 0;
    const vatVal = (base * calcVatPercent) / 100;
    const whtVal = (base * calcWhtPercent) / 100;
    const netPayment = base + vatVal - whtVal;
    return { base, vatVal, whtVal, netPayment };
  }, [calcBaseAmount, calcVatPercent, calcWhtPercent]);

  // Entrepreneur Project Margin Computations
  const projectMarginResults = useMemo(() => {
    const contract = parseFloat(calcContractValue) || 0;
    const spent = totalTransferAll;
    const remaining = contract - spent;
    const burnRate = contract > 0 ? (spent / contract) * 100 : 0;
    const estimatedMargin = contract > 0 ? ((contract - spent) / contract) * 100 : 0;
    return { contract, spent, remaining, burnRate, estimatedMargin };
  }, [calcContractValue, totalTransferAll]);

  async function refreshData() {
    setRefreshing(true);
    try {
      const response = await fetch("/api/dashboard?refresh=1", { cache: "no-store" });
      if (!response.ok) throw new Error("Refresh failed");
      const payload = await response.json();
      setDataRows(payload.dataRows || []);
      setProjectRows(payload.projectRows || []);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="w-full flex flex-col gap-3 p-3 sm:p-4 max-w-[1700px] mx-auto font-sans print:p-0">
      {/* 1. EXECUTIVE COMPACT HEADER CARD */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-md border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center shrink-0">
            <BarChart3 className="text-teal-400" size={19} />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight text-white flex items-center gap-2">
              <span>รายงานวิเคราะห์การเงินและต้นทุนโครงการ</span>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-800/60 uppercase">
                Executive Mode
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              คำนวณและสรุปข้อมูลต้นทุนค่าของ ค่าแรง ภาษี และร้านค้าสำหรับผู้ประกอบการ
            </p>
          </div>
        </div>

        {/* Quick KPI Badges & Entrepreneur Calculator Trigger */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">ยอดโอนเงินสุทธิ</span>
            <span className="text-sm font-black text-emerald-400">{money(totalTransferAll)}</span>
          </div>

          <div className="bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">ยอดเงินบิลรวม</span>
            <span className="text-sm font-black text-white">{money(totalBillAmountAll)}</span>
          </div>

          {/* Entrepreneur Quick Calculator Toggle */}
          <button
            type="button"
            onClick={() => setShowCalculator(!showCalculator)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition border cursor-pointer ${
              showCalculator
                ? "bg-teal-500 text-slate-950 border-teal-400 shadow-md shadow-teal-500/20"
                : "bg-slate-800 hover:bg-slate-700 text-teal-300 border-slate-700"
            }`}
          >
            <Calculator size={14} />
            <span>เครื่องมือคิดคำนวณ</span>
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={refreshData}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition border border-slate-700 cursor-pointer"
          >
            <RotateCw size={14} className={refreshing ? "animate-spin" : ""} />
            <span>{refreshing ? "รีเฟรช..." : "รีเฟรช"}</span>
          </button>
        </div>
      </div>

      {/* 2. ENTREPRENEUR FINANCIAL CALCULATOR DRAWER (IF TOGGLED) */}
      {showCalculator && (
        <div className="bg-slate-900 text-white rounded-2xl p-4 border border-teal-500/40 shadow-xl animate-in fade-in zoom-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <Calculator className="text-teal-400" size={18} />
              <h2 className="text-xs font-black text-white uppercase tracking-wider">
                เครื่องมือช่วยผู้ประกอบการคำนวณและประเมินผลกำไร (Entrepreneur Calculator)
              </h2>
            </div>
            <button type="button" onClick={() => setShowCalculator(false)} className="text-slate-400 hover:text-white">
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Calc 1: VAT & WHT Quick Calculator */}
            <div className="bg-slate-800/90 rounded-xl p-3 border border-slate-700 flex flex-col justify-between">
              <span className="text-xs font-extrabold text-teal-300 mb-2 flex items-center gap-1.5">
                <Receipt size={14} />
                <span>1. เครื่องมือคำนวณภาษี VAT 7% & หัก ณ ที่จ่าย (WHT)</span>
              </span>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">ยอดก่อนภาษี (บาท)</label>
                  <input
                    type="number"
                    value={calcBaseAmount}
                    onChange={(e) => setCalcBaseAmount(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-teal-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">VAT %</label>
                  <select
                    value={calcVatPercent}
                    onChange={(e) => setCalcVatPercent(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 text-teal-300 text-xs font-bold px-2 py-1.5 rounded-lg focus:outline-none"
                  >
                    <option value={0}>0% (ไม่มี Vat)</option>
                    <option value={7}>7% (Vat ปกติ)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">หัก ณ ที่จ่าย %</label>
                  <select
                    value={calcWhtPercent}
                    onChange={(e) => setCalcWhtPercent(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 text-amber-300 text-xs font-bold px-2 py-1.5 rounded-lg focus:outline-none"
                  >
                    <option value={0}>0% (ไม่หัก)</option>
                    <option value={1}>1% (ค่าขนส่ง)</option>
                    <option value={3}>3% (ค่าบริการ/รับเหมา)</option>
                    <option value={5}>5% (ค่าเช่า)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-center">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block">VAT 7%</span>
                  <span className="text-xs font-black text-teal-400">+{money(calcResults.vatVal)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block">หัก ณ ที่จ่าย</span>
                  <span className="text-xs font-black text-amber-400">-{money(calcResults.whtVal)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-300 block">ยอดโอนจริงสุทธิ</span>
                  <span className="text-xs font-black text-emerald-400">{money(calcResults.netPayment)}</span>
                </div>
              </div>
            </div>

            {/* Calc 2: Project Burn Rate & Margin Estimator */}
            <div className="bg-slate-800/90 rounded-xl p-3 border border-slate-700 flex flex-col justify-between">
              <span className="text-xs font-extrabold text-teal-300 mb-2 flex items-center gap-1.5">
                <Wallet size={14} />
                <span>2. เครื่องมือคำนวณ Burn Rate & ประมาณการกำไรโครงการ</span>
              </span>

              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">มูลค่าสัญญาโครงการ (บาท)</label>
                  <input
                    type="number"
                    value={calcContractValue}
                    onChange={(e) => setCalcContractValue(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-teal-400"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">เบิกจ่ายจริงแล้วสะสม</label>
                  <div className="w-full bg-slate-950 border border-slate-800 text-emerald-400 text-xs font-black px-2.5 py-1.5 rounded-lg">
                    {money(projectMarginResults.spent)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-center">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block">งบประมาณคงเหลือ</span>
                  <span className={`text-xs font-black ${projectMarginResults.remaining >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {money(projectMarginResults.remaining)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block">อัตราใช้งบ (Burn Rate)</span>
                  <span className={`text-xs font-black ${projectMarginResults.burnRate > 90 ? "text-rose-400" : "text-amber-300"}`}>
                    {projectMarginResults.burnRate.toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-300 block">ประมาณการกำไร</span>
                  <span className={`text-xs font-black ${projectMarginResults.estimatedMargin >= 0 ? "text-teal-400" : "text-rose-400"}`}>
                    {projectMarginResults.estimatedMargin.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. CONTROL TOOLBAR & FILTERS */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Project Selector */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <FolderKanban size={15} className="text-indigo-600 shrink-0" />
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="bg-slate-50 border border-slate-200 font-extrabold text-xs text-slate-900 px-3 py-1.5 rounded-lg focus:outline-none w-full sm:w-64"
          >
            <option value="all">📁 ทุกโครงการ ({projectsList.length} โครงการ)</option>
            {projectsList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Search Box */}
        <div className="relative flex items-center w-full sm:w-72">
          <Search size={14} className="absolute left-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาร้านค้า, ผู้รับเหมา, รายการ..."
            className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold pl-7 pr-6 py-1.5 rounded-lg focus:outline-none"
          />
          {searchTerm && (
            <button type="button" onClick={() => setSearchTerm("")} className="absolute right-2 text-slate-400">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 4. HIGH-DENSITY 6-TAB CONTROLS */}
      <div className="bg-slate-100 p-1 rounded-xl flex flex-wrap items-center gap-1 border border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("material")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-extrabold text-xs transition cursor-pointer ${
            activeTab === "material" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-700 hover:bg-slate-200/80"
          }`}
        >
          <Package size={14} />
          <span>สรุปค่าของ ({materialMetrics.count})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("product_category")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-extrabold text-xs transition cursor-pointer ${
            activeTab === "product_category" ? "bg-teal-600 text-white shadow-xs" : "text-slate-700 hover:bg-slate-200/80"
          }`}
        >
          <Boxes size={14} />
          <span>สรุปประเภทสินค้า (18 สินค้า)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("labor")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-extrabold text-xs transition cursor-pointer ${
            activeTab === "labor" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-700 hover:bg-slate-200/80"
          }`}
        >
          <HardHat size={14} />
          <span>สรุปค่าแรง ({laborMetrics.count})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("category")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-extrabold text-xs transition cursor-pointer ${
            activeTab === "category" ? "bg-purple-600 text-white shadow-xs" : "text-slate-700 hover:bg-slate-200/80"
          }`}
        >
          <Tag size={14} />
          <span>สรุปประเภท (8 หมวด)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("contractor")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-extrabold text-xs transition cursor-pointer ${
            activeTab === "contractor" ? "bg-amber-600 text-white shadow-xs" : "text-slate-700 hover:bg-slate-200/80"
          }`}
        >
          <Users size={14} />
          <span>ค่าแรง (ต่อคน) ({contractorMetrics.count})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("store")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-extrabold text-xs transition cursor-pointer ${
            activeTab === "store" ? "bg-sky-600 text-white shadow-xs" : "text-slate-700 hover:bg-slate-200/80"
          }`}
        >
          <Store size={14} />
          <span>ค่าของ (ต่อร้าน) ({storeMetrics.count})</span>
        </button>
      </div>

      {/* 5. TAB 1: สรุปค่าของ (MATERIAL & EXPENSES) */}
      {activeTab === "material" && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-3 border-b border-slate-200 bg-emerald-50 flex items-center justify-between">
              <h2 className="text-xs font-black text-emerald-950 uppercase tracking-wider flex items-center gap-2">
                <Package size={15} />
                <span>สรุปค่าของ (Material & Expenses Breakdown)</span>
              </h2>
              <span className="text-xs font-black text-emerald-950 bg-emerald-100 px-3 py-1 rounded-lg border border-emerald-200">
                โอนรวมสุทธิ: {money(materialMetrics.totalTransfer)}
              </span>
            </div>

            <div className="overflow-auto max-h-[calc(100vh-210px)] min-h-[420px] relative scrollbar-thin">
              <table className="w-full text-left text-xs text-slate-700 border-collapse font-sans">
                <thead className="sticky top-0 z-20 bg-slate-900 text-white font-extrabold text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 border-r border-slate-800">ลำดับ</th>
                    <th className="py-2.5 px-3 border-r border-slate-800">ผู้เบิก</th>
                    <th className="py-2.5 px-3 border-r border-slate-800">บิล</th>
                    <th className="py-2.5 px-3 border-r border-slate-800">ชื่อร้านค้า/ผู้รับเหมา</th>
                    <th className="py-2.5 px-3 border-r border-slate-800">รายละเอียดงาน</th>
                    <th className="py-2.5 px-3 border-r border-slate-800">รายการ</th>
                    <th className="py-2.5 px-3 border-r border-slate-800">ประเภท</th>
                    <th className="py-2.5 px-3 text-right border-r border-slate-800">ค่าของ</th>
                    <th className="py-2.5 px-3 text-right border-r border-slate-800">VAT</th>
                    <th className="py-2.5 px-3 text-right border-r border-slate-800">น้ำมัน</th>
                    <th className="py-2.5 px-3 text-right border-r border-slate-800">ซ่อมรถ</th>
                    <th className="py-2.5 px-3 text-right border-r border-slate-800">เครื่องจักร</th>
                    <th className="py-2.5 px-3 text-right border-r border-slate-800">เครื่องมือ</th>
                    <th className="py-2.5 px-3 text-right border-r border-slate-800">อื่นๆ</th>
                    <th className="py-2.5 px-3 text-right bg-emerald-900 text-emerald-100 font-black border-r border-emerald-800">โอนเงิน</th>
                    <th className="py-2.5 px-3">ว/ด/ป</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {materialRows.length === 0 ? (
                    <tr>
                      <td colSpan={16} className="py-8 text-center text-slate-400 font-semibold">
                        ไม่พบข้อมูลบิลค่าของ
                      </td>
                    </tr>
                  ) : (
                    materialRows.map((r, i) => {
                      const transfer = getRowTransferAmount(r);
                      const category = getRowCategory(r);
                      const requesterName = getRequesterDisplayName(r["ผู้เบิก"]);
                      const formattedDate = formatDateThai(r["ว/ด/ป"] || r["วันที่"]);

                      return (
                        <tr key={i} className="hover:bg-slate-50 transition">
                          <td className="py-2 px-3 font-semibold text-slate-500">{r["ลำดับ"] || i + 1}</td>
                          <td className="py-2 px-3 font-bold text-slate-900">{requesterName}</td>
                          <td className="py-2 px-3 font-medium">{r["บิล"] || "-"}</td>
                          <td className="py-2 px-3 font-bold text-slate-900">
                            {r["ร้านค้า"] || r["ร้าน/บุคคล"] || r["ร้านค้า/ผู้รับเหมา"] || "-"}
                          </td>
                          <td className="py-2 px-3">{r["รายละเอียดงาน"] || "-"}</td>
                          <td className="py-2 px-3">{r["สินค้า/ทำงาน"] || r["รายการ"] || "-"}</td>
                          <td className="py-2 px-3 font-semibold text-indigo-600">{category || "-"}</td>

                          <td className="py-2 px-3 text-right font-semibold">{money(getRowCategoryAmount(r, "ค่าของ"))}</td>
                          <td className="py-2 px-3 text-right font-medium">{r.vat || "-"}</td>
                          <td className="py-2 px-3 text-right font-semibold">{money(getRowCategoryAmount(r, "น้ำมัน"))}</td>
                          <td className="py-2 px-3 text-right font-semibold">{money(getRowCategoryAmount(r, "ซ่อมรถ"))}</td>
                          <td className="py-2 px-3 text-right font-semibold">{money(getRowCategoryAmount(r, "เครื่องจักร"))}</td>
                          <td className="py-2 px-3 text-right font-semibold">{money(getRowCategoryAmount(r, "เครื่องมือ"))}</td>
                          <td className="py-2 px-3 text-right font-semibold">{money(getRowCategoryAmount(r, "อื่นๆ"))}</td>

                          <td className="py-2 px-3 text-right font-black text-emerald-700 bg-emerald-50/60">
                            {money(transfer)}
                          </td>
                          <td className="py-2 px-3 text-slate-600 font-semibold whitespace-nowrap">{formattedDate}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {materialRows.length > 0 && (
                  <tfoot className="sticky bottom-0 z-20 shadow-md border-t-2 border-slate-400">
                    <tr className="font-extrabold text-xs">
                      <td
                        colSpan={7}
                        style={{ color: "#0f172a", backgroundColor: "#e2e8f0" }}
                        className="py-2.5 px-3 font-black text-slate-900 border-r border-slate-300 tracking-wider text-xs"
                      >
                        รวมสุทธิทั้งหมด ({materialRows.length} รายการ)
                      </td>
                      <td
                        style={{ color: "#064e3b", backgroundColor: "#d1fae5" }}
                        className="py-2.5 px-3 text-right font-black border-r border-emerald-200 text-xs"
                      >
                        {money(materialMetrics.catMaterial)}
                      </td>
                      <td
                        style={{ color: "#0f172a", backgroundColor: "#f1f5f9" }}
                        className="py-2.5 px-3 text-right font-black border-r border-slate-300 text-xs"
                      >
                        {materialMetrics.vatTotal > 0 ? money(materialMetrics.vatTotal) : "-"}
                      </td>
                      <td
                        style={{ color: "#78350f", backgroundColor: "#fef3c7" }}
                        className="py-2.5 px-3 text-right font-black border-r border-amber-200 text-xs"
                      >
                        {money(materialMetrics.catFuel)}
                      </td>
                      <td
                        style={{ color: "#7c2d12", backgroundColor: "#ffedd5" }}
                        className="py-2.5 px-3 text-right font-black border-r border-orange-200 text-xs"
                      >
                        {money(materialMetrics.catRepair)}
                      </td>
                      <td
                        style={{ color: "#1e3a8a", backgroundColor: "#dbeafe" }}
                        className="py-2.5 px-3 text-right font-black border-r border-blue-200 text-xs"
                      >
                        {money(materialMetrics.catMachine)}
                      </td>
                      <td
                        style={{ color: "#164e63", backgroundColor: "#cffafe" }}
                        className="py-2.5 px-3 text-right font-black border-r border-cyan-200 text-xs"
                      >
                        {money(materialMetrics.catTool)}
                      </td>
                      <td
                        style={{ color: "#881337", backgroundColor: "#ffe4e6" }}
                        className="py-2.5 px-3 text-right font-black border-r border-rose-200 text-xs"
                      >
                        {money(materialMetrics.catOther)}
                      </td>
                      <td
                        style={{ color: "#ffffff", backgroundColor: "#059669" }}
                        className="py-2.5 px-3 text-right font-black text-sm border-r border-emerald-700 shadow-inner"
                      >
                        {money(materialMetrics.totalTransfer)}
                      </td>
                      <td
                        style={{ color: "#475569", backgroundColor: "#e2e8f0" }}
                        className="py-2.5 px-3 border-r border-slate-300 text-center text-xs font-bold"
                      >
                        -
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 6. TAB 2: สรุปแยกตามประเภทสินค้า (18 สินค้า) */}
      {activeTab === "product_category" && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl p-3 border border-teal-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Boxes className="text-teal-600" size={16} />
              <span className="text-xs font-black text-slate-800">เลือกประเภทสินค้า:</span>
              <select
                value={selectedProductCategory}
                onChange={(e) => setSelectedProductCategory(e.target.value)}
                className="bg-teal-50 border border-teal-200 font-extrabold text-xs text-teal-900 px-2.5 py-1 rounded-lg focus:outline-none"
              >
                <option value="all">📦 แสดงสินค้าทุกประเภท ({PRODUCT_CATEGORIES_LIST.length} รหัสสินค้า)</option>
                {PRODUCT_CATEGORIES_LIST.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs font-black text-slate-700">
              ยอดโอนรวมสินค้า: <span className="text-teal-700">{money(productCategoryMetrics.grandTotal)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {productCategoryMetrics.breakdown.map((cat) => {
              const isSelected = selectedProductCategory === cat.code;
              return (
                <div
                  key={cat.code}
                  onClick={() => setSelectedProductCategory(isSelected ? "all" : cat.code)}
                  className={`bg-white rounded-xl p-2 border transition cursor-pointer shadow-2xs flex flex-col justify-between ${
                    isSelected ? "border-teal-600 ring-2 ring-teal-600/20 bg-teal-50/20" : "border-slate-200 hover:border-teal-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-50 text-teal-900 border border-teal-200 truncate">
                      {cat.label}
                    </span>
                    <span className="text-[9px] font-semibold text-slate-400">{cat.count} รายการ</span>
                  </div>

                  <div className="mt-1.5 flex items-baseline justify-between">
                    <div className="text-xs font-black text-slate-900">{money(cat.transfer)}</div>
                    <span className="text-[9px] font-black text-teal-700">{cat.percent.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-auto max-h-[calc(100vh-210px)] min-h-[420px] relative scrollbar-thin">
              <table className="w-full text-left text-xs text-slate-700 border-collapse font-sans">
                <thead className="sticky top-0 z-20 bg-slate-900 text-white font-extrabold text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 border-r border-slate-800">ลำดับ</th>
                    <th className="py-2.5 px-3 border-r border-slate-800">ผู้เบิก</th>
                    <th className="py-2.5 px-3 border-r border-slate-800">บิล</th>
                    <th className="py-2.5 px-3 border-r border-slate-800">ชื่อร้านค้า/ผู้รับเหมา</th>
                    <th className="py-2.5 px-3 border-r border-slate-800">รายละเอียดงาน / รายการ</th>
                    <th className="py-2.5 px-3 border-r border-slate-800">ประเภท</th>
                    <th className="py-2.5 px-3 text-right border-r border-slate-800">ยอดเงินบิล</th>
                    <th className="py-2.5 px-3 text-right bg-teal-900 text-teal-100 font-black border-r border-teal-800">โอนเงิน</th>
                    <th className="py-2.5 px-3">ว/ด/ป</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {productCategoryFilteredRows.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition">
                      <td className="py-2 px-3 font-semibold text-slate-500">{r["ลำดับ"] || i + 1}</td>
                      <td className="py-2 px-3 font-bold text-slate-900">{getRequesterDisplayName(r["ผู้เบิก"])}</td>
                      <td className="py-2 px-3 font-medium">{r["บิล"] || "-"}</td>
                      <td className="py-2 px-3 font-bold text-slate-900">
                        {r["ร้านค้า"] || r["ผู้รับเหมา"] || r["ร้าน/บุคคล"] || "-"}
                      </td>
                      <td className="py-2 px-3">{r["สินค้า/ทำงาน"] || r["รายละเอียดงาน"] || "-"}</td>
                      <td className="py-2 px-3 font-semibold text-teal-700">{getRowCategory(r) || "-"}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">{money(getRowAmount(r))}</td>
                      <td className="py-2 px-3 text-right font-black text-teal-700 bg-teal-50/60">
                        {money(getRowTransferAmount(r))}
                      </td>
                      <td className="py-2 px-3 text-slate-600 font-semibold whitespace-nowrap">{formatDateThai(r["ว/ด/ป"] || r["วันที่"])}</td>
                    </tr>
                  ))}
                </tbody>
                {productCategoryFilteredRows.length > 0 && (
                  <tfoot className="sticky bottom-0 z-20 shadow-md border-t-2 border-slate-400">
                    <tr className="font-extrabold text-xs">
                      <td
                        colSpan={6}
                        style={{ color: "#0f172a", backgroundColor: "#e2e8f0" }}
                        className="py-2.5 px-3 font-black text-slate-900 border-r border-slate-300 tracking-wider text-xs"
                      >
                        รวมสุทธิสินค้า ({productCategoryFilteredRows.length} รายการ)
                      </td>
                      <td
                        style={{ color: "#0f172a", backgroundColor: "#f1f5f9" }}
                        className="py-2.5 px-3 text-right font-black border-r border-slate-300 text-xs"
                      >
                        {money(productCategoryBillTotal)}
                      </td>
                      <td
                        style={{ color: "#ffffff", backgroundColor: "#0d9488" }}
                        className="py-2.5 px-3 text-right font-black text-sm border-r border-teal-700 text-xs"
                      >
                        {money(productCategoryTransferTotal)}
                      </td>
                      <td
                        style={{ color: "#475569", backgroundColor: "#e2e8f0" }}
                        className="py-2.5 px-3 border-r border-slate-300 text-center text-xs font-bold"
                      >
                        -
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 7. TAB 3: สรุปค่าแรง (LABOR BREAKDOWN) */}
      {activeTab === "labor" && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-3 border-b border-slate-200 bg-indigo-50 flex items-center justify-between">
              <h2 className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-2">
                <HardHat size={15} />
                <span>สรุปค่าแรงงานและผู้รับเหมา (Labor Expenses Breakdown)</span>
              </h2>
              <span className="text-xs font-black text-indigo-950 bg-indigo-100 px-3 py-1 rounded-lg border border-indigo-200">
                โอนรวมสุทธิ: {money(laborMetrics.totalTransfer)}
              </span>
            </div>

            <div className="overflow-auto max-h-[calc(100vh-210px)] min-h-[420px] relative scrollbar-thin">
              <table className="w-full text-left text-xs text-slate-700 border-collapse font-sans">
                <thead className="sticky top-0 z-20 bg-slate-900 text-white font-extrabold text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 border-r border-slate-800">ลำดับ</th>
                    <th className="py-2.5 px-3 border-r border-slate-800">ผู้เบิก</th>
                    <th className="py-2.5 px-3 border-r border-slate-800">บิล</th>
                    <th className="py-2.5 px-3 border-r border-slate-800">ชื่อผู้รับเหมา/ช่าง</th>
                    <th className="py-2.5 px-3 border-r border-slate-800">รายละเอียดงาน</th>
                    <th className="py-2.5 px-3 text-right border-r border-slate-800">เปิดจ้าง</th>
                    <th className="py-2.5 px-3 text-right border-r border-slate-800">ค่าแรง</th>
                    <th className="py-2.5 px-3 text-right border-r border-slate-800">จ่ายสะสม</th>
                    <th className="py-2.5 px-3 text-right bg-indigo-900 text-indigo-100 font-black border-r border-indigo-800">โอนเงิน</th>
                    <th className="py-2.5 px-3">ว/ด/ป</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {laborRows.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition">
                      <td className="py-2 px-3 font-semibold text-slate-500">{r["ลำดับ"] || i + 1}</td>
                      <td className="py-2 px-3 font-bold text-slate-900">{getRequesterDisplayName(r["ผู้เบิก"])}</td>
                      <td className="py-2 px-3 font-medium">{r["บิล"] || "-"}</td>
                      <td className="py-2 px-3 font-bold text-slate-900">
                        {r["ชื่อผู้รับเหมา"] || r["ผู้รับเหมา"] || r["ร้าน/บุคคล"] || "-"}
                      </td>
                      <td className="py-2 px-3">{r["รายละเอียดงาน"] || r["สินค้า/ทำงาน"] || "-"}</td>
                      <td className="py-2 px-3 text-right font-semibold">{money(toNumber(r["เปิดจ้าง"]))}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">
                        {money(toNumber(r["ค่าแรง"]) || getRowAmount(r))}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold">{money(toNumber(r["จ่ายสะสม"]))}</td>
                      <td className="py-2 px-3 text-right font-black text-indigo-700 bg-indigo-50/60">
                        {money(getRowTransferAmount(r))}
                      </td>
                      <td className="py-2 px-3 text-slate-600 font-semibold whitespace-nowrap">{formatDateThai(r["ว/ด/ป"] || r["วันที่"])}</td>
                    </tr>
                  ))}
                </tbody>
                {laborRows.length > 0 && (
                  <tfoot className="sticky bottom-0 z-20 shadow-md border-t-2 border-slate-400">
                    <tr className="font-extrabold text-xs">
                      <td
                        colSpan={5}
                        style={{ color: "#0f172a", backgroundColor: "#e2e8f0" }}
                        className="py-2.5 px-3 font-black text-slate-900 border-r border-slate-300 tracking-wider text-xs"
                      >
                        รวมสุทธิค่าแรง ({laborRows.length} รายการ)
                      </td>
                      <td
                        style={{ color: "#312e81", backgroundColor: "#e0e7ff" }}
                        className="py-2.5 px-3 text-right font-black border-r border-indigo-200 text-xs"
                      >
                        {money(laborMetrics.totalOpenHire)}
                      </td>
                      <td
                        style={{ color: "#0f172a", backgroundColor: "#f1f5f9" }}
                        className="py-2.5 px-3 text-right font-black border-r border-slate-300 text-xs"
                      >
                        {money(laborMetrics.totalLabor)}
                      </td>
                      <td
                        style={{ color: "#581c87", backgroundColor: "#f3e8ff" }}
                        className="py-2.5 px-3 text-right font-black border-r border-purple-200 text-xs"
                      >
                        {money(laborMetrics.totalAccumPaid)}
                      </td>
                      <td
                        style={{ color: "#ffffff", backgroundColor: "#4f46e5" }}
                        className="py-2.5 px-3 text-right font-black text-sm border-r border-indigo-700"
                      >
                        {money(laborMetrics.totalTransfer)}
                      </td>
                      <td
                        style={{ color: "#475569", backgroundColor: "#e2e8f0" }}
                        className="py-2.5 px-3 border-r border-slate-300 text-center text-xs font-bold"
                      >
                        -
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 8. TAB 4: สรุปประเภท (8 CATEGORIES) */}
      {activeTab === "category" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {categoryMetrics.breakdown.map((cat) => (
              <div
                key={cat.key}
                onClick={() => setSelectedCategory(selectedCategory === cat.key ? "all" : cat.key)}
                className={`p-3 rounded-xl border transition cursor-pointer ${
                  selectedCategory === cat.key ? "ring-2 ring-purple-600 bg-purple-50" : cat.color
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs">{cat.label}</span>
                  <span className="text-[10px] font-bold opacity-75">{cat.count} รายการ</span>
                </div>
                <div className="text-sm font-black mt-1">{money(cat.transfer)}</div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-auto max-h-[calc(100vh-210px)] min-h-[420px] relative scrollbar-thin">
              <table className="w-full text-left text-xs text-slate-700 border-collapse font-sans">
                <thead className="sticky top-0 z-20 bg-slate-900 text-white font-extrabold text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 border-r border-slate-800">ลำดับ</th>
                    <th className="py-2.5 px-3 border-r border-slate-800">ผู้เบิก</th>
                    <th className="py-2.5 px-3 border-r border-slate-800">บิล</th>
                    <th className="py-2.5 px-3 border-r border-slate-800">ร้านค้า/ผู้รับเหมา</th>
                    <th className="py-2.5 px-3 border-r border-slate-800">รายละเอียดงาน</th>
                    <th className="py-2.5 px-3 border-r border-slate-800">หมวดหมู่</th>
                    <th className="py-2.5 px-3 text-right border-r border-slate-800">ยอดเงินบิล</th>
                    <th className="py-2.5 px-3 text-right bg-purple-900 text-purple-100 font-black border-r border-purple-800">โอนเงิน</th>
                    <th className="py-2.5 px-3">ว/ด/ป</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categoryFilteredRows.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition">
                      <td className="py-2 px-3 font-semibold text-slate-500">{r["ลำดับ"] || i + 1}</td>
                      <td className="py-2 px-3 font-bold text-slate-900">{getRequesterDisplayName(r["ผู้เบิก"])}</td>
                      <td className="py-2 px-3 font-medium">{r["บิล"] || "-"}</td>
                      <td className="py-2 px-3 font-bold text-slate-900">
                        {r["ร้านค้า"] || r["ผู้รับเหมา"] || r["ร้าน/บุคคล"] || "-"}
                      </td>
                      <td className="py-2 px-3">{r["รายละเอียดงาน"] || r["สินค้า/ทำงาน"] || "-"}</td>
                      <td className="py-2 px-3 font-bold text-purple-700">{getRowCategory(r) || "-"}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">{money(getRowAmount(r))}</td>
                      <td className="py-2 px-3 text-right font-black text-purple-700 bg-purple-50/60">
                        {money(getRowTransferAmount(r))}
                      </td>
                      <td className="py-2 px-3 text-slate-600 font-semibold whitespace-nowrap">{formatDateThai(r["ว/ด/ป"] || r["วันที่"])}</td>
                    </tr>
                  ))}
                </tbody>
                {categoryFilteredRows.length > 0 && (
                  <tfoot className="sticky bottom-0 z-20 shadow-md border-t-2 border-slate-400">
                    <tr className="font-extrabold text-xs">
                      <td
                        colSpan={6}
                        style={{ color: "#0f172a", backgroundColor: "#e2e8f0" }}
                        className="py-2.5 px-3 font-black text-slate-900 border-r border-slate-300 tracking-wider text-xs"
                      >
                        รวมสุทธิประเภท ({categoryFilteredRows.length} รายการ)
                      </td>
                      <td
                        style={{ color: "#0f172a", backgroundColor: "#f1f5f9" }}
                        className="py-2.5 px-3 text-right font-black border-r border-slate-300 text-xs"
                      >
                        {money(categoryFilteredBillTotal)}
                      </td>
                      <td
                        style={{ color: "#ffffff", backgroundColor: "#9333ea" }}
                        className="py-2.5 px-3 text-right font-black text-sm border-r border-purple-700"
                      >
                        {money(categoryFilteredTransferTotal)}
                      </td>
                      <td
                        style={{ color: "#475569", backgroundColor: "#e2e8f0" }}
                        className="py-2.5 px-3 border-r border-slate-300 text-center text-xs font-bold"
                      >
                        -
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 9. TAB 5: ค่าแรงต่อคน (CONTRACTOR DETAIL) */}
      {activeTab === "contractor" && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl p-3 border border-amber-200 shadow-2xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="text-amber-600" size={16} />
              <span className="text-xs font-black text-slate-800">เลือกผู้รับเหมา/ช่าง:</span>
              <select
                value={selectedContractor}
                onChange={(e) => setSelectedContractor(e.target.value)}
                className="bg-amber-50 border border-amber-200 font-extrabold text-xs text-amber-950 px-3 py-1 rounded-lg focus:outline-none"
              >
                <option value="all">👷 ผู้รับเหมาทุกคน ({contractorsList.length} คน)</option>
                {contractorsList.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <span className="text-xs font-black text-amber-900 bg-amber-100 px-3 py-1 rounded-lg">
              โอนรวมผู้รับเหมา: {money(contractorMetrics.totalTransfer)}
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-auto max-h-[calc(100vh-210px)] min-h-[420px] relative scrollbar-thin">
              <table className="w-full text-left text-xs text-slate-700 border-collapse font-sans">
                <thead className="sticky top-0 z-20 bg-slate-900 text-white font-extrabold text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 border-r border-slate-800">ลำดับ</th>
                    <th className="py-2.5 px-3 border-r border-slate-800">ชื่อผู้รับเหมา</th>
                    <th className="py-2.5 px-3 border-r border-slate-800">รายละเอียดงาน</th>
                    <th className="py-2.5 px-3 text-right border-r border-slate-800">เปิดจ้าง</th>
                    <th className="py-2.5 px-3 text-right border-r border-slate-800">ค่าแรง</th>
                    <th className="py-2.5 px-3 text-right bg-amber-900 text-amber-100 font-black border-r border-amber-800">โอนเงิน</th>
                    <th className="py-2.5 px-3">ว/ด/ป</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {contractorRows.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition">
                      <td className="py-2 px-3 font-semibold text-slate-500">{r["ลำดับ"] || i + 1}</td>
                      <td className="py-2 px-3 font-bold text-slate-900">
                        {r["ชื่อผู้รับเหมา"] || r["ผู้รับเหมา"] || r["ร้าน/บุคคล"] || "-"}
                      </td>
                      <td className="py-2 px-3">{r["รายละเอียดงาน"] || r["สินค้า/ทำงาน"] || "-"}</td>
                      <td className="py-2 px-3 text-right font-semibold">{money(toNumber(r["เปิดจ้าง"]))}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">{money(toNumber(r["ค่าแรง"]) || getRowAmount(r))}</td>
                      <td className="py-2 px-3 text-right font-black text-amber-800 bg-amber-50/60">
                        {money(getRowTransferAmount(r))}
                      </td>
                      <td className="py-2 px-3 text-slate-600 font-semibold whitespace-nowrap">{formatDateThai(r["ว/ด/ป"] || r["วันที่"])}</td>
                    </tr>
                  ))}
                </tbody>
                {contractorRows.length > 0 && (
                  <tfoot className="sticky bottom-0 z-20 shadow-md border-t-2 border-slate-400">
                    <tr className="font-extrabold text-xs">
                      <td
                        colSpan={3}
                        style={{ color: "#0f172a", backgroundColor: "#e2e8f0" }}
                        className="py-2.5 px-3 font-black text-slate-900 border-r border-slate-300 tracking-wider text-xs"
                      >
                        รวมสุทธิผู้รับเหมา ({contractorRows.length} รายการ)
                      </td>
                      <td
                        style={{ color: "#78350f", backgroundColor: "#fef3c7" }}
                        className="py-2.5 px-3 text-right font-black border-r border-amber-200 text-xs"
                      >
                        {money(contractorMetrics.totalOpenHire)}
                      </td>
                      <td
                        style={{ color: "#0f172a", backgroundColor: "#f1f5f9" }}
                        className="py-2.5 px-3 text-right font-black border-r border-slate-300 text-xs"
                      >
                        {money(contractorMetrics.totalLabor)}
                      </td>
                      <td
                        style={{ color: "#ffffff", backgroundColor: "#d97706" }}
                        className="py-2.5 px-3 text-right font-black text-sm border-r border-amber-700"
                      >
                        {money(contractorMetrics.totalTransfer)}
                      </td>
                      <td
                        style={{ color: "#475569", backgroundColor: "#e2e8f0" }}
                        className="py-2.5 px-3 border-r border-slate-300 text-center text-xs font-bold"
                      >
                        -
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 10. TAB 6: ค่าของต่อร้าน (STORE DETAIL) */}
      {activeTab === "store" && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl p-3 border border-sky-200 shadow-2xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Store className="text-sky-600" size={16} />
              <span className="text-xs font-black text-slate-800">เลือกร้านค้า:</span>
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="bg-sky-50 border border-sky-200 font-extrabold text-xs text-sky-950 px-3 py-1 rounded-lg focus:outline-none"
              >
                <option value="all">🏪 ร้านค้าทั้งหมด ({storesList.length} ร้าน)</option>
                {storesList.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <span className="text-xs font-black text-sky-900 bg-sky-100 px-3 py-1 rounded-lg">
              โอนรวมร้านค้า: {money(storeMetrics.totalTransfer)}
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-auto max-h-[calc(100vh-210px)] min-h-[420px] relative scrollbar-thin">
              <table className="w-full text-left text-xs text-slate-700 border-collapse font-sans">
                <thead className="sticky top-0 z-20 bg-slate-900 text-white font-extrabold text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 border-r border-slate-800">ลำดับ</th>
                    <th className="py-2.5 px-3 border-r border-slate-800">ชื่อร้านค้า</th>
                    <th className="py-2.5 px-3 border-r border-slate-800">รายละเอียดงาน / สินค้า</th>
                    <th className="py-2.5 px-3 text-right border-r border-slate-800">ยอดเงินบิล</th>
                    <th className="py-2.5 px-3 text-right bg-sky-900 text-sky-100 font-black border-r border-sky-800">โอนเงิน</th>
                    <th className="py-2.5 px-3">ว/ด/ป</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {storeRows.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition">
                      <td className="py-2 px-3 font-semibold text-slate-500">{r["ลำดับ"] || i + 1}</td>
                      <td className="py-2 px-3 font-bold text-slate-900">
                        {r["ร้านค้า"] || r["ร้าน/บุคคล"] || r["ร้านค้า/ผู้รับเหมา"] || "-"}
                      </td>
                      <td className="py-2 px-3">{r["สินค้า/ทำงาน"] || r["รายละเอียดงาน"] || "-"}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">{money(getRowAmount(r))}</td>
                      <td className="py-2 px-3 text-right font-black text-sky-800 bg-sky-50/60">
                        {money(getRowTransferAmount(r))}
                      </td>
                      <td className="py-2 px-3 text-slate-600 font-semibold whitespace-nowrap">{formatDateThai(r["ว/ด/ป"] || r["วันที่"])}</td>
                    </tr>
                  ))}
                </tbody>
                {storeRows.length > 0 && (
                  <tfoot className="sticky bottom-0 z-20 shadow-md border-t-2 border-slate-400">
                    <tr className="font-extrabold text-xs">
                      <td
                        colSpan={3}
                        style={{ color: "#0f172a", backgroundColor: "#e2e8f0" }}
                        className="py-2.5 px-3 font-black text-slate-900 border-r border-slate-300 tracking-wider text-xs"
                      >
                        รวมสุทธิร้านค้า ({storeRows.length} รายการ)
                      </td>
                      <td
                        style={{ color: "#0f172a", backgroundColor: "#f1f5f9" }}
                        className="py-2.5 px-3 text-right font-black border-r border-slate-300 text-xs"
                      >
                        {money(storeMetrics.totalAmount)}
                      </td>
                      <td
                        style={{ color: "#ffffff", backgroundColor: "#0284c7" }}
                        className="py-2.5 px-3 text-right font-black text-sm border-r border-sky-700"
                      >
                        {money(storeMetrics.totalTransfer)}
                      </td>
                      <td
                        style={{ color: "#475569", backgroundColor: "#e2e8f0" }}
                        className="py-2.5 px-3 border-r border-slate-300 text-center text-xs font-bold"
                      >
                        -
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
