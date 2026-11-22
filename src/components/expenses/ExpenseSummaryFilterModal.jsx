import { useEffect, useState } from "react";
import { CalendarDays, CheckSquare, Loader2, Square, X } from "lucide-react";
import DatePicker from "react-multi-date-picker";
import { persian, persian_af } from "../../utils/dateHelpers";
import { toEnglishDigits } from "../../utils/dariNumberFormatter";
import { apiUrl } from "../../api";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useDatePresets from "../../hooks/useDatePresets";
import useExpenseTypes from "../../hooks/useExpenseTypes";
import { FilterPresetButtons } from "../common";

function SelectionList({ title, options, selected, onChange, loading = false }) {
  const allSelected = options.length > 0 && selected.length === options.length;
  const toggle = (id) => onChange(
    selected.includes(id)
      ? selected.filter((item) => item !== id)
      : [...selected, id]
  );
  return (
    <section className="rounded-card border border-line bg-surface p-3">
      <div className="mb-2 flex items-center justify-between text-xs font-bold text-content-strong">
        <span>{title}</span>
        <button
          type="button"
          className="text-accent-strong"
          onClick={() => onChange(allSelected ? [] : options.map((option) => String(option.id)))}
        >
          {allSelected ? "لغو همه" : "انتخاب همه"}
        </button>
      </div>
      <div className="grid max-h-44 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
        {loading ? <Loader2 size={16} className="animate-spin text-accent" /> : options.map((option) => {
          const id = String(option.id);
          const checked = selected.includes(id);
          return (
            <button
              type="button"
              key={id}
              onClick={() => toggle(id)}
              className="flex items-center gap-1.5 rounded px-1.5 py-1 text-right text-xs text-content-body hover:bg-surface-subtle"
            >
              {checked ? <CheckSquare size={15} className="text-accent" /> : <Square size={15} className="text-content-faint" />}
              <span>{option.name}</span>
            </button>
          );
        })}
        {!loading && !options.length && <span className="text-xs text-content-muted">موردی یافت نشد</span>}
      </div>
    </section>
  );
}

export default function ExpenseSummaryFilterModal({ isOpen, onClose, onShow }) {
  useBodyScrollLock(isOpen);
  const { types: expenseTypes } = useExpenseTypes(isOpen);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [selectedTypeIds, setSelectedTypeIds] = useState([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const {
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    activePreset,
    setActivePreset,
    applyPreset,
    presets,
  } = useDatePresets("this_month");

  useEffect(() => {
    if (!isOpen) return;
    applyPreset("this_month");
    setSelectedTypeIds([]);
    setSelectedCategoryIds([]);
    setLoadingCategories(true);
    fetch(apiUrl("/categories/expense_category"))
      .then((response) => response.ok ? response.json() : [])
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]))
      .finally(() => setLoadingCategories(false));
  }, [isOpen, applyPreset]);

  useEffect(() => {
    if (!selectedTypeIds.length) return;
    const allowed = new Set(
      categories
        .filter((category) => selectedTypeIds.includes(String(category.expense_type_id)))
        .map((category) => String(category.id))
    );
    setSelectedCategoryIds((current) => current.filter((id) => allowed.has(id)));
  }, [selectedTypeIds, categories]);

  if (!isOpen) return null;

  const handleShow = () => {
    if (activePreset !== "all" && (!fromDate || !toDate)) return;
    onShow({
      from_date: toEnglishDigits(fromDate.format("YYYY/MM/DD")),
      to_date: toEnglishDigits(toDate.format("YYYY/MM/DD")),
      expense_type_ids: selectedTypeIds.join(","),
      category_ids: selectedCategoryIds.join(","),
    });
  };
  const visibleCategories = selectedTypeIds.length
    ? categories.filter((category) => selectedTypeIds.includes(String(category.expense_type_id)))
    : categories;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-overlay/50 p-3 font-sans" dir="rtl">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-modal border border-line bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h3 className="text-section-title font-bold text-content-strong">فیلتر و استخراج خلاصه مصارف</h3>
            <p className="mt-1 text-caption-text text-content-subtle">فیلترها را انتخاب کنید و سپس راپور را نمایش دهید.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-btn p-1 text-content-faint hover:bg-surface-subtle">
            <X size={19} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto bg-surface-muted p-5">
          <section className="rounded-card border border-line bg-surface p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold text-content-strong">
              <CalendarDays size={15} className="text-accent" />
              <span>بازه زمانی</span>
            </div>
            <FilterPresetButtons
              presets={presets}
              activeKey={activePreset}
              onChange={applyPreset}
              buttonClassName="px-3 py-1.5 rounded-btn text-caption-text"
            />
            {activePreset !== "all" && (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-xs font-bold text-content-muted">
                  از تاریخ
                  <DatePicker value={fromDate} onChange={(date) => { setActivePreset("custom"); setFromDate(date); }} calendar={persian} locale={persian_af} format="YYYY/MM/DD" portal zIndex={9999} inputClass="mt-1 h-9 w-full rounded-input border border-line-strong bg-surface px-2 text-center text-xs font-bold text-content outline-none" />
                </label>
                <label className="text-xs font-bold text-content-muted">
                  تا تاریخ
                  <DatePicker value={toDate} onChange={(date) => { setActivePreset("custom"); setToDate(date); }} calendar={persian} locale={persian_af} format="YYYY/MM/DD" portal zIndex={9999} inputClass="mt-1 h-9 w-full rounded-input border border-line-strong bg-surface px-2 text-center text-xs font-bold text-content outline-none" />
                </label>
              </div>
            )}
          </section>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <SelectionList title="نوعیت مصرف" options={expenseTypes} selected={selectedTypeIds} onChange={setSelectedTypeIds} />
            <SelectionList title="سرفصل مصرف" options={visibleCategories} selected={selectedCategoryIds} onChange={setSelectedCategoryIds} loading={loadingCategories} />
          </div>
        </div>
        <div className="flex justify-between gap-2 border-t border-line bg-surface px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-btn border border-line-strong px-4 py-2 text-btn-text font-bold text-content-body hover:bg-surface-subtle">انصراف</button>
          <button type="button" onClick={handleShow}           disabled={activePreset !== "all" && (!fromDate || !toDate)} className="rounded-btn bg-accent px-5 py-2 text-btn-text font-bold text-content-inverse hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50">نمایش راپور</button>
        </div>
      </div>
    </div>
  );
}
