import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import DatePicker from "react-multi-date-picker";
import DateObject from "react-date-object";
import persian from "react-date-object/calendars/persian";
import { Lock, Printer, RotateCcw, Search, Trash2 } from "lucide-react";
import {
  BranchSelect,
  CustomDropdown,
  DeleteConfirmationModal,
  FilterPresetButtons,
  SearchableSelect,
  TablePagination,
  TooltipButton,
  usePagePerms,
} from "../components/common";
import PaymentSlipModal from "../components/common/PaymentSlipModal";
import useVaults from "../hooks/useVaults";
import useDatePresets from "../hooks/useDatePresets";
import useDebounce from "../hooks/useDebounce";
import { apiUrl } from "../api";
import { toEnglishDigits, showToast, numberToWordsDari } from "../utils";
import { getCleanErrorMessage } from "../utils/errorHandler";
import persian_af from "../utils/persian_af";
import {
  DATE_PRESET,
  NOTES_MAX_LENGTH,
  PAYMENT_METHOD,
  PAYMENT_TYPE_SCOPE,
  PAYMENT_SOURCE,
  defaultVaultId,
  isFromPayrollRun,
  roundDownToStep,
  vaultOption,
} from "../constants/salaryDomain";
const SEARCH_DEBOUNCE_MS = 400;
const EMPTY_SUMMARY = {
  total_amount: 0,
  total_count: 0,
  hand_amount: 0,
  hand_count: 0,
  run_amount: 0,
  run_count: 0,
};
const EMPTY_META = { current_page: 1, last_page: 1, per_page: 10, total: 0 };
const PRESET_KEYS = [
  DATE_PRESET.CURRENT_MONTH,
  DATE_PRESET.TODAY,
  DATE_PRESET.LAST_7_DAYS,
  DATE_PRESET.LAST_30_DAYS,
  DATE_PRESET.ALL,
];
const PANEL = "bg-white border border-gray-200 rounded-card shadow-2xs overflow-hidden";
const LABEL = "block text-label-text text-gray-700 mb-1";
const FIELD =
  "w-full bg-white border border-gray-300 rounded-input py-2 px-3 text-label-text text-gray-800 outline-none focus:border-slate-700";
const FILTER_FIELD =
  "w-full bg-white border border-gray-300 rounded-input py-1.5 px-2.5 text-caption-text text-gray-800 outline-none focus:border-slate-700";
const CELL = "p-3 rounded-none border-l border-gray-200";
const HEAD = "p-3 rounded-none border-l border-gray-200 text-table-header-text font-bold text-gray-700";
const CHIP = "px-3 py-1.5 rounded-badge text-caption-text border transition-colors cursor-pointer";
const CHIP_ON = "bg-slate-800 text-white border-slate-800 font-bold shadow-2xs";
const CHIP_OFF = "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 font-medium";
const BTN_PRIMARY =
  "px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-btn text-btn-text font-bold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";
const BTN_SECONDARY =
  "px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-btn text-btn-text font-bold transition-colors cursor-pointer disabled:opacity-40";
