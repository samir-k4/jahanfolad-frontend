import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { NOTES_MAX_LENGTH } from "../../constants/treasuryDomain";
import { createPortal } from "react-dom";
import { TrendingDown, X, AlertCircle, Loader2 } from "lucide-react";
import DatePicker from "react-multi-date-picker";
import { DateObject, persian, persian_af } from "../../utils/dateHelpers";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useExpenseCategories from "../../hooks/useExpenseCategories";
import { usePagePerms } from "../common";
import { apiUrl } from "../../api";
import SearchableSelect from "../common/SearchableSelect";
import { toEnglishDigits } from "../../utils";
const fmt = (n) => Number(n || 0).toLocaleString("en-US");
export default function ManagerExpenseAddModal({
  isOpen,
  onClose,
  onSuccess,
  initialAdvanceId = "",
}) {
  const { t } = useTranslation("advances");
  const { canCreate } = usePagePerms("advances");
  useBodyScrollLock(isOpen);
  const [advances, setAdvances] = useState([]);
  const { categories: expenseCategories } = useExpenseCategories();
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [selectedAdvanceId, setSelectedAdvanceId] = useState(initialAdvanceId ? String(initialAdvanceId) : "");
  const [selectedCatId, setSelectedCatId] = useState("");
  const [amount, setAmount] = useState("");
  const [paidTo, setPaidTo] = useState("");
  const [description, setDescription] = useState("");
  const [dateObj, setDateObj] = useState(
    () => new DateObject({ calendar: persian, locale: persian_af })
  );
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  useEffect(() => {
    if (expenseCategories.length > 0 && !selectedCatId) {
      setSelectedCatId(String(expenseCategories[0].id));
    }
  }, [expenseCategories, selectedCatId]);
  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage("");
    setFieldErrors({});
    setAmount("");
    setPaidTo("");
    setDescription("");
    setDateObj(new DateObject({ calendar: persian, locale: persian_af }));
    const loadData = async () => {
      setLoadingInitial(true);
      try {
        const res = await fetch(apiUrl("/manager-advances?status=open"));
        if (res.ok) {
          const advData = await res.json();
          const advList = advData.data || [];
          setAdvances(advList);
          if (initialAdvanceId) {
            setSelectedAdvanceId(String(initialAdvanceId));
          } else if (advList.length > 0) {
            setSelectedAdvanceId(String(advList[0].id));
          } else {
            setSelectedAdvanceId("");
          }
        }
      } catch (err) {
        console.error("Error loading open advances:", err);
      } finally {
        setLoadingInitial(false);
      }
    };
    loadData();
  }, [isOpen, initialAdvanceId]);
  if (!isOpen) return null;
  const selectedAdvance = advances.find((a) => String(a.id) === String(selectedAdvanceId));
  const handleSubmit = async (e) => {
    if (!canCreate) return;
    if (e && e.preventDefault) e.preventDefault();
    setErrorMessage("");
    const errors = {};
    if (!selectedAdvanceId) {
      errors.advance_id = t("expenseModal.advanceRequired");
    }
    if (!amount || parseFloat(toEnglishDigits(amount)) <= 0) {
      errors.amount = t("expenseModal.amountRequired");
    } else if (selectedAdvance) {
      const numAmount = parseFloat(toEnglishDigits(amount));
      const remaining = Number(selectedAdvance.remaining ?? (selectedAdvance.amount - (selectedAdvance.total_spent || 0)));
      if (numAmount > remaining) {
        errors.amount = `مبلغ مصرف (${fmt(numAmount)} ${selectedAdvance.currency}) از مانده امانت (${fmt(remaining)} ${selectedAdvance.currency}) بیشتر است.`;
      }
    }
    if (!paidTo.trim()) {
      errors.paid_to = t("expenseModal.paidToRequired");
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorMessage(Object.values(errors)[0]);
      return;
    }
    setSubmitting(true);
    try {
      const jsDate = typeof dateObj?.toDate === "function" ? dateObj.toDate() : new Date();
      const gregDate = `${jsDate.getFullYear()}-${String(jsDate.getMonth() + 1).padStart(2, "0")}-${String(jsDate.getDate()).padStart(2, "0")}`;
      const shamsiDate = typeof dateObj?.format === "function"
        ? toEnglishDigits(dateObj.format("YYYY/MM/DD"))
        : toEnglishDigits(String(dateObj || ""));
      const payload = {
        expense_category_id: selectedCatId ? parseInt(selectedCatId) : null,
        amount: parseFloat(toEnglishDigits(amount)),
        paid_to: paidTo.trim(),
        shamsi_date: shamsiDate,
        expense_date: gregDate,
        description: description.trim() || null,
      };
      const res = await fetch(apiUrl(`/manager-advances/${encodeURIComponent(selectedAdvanceId)}/expenses`), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || t("expenseModal.error"));
      }
      if (onSuccess) onSuccess(json);
      onClose();
    } catch (err) {
      setErrorMessage(err.message || t("expenseModal.serverError"));
    } finally {
      setSubmitting(false);
    }
  };
  const advanceOptions = advances.map((adv) => {
    const receiver = adv.receiver_name || adv.employee?.full_name || t("detail.receiverFallback");
    const remaining = Number(adv.remaining ?? (adv.amount - (adv.total_spent || 0)));
    return {
      value: String(adv.id),
      label: `${receiver} — مانده: ${fmt(remaining)} ${adv.currency} ${adv.purpose ? `(${adv.purpose})` : ""}`,
    };
  });
  const categoryOptions = expenseCategories.map((cat) => ({
    value: String(cat.id),
    label: `${cat.name} ${cat.description ? `— (${cat.description})` : ""}`,
  }));
  return createPortal(
    <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 m-0 mt-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs font-sans" dir="rtl">
      <div className="bg-white rounded-modal shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-3.5 bg-white border-b border-gray-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-btn bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
              <TrendingDown size={18} />
            </div>
            <div>
              <h3 className="text-section-title text-gray-900">{t("expenseModal.title")}</h3>
              <p className="text-caption-text text-gray-500">{t("expenseModal.subtitle")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded-btn transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
        {errorMessage && (
          <div className="mx-5 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-input flex items-center gap-2 text-caption-text font-bold text-rose-800">
            <AlertCircle size={16} className="shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} noValidate className="p-5 space-y-4 overflow-y-auto flex-1">
          {loadingInitial ? (
            <div className="py-12 flex flex-col items-center justify-center text-gray-500 gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-slate-700" />
              <span className="text-body-text font-bold">{t("expenseModal.loading")}</span>
            </div>
          ) : advances.length === 0 ? (
            <div className="p-6 text-center bg-amber-50 border border-amber-200 rounded-modal">
              <AlertCircle size={32} className="mx-auto text-amber-600 mb-2" />
              <p className="text-section-title text-amber-900">{t("expenseModal.noneFound")}</p>
              <p className="text-caption-text text-amber-700 mt-1">{t("expenseModal.noneHint")}</p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-label-text font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                  <span>{t("label.receiver")}<span className="text-rose-600">*</span></span>
                  <span className="text-caption-text font-normal text-gray-500">
                    {advances.length} امانت در گردش
                  </span>
                </label>
                <SearchableSelect
                  options={advanceOptions}
                  value={selectedAdvanceId}
                  onChange={(val) => {
                    setFieldErrors((prev) => ({ ...prev, advance_id: null, amount: null }));
                    setSelectedAdvanceId(val);
                  }}
                  placeholder={t("expenseModal.advancePlaceholder")}
                  searchPlaceholder={t("expenseModal.advanceSearch")}
                  usePortal={true}
                  buttonClassName={`w-full border rounded-input px-3 py-2 text-body-text font-bold text-gray-900 bg-white ${
                    fieldErrors.advance_id ? "border-rose-500" : "border-gray-300"
                  }`}
                />
                {selectedAdvance && (
                  <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-input flex items-center justify-between text-caption-text">
                    <div>
                      <span className="text-gray-500">{t("expenseModal.totalAmount")}</span>
                      <strong className="font-mono text-gray-900 font-bold" dir="ltr">{fmt(selectedAdvance.amount)} {selectedAdvance.currency}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500">{t("expenseModal.spent")}</span>
                      <strong className="font-mono text-rose-700 font-bold" dir="ltr">{fmt(selectedAdvance.total_spent || 0)} {selectedAdvance.currency}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500">{t("expenseModal.remaining")}</span>
                      <strong className="font-mono text-emerald-800 font-bold text-body-text" dir="ltr">
                        {fmt(Number(selectedAdvance.remaining ?? (selectedAdvance.amount - (selectedAdvance.total_spent || 0))))} {selectedAdvance.currency}
                      </strong>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-label-text font-bold text-gray-700 mb-1.5">{t("detail.expenseCategory")}<span className="text-rose-600">*</span>
                </label>
                <SearchableSelect
                  options={categoryOptions}
                  value={selectedCatId}
                  onChange={(val) => {
                    setSelectedCatId(val);
                  }}
                  placeholder={t("expenseModal.categoryPlaceholder")}
                  searchPlaceholder={t("expenseModal.categorySearch")}
                  usePortal={true}
                  buttonClassName="w-full border border-gray-300 rounded-input px-3 py-2 text-body-text font-bold text-gray-800 bg-white"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-label-text font-bold text-gray-700 mb-1.5">
                    مبلغ مصرف ({selectedAdvance?.currency || "AFN"}) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    dir="ltr"
                    onFocus={(e) => e.target.select()}
                    onWheel={(e) => e.target.blur()}
                    value={amount}
                    onChange={(e) => {
                      setFieldErrors((prev) => ({ ...prev, amount: null }));
                      setAmount(e.target.value);
                    }}
                    placeholder="0"
                    className={`w-full border rounded-input px-3 py-2 text-body-text font-bold focus:outline-none font-mono transition-colors ${
                      fieldErrors.amount
                        ? "border-rose-500 bg-rose-50/30 focus:border-rose-600"
                        : "border-gray-300 focus:border-slate-800"
                    }`}
                  />
                  {fieldErrors.amount && (
                    <p className="text-caption-text font-bold text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle size={13} />
                      <span>{fieldErrors.amount}</span>
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-label-text font-bold text-gray-700 mb-1.5">{t("detail.expenseDate")}</label>
                  <DatePicker
                    value={dateObj}
                    onChange={setDateObj}
                    calendar={persian}
                    locale={persian_af}
                    format="YYYY/MM/DD"
                    inputClass="w-full border border-gray-300 rounded-input px-3 py-2 text-body-text font-mono focus:outline-none focus:border-slate-800 bg-white"
                    containerStyle={{ width: "100%" }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-label-text font-bold text-gray-700 mb-1.5">
                  {t("expenseModal.paidTo")} <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={paidTo}
                  maxLength={150}
                  onChange={(event) => {
                    setPaidTo(event.target.value);
                    setFieldErrors((prev) => ({ ...prev, paid_to: null }));
                  }}
                  placeholder={t("expenseModal.paidToPlaceholder")}
                  className={`w-full border rounded-input px-3 py-2 text-body-text focus:outline-none focus:border-slate-800 bg-white ${
                    fieldErrors.paid_to ? "border-rose-500" : "border-gray-300"
                  }`}
                />
                {fieldErrors.paid_to && (
                  <p className="text-caption-text font-bold text-rose-600 mt-1">{fieldErrors.paid_to}</p>
                )}
              </div>
              <div>
                <label className="block text-label-text font-bold text-gray-700 mb-1.5">{t("expenseModal.description")}</label>
                <textarea maxLength={NOTES_MAX_LENGTH}
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("expenseModal.descriptionPlaceholder")}
                  className="w-full border border-gray-300 rounded-input px-3 py-2 text-body-text focus:outline-none focus:border-slate-800 bg-white"
                />
              </div>
            </>
          )}
          <div className="flex items-center gap-3 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-2 border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-btn text-btn-text font-bold transition-colors cursor-pointer"
            >{t("create.cancel")}</button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={submitting || advances.length === 0}
              className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-btn text-btn-text font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t("create.submitting")}</span>
                </>
              ) : (
                <span>{t("expenseModal.submit")}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
