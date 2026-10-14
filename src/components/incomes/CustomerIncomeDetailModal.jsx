import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { X, Edit2, FileText } from "lucide-react";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import { numberToWordsDari } from "../../utils/numberToWordsDari";
import { formatDocNumber } from "../../utils/formatDocNumber";
import { formatTimeDari } from "../../utils/timeHelpers";
const fmt = (n) =>
  Number(n || 0).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
function DetailCard({ label, value, subValue, extra, badge, dir = "rtl" }) {
  return (
    <div className="bg-gray-50 p-3.5 rounded-card border border-gray-200/60 flex flex-col justify-between space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-label-text text-gray-500">{label}</span>
        {badge && (
          <span className="text-caption-text font-mono font-medium px-2 py-0.5 rounded-badge bg-white text-gray-700 border border-gray-200">
            {badge}
          </span>
        )}
      </div>
      <div
        className={`text-body-text font-bold text-gray-900 truncate ${
          dir === "ltr" ? "text-left" : "text-right"
        }`}
        dir={dir}
      >
        {value || "—"}
      </div>
      {(subValue || extra) && (
        <div className="text-caption-text text-gray-500 pt-1 border-t border-gray-100 flex items-center justify-between gap-2">
          {subValue && <span>{subValue}</span>}
          {extra && <span className="text-gray-400 font-mono">{extra}</span>}
        </div>
      )}
    </div>
  );
}
export default function CustomerIncomeDetailModal({
  isOpen,
  onClose,
  income,
  onOpenVoucher,
  onOpenEdit,
}) {
  const { t } = useTranslation("incomes");
  useBodyScrollLock(isOpen);
  if (!isOpen || !income) return null;
  const docCode = formatDocNumber(income.receipt_number, income.id);
  const amount = parseFloat(income.amount || 0);
  const currency = income.currency || "USD";
  const currencyTitle = currency === "USD" ? t("currency.USD") : t("currency.AFN");
  const amountInWords = `${numberToWordsDari(amount)} ${currencyTitle}`;
  const convertedUsd = parseFloat(income.converted_amount_usd || 0);
  const exchangeRate = parseFloat(income.exchange_rate || 70.0);
  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs font-sans"
      dir="rtl"
    >
      <div className="bg-white rounded-modal shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col">
        <div className="bg-white text-gray-900 px-5 py-3.5 flex justify-between items-center border-b border-gray-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-btn bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shadow-2xs">
              <FileText size={18} />
            </div>
            <div className="flex items-center gap-2">
              <h3 className="text-section-title text-gray-900">{t("detail.title")}</h3>
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
        <div className="p-5 max-h-[75vh] overflow-y-auto space-y-4">
          <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-label-text font-semibold text-emerald-800 block">{t("label.amount")}</span>
              <div className="flex items-baseline gap-2">
                <span
                  className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono tracking-tight"
                  dir="ltr"
                >
                  {fmt(amount)}
                </span>
                <span className="text-caption-text font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-badge border border-emerald-200">
                  {currency}
                </span>
              </div>
              <div className="text-caption-text text-emerald-900/80 font-medium pt-0.5">
                {amountInWords}
              </div>
            </div>
            {convertedUsd > 0 && currency !== "USD" && (
              <div
                className="bg-white/95 border border-emerald-200/70 px-3.5 py-2 rounded-card text-left shrink-0 shadow-2xs"
                dir="ltr"
              >
                <div className="text-caption-text text-gray-500 font-medium">{t("detail.usdEquivalent")}</div>
                <div className="text-body-text font-bold text-emerald-700 font-mono">
                  ${fmt(convertedUsd)} USD
                </div>
                <div className="text-caption-text text-gray-400 font-mono">
                  Rate: {exchangeRate} AFN
                </div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DetailCard
              label={t("detail.customer")}
              value={income.payer_name || "—"}
              subValue={
                income.customer
                  ? `کد: ${income.customer.customer_code || income.customer.id}`
                  : null
              }
              extra={income.customer?.phone ? `تلفن: ${income.customer.phone}` : null}
            />
            <DetailCard
              label={t("detail.vault")}
              value={income.vault?.name || t("detail.mainVault")}
              badge={income.currency}
              subValue={
                income.vault
                  ? `موجودی: ${fmt(income.vault.current_balance)} ${income.currency}`
                  : null
              }
            />
            <DetailCard
              label={t("label.category")}
              value={
                income.category?.name || income.category_name || t("label.customerIncome")
              }
              subValue={income.title ? `عنوان: ${income.title}` : null}
            />
            <DetailCard
              label={t("label.receiver")}
              value={income.received_by || t("detail.cashier")}
              subValue={`ثبت‌کننده: ${
                income.createdBy?.name || income.created_by_user_id || t("detail.system")
              }`}
            />
            <DetailCard
              label={t("label.date")}
              value={income.shamsi_date || "—"}
            />
            <DetailCard
              label={t("detail.recordedAt")}
              value={formatTimeDari(income.created_at)}
            />
          </div>
          <div className="bg-gray-50 p-3.5 rounded-card border border-gray-200/60 space-y-1">
            <strong className="text-label-text font-bold text-gray-900 block">{t("label.notes")}</strong>
            <p className="text-body-text text-gray-700 leading-relaxed font-normal whitespace-pre-wrap">
              {income.description || income.title || t("detail.noNotes")}
            </p>
          </div>
        </div>
        <div className="bg-gray-50 px-5 py-3 border-t border-gray-200 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onOpenVoucher) onOpenVoucher(income);
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-btn-text font-bold rounded-btn flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <FileText size={15} />
              <span>{t("detail.viewVoucher")}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onOpenEdit) onOpenEdit(income);
              }}
              className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 text-btn-text font-bold rounded-btn border border-gray-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Edit2 size={13} />
              <span>{t("detail.edit")}</span>
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 text-btn-text font-bold rounded-btn border border-gray-300 transition-colors cursor-pointer"
          >{t("detail.close")}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
