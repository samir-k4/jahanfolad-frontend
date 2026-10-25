import { useState, useMemo, useCallback } from "react";
import { User, Save, Pencil, Calendar, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CustomDropdown, BranchEmptyState, NumberField } from "../common";
import useDebounce from "../../hooks/useDebounce";
import {
  DEFAULT_HOURLY_RATE,
  MAX_HOURS_PER_DAY,
  resolveHourlyRate,
  resolvePositionRank,
  roundOvertimePay,
} from "../../constants/overtimeDomain";
const ALL_POSITIONS = "all";
export default function OvertimeTable({
  employees = [],
  overtimeMap = {},
  hourlyRates = {},
  onHoursChange,
  onHourlyRateChange,
  isLoading,
  selectedBranch,
  weekRange,
  onSelectDate,
  onSave,
  isSaving,
  leaveEmployeeIds = new Set(),
  onOpenBlankSheet,
}) {
  const { t } = useTranslation("overtime");
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 1000);
  const [sortBy, setSortBy] = useState("position-default");
  const [positionFilter, setPositionFilter] = useState(ALL_POSITIONS);
  const positionNameOf = useCallback(
    (emp) => (emp.position || "").trim() || t("table.defaultPosition"),
    [t]
  );
  const positionOptions = useMemo(() => {
    const groups = new Map();
    employees.forEach((emp) => {
      const name = positionNameOf(emp);
      const rank = resolvePositionRank(emp.position_rank);
      const found = groups.get(name);
      if (found) {
        found.count += 1;
        found.rank = Math.min(found.rank, rank);
      } else {
        groups.set(name, { name, count: 1, rank });
      }
    });
    return [...groups.values()].sort(
      (a, b) => a.rank - b.rank || a.name.localeCompare(b.name, "fa")
    );
  }, [employees, positionNameOf]);
  const activePosition = positionOptions.some((pos) => pos.name === positionFilter)
    ? positionFilter
    : ALL_POSITIONS;
  const liveWeeklyFor = useCallback(
    (emp) => {
      const rate = resolveHourlyRate(
        hourlyRates[emp.id] !== undefined && hourlyRates[emp.id] !== ""
          ? hourlyRates[emp.id]
          : emp.hourly_rate
      );
      const savedHours = Number(emp.total_weekly_hours) || 0;
      const savedAmount = Number(emp.weekly_amount) || 0;
      if (emp.today_in_week === false) {
        return { rate, hours: savedHours, pay: roundOvertimePay(savedAmount) };
      }
      const typedHours = leaveEmployeeIds.has(emp.id)
        ? 0
        : Number(overtimeMap[emp.id] !== undefined ? overtimeMap[emp.id] : emp.today_hours) || 0;
      const hours = savedHours - (Number(emp.today_hours) || 0) + typedHours;
      const amount = savedAmount - (Number(emp.today_amount) || 0) + typedHours * rate;
      return { rate, hours: Math.round(hours * 100) / 100, pay: roundOvertimePay(amount) };
    },
    [hourlyRates, overtimeMap, leaveEmployeeIds]
  );
  const todayDateStr = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);
  const filteredAndSortedEmployees = useMemo(() => {
    const term = (debouncedSearchTerm || "").toLowerCase().trim();
    const filtered = employees.filter((emp) => {
      if (activePosition !== ALL_POSITIONS && positionNameOf(emp) !== activePosition) {
        return false;
      }
      if (!term) return true;
      return (
        emp.full_name?.toLowerCase().includes(term) ||
        emp.name?.toLowerCase().includes(term) ||
        emp.father_name?.toLowerCase().includes(term) ||
        emp.employee_ID?.toLowerCase().includes(term) ||
        emp.employee_code?.toLowerCase().includes(term) ||
        emp.position?.toLowerCase().includes(term)
      );
    });
    return [...filtered].sort((a, b) => {
      if (sortBy === "position-default") {
        const posA = (a.position || "").trim();
        const posB = (b.position || "").trim();
        if (posA !== posB) {
          const rankA = resolvePositionRank(a.position_rank);
          const rankB = resolvePositionRank(b.position_rank);
          if (rankA !== rankB) {
            return rankA - rankB;
          }
          return posA.localeCompare(posB, "fa");
        }
        const codeA = a.employee_ID || a.employee_code || "";
        const codeB = b.employee_ID || b.employee_code || "";
        if (codeA && codeB) {
          return codeA.localeCompare(codeB, "en", { numeric: true });
        }
        return (a.id || 0) - (b.id || 0);
      }
      if (sortBy === "name-asc") {
        return (a.full_name || a.name || "").localeCompare(b.full_name || b.name || "", "fa");
      }
      if (sortBy === "name-desc") {
        return (b.full_name || b.name || "").localeCompare(a.full_name || a.name || "", "fa");
      }
      if (sortBy === "hours-desc") {
        return (Number(b.total_weekly_hours) || 0) - (Number(a.total_weekly_hours) || 0);
      }
      if (sortBy === "pay-desc") {
        return liveWeeklyFor(b).pay - liveWeeklyFor(a).pay;
      }
      if (sortBy === "code-asc") {
        const codeA = a.employee_ID || a.employee_code || "";
        const codeB = b.employee_ID || b.employee_code || "";
        return codeA.localeCompare(codeB, "en", { numeric: true });
      }
      return 0;
    });
  }, [employees, debouncedSearchTerm, sortBy, liveWeeklyFor, activePosition, positionNameOf]);
  const totalWeeklyHours = filteredAndSortedEmployees.reduce(
    (sum, emp) => sum + liveWeeklyFor(emp).hours,
    0
  );
  const totalWeeklyPay = filteredAndSortedEmployees.reduce(
    (sum, emp) => sum + liveWeeklyFor(emp).pay,
    0
  );
  if (!selectedBranch) {
    return (
      <div className="bg-surface rounded-card border border-line p-12 text-center" dir="rtl">
        <div className="w-12 h-12 rounded-full border border-line bg-surface-muted text-content-faint flex items-center justify-center mx-auto mb-3">
          <User size={20} />
        </div>
        <h3 className="text-section-title text-content-body mb-1">
          {t("table.noBranchSelected")}
        </h3>
        <p className="text-body-text text-content-faint max-w-sm mx-auto">
          {t("table.noBranchDesc")}
        </p>
      </div>
    );
  }
  if (!isLoading && employees.length === 0) {
    return (
      <div className="bg-surface rounded-card border border-line font-sans">
        <BranchEmptyState
          title={t("table.emptyBranchTitle")}
          description={t("table.emptyBranchDesc")}
          actionLabel={t("table.emptyBranchAction")}
        />
      </div>
    );
  }
  return (
    <div className="bg-surface rounded-table border border-line overflow-hidden font-sans" dir="rtl">
      {weekRange && (
        <div className="bg-surface-muted px-4 py-3 border-b border-line space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-body-text">
            <div className="flex items-center gap-1.5 text-content-muted">
              <span>{t("table.weekRangeLabel")}</span>
              <span className="font-bold text-content">
                {weekRange.week_label ||
                  t("table.weekFallback", { start: weekRange.start_shamsi, end: weekRange.end_shamsi })}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-content-muted">
              <span>{t("table.selectedDayLabel")}</span>
              <span className="font-bold text-content bg-surface border border-line px-3 py-0.5 rounded-badge flex items-center gap-1.5">
                <Calendar size={14} className="text-content-subtle" />
                <span>{weekRange.selected_label || weekRange.selected_date}</span>
              </span>
            </div>
          </div>
          {Array.isArray(weekRange.days_list) && weekRange.days_list.length > 0 && (
            <div className="pt-2 border-t border-line flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
              <span className="text-label-text text-content-subtle whitespace-nowrap ml-1 font-medium">{t("table.daysLabel")}</span>
              <div className="flex items-center gap-1.5">
                {weekRange.days_list.map((day) => {
                  const isSelected = day.date === weekRange.selected_date;
                  const isToday = day.date === todayDateStr;
                  return (
                    <button
                      key={day.date}
                      type="button"
                      onClick={() => onSelectDate?.(day.date)}
                      className={`px-3 py-1.5 rounded-btn text-btn-text font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-accent text-content-inverse font-bold"
                          : "bg-surface hover:bg-surface-muted text-content-body border border-line-strong"
                      }`}
                    >
                      <span>{day.day_name}</span>
                      <span className={`font-mono text-caption-text ${isSelected ? "text-accent-line" : "text-content-subtle"}`} dir="ltr">
                        ({day.shamsi_day})
                      </span>
                      {isToday && (
                        <span
                          className={`text-caption-text px-1.5 py-0.2 rounded-badge font-normal ${
                            isSelected
                              ? "bg-accent-strong text-content-inverse"
                              : "bg-surface-strong text-content-body"
                          }`}
                        >
                          {t("datePreset.today", { ns: "common" })}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
      <div className="p-3 border-b border-line bg-surface flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder={t("filters.searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-surface border border-line rounded-input py-1.5 pr-8 pl-8 text-placeholder-text text-content outline-none focus:border-line-bold transition-colors"
          />
          <Search size={15} className="text-content-faint absolute right-2.5 top-2.5 pointer-events-none" />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute left-2.5 top-2.5 text-content-faint hover:text-content-muted bg-surface-subtle hover:bg-surface-strong rounded-btn p-0.5 transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex items-center flex-wrap gap-2">
          <CustomDropdown
            value={activePosition}
            onChange={(val) => setPositionFilter(val)}
            options={[
              {
                value: ALL_POSITIONS,
                label: t("filters.positionOption", {
                  position: t("filters.allPositions"),
                  count: employees.length,
                }),
              },
              ...positionOptions.map((pos) => ({
                value: pos.name,
                label: t("filters.positionOption", { position: pos.name, count: pos.count }),
              })),
            ]}
            placeholder={t("columns.position")}
            buttonClassName="px-3 py-1.5 text-btn-text font-medium text-content-body bg-surface min-w-[170px] rounded-input"
            width="w-56"
            align="right"
          />
          <CustomDropdown
            value={sortBy}
            onChange={(val) => setSortBy(val)}
            options={[
              { value: "position-default", label: t("filters.sortByPosition") },
              { value: "name-asc", label: t("filters.sortNameAsc") },
              { value: "name-desc", label: t("filters.sortNameDesc") },
              { value: "hours-desc", label: t("filters.sortMostHours") },
              { value: "pay-desc", label: t("filters.sortMostPay") },
              { value: "code-asc", label: t("table.employeeCode", { ns: "common" }) },
            ]}
            placeholder={t("filters.sortPlaceholder")}
            buttonClassName="px-3 py-1.5 text-btn-text font-medium text-content-body bg-surface min-w-[170px] rounded-input"
            width="w-56"
            align="right"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-right border-collapse bg-surface">
          <thead>
            <tr className="bg-surface-muted border-b border-line text-content-body font-bold text-table-header-text">
              <th className="px-4 py-3 text-center w-12 border-l border-line rounded-none">#</th>
              <th className="px-4 py-3 text-center border-l border-line rounded-none">{t("table.employeeCode", { ns: "common" })}</th>
              <th className="px-4 py-3 border-l border-line rounded-none">{t("columns.fullName")}</th>
              <th className="px-4 py-3 border-l border-line rounded-none">{t("table.fatherName", { ns: "common" })}</th>
              <th className="px-4 py-3 border-l border-line rounded-none">{t("columns.position")}</th>
              <th className="px-4 py-3 text-center border-l border-line rounded-none">{t("table.colOvertimeHours")}</th>
              <th className="px-4 py-3 text-center w-32 border-l border-line rounded-none">{t("columns.hourlyRate")}</th>
              <th className="px-4 py-3 text-center border-l border-line rounded-none">{t("table.colWeeklyHours")}</th>
              <th className="px-4 py-3 text-center rounded-none">{t("table.colWeeklyPayable")}</th>
              <th className="px-4 py-3 text-center rounded-none">{t("table.createdBy", { ns: "common" })}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft bg-surface text-table-cell-text text-content">
            {isLoading ? (
              <tr>
                <td colSpan="10" className="p-12 text-center text-content-subtle rounded-none">
                  <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <span className="text-table-cell-text text-content-muted">{t("table.loading")}</span>
                </td>
              </tr>
            ) : filteredAndSortedEmployees.length === 0 ? (
              <tr>
                <td colSpan="10" className="p-10 text-center text-content-subtle rounded-none text-table-cell-text">
                  {t("table.emptySearch")}
                </td>
              </tr>
            ) : (
              filteredAndSortedEmployees.map((emp, index) => {
                const currentTodayHours =
                  overtimeMap[emp.id] !== undefined
                    ? overtimeMap[emp.id]
                    : emp.today_hours ?? "";
                const currentRate =
                  hourlyRates[emp.id] !== undefined
                    ? hourlyRates[emp.id]
                    : emp.hourly_rate ?? DEFAULT_HOURLY_RATE;
                const { hours: weeklyHours, pay: calculatedWeeklyPay } = liveWeeklyFor(emp);
                const isOnLeave = leaveEmployeeIds.has(emp.id);
                return (
                  <tr
                    key={emp.id}
                    className="hover:bg-surface-muted/60 transition-colors border-b border-line-soft text-table-cell-text"
                  >
                    <td className="px-4 py-3 text-center font-mono text-content-subtle border-l border-line-soft rounded-none" dir="ltr">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 text-center border-l border-line-soft rounded-none" dir="ltr">
                      <span className="font-mono text-table-cell-text text-content-body px-2 py-0.5 rounded-badge inline-block bg-surface-subtle border border-line">
                        {emp.employee_ID || emp.employee_code}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-content-strong border-l border-line-soft rounded-none">
                      <div className="flex items-center gap-2">
                        <span>{emp.full_name || emp.name}</span>
                        {isOnLeave && (
                          <span className="text-caption-text px-2 py-0.5 rounded-badge text-notice-text bg-notice-soft border border-notice-line font-medium">
                            {t("table.onLeaveShort")}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-content-body border-l border-line-soft rounded-none">
                      {emp.father_name || "—"}
                    </td>
                    <td className="px-4 py-3 text-content-body border-l border-line-soft rounded-none">
                      <span className="text-caption-text px-2 py-0.5 rounded-badge text-content-muted bg-surface-subtle border border-line inline-block font-medium">
                        {positionNameOf(emp)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center border-l border-line-soft rounded-none">
                      <div className="inline-flex items-center justify-center gap-1.5">
                        {isOnLeave ? (
                          <span
                            className="text-table-cell-text font-mono text-content-faint italic"
                            dir="ltr"
                          >
                            {t("table.zeroOnLeave")}
                          </span>
                        ) : (
                          <>
                            <NumberField
                              decimals
                              min={0}
                              max={MAX_HOURS_PER_DAY}
                              value={currentTodayHours}
                              placeholder="0"
                              onChange={(next) => onHoursChange(emp.id, next)}
                              className="w-14 bg-surface border border-line-strong hover:border-line-bold focus:border-accent rounded-input py-1 px-1.5 text-center text-table-cell-text font-mono font-bold text-content-strong outline-none transition-colors"
                            />
                            <span className="text-caption-text text-content-subtle">{t("table.hoursUnit")}</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center border-l border-line-soft rounded-none">
                      <div className="inline-flex items-center justify-center gap-1.5">
                        <div className="relative flex items-center">
                          <NumberField
                            min={0}
                            value={currentRate}
                            placeholder={String(DEFAULT_HOURLY_RATE)}
                            onChange={(next) => onHourlyRateChange(emp.id, next)}
                            onBlur={(e) => {
                              if (e.target.value === "") {
                                onHourlyRateChange(emp.id, emp.hourly_rate || DEFAULT_HOURLY_RATE);
                              }
                            }}
                            className="w-16 bg-surface border border-line-strong hover:border-line-bold focus:border-accent rounded-input py-1 pr-4 pl-1.5 text-center text-table-cell-text font-mono font-bold text-content-strong outline-none transition-colors"
                          />
                          <Pencil
                            size={11}
                            className="text-content-faint absolute right-1 pointer-events-none"
                          />
                        </div>
                        <span className="text-caption-text text-content-subtle font-mono" dir="ltr">AFN</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-notice-deep bg-notice-soft/40 text-table-cell-text border-l border-line-soft rounded-none" dir="ltr">
                      {weeklyHours}{" "}
                      <span className="text-caption-text text-notice/80 font-normal font-sans">{t("table.hoursUnit")}</span>
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-positive-text bg-positive-soft/40 text-table-cell-text rounded-none" dir="ltr">
                      {Number(calculatedWeeklyPay).toLocaleString("en-US")}{" "}
                      <span className="text-caption-text text-positive font-normal font-sans">AFN</span>
                    </td>
                    <td className="px-4 py-3 text-center text-content-body whitespace-nowrap">
                      {emp.created_by || "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {employees.length > 0 && (
        <div className="px-4 py-3.5 bg-surface border-t border-line flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex flex-wrap items-center gap-2.5 text-body-text">
            <span className="text-label-text text-content-subtle font-medium ml-1">{t("table.totalLabel")}</span>
            <div className="bg-notice-soft border border-notice-line px-3.5 py-1 rounded-card text-notice-deep text-body-text font-medium">
              {t("table.weeklyOvertime")}{" "}
              <span className="font-bold font-mono text-notice-deepest" dir="ltr">{totalWeeklyHours}</span> {t("table.hoursUnit")}
            </div>
            <div className="bg-positive-soft border border-positive-line px-3.5 py-1 rounded-card text-positive-deep text-body-text font-medium">
              {t("table.weeklyPayable")}{" "}
              <span className="font-bold font-mono text-positive-deepest" dir="ltr">{totalWeeklyPay.toLocaleString("en-US")}</span> AFN
            </div>
          </div>
          <button
            onClick={onSave}
            disabled={isSaving || isLoading}
            className="px-6 py-2.5 bg-accent hover:bg-accent-hover text-content-inverse rounded-btn font-bold text-btn-text transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-2"
          >
            <Save size={16} />
            <span>
              {isSaving
                ? t("actions.saving", { ns: "common" })
                : t("table.saveForDate", {
                    day: weekRange?.selected_day_name || t("week.thisDate"),
                  })}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
