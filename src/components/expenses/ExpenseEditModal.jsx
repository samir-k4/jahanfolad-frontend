import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import DatePicker from "react-multi-date-picker";
import { Loader2, Pencil, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { apiUrl } from "../../api";
import { getTodayAfghan, persian, persian_af, toAfghanDate, toEnglishDigits } from "../../utils/dateHelpers";
import { CustomDropdown, SearchableSelect } from "../common";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useExpenseCategories from "../../hooks/useExpenseCategories";

const FIELD =
  "w-full h-10 bg-white border border-gray-300 focus:border-slate-800 rounded-input px-3 text-body-text text-gray-900 outline-none transition-colors";

const currencyOptions = (t) => [
  { value: "AFN", label: t("createModal.currencyAfn") },
  { value: "USD", label: t("createModal.currencyUsd") },
  { value: "IRR", label: t("createModal.currencyIrr") },
];

const formatAmount = (value) => Number(value || 0).toLocaleString("en-US");

export default function ExpenseEditModal({ isOpen, expense, onClose, onDone }) {
  useBodyScrollLock(isOpen);
  const { t } = useTranslation("expenses");
  const { categories } = useExpenseCategories(isOpen);
  const [vaults, setVaults] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [form, setForm] = useState({});
  const [dateObj, setDateObj] = useState(getTodayAfghan());
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !expense) return;
    setForm({
      payment_source: expense.payment_source || "vault_direct",
      vault_id: expense.vault_id ? String(expense.vault_id) : "",
      manager_advance_id: expense.manager_advance_id ? String(expense.manager_advance_id) : "",
      expense_category_id: expense.category_id && expense.category_id !== "other" ? String(expense.category_id) : "",
      amount: String(expense.amount ?? ""),
      currency: String(expense.currency || "AFN").toUpperCase(),
      exchange_rate: String(expense.exchange_rate || "1"),
      paid_to: expense.paid_to && expense.paid_to !== "—" ? expense.paid_to : "",
      title: expense.title || "",
      description: expense.description || "",
    });
    setDateObj(toAfghanDate(expense.transaction_date) || getTodayAfghan());
    setError("");

    const loadSources = async () => {
      setResourcesLoading(true);
      try {
        const [vaultResponse, advancesResponse] = await Promise.all([
          fetch(apiUrl("/vaults")),
          fetch(apiUrl("/manager-advances?per_page=100")),
        ]);
        if (!vaultResponse.ok || !advancesResponse.ok) {
          throw new Error(t("editModal.loadError"));
        }
        const [vaultData, advanceData] = await Promise.all([
          vaultResponse.json(),
          advancesResponse.json(),
        ]);
        setVaults(Array.isArray(vaultData.data) ? vaultData.data : Array.isArray(vaultData) ? vaultData : []);
        setAdvances(Array.isArray(advanceData.data) ? advanceData.data : []);
      } catch (loadError) {
        console.error("Error loading sources for expense edit:", loadError);
        setError(loadError.message || t("editModal.loadError"));
      } finally {
        setResourcesLoading(false);
      }
    };
    loadSources();
  }, [isOpen, expense, t]);

  const isVaultDirect = form.payment_source === "vault_direct";
  const selectedVault = useMemo(
    () => vaults.find((vault) => String(vault.id) === String(form.vault_id)) || null,
    [vaults, form.vault_id]
  );
  const selectedAdvance = useMemo(
    () => advances.find((advance) => String(advance.id) === String(form.manager_advance_id)) || null,
    [advances, form.manager_advance_id]
  );
  const sourceCurrency = String(
    (isVaultDirect ? selectedVault?.currency : selectedAdvance?.currency) ||
      expense?.source_currency ||
      expense?.vault_currency ||
      "AFN"
  ).toUpperCase();

  const categoryOptions = useMemo(() => {
    const options = categories.map((category) => ({
      value: String(category.id),
      label: category.name,
    }));
    if (
      expense?.category_id &&
      expense.category_id !== "other" &&
      !options.some((option) => option.value === String(expense.category_id))
    ) {
      options.push({
        value: String(expense.category_id),
        label: expense.category_title || String(expense.category_id),
      });
    }
    return options;
  }, [categories, expense]);

  if (!isOpen || !expense) return null;

  const vaultOptions = vaults.map((vault) => ({
    value: String(vault.id),
    label: `${vault.name} — ${formatAmount(vault.current_balance)} ${String(vault.currency || "AFN").toUpperCase()}`,
  }));
  const advanceOptions = advances.map((advance) => ({
    value: String(advance.id),
    label: `${advance.receiver_name || advance.employee?.full_name || t("createModal.defaultHolder")} — ${formatAmount(advance.remaining)} ${String(advance.currency || "AFN").toUpperCase()}`,
  }));

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const changeSource = (paymentSource) => {
    const sourceList = paymentSource === "vault_direct" ? vaults : advances;
    const selectedField = paymentSource === "vault_direct" ? "vault_id" : "manager_advance_id";
    const currentSelectedField = paymentSource === "vault_direct" ? "vault_id" : "manager_advance_id";
    const fallbackSource = paymentSource === "vault_direct"
      ? sourceList[0]
      : sourceList.find((advance) => advance.status === "open" && Number(advance.remaining) > 0) || sourceList[0];
    setForm((current) => ({
      ...current,
      payment_source: paymentSource,
      [selectedField]: current.payment_source === paymentSource
        ? current[currentSelectedField]
        : String(fallbackSource?.id || ""),
    }));
  };

  const submit = async () => {
    const amount = Number(toEnglishDigits(form.amount || "0"));
    const rate = Number(toEnglishDigits(form.exchange_rate || "0"));
    if (!form.expense_category_id) {
      setError(t("editModal.errorCategory"));
      return;
    }
    if (!(amount > 0)) {
      setError(t("payModal.errorAmount"));
      return;
    }
    if (!form.paid_to?.trim()) {
      setError(t("editModal.errorPaidTo"));
      return;
    }
    if (!form.description?.trim()) {
      setError(t("editModal.errorDescription"));
      return;
    }
    if (!isVaultDirect && !form.manager_advance_id) {
      setError(t("createModal.errorAdvance"));
      return;
    }
    if (isVaultDirect && !form.vault_id) {
      setError(t("createModal.errorVault"));
      return;
    }
    if (form.currency !== sourceCurrency && !(rate > 0)) {
      setError(t("createModal.errorRate"));
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      const response = await fetch(apiUrl(expense.update_url || `/expenses/${expense.id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          payment_source: form.payment_source,
          vault_id: isVaultDirect ? Number(form.vault_id) : null,
          manager_advance_id: isVaultDirect ? null : Number(form.manager_advance_id),
          expense_category_id: Number(form.expense_category_id),
          amount,
          currency: form.currency,
          exchange_rate: form.currency === sourceCurrency ? 1 : rate,
          paid_to: form.paid_to.trim(),
          description: form.description.trim(),
          title: form.title.trim(),
          shamsi_date: toEnglishDigits(dateObj.format("YYYY/MM/DD")),
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message || t("toast.updateError"));
      onDone?.(result?.message || "");
      onClose?.();
    } catch (saveError) {
      setError(saveError.message || t("toast.updateError"));
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" dir="rtl">
      <div className="bg-white rounded-modal border border-gray-200 shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto font-sans">
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-5 py-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-9 h-9 rounded-btn flex items-center justify-center shrink-0 bg-blue-50 text-blue-600">
              <Pencil size={17} />
            </span>
            <div className="min-w-0">
              <h3 className="text-section-title font-bold text-gray-900">{t("editModal.title")}</h3>
              <p className="text-caption-text text-gray-500 mt-0.5">
                {t("editModal.subtitle", { voucher: expense.voucher_no || `#${expense.id}` })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label={t("actions.cancel", { ns: "common" })}
            className="p-1 text-gray-400 hover:text-gray-700 cursor-pointer shrink-0 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <p className="rounded-card bg-amber-50 border border-amber-200 px-3 py-2 text-caption-text text-amber-800">
            {t("editModal.ledgerWarning")}
          </p>
          {resourcesLoading && (
            <div className="flex items-center justify-center gap-2 py-2 text-caption-text text-gray-500">
              <Loader2 size={15} className="animate-spin" />
              <span>{t("createModal.loading")}</span>
            </div>
          )}

          <div>
            <label className="block text-label-text font-bold text-gray-700 mb-1.5">
              {t("createModal.sourceSection")}
            </label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => changeSource("vault_direct")}
                className={`py-2 px-3 rounded-lg border text-xs font-bold transition-colors ${
                  isVaultDirect ? "bg-slate-900 text-white border-slate-900" : "bg-white text-gray-700 border-gray-300"
                }`}
              >
                {t("createModal.fromVault")}
              </button>
              <button
                type="button"
                onClick={() => changeSource("manager_advance")}
                className={`py-2 px-3 rounded-lg border text-xs font-bold transition-colors ${
                  !isVaultDirect ? "bg-slate-900 text-white border-slate-900" : "bg-white text-gray-700 border-gray-300"
                }`}
              >
                {t("createModal.fromAdvance")}
              </button>
            </div>
            <SearchableSelect
              options={isVaultDirect ? vaultOptions : advanceOptions}
              value={isVaultDirect ? form.vault_id : form.manager_advance_id}
              onChange={(value) => setField(isVaultDirect ? "vault_id" : "manager_advance_id", value)}
              placeholder={isVaultDirect ? t("createModal.vaultPlaceholder") : t("createModal.advancePlaceholder")}
              usePortal
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-label-text font-bold text-gray-700 mb-1.5">{t("table.category")}</label>
              <SearchableSelect
                options={categoryOptions}
                value={form.expense_category_id}
                onChange={(value) => setField("expense_category_id", value)}
                usePortal
              />
            </div>
            <div>
              <label className="block text-label-text font-bold text-gray-700 mb-1.5">{t("createModal.currency")}</label>
              <CustomDropdown
                options={currencyOptions(t)}
                value={form.currency}
                onChange={(value) => setField("currency", value)}
                usePortal
                buttonClassName={`${FIELD} text-right`}
              />
            </div>
            <div>
              <label className="block text-label-text font-bold text-gray-700 mb-1.5">
                {t("editModal.amount", { currency: form.currency })}
              </label>
              <input
                type="text"
                inputMode="decimal"
                dir="ltr"
                value={form.amount || ""}
                onChange={(event) => setField("amount", event.target.value)}
                className={`${FIELD} font-mono`}
              />
            </div>
            <div>
              <label className="block text-label-text font-bold text-gray-700 mb-1.5">
                {t("table.exchangeRate")}
              </label>
              <input
                type="text"
                inputMode="decimal"
                dir="ltr"
                value={form.currency === sourceCurrency ? "1" : form.exchange_rate || ""}
                disabled={form.currency === sourceCurrency}
                onChange={(event) => setField("exchange_rate", event.target.value)}
                className={`${FIELD} font-mono disabled:bg-gray-50 disabled:text-gray-500`}
              />
            </div>
            <div>
              <label className="block text-label-text font-bold text-gray-700 mb-1.5">{t("editModal.paidTo")}</label>
              <input
                type="text"
                maxLength={150}
                value={form.paid_to || ""}
                onChange={(event) => setField("paid_to", event.target.value)}
                className={FIELD}
              />
            </div>
            <div>
              <label className="block text-label-text font-bold text-gray-700 mb-1.5">{t("createModal.date")}</label>
              <DatePicker
                value={dateObj}
                onChange={(value) => value && setDateObj(value)}
                calendar={persian}
                locale={persian_af}
                format="YYYY/MM/DD"
                inputClass={FIELD}
                containerStyle={{ width: "100%" }}
              />
            </div>
          </div>

          <div>
            <label className="block text-label-text font-bold text-gray-700 mb-1.5">{t("editModal.titleField")}</label>
            <input
              type="text"
              maxLength={255}
              value={form.title || ""}
              onChange={(event) => setField("title", event.target.value)}
              className={FIELD}
            />
          </div>
          <div>
            <label className="block text-label-text font-bold text-gray-700 mb-1.5">{t("table.description")}</label>
            <textarea
              rows={3}
              maxLength={1000}
              value={form.description || ""}
              onChange={(event) => setField("description", event.target.value)}
              className="w-full bg-white border border-gray-300 focus:border-slate-800 rounded-input px-3 py-2 text-body-text text-gray-900 outline-none transition-colors resize-none"
            />
          </div>
          {error && <p className="text-caption-text text-rose-600 font-bold">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-gray-200 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-btn-text font-bold text-gray-700 bg-white hover:bg-gray-50 rounded-btn border border-gray-300 transition-colors cursor-pointer disabled:opacity-50"
          >
            {t("actions.cancel", { ns: "common" })}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={isSaving || resourcesLoading}
            className="inline-flex items-center gap-1.5 px-5 py-2 bg-accent hover:bg-accent-hover text-content-inverse rounded-btn text-btn-text font-bold transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSaving && <Loader2 size={15} className="animate-spin" />}
            <span>{t("actions.saveChanges", { ns: "common" })}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
