import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { TEXT_FIELD_MAX_LENGTH, NOTES_MAX_LENGTH } from "../../constants/treasuryDomain";
import { createPortal } from "react-dom";
import { X, Loader2, Edit2 } from "lucide-react";
import DatePicker from "react-multi-date-picker";
import {
  DateObject,
  persian,
  persian_af,
  formatToGregorian,
  getTodayAfghan,
} from "../../utils/dateHelpers";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import { CustomDropdown, SearchableSelect, usePagePerms } from "../common";
import { getCleanErrorMessage } from "../../utils/errorHandler";
import { numberToWordsDari } from "../../utils/numberToWordsDari";
import { toEnglishDigits } from "../../utils/dariNumberFormatter";
import { apiUrl } from "../../api";
const fmt = (n) => Number(n || 0).toLocaleString("en-US");
export default function CustomerIncomeEditModal({
  isOpen,
  onClose,
  onSuccess,
  income,
  vaults = [],
  categories = [],
}) {
  const { t } = useTranslation("incomes");
  const { canEdit } = usePagePerms("incomes");
  useBodyScrollLock(isOpen);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [formData, setFormData] = useState({
    payer_name: "",
    vault_id: "",
    income_category_id: "",
    amount: "",
    currency: "",
    settlement_currency: "",
    exchange_rate: "",
    shamsi_date: "",
    income_date: "",
    title: "",
    description: "",
    received_by: "",
  });
  const [dateObj, setDateObj] = useState(null);
  useEffect(() => {
    if (income && isOpen) {
      const settlementCurrency = income.settlement_currency || income.customer_transaction?.currency || income.currency || "";
      const vaultCurrency = income.vault?.currency || income.currency;
      const needsExchangeRate = income.currency === "AFN" || settlementCurrency === "AFN" || vaultCurrency === "AFN";
      const savedRate = Number(income.exchange_rate || 0);
      setFormData({
        payer_name: income.payer_name || "",
        vault_id: String(income.vault_id || ""),
        income_category_id: String(income.income_category_id || ""),
        amount: String(income.amount || ""),
        currency: income.currency || "",
        settlement_currency: settlementCurrency,
        exchange_rate: String(needsExchangeRate && savedRate <= 1 ? "70.00" : (savedRate || 70)),
        shamsi_date: income.shamsi_date || "",
        income_date: income.income_date || "",
        title: income.title || "",
        description: income.description || "",
        received_by: income.received_by || "",
      });
      if (income.shamsi_date) {
        try {
          const parts = toEnglishDigits(income.shamsi_date).split("/");
          if (parts.length === 3) {
            setDateObj(
              new DateObject({
                calendar: persian,
                year: parseInt(parts[0]),
                month: parseInt(parts[1]),
                day: parseInt(parts[2]),
              })
            );
          } else {
            setDateObj(getTodayAfghan());
          }
        } catch {
          setDateObj(getTodayAfghan());
        }
      } else {
        setDateObj(getTodayAfghan());
      }
      setErrorMessage("");
      setFieldErrors({});
    }
  }, [income, isOpen]);
  if (!isOpen || !income) return null;
  const handleDateChange = (date) => {
    setDateObj(date);
    if (date) {
      const month = String(date.month.number).padStart(2, "0");
      const day = String(date.day).padStart(2, "0");
      const shamsi = `${date.year}/${month}/${day}`;
      const greg = formatToGregorian(date);
      setFormData((prev) => ({
        ...prev,
        shamsi_date: shamsi,
        income_date: greg,
      }));
    }
  };
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: null }));
    }
  };
  const handleSubmit = async (e) => {
    if (!canEdit) return;
    e.preventDefault();
    if (submitting) return;
    setErrorMessage("");
    setFieldErrors({});
    const errors = {};
    if (!formData.payer_name.trim()) errors.payer_name = t("edit.customerRequired");
    if (!formData.vault_id) errors.vault_id = t("edit.vaultRequired");
    if (!formData.amount || isNaN(formData.amount) || parseFloat(formData.amount) <= 0) {
      errors.amount = t("edit.amountRequired");
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        payer_name: formData.payer_name.trim(),
        vault_id: parseInt(formData.vault_id),
        income_category_id: formData.income_category_id ? parseInt(formData.income_category_id) : null,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        settlement_currency: formData.settlement_currency,
        exchange_rate: parseFloat(formData.exchange_rate) || 1.0,
        shamsi_date: formData.shamsi_date,
        income_date: formData.income_date,
        title: formData.title.trim() || undefined,
        description: formData.description.trim() || undefined,
        received_by: formData.received_by.trim() || undefined,
      };
      const res = await fetch(apiUrl(`/incomes/${encodeURIComponent(income.id)}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 422 && data.errors) {
          setFieldErrors(data.errors);
          setErrorMessage(t("edit.fixErrors"));
        } else {
          setErrorMessage(getCleanErrorMessage(data, t("edit.updateError")));
        }
        return;
      }
      if (onSuccess) onSuccess(data.data);
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMessage(getCleanErrorMessage(err, t("messages.serverError")));
    } finally {
      setSubmitting(false);
    }
  };
  const docCode = income.receipt_number || income.id;
  const parsedAmount = parseFloat(formData.amount || 0);
  const currencyTitle = formData.currency === "USD" ? t("currency.USD") : t("currency.AFN");
  const vaultCurrency = vaults.find((vault) => String(vault.id) === String(formData.vault_id))?.currency || formData.currency;
  const needsExchangeRate = formData.currency === "AFN" || formData.settlement_currency === "AFN" || vaultCurrency === "AFN";
  const amountInWords =
    parsedAmount > 0 ? `${numberToWordsDari(parsedAmount)} ${currencyTitle}` : "";
  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs font-sans"
      dir="rtl"
    >
      <div className="bg-white rounded-modal shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col">
        <div className="bg-white text-gray-900 px-5 py-3.5 flex justify-between items-center border-b border-gray-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-btn bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shadow-2xs">
              <Edit2 size={18} />
            </div>
            <div className="flex items-center gap-2">
              <h3 className="text-section-title text-gray-900">{t("label.editTitle")}</h3>
              <span
                className="font-mono text-caption-text bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-badge border border-emerald-200 font-bold"
                dir="ltr"
              >
                #{docCode}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-btn transition-colors cursor-pointer"
            aria-label={t("detail.close")}
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="p-5 max-h-[75vh] overflow-y-auto space-y-4">
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-btn text-caption-text font-medium">
                {errorMessage}
              </div>
            )}
            <div className="bg-emerald-50/60 border border-emerald-200 rounded-card p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-label-text font-bold text-emerald-900 block">{t("label.amount")}</label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                <div className="sm:col-span-7 space-y-1">
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      step="any"
                      dir="ltr"
                      onFocus={(e) => e.target.select()}
                      onWheel={(e) => e.target.blur()}
                      value={formData.amount}
                      onChange={(e) => handleInputChange("amount", e.target.value)}
                      placeholder="0.00"
                      className={`w-full p-2.5 pl-16 text-lg sm:text-xl font-black font-mono rounded-input border bg-white outline-none transition-all shadow-2xs ${
                        fieldErrors.amount
                          ? "border-rose-500 bg-rose-50/40 text-rose-700"
                          : "border-emerald-300 text-emerald-800 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                      }`}
                    />
                    <span className="absolute left-2 text-caption-text font-bold text-emerald-800 bg-emerald-100/90 px-2 py-1 rounded-badge border border-emerald-200">
                      {formData.currency}
                    </span>
                  </div>
                  {fieldErrors.amount && (
                    <p className="text-[11px] text-rose-600 font-medium">{fieldErrors.amount}</p>
                  )}
                  {amountInWords && (
                    <div className="text-caption-text text-emerald-900/80 font-medium pt-0.5">
                      {amountInWords}
                    </div>
                  )}
                </div>
                <div className="sm:col-span-5 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-caption-text font-medium text-emerald-900/80 block">{t("label.currency")}</label>
                    <CustomDropdown
                      value={formData.currency}
                      onChange={(val) => handleInputChange("currency", val)}
                      options={[
                        { value: "USD", label: t("currency.usdLong") },
                        { value: "AFN", label: t("currency.afnLong") },
                      ]}
                      buttonClassName="w-full p-2.5 text-btn-text font-bold rounded-input border border-emerald-200 bg-white text-emerald-900 outline-none hover:border-emerald-400 shadow-2xs cursor-pointer"
                      width="w-full"
                      usePortal={true}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-caption-text font-medium text-emerald-900/80 block">{t("edit.applyCurrency")}</label>
                    <CustomDropdown
                      value={formData.settlement_currency}
                      onChange={(val) => handleInputChange("settlement_currency", val)}
                      options={[
                        { value: "USD", label: t("currency.usdLong") },
                        { value: "AFN", label: t("currency.afnLong") },
                      ]}
                      buttonClassName="w-full p-2.5 text-btn-text font-bold rounded-input border border-emerald-200 bg-white text-emerald-900 outline-none hover:border-emerald-400 shadow-2xs cursor-pointer"
                      width="w-full"
                      usePortal={true}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-caption-text font-medium text-emerald-900/80 block">{t("edit.rate")}{needsExchangeRate && <span className="text-rose-500"> *</span>}</label>
                    <input
                      type="number"
                      step="any"
                      min="0.0001"
                      required={needsExchangeRate}
                      dir="ltr"
                      onFocus={(e) => e.target.select()}
                      onWheel={(e) => e.target.blur()}
                      value={formData.exchange_rate}
                      onChange={(e) => handleInputChange("exchange_rate", e.target.value)}
                      className="w-full p-2.5 text-body-text font-bold font-mono rounded-input border border-emerald-200 bg-white text-emerald-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500/20 transition-colors shadow-2xs text-left"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-card border border-gray-200/70">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-label-text font-semibold text-gray-700 block">{t("edit.customer")}</label>
                  <input
                    type="text"
                    maxLength={TEXT_FIELD_MAX_LENGTH}
                    value={formData.payer_name}
                    onChange={(e) => handleInputChange("payer_name", e.target.value)}
                    placeholder={t("edit.customerPlaceholder")}
                    className={`w-full p-2.5 text-body-text rounded-input border bg-white outline-none transition-colors shadow-2xs ${
                      fieldErrors.payer_name
                        ? "border-rose-500 bg-rose-50/40 text-rose-700"
                        : "border-gray-300 text-gray-900 focus:border-slate-800 focus:ring-1 focus:ring-slate-800/10"
                    }`}
                  />
                  {fieldErrors.payer_name && (
                    <p className="text-[11px] text-rose-600 font-medium">{fieldErrors.payer_name}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-label-text font-semibold text-gray-700 block">{t("edit.vault")}</label>
                  <SearchableSelect
                    options={vaults}
                    value={formData.vault_id}
                    onChange={() => {}}
                    disabled
                    placeholder={t("edit.vaultPlaceholder")}
                    searchPlaceholder={t("edit.vaultSearch")}
                    noResultsText={t("edit.vaultEmpty")}
                    getOptionLabel={(v) => `${v.name} (${v.currency} - موجودی: ${fmt(v.current_balance)})`}
                    getOptionValue={(v) => String(v.id)}
                    buttonClassName="w-full p-2.5 text-body-text rounded-input border bg-gray-50 outline-none shadow-2xs border-gray-200 text-gray-600"
                    usePortal={true}
                  />
                  <p className="text-[11px] text-gray-400">{t("edit.vaultLocked")}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-label-text font-semibold text-gray-700 block">{t("edit.category")}</label>
                  <SearchableSelect
                    options={categories}
                    value={formData.income_category_id}
                    onChange={(val) => handleInputChange("income_category_id", val)}
                    placeholder={t("edit.categoryPlaceholder")}
                    searchPlaceholder={t("edit.categorySearch")}
                    noResultsText={t("edit.categoryEmpty")}
                    getOptionLabel={(c) => c.name}
                    getOptionValue={(c) => String(c.id)}
                    buttonClassName="w-full p-2.5 text-body-text rounded-input border border-gray-300 bg-white text-gray-900 outline-none hover:border-gray-400 shadow-2xs"
                    usePortal={true}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-label-text font-semibold text-gray-700 block">{t("label.receiver")}</label>
                  <input
                    type="text"
                    maxLength={TEXT_FIELD_MAX_LENGTH}
                    value={formData.received_by}
                    onChange={(e) => handleInputChange("received_by", e.target.value)}
                    placeholder={t("edit.receiverPlaceholder")}
                    className="w-full p-2.5 text-body-text rounded-input border border-gray-300 bg-white text-gray-900 outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800/10 transition-colors shadow-2xs"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-label-text font-semibold text-gray-700 block">{t("label.date")}</label>
                  <DatePicker
                    value={dateObj}
                    onChange={handleDateChange}
                    calendar={persian}
                    locale={persian_af}
                    calendarPosition="bottom-right"
                    containerClassName="w-full"
                    inputClass="w-full p-2.5 text-body-text rounded-input border border-gray-300 bg-white text-gray-900 outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800/10 transition-colors shadow-2xs text-right"
                  />
                </div>
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-card border border-gray-200/70 space-y-1.5">
              <label className="text-label-text font-semibold text-gray-700 block">{t("label.notes")}</label>
              <textarea maxLength={NOTES_MAX_LENGTH}
                rows={3}
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder={t("edit.notesPlaceholder")}
                className="w-full p-2.5 text-body-text rounded-input border border-gray-300 bg-white text-gray-900 outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800/10 transition-colors shadow-2xs resize-none"
              />
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3 border-t border-gray-200 flex justify-between items-center">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 text-btn-text font-bold rounded-btn border border-gray-300 transition-colors cursor-pointer"
            >{t("label.cancel")}</button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-btn-text font-bold rounded-btn flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              {submitting && <Loader2 size={13} className="animate-spin" />}
              <span>{submitting ? t("label.saving") : t("actions.saveChanges", { ns: "common" })}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
