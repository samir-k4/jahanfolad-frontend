import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import { Landmark, X, CheckCircle2, RefreshCw, Lock } from "lucide-react";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import { CustomDropdown, usePagePerms } from "../common";
import { VAULT_TYPE, TEXT_FIELD_MAX_LENGTH, NOTES_MAX_LENGTH } from "../../constants/treasuryDomain";
import { apiUrl } from "../../api";
export default function VaultCreateModal({
  isOpen,
  onClose,
  onSuccess,
  onSubmit,
}) {
  const { t } = useTranslation("treasury");
  const { canCreate } = usePagePerms("treasury");
  useBodyScrollLock(isOpen);
  const [formData, setFormData] = useState({
    name: "",
    type: "cash_drawer",
    currency: "AFN",
    account_number: "",
    initial_balance: "0",
    notes: "",
  });
  const [loadingCode, setLoadingCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fetchNextCode = async (type) => {
    setLoadingCode(true);
    try {
      const res = await fetch(apiUrl(`/vaults/next-code?type=${encodeURIComponent(type || VAULT_TYPE.CASH_DRAWER)}`));
      if (res.ok) {
        const json = await res.json();
        setFormData((prev) => ({
          ...prev,
          account_number: json.next_code ? String(json.next_code) : prev.account_number,
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCode(false);
    }
  };
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: "",
        type: "cash_drawer",
        currency: "AFN",
        account_number: "",
        initial_balance: "0",
        notes: "",
      });
      setError("");
      fetchNextCode("cash_drawer");
    }
  }, [isOpen]);
  const handleTypeChange = (newType) => {
    setFormData((prev) => ({ ...prev, type: newType }));
    fetchNextCode(newType);
  };
  if (!isOpen) return null;
  const handleSubmit = async (e) => {
    if (!canCreate) return;
    e.preventDefault();
    if (!formData.name.trim()) {
      setError(t("vaultCreate.nameRequired"));
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      if (onSubmit) {
        await onSubmit({
          name: formData.name.trim(),
          type: formData.type,
          currency: formData.currency,
          account_number: formData.account_number.trim(),
          initial_balance: parseFloat(formData.initial_balance || 0),
          notes: formData.notes.trim(),
        });
        onClose();
        return;
      }
      const res = await fetch(apiUrl("/vaults"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          type: formData.type,
          currency: formData.currency,
          account_number: formData.account_number.trim(),
          initial_balance: parseFloat(formData.initial_balance || 0),
          notes: formData.notes.trim(),
        }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.message || t("vaultCreate.createError"));
      if (onSuccess) {
        onSuccess(resData.message || t("vaultCreate.created"));
      }
      onClose();
    } catch (err) {
      setError(err.message || t("messages.saveError"));
    } finally {
      setSubmitting(false);
    }
  };
  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs font-sans" dir="rtl">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-white px-5 py-3.5 flex justify-between items-center border-b border-gray-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shadow-2xs">
              <Landmark size={18} />
            </div>
            <h3 className="text-base font-bold text-gray-900">{t("vaultCreate.title")}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
        {error && (
          <div className="bg-rose-50 border-b border-rose-200 text-rose-800 text-xs font-bold px-4 py-2.5">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-gray-800 mb-1">{t("vaultCreate.name")}<span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              maxLength={TEXT_FIELD_MAX_LENGTH}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 outline-none focus:border-slate-800"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-800 mb-1">{t("vaultCreate.type")}</label>
              <CustomDropdown
                value={formData.type}
                onChange={(val) => handleTypeChange(val)}
                options={[
                  { value: "cash_drawer", label: t("vaultType.cash_drawer") },
                  { value: "bank", label: t("vaultType.bank") },
                  { value: "sarafi", label: t("vaultType.sarafi") },
                ]}
                buttonClassName="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs font-medium text-gray-900 outline-none hover:border-gray-400 cursor-pointer"
                width="w-full"
                usePortal={true}
              />
            </div>
            <div>
              <label className="block font-bold text-gray-800 mb-1">{t("vaultCreate.currencyLabel")}</label>
              <CustomDropdown
                value={formData.currency}
                onChange={(val) => setFormData({ ...formData, currency: val })}
                options={[
                  { value: "AFN", label: t("currency.AFN") },
                  { value: "USD", label: t("currency.USD") },
                ]}
                buttonClassName="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs font-medium text-gray-900 outline-none hover:border-gray-400 cursor-pointer"
                width="w-full"
                usePortal={true}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-gray-800 flex items-center gap-1">
                  <span>{t("vaultCreate.accountNumber")}</span>
                  <Lock size={12} className="text-gray-400" />
                </label>
                <button
                  type="button"
                  onClick={() => fetchNextCode(formData.type)}
                  disabled={loadingCode}
                  className="text-3xs text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5 cursor-pointer disabled:opacity-50"
                  title={t("vaultCreate.regenerateTip")}
                >
                  <RefreshCw size={10} className={loadingCode ? "animate-spin" : ""} />
                  <span>{t("vaultCreate.regenerate")}</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  maxLength={TEXT_FIELD_MAX_LENGTH}
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  placeholder={loadingCode ? t("vaultCreate.loadingCode") : t("vaultCreate.accountPlaceholder")}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-800 font-mono font-bold outline-none focus:border-slate-800"
                />
              </div>
            </div>
            <div>
              <label className="block font-bold text-gray-800 mb-1">{t("vaultCreate.openingBalance")}</label>
              <input
                type="number"
                step="any"
                min={formData.type === VAULT_TYPE.CASH_DRAWER ? "0" : undefined}
                value={formData.initial_balance}
                onFocus={(e) => e.target.select()}
                onWheel={(e) => e.target.blur()}
                onChange={(e) => setFormData({ ...formData, initial_balance: e.target.value })}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 font-mono outline-none focus:border-slate-800"
              />
            </div>
          </div>
          <div>
            <label className="block font-bold text-gray-800 mb-1">{t("vaultCreate.notes")}</label>
            <textarea maxLength={NOTES_MAX_LENGTH}
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder={t("vaultCreate.notesPlaceholder")}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 outline-none focus:border-slate-800 resize-none"
            />
          </div>
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >{t("actions.cancel")}</button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 size={15} />
              <span>{submitting ? t("actions.saving") : t("vaultCreate.submit")}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
