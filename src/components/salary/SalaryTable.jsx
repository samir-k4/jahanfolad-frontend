import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CalendarCheck, FileText, Search, Wallet } from "lucide-react";
import { CustomDropdown, TablePagination, TooltipButton, BranchEmptyState } from "../common";
import { JOB_CATEGORY } from "../../constants/attendanceDomain";
import useDebounce from "../../hooks/useDebounce";
const ALL = "all";
const STATUS = { ALL, PAID: "paid", UNPAID: "unpaid" };
const CATEGORY_KEYS = [
  ["hangar", JOB_CATEGORY.HANGAR],
  ["office", JOB_CATEGORY.OFFICE],
  ["kitchen", JOB_CATEGORY.KITCHEN],
  ["security", JOB_CATEGORY.SECURITY],
  ["representation", JOB_CATEGORY.REPRESENTATION],
];
const SEARCH_FIELDS = ["full_name", "father_name", "employee_ID", "position"];
const SORT_OPTIONS = [
  ["default", "default"],
  ["name-asc", "nameAsc"],
  ["name-desc", "nameDesc"],
  ["net-desc", "netDesc"],
  ["salary-desc", "salaryDesc"],
  ["paid-desc", "paidDesc"],
  ["absent-desc", "absentDesc"],
  ["code-asc", "codeAsc"],
];
const byNumber = (field) => (a, b) => (Number(b[field]) || 0) - (Number(a[field]) || 0);
const byName = (direction) => (a, b) =>
  direction * String(a.full_name || "").localeCompare(String(b.full_name || ""), "fa");
const COMPARATORS = {
  "name-asc": byName(1),
  "name-desc": byName(-1),
  "net-desc": byNumber("netSalary"),
  "salary-desc": byNumber("salary"),
  "paid-desc": byNumber("paidInMonth"),
  "absent-desc": byNumber("absentDays"),
  "code-asc": (a, b) =>
    String(a.employee_ID || "").localeCompare(String(b.employee_ID || ""), undefined, {
      numeric: true,
    }),
  default: (a, b) => (a.order || 0) - (b.order || 0),
};
const CELL = "p-3 border-l border-gray-100";
const HEAD = "p-3 border-l border-gray-200";
const ACTION_TONE = "bg-white hover:bg-gray-50 text-gray-600 border border-gray-300";
const FILTER_BUTTON =
  "px-3 py-1.5 text-label-text font-medium text-gray-700 bg-white rounded-input border border-gray-300 min-w-[150px]";
