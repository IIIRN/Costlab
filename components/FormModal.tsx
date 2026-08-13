"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Plus, Save, Trash2, X } from "lucide-react";
import { LoadingState } from "@/components/LoadingState";
import { TABLES } from "@/lib/config";
import type { FieldSchema, RefOption, SheetRow } from "@/lib/types";
import { normalizeDateToIso, toInputDateValue } from "@/lib/dates";
import { imagePreviewUrl } from "@/components/BillImageThumbnail";
import { ProjectBudgetAllocator } from "@/components/forms/ProjectBudgetAllocator";
import { BillCategoryBudgetGuardrail } from "@/components/forms/BillCategoryBudgetGuardrail";

type FormPayload = {
  tableName: string;
  schema: FieldSchema[];
  initialValues: SheetRow;
  refOptions: Record<string, RefOption[]>;
};

type FormModalProps = {
  form: FormPayload;
  title?: string;
  buttonLabel?: string;
  relaxed?: boolean;
  submitPath?: string;
  openEventName?: string;
  hideLauncher?: boolean;
};

type OpenFormDetail = {
  row?: SheetRow;
  sheetRow?: string | number;
};

export function FormModal({ form, title = "เพิ่มข้อมูล", buttonLabel = "เพิ่มรายการ", relaxed = false, submitPath, openEventName, hideLauncher = false }: FormModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(() => getInitialStringValues(form));
  const [editSheetRow, setEditSheetRow] = useState<string | number | null>(null);
  const [enumListSearch, setEnumListSearch] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isEditing = editSheetRow !== null && editSheetRow !== undefined;
  const visibleFields = form.schema.filter(field => {
    if (field.type === "Hidden") return false;
    if ((form.tableName === TABLES.PROJECT || form.tableName === "Project") && (field.name.startsWith("งบไม่เกิน") || field.name === "คุมงบประเภทงาน")) {
      return false;
    }
    return isFieldVisible(field, values);
  });

  useEffect(() => {
    if (!openEventName) return;
    const openFromExternalButton = (event: Event) => {
      const detail = event instanceof CustomEvent ? event.detail as OpenFormDetail | undefined : undefined;
      const nextValues = detail?.row
        ? getRowStringValues(form, detail.row)
        : getInitialStringValues(form);
      if (detail?.row) {
        form.schema.filter(f => f.type === "Ref" && f.refFill).forEach(field => {
          const refVal = nextValues[field.name];
          if (refVal) {
            const options = form.refOptions[field.name] || [];
            const selectedOpt = options.find(opt =>
              String(opt.value) === refVal ||
              String(opt.label) === refVal ||
              (opt.row && (
                String(opt.row.id) === refVal ||
                String(opt.row.id_Contractor) === refVal ||
                String(opt.row.id_store) === refVal
              ))
            );
            if (selectedOpt) {
              Object.entries(field.refFill!).forEach(([targetField, sourceColumn]) => {
                if (!hasValue(nextValues[targetField])) {
                  nextValues[targetField] = String(selectedOpt.row?.[sourceColumn] ?? "");
                }
              });
            }
          }
        });
      }
      applyLocalFormulas(nextValues, form.tableName);
      setError("");
      setEnumListSearch({});
      const targetRowKey = detail?.sheetRow ?? detail?.row?._sheetRow ?? detail?.row?.id ?? detail?.row?.id_bank ?? detail?.row?.id_store ?? detail?.row?.id_Contractor ?? detail?.row?.id_car ?? detail?.row?.id_cus ?? detail?.row?.id_Company;
      setEditSheetRow(detail?.row ? (targetRowKey !== undefined && targetRowKey !== null ? (typeof targetRowKey === "number" || typeof targetRowKey === "string" ? targetRowKey : String(targetRowKey)) : 1) : null);
      setValues(nextValues);
      setOpen(true);
    };
    window.addEventListener(openEventName, openFromExternalButton as EventListener);
    return () => window.removeEventListener(openEventName, openFromExternalButton as EventListener);
  }, [form, openEventName]);

  function updateValue(field: FieldSchema, value: string) {
    setValues(current => {
      const next = { ...current, [field.name]: value };
      applyRefFill(next, field, form, value);
      normalizeDependentValues(next, field.name, form);
      if (form.tableName === TABLES.DATA && field.name === "จำนวนหัก") return next;
      pruneHiddenConditionalValues(next, form);
      applyLocalFormulas(next, form.tableName);
      return next;
    });
  }

  function updateValueByName(fieldName: string, value: string) {
    setValues(current => {
      const next = { ...current, [fieldName]: value };
      const targetField = form.schema.find(f => f.name === fieldName);
      if (targetField) {
        applyRefFill(next, targetField, form, value);
        normalizeDependentValues(next, fieldName, form);
      }
      applyLocalFormulas(next, form.tableName);
      return next;
    });
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!submitPath) return;

    const submitValues = sanitizeValuesForSubmit(values, form);
    const validationError = validateVisibleRequiredFields(submitValues, form);
    if (validationError) {
      setError(validationError);
      return;
    }

    const formElement = event.currentTarget;
    const body = new FormData();
    body.set("tableName", form.tableName);
    Object.entries(submitValues).forEach(([key, value]) => body.append(key, value));
    if (isEditing && editSheetRow !== null) body.set("sheetRow", String(editSheetRow));

    let hasFiles = false;
    formElement.querySelectorAll<HTMLInputElement>('input[type="file"]').forEach(input => {
      Array.from(input.files || []).forEach(file => {
        if (file.size > 0) {
          hasFiles = true;
          body.append(input.name, file);
        }
      });
    });

    setSaving(true);
    setError("");
    try {
      const response = isEditing
        ? hasFiles
          ? await fetch(submitPath, {
            method: "PATCH",
            body
          })
          : await fetch(submitPath, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tableName: form.tableName, sheetRow: editSheetRow, values: submitValues })
          })
        : await fetch(submitPath, {
          method: "POST",
          body
        });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "บันทึกไม่สำเร็จ");
      setOpen(false);
      setEditSheetRow(null);
      setValues(getInitialStringValues(form));
      if (form.tableName === TABLES.DATA) {
        window.location.reload();
      } else {
        router.refresh();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {!hideLauncher ? (
        <div className={open ? "hidden" : ""}>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 bg-[#d4f54e] hover:bg-[#c2e438] text-[#0b3531] font-extrabold text-xs rounded-lg border border-[#b8df28] shadow-2xs transition-all cursor-pointer whitespace-nowrap"
            onClick={() => setOpen(true)}
          >
            <Plus size={15} />
            <span>{buttonLabel}</span>
          </button>
        </div>
      ) : null}
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150" role="presentation">
          <form
            className={`w-full bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col border border-slate-200 max-h-[95vh] sm:max-h-[90vh] ${
              relaxed ? "max-w-6xl" : "max-w-4xl"
            }`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="form-modal-title"
            aria-busy={saving}
            onSubmit={submitForm}
          >
            <header className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white shrink-0">
              <div>
                <h3 id="form-modal-title" className="text-sm font-bold text-slate-900 m-0">
                  {isEditing ? title.replace(/^เพิ่ม/, "แก้ไข") : title}
                </h3>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{form.tableName}</span>
              </div>
              <button
                type="button"
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                aria-label="ปิด"
                disabled={saving}
                onClick={() => { setOpen(false); setEditSheetRow(null); }}
              >
                <X size={16} />
              </button>
            </header>
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
              {saving ? (
                <div className="absolute inset-0 z-20 bg-white/80 backdrop-blur-2xs flex items-center justify-center">
                  <LoadingState title="กำลังบันทึก" message="กำลังอัปโหลดและบันทึกข้อมูล" compact />
                </div>
              ) : null}
              <fieldset className="space-y-4 border-0 p-0 m-0" disabled={saving}>
                {form.tableName === TABLES.DATA ? (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div className="bg-white p-2.5 rounded-md border border-slate-200 shadow-2xs flex flex-col justify-center">
                      <span className="text-slate-500 text-[11px] font-semibold">ยอดเงินรวม</span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-base font-extrabold text-slate-900">
                          {Number(values["ยอดเงิน"] || 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">บาท</span>
                      </div>
                    </div>

                    {values["หัก"] ? (
                      <div className="bg-white p-2.5 rounded-md border border-slate-200 shadow-2xs flex flex-col justify-center">
                        <span className="text-slate-500 text-[11px] font-semibold">หัก ณ ที่จ่าย ({values["หัก"]}%)</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-sm font-bold text-amber-700">
                            - {Number(values["3เปอร์"] || values["จำนวนหัก"] || 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">บาท</span>
                        </div>
                      </div>
                    ) : null}

                    <div className={`bg-white p-2.5 rounded-md border border-emerald-200 shadow-2xs flex flex-col justify-center ${values["หัก"] ? "" : "col-span-1"}`}>
                      <span className="text-emerald-700 text-[11px] font-bold">ยอดโอนสุทธิ</span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-base font-extrabold text-emerald-700">
                          {Number(values["ยอดโอน"] || values["ยอดเงิน"] || 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : null}
                {form.tableName === TABLES.DATA || form.tableName === "Data" ? (
                  <BillCategoryBudgetGuardrail
                    values={values}
                    projectRows={(form.refOptions["ID Project"] || form.refOptions["ชื่อ Project"] || []).map(opt => opt.row).filter(Boolean) as SheetRow[]}
                  />
                ) : null}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {visibleFields.map(field => (
                    <div className={`${getFieldClassName(field)} space-y-1.5`} key={field.name}>
                      <label className="text-xs font-semibold text-slate-700 block">{getFieldLabel(field)}{field.required ? <span className="text-rose-600 font-semibold ml-0.5">*</span> : ""}</label>
                      {renderField(
                        field,
                        form,
                        values[field.name] || "",
                        values,
                        isEditing,
                        value => updateValue(field, value),
                        enumListSearch[field.name] || "",
                        value => setEnumListSearch(current => ({ ...current, [field.name]: value }))
                      )}
                      {field.description ? <small className="text-[11px] text-slate-500 block leading-tight font-normal">{field.description}</small> : null}
                    </div>
                  ))}
                </div>
                {form.tableName === TABLES.PROJECT || form.tableName === "Project" ? (
                  <ProjectBudgetAllocator values={values} onChange={updateValueByName} />
                ) : null}
                {error ? <div className="p-3 bg-rose-50 text-rose-700 rounded-lg border border-rose-200 text-xs font-semibold">{error}</div> : null}
              </fieldset>
            </div>
            <footer className="flex items-center justify-end gap-2 px-4 py-3 bg-slate-50 border-t border-slate-200 shrink-0">
              <button
                type="button"
                disabled={saving}
                onClick={() => { setOpen(false); setEditSheetRow(null); }}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-200/70 border border-slate-300 bg-white transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type={submitPath ? "submit" : "button"}
                disabled={saving || !submitPath}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-extrabold text-white bg-[#0b3531] hover:bg-[#072724] disabled:opacity-50 transition cursor-pointer shadow-xs"
              >
                <Save size={14} />
                <span>{saving ? "กำลังบันทึก" : "บันทึก"}</span>
              </button>
            </footer>
          </form>
        </div>
      ) : null}
    </>
  );
}

function ImageFileFieldInput({
  field,
  value,
  readOnly,
  onChange
}: {
  field: FieldSchema;
  value: string;
  readOnly: boolean;
  onChange: (value: string) => void;
}) {
  const [selectedFilePreview, setSelectedFilePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewUrl = imagePreviewUrl(value);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFilePreview(URL.createObjectURL(file));
    } else {
      setSelectedFilePreview(null);
    }
  };

  const handleRemoveExisting = () => {
    onChange("");
    setSelectedFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveSelectedFile = () => {
    setSelectedFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      {/* Existing Uploaded Image Preview with Delete Button */}
      {previewUrl ? (
        <div className="flex items-center gap-3 p-2 bg-slate-50 border border-slate-200 rounded-lg">
          <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-200 bg-slate-900 shrink-0">
            <img src={previewUrl} alt="รูปเดิม" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-bold text-slate-800 block truncate">รูปภาพที่เคยอัปโหลด</span>
            <span className="text-[10px] text-slate-400 font-mono block truncate">{value}</span>
          </div>
          {!readOnly && (
            <button
              type="button"
              onClick={handleRemoveExisting}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-lg border border-rose-200 transition cursor-pointer shrink-0"
              title="ลบรูปภาพที่อัปโหลดไว้"
            >
              <Trash2 size={13} />
              <span>ลบรูปภาพ</span>
            </button>
          )}
        </div>
      ) : null}

      {/* Selected New File Preview */}
      {selectedFilePreview ? (
        <div className="flex items-center gap-3 p-2 bg-sky-50 border border-sky-200 rounded-lg">
          <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-sky-300 bg-slate-900 shrink-0">
            <img src={selectedFilePreview} alt="รูปใหม่" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-bold text-sky-900 block">เลือกไฟล์ใหม่แล้ว</span>
            <span className="text-[10px] text-sky-600 font-medium block">พร้อมบันทึกอัปโหลดใหม่</span>
          </div>
          {!readOnly && (
            <button
              type="button"
              onClick={handleRemoveSelectedFile}
              className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-slate-100 text-slate-600 text-xs font-bold rounded-lg border border-slate-200 transition cursor-pointer shrink-0"
            >
              <X size={13} />
              <span>ยกเลิก</span>
            </button>
          )}
        </div>
      ) : null}

      {/* File Input Selector */}
      <div className="space-y-1">
        <input
          ref={fileInputRef}
          type="file"
          name={field.name}
          accept={field.type === "Image" ? "image/*" : undefined}
          multiple={field.type === "Image"}
          disabled={readOnly}
          onChange={handleFileChange}
          className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border border-slate-300 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 transition-colors cursor-pointer"
        />
        {field.type === "Image" && !previewUrl && !selectedFilePreview ? (
          <small className="text-[11px] text-slate-400 block font-medium">บนมือถือเลือกถ่ายรูปหรือแนบจากเครื่องได้</small>
        ) : null}
      </div>
    </div>
  );
}

function renderField(
  field: FieldSchema,
  form: FormPayload,
  value: string,
  currentValues: Record<string, string>,
  isEditing: boolean,
  onChange: (value: string) => void,
  enumSearchValue = "",
  onEnumSearchChange: (value: string) => void = () => {}
) {
  const readOnly = Boolean(field.readonly || (isEditing && field.readonlyOnEdit));
  if (field.type === "Image" || field.type === "File") {
    return (
      <ImageFileFieldInput
        field={field}
        value={value}
        readOnly={readOnly}
        onChange={onChange}
      />
    );
  }

  if (field.type === "Ref" || field.type === "Enum" || field.type === "EnumList") {
    const options = getFieldOptions(field, form, currentValues);
    if (field.type === "Ref" && field.name === "ร้านค้า") {
      return (
        <SearchableRefSelect
          name={field.name}
          value={value}
          options={options}
          readOnly={readOnly}
          placeholder="พิมพ์ชื่อร้านค้า หรือรหัสร้านค้า"
          onChange={onChange}
        />
      );
    }

    if (field.type === "EnumList") {
      const selectedValues = splitEnumListValue(value);
      const optionValues = new Set(options.map(option => String(option.value)));
      const selectedOptionValues = selectedValues.filter(item => optionValues.has(item));
      const customValue = selectedValues.filter(item => !optionValues.has(item)).join(", ");
      const normalizedSearch = enumSearchValue.trim().toLowerCase();
      const filteredOptions = normalizedSearch
        ? options.filter(option => `${String(option.value)} ${String(option.label)}`.toLowerCase().includes(normalizedSearch))
        : options;

      function setSelectedValues(nextValues: string[], nextCustomValue = customValue) {
        const customItems = splitEnumListValue(nextCustomValue);
        onChange([...new Set([...nextValues, ...customItems].filter(Boolean))].join(", "));
      }

      function removeSelectedValue(selectedValue: string) {
        setSelectedValues(
          selectedOptionValues.filter(item => item !== selectedValue),
          splitEnumListValue(customValue).filter(item => item !== selectedValue).join(", ")
        );
      }

      return (
        <div className="space-y-2.5 border border-slate-300 rounded-lg p-3.5 bg-slate-50/70 shadow-2xs">
          <input type="hidden" name={field.name} value={value} />
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap gap-1.5 min-h-[28px] items-center" aria-live="polite">
              {selectedValues.length ? (
                selectedValues.map((selectedValue, index) => (
                  <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-200 text-xs font-bold shadow-2xs" key={`${selectedValue}-${index}`}>
                    <span>{selectedValue}</span>
                    {!readOnly ? (
                      <button type="button" className="hover:text-rose-600 transition cursor-pointer ml-0.5" aria-label={`ลบ ${selectedValue}`} onClick={() => removeSelectedValue(selectedValue)}>
                        <X size={13} />
                      </button>
                    ) : null}
                  </span>
                ))
              ) : (
                <span className="text-slate-400 font-medium italic text-xs">ยังไม่ได้เลือกรายการ</span>
              )}
            </div>
            <span className="text-[11px] font-bold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-full shrink-0">{selectedValues.length} / {options.length}</span>
          </div>
          <input
            type="search"
            className="w-full h-9 px-3 bg-white border border-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 rounded-lg text-xs font-semibold text-slate-800 placeholder:text-slate-400 shadow-2xs transition-all"
            value={enumSearchValue}
            readOnly={readOnly}
            placeholder="ค้นหารายละเอียดงาน..."
            onChange={event => onEnumSearchChange(event.target.value)}
          />
          <div className="max-h-44 overflow-y-auto space-y-1 bg-white p-2 border border-slate-300 rounded-lg shadow-2xs" role="group" aria-label={field.name}>
            {filteredOptions.map((option, index) => {
              const optionValue = String(option.value);
              const checked = selectedValues.includes(optionValue);
              return (
                <label className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition ${checked ? "bg-indigo-50/80 text-indigo-900 font-bold border border-indigo-100" : "hover:bg-slate-50 text-slate-700"}`} key={`${optionValue}-${index}`}>
                  <input
                    type="checkbox"
                    value={optionValue}
                    checked={checked}
                    disabled={readOnly}
                    className="w-4 h-4 rounded border-slate-300 accent-indigo-600 cursor-pointer"
                    onChange={event => {
                      const nextValues = event.target.checked
                        ? [...selectedOptionValues, optionValue]
                        : selectedOptionValues.filter(item => item !== optionValue);
                      setSelectedValues(nextValues);
                    }}
                  />
                  <span>{String(option.label)}</span>
                </label>
              );
            })}
            {!filteredOptions.length ? <div className="p-3 text-center text-slate-400 text-xs font-medium">ไม่พบรายการ</div> : null}
          </div>
          <input
            type="text"
            className="w-full h-9 px-3 bg-white border border-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 rounded-lg text-xs font-semibold text-slate-800 placeholder:text-slate-400 shadow-2xs transition-all"
            value={customValue}
            readOnly={readOnly}
            placeholder="เพิ่มงานอื่น คั่นด้วย comma"
            onChange={event => setSelectedValues(selectedOptionValues, event.target.value)}
          />
        </div>
      );
    }

  if (field.inputMode === "buttons") {
    const optionValues = new Set(options.map(option => String(option.value)));
    const customChoice = customChoiceConfig(field.name);
    
    const strVal = String(value ?? "").trim();
    const isZeroOrEmpty = strVal === "" || strVal === "0" || strVal === "0.00";

    const customValue = customChoice && !isZeroOrEmpty && strVal !== customChoice.optionValue && !optionValues.has(strVal) ? strVal : "";
    const choiceValue = customChoice ? (customValue ? customChoice.optionValue : (isZeroOrEmpty ? "" : strVal)) : strVal;
      return (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={field.name}>
            {options.map((option, index) => {
              const optionValue = String(option.value);
              const checked = choiceValue === optionValue;
              return (
                <label
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                    checked
                      ? "bg-slate-900 text-white border-slate-900 shadow-2xs font-bold"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                  key={`${optionValue}-${index}`}
                  onClick={(e) => {
                    if (readOnly) return;
                    if (checked && !field.required) {
                      e.preventDefault();
                      onChange("");
                    }
                  }}
                >
                  <input
                    type="radio"
                    name={field.name}
                    value={optionValue}
                    checked={checked}
                    disabled={readOnly}
                    className="sr-only"
                    onChange={event => {
                      if (customChoice && event.target.value === customChoice.optionValue) {
                        onChange(customValue || customChoice.optionValue);
                        return;
                      }
                      onChange(event.target.value);
                    }}
                  />
                  <span>{String(option.label)}</span>
                </label>
              );
            })}
          </div>
          {customChoice && choiceValue === customChoice.optionValue ? (
            <input
              type="number"
              className="w-full h-9 px-3 bg-white border border-slate-200 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 rounded-lg text-xs font-semibold text-slate-800 placeholder:text-slate-400"
              value={customValue}
              readOnly={readOnly}
              placeholder={customChoice.placeholder}
              onChange={event => onChange(event.target.value)}
            />
          ) : null}
        </div>
      );
    }

    return (
      <SearchableRefSelect
        name={field.name}
        value={value}
        options={options}
        readOnly={readOnly}
        placeholder={`เลือก${field.name}...`}
        onChange={onChange}
      />
    );
  }

  if (field.type === "LongText") {
    return (
      <textarea
        name={field.name}
        value={value}
        readOnly={readOnly}
        rows={3}
        onChange={event => onChange(event.target.value)}
        className="w-full p-2.5 bg-white border border-slate-300 focus:border-slate-800 focus:outline-none rounded text-xs font-semibold text-slate-800 placeholder:text-slate-400 transition-all resize-y"
      />
    );
  }

  const billDateMode = form.tableName === TABLES.DATA && field.type === "Date";
  const type = field.type === "Date" ? "date" : field.type === "Decimal" || field.type === "Number" ? "number" : "text";
  return (
    <input
      type={type}
      name={field.name}
      value={billDateMode ? toDateInputValue(value) : value}
      readOnly={readOnly}
      lang={billDateMode ? "th-TH" : undefined}
      onChange={event => onChange(billDateMode ? normalizeBillDateInput(event.target.value) : event.target.value)}
      className="w-full h-9 px-2.5 bg-white border border-slate-300 focus:border-slate-800 focus:outline-none rounded text-xs font-semibold text-slate-800 placeholder:text-slate-400 transition-all"
    />
  );
}

function SearchableRefSelect({
  name,
  value,
  options,
  readOnly,
  placeholder,
  onChange
}: {
  name: string;
  value: string;
  options: RefOption[];
  readOnly: boolean;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const selectedOption = value ? options.find(option =>
    String(option.value) === value ||
    String(option.label) === value ||
    (option.row && (
      String(option.row.id) === value ||
      String(option.row.id_store) === value ||
      String(option.row["ชื่อร้านค้า"]) === value ||
      Object.values(option.row).some(v => v !== null && v !== undefined && String(v).trim() !== "" && String(v) === value)
    ))
  ) : undefined;
  const selectedLabel = selectedOption ? optionLabel(selectedOption) : value;
  const selectedImgUrl = (selectedOption?.row?.image || selectedOption?.row?.image_url || "") as string;

  const [query, setQuery] = useState(selectedLabel);
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const [brokenSelectedImg, setBrokenSelectedImg] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = normalizedQuery
    ? options.filter(option => optionSearchText(option).includes(normalizedQuery)).slice(0, 80)
    : options.slice(0, 80);

  useEffect(() => { setQuery(selectedLabel); }, [selectedLabel, value]);
  useEffect(() => { setBrokenSelectedImg(false); }, [selectedImgUrl]);

  function openMenu() {
    if (readOnly) return;
    if (wrapRef.current) {
      const rect = wrapRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    setOpen(true);
  }

  function updateQuery(nextQuery: string) {
    setQuery(nextQuery);
    openMenu();
    const exact = options.find(option => {
      const optionValue = String(option.value);
      const label = optionLabel(option);
      return optionValue.toLowerCase() === nextQuery.toLowerCase() || label.toLowerCase() === nextQuery.toLowerCase();
    });
    onChange(exact ? String(exact.value) : nextQuery);
  }

  function selectOption(option: RefOption) {
    onChange(String(option.value));
    setQuery(optionLabel(option));
    setOpen(false);
  }

  const showSelectedImg = isValidImgUrl(selectedImgUrl) && !brokenSelectedImg;

  const menuEl = open && !readOnly && menuPos ? (
    <div
      className="bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100"
      role="listbox"
      aria-label={name}
      style={{
        position: "fixed",
        top: menuPos.top,
        left: menuPos.left,
        width: menuPos.width,
        zIndex: 9999,
      }}
    >
      {filteredOptions.length ? (
        filteredOptions.map((option, index) => {
          const optionValue = String(option.value);
          const rawImg = option.row?.image || option.row?.image_url || "";
          const imgUrl = isValidImgUrl(typeof rawImg === "string" ? rawImg.trim() : "");
          return (
            <DropdownOption
              key={`${optionValue}-${index}`}
              option={option}
              optionValue={optionValue}
              imgUrl={imgUrl}
              isActive={optionValue === value}
              onSelect={selectOption}
            />
          );
        })
      ) : (
        <div className="p-3 text-center text-slate-400 text-xs font-medium">ไม่พบข้อมูล</div>
      )}
    </div>
  ) : null;

  return (
    <div
      ref={wrapRef}
      className="relative w-full"
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <input type="hidden" name={name} value={value} />
      <input
        type="search"
        className="w-full h-9 px-2.5 bg-white border border-slate-300 focus:border-slate-800 focus:outline-none rounded text-xs font-semibold text-slate-800 placeholder:text-slate-400 transition-all"
        value={query}
        readOnly={readOnly}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={openMenu}
        onChange={event => updateQuery(event.target.value)}
      />
      {typeof document !== "undefined" ? createPortal(menuEl, document.body) : null}
    </div>
  );
}

function DropdownOption({
  option, optionValue, imgUrl, isActive, onSelect
}: {
  option: RefOption;
  optionValue: string;
  imgUrl: string;
  isActive: boolean;
  onSelect: (o: RefOption) => void;
}) {
  const [broken, setBroken] = useState(false);
  const showImg = imgUrl && !broken;
  return (
    <button
      type="button"
      className={`w-full px-3 py-2 text-left text-xs font-semibold flex items-center gap-2 cursor-pointer transition ${
        isActive
          ? "bg-indigo-50 text-indigo-900 font-extrabold"
          : "text-slate-700 hover:bg-slate-50 hover:text-indigo-600"
      }`}
      role="option"
      aria-selected={isActive}
      onMouseDown={e => e.preventDefault()}
      onClick={() => onSelect(option)}
    >
      {showImg ? (
        <img
          src={imgUrl}
          alt=""
          className="w-6 h-6 rounded-md object-cover border border-slate-200 shrink-0"
          onError={() => setBroken(true)}
        />
      ) : null}
      <strong className="truncate">{optionLabel(option)}</strong>
    </button>
  );
}

function optionLabel(option: RefOption | undefined) {
  if (!option) return "";
  return String(option.label || option.value || "");
}

function optionSearchText(option: RefOption) {
  return `${String(option.value || "")} ${optionLabel(option)}`.toLowerCase();
}

/** กรองและดึง URL รูปภาพที่ถูกต้อง (HTTP/HTTPS, Data URL) */
function isValidImgUrl(url: string): string {
  return imagePreviewUrl(url);
}

function customChoiceConfig(fieldName: string) {
  if (fieldName === "vat") return { optionValue: "ระบุเอง", placeholder: "กำหนด VAT เอง" };
  if (fieldName === "หัก") return { optionValue: "ระบุเอง", placeholder: "กำหนดเปอร์เซ็นต์หักเอง" };
  if (fieldName === "เครดิต") return { optionValue: "ระบุเอง", placeholder: "กำหนดเครดิตเอง (วัน)" };
  return null;
}

function getCookie(name: string): string {
  if (typeof document === "undefined") return "";
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop()!.split(";").shift() || "");
  return "";
}

function getInitialStringValues(form: FormPayload) {
  const values = Object.fromEntries(form.schema.map(field => [field.name, String(form.initialValues[field.name] ?? "")]));
  if (form.tableName === TABLES.DATA || form.tableName === "Data") {
    if (!values["ผู้เบิก"]) {
      const loggedInEmployeeId = getCookie("auth_employee_id");
      if (loggedInEmployeeId) {
        values["ผู้เบิก"] = loggedInEmployeeId;
      }
    }
  }
  return values;
}

function firstNonEmpty(...vals: unknown[]): string {
  for (const v of vals) {
    if (v !== null && v !== undefined && String(v).trim() !== "") {
      return String(v).trim();
    }
  }
  return "";
}

function getRowStringValues(form: FormPayload, row: SheetRow) {
  const values: Record<string, string> = {};

  const rawVendorType = firstNonEmpty(row["ร้านค้า/ผู้รับเหมา"], row.vendor_type);
  const vendorType = rawVendorType || (firstNonEmpty(row["ผู้รับเหมา"], row.contractor_id) ? "ผู้รับเหมา" : "ร้านค้า");

  form.schema.forEach(field => {
    let rawVal = firstNonEmpty(row[field.name], form.initialValues[field.name]);

    if (form.tableName === TABLES.DATA || form.tableName === "Data") {
      if (field.name === "ร้านค้า/ผู้รับเหมา") {
        rawVal = vendorType;
      } else if (field.name === "ร้านค้า") {
        rawVal = firstNonEmpty(row["ร้านค้า"], row.store_id, row["ร้าน/บุคคล"], row.vendor_or_person);
      } else if (field.name === "ผู้รับเหมา") {
        rawVal = firstNonEmpty(row["ผู้รับเหมา"], row.contractor_id, row["ร้าน/บุคคล"], row.vendor_or_person);
      } else if (field.name === "สินค้า") {
        rawVal = firstNonEmpty(row["สินค้า"], row.product, row["สินค้า/ทำงาน"], row.description);
      } else if (field.name === "รายละเอียดงาน") {
        rawVal = firstNonEmpty(row["รายละเอียดงาน"], row.work_details, row["สินค้า/ทำงาน"], row.description);
      } else if (["ค่าของ", "ค่าแรง", "พนักงาน", "น้ำมัน", "ซ่อมรถ", "เครื่องจักร", "เครื่องมือ", "อื่นๆ"].includes(field.name)) {
        const rowType = String(row["ประเภท"] || "").toLowerCase();
        const rowAmount = firstNonEmpty(row["ยอดเงิน"], row.amount);
        if (!hasValue(rawVal) && hasValue(rowAmount) && rowType.includes(field.name.toLowerCase())) {
          rawVal = String(rowAmount);
        }
      }
    }

    if ((field.name === "vat" || field.name === "หัก" || field.name === "เครดิต") && (rawVal === "0" || rawVal === "0.00" || String(rawVal) === "0")) {
      rawVal = "";
    }

    if (field.type === "Date" && rawVal) {
      values[field.name] = toInputDateValue(rawVal);
    } else if (field.type === "Ref" && rawVal) {
      const options = form.refOptions[field.name] || [];
      const match = options.find(opt =>
        String(opt.value) === rawVal ||
        String(opt.label) === rawVal ||
        (opt.row && (
          String(opt.row.id) === rawVal ||
          String(opt.row.id_store) === rawVal ||
          String(opt.row.id_Conwork) === rawVal ||
          String(opt.row["ชื่อร้านค้า"]) === rawVal ||
          String(opt.row["ชื่อเล่น"]) === rawVal ||
          String(opt.row["ชื่อ-นามสกุล"]) === rawVal ||
          Object.values(opt.row).some(v => String(v) === rawVal)
        ))
      );
      values[field.name] = match ? String(match.value) : rawVal;
    } else if (field.name === "สินค้า" && rawVal) {
      const enumOpts = field.values || [];
      const match = enumOpts.find(opt => opt === rawVal || opt.endsWith(rawVal) || rawVal.endsWith(opt) || opt.includes(rawVal));
      values[field.name] = match || rawVal;
    } else {
      values[field.name] = rawVal;
    }
  });
  return values;
}

function splitEnumListValue(value: string) {
  return value.split(",").map(item => item.trim()).filter(Boolean);
}

function getFieldOptions(field: FieldSchema, form: FormPayload, values: Record<string, string>) {
  if (field.type === "Ref") {
    return filterRefOptions(field, form.refOptions[field.name] || [], values);
  }

  return getEnumValues(field, values).map(value => ({ value, label: value }));
}

function filterRefOptions(field: FieldSchema, options: RefOption[], values: Record<string, string>) {
  if (!field.filterBy) return options;
  const expectedValue = values[field.filterBy.field] || "";
  return options.filter(option => {
    if (expectedValue && String(option.row?.[field.filterBy!.column] ?? "") !== expectedValue) return false;
    if (!field.filterBy!.openContract) return true;
    return toNumber(option.row?.["ยอดเงินจ้าง"]) > toNumber(option.row?.["ยอดเงินจ่าย"]);
  });
}

function getEnumValues(field: FieldSchema, values: Record<string, string>) {
  const defaultValues = field.values || [];
  if (field.dynamicValues !== "billTypeOptions" || !field.dynamicOptionSets) return defaultValues;

  let dynamicList: string[] = [];
  if (values["ร้านค้า/ผู้รับเหมา"] === "ผู้รับเหมา") {
    dynamicList = field.dynamicOptionSets.contractor || [];
  } else if (values["สินค้า"]) {
    dynamicList = field.dynamicOptionSets.storeWithItem || [];
  } else {
    dynamicList = field.dynamicOptionSets.storeDefault || [];
  }

  return dynamicList.length > 0 ? dynamicList : defaultValues;
}

function normalizeDependentValues(values: Record<string, string>, changedField: string, form: FormPayload) {
  if (changedField === "ร้านค้า/ผู้รับเหมา") {
    if (values[changedField] === "ร้านค้า") {
      values["ผู้รับเหมา"] = "";
      values["รายละเอียดงาน"] = "";
      values["ค่าแรงคงเหลือ"] = "";
    } else {
      values["ร้านค้า"] = "";
      values["สินค้า"] = "";
    }
    values["ประเภท"] = "";
  }

  if (changedField === "สินค้า") values["ประเภท"] = "";

  if (changedField === "vat" && !hasValue(values["vat"])) {
    values["วันได้บิล"] = "";
    values["เครดิต"] = "";
    values["วันจ่าย"] = "";
  }

  if (changedField === "หัก" && !hasValue(values["หัก"])) {
    values["จำนวนหัก"] = "";
    values["วันออก 3%"] = "";
  }

  const typeField = form.schema.find(field => field.name === "ประเภท");
  if (typeField && values["ประเภท"] && !getEnumValues(typeField, values).includes(values["ประเภท"])) {
    values["ประเภท"] = "";
  }
}

function applyLocalFormulas(values: Record<string, string>, tableName: string) {
  if (tableName === TABLES.PROJECT) {
    if (hasValue(values["ยอดงาน"])) values["ยอดรวม vat"] = String(toNumber(values["ยอดงาน"]) * 1.07);
    return;
  }
  if (tableName === TABLES.DATA) {
    applyBillDeductAmount(values);
    return;
  }
  if (tableName !== TABLES.CONTRACT_WORK) return;
  const hireAmount = toNumber(values["ยอดเงินจ้าง"]);
  const paidAmount = toNumber(values["ยอดเงินจ่าย"]);
  if (hasValue(values["ยอดเงินจ้าง"]) || hasValue(values["ยอดเงินจ่าย"])) {
    values["ยอดเงินจ่าย"] = String(paidAmount);
    values["ค่าแรงคงเหลือ"] = String(hireAmount - paidAmount);
  }
}

function applyBillDeductAmount(values: Record<string, string>) {
  const amountFields = ["ค่าแรง", "อื่นๆ", "ค่าของ", "พนักงาน", "น้ำมัน", "ซ่อมรถ", "เครื่องจักร", "เครื่องมือ", "ค่าแรงคงเหลือ"];
  const baseAmount = amountFields.map(field => toNumber(values[field])).find(amount => amount > 0) || toNumber(values["ยอดเงิน"]);

  if (baseAmount > 0) {
    values["ยอดเงิน"] = String(baseAmount);
  }

  const deductValue = values["หัก"];
  const deductPercent = toNumber(deductValue);
  if (!hasValue(deductValue)) {
    values["จำนวนหัก"] = "";
  } else {
    values["จำนวนหัก"] = deductPercent && baseAmount ? formatDecimal(baseAmount * deductPercent / 100) : "";
  }

  const vatValue = values["vat"];
  const deductAmount = toNumber(values["จำนวนหัก"]);

  if (!hasValue(vatValue) && !hasValue(deductValue)) {
    values["ยอดโอน"] = baseAmount > 0 ? String(baseAmount) : values["ยอดเงิน"];
  } else if (hasValue(vatValue) && hasValue(deductValue)) {
    values["ยอดโอน"] = formatDecimal(baseAmount - deductAmount);
  } else if (hasValue(vatValue)) {
    values["ยอดโอน"] = String(baseAmount);
  } else if (hasValue(deductValue)) {
    values["ยอดโอน"] = formatDecimal(baseAmount - deductAmount);
  }
}

function applyRefFill(values: Record<string, string>, field: FieldSchema, form: FormPayload, value: string) {
  if (field.type !== "Ref" || !field.refFill) return;
  const selectedOption = (form.refOptions[field.name] || []).find(option => String(option.value) === value);
  Object.entries(field.refFill).forEach(([targetField, sourceColumn]) => {
    if (sourceColumn.includes("{")) {
      values[targetField] = selectedOption ? sourceColumn.replace(/\{([^}]+)\}/g, (_, key) => {
        const val = selectedOption.row?.[key];
        if (typeof val === "number") return new Intl.NumberFormat("th-TH").format(val);
        if (typeof val === "string" && !isNaN(Number(val)) && val.trim() !== "") return new Intl.NumberFormat("th-TH").format(Number(val));
        return String(val ?? "");
      }) : "";
    } else {
      values[targetField] = selectedOption ? String(selectedOption.row?.[sourceColumn] ?? "") : "";
    }
  });
}

function sanitizeValuesForSubmit(values: Record<string, string>, form: FormPayload) {
  const next = { ...values };
  pruneHiddenConditionalValues(next, form);
  applyLocalFormulas(next, form.tableName);
  return next;
}

function validateVisibleRequiredFields(values: Record<string, string>, form: FormPayload) {
  const missingField = form.schema.find(field => {
    if (!field.required || field.type === "Hidden" || field.readonly) return false;
    if (!isFieldVisible(field, values)) return false;
    return !hasValue(values[field.name]);
  });

  return missingField ? `กรุณากรอก ${getFieldLabel(missingField)}` : "";
}

function pruneHiddenConditionalValues(values: Record<string, string>, form: FormPayload) {
  form.schema.forEach(field => {
    if (field.type === "Hidden") return;
    if (isFieldVisible(field, values)) return;
    values[field.name] = "";
  });
}

function isFieldVisible(field: FieldSchema, values: Record<string, string>) {
  if (!field.showIf) return true;
  const actual = values[field.showIf.column] || "";
  if (field.showIf.equals !== undefined) return actual === field.showIf.equals;
  if (field.showIf.in) return field.showIf.in.includes(actual);
  if (field.showIf.notBlank) return hasValue(actual);
  return true;
}

function getFieldClassName(field: FieldSchema) {
  if (field.type === "LongText" || field.type === "Image" || field.type === "File" || field.type === "EnumList" || field.name === "ร้านค้า/ผู้รับเหมา") {
    return "col-span-full";
  }
  return "";
}

function getFieldLabel(field: FieldSchema) {
  if (field.name === "วันออก 3%") return "วันออก";
  return field.name;
}

function hasValue(value: unknown) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function toDateInputValue(value: string) {
  return toInputDateValue(value);
}

function normalizeBillDateInput(value: string) {
  return normalizeDateToIso(value);
}

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return value;
  const parsed = Number(String(value).replace(/,/g, ""));
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatDecimal(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

