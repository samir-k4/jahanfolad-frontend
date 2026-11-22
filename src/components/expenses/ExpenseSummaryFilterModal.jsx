import { useEffect, useState } from "react";
import { CalendarDays, CheckSquare, Loader2, Square, X } from "lucide-react";
import DatePicker from "react-multi-date-picker";
import { persian, persian_af } from "../../utils/dateHelpers";
import { toEnglishDigits } from "../../utils/dariNumberFormatter";
import { apiUrl } from "../../api";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useDatePresets from "../../hooks/useDatePresets";
import useExpenseTypes from "../../hooks/useExpenseTypes";

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
    applyPreset,
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

  if (!isOpen) return null;

  const handleShow = () => {
    if (!fromDate || !toDate) return;
    onShow({
      from_date: toEnglishDigits(fromDate.format("YYYY/MM/DD")),
      to_date: toEnglishDigits(toDate.format("YYYY/MM/DD")),
      expense_type_ids: selectedTypeIds.join(","),
      category_ids: selectedCategoryIds.join(","),
    });
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-overlay/50 p-3 font-sans" dir="rtl">
      <div className="w-full max-w-3xl overflow-hidden rounded-modal border border-line bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h3 className="text-section-title font-bold text-content-strong">فیلتر و استخراج خلاصه مصارف</h3>
            <p className="mt-1 text-caption-text text-content-subtle">فیلترها را انتخاب کنید و سپس راپور را نمایش دهید.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-btn p-1 text-content-faint hover:bg-surface-subtle">
            <X size={19} />
          </button>
        </div>
        <div className="space-y-4 bg-surface-muted p-5">
          <section className="rounded-card border border-line bg-surface p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold text-content-strong">
              <CalendarDays size={15} className="text-accent" />
              <span>بازه تاریخی</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <DatePicker value={fromDate} onChange={setFromDate} calendar={persian} locale={persian_af} format="YYYY/MM/DD" portal zIndex={9999} inputClass="h-9 w-36 rounded-input border border-line-strong bg-surface px-2 text-center text-xs font-bold text-content outline-none" />
              <span className="text-xs text-content-muted">الی</span>
              <DatePicker value={toDate} onChange={setToDate} calendar={persian} locale={persian_af} format="YYYY/MM/DD" portal zIndex={9999} inputClass="h-9 w-36 rounded-input border border-line-strong bg-surface px-2 text-center text-xs font-bold text-content outline-none" />
            </div>
          </section>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <SelectionList title="نوعیت مصرف" options={expenseTypes} selected={selectedTypeIds} onChange={setSelectedTypeIds} />
            <SelectionList title="سرفصل مصرف" options={categories} selected={selectedCategoryIds} onChange={setSelectedCategoryIds} loading={loadingCategories} />
          </div>
        </div>
        <div className="flex justify-between gap-2 border-t border-line bg-surface px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-btn border border-line-strong px-4 py-2 text-btn-text font-bold text-content-body hover:bg-surface-subtle">انصراف</button>
          <button type="button" onClick={handleShow} disabled={!fromDate || !toDate} className="rounded-btn bg-accent px-5 py-2 text-btn-text font-bold text-content-inverse hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50">نمایش راپور</button>
        </div>
      </div>
    </div>
  );
}
