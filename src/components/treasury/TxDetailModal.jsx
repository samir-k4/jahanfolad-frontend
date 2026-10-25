import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { formatTimeDari } from "../../utils/timeHelpers";
import { formatShamsiDate } from "../../utils";
import { NOTE_KEY } from "../../constants/treasuryDomain";
import { X, Printer, FileText, TrendingUp, TrendingDown } from "lucide-react";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import {
  getCategoryName,
  getSourceTitle,
  getPaymentMethod,
  getPartyName,
  getCreatedBy,
  getExchangeRate,
  formatDocNumber,
  isDeposit as isVaultDeposit,
} from "./treasuryHelpers";
const getMember = (tx) => {
  if (tx?.member?.name) return tx.member.name;
  if (tx?.notes) {
    const matched = tx.notes.match(new RegExp(`${NOTE_KEY.MEMBER}:\\s*([^-]+)`));
    if (matched && matched[1]?.trim()) return matched[1].trim();
  }
  return "";
};
export default function TxDetailModal({ tx, onClose, onPrint, namespace = "treasury" }) {
  const { t } = useTranslation(namespace);
  useBodyScrollLock(Boolean(tx));
  if (!tx) return null;
  const isDeposit = isVaultDeposit(tx);
  const categoryTitle = getCategoryName(tx, isDeposit);
  const sourceTitle = getSourceTitle(tx);
  const paymentTitle = getPaymentMethod(tx);
  const partyTitle = getPartyName(tx, isDeposit);
  const memberTitle = getMember(tx);
  const createdBy = getCreatedBy(tx, isDeposit);
  const docCode = formatDocNumber(tx.receipt_number, tx.id);
  return createPortal(
    <div
      className="fixed inset-0 top-0 left-0 right-0 bottom-0 m-0 mt-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs font-sans"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-modal shadow-2xl border border-gray-200 w-full max-w-2xl overflow-hidden font-sans animate-in fade-in zoom-in-95 duration-150 m-0 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-btn bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shadow-2xs">
              <FileText size={18} />
            </div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-gray-900">{t("txDetail.title")}</h3>
              <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-badge border border-slate-200 font-bold" dir="ltr">
                #{docCode}
              </span>
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
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              className={`p-3.5 rounded-card border ${
                isDeposit
                  ? "bg-emerald-50/60 border-emerald-200/80 text-emerald-800"
                  : "bg-rose-50/60 border-rose-200/80 text-rose-800"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold">
                  {isDeposit ? t("txDetail.depositAmount") : t("txDetail.withdrawAmount")}
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-badge border ${
                    isDeposit
                      ? "bg-emerald-100/80 text-emerald-800 border-emerald-200"
                      : "bg-rose-100/80 text-rose-800 border-rose-200"
                  }`}
                >
                  {isDeposit ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  <span>{isDeposit ? t("txDetail.deposit") : t("txDetail.withdraw")}</span>
                </span>
              </div>
              <div className="flex items-baseline gap-2" dir="ltr">
                <span
                  className={`text-2xl font-black font-mono tracking-tight ${
                    isDeposit ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  {Number(tx.amount || 0).toLocaleString("en-US")}
                </span>
                <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-white/80 border border-gray-200 text-gray-700">
                  {tx.currency}
                </span>
              </div>
            </div>
            <div className="p-3.5 rounded-card border bg-slate-50/80 border-slate-200/80 text-slate-800">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-700">{t("txDetail.balanceAfter")}</span>
                <span className="text-[11px] font-medium text-slate-500">{t("txDetail.liveStatus")}</span>
              </div>
              <div className="flex items-baseline gap-2" dir="ltr">
                <span className="text-2xl font-black font-mono tracking-tight text-slate-900">
                  {Number(tx.balance_after || 0).toLocaleString("en-US")}
                </span>
                <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                  {tx.vault?.currency || tx.currency}
                </span>
              </div>
            </div>
          </div>
          <div className="rounded-card border border-gray-200 overflow-hidden shadow-2xs">
            <table className="w-full text-xs text-right border-collapse">
              <tbody className="divide-y divide-gray-200 bg-white">
                <tr className="divide-x divide-x-reverse divide-gray-200">
                  <th className="w-28 py-2 px-3 bg-slate-50 text-slate-600 font-semibold select-none">{t("label.docNumber")}</th>
                  <td className="py-2 px-3 font-mono font-bold text-gray-800" dir="ltr">{docCode}</td>
                  <th className="w-28 py-2 px-3 bg-slate-50 text-slate-600 font-semibold select-none">{t("txDetail.recordedAt")}</th>
                  <td className="py-2 px-3 font-mono text-gray-800" dir="ltr">
                    {formatShamsiDate(tx.shamsi_date) || "—"}
                    {tx.transaction_time ? ` (${formatTimeDari(tx.transaction_time)})` : ""}
                  </td>
                </tr>
                <tr className="divide-x divide-x-reverse divide-gray-200">
                  <th className="py-2 px-3 bg-slate-50 text-slate-600 font-semibold select-none">{t("label.vault")}</th>
                  <td className="py-2 px-3 text-gray-800 font-bold">
                    {tx.vault?.name || "—"} ({tx.vault?.currency || tx.currency})
                  </td>
                  <th className="py-2 px-3 bg-slate-50 text-slate-600 font-semibold select-none">{t("txDetail.type")}</th>
                  <td className="py-2 px-3">
                    {isDeposit ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold px-2 py-0.5 rounded-badge">
                        <TrendingUp size={11} />
                        <span>{t("form.depositType")}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold px-2 py-0.5 rounded-badge">
                        <TrendingDown size={11} />
                        <span>{t("form.withdrawType")}</span>
                      </span>
                    )}
                  </td>
                </tr>
                <tr className="divide-x divide-x-reverse divide-gray-200">
                  <th className="py-2 px-3 bg-slate-50 text-slate-600 font-semibold select-none">{t("label.category")}</th>
                  <td className="py-2 px-3 text-gray-800 font-medium">{categoryTitle}</td>
                  <th className="py-2 px-3 bg-slate-50 text-slate-600 font-semibold select-none">{t("label.party")}</th>
                  <td className="py-2 px-3 text-gray-800 font-bold">{partyTitle}</td>
                </tr>
                <tr className="divide-x divide-x-reverse divide-gray-200">
                  <th className="py-2 px-3 bg-slate-50 text-slate-600 font-semibold select-none">{t("txDetail.paymentMethod")}</th>
                  <td className="py-2 px-3 text-gray-800">{paymentTitle}</td>
                  <th className="py-2 px-3 bg-slate-50 text-slate-600 font-semibold select-none">{t("txDetail.source")}</th>
                  <td className="py-2 px-3 text-gray-800">{sourceTitle}</td>
                </tr>
                <tr className="divide-x divide-x-reverse divide-gray-200">
                  <th className="py-2 px-3 bg-slate-50 text-slate-600 font-semibold select-none">{t("label.createdBy")}</th>
                  <td className="py-2 px-3 text-gray-800">{createdBy}</td>
                  <th className="py-2 px-3 bg-slate-50 text-slate-600 font-semibold select-none">{t("label.exchangeRate")}</th>
                  <td className="py-2 px-3 font-mono text-gray-800" dir="ltr">{getExchangeRate(tx)}</td>
                </tr>
                {memberTitle && (
                  <tr className="divide-x divide-x-reverse divide-gray-200">
                    <th className="py-2 px-3 bg-slate-50 text-slate-600 font-semibold select-none">{t("txDetail.member")}</th>
                    <td className="py-2 px-3 text-gray-800" colSpan={3}>{memberTitle}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-card p-3.5 space-y-1">
            <span className="text-xs font-bold text-gray-600 block">{t("txDetail.notes")}</span>
            <p className="text-xs text-gray-800 leading-relaxed break-words whitespace-normal font-normal">
              {tx.notes || "—"}
            </p>
          </div>
        </div>
        <div className="px-5 py-3.5 border-t border-gray-200 flex justify-between items-center bg-gray-50">
          <div className="text-xs text-gray-400 font-mono" dir="ltr">
            ID: #{tx.id}
          </div>
          <div className="flex items-center gap-2">
            {onPrint && (
              <button
                type="button"
                onClick={() => {
                  onPrint(tx);
                  onClose();
                }}
                className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-btn transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Printer size={15} />
                <span>{t("txDetail.print")}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-btn transition-colors cursor-pointer shadow-xs"
            >{t("txDetail.close")}</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
