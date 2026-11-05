import { useState } from "react";
import { X, PlusCircle } from "lucide-react";
import { apiUrl } from "../../api";
import { showToast } from "../../utils/toast";
import { getCleanErrorMessage } from "../../utils/errorHandler";
import { toEnglishDigits } from "../../utils";
import { useTranslation } from "react-i18next";
import useVaults from "../../hooks/useVaults";
import SearchableSelect from "../common/SearchableSelect";

export default function ManagerAdvanceTopupModal({ isOpen, advance, onClose, onDone }) {
  const { t } = useTranslation("advances");
  const { vaults } = useVaults(isOpen);
  const [vaultId, setVaultId] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !advance) return null;

  const compatibleVaults = vaults.filter((vault) => vault.currency === advance.currency);

  const submit = async (event) => {
    event.preventDefault();
    const numericAmount = Number(toEnglishDigits(amount));
    if (!vaultId) {
    showToast.error(t("topup.vaultRequired"));
    return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      showToast.error(t("topup.amountRequired"));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(apiUrl(`/manager-advances/${advance.id}/topups`), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ amount: numericAmount, vault_id: Number(vaultId), notes: notes.trim() || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || t("topup.error"));
      showToast.success(json.message || t("topup.created"));
      setAmount("");
      setNotes("");
      setVaultId("");
      onDone?.();
      onClose();
    } catch (error) {
      showToast.error(getCleanErrorMessage(error, t("topup.error")));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4 font-sans" dir="rtl">
      <form onSubmit={submit} className="w-full max-w-md overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div className="flex items-center gap-2 font-bold text-gray-900">
            <PlusCircle size={18} className="text-emerald-700" />
            <span>{t("topup.title")}</span>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-gray-600">
            {t("topup.currentAvailable", { amount: Number(advance.remaining || 0).toLocaleString("en-US"), currency: advance.currency })}
          </div>
          <label className="block text-xs font-bold text-gray-700">
            {t("topup.vault")} *
            <SearchableSelect
              options={compatibleVaults.map((vault) => ({
                value: String(vault.id),
                label: `${vault.name} — ${Number(vault.current_balance || 0).toLocaleString("en-US")} ${vault.currency}`,
              }))}
              value={vaultId}
              onChange={setVaultId}
              placeholder={t("topup.vaultPlaceholder")}
              searchPlaceholder={t("topup.vaultSearch")}
              usePortal
              buttonClassName="mt-1 h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-right text-sm outline-none focus:border-emerald-500"
            />
          </label>
          <label className="block text-xs font-bold text-gray-700">
            {t("topup.amount")} ({advance.currency}) *
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              inputMode="decimal"
              placeholder="0.00"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
              autoFocus
            />
          </label>
          <label className="block text-xs font-bold text-gray-700">
            {t("topup.notes")}
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder={t("topup.notesPlaceholder")}
              className="mt-1 w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
            />
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50 px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-700">
            {t("topup.cancel")}
          </button>
          <button type="submit" disabled={submitting} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
            {submitting ? t("topup.submitting") : t("topup.submit")}
          </button>
        </div>
      </form>
    </div>
  );
}
