import { useState, useEffect, useCallback } from "react";
import { isActiveEmployee } from "../constants/advanceDomain";
import { useTranslation } from "react-i18next";
import { TEXT_FIELD_MAX_LENGTH } from "../constants/treasuryDomain";
import { usePagePerms } from "../components/common";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Trash2,
  RotateCcw,
  TrendingDown,
  Search,
  Info,
} from "lucide-react";
import DatePicker from "react-multi-date-picker";
import { persian, persian_af } from "../utils/dateHelpers";
import useDatePresets from "../hooks/useDatePresets";
import useVaults from "../hooks/useVaults";
import ManagerAdvanceCreateModal from "../components/manager_advances/ManagerAdvanceCreateModal";
import ManagerExpenseAddModal from "../components/manager_advances/ManagerExpenseAddModal";
import {
  TooltipButton,
  TablePagination,
  CustomDropdown,
  DeleteConfirmationModal,
} from "../components/common";
import useAbortController, { isAbortError } from "../hooks/useAbortController";
import useDebounce from "../hooks/useDebounce";
import { showToast } from "../utils/toast";
import { getCleanErrorMessage } from "../utils/errorHandler";
import { apiUrl } from "../api";
import { toEnglishDigits } from "../utils";
const safeText = (val, fallback = "—") => {
  if (val === null || val === undefined || val === "") return fallback;
  if (typeof val === "object") return val.name || val.title || val.description || fallback;
  return String(val);
};
const fmt = (n) => Number(n || 0).toLocaleString("en-US");
export default function ManagerAdvancesPage() {
  const { t } = useTranslation("advances");
  const nextSignal = useAbortController();
  const { canCreate, canDelete } = usePagePerms("advances");
  const navigate = useNavigate();
  const [advances, setAdvances] = useState([]);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCurrency, setSelectedCurrency] = useState("all");
  const [selectedVault, setSelectedVault] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 1000);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const {
    activePreset,
    setActivePreset,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    applyPreset,
  } = useDatePresets("all");
  const [showNewAdvance, setShowNewAdvance] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [selectedAdvanceIdForExpense, setSelectedAdvanceIdForExpense] = useState("");
  const [advanceToDelete, setAdvanceToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { vaults } = useVaults();
  const [employees, setEmployees] = useState([]);
  useEffect(() => {
    setCurrentPage(1);
  }, [
    debouncedSearchQuery,
    statusFilter,
    selectedCurrency,
    selectedVault,
    activePreset,
    fromDate,
    toDate,
  ]);
  const fetchAdvances = useCallback(async (page = 1, customPerPage = perPage) => {
    const signal = nextSignal();
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, per_page: customPerPage });
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (selectedCurrency !== "all") params.append("currency", selectedCurrency);
      if (selectedVault !== "all") params.append("vault_id", selectedVault);
      if (debouncedSearchQuery.trim()) params.append("search", debouncedSearchQuery.trim());
      if (activePreset !== "all") {
        if (fromDate) params.append("from_date", fromDate.format("YYYY/MM/DD"));
        if (toDate) params.append("to_date", toDate.format("YYYY/MM/DD"));
      }
      const res = await fetch(apiUrl(`/manager-advances?${params}`), { signal });
      const json = await res.json();
      setAdvances(json.data || []);
      setPagination(json.pagination || { current_page: 1, last_page: 1, total: 0 });
      setCurrentPage(json.pagination?.current_page || 1);
    } catch (err) {
      if (isAbortError(err)) return;
      showToast.error(t("messages.listError"));
    } finally {
      setLoading(false);
    }
  }, [
    statusFilter,
    selectedCurrency,
    selectedVault,
    debouncedSearchQuery,
    activePreset,
    fromDate,
    toDate,
    perPage, nextSignal]);
  useEffect(() => {
    fetchAdvances(1);
  }, [fetchAdvances]);
  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/employees"));
      const empJson = await res.json();
      const list = Array.isArray(empJson.data) ? empJson.data : (Array.isArray(empJson) ? empJson : []);
      const activeList = list.filter(isActiveEmployee);
      setEmployees(activeList.length > 0 ? activeList : list);
    } catch {
      showToast.error(t("messages.employeesError"));
    }
  }, []);
  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);
  const handleConfirmDelete = async () => {
    if (!advanceToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(apiUrl(`/manager-advances/${encodeURIComponent(advanceToDelete.id)}`), {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || t("messages.genericError"));
      showToast.success(json.message || t("messages.deleted"));
      setAdvanceToDelete(null);
      fetchAdvances(currentPage);
    } catch (err) {
      showToast.error(getCleanErrorMessage(err, t("messages.deleteError")));
    } finally {
      setIsDeleting(false);
    }
  };
  const handleResetFilters = () => {
    setStatusFilter("all");
    setSelectedCurrency("all");
    setSelectedVault("all");
    setSearchQuery("");
    applyPreset("all");
    setCurrentPage(1);
  };
  const isFiltered =
    statusFilter !== "all" ||
    selectedCurrency !== "all" ||
    selectedVault !== "all" ||
    searchQuery !== "" ||
    activePreset !== "all";
  return (
    <div className="w-full space-y-4 font-sans" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-page-title text-gray-900 tracking-tight">{t("page.title")}</h1>
          </div>
          <p className="text-subtitle text-gray-500 mt-1">{t("page.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setSelectedAdvanceIdForExpense("");
              setShowExpenseModal(true);
            }}
            className="px-3.5 py-2 text-btn-text font-bold text-gray-700 bg-white border border-gray-300 rounded-btn hover:bg-gray-50 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <TrendingDown size={15} />
            <span>{t("page.addExpense")}</span>
          </button>
          {canCreate && (
            <button
              type="button"
              onClick={() => setShowNewAdvance(true)}
              className="px-4 py-2 text-btn-text font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-btn transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={16} />
              <span>{t("label.newAdvance")}</span>
            </button>
          )}
        </div>
      </div>
      <div className="bg-white p-3.5 rounded-card border border-gray-200 shadow-2xs flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute right-3 top-2.5 text-gray-400" />
          <input
            type="text"
            maxLength={TEXT_FIELD_MAX_LENGTH}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("filters.searchPlaceholder")}
            className="w-full border border-gray-300 rounded-input pr-9 pl-3 py-1.5 text-body-text placeholder:text-placeholder-text text-gray-800 focus:outline-none focus:border-slate-800 bg-white"
          />
        </div>
        <CustomDropdown
          value={activePreset}
          onChange={(val) => applyPreset(val)}
          options={[
            { value: "all", label: t("preset.all") },
            { value: "today", label: t("preset.today") },
            { value: "this_week", label: t("preset.this_week") },
            { value: "this_month", label: t("preset.this_month") },
            { value: "last_30_days", label: t("preset.last_30_days") },
            { value: "custom", label: t("preset.custom") },
          ]}
          placeholder={t("filters.rangePlaceholder")}
          buttonClassName="px-3 py-1.5 text-body-text font-medium text-gray-700 bg-white min-w-[130px] rounded-input"
          width="w-44"
          align="right"
        />
        {activePreset !== "all" && (
          <div className="flex items-center gap-1.5 bg-slate-50 border border-gray-200 px-2 py-1 rounded-input text-table-cell-text">
            <span className="text-gray-500 font-medium text-caption-text">{t("filters.from")}</span>
            <DatePicker
              value={fromDate}
              onChange={(d) => {
                setActivePreset("custom");
                setFromDate(d);
              }}
              calendar={persian}
              locale={persian_af}
              format="YYYY/MM/DD"
              inputClass="w-20 text-center bg-white border border-gray-300 rounded-input px-1.5 py-0.5 text-table-cell-text font-mono outline-none focus:border-slate-800"
            />
            <span className="text-gray-500 font-medium text-caption-text">{t("filters.to")}</span>
            <DatePicker
              value={toDate}
              onChange={(d) => {
                setActivePreset("custom");
                setToDate(d);
              }}
              calendar={persian}
              locale={persian_af}
              format="YYYY/MM/DD"
              inputClass="w-20 text-center bg-white border border-gray-300 rounded-input px-1.5 py-0.5 text-table-cell-text font-mono outline-none focus:border-slate-800"
            />
          </div>
        )}
        <CustomDropdown
          value={selectedVault}
          onChange={(val) => setSelectedVault(val)}
          options={[
            { value: "all", label: t("filters.allVaults") },
            ...vaults.map((v) => ({
              value: String(v.id),
              label: `${v.name} (${v.currency})`,
            })),
          ]}
          placeholder={t("label.vault")}
          buttonClassName="px-3 py-1.5 text-body-text font-medium text-gray-700 bg-white min-w-[140px] rounded-input"
          width="w-48"
          align="right"
        />
        <CustomDropdown
          value={selectedCurrency}
          onChange={(val) => setSelectedCurrency(val)}
          options={[
            { value: "all", label: t("filters.allCurrencies") },
            { value: "AFN", label: t("currency.AFN") },
            { value: "USD", label: t("currency.USD") },
          ]}
          placeholder={t("label.currency")}
          buttonClassName="px-3 py-1.5 text-body-text font-medium text-gray-700 bg-white min-w-[110px] rounded-input"
          width="w-36"
          align="right"
        />
        <CustomDropdown
          value={statusFilter}
          onChange={(val) => setStatusFilter(val)}
          options={[
            { value: "all", label: t("filters.allStatuses") },
            { value: "open", label: t("status.openFilter") },
            { value: "settled", label: t("status.settled") },
          ]}
          placeholder={t("filters.statusPlaceholder")}
          buttonClassName="px-3 py-1.5 text-body-text font-medium text-gray-700 bg-white min-w-[140px] rounded-input"
          width="w-44"
          align="right"
        />
        {isFiltered && (
          <TooltipButton
            icon={<RotateCcw size={14} />}
            tooltip={t("filters.reset")}
            onClick={handleResetFilters}
            className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 border border-gray-300 rounded-btn bg-white"
          />
        )}
        <TooltipButton
          icon={<RotateCcw size={14} className={loading ? "animate-spin" : ""} />}
          tooltip={t("filters.refresh")}
          onClick={() => fetchAdvances(currentPage)}
          className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 border border-gray-300 rounded-btn bg-white"
        />
      </div>
      <div className="bg-white rounded-table border border-gray-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-table-cell-text border-collapse">
            <thead>
              <tr className="bg-slate-50 text-gray-800 font-bold select-none text-table-cell-text border-b border-gray-200">
                <th className="py-2.5 px-2 text-center w-8 border border-gray-200 whitespace-nowrap">#</th>
                <th className="py-2.5 px-2.5 text-center border border-gray-200 whitespace-nowrap">{t("table.docCode")}</th>
                <th className="py-2.5 px-3 text-center border border-gray-200 whitespace-nowrap">{t("table.date")}</th>
                <th className="py-2.5 px-3 text-right border border-gray-200 whitespace-nowrap">{t("table.receiver")}</th>
                <th className="py-2.5 px-3 text-right border border-gray-200 whitespace-nowrap">{t("table.position")}</th>
                <th className="py-2.5 px-3.5 text-right border border-gray-200 whitespace-nowrap">{t("label.vault")}</th>
                <th className="py-2.5 px-3 text-right border border-gray-200 whitespace-nowrap">{t("label.purpose")}</th>
                <th className="py-2.5 px-3 text-center border border-gray-200 whitespace-nowrap">{t("table.amount")}</th>
                <th className="py-2.5 px-3 text-center border border-gray-200 whitespace-nowrap">{t("table.spent")}</th>
                <th className="py-2.5 px-3 text-center border border-gray-200 whitespace-nowrap">{t("table.remaining")}</th>
                <th className="py-2.5 px-2.5 text-center border border-gray-200 whitespace-nowrap">{t("label.currency")}</th>
                <th className="py-2.5 px-3 text-center border border-gray-200 whitespace-nowrap">{t("table.status")}</th>
                <th className="py-2.5 px-2.5 text-center w-[96px] border border-gray-200 whitespace-nowrap">{t("table.actions")}</th>
              </tr>
            </thead>
            <tbody className="bg-white text-table-cell-text">
              {loading ? (
                <tr>
                  <td colSpan={13} className="p-12 text-center text-gray-500 text-table-cell-text">{t("table.loading")}</td>
                </tr>
              ) : advances.length === 0 ? (
                <tr>
                  <td colSpan={13} className="p-12 text-center text-gray-500 text-table-cell-text">{t("table.empty")}</td>
                </tr>
              ) : (
                advances.map((adv, index) => {
                  const spent = adv.total_spent || 0;
                  const remaining = adv.remaining ?? Math.max(0, adv.amount - spent);
                  const isOpen = adv.status === "open";
                  const displayName = adv.receiver_name || adv.employee?.full_name || "—";
                  const rowIndex = (currentPage - 1) * perPage + index + 1;
                  const docCode = String(adv.id).padStart(4, "0");
                  return (
                    <tr key={adv.id} className="hover:bg-amber-50/40 transition-colors even:bg-slate-50/40">
                      <td className="py-2 px-2 text-center text-gray-400 border border-gray-200 font-mono text-table-cell-text font-normal whitespace-nowrap">
                        {rowIndex}
                      </td>
                      <td className="py-2 px-2.5 text-center border border-gray-200 font-mono font-medium text-gray-800 text-table-cell-text whitespace-nowrap" dir="ltr">
                        #{docCode}
                      </td>
                      <td className="py-2 px-3 text-center font-mono text-gray-600 border border-gray-200 text-table-cell-text whitespace-nowrap font-normal" dir="ltr">
                        {toEnglishDigits(adv.shamsi_date || "—")}
                      </td>
                      <td className="py-2 px-3 border border-gray-200 text-right text-table-cell-text font-semibold text-gray-900 whitespace-nowrap">
                        {displayName}
                      </td>
                      <td className="py-2 px-3 border border-gray-200 text-right text-table-cell-text text-gray-700 whitespace-nowrap font-normal">
                        {adv.employee ? safeText(adv.employee.position || adv.employee.jobPosition?.name || adv.employee.jobPosition || adv.employee.employee_ID, t("table.staff")) : t("label.external")}
                      </td>
                      <td className="py-2 px-3.5 text-table-cell-text text-gray-800 border border-gray-200 whitespace-nowrap font-normal">
                        {adv.vault?.name || "—"}
                      </td>
                      <td className="py-2 px-3 text-table-cell-text text-gray-800 border border-gray-200 whitespace-nowrap font-normal">
                        {adv.purpose || "—"}
                      </td>
                      <td className="py-2 px-3 text-center font-mono font-medium text-table-cell-text text-gray-900 border border-gray-200 whitespace-nowrap" dir="ltr">
                        {fmt(adv.amount)}
                      </td>
                      <td className="py-2 px-3 text-center font-mono font-medium text-table-cell-text text-gray-700 border border-gray-200 whitespace-nowrap" dir="ltr">
                        {fmt(spent)}
                      </td>
                      <td className="py-2 px-3 text-center font-mono font-medium text-table-cell-text text-gray-900 border border-gray-200 whitespace-nowrap" dir="ltr">
                        {fmt(remaining)}
                      </td>
                      <td className="py-2 px-2.5 text-center border border-gray-200 whitespace-nowrap">
                        <span className="font-mono text-gray-700 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-badge text-table-cell-text font-medium" dir="ltr">
                          {adv.currency}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center border border-gray-200 whitespace-nowrap">
                        {isOpen ? (
                          <span className="inline-flex items-center bg-amber-50 text-amber-700 border border-amber-200 text-table-cell-text font-medium px-2 py-0.5 rounded-badge">{t("status.open")}</span>
                        ) : (
                          <span className="inline-flex items-center bg-emerald-50 text-emerald-700 border border-emerald-200 text-table-cell-text font-medium px-2 py-0.5 rounded-badge">{t("status.settled")}</span>
                        )}
                      </td>
                      <td className="py-2 px-2.5 text-center border border-gray-200 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <TooltipButton
                            tooltip={t("table.detailTip")}
                            onClick={() => navigate(`/manager-advances/${adv.id}`)}
                            className="w-7 h-7 flex items-center justify-center bg-white text-gray-400 hover:text-slate-800 hover:bg-slate-100 hover:border-slate-300 rounded-btn border border-gray-200 transition-colors cursor-pointer"
                          >
                            <Info size={14} />
                          </TooltipButton>
                          {canDelete && (
                            <TooltipButton
                              tooltip={t("table.deleteTip")}
                              onClick={() => setAdvanceToDelete(adv)}
                              className="w-7 h-7 flex items-center justify-center bg-white text-gray-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-300 rounded-btn border border-gray-200 transition-colors cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </TooltipButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <TablePagination
          currentPage={pagination.current_page || 1}
          lastPage={pagination.last_page || 1}
          total={pagination.total || 0}
          perPage={perPage}
          onPageChange={(page) => fetchAdvances(page)}
          onPerPageChange={(size) => {
            setPerPage(size);
            fetchAdvances(1, size);
          }}
          unit={t("table.unit")}
        />
      </div>
      <ManagerAdvanceCreateModal
        isOpen={showNewAdvance}
        onClose={() => setShowNewAdvance(false)}
        onSuccess={() => {
          showToast.success(t("messages.created"));
          fetchAdvances(currentPage);
        }}
        vaults={vaults}
        employees={employees}
      />
      <ManagerExpenseAddModal
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        initialAdvanceId={selectedAdvanceIdForExpense}
        onSuccess={() => {
          showToast.success(t("messages.expenseCreated"));
          fetchAdvances(currentPage);
        }}
      />
      <DeleteConfirmationModal
        isOpen={Boolean(advanceToDelete)}
        onClose={() => setAdvanceToDelete(null)}
        onConfirm={handleConfirmDelete}
        itemName={
          advanceToDelete
            ? t("delete.advanceItemName", {
                name: advanceToDelete.receiver_name || advanceToDelete.employee?.full_name || "",
                amount: fmt(advanceToDelete.amount),
                currency: advanceToDelete.currency || "",
              })
            : ""
        }
        title={t("delete.title")}
        question={t("delete.question")}
        warning={t("delete.warning")}
        loading={isDeleting}
      />
    </div>
  );
}
