import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingDown,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Lock,
} from "lucide-react";
import DatePicker from "react-multi-date-picker";
import { DateObject, persian, persian_af } from "../../utils/dateHelpers";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import { apiUrl } from "../../api";
import SearchableSelect from "../common/SearchableSelect";
import CustomDropdown from "../common/CustomDropdown";
import { formatTimeDari, toEnglishDigits } from "../../utils";
import { exceedsBalance } from "../../utils/vaultBalance";
import { useTranslation } from "react-i18next";
const fmt = (n) => Number(n || 0).toLocaleString("en-US");
const EMPTY_FORM = {
  payment_source: "vault_direct",
  vault_id: "",
  manager_advance_id: "",
  expense_category_id: "",
  amount: "",
  currency: "",
  exchange_rate: "1",
  paid_to: "",
  description: "",
};
function Section({ title, children }) {
  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-3.5 py-2 bg-gray-50 border-b border-gray-200">
        <span className="text-[11px] font-bold text-slate-700">{title}</span>
      </div>
      <div className="p-3.5 space-y-3">{children}</div>
    </div>
  );
}
export default function ExpenseCreateModal({
  isOpen,
  onClose,
  onSuccess,
  vaults: initialVaults = [],
  expenseType = null,
}) {
  useBodyScrollLock(isOpen);
  const { t: tx } = useTranslation("expenses");
  const currencyOptions = [
    { value: "AFN", label: tx("createModal.currencyAfn") },
    { value: "USD", label: tx("createModal.currencyUsd") },
    { value: "IRR", label: tx("createModal.currencyIrr") },
  ];
  const [vaults, setVaults] = useState(initialVaults);
  const [advances, setAdvances] = useState([]);
  const [categories, setCategories] = useState([]);
  const [usdRate, setUsdRate] = useState(70);
  const [loadingResources, setLoadingResources] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [dateObj, setDateObj] = useState(
    () => new DateObject({ calendar: persian, locale: persian_af })
  );
  const typeSlug = expenseType?.slug || null;
  const navigate = useNavigate();
  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage("");
    setFieldErrors({});
    setFormData(EMPTY_FORM);
    setDateObj(new DateObject({ calendar: persian, locale: persian_af }));
    const loadData = async () => {
      setLoadingResources(true);
      try {
        const defaultsUrl = typeSlug
          ? `/expenses/form-defaults?expense_type=${encodeURIComponent(typeSlug)}`
          : "/expenses/form-defaults";
        const [vRes, aRes, dRes] = await Promise.all([
          fetch(apiUrl("/vaults")),
          fetch(apiUrl("/manager-advances")),
          fetch(apiUrl(defaultsUrl)),
        ]);
        const vaultList = vRes?.ok
          ? await vRes.json().then((d) => (Array.isArray(d.data) ? d.data : Array.isArray(d) ? d : []))
          : [];
        setVaults(vaultList);
        const advList = aRes?.ok ? await aRes.json().then((d) => (Array.isArray(d.data) ? d.data : [])) : [];
        const openAdvances = advList.filter((a) => a.status === "open" && a.remaining > 0);
        setAdvances(openAdvances);
        const defaults = dRes?.ok ? await dRes.json() : null;
        const cats = Array.isArray(defaults?.categories) ? defaults.categories : [];
        setCategories(cats);
        if (defaults?.usd_rate) setUsdRate(Number(defaults.usd_rate));
        const sug = defaults?.defaults || {};
        const source =
          sug.payment_source === "manager_advance" && openAdvances.length > 0
            ? "manager_advance"
            : "vault_direct";
        const suggestedCat = cats.find((c) => String(c.id) === String(sug.expense_category_id));
        setFormData((prev) => ({
          ...prev,
          payment_source: source,
          vault_id: "",
          manager_advance_id: String(openAdvances[0]?.id || ""),
          expense_category_id: String(suggestedCat?.id || cats[0]?.id || ""),
        }));
      } catch (err) {
        console.error("Error loading resources for expense modal:", err);
        setErrorMessage(tx("createModal.loadError"));
      } finally {
        setLoadingResources(false);
      }
    };
    loadData();
  }, [isOpen, typeSlug]);
  const isVaultDirect = formData.payment_source === "vault_direct";
  const selectedVault = useMemo(
    () => vaults.find((v) => String(v.id) === String(formData.vault_id)) || null,
    [vaults, formData.vault_id]
  );
  const selectedAdvance = useMemo(
    () => advances.find((a) => String(a.id) === String(formData.manager_advance_id)) || null,
    [advances, formData.manager_advance_id]
  );
  const sourceCurrency = String(
    (isVaultDirect ? selectedVault?.currency : selectedAdvance?.currency) || "AFN"
  ).toUpperCase();
  const availableBalance = isVaultDirect
    ? Number(selectedVault?.current_balance || 0)
    : Number(selectedAdvance?.remaining || 0);
  const expenseCurrency = String(formData.currency || sourceCurrency).toUpperCase();
  const needsRate = expenseCurrency !== sourceCurrency;
  const defaultRateFor = (source, target) => {
    if (source === target) return "1";
    if (source === "AFN" && target === "USD") return String(usdRate);
    if (source === "USD" && target === "AFN") return usdRate > 0 ? (1 / usdRate).toFixed(4) : "1";
    return "";
  };
  useEffect(() => {
    setFormData((prev) => ({ ...prev, currency: sourceCurrency, exchange_rate: "1" }));
  }, [sourceCurrency]);
  if (!isOpen) return null;
  const enteredAmount = parseFloat(toEnglishDigits(formData.amount) || "0");
  const rawRate = parseFloat(toEnglishDigits(formData.exchange_rate) || "0");
  const effectiveRate = needsRate ? (rawRate > 0 ? rawRate : 0) : 1;
  const vaultDeduction = Math.round(enteredAmount * effectiveRate * 100) / 100;
  const isOverBalance = isVaultDirect
    ? exceedsBalance(selectedVault, availableBalance, vaultDeduction)
    : vaultDeduction > availableBalance;
  const toUsd = (value, curr) => {
    if (curr === "USD") return value;
    if (curr === "AFN") return usdRate > 0 ? value / usdRate : null;
    return null;
  };
  const convertedUsdValue = toUsd(enteredAmount, expenseCurrency) ?? toUsd(vaultDeduction, sourceCurrency);
  const convertedUsdPreview = convertedUsdValue === null ? null : convertedUsdValue.toFixed(2);
  const resolvedCategoryName =
    categories.find((c) => String(c.id) === String(formData.expense_category_id))?.name || "";
  const validate = () => {
    const errors = {};
    if (isVaultDirect && !formData.vault_id) {
      errors.vault_id = tx("createModal.errorVault");
    }
    if (!isVaultDirect && !formData.manager_advance_id) {
      errors.manager_advance_id = tx("createModal.errorAdvance");
    }
    if (!resolvedCategoryName) {
      errors.category =
        categories.length === 0
          ? tx("createModal.errorNoCategoryType")
          : tx("createModal.errorCategory");
    }
    if (!formData.amount || enteredAmount <= 0) {
      errors.amount = tx("createModal.errorAmount");
    }
    if (!formData.paid_to.trim()) {
      errors.paid_to = tx("createModal.errorPaidTo");
    }
    if (needsRate && !(rawRate > 0)) {
      errors.exchange_rate = tx("createModal.errorRate");
    }
    if ((selectedVault || !isVaultDirect) && isOverBalance) {
      errors.amount = tx("createModal.errorBalance", { amount: `${fmt(availableBalance)} ${sourceCurrency}` });
    }
    if (!formData.description.trim()) {
      errors.description = tx("createModal.errorDescription");
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    if (!validate()) {
      setErrorMessage(tx("createModal.errorFix"));
      return;
    }
    setSubmitting(true);
    try {
      const gDate = dateObj.toDate();
      const y = gDate.getFullYear();
      const m = String(gDate.getMonth() + 1).padStart(2, "0");
      const d = String(gDate.getDate()).padStart(2, "0");
      const gregStr = `${y}-${m}-${d}`;
      const shamsiStr = toEnglishDigits(dateObj.format("YYYY/MM/DD"));
      const payload = {
        payment_source: formData.payment_source,
        vault_id: isVaultDirect ? Number(formData.vault_id) : null,
        manager_advance_id: !isVaultDirect ? formData.manager_advance_id : null,
        expense_category_id: formData.expense_category_id ? parseInt(formData.expense_category_id) : null,
        amount: enteredAmount,
        currency: expenseCurrency,
        exchange_rate: effectiveRate,
        paid_to: formData.paid_to.trim(),
        shamsi_date: shamsiStr,
        expense_date: gregStr,
        title: resolvedCategoryName,
        description: formData.description.trim(),
      };
      const res = await fetch(apiUrl("/expenses"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || tx("createModal.saveError"));
      }
      if (onSuccess) onSuccess(json);
      onClose();
    } catch (err) {
      setErrorMessage(err.message || tx("createModal.serverError"));
    } finally {
      setSubmitting(false);
    }
  };
  const advanceOptions = advances.map((a) => ({
    value: String(a.id),
    label: tx("createModal.advanceLabel", { holder: a.receiver_name || a.employee?.full_name || tx("createModal.defaultHolder"), remaining: fmt(a.remaining), currency: a.currency }),
  }));
  const vaultOptions = vaults.map((v) => ({
    value: String(v.id),
    label: `${v.name} — ${fmt(v.current_balance)} ${String(v.currency || "AFN").toUpperCase()}`,
  }));
  const categoryOptions = categories.map((c) => ({
    value: String(c.id),
    label: c.name,
  }));
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs font-sans"
      dir="rtl"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl border border-gray-200 overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
              <TrendingDown size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">{tx("createModal.title")}</h2>
              <p className="text-xs text-gray-500">
                {expenseType ? expenseType.name : tx("createModal.generalTitle")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-3.5">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs font-bold flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
          {expenseType && (
            <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg bg-amber-50 border border-amber-200">
              <div className="min-w-0">
                <span className="block text-[10px] font-bold text-amber-800">{tx("createModal.typeLabel")}</span>
                <span className="block text-xs font-black text-amber-900 truncate">
                  {expenseType.name}
                </span>
              </div>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-200 rounded-md px-2 py-0.5 shrink-0">
                {tx("createModal.locked")}
              </span>
            </div>
          )}
          {loadingResources && (
            <div className="flex items-center justify-center gap-2 py-2 text-xs font-bold text-gray-500">
              <Loader2 size={14} className="animate-spin" />
              <span>{tx("createModal.loading")}</span>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3.5">
          <Section title={tx("createModal.sourceSection")}>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, payment_source: "vault_direct" })}
                className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  isVaultDirect
                    ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                <span>{tx("createModal.fromVault")}</span>
              </button>
              <button
                type="button"
                disabled={advances.length === 0}
                onClick={() => setFormData({ ...formData, payment_source: "manager_advance" })}
                className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  !isVaultDirect
                    ? "bg-slate-900 text-white border-slate-900 shadow-xs cursor-pointer"
                    : advances.length === 0
                    ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 cursor-pointer"
                }`}
              >
                <span>{tx("createModal.fromAdvance")}</span>
              </button>
            </div>
            {isVaultDirect ? (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {tx("createModal.vault")} <span className="text-rose-600">*</span>
                </label>
                <SearchableSelect
                  options={vaultOptions}
                  value={formData.vault_id}
                  onChange={(val) => setFormData({ ...formData, vault_id: val })}
                  placeholder={tx("createModal.vaultPlaceholder")}
                  searchPlaceholder={tx("createModal.vaultSearch")}
                  usePortal={true}
                  buttonClassName={`w-full border rounded-lg px-3 py-2 text-sm font-bold bg-white outline-none ${
                    fieldErrors.vault_id ? "border-rose-500" : "border-gray-300"
                  }`}
                />
                {fieldErrors.vault_id && (
                  <span className="text-[10px] text-rose-600 font-bold block mt-0.5">
                    {fieldErrors.vault_id}
                  </span>
                )}
                {selectedVault && (
                  <div className="flex justify-between items-center mt-1.5 text-[11px] text-gray-500 font-mono">
                    <span>{tx("createModal.vaultBalance")}</span>
                    <span className="font-bold text-emerald-700 text-xs">
                      {fmt(selectedVault.current_balance)} {sourceCurrency}
                    </span>
                  </div>
                )}
                <p className="mt-2 rounded-card bg-amber-50 border border-amber-200 px-3 py-2 text-caption-text text-amber-800">
                  {tx("createModal.immediateDeduction")}
                </p>
              </div>
            ) : (
              <div>
                <SearchableSelect
                  options={advanceOptions}
                  value={formData.manager_advance_id}
                  onChange={(val) => setFormData({ ...formData, manager_advance_id: val })}
                  placeholder={tx("createModal.advancePlaceholder")}
                  searchPlaceholder={tx("createModal.advanceSearch")}
                  usePortal={true}
                  buttonClassName={`w-full border rounded-lg px-3 py-2 text-sm font-bold bg-white outline-none ${
                    fieldErrors.manager_advance_id ? "border-rose-500" : "border-gray-300"
                  }`}
                />
                {selectedAdvance && (
                  <div className="flex justify-between items-center mt-1.5 text-[11px] text-gray-500 font-mono">
                    <span>{tx("createModal.advanceBalance")}</span>
                    <span className="font-bold text-emerald-700 text-xs">
                      {fmt(selectedAdvance.remaining)} {selectedAdvance.currency}
                    </span>
                  </div>
                )}
              </div>
            )}
          </Section>
          <Section title={tx("createModal.detailsSection")}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {tx("table.category")} <span className="text-rose-600">*</span>
                </label>
                {categories.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs">
                    <p className="font-bold text-amber-900">
                      {tx("createModal.noCategoryType")}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        navigate("/settings?tab=categories&domain=expense_category");
                      }}
                      className="mt-1.5 font-bold text-blue-700 hover:underline cursor-pointer"
                    >
                      {tx("createModal.createCategory")}
                    </button>
                  </div>
                ) : (
                  <SearchableSelect
                    options={categoryOptions}
                    value={formData.expense_category_id}
                    onChange={(val) => setFormData({ ...formData, expense_category_id: val })}
                    placeholder={tx("createModal.categoryPlaceholder")}
                    searchPlaceholder={tx("createModal.categorySearch")}
                    usePortal={true}
                    buttonClassName={`w-full border rounded-lg px-3 py-2 text-sm font-bold bg-white outline-none ${
                      fieldErrors.category ? "border-rose-500" : "border-gray-300"
                    }`}
                  />
                )}
                {fieldErrors.category && (
                  <span className="text-[10px] text-rose-600 font-bold block mt-0.5">
                    {fieldErrors.category}
                  </span>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {tx("createModal.currency")} <span className="text-rose-600">*</span>
                </label>
                <CustomDropdown
                  options={currencyOptions}
                  value={expenseCurrency}
                  onChange={(val) => setFormData({ ...formData, currency: val, exchange_rate: defaultRateFor(sourceCurrency, val) })}
                  usePortal={true}
                  buttonClassName="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold bg-white outline-none text-right"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {tx("createModal.amountLabel", { currency: expenseCurrency })} <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  dir="ltr"
                  onFocus={(e) => e.target.select()}
                  onWheel={(e) => e.target.blur()}
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0"
                  className={`w-full border rounded-lg px-3 py-2 text-base font-black font-mono focus:outline-none focus:border-slate-800 ${
                    fieldErrors.amount ? "border-rose-500 bg-rose-50/40" : "border-gray-300 bg-white"
                  }`}
                />
                {isOverBalance && (
                  <span className="text-[10px] text-rose-600 font-bold block mt-1">
                    {tx("createModal.overBalance")}
                  </span>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {tx("table.exchangeRate")}
                  {needsRate && <span className="text-rose-600"> *</span>}
                </label>
                {needsRate ? (
                  <input
                    type="number"
                    min="0.0001"
                    step="any"
                    dir="ltr"
                    onFocus={(e) => e.target.select()}
                    onWheel={(e) => e.target.blur()}
                    value={formData.exchange_rate}
                    onChange={(e) => setFormData({ ...formData, exchange_rate: e.target.value })}
                    placeholder="70.50"
                    className={`w-full border rounded-lg px-3 py-2 text-sm font-black font-mono focus:outline-none focus:border-slate-800 ${
                      fieldErrors.exchange_rate ? "border-rose-500 bg-rose-50/40" : "border-gray-300 bg-white"
                    }`}
                  />
                ) : (
                  <div className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-black font-mono bg-gray-50 text-gray-500 flex items-center justify-between">
                    <span>1</span>
                    <Lock size={12} className="text-gray-400" />
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                {tx("createModal.date")} <span className="text-rose-600">*</span>
              </label>
              <DatePicker
                value={dateObj}
                onChange={setDateObj}
                calendar={persian}
                locale={persian_af}
                format="YYYY/MM/DD"
                inputClass="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-slate-800 bg-white"
                containerStyle={{ width: "100%" }}
              />
            </div>
          </Section>
          </div>
          <div className="space-y-3.5">
          <Section title={tx("createModal.documentSection")}>
            <div className="grid grid-cols-3 gap-2">
              <div className="px-2.5 py-2 rounded-lg bg-gray-50 border border-gray-200">
                <span className="block text-[9.5px] font-bold text-gray-500">{tx("createModal.deductFrom")}</span>
                <span className="block text-xs font-black font-mono text-rose-700 mt-0.5" dir="ltr">
                  {fmt(vaultDeduction)} {sourceCurrency}
                </span>
              </div>
              <div className="px-2.5 py-2 rounded-lg bg-gray-50 border border-gray-200">
                <span className="block text-[9.5px] font-bold text-gray-500">{tx("table.convertedUsd")}</span>
                <span className="block text-xs font-black font-mono text-blue-700 mt-0.5" dir="ltr">
                  {convertedUsdPreview === null ? "—" : `$${fmt(convertedUsdPreview)}`}
                </span>
              </div>
              <div className="px-2.5 py-2 rounded-lg bg-gray-50 border border-gray-200">
                <span className="block text-[9.5px] font-bold text-gray-500">{tx("createModal.entryTime")}</span>
                <span className="block text-xs font-black font-mono text-gray-700 mt-0.5" dir="ltr">
                  {formatTimeDari(new Date())}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                {tx("createModal.paidTo")} <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={formData.paid_to}
                maxLength={150}
                onChange={(e) => {
                  setFormData({ ...formData, paid_to: e.target.value });
                  setFieldErrors((prev) => ({ ...prev, paid_to: null }));
                }}
                placeholder={tx("createModal.paidToPlaceholder")}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-800 ${
                  fieldErrors.paid_to ? "border-rose-500 bg-rose-50/40" : "border-gray-300 bg-white"
                }`}
              />
              {fieldErrors.paid_to && (
                <span className="text-[10px] text-rose-600 font-bold block mt-0.5">
                  {fieldErrors.paid_to}
                </span>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                {tx("createModal.description")} <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={tx("createModal.descriptionPlaceholder")}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-800 resize-none ${
                  fieldErrors.description ? "border-rose-500 bg-rose-50/40" : "border-gray-300 bg-white"
                }`}
              />
              {fieldErrors.description && (
                <span className="text-[10px] text-rose-600 font-bold block mt-0.5">
                  {fieldErrors.description}
                </span>
              )}
            </div>
          </Section>
          </div>
          </div>
        </form>
        <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50 border-t border-gray-200 shrink-0">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-500">{tx("createModal.finalDeduction")}</span>
            <span className="text-sm font-black font-mono text-rose-700" dir="ltr">
              {fmt(vaultDeduction)} {sourceCurrency}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-200 bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              {tx("actions.cancel", { ns: "common" })}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || isOverBalance}
              className={`px-5 py-2 text-xs font-black text-white rounded-lg flex items-center gap-1.5 transition-all shadow-xs ${
                submitting || isOverBalance
                  ? "bg-slate-400 cursor-not-allowed"
                  : "bg-slate-900 hover:bg-slate-800 cursor-pointer"
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>{tx("createModal.saving")}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  <span>{tx("createModal.submit")}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
