import React, { useState, useMemo } from "react";
import { User, Save, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CustomDropdown, TablePagination, BranchEmptyState } from "../common";
import { getWeekDayName } from "../../utils/dateHelpers";
import useDebounce from "../../hooks/useDebounce";
import {
  ATTENDANCE_STATUS,
  JOB_CATEGORY,
  employeeCategory,
  employeePosition,
  getAttendanceRank,
  isAbsentStatus,
  isLeaveStatus,
  isPresentStatus,
  isSickStatus,
} from "../../constants/attendanceDomain";

const DEFAULT_MONTH_DAYS = 30;

export default function AttendanceTable({
  employees = [],
  attendanceMap = {},
  onToggleAttendance,
  isLoading,
  selectedBranch,
  afghanMonthInfo,
  selectedDateObject,
  onSave,
  isSaving,
  onOpenLeaveDetail,
}) {
  const { t } = useTranslation("attendance");
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("category-default");
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(25);

  const dayName = getWeekDayName(selectedDateObject, t("days", { returnObjects: true }));
  const totalMonthDays = afghanMonthInfo?.total_days || DEFAULT_MONTH_DAYS;

  const categoryCounts = useMemo(() => {
    const counts = { all: employees.length };
    employees.forEach((emp) => {
      const cat = employeeCategory(emp) || JOB_CATEGORY.HANGAR;
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [employees]);

  const categoryOptions = useMemo(() => {
    const known = [
      { value: "all", label: t("table.allPersonnel") },
      { value: JOB_CATEGORY.HANGAR, label: t("table.hangarShort") },
      { value: JOB_CATEGORY.OFFICE, label: t("table.officeShort") },
      { value: JOB_CATEGORY.REPRESENTATION, label: t("table.representationShort") },
      { value: JOB_CATEGORY.SECURITY, label: t("table.securityShort") },
      { value: JOB_CATEGORY.KITCHEN, label: t("table.kitchenShort") },
    ].map((opt) => ({ ...opt, badge: categoryCounts[opt.value] || 0 }));

    const extra = Object.keys(categoryCounts)
      .filter((key) => key !== "all" && !known.some((opt) => opt.value === key))
      .map((key) => ({ value: key, label: key, badge: categoryCounts[key] }));

    return [...known, ...extra];
  }, [categoryCounts, t]);

  const sortOptions = useMemo(
    () => [
      { value: "category-default", label: t("table.sortStandard") },
      { value: "name-asc", label: t("table.sortNameAsc") },
      { value: "name-desc", label: t("table.sortNameDesc") },
      { value: "present-desc", label: t("table.sortPresentDesc") },
      { value: "absent-desc", label: t("table.sortAbsentDesc") },
      { value: "code-asc", label: t("table.sortCodeAsc") },
    ],
    [t]
  );

  const filteredAndSortedEmployees = useMemo(() => {
    const term = debouncedSearchTerm.toLowerCase().trim();

    const filtered = employees.filter((emp) => {
      const cat = employeeCategory(emp) || JOB_CATEGORY.HANGAR;
      const pos = employeePosition(emp);
      const matchSearch =
        !term ||
        emp.full_name?.toLowerCase().includes(term) ||
        emp.name?.toLowerCase().includes(term) ||
        emp.father_name?.toLowerCase().includes(term) ||
        emp.employee_ID?.toLowerCase().includes(term) ||
        emp.employee_code?.toLowerCase().includes(term) ||
        pos.toLowerCase().includes(term) ||
        cat.toLowerCase().includes(term);
      return matchSearch && (categoryFilter === "all" || cat === categoryFilter);
    });

    const byName = (a, b) =>
      (a.full_name || a.name || "").localeCompare(b.full_name || b.name || "", "fa");

    return [...filtered].sort((a, b) => {
      if (sortBy === "name-asc") return byName(a, b);
      if (sortBy === "name-desc") return byName(b, a);
      if (sortBy === "present-desc") return (b.present_days ?? 0) - (a.present_days ?? 0);
      if (sortBy === "absent-desc") return (a.present_days ?? 0) - (b.present_days ?? 0);
      if (sortBy === "code-asc") {
        return String(a.employee_ID || a.employee_code || "").localeCompare(
          String(b.employee_ID || b.employee_code || ""),
          undefined,
          { numeric: true }
        );
      }
      const rankDiff = getAttendanceRank(a) - getAttendanceRank(b);
      return rankDiff !== 0 ? rankDiff : byName(a, b);
    });
  }, [employees, debouncedSearchTerm, categoryFilter, sortBy]);

  const totalPages = Math.ceil(filteredAndSortedEmployees.length / recordsPerPage) || 1;
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredAndSortedEmployees.slice(indexOfFirstRecord, indexOfLastRecord);

  const presentTotal = employees.filter((emp) => !isAbsentStatus(attendanceMap[emp.id])).length;
  const absentTotal = employees.filter((emp) => isAbsentStatus(attendanceMap[emp.id])).length;

  if (!selectedBranch) {
    return (
      <div className="bg-white rounded-card border border-gray-200 p-12 text-center font-sans shadow-2xs">
        <div className="w-12 h-12 bg-slate-100 text-slate-800 rounded-card flex items-center justify-center mx-auto mb-3 border border-slate-200">
          <User size={24} />
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-1">{t("table.noBranchSelected")}</h3>
        <p className="text-xs text-gray-500 max-w-sm mx-auto">{t("table.noBranchDesc")}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-table border border-gray-200 shadow-2xs overflow-hidden font-sans" dir="rtl">
      <div className="bg-gray-50/80 px-4 py-2.5 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center space-x-2 space-x-reverse text-gray-700">
          <span className="text-gray-500">{t("table.dateLabel")}</span>
          <span className="font-bold text-gray-900 bg-white border border-gray-300 px-2.5 py-0.5 rounded-badge text-xs">
            {selectedDateObject?.format ? selectedDateObject.format("YYYY/MM/DD") : ""} ({dayName})
          </span>
          {afghanMonthInfo && (
            <span className="text-gray-500 mr-1.5">
              {t("table.monthSummary", {
                month: afghanMonthInfo.month_name || afghanMonthInfo.shamsi_month_name,
                year: afghanMonthInfo.year || afghanMonthInfo.shamsi_year,
                days: totalMonthDays,
              })}
            </span>
          )}
        </div>
        <div className="text-gray-600 font-medium">
          {t("table.personnelCount")}{" "}
          <span className="font-bold text-gray-900 font-mono">{filteredAndSortedEmployees.length}</span>{" "}
          {t("table.personUnit")}
        </div>
      </div>

      <div className="p-3.5 border-b border-gray-200 bg-white">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              placeholder={t("table.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-9 bg-white border border-gray-300 hover:border-gray-400 focus:border-slate-800 rounded-input pr-9 pl-8 text-xs text-gray-900 outline-none transition-colors shadow-2xs"
            />
            <Search size={15} className="text-gray-400 absolute right-3 top-2.5" />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setCurrentPage(1);
                }}
                className="absolute left-2.5 top-2 text-xs text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full w-5 h-5 flex items-center justify-center cursor-pointer transition-colors"
              >
                ×
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <CustomDropdown
              value={categoryFilter}
              onChange={(val) => {
                setCategoryFilter(val);
                setCurrentPage(1);
              }}
              options={categoryOptions}
              placeholder={t("table.allPersonnel")}
              buttonClassName="h-9 px-3 text-xs font-medium text-gray-700 bg-white border-gray-300 hover:border-gray-400 rounded-input shadow-2xs min-w-[145px]"
              width="w-48"
              align="right"
            />
            <CustomDropdown
              value={sortBy}
              onChange={setSortBy}
              options={sortOptions}
              placeholder={t("table.sortPlaceholder")}
              buttonClassName="h-9 px-3 text-xs font-medium text-gray-700 bg-white border-gray-300 hover:border-gray-400 rounded-input shadow-2xs min-w-[170px]"
              width="w-56"
              align="right"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="p-16 text-center text-gray-500 font-medium flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-gray-600">{t("table.loading")}</span>
        </div>
      ) : employees.length === 0 ? (
        <BranchEmptyState
          title={t("table.emptyBranchTitle")}
          description={t("table.emptyBranchDesc")}
          actionLabel={t("table.emptyBranchAction")}
        />
      ) : filteredAndSortedEmployees.length === 0 ? (
        <div className="p-16 text-center text-gray-500 font-medium flex flex-col items-center justify-center space-y-2">
          <div className="w-12 h-12 rounded-card bg-gray-100 flex items-center justify-center text-gray-400 mb-1 border border-gray-200">
            <User size={24} />
          </div>
          <p className="text-sm text-gray-800 font-bold">{t("table.emptyTitle")}</p>
          <p className="text-xs text-gray-500 font-normal">{t("table.emptyDesc")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white">
          <table className="w-full text-right border-collapse bg-white text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-700 text-xs font-bold">
                <th className="py-2.5 px-3 w-12 text-center border-l border-gray-200 rounded-none">{t("table.rowIndex", { ns: "common" })}</th>
                <th className="py-2.5 px-3 w-28 text-center border-l border-gray-200 rounded-none">{t("table.employeeCode", { ns: "common" })}</th>
                <th className="py-2.5 px-3 border-l border-gray-200 rounded-none">{t("table.colName")}</th>
                <th className="py-2.5 px-3 w-28 border-l border-gray-200 rounded-none">{t("table.fatherName", { ns: "common" })}</th>
                <th className="py-2.5 px-3 border-l border-gray-200 rounded-none">{t("table.colPosition")}</th>
                <th className="py-2.5 px-3 text-center w-40 border-l border-gray-200 rounded-none">{t("table.colStatus")}</th>
                <th className="py-2.5 px-3 text-center border-l border-gray-200 rounded-none">{t("table.colPresentDays")}</th>
                <th className="py-2.5 px-3 text-center w-28 rounded-none">{t("table.colMonthDays")}</th>
                <th className="py-2.5 px-3 text-center rounded-none">{t("table.createdBy", { ns: "common" })}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs bg-white">
              {currentRecords.map((emp, index) => {
                const status = attendanceMap[emp.id] !== undefined ? attendanceMap[emp.id] : emp.today_status;
                const present = isPresentStatus(status);
                return (
                  <tr key={emp.id} className="hover:bg-gray-50/70 transition-colors border-b border-gray-100">
                    <td className="py-2.5 px-3 font-mono font-bold text-gray-500 text-center border-l border-gray-100 text-xs rounded-none">
                      {indexOfFirstRecord + index + 1}
                    </td>
                    <td className="py-2.5 px-3 text-center border-l border-gray-100 rounded-none" dir="ltr">
                      <span className="font-mono text-xs text-gray-700 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-badge inline-block">
                        {emp.employee_ID || emp.employee_code}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-gray-900 border-l border-gray-100 text-xs rounded-none">
                      {emp.full_name || emp.name}
                    </td>
                    <td className="py-2.5 px-3 text-gray-700 font-medium border-l border-gray-100 text-xs rounded-none">
                      {emp.father_name || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="py-2.5 px-3 text-gray-700 border-l border-gray-100 text-xs rounded-none">
                      <span className="inline-block px-2 py-0.5 rounded-badge bg-gray-100 text-gray-700 font-medium border border-gray-200 text-xs">
                        {employeePosition(emp) || t("table.defaultPosition")}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center border-l border-gray-100 rounded-none">
                      {isLeaveStatus(status) ? (
                        <button
                          type="button"
                          onClick={() => onOpenLeaveDetail?.(emp)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-badge bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-bold cursor-pointer transition-colors"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                          <span>{t("statusLabel.leave")}</span>
                        </button>
                      ) : isSickStatus(status) ? (
                        <button
                          type="button"
                          onClick={() => onOpenLeaveDetail?.(emp)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-badge bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold cursor-pointer transition-colors"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-600 shrink-0" />
                          <span>{t("statusLabel.sick")}</span>
                        </button>
                      ) : (
                        <label className="inline-flex items-center justify-center gap-1.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={present}
                            onChange={(e) =>
                              onToggleAttendance(
                                emp.id,
                                e.target.checked ? ATTENDANCE_STATUS.PRESENT : ATTENDANCE_STATUS.ABSENT
                              )
                            }
                            className="w-4 h-4 rounded border-gray-300 text-slate-800 focus:ring-0 cursor-pointer accent-slate-800"
                          />
                          <span
                            className={`text-xs font-bold px-2.5 py-0.5 rounded-badge transition-colors border ${
                              present
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-rose-50 text-rose-800 border-rose-200"
                            }`}
                          >
                            {present ? t("statusLabel.present") : t("statusLabel.absent")}
                          </span>
                        </label>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-800 text-xs border-l border-gray-100 rounded-none" dir="ltr">
                      {emp.present_days ?? 0}{" "}
                      <span className="text-[11px] text-gray-500 font-normal font-sans">{t("table.daysUnit")}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-gray-700 text-xs rounded-none" dir="ltr">
                      {totalMonthDays}{" "}
                      <span className="text-[11px] text-gray-500 font-normal font-sans">{t("table.daysUnit")}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center text-gray-700 text-xs rounded-none whitespace-nowrap">
                      {emp.created_by || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && filteredAndSortedEmployees.length > recordsPerPage && (
        <TablePagination
          currentPage={currentPage}
          lastPage={totalPages}
          total={filteredAndSortedEmployees.length}
          perPage={recordsPerPage}
          onPageChange={setCurrentPage}
          onPerPageChange={(size) => {
            setRecordsPerPage(size);
            setCurrentPage(1);
          }}
          unit={t("table.personUnit")}
          className="border-t border-gray-200"
        />
      )}

      {employees.length > 0 && (
        <div className="p-3.5 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="text-xs text-gray-600 font-medium flex items-center gap-2">
            <span>{t("table.presentCountLabel")}</span>
            <span className="font-bold text-emerald-800 font-mono text-xs px-2 py-0.5 bg-emerald-100/70 border border-emerald-200 rounded-badge">
              {presentTotal} {t("table.personUnit")}
            </span>
            <span className="text-gray-300">|</span>
            <span>{t("table.absentCountLabel")}</span>
            <span className="font-bold text-rose-800 font-mono text-xs px-2 py-0.5 bg-rose-100/70 border border-rose-200 rounded-badge">
              {absentTotal} {t("table.personUnit")}
            </span>
          </div>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving || isLoading}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2 rounded-btn font-bold text-xs transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <Save size={14} />
            <span>{isSaving ? t("table.savingButton") : t("table.saveButton")}</span>
          </button>
        </div>
      )}
    </div>
  );
}
