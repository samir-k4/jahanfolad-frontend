import  { useState, useEffect, useMemo, useCallback } from "react";
import { showToast as appToast } from "../utils/toast";
import { usePagePerms } from "../components/common";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ExpenseCreateModal from "../components/expenses/ExpenseCreateModal";
import ExpenseReportModal from "../components/expenses/ExpenseReportModal";
import ExpenseSummaryModal from "../components/expenses/ExpenseSummaryModal";
import ExpenseDetailsModal from "../components/expenses/ExpenseDetailsModal";
import { formatShamsiDate } from "../utils";
import {
  TrendingDown,
  RotateCcw,
  Printer,
  Search,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Info,
  Clock,
  X,
  BarChart3,
} from "lucide-react";
import useDebounce from "../hooks/useDebounce";
import { apiUrl } from "../api";
import {
  TooltipButton,
  DeleteConfirmationModal,
  TablePagination,
  CustomDropdown,
  SearchableSelect,
  FilterPresetButtons,
} from "../components/common";
const fmt = (n) => Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const fmt1 = (n) => Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const CURRENCY_AFN = "AFN";
const FILTER_CONTROL = "h-10 px-3 text-xs font-medium text-content-body bg-surface";
const HEADER_ACTION =
  "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-btn text-btn-text bg-accent-soft hover:bg-accent-subtle text-accent-strong border border-accent-line transition-colors cursor-pointer";
