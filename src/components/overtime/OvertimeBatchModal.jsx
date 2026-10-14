import {
  DEFAULT_HOURLY_RATE,
  MAX_HOURS_PER_DAY,
  resolveHourlyRate,
  roundOvertimePay,
} from "../../constants/overtimeDomain";
import showToast from "../../utils/toast";
import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import { X, CheckCheck, Check, Layers, Clock, Search } from "lucide-react";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import CustomDropdown from "../common/CustomDropdown";
import SearchableSelect from "../common/SearchableSelect";
import NumberField from "../common/NumberField";
const ALL = "all";
const DEFAULT_BATCH_HOURS = 5;
const PANEL = "rounded-card border border-line bg-surface-muted/40 p-4";
const PANEL_TITLE = "text-label-text font-bold text-content";
const CHIP =
  "px-3 py-1 rounded-btn bg-surface text-content-body text-btn-text font-medium hover:bg-surface-subtle transition-colors cursor-pointer border border-line-strong";
const getEmpCategory = (emp) =>
  String(emp?.job_category?.name || emp?.job_category || "").trim();
const getEmpCode = (emp) => emp?.employee_ID || emp?.employee_code || "";
export default function OvertimeBatchModal({
  isOpen,
  onClose,
  employees = [],
  weekRange,
  selectedDate,
  onApplyToTable,
  onDirectSaveBatch,
  isSaving,
  leaveEmployeeIds = new Set(),
}) {
  const { t } = useTranslation("overtime");
  useBodyScrollLock(isOpen);
  const [selectedCategory, setSelectedCategory] = useState(ALL);
  const [selectedPosition, setSelectedPosition] = useState(ALL);
  const [excludedIds, setExcludedIds] = useState(new Set());
  const [hours, setHours] = useState(String(DEFAULT_BATCH_HOURS));
  const [overrideRate, setOverrideRate] = useState(false);
  const [hourlyRate, setHourlyRate] = useState(String(DEFAULT_HOURLY_RATE));
  const [selectedDates, setSelectedDates] = useState([]);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const availableCategories = useMemo(() => {
    const catSet = new Set();
    employees.forEach((emp) => {
      catSet.add(getEmpCategory(emp));
    });
    catSet.delete("");
    return Array.from(catSet).sort((a, b) => a.localeCompare(b, "fa"));
  }, [employees]);
  const availablePositions = useMemo(() => {
    const posSet = new Set();
    employees.forEach((emp) => {
      const empCat = getEmpCategory(emp);
      const pos = (emp.position || "").trim();
      if (!pos) return;
      if (selectedCategory === ALL || empCat === selectedCategory) {
        posSet.add(pos);
      }
    });
    return Array.from(posSet).sort((a, b) => a.localeCompare(b, "fa"));
  }, [employees, selectedCategory]);
  const matchingEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const empCat = getEmpCategory(emp);
      const empPos = (emp.position || "").trim();
      if (selectedCategory !== ALL && empCat !== selectedCategory) {
        return false;
      }
      if (selectedPosition !== ALL && empPos !== selectedPosition) {
        return false;
      }
      return true;
    });
  }, [employees, selectedCategory, selectedPosition]);
  const visibleEmployees = useMemo(() => {
    const term = employeeSearch.toLowerCase().trim();
    if (!term) return matchingEmployees;
    return matchingEmployees.filter(
      (emp) =>
        (emp.full_name || emp.name || "").toLowerCase().includes(term) ||
        (emp.father_name || "").toLowerCase().includes(term) ||
        String(getEmpCode(emp)).toLowerCase().includes(term) ||
        (emp.position || "").toLowerCase().includes(term)
    );
  }, [matchingEmployees, employeeSearch]);
  const includedEmployees = useMemo(
    () => matchingEmployees.filter((emp) => !excludedIds.has(emp.id) && !leaveEmployeeIds.has(emp.id)),
    [matchingEmployees, excludedIds, leaveEmployeeIds]
  );
  const totals = useMemo(() => {
    const dayCount = Math.max(selectedDates.length, 1);
    const perEmployeeHours = (Number(hours) || 0) * dayCount;
    const amount = includedEmployees.reduce((sum, emp) => {
      const rate = overrideRate ? resolveHourlyRate(hourlyRate) : resolveHourlyRate(emp.hourly_rate);
      return sum + roundOvertimePay(perEmployeeHours * rate);
    }, 0);
    return { hours: includedEmployees.length * perEmployeeHours, amount };
  }, [includedEmployees, hours, hourlyRate, overrideRate, selectedDates]);
  const weekDaysList = useMemo(() => {
    if (weekRange && Array.isArray(weekRange.days_list) && weekRange.days_list.length > 0) {
      return weekRange.days_list;
    }
    return [];
  }, [weekRange]);
  const regularWeekdays = useMemo(() => {
    return weekDaysList.filter((day) => !day.is_friday);
  }, [weekDaysList]);
  useEffect(() => {
    if (isOpen) {
      setSelectedCategory(ALL);
      setSelectedPosition(ALL);
      setHours(String(DEFAULT_BATCH_HOURS));
      setOverrideRate(false);
      setExcludedIds(new Set());
      setEmployeeSearch("");
      if (selectedDate) {
        setSelectedDates([selectedDate]);
      } else if (regularWeekdays.length > 0) {
        setSelectedDates([regularWeekdays[0].date]);
      }
    }
  }, [isOpen, selectedDate, regularWeekdays]);
  if (!isOpen) return null;
  const activeCount = includedEmployees.length;
  const leaveCount = matchingEmployees.filter((emp) => leaveEmployeeIds.has(emp.id)).length;
  const isCurrentDayOnly = selectedDates.length === 1 && selectedDates[0] === selectedDate;
  const targetIds = () => includedEmployees.map((emp) => emp.id);
  const customRate = () => (overrideRate ? resolveHourlyRate(hourlyRate) : undefined);
  const handleToggleDay = (dateStr) => {
    setSelectedDates((prev) =>
      prev.includes(dateStr) ? prev.filter((d) => d !== dateStr) : [...prev, dateStr]
    );
  };
  const handleSelectAllWeekdays = () => {
    setSelectedDates(regularWeekdays.map((d) => d.date));
  };
  const handleSelectOnlyCurrentDay = () => {
    if (selectedDate) {
      setSelectedDates([selectedDate]);
    }
  };
  const handleApplyToTableClick = () => {
    onApplyToTable?.({
      employeeIds: targetIds(),
      hours: Number(hours) || 0,
      hourlyRate: customRate(),
    });
    onClose();
  };
  const handleDirectSaveClick = () => {
    if (selectedDates.length === 0) {
      showToast.warning(t("batchModal.selectDayError"));
      return;
    }
    if (activeCount === 0) {
      showToast.warning(t("batchModal.noEmployeeMatch"));
      return;
    }
    onDirectSaveBatch?.({
      employeeIds: targetIds(),
      dates: selectedDates,
      hours: Number(hours) || 0,
      hourlyRate: customRate(),
    });
  };
  const toggleExclude = (empId) => {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(empId)) next.delete(empId);
      else next.add(empId);
      return next;
    });
  };
  const handleIncludeAll = () => setExcludedIds(new Set());
  const handleExcludeAll = () =>
    setExcludedIds(new Set(matchingEmployees.filter((e) => !leaveEmployeeIds.has(e.id)).map((e) => e.id)));
  const categoryOptions = [
    { value: ALL, label: t("filters.allCategories") },
    ...availableCategories.map((cat) => ({ value: cat, label: cat })),
  ];
  const positionOptions = [
    { value: ALL, label: t("batchModal.allPositions", { count: matchingEmployees.length }) },
    ...availablePositions.map((pos) => {
      const count = employees.filter(
        (e) =>
          (selectedCategory === ALL || getEmpCategory(e) === selectedCategory) &&
          (e.position || "").trim() === pos
      ).length;
      return { value: pos, label: t("batchModal.positionWithCount", { position: pos, count }) };
    }),
  ];
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-overlay/50 backdrop-blur-xs font-sans" dir="rtl">
      <div
        className="bg-surface rounded-modal shadow-2xl border border-line w-full max-w-4xl h-[85vh] max-h-[85vh] overflow-hidden font-sans flex flex-col animate-in fade-in zoom-in-95 duration-150"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-surface shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-card bg-notice-soft border border-notice-line text-notice-icon flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-section-title text-content-strong">{t("batchModal.title")}</h2>
              <p className="text-caption-text text-content-subtle font-medium">{t("batchModal.subtitle")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("actions.close", { ns: "common" })}
            className="w-8 h-8 rounded-btn flex items-center justify-center text-content-faint hover:text-content-muted hover:bg-surface-subtle transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden p-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:h-full">
            <div className="space-y-4 lg:min-h-0 lg:overflow-y-auto lg:pl-1">
              <section className={PANEL}>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <label className={PANEL_TITLE}>{t("batchModal.step1")}</label>
                  <span className="text-caption-text text-content-muted bg-surface border border-line px-2.5 py-0.5 rounded-badge font-mono shrink-0" dir="ltr">
                    {t("batchModal.employeeCount", { count: matchingEmployees.length })}
                  </span>
                </div>
                <div className="space-y-2.5">
                  <CustomDropdown
                    options={categoryOptions}
                    value={selectedCategory}
                    onChange={(val) => {
                      setSelectedCategory(val);
                      setSelectedPosition(ALL);
                    }}
                    usePortal
                    buttonClassName="w-full justify-between py-2 text-btn-text bg-surface rounded-input"
                  />
                  <SearchableSelect
                    options={positionOptions}
                    value={selectedPosition}
                    onChange={(val) => setSelectedPosition(val)}
                    usePortal
                  />
                </div>
              </section>
              <section className={PANEL}>
                <label className={`block mb-3 ${PANEL_TITLE}`}>{t("batchModal.step2")}</label>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                  <div className="relative w-32 shrink-0">
                    <NumberField
                      decimals
                      min={0}
                      max={MAX_HOURS_PER_DAY}
                      value={hours}
                      onChange={setHours}
                      placeholder={t("batchModal.hoursPlaceholder")}
                      className="w-full bg-surface border border-line-strong hover:border-line-bold focus:border-accent rounded-input py-2 pr-4 pl-10 text-placeholder-text font-mono font-bold text-content-strong text-center outline-none transition-colors"
                    />
                    <span className="absolute left-3 top-2.5 text-caption-text text-content-subtle pointer-events-none">
                      {t("table.hoursUnit")}
                    </span>
                  </div>
                  <label className="inline-flex items-center gap-2 text-label-text text-content-body cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={overrideRate}
                      onChange={(e) => setOverrideRate(e.target.checked)}
                      className="w-4 h-4 rounded-badge text-accent focus:ring-0 border-line-strong cursor-pointer"
                    />
                    <span>{t("batchModal.changeRate")}</span>
                  </label>
                  {overrideRate && (
                    <div className="flex items-center gap-1.5">
                      <NumberField
                        min={0}
                        value={hourlyRate}
                        onChange={setHourlyRate}
                        className="w-20 bg-surface border border-line-strong hover:border-line-bold focus:border-accent rounded-input py-1.5 px-2 text-placeholder-text font-mono font-bold text-content-strong text-center outline-none transition-colors"
                      />
                      <span className="text-caption-text text-content-subtle font-mono font-medium" dir="ltr">AFN</span>
                    </div>
                  )}
                </div>
              </section>
              <section className={PANEL}>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <label className={PANEL_TITLE}>{t("batchModal.step3")}</label>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button type="button" onClick={handleSelectOnlyCurrentDay} className={CHIP}>
                      {t("batchModal.onlyToday")}
                    </button>
                    <button type="button" onClick={handleSelectAllWeekdays} className={CHIP}>
                      {t("batchModal.allWorkDays")}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {weekDaysList.map((day) => {
                    const isSelected = selectedDates.includes(day.date);
                    return (
                      <button
                        key={day.date}
                        type="button"
                        onClick={() => handleToggleDay(day.date)}
                        className={`flex items-center justify-between px-3 py-2 rounded-btn text-btn-text font-medium border transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-accent text-content-inverse border-accent font-bold"
                            : "bg-surface hover:bg-surface-subtle text-content border-line-strong"
                        }`}
                      >
                        <span>{day.day_name}</span>
                        <span
                          className={`text-caption-text font-mono ${
                            isSelected ? "text-accent-line" : "text-content-subtle"
                          }`}
                          dir="ltr"
                        >
                          {day.shamsi_day}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>
            <section className="flex flex-col min-h-0 lg:h-full rounded-card border border-line bg-surface overflow-hidden">
              <div className="px-4 py-3 border-b border-line bg-surface-muted/60 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <label className={`${PANEL_TITLE} flex items-center gap-2`}>
                  <span>{t("batchModal.step4")}</span>
                  {leaveCount > 0 && (
                    <span className="bg-notice-soft text-notice-text border border-notice-line text-caption-text px-2 py-0.5 rounded-badge font-medium">
                      {t("batchModal.onLeaveCount", { count: leaveCount })}
                    </span>
                  )}
                </label>
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={handleIncludeAll} className={CHIP}>
                    {t("batchModal.allPresent")}
                  </button>
                  <button type="button" onClick={handleExcludeAll} className={CHIP}>
                    {t("batchModal.allExcluded")}
                  </button>
                </div>
              </div>
              <div className="px-3 py-2.5 border-b border-line-soft shrink-0">
                <div className="relative">
                  <input
                    type="text"
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    placeholder={t("filters.searchPlaceholder")}
                    className="w-full bg-surface border border-line rounded-input py-1.5 pr-8 pl-8 text-placeholder-text text-content outline-none focus:border-line-bold transition-colors"
                  />
                  <Search size={15} className="text-content-faint absolute right-2.5 top-2 pointer-events-none" />
                  {employeeSearch && (
                    <button
                      type="button"
                      onClick={() => setEmployeeSearch("")}
                      className="absolute left-2.5 top-2 text-content-faint hover:text-content-muted bg-surface-subtle hover:bg-surface-strong rounded-btn p-0.5 transition-colors cursor-pointer"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex-1 min-h-[240px] overflow-y-auto divide-y divide-line-soft">
                {visibleEmployees.length === 0 ? (
                  <p className="text-center text-body-text text-content-subtle py-10">
                    {t("batchModal.noEmployeeFound")}
                  </p>
                ) : (
                  visibleEmployees.map((emp) => {
                    const isOnLeave = leaveEmployeeIds.has(emp.id);
                    const isExcluded = excludedIds.has(emp.id) || isOnLeave;
                    return (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => !isOnLeave && toggleExclude(emp.id)}
                        disabled={isOnLeave}
                        className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-body-text text-right transition-colors ${
                          isOnLeave
                            ? "bg-notice-soft/40 cursor-not-allowed text-content-faint"
                            : isExcluded
                            ? "bg-surface-muted cursor-pointer text-content-subtle"
                            : "bg-surface cursor-pointer hover:bg-surface-muted text-content"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-4 h-4 rounded-badge flex items-center justify-center shrink-0 transition-colors ${
                              isOnLeave
                                ? "bg-notice-subtle text-notice border border-notice-line-strong"
                                : isExcluded
                                ? "border border-line-strong bg-surface"
                                : "bg-accent text-content-inverse"
                            }`}
                          >
                            {!isOnLeave && !isExcluded && <Check size={11} strokeWidth={3} />}
                          </div>
                          <span className="font-mono text-caption-text text-content-subtle shrink-0" dir="ltr">
                            {getEmpCode(emp)}
                          </span>
                          <span className="font-semibold text-body-text truncate">
                            {emp.full_name || emp.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {emp.position && (
                            <span className="text-content-subtle text-caption-text">{emp.position}</span>
                          )}
                          {isOnLeave && (
                            <span className="text-caption-text bg-notice-soft text-notice-text border border-notice-line px-2 py-0.5 rounded-badge font-medium">
                              {t("table.onLeaveShort")}
                            </span>
                          )}
                          {isExcluded && !isOnLeave && (
                            <span className="text-caption-text bg-surface-strong text-content-muted px-2 py-0.5 rounded-badge font-medium">
                              {t("batchModal.excluded")}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
              <div className="px-4 py-3 border-t border-line bg-surface-muted/60 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <span className="text-caption-text text-content-muted font-medium">
                  {t("batchModal.includedPersonnel", { count: activeCount })}
                </span>
                <div className="flex items-center gap-2">
                  <span className="bg-notice-soft border border-notice-line text-notice-deep font-mono font-bold text-caption-text px-3 py-1 rounded-badge" dir="ltr">
                    {totals.hours} {t("table.hoursUnit")}
                  </span>
                  <span className="bg-positive-soft border border-positive-line text-positive-deep font-mono font-bold text-caption-text px-3 py-1 rounded-badge" dir="ltr">
                    {totals.amount.toLocaleString("en-US")}{" "}
                    <span className="text-caption-text font-sans text-positive-strong">AFN</span>
                  </span>
                </div>
              </div>
            </section>
          </div>
        </div>
        <div className="px-6 py-4 bg-surface-muted border-t border-line flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 border border-line-strong text-content-body text-btn-text font-medium rounded-btn cursor-pointer hover:bg-surface-subtle transition-colors"
          >
            {t("actions.cancel", { ns: "common" })}
          </button>
          <div className="flex items-center gap-2.5">
            {isCurrentDayOnly && (
              <button
                type="button"
                onClick={handleApplyToTableClick}
                disabled={isSaving || activeCount === 0}
                className="px-4 py-2 bg-surface border border-line-strong hover:bg-surface-subtle text-content rounded-btn text-btn-text font-medium transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                <Layers size={16} />
                <span>{t("batchModal.applyToTable")}</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleDirectSaveClick}
              disabled={isSaving || activeCount === 0 || selectedDates.length === 0}
              className="px-5 py-2 bg-accent hover:bg-accent-hover text-content-inverse text-btn-text font-bold rounded-btn cursor-pointer transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-surface border-t-transparent rounded-full animate-spin ml-1" />
              ) : (
                <CheckCheck size={16} />
              )}
              <span>
                {selectedDates.length > 1
                  ? t("batchModal.saveForDays", { days: selectedDates.length, count: activeCount })
                  : t("batchModal.saveDirect", { count: activeCount })}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
