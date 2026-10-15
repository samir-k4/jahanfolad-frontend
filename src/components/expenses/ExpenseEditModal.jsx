import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Pencil, X, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SearchableSelect } from "../common";
import useExpenseCategories from "../../hooks/useExpenseCategories";
import { apiUrl } from "../../api";
import { toEnglishDigits } from "../../utils/dariNumberFormatter";
const FIELD =
  "w-full h-10 bg-white border border-gray-300 focus:border-slate-800 rounded-input px-3 text-body-text text-gray-900 outline-none transition-colors";
export default function ExpenseEditModal({ isOpen, expense, onClose, onDone }) {
  const { t } = useTranslation("expenses");
  const { categories } = useExpenseCategories(isOpen);
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [paidTo, setPaidTo] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  useEffect(() => {
    if (!isOpen || !expense) return;
    setCategoryId(expense.category_id && expense.category_id !== "other" ? String(expense.category_id) : "");
    setAmount(String(expense.amount ?? ""));
    setPaidTo(expense.paid_to && expense.paid_to !== "—" ? expense.paid_to : "");
    setDescription(expense.description || "");
    setError("");
  }, [isOpen, expense]);
  if (!isOpen || !expense) return null;
  const currency = String(expense.currency || "AFN").toUpperCase();
  const categoryOptions = categories.map((c) => ({ value: String(c.id), label: c.name }));
  const submit = async () => {
    const amountValue = parseFloat(toEnglishDigits(amount) || "0");
    if (!categoryId) {
      setError(t("editModal.errorCategory"));
      return;
    }
    if (!(amountValue > 0)) {
      setError(t("payModal.errorAmount"));
      return;
    }
    if (!description.trim()) {
      setError(t("editModal.errorDescription"));
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      const res = await fetch(apiUrl(`/expenses/${expense.id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          expense_category_id: Number(categoryId),
          amount: amountValue,
          paid_to: paidTo.trim() || null,
          description: description.trim(),
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || t("toast.updateError"));
      onDone?.(json?.message || "");
      onClose?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
      <div className="bg-white rounded-modal border border-gray-200 shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto font-sans">
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
            aria-label={t("actions.cancel", { ns: "common" })}
            className="p-1 text-gray-400 hover:text-gray-700 cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3.5">
          <div>
            <label className="block text-label-text font-bold text-gray-700 mb-1.5">{t("table.category")}</label>
            <SearchableSelect
              options={categoryOptions}
              value={categoryId}
              onChange={setCategoryId}
              usePortal
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-label-text font-bold text-gray-700 mb-1.5">
                {t("editModal.amount", { currency })}
              </label>
              <input
                type="text"
                inputMode="decimal"
                dir="ltr"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`${FIELD} font-mono`}
              />
            </div>
            <div>
              <label className="block text-label-text font-bold text-gray-700 mb-1.5">{t("editModal.paidTo")}</label>
              <input
                type="text"
                value={paidTo}
                maxLength={150}
                onChange={(e) => setPaidTo(e.target.value)}
                className={FIELD}
              />
            </div>
          </div>
          <div>
            <label className="block text-label-text font-bold text-gray-700 mb-1.5">{t("table.description")}</label>
            <textarea
              rows={3}
              value={description}
              maxLength={1000}
              onChange={(e) => setDescription(e.target.value)}
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
            disabled={isSaving}
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
