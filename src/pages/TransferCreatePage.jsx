import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, AlertTriangle } from "lucide-react";
import { DateObject, persian, persian_af } from "../utils/dateHelpers";
import { toEnglishDigits } from "../utils/dariNumberFormatter";
import { formatTime12, showToast } from "../utils";
import { exceedsBalance, willGoNegative } from "../utils/vaultBalance";
import { apiUrl } from "../api";
import { SearchableSelect, usePagePerms } from "../components/common";

const formatDateValue = (value) => {
  const parts = toEnglishDigits(value).split("/");
  if (parts.length !== 3) return new DateObject({ calendar: persian, locale: persian_af });
  return new DateObject({ calendar: persian, locale: persian_af, year: parts[0], month: parts[1], day: parts[2] });
};

const formatAmount = (value) => Number(value || 0).toLocaleString("en-US");

export default function TransferCreatePage() {
  const { t } = useTranslation("transfers");
  const { id } = useParams();
  const navigate = useNavigate();
  const { canCreate, canEdit } = usePagePerms("treasury");
  const isEditMode = Boolean(id);

  const [vaults, setVaults] = useState([]);
  const [fromVaultId, setFromVaultId] = useState("");
  const [toVaultId, setToVaultId] = useState("");
  const [amount, setAmount] = useState("");
  const [dateObj, setDateObj] = useState(() => new DateObject({ calendar: persian, locale: persian_af }));
  const [time, setTime] = useState(() => formatTime12(new Date()));
  const [receipt, setReceipt] = useState("");
  const [notes, setNotes] = useState("");
  const [origin, setOrigin] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = isEditMode ? canEdit : canCreate;

  useEffect(() => {
    fetch(apiUrl("/vaults"))
      .then((res) => res.json())
      .then((json) => {
        if (Array.isArray(json.data)) setVaults(json.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isEditMode) {
      fetch(apiUrl(`/transfers/${id}`))
        .then((res) => res.json())
        .then((json) => {
          const d = json.data;
          if (!d) return;
          setFromVaultId(String(d.from_vault?.id || ""));
          setToVaultId(String(d.to_vault?.id || ""));
          setAmount(String(d.amount || ""));
          setDateObj(formatDateValue(d.shamsi_date));
          setTime(formatTime12(d.transaction_time || new Date()));
          setReceipt(d.receipt_number || "");
          setNotes(d.notes || "");
          setOrigin({ fromId: d.from_vault?.id, toId: d.to_vault?.id, amount: Number(d.amount || 0) });
        })
        .catch(() => showToast.error(t("messages.loadFailed")));
      return;
    }
    fetch(apiUrl("/vault-transactions/next-code"))
      .then((res) => res.json())
      .then((json) => {
        if (json.next_code) setReceipt(String(json.next_code));
      })
      .catch(() => {});
  }, [id, isEditMode, t]);

  const vaultOptions = useMemo(
    () => vaults.map((v) => ({ value: String(v.id), label: `${v.name} (${v.currency})` })),
    [vaults]
  );
  const toVaultOptions = useMemo(
    () => vaultOptions.filter((o) => o.value !== fromVaultId),
    [vaultOptions, fromVaultId]
  );

  const fromVault = vaults.find((v) => String(v.id) === fromVaultId) || null;
  const toVault = vaults.find((v) => String(v.id) === toVaultId) || null;
  const currency = fromVault?.currency || toVault?.currency || "";
  const numAmount = parseFloat(toEnglishDigits(amount)) || 0;

  const baseBalance = (vault) => {
    if (!vault) return 0;
    let balance = Number(vault.current_balance || 0);
    if (origin && String(vault.id) === String(origin.fromId)) balance += origin.amount;
    if (origin && String(vault.id) === String(origin.toId)) balance -= origin.amount;
    return balance;
  };
  const fromBefore = baseBalance(fromVault);
  const toBefore = baseBalance(toVault);
  const fromAfter = fromBefore - numAmount;
  const toAfter = toBefore + numAmount;

  const sameVault = Boolean(fromVaultId) && fromVaultId === toVaultId;
  const currencyMismatch = Boolean(fromVault && toVault) && fromVault.currency !== toVault.currency;
  const insufficient = exceedsBalance(fromVault, fromBefore, numAmount);
  const fromGoesNegative = willGoNegative(fromVault, fromBefore, numAmount);
  const blocked = sameVault || currencyMismatch || insufficient || numAmount <= 0 || !fromVaultId || !toVaultId;

  const handleFromChange = (val) => {
    setFromVaultId(val);
    if (val === toVaultId) setToVaultId("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (!fromVaultId || !toVaultId) {
      showToast.error(t("messages.vaultRequired"));
      return;
    }
    if (numAmount <= 0) {
      showToast.error(t("messages.amountInvalid"));
      return;
    }
    if (blocked) return;

    const gDate = dateObj.toDate();
    const gregDate = `${gDate.getFullYear()}-${String(gDate.getMonth() + 1).padStart(2, "0")}-${String(gDate.getDate()).padStart(2, "0")}`;
    const payload = {
      from_vault_id: Number(fromVaultId),
      to_vault_id: Number(toVaultId),
      amount: numAmount,
      transaction_date: gregDate,
      shamsi_date: toEnglishDigits(dateObj.format("YYYY/MM/DD")),
      transaction_time: time,
      notes,
      receipt_number: receipt,
    };

    setSubmitting(true);
    try {
      const res = await fetch(apiUrl(isEditMode ? `/transfers/${id}` : "/transfers"), {
        method: isEditMode ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.message || t(isEditMode ? "messages.updateFailed" : "messages.saveFailed"));
      }
      showToast.success(resData.message || t(isEditMode ? "messages.updated" : "messages.created"));
      navigate("/transfers");
    } catch (err) {
      showToast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div className="w-full space-y-4 font-sans" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-content-subtle font-medium mb-1">
            <Link to="/transfers" className="hover:text-content transition-colors">{t("page.title")}</Link>
          </div>
          <h1 className="text-xl font-bold text-content tracking-tight">
            {isEditMode ? t("form.titleEdit") : t("form.title")}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => navigate("/transfers")}
          className="px-4 py-2 text-btn-text font-bold text-content-body bg-surface border border-line-strong rounded-btn hover:bg-surface-muted transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowRight size={16} />
          <span>{t("actions.backToList")}</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-surface rounded-card border border-line shadow-2xs p-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-label-text font-bold text-content-body">{t("form.from")}</label>
              <SearchableSelect
                value={fromVaultId}
                onChange={handleFromChange}
                options={vaultOptions}
                placeholder={t("form.fromPlaceholder")}
                searchPlaceholder={t("form.vaultSearch")}
                usePortal
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-label-text font-bold text-content-body">{t("form.to")}</label>
              <SearchableSelect
                value={toVaultId}
                onChange={(val) => setToVaultId(val)}
                options={toVaultOptions}
                placeholder={t("form.toPlaceholder")}
                searchPlaceholder={t("form.vaultSearch")}
                usePortal
              />
            </div>
          </div>
          {sameVault && <p className="text-caption-text text-danger-text">{t("form.sameVault")}</p>}
          {currencyMismatch && <p className="text-caption-text text-danger-text">{t("form.currencyMismatch")}</p>}

          <div className="space-y-1.5">
            <label htmlFor="transfer-amount" className="block text-label-text font-bold text-content-body">
              {t("form.amount", { currency: currency || t("form.notSelected") })}
            </label>
            <input
              id="transfer-amount"
              type="text"
              inputMode="decimal"
              dir="ltr"
              value={amount}
              onChange={(e) => setAmount(toEnglishDigits(e.target.value))}
              onFocus={(e) => e.target.select()}
              onWheel={(e) => e.target.blur()}
              className="w-full h-10 px-3 bg-surface border border-line-strong rounded-input font-mono font-bold text-content outline-none focus:border-accent"
            />
          </div>

          <dl className="grid grid-cols-2 md:grid-cols-4 divide-x divide-line border border-line rounded-input bg-surface-muted overflow-hidden">
            <div className="px-3 py-2.5 space-y-0.5 text-right">
              <dt className="text-caption-text text-content-subtle">{t("form.receipt")}</dt>
              <dd className="font-mono font-bold text-content-strong text-right">{receipt || t("emptyValue")}</dd>
            </div>
            <div className="px-3 py-2.5 space-y-0.5 text-right">
              <dt className="text-caption-text text-content-subtle">{t("form.date")}</dt>
              <dd className="font-mono font-bold text-content-strong text-right">{dateObj.format("YYYY/MM/DD")}</dd>
            </div>
            <div className="px-3 py-2.5 space-y-0.5 text-right">
              <dt className="text-caption-text text-content-subtle">{t("form.time")}</dt>
              <dd className="font-mono font-bold text-content-strong text-right">{time}</dd>
            </div>
            <div className="px-3 py-2.5 space-y-0.5 text-right">
              <dt className="text-caption-text text-content-subtle">{t("form.currency")}</dt>
              <dd className="font-mono font-bold text-content-strong text-right">{currency || t("emptyValue")}</dd>
            </div>
          </dl>

          <div className="space-y-1.5">
            <label htmlFor="transfer-notes" className="block text-label-text font-bold text-content-body">{t("form.notes")}</label>
            <textarea
              id="transfer-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("form.notesPlaceholder")}
              className="w-full px-3 py-2 bg-surface border border-line-strong rounded-input text-body-text text-content outline-none focus:border-accent"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-surface rounded-card border border-line shadow-2xs p-5 space-y-4">
            <h2 className="text-section-title font-bold text-content-strong">{t("form.sectionBalances")}</h2>
            {[
              { vault: fromVault, before: fromBefore, after: fromAfter, tone: "text-danger-text" },
              { vault: toVault, before: toBefore, after: toAfter, tone: "text-positive-strong" },
            ].map(({ vault, before, after, tone }, idx) => (
              <div key={idx} className="space-y-2 pb-3 border-b border-line-soft last:border-b-0 last:pb-0">
                <p className="font-bold text-content-strong">{vault?.name || t("form.notSelected")}</p>
                <div className="flex items-center justify-between text-table-cell-text text-content-subtle">
                  <span>{t("form.balanceBefore")}</span>
                  <span className="font-mono text-content" dir="ltr">{formatAmount(before)} {vault?.currency || ""}</span>
                </div>
                <div className="flex items-center justify-between text-table-cell-text text-content-subtle">
                  <span>{t("form.balanceAfter")}</span>
                  <span className={`font-mono font-bold ${after < 0 ? "text-danger-text" : tone}`} dir="ltr">
                    {formatAmount(after)} {vault?.currency || ""}
                  </span>
                </div>
              </div>
            ))}
            {fromGoesNegative && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-badge flex items-start gap-2 text-amber-800 text-caption-text font-medium">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>{t("messages.willGoNegative", { balance: fromAfter.toLocaleString("en-US"), currency })}</span>
              </div>
            )}
            {insufficient && (
              <div className="p-3 bg-danger-soft border border-danger-line rounded-badge flex items-start gap-2 text-danger-text text-caption-text font-medium">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>{t("messages.insufficientBalance")}</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting || !canSubmit || blocked}
            className="w-full py-3 px-4 text-btn-text font-bold text-content-inverse bg-accent hover:bg-accent-hover rounded-btn transition-colors shadow-xs disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {submitting
              ? (isEditMode ? t("form.savingEdit") : t("form.saving"))
              : (isEditMode ? t("form.saveChanges") : t("form.submit"))}
          </button>
          <button
            type="button"
            onClick={() => navigate("/transfers")}
            className="w-full py-2.5 px-4 text-btn-text font-bold text-accent-strong bg-accent-soft border border-accent-line hover:bg-accent-subtle rounded-btn transition-colors cursor-pointer"
          >
            {t("actions.cancel")}
          </button>
        </div>
      </form>
    </div>
  );
}