const DATE_PRESET_LABELS = {
  today: "datePreset.today",
  week: "datePreset.this_week",
  month: "datePreset.current_month",
  year: "datePreset.current_year",
  all: "datePreset.all",
};
const toYmd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const resolvePresetRange = (key) => {
  const now = new Date();
  const today = toYmd(now);
  if (key === "today") return { from: today, to: today };
  if (key === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - ((now.getDay() + 1) % 7));
    return { from: toYmd(start), to: today };
  }
  if (key === "month") {
    return { from: toYmd(new Date(now.getFullYear(), now.getMonth(), 1)), to: today };
  }
  if (key === "year") {
    return { from: toYmd(new Date(now.getFullYear(), 0, 1)), to: today };
  }
  return { from: null, to: null };
};
export default function ExpensesPage() {
  const { canCreate, canDelete } = usePagePerms("expenses");
  const { t } = useTranslation("salary");
  const { t: tx } = useTranslation("expenses");
  const [searchParams] = useSearchParams();
  const expenseTypeSlug = searchParams.get("expense_type") || "all";
  const [vaults, setVaults] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({
    grand_total_afn: 0,
    grand_total_usd: 0,
    total_converted_usd: 0,
    total_count: 0,
    by_category: [],
    pending_count: 0,
    pending_total_afn: 0,
  });
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
  });
  const [expenseTypes, setExpenseTypes] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSource, setSelectedSource] = useState("all");
  const [selectedVaultFilter, setSelectedVaultFilter] = useState("all");
  const [selectedCurrencyFilter, setSelectedCurrencyFilter] = useState("all");
  const [datePreset, setDatePreset] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 1000);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [selectedStateFilter, setSelectedStateFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [detailsTarget, setDetailsTarget] = useState(null);
  const notify = (type, message) => {
    (appToast[type] || appToast.info)(message);
  };
  useEffect(() => {
    fetch(apiUrl("/vaults"))
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((data) => setVaults(Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : [])))
      .catch((err) => console.error("Error loading vaults:", err));
    fetch(apiUrl("/categories/expense_type"))
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setExpenseTypes(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Error loading expense types:", err));
  }, []);
  useEffect(() => {
    const qs = expenseTypeSlug !== "all" ? `?expense_type=${expenseTypeSlug}` : "";
    fetch(apiUrl(`/categories/expense_category${qs}`))
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Error loading expense categories:", err));
  }, [expenseTypeSlug]);
  useEffect(() => {
    setSelectedCategory("all");
    setCurrentPage(1);
  }, [expenseTypeSlug]);
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery]);
  const fetchExpenses = useCallback(async (page = 1, customPerPage = perPage) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(customPerPage),
      });
      if (expenseTypeSlug !== "all") params.append("expense_type", expenseTypeSlug);
      if (selectedCategory !== "all") params.append("category", selectedCategory);
      if (selectedSource !== "all") params.append("payment_source", selectedSource);
      if (selectedStateFilter !== "all") params.append("state", selectedStateFilter);
      if (selectedVaultFilter !== "all") params.append("vault_id", selectedVaultFilter);
      if (selectedCurrencyFilter !== "all") params.append("currency", selectedCurrencyFilter);
      if (debouncedSearchQuery.trim()) params.append("search", debouncedSearchQuery.trim());
      const { from, to } = resolvePresetRange(datePreset);
      if (from) params.append("date_from", from);
      if (to) params.append("date_to", to);
      const res = await fetch(apiUrl(`/expenses?${params}`));
      if (!res.ok) throw new Error(tx("toast.loadError"));
      const json = await res.json();
      setExpenses(json.data || []);
      if (Array.isArray(json.categories) && json.categories.length > 0) {
        setCategories(json.categories);
      }
      setSummary(json.summary || {
        grand_total_afn: 0,
        grand_total_usd: 0,
        total_converted_usd: 0,
        total_count: 0,
        by_category: [],
        pending_count: 0,
        pending_total_afn: 0,
      });
      setPagination(json.pagination || { current_page: 1, last_page: 1, per_page: 15, total: 0 });
      setCurrentPage(json.pagination?.current_page || 1);
    } catch (err) {
      console.error(err);
      notify("error", err.message || t("toast.serverError", { ns: "common" }));
    } finally {
      setLoading(false);
    }
  }, [expenseTypeSlug, selectedCategory, selectedSource, selectedStateFilter, selectedVaultFilter, selectedCurrencyFilter, datePreset, debouncedSearchQuery, t, tx]);
  useEffect(() => {
    fetchExpenses(1);
  }, [fetchExpenses]);
  const handleDeleteExpense = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(apiUrl(`/expenses/${deleteTarget.id}`), {
        method: "DELETE",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ reason: deleteReason.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || tx("toast.deleteError"));
      notify("success", json.message || tx("toast.deleteSuccess"));
      setDeleteTarget(null);
      setDeleteReason("");
      fetchExpenses(currentPage);
    } catch (err) {
      notify("error", err.message);
    } finally {
      setIsDeleting(false);
    }
  };
  const datePresets = useMemo(
    () =>
      Object.entries(DATE_PRESET_LABELS).map(([key, label]) => ({
        key,
        label: t(label, { ns: "common" }),
      })),
    [t]
  );
  const categoryOptions = useMemo(
    () => [
      { value: "all", label: tx("filters.allCategories") },
      ...categories.map((cat) => ({
        value: String(cat.id),
        label: tx("filters.categoryOption", {
          name: cat.name,
          count: summary.by_category?.find((c) => String(c.id) === String(cat.id))?.count || 0,
        }),
      })),
    ],
    [categories, summary.by_category, tx]
  );
  const activeType = useMemo(
    () => expenseTypes.find((t) => t.slug === expenseTypeSlug) || null,
    [expenseTypes, expenseTypeSlug]
  );
  return (
    <div className="w-full space-y-4 font-sans" dir="rtl">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 border-b border-line pb-4">
        <div className="space-y-1 min-w-0">
          <h1 className="text-page-title text-content-strong tracking-tight">
            {activeType ? activeType.name : tx("page.title")}
          </h1>
          <p className="text-caption-text text-content-subtle whitespace-normal break-words">
            {activeType?.description || tx("page.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 lg:justify-end shrink-0">
          <button
            type="button"
            onClick={() => setIsSummaryModalOpen(true)}
            className={HEADER_ACTION}
          >
            <BarChart3 size={14} />
            <span>{tx("actions.openSummary")}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            className={HEADER_ACTION}
          >
            <Printer size={14} />
            <span>{tx("actions.printReport")}</span>
          </button>
          {canCreate && (
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className={HEADER_ACTION}
            >
              <span>{t("actions.addExpense", { ns: "common" })}</span>
            </button>
          )}
        </div>
      </div>
      {summary.pending_count > 0 && selectedStateFilter !== "pending" && (
        <div className="flex">
          <div className="inline-flex items-center gap-2.5 bg-notice-soft border border-notice-line rounded-alert py-1.5 pr-1.5 pl-2">
            <span className="w-6 h-6 rounded-badge bg-notice-icon text-content-inverse flex items-center justify-center shrink-0">
              <Clock size={13} />
            </span>
            <span className="text-caption-text text-notice-deep">
              {tx("queue.bannerTitle", { count: summary.pending_count })}
            </span>
            <span className="text-caption-text text-notice font-mono" dir="ltr">
              {tx("queue.bannerAmount", {
                amount: fmt(summary.pending_total_afn),
                currency: CURRENCY_AFN,
              })}
            </span>
          </div>
        </div>
      )}
      <div className="bg-surface rounded-card border border-line shadow-2xs overflow-hidden">
        <div className="p-3.5 border-b border-line bg-surface flex flex-wrap items-center gap-2">
          <span className="text-label-text text-content-body whitespace-nowrap ml-1">
            {tx("filters.rangeLabel")}
          </span>
          <FilterPresetButtons
            presets={datePresets}
            activeKey={datePreset}
            onChange={(key) => {
              setDatePreset(key);
              setCurrentPage(1);
            }}
            buttonClassName="px-3 py-1.5 rounded-btn text-xs"
          />
        </div>
        <div className="p-3.5 bg-surface-muted flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-content-faint" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={tx("filters.searchPlaceholder")}
              className="w-full h-10 pl-3 pr-9 border border-line-strong rounded-input text-xs focus:outline-none focus:border-accent bg-surface placeholder-content-faint"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-content-faint hover:text-content-muted"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex items-center flex-wrap gap-2.5">
            <div className="w-52">
              <SearchableSelect
                value={selectedCategory}
                onChange={(val) => {
                  setSelectedCategory(val);
                  setCurrentPage(1);
                }}
                options={categoryOptions}
                placeholder={tx("filters.allCategories")}
                usePortal
              />
            </div>
            <CustomDropdown
              value={selectedSource}
              onChange={(val) => {
                setSelectedSource(val);
                setCurrentPage(1);
              }}
              options={[
                { value: "all", label: tx("filters.allSources") },
                { value: "vault_direct", label: tx("filters.sourceVault") },
                { value: "manager_advance", label: tx("filters.sourceAdvance") },
              ]}
              buttonClassName={`${FILTER_CONTROL} min-w-[140px]`}
              width="w-48"
              usePortal
            />
            <CustomDropdown
              value={selectedStateFilter}
              onChange={(val) => {
                setSelectedStateFilter(val);
                setCurrentPage(1);
              }}
              options={[
                { value: "all", label: tx("states.all") },
                {
                  value: "pending",
                  label: tx("states.pending"),
                  badge: summary.pending_count || 0,
                },
                { value: "paid", label: tx("states.paid") },
                { value: "rejected", label: tx("states.rejected") },
                { value: "reversed", label: tx("states.reversed") },
              ]}
              buttonClassName={`${FILTER_CONTROL} min-w-[150px]`}
              width="w-48"
              usePortal
            />
            <div className="w-48">
              <SearchableSelect
                value={selectedVaultFilter}
                onChange={(val) => {
                  setSelectedVaultFilter(val);
                  setCurrentPage(1);
                }}
                options={[
                  { value: "all", label: tx("filters.allVaults") },
                  ...vaults.map((v) => ({
                    value: String(v.id),
                    label: `${v.name} (${v.currency})`,
                  })),
                ]}
                placeholder={tx("filters.allVaults")}
                usePortal
              />
            </div>
            <CustomDropdown
              value={selectedCurrencyFilter}
              onChange={(val) => {
                setSelectedCurrencyFilter(val);
                setCurrentPage(1);
              }}
              options={[
                { value: "all", label: tx("filters.allCurrencies") },
                { value: "AFN", label: tx("filters.currencyAfn") },
                { value: "USD", label: tx("filters.currencyUsd") },
                { value: "IRR", label: tx("filters.currencyIrr") },
              ]}
              buttonClassName={`${FILTER_CONTROL} min-w-[110px]`}
              width="w-36"
              usePortal
            />
          </div>
        </div>
      </div>
        <div className="bg-surface rounded-card border border-line shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse" dir="rtl">
              <thead>
                <tr className="bg-surface-muted text-content-body text-table-header-text border-b border-line select-none">
                  <th className="px-3 py-2.5 text-center border-l border-line whitespace-nowrap">
                    {tx("queue.columnVoucher")}
                  </th>
                  <th className="px-3 py-2.5 border-l border-line whitespace-nowrap">{t("table.date", { ns: "common" })}</th>
                  <th className="px-3 py-2.5 border-l border-line whitespace-nowrap">{tx("table.category")}</th>
                  <th className="px-3 py-2.5 border-l border-line whitespace-nowrap">{tx("table.account")}</th>
                  <th className="px-3 py-2.5 border-l border-line text-center font-mono whitespace-nowrap">{t("table.amount", { ns: "common" })}</th>
                  <th className="px-3 py-2.5 border-l border-line text-center whitespace-nowrap">{tx("table.currency")}</th>
                  <th className="px-3 py-2.5 border-l border-line text-center font-mono whitespace-nowrap">{tx("table.exchangeRate")}</th>
                  <th className="px-3 py-2.5 border-l border-line text-center font-mono whitespace-nowrap">{tx("table.convertedUsd")}</th>
                  <th className="px-3 py-2.5 border-l border-line min-w-[260px]">{tx("table.description")}</th>
                  <th className="px-3 py-2.5 border-l border-line whitespace-nowrap">{tx("table.createdBy")}</th>
                  <th className="px-3 py-2.5 text-center border-l border-line whitespace-nowrap">
                    {tx("queue.columnState")}
                  </th>
                  <th className="px-2 py-2.5 text-center w-28">{t("table.actions", { ns: "common" })}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft text-content-body text-table-cell-text bg-surface">
                {loading ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-content-subtle">
                      <RotateCcw size={24} className="animate-spin mx-auto mb-2 text-accent" />
                      <span>{tx("table.loading")}</span>
                    </td>
                  </tr>
                ) : expenses.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-content-faint font-medium">
                      {tx("table.empty")}
                    </td>
                  </tr>
                ) : (
                  expenses.map((exp, idx) => (
                    <tr key={exp.id} className="hover:bg-accent-soft transition-colors">
                      <td className="px-3 py-3 text-center border-l border-line whitespace-nowrap">
                        <span className="font-mono text-[11px] font-bold text-content-body bg-surface-subtle border border-line rounded-badge px-2 py-0.5 inline-block" dir="ltr">
                          {exp.voucher_no || `#${exp.id}`}
                        </span>
                        {exp.printed_at && (
                          <span className="block text-[10px] text-content-faint mt-0.5">{tx("queue.printed")}</span>
                        )}
                      </td>
                      <td className="px-3 py-3 font-mono font-bold text-content-strong border-l border-line whitespace-nowrap">
                        {formatShamsiDate(exp.shamsi_date) || "—"}
                      </td>
                      <td className="px-3 py-3 border-l border-line whitespace-nowrap text-content">
                        {exp.category_title || "—"}
                      </td>
                      <td className="px-3 py-3 border-l border-line whitespace-nowrap text-content-body">
                        {exp.payment_source === "manager_advance" ? (
                          <span className="font-bold text-amber-700">{exp.source_title}</span>
                        ) : (
                          exp.vault_name || "—"
                        )}
                      </td>
                      <td
                        className="px-3 py-3 text-center font-mono font-bold whitespace-nowrap border-l border-line text-content-strong bg-rose-50/20"
                        dir="ltr"
                      >
                        {fmt(exp.amount)}
                        {exp.vault_amount != null && Number(exp.vault_amount) !== Number(exp.amount) && (
                          <span className="block text-[10px] font-normal text-content-subtle mt-0.5">
                            {fmt(exp.vault_amount)} {exp.vault_currency}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center border-l border-line whitespace-nowrap">
                        <span className="text-[11px] font-bold text-content-muted font-mono">
                          {exp.currency || "AFN"}
                        </span>
                      </td>
                      <td
                        className="px-3 py-3 text-center font-mono text-content-body border-l border-line whitespace-nowrap"
                        dir="ltr"
                      >
                        {fmt(exp.usd_rate ?? exp.exchange_rate)}
                      </td>
                      <td
                        className="px-3 py-3 text-center font-mono font-bold whitespace-nowrap text-blue-900 bg-blue-50/20 border-l border-line"
                        dir="ltr"
                      >
                        {exp.converted_amount_usd == null ? (
                          <span className="text-content-faint">—</span>
                        ) : (
                          `$${fmt1(exp.converted_amount_usd)}`
                        )}
                      </td>
                      <td className="px-3 py-3 border-l border-line text-content min-w-[260px]">
                        <div className="whitespace-normal break-words leading-relaxed">
                          {exp.description || "—"}
                        </div>
                      </td>
                      <td className="px-3 py-3 border-l border-line whitespace-nowrap text-content-muted">
                        {exp.created_by || "—"}
                        {exp.paid_by && exp.paid_by !== exp.created_by && (
                          <span className="block text-[10px] text-content-faint mt-0.5">{exp.paid_by}</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center border-l border-line whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-badge border font-bold text-[11px] inline-block ${
                            exp.state === "pending"
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : exp.state === "rejected"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : exp.state === "reversed"
                              ? "bg-slate-100 text-slate-800 border-slate-300"
                              : "bg-emerald-50 text-emerald-800 border-emerald-200"
                          }`}
                        >
                          {exp.state_label || tx(`states.${exp.state || "paid"}`)}
                        </span>
                        {exp.state === "rejected" && exp.rejection_reason && (
                          <span className="block text-[10px] text-content-subtle mt-0.5 max-w-[140px] truncate" title={exp.rejection_reason}>
                            {exp.rejection_reason}
                          </span>
                        )}
                        {exp.state === "reversed" && exp.reversal_reason && (
                          <span className="block text-[10px] text-content-subtle mt-0.5 max-w-[140px] truncate" title={exp.reversal_reason}>
                            {exp.reversal_reason}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-0.5">
                          <TooltipButton
                            icon={<Info size={15} />}
                            tooltip={tx("actions.details")}
                            onClick={() => setDetailsTarget(exp)}
                            className="w-8 h-8 flex items-center justify-center bg-white text-gray-400 hover:text-slate-800 hover:bg-slate-100 hover:border-slate-300 rounded border border-gray-200 transition-colors cursor-pointer"
                          />
                          {canDelete && exp.can_delete !== false && exp.state !== "reversed" && exp.state !== "pending" && (
                            <TooltipButton
                              icon={<Trash2 size={15} />}
                              tooltip={tx(exp.state === "paid" ? "actions.reverse" : "actions.delete")}
                              onClick={() => {
                                setDeleteReason("");
                                setDeleteTarget(exp);
                              }}
                              className="w-8 h-8 flex items-center justify-center bg-white text-gray-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-300 rounded border border-gray-200 transition-colors cursor-pointer"
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <TablePagination
            currentPage={pagination.current_page}
            lastPage={pagination.last_page}
            total={pagination.total}
            perPage={perPage}
            onPageChange={(page) => fetchExpenses(page)}
            onPerPageChange={(size) => {
              setPerPage(size);
              fetchExpenses(1, size);
            }}
            unit={tx("table.unit")}
          />
        </div>
      <ExpenseCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          notify("success", tx("toast.createSuccess"));
          fetchExpenses(1);
        }}
        vaults={vaults}
        expenseType={activeType}
      />
      <ExpenseReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        expenseType={activeType}
        vaults={vaults}
      />
      <ExpenseSummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
      />
      <ExpenseDetailsModal
        isOpen={Boolean(detailsTarget)}
        expense={detailsTarget}
        onClose={() => setDetailsTarget(null)}
      />
      <DeleteConfirmationModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteExpense}
        itemName={
          deleteTarget
            ? `${deleteTarget.voucher_no || `#${deleteTarget.id}`} — ${fmt(deleteTarget.amount)} ${deleteTarget.currency || CURRENCY_AFN}`
            : ""
        }
        title={tx(
          deleteTarget?.state !== "paid"
            ? "delete.title"
            : deleteTarget.payment_source === "manager_advance"
            ? "reversal.advanceTitle"
            : "reversal.title"
        )}
        question={tx(
          deleteTarget?.state !== "paid"
            ? "delete.question"
            : deleteTarget.payment_source === "manager_advance"
            ? "reversal.advanceQuestion"
            : "reversal.question"
        )}
        warning={tx(
          deleteTarget?.state !== "paid"
            ? "delete.warning"
            : deleteTarget.payment_source === "manager_advance"
            ? "reversal.advanceWarning"
            : "reversal.warning"
        )}
        reasonRequired={deleteTarget?.state === "paid"}
        reason={deleteReason}
        onReasonChange={setDeleteReason}
        reasonLabel={tx("reversal.reason")}
        reasonPlaceholder={tx("reversal.reasonPlaceholder")}
        confirmLabel={tx(deleteTarget?.state === "paid" ? "reversal.confirm" : "delete.confirm")}
        loading={isDeleting}
      />
    </div>
  );
}