const ACTION_REST = "bg-white text-gray-500 border border-gray-300";
const SECTION_TITLE = "text-base sm:text-lg font-bold text-gray-900";
const money = (value) => Number(value || 0).toLocaleString("en-US");
const dash = (value, fallback) => {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") return value.name || value.title || value.description || fallback;
  return String(value);
};
export default function EmployeePaymentPage() {
  const { canCreate, canDelete } = usePagePerms("salaries");
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation("salary");
  const emDash = t("placeholder.dash");
  const currency = t("company.currency", { ns: "common" });
  const [selectedDateObject, setSelectedDateObject] = useState(
    () => new DateObject({ calendar: persian, locale: persian_af })
  );
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [accountLoading, setAccountLoading] = useState(false);
  const [account, setAccount] = useState(null);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHOD.CASH);
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [paymentTypeId, setPaymentTypeId] = useState("");
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [expenseCategoriesLoading, setExpenseCategoriesLoading] = useState(true);
  const [expenseCategoryId, setExpenseCategoryId] = useState("");
  const [notes, setNotes] = useState("");
  const { vaults } = useVaults();
  const [selectedVaultId, setSelectedVaultId] = useState("");
  const {
    activePreset,
    setActivePreset,
    fromDate: filterStartDate,
    setFromDate: setFilterStartDate,
    toDate: filterEndDate,
    setToDate: setFilterEndDate,
    applyPreset,
  } = useDatePresets(DATE_PRESET.CURRENT_MONTH);
  const [historySearchTerm, setHistorySearchTerm] = useState("");
  const [historySourceFilter, setHistorySourceFilter] = useState(PAYMENT_SOURCE.ALL);
  const [historyBranchFilter, setHistoryBranchFilter] = useState("all");
  const [perPage, setPerPage] = useState(10);
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paginationMeta, setPaginationMeta] = useState(EMPTY_META);
  const [historySummary, setHistorySummary] = useState(EMPTY_SUMMARY);
  const [submitting, setSubmitting] = useState(false);
  const [savedPayment, setSavedPayment] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [slipAfterSave, setSlipAfterSave] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [accountReloadKey, setAccountReloadKey] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [minusAcknowledged, setMinusAcknowledged] = useState(false);
  const historyAbortRef = useRef(null);
  const debouncedSearch = useDebounce(historySearchTerm, SEARCH_DEBOUNCE_MS);
  const gregorianDateStr = useMemo(() => {
    const gDate = selectedDateObject.toDate();
    return [
      gDate.getFullYear(),
      String(gDate.getMonth() + 1).padStart(2, "0"),
      String(gDate.getDate()).padStart(2, "0"),
    ].join("-");
  }, [selectedDateObject]);
  const shamsiDateStr = useMemo(
    () => toEnglishDigits(selectedDateObject.format("YYYY/MM/DD")),
    [selectedDateObject]
  );
  useEffect(() => {
    const controller = new AbortController();
    fetch(apiUrl("/employees"), { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => setEmployees(Array.isArray(body) ? body : body?.data || []))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);
  useEffect(() => {
    setSelectedVaultId((current) => current || defaultVaultId(vaults));
  }, [vaults]);
  useEffect(() => {
    const controller = new AbortController();
    fetch(apiUrl("/categories/salary_payment_type?active_only=1"), { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : []))
      .then((body) => {
        const list = Array.isArray(body) ? body : body?.data || [];
        setPaymentTypes(list);
        setPaymentTypeId((current) => {
          if (current && list.some((type) => String(type.id) === String(current))) return current;
          const duringMonth = list.filter((type) => type.scope === PAYMENT_TYPE_SCOPE.DURING_MONTH);
          const preferred = duringMonth.find((type) => type.is_default) || duringMonth[0] || list[0];
          return preferred ? String(preferred.id) : "";
        });
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const loadExpenseCategories = async () => {
      try {
        const res = await fetch(apiUrl("/categories/expense_category?active_only=1"), {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
        const body = await res.json();
        setExpenseCategories(Array.isArray(body) ? body : body?.data || []);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("Error fetching expense categories:", err);
        showToast.error(t("payment.messages.loadExpenseCategoriesError"));
      } finally {
        if (!controller.signal.aborted) setExpenseCategoriesLoading(false);
      }
    };
    loadExpenseCategories();
    return () => controller.abort();
  }, [t]);
  useEffect(() => {
    setExpenseCategoryId((current) => {
      if (current && expenseCategories.some((category) => String(category.id) === current)) {
        return current;
      }
      const defaultCategory = expenseCategories.find(
        (category) => category.name === "مصارف معاشات",
      );
      return defaultCategory ? String(defaultCategory.id) : "";
    });
  }, [expenseCategories]);
  useEffect(() => {
    if (location.state?.employeeId) setSelectedEmployeeId(String(location.state.employeeId));
  }, [location.state]);
  useEffect(() => {
    if (!selectedEmployeeId) {
      setAccount(null);
      return undefined;
    }
    const controller = new AbortController();
    setAccountLoading(true);
    fetch(
      apiUrl(
        `/employee-payments/account/${encodeURIComponent(selectedEmployeeId)}?payment_date=${encodeURIComponent(gregorianDateStr)}`
      ),
      { signal: controller.signal }
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => setAccount(body?.data || null))
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) setAccountLoading(false);
      });
    return () => controller.abort();
  }, [selectedEmployeeId, gregorianDateStr, accountReloadKey]);
  const loadHistory = useCallback(
    async (pageToFetch = 1) => {
      historyAbortRef.current?.abort();
      const controller = new AbortController();
      historyAbortRef.current = controller;
      const params = new URLSearchParams({ page: String(pageToFetch), per_page: String(perPage) });
      if (filterStartDate) params.set("from_date", toEnglishDigits(filterStartDate.format("YYYY/MM/DD")));
      if (filterEndDate) params.set("to_date", toEnglishDigits(filterEndDate.format("YYYY/MM/DD")));
      if (historySourceFilter !== PAYMENT_SOURCE.ALL) params.set("source", historySourceFilter);
      if (historyBranchFilter !== "all") params.set("branch_id", historyBranchFilter);
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      setPaymentsLoading(true);
      try {
        const res = await fetch(apiUrl(`/employee-payments?${params}`), { signal: controller.signal });
        if (!res.ok) throw new Error("history");
        const json = await res.json();
        if (controller.signal.aborted) return;
        setPayments(json.data || []);
        setPaginationMeta({
          current_page: json.current_page ?? 1,
          last_page: json.last_page ?? 1,
          per_page: json.per_page ?? perPage,
          total: json.total ?? 0,
        });
        setHistorySummary(json.summary || EMPTY_SUMMARY);
      } catch (err) {
        if (err.name === "AbortError") return;
        showToast.error(t("payment.messages.loadError"));
      } finally {
        if (!controller.signal.aborted) setPaymentsLoading(false);
      }
    },
    [perPage, filterStartDate, filterEndDate, historySourceFilter, historyBranchFilter, debouncedSearch, t]
  );
  useEffect(() => {
    loadHistory(1);
    return () => historyAbortRef.current?.abort();
  }, [loadHistory]);
  const selectedEmployee = useMemo(
    () => employees.find((emp) => String(emp.id) === String(selectedEmployeeId)) || null,
    [employees, selectedEmployeeId]
  );
  const employeeOptions = useMemo(
    () =>
      employees.map((emp) => ({
        value: String(emp.id),
        label: t("payment.form.employeeOption", {
          name: dash(emp.full_name, emDash),
          father: emp.father_name
            ? t("payment.form.fatherPrefix", { name: emp.father_name })
            : t("payment.form.noFatherName"),
          code: dash(emp.employee_ID, emDash),
          position: dash(emp.position || emp.jobPosition, emDash),
          salary: money(emp.salary),
        }),
      })),
    [employees, t, emDash]
  );
  const vaultOptions = useMemo(() => vaults.map(vaultOption), [vaults]);
  const expenseCategoryOptions = useMemo(
    () => expenseCategories.map((category) => ({
      value: String(category.id),
      label: category.name,
    })),
    [expenseCategories],
  );
  const paymentTypeOptions = useMemo(
    () =>
      [...paymentTypes]
        .sort((a, b) =>
          a.scope === b.scope ? 0 : a.scope === PAYMENT_TYPE_SCOPE.DURING_MONTH ? -1 : 1,
        )
        .map((type) => ({ value: String(type.id), label: type.name })),
    [paymentTypes],
  );
  const parsedAmount = Number(amount || 0);
  const amountInWords = useMemo(() => numberToWordsDari(parsedAmount), [parsedAmount]);
  const available = Number(account?.available || 0);
  const openMonths = useMemo(() => (account?.months || []).filter((month) => !month.is_closed), [account]);
  const exceedsAvailable = parsedAmount > available;
  const canSubmit =
    canCreate &&
    !submitting &&
    !expenseCategoriesLoading &&
    !!selectedEmployeeId &&
    !!expenseCategoryId &&
    parsedAmount > 0 &&
    (!exceedsAvailable || minusAcknowledged);
  const minusAfter = Math.round((available - parsedAmount) * 100) / 100;
  const allocationPreview = useMemo(() => {
    if (!(parsedAmount > 0)) return [];
    let left = parsedAmount;
    const slices = [];
    openMonths.forEach((month) => {
      if (left <= 0.001) return;
      const take = Math.min(left, Number(month.available || 0));
      if (take <= 0.001) return;
      slices.push({
        key: `${month.shamsi_year}-${month.shamsi_month}`,
        label: `${month.shamsi_month_name} ${month.shamsi_year}`,
        amount: take,
      });
      left = Math.round((left - take) * 100) / 100;
    });
    return slices;
  }, [parsedAmount, exceedsAvailable, openMonths]);
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedEmployeeId) {
      showToast.error(t("payment.messages.selectEmployee"));
      return;
    }
    if (!expenseCategoryId) {
      showToast.error(t("payment.messages.selectExpenseCategory"));
      return;
    }
    if (!(parsedAmount > 0)) {
      showToast.error(t("payment.messages.invalidAmount"));
      return;
    }
    if (exceedsAvailable && !minusAcknowledged) {
      showToast.error(t("payment.messages.confirmMinus"));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(apiUrl("/employee-payments"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          employee_id: selectedEmployeeId,
          amount: parsedAmount,
          payment_date: gregorianDateStr,
          vault_id: selectedVaultId || undefined,
          expense_category_id: expenseCategoryId,
          payment_method: paymentMethod,
          payment_type_id: paymentTypeId || undefined,
          notes: notes.trim().slice(0, NOTES_MAX_LENGTH),
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(getCleanErrorMessage(body, t("payment.messages.createError")));
      showToast.success(body?.message || t("payment.messages.created"));
      const rows = Array.isArray(body?.data) ? body.data : [];
      setSavedPayment(
        rows.length > 1
          ? {
              ...rows[0],
              amount: parsedAmount,
              shamsi_month_name: rows.map((row) => row.shamsi_month_name).join(" / "),
            }
          : rows[0] || null
      );
      setSlipAfterSave(true);
      setShowReceiptModal(true);
      setAmount("");
      setNotes("");
      setMinusAcknowledged(false);
      if (body?.account) setAccount(body.account);
      setAccountReloadKey((key) => key + 1);
      loadHistory(1);
    } catch (err) {
      showToast.error(getCleanErrorMessage(err, t("payment.messages.createError")));
    } finally {
      setSubmitting(false);
    }
  };
  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(apiUrl(`/employee-payments/${encodeURIComponent(pendingDelete.id)}`), {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(getCleanErrorMessage(body, t("payment.messages.deleteError")));
      showToast.success(body?.message || t("payment.messages.deleted"));
      setPendingDelete(null);
      setAccountReloadKey((key) => key + 1);
      loadHistory(paginationMeta.current_page);
    } catch (err) {
      showToast.error(getCleanErrorMessage(err, t("payment.messages.deleteError")));
    } finally {
      setDeleting(false);
    }
  };
  const datePresets = useMemo(
    () => PRESET_KEYS.map((key) => ({
      key,
      label: ["last_7_days", "last_30_days"].includes(key)
        ? t(`datePreset.${key}`, { ns: "common" })
        : t(`payment.presets.${key}`),
    })),
    [t]
  );
  const sourceFilters = useMemo(
    () => Object.values(PAYMENT_SOURCE).map((key) => ({ key, label: t(`payment.history.source.${key}`) })),
    [t]
  );
  const totals = [
    { key: "totalAmount", value: money(historySummary.total_amount), unit: currency },
    { key: "handAmount", value: money(historySummary.hand_amount), unit: currency },
    { key: "runAmount", value: money(historySummary.run_amount), unit: currency },
    { key: "recordCount", value: String(historySummary.total_count), unit: t("payment.history.unit") },
  ];  return (
    <div className="w-full space-y-4 font-sans" dir="rtl">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-gray-200 pb-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">{t("payment.title")}</h1>
          <p className="text-caption-text text-gray-500 mt-0.5">{t("payment.subtitle")}</p>
        </div>
        <Link to="/salaries" className={BTN_SECONDARY}>
          {t("payment.backToPayroll")}
        </Link>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <form onSubmit={handleSubmit} className={`lg:col-span-7 min-w-0 ${PANEL} p-4 space-y-3.5`}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className={LABEL}>
                {t("payment.form.employee")} <span className="text-rose-600">*</span>
              </label>
              <SearchableSelect
                value={selectedEmployeeId}
                onChange={setSelectedEmployeeId}
                options={employeeOptions}
                placeholder={t("payment.form.employeePlaceholder")}
                searchPlaceholder={t("payment.form.employeeSearch")}
                buttonClassName={FIELD}
              />
            </div>
            <div>
              <label className={LABEL}>
                {t("payment.form.paymentDate")} <span className="text-rose-600">*</span>
              </label>
              <DatePicker
                value={selectedDateObject}
                onChange={(date) => date && setSelectedDateObject(date)}
                calendar={persian}
                locale={persian_af}
                calendarPosition="bottom-right"
                className="rmdp-steel"
                format="YYYY/MM/DD"
                portal
                zIndex={9999}
                inputClass={`${FIELD} font-mono text-center`}
                containerClassName="w-full"
              />
            </div>
          </div>
          <div className="border-t border-gray-200 pt-3.5 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div className="sm:col-span-2">
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <label className={`${LABEL} mb-0`}>
                    {t("payment.form.amount")} <span className="text-rose-600">*</span>
                  </label>
                  <span className="text-caption-text text-gray-500">
                    {t(available < 0 ? "payment.form.owesNow" : "payment.form.availableNow")}{" "}
                    <strong className={`font-mono ${available < 0 ? "text-rose-700" : "text-gray-800"}`} dir="ltr">
                      {money(Math.abs(available))}
                    </strong>
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    onFocus={(event) => event.target.select()}
                    onWheel={(event) => event.target.blur()}
                    className={`w-full bg-white border rounded-input py-2 pr-3 pl-14 text-body-text font-bold font-mono text-gray-800 outline-none ${
                      exceedsAvailable ? "border-rose-400 focus:border-rose-500" : "border-gray-300 focus:border-slate-700"
                    }`}
                    dir="ltr"
                    min="1"
                    step="1"
                    required
                  />
                  <span className="absolute left-3 inset-y-0 flex items-center text-caption-text text-gray-400">
                    {currency}
                  </span>
                </div>
              </div>
              <div className="flex items-stretch gap-2">
                <button
                  type="button"
                  onClick={() => setAmount(String(roundDownToStep(available / 2)))}
                  disabled={available <= 0}
                  className={`${CHIP} ${CHIP_OFF} flex-1`}
                >
                  {t("payment.form.quickHalf")}
                </button>
                <button
                  type="button"
                  onClick={() => setAmount(String(roundDownToStep(available)))}
                  disabled={available <= 0}
                  className={`${CHIP} ${CHIP_OFF} flex-1`}
                >
                  {t("payment.form.quickFull")}
                </button>
              </div>
            </div>
            {exceedsAvailable && (
              <div className="bg-rose-50 border border-rose-200 rounded-badge py-2 px-2.5 space-y-1.5">
                <p className="text-caption-text font-bold text-rose-700">
                  {t("payment.messages.overAvailable", {
                    max: money(available),
                    minus: money(Math.abs(minusAfter)),
                  })}
                </p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={minusAcknowledged}
                    onChange={(event) => setMinusAcknowledged(event.target.checked)}
                    className="cursor-pointer"
                  />
                  <span className="text-caption-text font-bold text-rose-700">
                    {t("payment.messages.acceptMinus")}
                  </span>
                </label>
              </div>
            )}
            {parsedAmount > 0 && (
              <p className="text-caption-text text-gray-600">
                <span className="text-gray-400">{t("payment.form.inWords")}</span> {amountInWords}
              </p>
            )}
            {allocationPreview.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-caption-text">
                <span className="text-gray-400">{t("payment.form.allocationHeading")}</span>
                {allocationPreview.map((slice) => (
                  <span
                    key={slice.key}
                    className="bg-gray-50/70 border border-gray-200 rounded-badge py-0.5 px-2 text-gray-700 font-medium"
                  >
                    {slice.label}{" "}
                    <span className="font-mono font-bold text-gray-800" dir="ltr">
                      {money(slice.amount)}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-gray-200 pt-3.5">
            <div className="min-w-0">
              <label className={LABEL}>
                {t("payment.form.typeLabel")} <span className="text-rose-600">*</span>
              </label>
              <CustomDropdown
                value={paymentTypeId}
                onChange={setPaymentTypeId}
                options={paymentTypeOptions}
                placeholder={t("payment.form.typePlaceholder")}
                buttonClassName={FIELD}
                className="w-full"
                width="w-full"
                align="right"
                usePortal
              />
            </div>
            <div className="min-w-0">
              <label className={LABEL}>{t("payment.form.methodLabel")}</label>
              <CustomDropdown
                value={paymentMethod}
                onChange={setPaymentMethod}
                options={[
                  { value: PAYMENT_METHOD.CASH, label: t("payment.paymentMethod.cash") },
                  { value: PAYMENT_METHOD.EXCHANGE, label: t("payment.paymentMethod.exchange") },
                  { value: PAYMENT_METHOD.BANK, label: t("payment.paymentMethod.bank") },
                ]}
                buttonClassName={FIELD}
                className="w-full"
                width="w-full"
                align="right"
                usePortal
              />
            </div>
            <div className="min-w-0 z-999">
              <label className={LABEL}>
                {t("payment.form.vault")} <span className="text-rose-600">*</span>
              </label>
              <SearchableSelect
                value={selectedVaultId}
                onChange={setSelectedVaultId}
                options={vaultOptions}
                placeholder={t("payment.form.vaultPlaceholder")}
                searchPlaceholder={t("payment.form.vaultSearch")}
                buttonClassName={FIELD}
              />
            </div>
            <div className="min-w-0">
              <label className={LABEL}>
                {t("payment.form.expenseCategory")} <span className="text-rose-600">*</span>
              </label>
              <CustomDropdown
                value={expenseCategoryId}
                onChange={setExpenseCategoryId}
                options={expenseCategoryOptions}
                placeholder={t("payment.form.expenseCategoryPlaceholder")}
                buttonClassName={FIELD}
                className="w-full"
                width="w-full"
                align="right"
                usePortal
                disabled={expenseCategoriesLoading || expenseCategoryOptions.length === 0}
              />
            </div>
          </div>
          <textarea
            rows={3}
            dir="rtl"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            maxLength={NOTES_MAX_LENGTH}
            placeholder={t("payment.form.notesPlaceholder")}
            className={`${FIELD} text-right leading-6 resize-none`}
          />
          <div className="flex items-center justify-end gap-2.5 border-t border-gray-200 pt-3.5">
            <button type="button" onClick={() => navigate("/salaries")} className={BTN_SECONDARY}>
              {t("actions.cancel", { ns: "common" })}
            </button>
            <button type="submit" disabled={!canSubmit} className={BTN_PRIMARY}>
              {submitting ? t("actions.saving", { ns: "common" }) : t("payment.form.submit")}
            </button>
          </div>
        </form>
        <div className={`lg:col-span-5 min-w-0 ${PANEL}`}>
          {accountLoading ? (
            <p className="p-8 text-center text-label-text text-gray-500">{t("payment.account.loading")}</p>
          ) : !selectedEmployee ? (
            <p className="p-8 text-center text-label-text text-gray-500">{t("payment.account.emptyHint")}</p>
          ) : (
            <>
              <div className="p-4 border-b border-gray-200">
                <h2 className={SECTION_TITLE}>{dash(selectedEmployee.full_name, emDash)}</h2>
                <p className="text-caption-text text-gray-500 mt-0.5">
                  <span className="font-mono" dir="ltr">
                    {dash(selectedEmployee.employee_ID, emDash)}
                  </span>
                  {" · "}
                  {dash(selectedEmployee.position || selectedEmployee.jobPosition, emDash)}
                  {" · "}
                  <span className="font-mono" dir="ltr">
                    {money(account?.base_salary ?? selectedEmployee.salary)}
                  </span>
                  {" / "}
                  <span className="font-mono" dir="ltr">
                    {Number(account?.daily_rate || 0).toLocaleString("en-US", { maximumFractionDigits: 1 })}
                  </span>
                </p>
                {account?.account_start ? (
                  <p className="text-caption-text text-gray-400 mt-1 whitespace-normal break-words">
                    {t("payment.account.startsFrom", {
                      month: account.account_start.shamsi_month_name,
                      year: account.account_start.shamsi_year,
                    })}
                  </p>
                ) : null}
              </div>
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-gray-50/70 border-b border-gray-200">
                    <th className={HEAD}>{t("payment.account.colMonth")}</th>
                    <th className={`${HEAD} text-center`}>{t("payment.account.colEarned")}</th>
                    <th className={`${HEAD} text-center`}>{t("payment.account.colPaid")}</th>
                    <th className="p-3 rounded-none text-center text-table-header-text font-bold text-gray-700">
                      {t("payment.account.colRemaining")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-table-cell-text text-gray-800">
                  {(account?.months || []).length === 0 ? (
                    <tr>
                      <td colSpan="4" className="p-6 rounded-none text-center text-gray-500">
                        {t("payment.account.noMonths")}
                      </td>
                    </tr>
                  ) : (
                    (account?.months || []).map((month) => (
                      <tr
                        key={`${month.shamsi_year}-${month.shamsi_month}`}
                        className={month.awaiting_approval || month.is_settled ? "bg-gray-50/70" : ""}
                      >
                        <td className={CELL}>
                          <span className="inline-flex items-center gap-1.5 flex-wrap">
                            {(month.awaiting_approval || month.is_settled) && (
                              <Lock size={14} className="text-gray-400" />
                            )}
                            <span>
                              {month.shamsi_month_name} {month.shamsi_year}
                            </span>
                            {month.awaiting_approval && (
                              <span className="px-1.5 py-0.5 rounded-badge border border-amber-300 bg-amber-50 text-amber-900 text-caption-text font-bold">
                                {t("payment.account.awaiting")}
                              </span>
                            )}
                          </span>
                        </td>
                        <td className={`${CELL} text-center font-mono`} dir="ltr">
                          {money(month.earned)}
                        </td>
                        <td className={`${CELL} text-center font-mono text-gray-500`} dir="ltr">
                          {month.paid > 0 ? `-${money(month.paid)}` : emDash}
                        </td>
                        <td
                          className={`p-3 rounded-none text-center font-mono font-bold ${
                            month.overpaid > 0 ? "text-rose-700" : month.is_settled ? "text-gray-400" : "text-gray-800"
                          }`}
                          dir="ltr"
                        >
                          {month.overpaid > 0 ? `-${money(month.overpaid)}` : money(month.remaining)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {Number(account?.overpaid || 0) > 0 && (
                <p className="m-4 bg-rose-50 text-rose-700 border border-rose-200 rounded-badge py-1.5 px-2.5 text-caption-text font-bold">
                  {t("payment.account.overpaidWarning", { amount: money(account.overpaid) })}
                </p>
              )}
              <div className="p-4 border-t border-gray-200 bg-gray-50/70 flex items-baseline justify-between gap-2">
                <span className="text-label-text text-gray-700 font-bold">
                  {t(available < 0 ? "payment.account.owesTitle" : "payment.account.availableTitle")}
                </span>
                <span
                  className={`font-mono font-bold text-base sm:text-lg ${available < 0 ? "text-rose-700" : "text-gray-900"}`}
                  dir="ltr"
                >
                  {money(Math.abs(available))}{" "}
                  <span className="text-caption-text font-sans font-normal text-gray-400">{currency}</span>
                </span>
              </div>
            </>
          )}
        </div>
      </div>
      <div className={PANEL}>
        <div className="p-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2.5">
          <h2 className={SECTION_TITLE}>
            {t("payment.history.heading")}
            <span className="font-mono text-caption-text font-normal text-gray-500 mr-2" dir="ltr">
              {paginationMeta.total}
            </span>
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {sourceFilters.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => setHistorySourceFilter(filter.key)}
                className={`${CHIP} ${historySourceFilter === filter.key ? CHIP_ON : CHIP_OFF}`}
              >
                {filter.label}
              </button>
            ))}
            <TooltipButton
              icon={<RotateCcw size={15} className={paymentsLoading ? "animate-spin" : ""} />}
              tooltip={t("payment.history.refresh")}
              onClick={() => loadHistory(paginationMeta.current_page)}
              disabled={paymentsLoading}
              colorClass={`${ACTION_REST} hover:bg-gray-50 hover:text-gray-700`}
            />
          </div>
        </div>
        <div className="p-4 border-b border-gray-200 bg-gray-50/70 grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
          <div className="md:col-span-5">
            <FilterPresetButtons
              presets={datePresets}
              activeKey={activePreset}
              onChange={applyPreset}
              buttonClassName="px-3 py-1.5 rounded-pill text-caption-text"
              className="flex flex-wrap items-center gap-2"
            />
          </div>
          <div className="md:col-span-2">
            <DatePicker
              value={filterStartDate}
              onChange={(date) => {
                setActivePreset(DATE_PRESET.CUSTOM);
                setFilterStartDate(date);
              }}
              calendar={persian}
              locale={persian_af}
              format="YYYY/MM/DD"
              inputClass={`${FILTER_FIELD} font-mono text-center`}
              placeholder={t("payment.history.fromPlaceholder")}
            />
          </div>
          <div className="md:col-span-2">
            <DatePicker
              value={filterEndDate}
              onChange={(date) => {
                setActivePreset(DATE_PRESET.CUSTOM);
                setFilterEndDate(date);
              }}
              calendar={persian}
              locale={persian_af}
              format="YYYY/MM/DD"
              inputClass={`${FILTER_FIELD} font-mono text-center`}
              placeholder={t("payment.history.toPlaceholder")}
            />
          </div>
          <div className="md:col-span-3 grid grid-cols-2 gap-2.5">
            <BranchSelect
              variant="searchable"
              value={historyBranchFilter}
              onChange={setHistoryBranchFilter}
              includeAll
              allLabel={t("payment.history.branchAll")}
              placeholder={t("payment.history.branchPlaceholder")}
              buttonClassName={FILTER_FIELD}
            />
            <div className="relative">
              <Search size={14} className="text-gray-400 absolute right-2.5 top-2" />
              <input
                type="text"
                value={historySearchTerm}
                onChange={(event) => setHistorySearchTerm(event.target.value)}
                placeholder={t("payment.history.searchPlaceholder")}
                className={`${FILTER_FIELD} pr-8`}
              />
            </div>
          </div>
        </div>
        <div className="px-4 py-2.5 border-b border-gray-200 flex flex-wrap gap-x-6 gap-y-1.5">
          {totals.map((total) => (
            <span key={total.key} className="text-caption-text">
              <span className="text-gray-500">{t(`payment.history.${total.key}`)}</span>{" "}
              <strong className="font-mono text-gray-800" dir="ltr">
                {total.value}
              </strong>{" "}
              <span className="text-gray-400">{total.unit}</span>
            </span>
          ))}
        </div>
        {paymentsLoading ? (
          <p className="py-12 text-center text-label-text text-gray-500">{t("payment.history.loading")}</p>
        ) : payments.length === 0 ? (
          <p className="py-12 text-center text-label-text text-gray-500">{t("payment.history.empty")}</p>
        ) : (
          <>
            <div className="w-full overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-gray-50/70 border-b border-gray-200">
                    <th className={`${HEAD} text-center w-12`}>{t("table.rowIndex", { ns: "common" })}</th>
                    <th className={HEAD}>{t("payment.history.columns.receipt")}</th>
                    <th className={`${HEAD} text-center`}>{t("payment.history.columns.paymentDate")}</th>
                    <th className={`${HEAD} text-center`}>{t("payment.history.columns.forMonth")}</th>
                    <th className={`${HEAD} text-center`}>{t("payment.history.columns.employeeCode")}</th>
                    <th className={HEAD}>{t("payment.history.columns.employeeName")}</th>
                    <th className={`${HEAD} text-center`}>{t("payment.history.columns.type")}</th>
                    <th className={HEAD}>{t("payment.history.columns.vault")}</th>
                    <th className={`${HEAD} text-center`}>{t("payment.history.columns.amount")}</th>
                    <th className={HEAD}>{t("payment.history.columns.paidBy")}</th>
                    <th className={HEAD}>{t("payment.history.columns.description")}</th>
                    <th className="p-3 rounded-none text-center text-table-header-text font-bold text-gray-700 w-36">
                      {t("table.actions", { ns: "common" })}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-table-cell-text text-gray-800">
                  {payments.map((payment, index) => {
                    const fromRun = isFromPayrollRun(payment);
                    return (
                      <tr key={payment.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className={`${CELL} text-center font-mono text-gray-500`} dir="ltr">
                          {(paginationMeta.current_page - 1) * paginationMeta.per_page + index + 1}
                        </td>
                        <td className={`${CELL} font-mono whitespace-nowrap`} dir="ltr">
                          {payment.receipt_number}
                        </td>
                        <td className={`${CELL} text-center font-mono whitespace-nowrap`} dir="ltr">
                          {toEnglishDigits(payment.shamsi_date)}
                        </td>
                        <td className={`${CELL} text-center whitespace-nowrap`}>
                          {payment.shamsi_month_name}{" "}
                          <span className="font-mono" dir="ltr">
                            {payment.shamsi_year}
                          </span>
                        </td>
                        <td className={`${CELL} text-center font-mono whitespace-nowrap`} dir="ltr">
                          {dash(payment.employee?.employee_ID, emDash)}
                        </td>
                        <td className={`${CELL} whitespace-normal break-words`}>
                          <span className="font-bold">{dash(payment.employee?.full_name, emDash)}</span>
                        </td>
                        <td className={`${CELL} text-center whitespace-normal break-words`}>
                          <span className={fromRun ? "text-gray-500" : "font-bold"}>
                            {payment.payment_type?.name ||
                              t(fromRun ? "payment.history.badge.payroll" : "payment.history.badge.hand")}
                          </span>
                        </td>
                        <td className={`${CELL} whitespace-normal break-words`}>
                          {dash(payment.vault?.name, emDash)}
                        </td>
                        <td className={`${CELL} text-center font-mono font-bold`} dir="ltr">
                          {money(payment.amount)}
                        </td>
                        <td className={`${CELL} whitespace-nowrap`}>{dash(payment.paid_by?.name, emDash)}</td>
                        <td className={`${CELL} text-gray-600 whitespace-normal break-words`}>
                          {dash(payment.notes, emDash)}
                        </td>
                        <td className="p-3 rounded-none">
                          <div className="flex items-center justify-center gap-1.5">
                            <TooltipButton
                              icon={<Printer size={15} />}
                              tooltip={t("payment.history.tooltip.reprint")}
                              onClick={() => {
                                setSavedPayment(payment);
                                setSlipAfterSave(false);
                                setShowReceiptModal(true);
                              }}
                              colorClass={`${ACTION_REST} hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200`}
                            />
                            {canDelete && !fromRun && (
                              <TooltipButton
                                icon={<Trash2 size={15} />}
                                tooltip={t("payment.history.tooltip.delete")}
                                onClick={() => setPendingDelete(payment)}
                                colorClass={`${ACTION_REST} hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200`}
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
            <div className="p-4 border-t border-gray-200">
              <TablePagination
                currentPage={paginationMeta.current_page}
                lastPage={paginationMeta.last_page}
                totalPages={paginationMeta.last_page}
                total={paginationMeta.total}
                totalEntries={paginationMeta.total}
                perPage={perPage}
                onPageChange={loadHistory}
                onPerPageChange={setPerPage}
                unit={t("payment.history.unit")}
              />
            </div>
          </>
        )}
      </div>
      <DeleteConfirmationModal
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        itemName={pendingDelete?.receipt_number}
        title={t("payment.delete.title")}
        question={t("payment.delete.question")}
        warning={t("payment.delete.warning")}
      />
      <PaymentSlipModal
        isOpen={showReceiptModal}
        payment={savedPayment}
        onClose={() => {
          setShowReceiptModal(false);
          if (slipAfterSave) {
            setSlipAfterSave(false);
            navigate("/salaries");
          }
        }}
      />
    </div>
  );
}
