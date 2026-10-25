import React, { useState, useMemo, useCallback } from "react";
import { Search, User, Edit2, Trash2, Eye } from "lucide-react";
import { TooltipButton, CustomDropdown, SearchableSelect, TablePagination, usePagePerms, BranchEmptyState } from "../common";
import useEmployees from "../../hooks/useEmployees";
import { EMPLOYEE_STATUS, isActiveStatus } from "../../constants/employeeDomain";
import { useTranslation } from "react-i18next";
import useDebounce from "../../hooks/useDebounce";

const getEmployeePosition = (emp) => String(emp.job_position?.name || emp.position || "").trim();
const getEmployeeCategory = (emp) => String(emp.job_category?.name || emp.job_category || "").trim();

export default function EmployeeTable({
  employees = [],
  isLoading,
  searchTerm,
  onSearchChange,
  positionFilter,
  onPositionFilterChange,
  statusFilter,
  onStatusFilterChange,
  onViewProfile,
  onEditEmployee,
  onToggleStatus,
  onDeleteEmployee,
}) {
  const { t } = useTranslation("employee");
  const { canEdit, canDelete } = usePagePerms("employees");
  const { categories: dbCategories, positions: dbPositions } = useEmployees();
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [currentPage, setCurrentPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("category-default");
  const [recordsPerPage, setRecordsPerPage] = useState(20);

  const categoryOrderMap = useMemo(() => {
    const map = new Map();
    dbCategories.forEach((cat, idx) => {
      if (cat?.name) map.set(cat.name.trim(), idx + 1);
    });
    return map;
  }, [dbCategories]);

  const positionOrderMap = useMemo(() => {
    const map = new Map();
    dbPositions.forEach((pos, idx) => {
      if (pos?.name) map.set(pos.name.trim(), idx + 1);
    });
    return map;
  }, [dbPositions]);

  const categoryCounts = useMemo(() => {
    const counts = { all: employees.length };
    employees.forEach((emp) => {
      const cat = getEmployeeCategory(emp);
      if (cat) counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [employees]);

  const categoryOptions = useMemo(() => {
    const seen = new Set();
    const options = [{ value: "all", label: t("list.filterAllPersonnel"), badge: employees.length }];
    dbCategories.forEach((cat) => {
      const name = cat?.name?.trim();
      if (name && !seen.has(name)) {
        seen.add(name);
        options.push({ value: name, label: name, badge: categoryCounts[name] || 0 });
      }
    });
    Object.keys(categoryCounts).forEach((catName) => {
      if (catName !== "all" && !seen.has(catName)) {
        seen.add(catName);
        options.push({ value: catName, label: catName, badge: categoryCounts[catName] || 0 });
      }
    });
    return options;
  }, [dbCategories, categoryCounts, employees.length]);

  const positionOptions = useMemo(() => {
    const set = new Set();
    const list = [{ value: "all", label: t("list.filterAllPositions") }];
    dbPositions.forEach((pos) => {
      const name = pos?.name?.trim();
      if (name && !set.has(name)) {
        set.add(name);
        list.push({ value: name, label: name });
      }
    });
    employees.forEach((e) => {
      const pos = getEmployeePosition(e);
      if (pos && !set.has(pos)) {
        set.add(pos);
        list.push({ value: pos, label: pos });
      }
    });
    return list;
  }, [dbPositions, employees]);

  const matchesSearch = useCallback((emp, term) => {
    if (!term) return true;
    const lowerTerm = term.toLowerCase();
    return (
      emp.full_name?.toLowerCase().includes(lowerTerm) ||
      emp.father_name?.toLowerCase().includes(lowerTerm) ||
      emp.employee_ID?.toLowerCase().includes(lowerTerm) ||
      emp.phone?.toLowerCase().includes(lowerTerm) ||
      getEmployeePosition(emp).toLowerCase().includes(lowerTerm) ||
      getEmployeeCategory(emp).toLowerCase().includes(lowerTerm)
    );
  }, []);

  const sortEmployees = useCallback((list, sortKey) => {
    return list.sort((a, b) => {
      const catA = getEmployeeCategory(a);
      const catB = getEmployeeCategory(b);
      const posA = getEmployeePosition(a);
      const posB = getEmployeePosition(b);

      if (sortKey === "category-default") {
        const catOrdA = categoryOrderMap.get(catA) ?? 999;
        const catOrdB = categoryOrderMap.get(catB) ?? 999;
        if (catOrdA !== catOrdB) return catOrdA - catOrdB;
        const posOrdA = positionOrderMap.get(posA) ?? 999;
        const posOrdB = positionOrderMap.get(posB) ?? 999;
        if (posOrdA !== posOrdB) return posOrdA - posOrdB;
        return (a.full_name || "").localeCompare(b.full_name || "", "fa");
      }
      if (sortKey === "name-asc") return (a.full_name || "").localeCompare(b.full_name || "", "fa");
      if (sortKey === "name-desc") return (b.full_name || "").localeCompare(a.full_name || "", "fa");
      if (sortKey === "salary-desc") return (Number(b.salary) || 0) - (Number(a.salary) || 0);
      if (sortKey === "salary-asc") return (Number(a.salary) || 0) - (Number(b.salary) || 0);
      if (sortKey === "code-asc") return String(a.employee_ID || "").localeCompare(String(b.employee_ID || ""), undefined, { numeric: true });
      return 0;
    });
  }, [categoryOrderMap, positionOrderMap]);

  const filteredEmployees = useMemo(() => {
    const term = (debouncedSearchTerm || "").trim();
    const result = employees.filter((emp) => {
      const cat = getEmployeeCategory(emp);
      const pos = getEmployeePosition(emp);
      return (
        matchesSearch(emp, term) &&
        (categoryFilter === "all" || cat === categoryFilter) &&
        (positionFilter === "all" || pos === positionFilter) &&
        (statusFilter === "all" || emp.status === statusFilter)
      );
    });
    return sortEmployees([...result], sortBy);
  }, [employees, debouncedSearchTerm, categoryFilter, positionFilter, statusFilter, sortBy, matchesSearch, sortEmployees]);

  const totalPages = Math.ceil(filteredEmployees.length / recordsPerPage) || 1;
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredEmployees.slice(indexOfFirstRecord, indexOfLastRecord);

  return (
    <div className="bg-white rounded-table border border-gray-200 overflow-hidden font-sans shadow-2xs" dir="rtl">
      <div className="p-3.5 border-b border-gray-200 bg-white">
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <input
              type="text"
              placeholder={t("list.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => {
                onSearchChange(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white border border-gray-300 hover:border-gray-400 focus:border-slate-800 rounded-input h-9 pr-9 pl-8 text-xs text-gray-800 outline-none transition-colors shadow-2xs"
            />
            <Search size={15} className="text-gray-400 absolute right-3 top-2.5" />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  onSearchChange("");
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
              placeholder={t("list.filterAllPersonnel")}
              buttonClassName="h-9 px-3 text-xs font-medium text-gray-700 bg-white border-gray-300 hover:border-gray-400 rounded-input shadow-2xs min-w-[145px]"
              width="w-48"
              align="right"
            />

            <SearchableSelect
              value={positionFilter}
              onChange={(val) => {
                onPositionFilterChange(val);
                setCurrentPage(1);
              }}
              options={positionOptions}
              placeholder={t("list.filterAllPositions")}
              searchPlaceholder={t("form.searchJobPosition")}
              className="w-44 sm:w-48"
              buttonClassName="h-9 px-3 text-xs font-medium text-gray-700 bg-white border-gray-300 hover:border-gray-400 rounded-input shadow-2xs"
            />

            <CustomDropdown
              value={statusFilter}
              onChange={(val) => {
                onStatusFilterChange(val);
                setCurrentPage(1);
              }}
              options={[
                { value: "all", label: t("list.filterAllStatus") },
                { value: EMPLOYEE_STATUS.ACTIVE, label: t("status.active", { ns: "common" }) },
                { value: EMPLOYEE_STATUS.INACTIVE, label: t("status.inactive", { ns: "common" }) },
              ]}
              placeholder={t("list.filterAllStatus")}
              buttonClassName="h-9 px-3 text-xs font-medium text-gray-700 bg-white border-gray-300 hover:border-gray-400 rounded-input shadow-2xs min-w-[120px]"
              width="w-36"
              align="right"
            />

            <CustomDropdown
              value={sortBy}
              onChange={(val) => setSortBy(val)}
              options={[
                { value: "category-default", label: t("list.sortDefault") },
                { value: "name-asc", label: t("list.sortNameAsc") },
                { value: "name-desc", label: t("list.sortNameDesc") },
                { value: "salary-desc", label: t("list.sortSalaryDesc") },
                { value: "salary-asc", label: t("list.sortSalaryAsc") },
                { value: "code-asc", label: t("list.sortCodeAsc") },
              ]}
              placeholder={t("list.sortPlaceholder")}
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
          <span className="text-base text-gray-600">{t("list.loadingTable")}</span>
        </div>
      ) : employees.length === 0 ? (
        <BranchEmptyState
          title={t("list.emptyBranchTitle")}
          description={t("list.emptyBranchDesc")}
          actionLabel={t("list.emptyBranchAction")}
        />
      ) : currentRecords.length === 0 ? (
        <div className="p-16 text-center text-gray-500 font-medium flex flex-col items-center justify-center space-y-2">
          <div className="w-12 h-12 rounded-card bg-gray-100 flex items-center justify-center text-gray-400 mb-1 border border-gray-200">
            <User size={24} />
          </div>
          <p className="text-base text-gray-800 font-bold">{t("list.emptyTitle")}</p>
          <p className="text-sm text-gray-500 font-normal">{t("list.emptyDesc")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white">
          <table className="w-full min-w-[1050px] text-right border-collapse bg-white text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-700 text-xs font-bold">
                <th className="py-2.5 px-3 w-12 text-center border-l border-gray-200 rounded-none">{t("table.rowIndex", { ns: "common" })}</th>
                <th className="py-2.5 px-3 w-24 text-center border-l border-gray-200 rounded-none">{t("list.colCode")}</th>
                <th className="py-2.5 px-3 border-l border-gray-200 rounded-none">{t("table.fullName", { ns: "common" })}</th>
                <th className="py-2.5 px-3 border-l border-gray-200 rounded-none">{t("table.fatherName", { ns: "common" })}</th>
                <th className="py-2.5 px-3 border-l border-gray-200 rounded-none">{t("list.colPosition")}</th>
                <th className="py-2.5 px-3 border-l border-gray-200 rounded-none">{t("form.phone")}</th>
                <th className="py-2.5 px-3 text-center border-l border-gray-200 rounded-none">{t("list.colSalary")}</th>
                <th className="py-2.5 px-3 text-center border-l border-gray-200 rounded-none">{t("list.colCreator")}</th>
                <th className="py-2.5 px-3 text-center border-l border-gray-200 rounded-none">{t("table.status", { ns: "common" })}</th>
                <th className="py-2.5 px-3 text-center w-28 rounded-none">{t("table.actions", { ns: "common" })}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs bg-white">
              {currentRecords.map((emp, index) => {
                const isActive = isActiveStatus(emp.status);
                const rowNumber = indexOfFirstRecord + index + 1;
                return (
                  <tr
                    key={emp.id}
                    className="hover:bg-gray-50/70 transition-colors border-b border-gray-100"
                  >
                    <td className="py-2.5 px-3 font-mono font-bold text-gray-500 text-center border-l border-gray-100 text-xs rounded-none">
                      {rowNumber}
                    </td>

                    <td className="py-2.5 px-3 font-mono font-bold text-gray-800 text-center border-l border-gray-100 rounded-none" dir="ltr">
                      <span className="px-2 py-0.5 rounded-badge text-gray-700 font-medium text-xs">
                        {emp.employee_ID}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 border-l border-gray-100 rounded-none">
                      <button
                        type="button"
                        onClick={() => onViewProfile(emp)}
                        className="font-bold text-gray-900 hover:text-slate-800 transition-colors text-xs text-right cursor-pointer"
                      >
                        {emp.full_name}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-gray-700 font-medium border-l border-gray-100 text-xs rounded-none">
                      {emp.father_name || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="py-2.5 px-3 text-gray-700 font-medium border-l border-gray-100 text-xs rounded-none">
                      {emp.position || t("list.defaultPosition")}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-medium text-gray-800 text-xs border-l border-gray-100 rounded-none" dir="ltr">
                      {emp.phone || <span className="text-gray-400 text-xs">{t("list.notRegistered")}</span>}
                    </td>

                    <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-700 text-xs border-l border-gray-100 rounded-none" dir="ltr">
                      {Number(emp.salary || 0).toLocaleString("en-US")} {t("company.currency", { ns: "common" })}
                    </td>

                    <td className="py-2.5 px-3 text-center text-gray-700 font-medium border-l border-gray-100 rounded-none">
                      {emp.created_by || "—"}
                    </td>

                    <td className="py-2.5 px-3 text-center border-l border-gray-100 rounded-none">
                      <button
                        type="button"
                        onClick={() => onToggleStatus(emp)}
                        className={`inline-flex items-center space-x-1 space-x-reverse px-2 py-0.5 rounded-badge text-[11px] font-medium cursor-pointer transition-colors ${
                          isActive ? "text-emerald-800" : "text-rose-800"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isActive ? "bg-emerald-600" : "bg-rose-600"
                          }`}
                        />
                        <span>{emp.status}</span>
                      </button>
                    </td>

                    <td className="py-2.5 px-3 text-center rounded-none">
                      <div className="flex items-center justify-center space-x-1 space-x-reverse">
                        <TooltipButton
                          tooltip={t("list.tooltipViewProfile")}
                          onClick={() => onViewProfile(emp)}
                          className="w-7 h-7 flex items-center justify-center bg-white hover:bg-slate-800 hover:text-white text-gray-600 rounded-btn border border-gray-300 transition-colors cursor-pointer !p-0 shadow-2xs"
                          icon={<Eye size={13} />}
                        />
                        {canEdit && (
                          <TooltipButton
                            tooltip={t("form.breadcrumbEdit")}
                            onClick={() => onEditEmployee(emp)}
                            className="w-7 h-7 flex items-center justify-center bg-white hover:bg-slate-800 hover:text-white text-gray-600 rounded-btn border border-gray-300 transition-colors cursor-pointer !p-0 shadow-2xs"
                            icon={<Edit2 size={13} />}
                          />
                        )}
                        {canDelete && (
                          <TooltipButton
                            tooltip={t("list.tooltipDelete")}
                            onClick={() => onDeleteEmployee(emp)}
                            className="w-7 h-7 flex items-center justify-center bg-white hover:bg-rose-700 hover:text-white text-gray-600 rounded-btn border border-gray-300 transition-colors cursor-pointer !p-0 shadow-2xs"
                            icon={<Trash2 size={13} />}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <TablePagination
        currentPage={currentPage}
        lastPage={totalPages}
        total={filteredEmployees.length}
        perPage={recordsPerPage}
        onPageChange={(page) => setCurrentPage(page)}
        onPerPageChange={(size) => {
          setRecordsPerPage(size);
          setCurrentPage(1);
        }}
        unit={t("list.paginationUnit")}
      />
    </div>
  );
}
