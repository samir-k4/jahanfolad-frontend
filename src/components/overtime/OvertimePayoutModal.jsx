import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Check, Loader2, Send, X } from "lucide-react";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import { apiFetch } from "../../api";
import { SearchableSelect } from "../common";
import { showToast, numberToWordsDari, toEnglishDigits } from "../../utils";
import { getCleanErrorMessage } from "../../utils/errorHandler";
import { exceedsBalance } from "../../utils/vaultBalance";
const NOTES_MAX_LENGTH = 1000;
const NAME_MAX_LENGTH = 150;
const KINDS = ["week", "friday"];
const LABEL = "block text-label-text text-content-body mb-1";
const FIELD =
  "w-full bg-surface border border-line-strong rounded-input py-1.5 px-2.5 text-label-text text-content outline-none focus:border-accent-strong";
const HEAD =
  "px-2 py-2 rounded-none text-table-header-text font-bold text-content-body border-l border-line bg-surface-muted whitespace-nowrap";
const CELL = "px-2 py-1.5 rounded-none border-l border-line text-caption-text align-middle";
const NUM = `${CELL} text-center font-mono whitespace-nowrap`;
const STEP = "text-caption-text font-bold text-content-subtle";
const money = (value) => Number(value || 0).toLocaleString("en-US");
const dash = (value) => (value === null || value === undefined || value === "" ? "—" : value);
export default function OvertimePayoutModal({ isOpen, onClose, date, branchId, onRequested }) {
  useBodyScrollLock(isOpen);
  const { t } = useTranslation("overtime");
  const [periods, setPeriods] = useState(null);
  const [receivers, setReceivers] = useState([]);
  const [vaults, setVaults] = useState([]);
  const [usdRate, setUsdRate] = useState(70);
  const [vaultId, setVaultId] = useState("");
  const [exchangeRate, setExchangeRate] = useState("1");
  const [kind, setKind] = useState(KINDS[0]);
  const [loading, setLoading] = useState(false);
  const [receiverId, setReceiverId] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const receiverOptions = useMemo(
    () =>
      receivers.map((person) => ({
        value: String(person.employee_id),
        label: `${person.full_name} — ${person.position || person.employee_ID || ""}`,
      })),
    [receivers],
  );
  const load = useCallback(async () => {
    if (!isOpen || !date) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ date });
      if (branchId && branchId !== "all") params.set("branch_id", String(branchId));
      const vaultParams = new URLSearchParams();
      if (branchId && branchId !== "all") vaultParams.set("branch_id", String(branchId));
      const vaultPath = `/overtime-payouts/vault-options${vaultParams.toString() ? `?${vaultParams}` : ""}`;
      const [body, vaultResponse] = await Promise.all([
        apiFetch(`/overtime-payouts/preview?${params.toString()}`),
        apiFetch(vaultPath),
      ]);
      setPeriods(body?.periods || null);
      setReceivers(Array.isArray(body?.receivers) ? body.receivers : []);
      setUsdRate(Number(body?.usd_rate) > 0 ? Number(body.usd_rate) : 70);
      setVaults(Array.isArray(vaultResponse?.data) ? vaultResponse.data : []);
    } catch (err) {
      showToast.error(getCleanErrorMessage(err, t("payout.previewError")));
    } finally {
      setLoading(false);
    }
  }, [isOpen, date, branchId, t]);
  useEffect(() => {
    load();
  }, [load]);
  const active = periods?.[kind] || null;
  const total = Number(active?.total_amount || 0);
  const selectedVault = vaults.find((vault) => String(vault.id) === String(vaultId)) || null;
  const vaultCurrency = String(selectedVault?.currency || "AFN").toUpperCase();
  const needsRate = Boolean(selectedVault) && vaultCurrency !== "AFN";
  const enteredRate = Number(toEnglishDigits(exchangeRate));
  const appliedRate = needsRate ? enteredRate : 1;
  const vaultDeduction = Math.round(total * (appliedRate > 0 ? appliedRate : 0) * 100) / 100;
  const insufficientBalance = exceedsBalance(selectedVault, Number(selectedVault?.current_balance || 0), vaultDeduction);
  const amountInWords = useMemo(() => numberToWordsDari(total), [total]);
  const alreadyDone = !!active?.payout;
  const canSend =
    !loading &&
    !!active &&
    !alreadyDone &&
    active.is_closed &&
    total > 0 &&
    (!!receiverId || receiverName.trim() !== "") &&
    Boolean(selectedVault) &&
    (!needsRate || enteredRate > 0) &&
    !insufficientBalance;
  const submit = async (event) => {
    event.preventDefault();
    if (!canSend) return;
    setSubmitting(true);
    try {
      const body = await apiFetch("/overtime-payouts", {
        method: "POST",
        body: {
          date,
          kind,
          branch_id: branchId && branchId !== "all" ? Number(branchId) : undefined,
          vault_id: Number(vaultId),
          exchange_rate: appliedRate,
          receiver_employee_id: receiverId ? Number(receiverId) : undefined,
          receiver_name: receiverId ? undefined : receiverName.trim(),
          notes: notes.trim() || undefined,
        },
      });
      showToast.success(body?.message || "");
      setNotes("");
      onRequested?.(body?.data || null);
      load();
    } catch (err) {
      showToast.error(getCleanErrorMessage(err, t("payout.saveError")));
    } finally {
      setSubmitting(false);
    }
  };
  const periodState = (period) => {
    if (!period) return "";
    if (period.payout) return t("payout.alreadyRequested", { receipt: period.payout.receipt_number });
    if (Number(period.total_amount || 0) <= 0) return t("payout.stateEmpty");
    if (!period.is_closed) return t("payout.stateOpen");
    return t("payout.stateReady");
  };
  const periodTone = (period) => {
    if (period?.payout) return "text-positive-strong";
    if (!period || Number(period.total_amount || 0) <= 0 || !period.is_closed) return "text-content-subtle";
    return "text-accent-strong";
  };
  const vaultOptions = vaults.map((vault) => ({
    value: String(vault.id),
    label: `${vault.name} — ${money(vault.current_balance)} ${String(vault.currency || "AFN").toUpperCase()}`,
  }));
  const defaultRateForVault = (currency) => {
    if (currency === "USD" && usdRate > 0) return (1 / usdRate).toFixed(6);
    return currency === "AFN" ? "1" : "";
  };
  useEffect(() => {
    if (selectedVault) setExchangeRate(defaultRateForVault(vaultCurrency));
  }, [vaultId, usdRate, selectedVault?.currency]);
  if (!isOpen) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-overlay/50 backdrop-blur-xs font-sans"
      dir="rtl"
    >
      <form
        onSubmit={submit}
        className="w-full max-w-4xl h-[85vh] max-h-[85vh] rounded-modal bg-surface shadow-2xl border border-line overflow-hidden flex flex-col"
      >
        <div className="px-5 py-3.5 border-b border-line flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 rounded-card bg-accent-subtle text-accent-strong flex items-center justify-center shrink-0">
              <Send className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <h3 className="text-section-title text-content-strong">{t("payout.modalTitle")}</h3>
              <p className="text-caption-text text-content-subtle font-medium whitespace-normal break-words">
                {t("payout.modalSubtitle")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("actions.close", { ns: "common" })}
            className="w-8 h-8 rounded-btn flex items-center justify-center text-content-faint hover:text-content-muted hover:bg-surface-subtle transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
          <div className="space-y-1.5">
            <p className={STEP}>{t("payout.step1")}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {KINDS.map((option) => {
                const period = periods?.[option];
                const selected = kind === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setKind(option)}
                    className={`text-right p-2.5 rounded-card border transition-colors cursor-pointer ${
                      selected ? "border-accent-strong bg-accent-soft" : "border-line bg-surface hover:bg-surface-muted"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-label-text font-bold text-content-strong">
                        {t(option === "friday" ? "payout.periodFriday" : "payout.periodWeek")}
                      </span>
                      {selected ? <Check className="w-4 h-4 text-accent-strong shrink-0" /> : null}
                    </div>
                    <p className="text-caption-text text-content-subtle mt-0.5 whitespace-normal break-words leading-snug">
                      {dash(period?.label)}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-caption-text text-content-muted">
                      <span>
                        <span className="font-mono font-bold text-content-strong" dir="ltr">
                          {period?.employee_count ?? 0}
                        </span>{" "}
                        {t("payout.people")}
                      </span>
                      <span>
                        <span className="font-mono font-bold text-content-strong" dir="ltr">
                          {period?.total_hours ?? 0}
                        </span>{" "}
                        {t("table.hoursUnit")}
                      </span>
                      <span className="font-mono font-bold text-content-strong" dir="ltr">
                        {money(period?.total_amount)}
                      </span>
                    </div>
                    <p className={`text-caption-text mt-1 font-medium ${periodTone(period)}`}>
                      {periodState(period)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-1.5">
            <p className={STEP}>{t("payout.step2")}</p>
            {loading ? (
              <p className="py-10 text-center text-label-text text-content-subtle">{t("payout.loading")}</p>
            ) : (
              <div className="rounded-card border border-line overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-right border-collapse">
                    <thead className="sticky top-0 z-10">
                      <tr className="border-b border-line">
                        <th className={`${HEAD} text-center w-10`}>{t("table.rowIndex", { ns: "common" })}</th>
                        <th className={`${HEAD} text-center`}>{t("payout.colCode")}</th>
                        <th className={HEAD}>{t("table.fullName", { ns: "common" })}</th>
                        <th className={HEAD}>{t("payout.colPosition")}</th>
                        <th className={`${HEAD} text-center`}>{t("table.hoursUnit")}</th>
                        <th className={`${HEAD} text-center`}>{t("payout.colRate")}</th>
                        <th className={`${HEAD} text-center border-l-0`}>
                          {t("table.amount", { ns: "common" })}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="text-content">
                      {(active?.lines || []).length === 0 ? (
                        <tr className="border-b border-line">
                          <td className={`${CELL} text-center text-content-subtle border-l-0`} colSpan={7}>
                            {t("payout.noLines")}
                          </td>
                        </tr>
                      ) : (
                        active.lines.map((line) => (
                          <tr key={line.employee_id} className="border-b border-line">
                            <td className={`${NUM} text-content-subtle`} dir="ltr">
                              {line.sort_order}
                            </td>
                            <td className={NUM} dir="ltr">
                              {dash(line.employee_code)}
                            </td>
                            <td className={`${CELL} whitespace-normal break-words font-bold leading-snug`}>
                              {line.full_name}
                            </td>
                            <td className={`${CELL} text-content-muted whitespace-normal break-words leading-snug`}>
                              {dash(line.position)}
                            </td>
                            <td className={NUM} dir="ltr">
                              {line.hours}
                            </td>
                            <td className={NUM} dir="ltr">
                              {money(line.hourly_rate)}
                            </td>
                            <td className={`${NUM} font-bold text-content-strong border-l-0`} dir="ltr">
                              {money(line.amount)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="px-3 py-2 bg-surface-muted border-t border-line flex items-center justify-between gap-3">
                  <span className="text-caption-text text-content-muted whitespace-normal break-words leading-snug">
                    {total > 0 ? amountInWords : "—"}
                  </span>
                  <span className="shrink-0 text-left">
                    <span className="block text-caption-text text-content-subtle">{t("payout.totalLabel")}</span>
                    <span className="font-mono font-bold text-base text-content-strong" dir="ltr">
                      {money(total)}
                    </span>
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <p className={STEP}>{t("payout.step3")}</p>
            <p className="text-caption-text text-content-subtle whitespace-normal break-words leading-snug">
              {t("payout.receiverHint")}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="min-w-0">
                <label className={LABEL}>{t("payout.receiverEmployee")}</label>
                <SearchableSelect
                  value={receiverId}
                  onChange={(value) => {
                    setReceiverId(value);
                    if (value) setReceiverName("");
                  }}
                  options={receiverOptions}
                  placeholder={
                    receiverOptions.length === 0
                      ? t("payout.noReceiver")
                      : t("payout.receiverPlaceholder")
                  }
                  searchPlaceholder={t("payout.receiverSearch")}
                  buttonClassName={FIELD}
                />
              </div>
              <div className="min-w-0">
                <label className={LABEL}>{t("payout.receiverOrName")}</label>
                <input
                  type="text"
                  dir="rtl"
                  value={receiverName}
                  maxLength={NAME_MAX_LENGTH}
                  onChange={(event) => {
                    setReceiverName(event.target.value);
                    if (event.target.value) setReceiverId("");
                  }}
                  placeholder={t("payout.receiverNamePlaceholder")}
                  className={`${FIELD} text-right`}
                />
              </div>
            </div>
            <textarea
              rows={2}
              dir="rtl"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={NOTES_MAX_LENGTH}
              placeholder={t("payout.notesPlaceholder")}
              className={`${FIELD} text-right leading-6 resize-none`}
            />
          </div>
          <div className="space-y-1.5">
            <p className={STEP}>{t("payout.step4")}</p>
            <label className={LABEL}>
              {t("payout.vault")} <span className="text-danger-text">*</span>
            </label>
            <SearchableSelect
              value={vaultId}
              onChange={setVaultId}
              options={vaultOptions}
              placeholder={t("payout.vaultPlaceholder")}
              searchPlaceholder={t("payout.vaultSearch")}
              buttonClassName={FIELD}
            />
            {!loading && vaultOptions.length === 0 && (
              <p role="status" className="text-caption-text text-danger-text">
                {t("payout.noAvailableVaults")}
              </p>
            )}
            {selectedVault && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="rounded-card border border-line bg-surface-muted px-3 py-2">
                  <span className="block text-caption-text text-content-subtle">{t("payout.vaultBalance")}</span>
                  <span className="font-mono font-bold text-content-strong" dir="ltr">
                    {money(selectedVault.current_balance)} {vaultCurrency}
                  </span>
                </div>
                {needsRate ? (
                  <div>
                    <label className={LABEL}>{t("payout.exchangeRate")}</label>
                    <input
                      type="number"
                      min="0.0001"
                      step="any"
                      dir="ltr"
                      value={exchangeRate}
                      onChange={(event) => setExchangeRate(event.target.value)}
                      className={FIELD}
                    />
                  </div>
                ) : (
                  <div className="rounded-card border border-line bg-surface-muted px-3 py-2">
                    <span className="block text-caption-text text-content-subtle">{t("payout.deduction")}</span>
                    <span className="font-mono font-bold text-content-strong" dir="ltr">
                      {money(vaultDeduction)} {vaultCurrency}
                    </span>
                  </div>
                )}
              </div>
            )}
            {needsRate && selectedVault && (
              <div className="flex items-center justify-between rounded-card border border-line bg-surface-muted px-3 py-2 text-caption-text">
                <span className="text-content-subtle">{t("payout.deduction")}</span>
                <span className={`font-mono font-bold ${insufficientBalance ? "text-danger-text" : "text-content-strong"}`} dir="ltr">
                  {money(vaultDeduction)} {vaultCurrency}
                </span>
              </div>
            )}
            {insufficientBalance && (
              <p className="text-caption-text font-bold text-danger-text">{t("payout.insufficientBalance")}</p>
            )}
            <p className="rounded-card bg-notice-soft border border-notice-line px-3 py-2 text-caption-text text-notice-text">
              {t("payout.immediateDeduction")}
            </p>
          </div>
        </div>
        <div className="px-5 py-3 bg-surface-muted border-t border-line flex justify-between items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-label-text font-bold text-content-body bg-surface hover:bg-surface-subtle rounded-btn border border-line-strong transition-colors cursor-pointer"
          >
            {t("actions.cancel", { ns: "common" })}
          </button>
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-caption-text text-content-subtle truncate">
              {selectedVault
                ? `${t("payout.deduction")}: ${money(vaultDeduction)} ${vaultCurrency}`
                : periodState(active)}
            </span>
            <button
              type="submit"
              disabled={submitting || !canSend}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-accent-soft hover:bg-accent-subtle text-accent-strong border border-accent-line rounded-btn text-label-text font-bold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>{t("payout.submit")}</span>
            </button>
          </div>
        </div>
      </form>
    </div>,
    document.body,
  );
}
