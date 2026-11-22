import { useEffect, useMemo, useState } from "react";
import { Eye, Printer, Search, Square, CheckSquare, X } from "lucide-react";
import DatePicker from "react-multi-date-picker";
import { persian, persian_af } from "../../utils/dateHelpers";
import { toEnglishDigits } from "../../utils/dariNumberFormatter";
import { apiUrl } from "../../api";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useDatePresets from "../../hooks/useDatePresets";
import { FilterPresetButtons } from "../common";

const PANEL = "rounded-card border border-line bg-surface-muted/40 p-3.5 space-y-3";
const LABEL = "text-label-text font-bold text-content-strong";

function FilterSection({ title, badge, children }) {
  return (
    <section className={PANEL}>
      <div className="flex items-center justify-between gap-2">
        <span className={LABEL}>{title}</span>
        {badge && <span className="rounded-badge border border-line bg-surface px-2.5 py-0.5 text-caption-text text-content-muted">{badge}</span>}
      </div>
      {children}
    </section>
  );
}

export default function ExpenseSummaryFilterModal({ isOpen, onClose, onShow }) {
  useBodyScrollLock(isOpen);
  const [categories, setCategories] = useState([]);
  const [categoryScope, setCategoryScope] = useState("all");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [categorySearch, setCategorySearch] = useState("");
  const {
    activePreset,
    setActivePreset,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    applyPreset,
    presets,
  } = useDatePresets("this_month");

  useEffect(() => {
    if (!isOpen) return;
    applyPreset("this_month");
    setCategoryScope("all");
    setSelectedCategoryIds([]);
    setCategorySearch("");
    fetch(apiUrl("/categories/expense_category"))
      .then((response) => response.ok ? response.json() : [])
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]));
  }, [isOpen, applyPreset]);

  const visibleCategories = useMemo(() => {
    const query = categorySearch.trim().toLowerCase();
    return categories.filter((category) => {
      const matchesSearch = !query || String(category.name || "").toLowerCase().includes(query);
      return matchesSearch;
    });
  }, [categories, categorySearch]);

  if (!isOpen) return null;

  const toggleCategory = (id) => {
    const value = String(id);
    setSelectedCategoryIds((current) => current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value]);
  };
  const selectAllCategories = () => setSelectedCategoryIds(visibleCategories.map((category) => String(category.id)));
  const clearCategories = () => setSelectedCategoryIds([]);
  const buildFilters = () => ({
    from_date: activePreset === "all" || !fromDate ? undefined : toEnglishDigits(fromDate.format("YYYY/MM/DD")),
    to_date: activePreset === "all" || !toDate ? undefined : toEnglishDigits(toDate.format("YYYY/MM/DD")),
    expense_type_ids: "",
    category_ids: categoryScope === "selected" ? selectedCategoryIds.join(",") : "",
  });
  const canPreview = activePreset === "all" || (fromDate && toDate);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-overlay/50 p-3 sm:p-4 font-sans" dir="rtl">
      <div className="flex h-[82vh] max-h-[760px] w-full max-w-[980px] flex-col overflow-hidden rounded-modal border border-line bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-line bg-surface px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-btn border border-line bg-surface-muted text-content-muted">
              <Printer size={17} />
            </div>
            <div>
              <h3 className="text-section-title font-bold text-content-strong">فیلتر و استخراج راپور مصارف</h3>
              <p className="text-caption-text text-content-subtle">تمام نوعیت‌ها و سرفصل‌های مصارف</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-btn p-1.5 text-content-faint hover:bg-surface-subtle" aria-label="بستن">
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 lg:overflow-hidden">
          <div className="grid grid-cols-1 gap-5 lg:h-full lg:grid-cols-2">
            <div className="order-1 min-h-0 lg:order-2 lg:overflow-y-auto lg:pr-1">
              <FilterSection title="شمول سرفصل‌های مصرف" badge={categoryScope === "all" ? "تمام سرفصل‌ها" : `${selectedCategoryIds.length} سرفصل`}>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => { setCategoryScope("all"); clearCategories(); }} className={`rounded-btn border px-3 py-2 text-label-text font-bold ${categoryScope === "all" ? "border-slate-800 bg-slate-800 text-white" : "border-line-strong bg-surface text-content-body"}`}>
                    تمام سرفصل‌ها
                  </button>
                  <button type="button" onClick={() => setCategoryScope("selected")} className={`rounded-btn border px-3 py-2 text-label-text font-bold ${categoryScope === "selected" ? "border-slate-800 bg-slate-800 text-white" : "border-line-strong bg-surface text-content-body"}`}>
                    انتخاب بعضی سرفصل
                  </button>
                </div>
                {categoryScope === "selected" ? (
                  <>
                    <div className="relative">
                      <Search size={15} className="absolute right-3 top-2.5 text-content-faint" />
                      <input value={categorySearch} onChange={(event) => setCategorySearch(event.target.value)} placeholder="جستجوی سرفصل..." className="w-full rounded-input border border-line-strong bg-surface py-2 pr-9 pl-3 text-xs text-content-body outline-none focus:border-accent" />
                    </div>
                    <div className="flex justify-between text-caption-text">
                      <button type="button" onClick={selectAllCategories} className="text-accent-strong">انتخاب همه</button>
                      <button type="button" onClick={clearCategories} className="text-content-muted">لغو همه</button>
                    </div>
                    <div className="min-h-[180px] space-y-1 rounded-card border border-line bg-surface p-2">
                      {visibleCategories.map((category) => {
                        const checked = selectedCategoryIds.includes(String(category.id));
                        return (
                          <button key={category.id} type="button" onClick={() => toggleCategory(category.id)} className="flex w-full items-center gap-2 rounded-btn px-2 py-1.5 text-right text-body-text text-content-body hover:bg-surface-subtle">
                            {checked ? <CheckSquare size={16} className="text-accent" /> : <Square size={16} className="text-content-faint" />}
                            <span>{category.name}</span>
                          </button>
                        );
                      })}
                      {!visibleCategories.length && <p className="p-5 text-center text-caption-text text-content-muted">سرفصلی یافت نشد.</p>}
                    </div>
                  </>
                ) : (
                  <div className="flex min-h-[300px] items-center justify-center text-body-text text-content-muted">
                    تمام سرفصل‌های مصرف در راپور شامل می‌شوند.
                  </div>
                )}
              </FilterSection>
            </div>

            <div className="order-2 space-y-3.5 lg:order-1 lg:min-h-0 lg:overflow-y-auto lg:pl-1">
              <FilterSection title="عنوان راپور">
                <input value="راپور جامع مصارف شرکت" readOnly className="w-full rounded-badge border border-line-strong bg-surface px-3 py-2 text-body-text font-semibold text-content-strong" />
              </FilterSection>
              <FilterSection title="بازه زمانی راپور" badge={activePreset === "all" ? "کل دوره" : activePreset === "custom" ? "دلخواه" : "ماه جاری"}>
                <FilterPresetButtons presets={presets} activeKey={activePreset} onChange={applyPreset} buttonClassName="rounded-btn px-3 py-1.5 text-caption-text" />
                {activePreset !== "all" && (
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-caption-text font-bold text-content-muted">از تاریخ
                      <DatePicker value={fromDate} onChange={(date) => { setActivePreset("custom"); setFromDate(date); }} calendar={persian} locale={persian_af} calendarPosition="bottom-right" inputClass="mt-1 w-full rounded-badge border border-line-strong bg-surface px-3 py-1.5 text-center text-body-text font-bold" />
                    </label>
                    <label className="text-caption-text font-bold text-content-muted">تا تاریخ
                      <DatePicker value={toDate} onChange={(date) => { setActivePreset("custom"); setToDate(date); }} calendar={persian} locale={persian_af} calendarPosition="bottom-right" inputClass="mt-1 w-full rounded-badge border border-line-strong bg-surface px-3 py-1.5 text-center text-body-text font-bold" />
                    </label>
                  </div>
                )}
              </FilterSection>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-line bg-surface-muted px-5 py-3.5">
          <button type="button" onClick={() => onShow(buildFilters())} disabled={!canPreview} className="inline-flex items-center gap-1.5 rounded-btn bg-slate-800 px-4 py-2 text-btn-text font-bold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50">
            <Eye size={16} />
            نمایش پیش‌نمایش راپور
          </button>
          <button type="button" onClick={onClose} className="rounded-btn border border-line-strong bg-surface px-4 py-2 text-btn-text font-bold text-content-body hover:bg-surface-subtle">انصراف</button>
        </div>
      </div>
    </div>
  );
}
