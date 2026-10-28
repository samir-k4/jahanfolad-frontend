import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Wallet, X, CheckCircle2, Ban, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SearchableSelect } from "../common";
import { apiUrl } from "../../api";
import { toEnglishDigits } from "../../utils/dariNumberFormatter";
import { exceedsBalance } from "../../utils/vaultBalance";
const fmt = (n) =>
  Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const FIELD =
  "w-full h-10 bg-white border border-gray-300 focus:border-slate-800 rounded-input px-3 text-body-text text-gray-900 outline-none transition-colors";
export default function ExpensePayModal({ isOpen, mode = "pay", expense, vaults = [], onClose, onDone }) {
  const { t } = useTranslation("expenses");
  const isReject = mode === "reject";
  const [vaultId, setVaultId] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  useEffect(() => {
    if (!isOpen || !expense) return;
    setVaultId(expense.vault_id ? String(expense.vault_id) : "");
    setPaidAmount(String(expense.requested_amount ?? expense.amount ?? ""));
    setNote("");
    setReason("");
    setError("");
  }, [isOpen, expense]);
  const selectedVault = useMemo(
    () => vaults.find((v) => String(v.id) === String(vaultId)) || null,
    [vaults, vaultId]
  );
  const vaultOptions = useMemo(
    () =>
      vaults.map((v) => ({
        value: String(v.id),
        label: `${v.name} — ${fmt(v.current_balance)} ${String(v.currency || "AFN").toUpperCase()}`,
      })),
    [vaults]
  );
  if (!isOpen || !expense) return null;
  const fromAdvance = Boolean(expense.manager_advance_id);
  const amountValue = parseFloat(toEnglishDigits(paidAmount) || "0");
  const requested = Number(expense.requested_amount ?? expense.amount ?? 0);
  const difference = amountValue - requested;
  const expenseCurrency = String(expense.currency || "AFN").toUpperCase();
  const vaultCurrency = String(selectedVault?.currency || expenseCurrency).toUpperCase();
  const sameCurrency = vaultCurrency === expenseCurrency;
  const deduction = sameCurrency ? amountValue : amountValue * Number(expense.exchange_rate || 1);
  const overBalance = !fromAdvance && selectedVault ? exceedsBalance(selectedVault, Number(selectedVault.current_balance || 0), deduction) : false;
  const submit = async () => {
    if (isReject) {
      if (!reason.trim()) {
        setError(t("rejectModal.errorReason"));
        return;
      }
    } else {
      if (!vaultId) {
        setError(t("payModal.errorVault"));
        return;
      }
      if (!(amountValue > 0)) {
        setError(t("payModal.errorAmount"));
        return;
      }
      if (overBalance) {
        setError(t("payModal.errorBalance"));
        return;
      }
    }
    setIsSaving(true);
    setError("");
    try {
      const url = apiUrl(`/expenses/${expense.id}/${isReject ? "reject" : "pay"}`);
      const body = isReject
        ? { reason: reason.trim() }
        : { vault_id: Number(vaultId), paid_amount: amountValue, note: note.trim() || null };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.message || t(isReject ? "toast.rejectError" : "toast.payError"));
      }
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
            <span
              className={`w-9 h-9 rounded-btn flex items-center justify-center shrink-0 ${
                isReject ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {isReject ? <Ban size={17} /> : <Wallet size={17} />}
            </span>
            <div className="min-w-0">
              <h3 className="text-section-title font-bold text-gray-900">
                {t(isReject ? "rejectModal.title" : "payModal.title")}
              </h3>
              <p className="text-caption-text text-gray-500 mt-0.5">
                {t(isReject ? "rejectModal.subtitle" : "payModal.subtitle", {
                  voucher: expense.voucher_no || `#${expense.id}`,
                })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-700 cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3.5">
          <div className="bg-gray-50 border border-gray-200 rounded-card px-3.5 py-3 space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-body-text">
              <span className="text-gray-600">{expense.category_title}</span>
              <span className="font-mono font-bold text-gray-900" dir="ltr">
                {fmt(requested)} {expenseCurrency}
              </span>
            </div>
            <p className="text-caption-text text-gray-500 line-clamp-2">{expense.description}</p>
          </div>
          {isReject ? (
            <div>
              <label className="block text-label-text font-bold text-gray-700 mb-1.5">
                {t("rejectModal.reason")} <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t("rejectModal.reasonPlaceholder")}
                className={`${FIELD} h-auto py-2 resize-none`}
              />
            </div>
          ) : (
            <>
              {fromAdvance ? (
                <div className="bg-amber-50 border border-amber-200 rounded-card px-3.5 py-2.5 text-body-text text-amber-800 font-bold">
                  {t("payModal.fromAdvance")}
                </div>
              ) : (
              <div>
                <label className="block text-label-text font-bold text-gray-700 mb-1.5">
                  {t("payModal.vault")} <span className="text-rose-600">*</span>
                </label>
                <SearchableSelect
                  options={vaultOptions}
                  value={vaultId}
                  onChange={setVaultId}
                  placeholder={t("payModal.vaultPlaceholder")}
                  searchPlaceholder={t("payModal.vaultSearch")}
                  usePortal={true}
                  buttonClassName={`${FIELD} font-bold`}
                />
                {selectedVault && (
                  <div className="flex items-center justify-between mt-1.5 text-caption-text font-mono text-gray-500">
                    <span>{t("payModal.balance")}</span>
                    <span className="font-bold text-emerald-700">
                      {fmt(selectedVault.current_balance)} {vaultCurrency}
                    </span>
                  </div>
                )}
              </div>
              )}
              <div>
                <label className="block text-label-text font-bold text-gray-700 mb-1.5">
                  {t("payModal.paidAmount")} <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  dir="ltr"
                  onFocus={(e) => e.target.select()}
                  onWheel={(e) => e.target.blur()}
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  className={`${FIELD} font-mono font-bold text-center`}
                />
                <p className="text-caption-text text-gray-500 mt-1.5">{t("payModal.paidAmountHint")}</p>
                {difference !== 0 && amountValue > 0 && (
                  <p
                    className={`text-caption-text font-bold mt-1 ${
                      difference < 0 ? "text-emerald-700" : "text-amber-700"
                    }`}
                    dir="ltr"
                  >
                    {t("payModal.difference", {
                      amount: `${difference > 0 ? "+" : ""}${fmt(difference)} ${expenseCurrency}`,
                    })}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-label-text font-bold text-gray-700 mb-1.5">
                  {t("payModal.note")}
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t("payModal.notePlaceholder")}
                  className={FIELD}
                />
              </div>
              {!fromAdvance && selectedVault && amountValue > 0 && (
                <div
                  className={`flex items-center justify-between gap-3 rounded-card px-3.5 py-2.5 border text-body-text ${
                    overBalance
                      ? "bg-rose-50 border-rose-200 text-rose-800"
                      : "bg-emerald-50 border-emerald-200 text-emerald-800"
                  }`}
                >
                  <span className="font-bold">{t("payModal.deduction")}</span>
                  <span className="font-mono font-bold" dir="ltr">
                    {fmt(deduction)} {vaultCurrency}
                  </span>
                </div>
              )}
            </>
          )}
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-card px-3.5 py-2.5 text-body-text font-bold">
              {error}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-gray-200 px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-btn border border-gray-300 bg-white hover:bg-gray-50 text-btn-text font-bold text-gray-700 cursor-pointer"
          >
            {t("actions.cancel", { ns: "common" })}
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={submit}
            className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-btn text-btn-text font-bold text-white cursor-pointer disabled:opacity-50 ${
              isReject ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-700 hover:bg-emerald-800"
            }`}
          >
            {isSaving ? <Loader2 size={15} className="animate-spin" /> : isReject ? <Ban size={15} /> : <CheckCircle2 size={15} />}
            <span>{t(isReject ? "rejectModal.confirm" : "payModal.confirm")}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