const money = (value) => Number(value || 0).toLocaleString("en-US");
export default function SalaryTable({
  payrollList = [],
  isLoading = false,
  searchTerm = "",
  onSearchChange,
  onOpenPayslip,
  onOpenAttendance,
}) {
  const navigate = useNavigate();
  const { t } = useTranslation("salary");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const emDash = t("placeholder.dash");
  const zero = t("placeholder.zero");
  const currency = t("company.currency", { ns: "common" });
  const [categoryFilter, setCategoryFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(STATUS.ALL);
  const [sortBy, setSortBy] = useState("default");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, statusFilter, sortBy, perPage]);
  const rowsWithCategory = useMemo(
    () => payrollList.map((row) => ({ row, category: row.job_category || "" })),
    [payrollList]
  );
  const counts = useMemo(() => {
    const base = { paid: 0, unpaid: 0, byCategory: {} };
    rowsWithCategory.forEach(({ row, category }) => {
      base[row.isPaidUp ? "paid" : "unpaid"] += 1;
      base.byCategory[category] = (base.byCategory[category] || 0) + 1;
    });
    return base;
  }, [rowsWithCategory]);
  const categoryOptions = useMemo(
    () =>
      [
        { value: ALL, label: t("table.allEmployees"), count: payrollList.length },
        ...CATEGORY_KEYS.map(([labelKey, value]) => ({
          value,
          label: t(`departments.${labelKey}`, { ns: "common" }),
          count: counts.byCategory[value] || 0,
        })),
      ].map(({ value, label, count }) => ({
        value,
        label: t("table.categoryOption", { label, count }),
      })),
    [counts, payrollList.length, t]
  );
  const visibleRows = useMemo(() => {
    const term = debouncedSearchTerm.toLowerCase().trim();
    const matches = rowsWithCategory.filter(({ row, category }) => {
      if (categoryFilter !== ALL && category !== categoryFilter) return false;
      if (statusFilter === STATUS.PAID && !row.isPaidUp) return false;
      if (statusFilter === STATUS.UNPAID && row.isPaidUp) return false;
      if (!term) return true;
      return SEARCH_FIELDS.some((field) => String(row[field] || "").toLowerCase().includes(term));
    });
    return matches.map(({ row }) => row).sort(COMPARATORS[sortBy] || COMPARATORS.default);
  }, [rowsWithCategory, debouncedSearchTerm, categoryFilter, statusFilter, sortBy]);
  const lastPage = Math.max(1, Math.ceil(visibleRows.length / perPage));
  const page = Math.min(currentPage, lastPage);
  const pageRows = useMemo(
    () => visibleRows.slice((page - 1) * perPage, page * perPage),
    [visibleRows, page, perPage]
  );
  const sortOptions = useMemo(
    () => SORT_OPTIONS.map(([value, key]) => ({ value, label: t(`table.sort.${key}`) })),
    [t]
  );
  const statusOptions = useMemo(
    () =>
      Object.values(STATUS).map((value) => ({
        value,
        label: t(`table.status.${value}`, {
          count: value === STATUS.ALL ? payrollList.length : counts[value],
        }),
      })),
    [counts, payrollList.length, t]
  );
  const openAttendance = useCallback(
    (row) => onOpenAttendance?.(row),
    [onOpenAttendance]
  );
  return (
    <div className="w-full bg-white rounded-table border border-gray-200 overflow-hidden shadow-2xs font-sans" dir="rtl">
      <div className="p-3.5 border-b border-gray-200 bg-white">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-lg">
            <Search size={15} className="text-gray-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={t("table.searchPlaceholder")}
              className="w-full border border-gray-300 rounded-input pr-9 pl-8 py-1.5 text-label-text text-gray-800 bg-white outline-none focus:border-slate-800"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                aria-label={t("actions.cancel", { ns: "common" })}
                className="absolute left-2.5 top-2 text-caption-text text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CustomDropdown
              value={sortBy}
              onChange={setSortBy}
              options={sortOptions}
              placeholder={t("table.sortPlaceholder")}
              buttonClassName={FILTER_BUTTON}
              width="w-56"
              align="right"
            />
            <CustomDropdown
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={categoryOptions}
              placeholder={t("table.categoryPlaceholder")}
              buttonClassName={FILTER_BUTTON}
              width="w-56"
              align="right"
            />
            <CustomDropdown
              value={statusFilter}
              onChange={setStatusFilter}
              options={statusOptions}
              placeholder={t("table.statusPlaceholder")}
              buttonClassName={FILTER_BUTTON}
              width="w-48"
              align="right"
            />
          </div>
        </div>
      </div>
      {isLoading ? (
        <div className="p-16 text-center flex flex-col items-center justify-center gap-3">
          <span className="w-8 h-8 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
          <span className="text-label-text text-gray-600">{t("table.loading")}</span>
        </div>
      ) : payrollList.length === 0 ? (
        <BranchEmptyState
          title={t("table.emptyBranchTitle")}
          description={t("table.emptyBranchDesc")}
          actionLabel={t("table.emptyBranchAction")}
        />
      ) : visibleRows.length === 0 ? (
        <div className="p-16 text-center flex flex-col items-center justify-center gap-2">
          <p className="text-body-text font-bold text-gray-800">{t("table.emptyTitle")}</p>
          <p className="text-caption-text text-gray-500">{t("table.emptyHint")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white">
          <table className="salary-payroll-table w-full border-collapse bg-white">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-700 text-table-header-text font-bold">
                <th className={`${HEAD} text-center w-12`}>{t("table.rowIndex", { ns: "common" })}</th>
                <th className={`${HEAD} text-center`}>{t("table.columns.code")}</th>
                <th className={HEAD}>{t("table.fullName", { ns: "common" })}</th>
                <th className={HEAD}>{t("table.fatherName", { ns: "common" })}</th>
                <th className={HEAD}>{t("table.columns.position")}</th>
                <th className={`${HEAD} text-center`}>{t("table.columns.baseSalary")}</th>
                <th className={`${HEAD} text-center`}>{t("table.columns.present")}</th>
                <th className={`${HEAD} text-center`}>{t("table.columns.absent")}</th>
                <th className={`${HEAD} text-center`}>{t("table.columns.absentDeduction")}</th>
                <th className={`${HEAD} text-center`}>{t("table.columns.paidInMonth")}</th>
                <th className={`${HEAD} text-center`}>{t("table.columns.payable")}</th>
                <th className={`${HEAD} text-center`}>{t("table.status", { ns: "common" })}</th>
                <th className="p-3 text-center w-36">{t("table.actions", { ns: "common" })}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white text-table-cell-text">
              {pageRows.map((row, index) => (
                <tr key={row.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className={`${CELL} text-center font-mono text-gray-500`}>
                    {(page - 1) * perPage + index + 1}
                  </td>
                  <td className={`${CELL} text-center`} dir="ltr">
                    <span className="bg-gray-100 text-gray-700 border border-gray-200 rounded-badge px-2 py-0.5 font-mono font-bold">
                      {row.employee_ID}
                    </span>
                  </td>
                  <td className={CELL}>
                    <button
                      type="button"
                      onClick={() => navigate(`/employees/${row.id}`)}
                      className="font-bold text-gray-900 hover:text-emerald-700 transition-colors cursor-pointer block truncate text-center w-full"
                    >
                      {row.full_name}
                    </button>
                  </td>
                  <td className={`${CELL} text-gray-600`}>
                    {row.father_name || <span className="text-gray-400">{emDash}</span>}
                  </td>
                  <td className={`${CELL} text-gray-600`}>
                    <span className="truncate block">
                      {row.position || t("departments.general", { ns: "common" })}
                    </span>
                  </td>
                  <td className={`${CELL} text-center font-mono font-bold text-gray-800`} dir="ltr">
                    {money(row.salary)}
                  </td>
                  <td className={`${CELL} text-center bg-emerald-50/40 p-0`}>
                    <button
                      type="button"
                      onClick={() => openAttendance(row)}
                      className="w-full p-3 font-mono font-bold text-emerald-700 hover:bg-emerald-100/60 hover:underline transition-colors cursor-pointer"
                      dir="ltr"
                    >
                      {row.presentDays}
                    </button>
                  </td>
                  <td className={`${CELL} text-center bg-rose-50/40 p-0`}>
                    <button
                      type="button"
                      onClick={() => openAttendance(row)}
                      className="w-full p-3 font-mono font-bold text-rose-600 hover:bg-rose-100/60 hover:underline transition-colors cursor-pointer"
                      dir="ltr"
                    >
                      {row.absentDays}
                    </button>
                  </td>
                  <td className={`${CELL} text-center font-mono font-bold text-rose-600`} dir="ltr">
                    {row.absentDeduction > 0 ? `-${money(row.absentDeduction)}` : zero}
                  </td>
                  <td className={`${CELL} text-center font-mono`} dir="ltr">
                    {row.paidInMonth > 0 ? (
                      <span
                        className={`font-bold px-2 py-0.5 rounded-badge border ${
                          row.isPaidUp
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-amber-50 text-amber-900 border-amber-300"
                        }`}
                      >
                        -{money(row.paidInMonth)}
                      </span>
                    ) : (
                      <span className="text-gray-400 font-medium">{zero}</span>
                    )}
                  </td>
                  <td className={`${CELL} text-center bg-emerald-50/30`} dir="ltr">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-badge border font-mono font-bold ${
                        row.isPaidUp
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-white text-emerald-900 border-emerald-300"
                      }`}
                    >
                      {money(row.remaining)}{" "}
                      <span className="font-sans font-medium text-emerald-700">{currency}</span>
                    </span>
                  </td>
                  <td className={`${CELL} text-center`}>
                    <span
                      className={`inline-flex items-center justify-center px-2.5 py-1 rounded-badge font-bold border ${
                        row.isPaidUp
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}
                    >
                      {t(row.isPaidUp ? "table.badge.paid" : "table.badge.unpaid")}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <TooltipButton
                        tooltip={t("table.tooltip.payment")}
                        onClick={() => navigate("/salaries/payment", { state: { employeeId: row.id } })}
                        colorClass={ACTION_TONE}
                        icon={<Wallet size={14} />}
                      />
                      <TooltipButton
                        tooltip={t("table.tooltip.attendance")}
                        onClick={() => openAttendance(row)}
                        colorClass={ACTION_TONE}
                        icon={<CalendarCheck size={14} />}
                      />
                      <TooltipButton
                        tooltip={t("table.tooltip.payslip")}
                        onClick={() => onOpenPayslip?.(row)}
                        colorClass={ACTION_TONE}
                        icon={<FileText size={14} />}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {visibleRows.length > 0 && (
        <TablePagination
          currentPage={page}
          lastPage={lastPage}
          totalPages={lastPage}
          total={visibleRows.length}
          totalEntries={visibleRows.length}
          perPage={perPage}
          onPageChange={setCurrentPage}
          onPerPageChange={setPerPage}
          unit={t("table.unit")}
        />
      )}
    </div>
  );
}
