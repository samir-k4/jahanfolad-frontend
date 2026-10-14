import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { NOTES_MAX_LENGTH } from "../../constants/treasuryDomain";
import { createPortal } from "react-dom";
import DatePicker from "react-multi-date-picker";
import { DateObject, persian, persian_af } from "../../utils/dateHelpers";
import { ArrowRightLeft, X, Calendar, CheckCircle2, RefreshCw } from "lucide-react";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import { SearchableSelect, usePagePerms } from "../common";
import { apiUrl } from "../../api";
import { toEnglishDigits } from "../../utils";
export default function VaultExchangeModal({
  isOpen,
  onClose,
  onSuccess,
  onSubmit,
  vaults = [],
}) {
  const { t } = useTranslation("treasury");
  const { canCreate } = usePagePerms("treasury");
  useBodyScrollLock(isOpen);
  const [fromVaultId, setFromVaultId] = useState("");
  const [toVaultId, setToVaultId] = useState("");
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [exchangeRate, setExchangeRate] = useState("71.00");
  const [dateObj, setDateObj] = useState(() => new DateObject({ calendar: persian, locale: persian_af }));
  const [paidBy, setPaidBy] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (isOpen) {
      const usd = vaults.find((v) => v.currency === "USD") || vaults[0];
      const afn = vaults.find((v) => v.currency === "AFN" && String(v.id) !== String(usd?.id)) || vaults[1];
      setFromVaultId(usd?.id ? String(usd.id) : "");
      setToVaultId(afn?.id ? String(afn.id) : "");
      setFromAmount("");
      setToAmount("");
      setExchangeRate("71.00");
      setDateObj(new DateObject({ calendar: persian, locale: persian_af }));
      setPaidBy(t("party.finance"));
      setReceivedBy(t("party.cashier"));
      setNotes("");
      setError("");
    }
  }, [isOpen, vaults]);
  const handleFromAmountChange = (val) => {
    setFromAmount(val);
    const rate = parseFloat(exchangeRate) || 0;
    const fromVal = parseFloat(val) || 0;
    const fromV = vaults.find((v) => String(v.id) === String(fromVaultId));
    const toV = vaults.find((v) => String(v.id) === String(toVaultId));
    if (rate > 0 && fromVal > 0) {
      if (fromV?.currency === "USD" && toV?.currency === "AFN") {
        setToAmount((fromVal * rate).toFixed(2));
      } else if (fromV?.currency === "AFN" && toV?.currency === "USD") {
        setToAmount((fromVal / rate).toFixed(2));
      } else {
        setToAmount((fromVal * rate).toFixed(2));
      }
    }
  };
  const handleRateChange = (val) => {
    setExchangeRate(val);
    const rate = parseFloat(val) || 0;
    const fromVal = parseFloat(fromAmount) || 0;
    const fromV = vaults.find((v) => String(v.id) === String(fromVaultId));
    const toV = vaults.find((v) => String(v.id) === String(toVaultId));
    if (rate > 0 && fromVal > 0) {
      if (fromV?.currency === "USD" && toV?.currency === "AFN") {
        setToAmount((fromVal * rate).toFixed(2));
      } else if (fromV?.currency === "AFN" && toV?.currency === "USD") {
        setToAmount((fromVal / rate).toFixed(2));
      } else {
        setToAmount((fromVal * rate).toFixed(2));
      }
    }
  };
  if (!isOpen) return null;
  const handleSubmit = async (e) => {
    if (!canCreate) return;
    e.preventDefault();
    if (!fromVaultId || !toVaultId) {
      setError(t("transfer.selectBoth"));
      return;
    }
    if (fromVaultId === toVaultId) {
      setError(t("exchange.sameVault"));
      return;
    }
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      setError(t("exchange.invalidFrom"));
      return;
    }
    if (!toAmount || parseFloat(toAmount) <= 0) {
      setError(t("exchange.invalidTo"));
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const gDate = dateObj.toDate();
      const y = gDate.getFullYear();
      const m = String(gDate.getMonth() + 1).padStart(2, "0");
      const d = String(gDate.getDate()).padStart(2, "0");
      const gregDate = `${y}-${m}-${d}`;
      const shamsiDate = toEnglishDigits(dateObj.format("YYYY/MM/DD"));
      const payload = {
        from_vault_id: fromVaultId,
        to_vault_id: toVaultId,
        from_amount: parseFloat(fromAmount),
        to_amount: parseFloat(toAmount),
        exchange_rate: parseFloat(exchangeRate),
        transaction_date: gregDate,
        shamsi_date: shamsiDate,
        paid_by: paidBy || t("party.finance"),
        received_by: receivedBy || t("party.cashier"),
        notes: notes.trim(),
      };
      if (onSubmit) {
        await onSubmit(payload);
        onClose();
        return;
      }
      const res = await fetch(apiUrl("/vaults/exchange"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.message || t("exchange.error"));
      if (onSuccess) {
        onSuccess(resData.message || t("exchange.success"));
      }
      onClose();
    } catch (err) {
      setError(err.message || t("messages.serverError"));
    } finally {
      setSubmitting(false);
    }
  };
  const selectedFromVault = vaults.find((v) => String(v.id) === String(fromVaultId));
  const selectedToVault = vaults.find((v) => String(v.id) === String(toVaultId));
  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs font-sans" dir="rtl">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-white px-5 py-3.5 flex justify-between items-center border-b border-gray-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shadow-2xs">
              <ArrowRightLeft size={18} />
            </div>
            <h3 className="text-base font-bold text-gray-900">{t("exchange.title")}</h3>
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
            <label className="block font-bold text-gray-800 mb-1 flex items-center gap-1">
              <Calendar size={14} className="text-slate-700" />
              <span>{t("exchange.date")}</span>
            </label>
            <DatePicker
              value={dateObj}
              onChange={setDateObj}
              calendar={persian}
              locale={persian_af}
              calendarPosition="bottom-right"
              inputClass="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-gray-900 font-mono outline-none focus:border-slate-800"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-800 mb-1">{t("transfer.from")}<span className="text-rose-600">*</span>
              </label>
              <SearchableSelect
                value={fromVaultId}
                onChange={(val) => setFromVaultId(val)}
                options={vaults}
                getOptionLabel={(v) => `${v.name} (${v.currency}) — موجودی: ${Number(v.current_balance || 0).toLocaleString()}`}
                getOptionValue={(v) => String(v.id)}
                placeholder={t("transfer.fromPlaceholder")}
                searchPlaceholder={t("label.vaultSearch")}
                buttonClassName="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-900 outline-none hover:border-gray-400"
                usePortal={true}
              />
            </div>
            <div>
              <label className="block font-bold text-gray-800 mb-1">{t("transfer.to")}<span className="text-rose-600">*</span>
              </label>
              <SearchableSelect
                value={toVaultId}
                onChange={(val) => setToVaultId(val)}
                options={vaults.filter((v) => String(v.id) !== String(fromVaultId))}
                getOptionLabel={(v) => `${v.name} (${v.currency})`}
                getOptionValue={(v) => String(v.id)}
                placeholder={t("transfer.toPlaceholder")}
                searchPlaceholder={t("label.vaultSearch")}
                buttonClassName="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-900 outline-none hover:border-gray-400"
                usePortal={true}
              />
            </div>
          </div>
          <div>
            <label className="block font-bold text-gray-800 mb-1">{t("exchange.rate")}<span className="text-rose-600">*</span>
            </label>
            <input
              type="number"
              step="any"
              placeholder="71.00"
              value={exchangeRate}
              onFocus={(e) => e.target.select()}
              onWheel={(e) => e.target.blur()}
              onChange={(e) => handleRateChange(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-gray-900 outline-none font-mono font-bold focus:border-slate-800 text-left"
              dir="ltr"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-800 mb-1">
                مبلغ کسر از مبدأ ({selectedFromVault?.currency || "USD"}): <span className="text-rose-600">*</span>
              </label>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={fromAmount}
                onFocus={(e) => e.target.select()}
                onWheel={(e) => e.target.blur()}
                onChange={(e) => handleFromAmountChange(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-gray-900 outline-none font-mono font-bold focus:border-slate-800 text-left"
                dir="ltr"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-gray-800 mb-1">
                مبلغ واریز به مقصد ({selectedToVault?.currency || "AFN"}): <span className="text-rose-600">*</span>
              </label>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={toAmount}
                onFocus={(e) => e.target.select()}
                onWheel={(e) => e.target.blur()}
                onChange={(e) => setToAmount(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-gray-900 outline-none font-mono font-bold focus:border-slate-800 text-left bg-gray-50"
                dir="ltr"
                required
              />
            </div>
          </div>
          <div>
            <label className="block font-bold text-gray-800 mb-1">{t("transfer.notes")}</label>
            <textarea maxLength={NOTES_MAX_LENGTH}
              rows={2}
              placeholder={t("exchange.notesPlaceholder")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs text-gray-900 outline-none focus:border-slate-800"
            />
          </div>
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >{t("actions.cancel")}</button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
            >
              {submitting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>{t("exchange.submitting")}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  <span>{t("exchange.submit")}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
