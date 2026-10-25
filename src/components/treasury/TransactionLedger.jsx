import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Info,
  Pencil,
  FileText,
  Trash2,
} from "lucide-react";
import TxDetailModal from "./TxDetailModal";
import TooltipButton from "../common/TooltipButton";
import DeleteConfirmationModal from "../common/DeleteConfirmationModal";
import TablePagination from "../common/TablePagination";
import { usePagePerms } from "../common";
import { apiUrl } from "../../api";
import { showToast } from "../../utils/toast";
import { getCleanErrorMessage } from "../../utils/errorHandler";
import { toEnglishDigits } from "../../utils";
import {
  formatDocNumber,
  getCategoryName,
  getExchangeRate,
  getPartyName,
  getCreatedBy,
  isDeposit as isVaultDeposit,
} from "./treasuryHelpers";
export default function TransactionLedger({
  transactions,
  loading,
  paginationMeta,
  perPage,
  onPageChange,
  onPerPageChange,
  onPrint,
  onTransactionUpdated,
  onTransactionDeleted,
}) {
  const { t } = useTranslation("treasury");
  const { canDelete } = usePagePerms("treasury");
  const navigate = useNavigate();
  const [detailTx, setDetailTx] = useState(null);
  const [deleteTx, setDeleteTx] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const handleConfirmDelete = async () => {
    if (!deleteTx || !canDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(apiUrl(`/vault-transactions/${encodeURIComponent(deleteTx.id)}`), {
        method: "DELETE",
        headers: {
          Accept: "application/json",
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || t("messages.txDeleteFailed"));
      }
      showToast.success(data.message || t("messages.txDeleted"));
      setDeleteTx(null);
      if (onTransactionDeleted) {
        onTransactionDeleted(deleteTx);
      } else if (onPageChange) {
        onPageChange(paginationMeta?.current_page || 1);
      }
    } catch (err) {
      showToast.error(getCleanErrorMessage(err, t("messages.serverError")));
    } finally {
      setDeleting(false);
    }
  };
  if (loading) {
    return (
      <div className="p-16 text-center text-gray-500 space-y-2 font-sans">
        <div className="w-8 h-8 border-2 border-slate-800 border-t-transparent rounded-full animate-spin mx-auto" />
        <span className="text-sm font-bold text-gray-700 block">{t("actions.loading")}</span>
      </div>
    );
  }
  if (transactions.length === 0) {
    return (
      <div className="p-16 text-center text-gray-500 text-sm bg-white rounded-xl border border-dashed border-gray-300 font-sans">{t("ledger.empty")}</div>
    );
  }
  return (
    <div className="space-y-2 font-sans" dir="rtl">
      <div className="w-full overflow-x-auto border border-gray-200 rounded-lg bg-white">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-600 font-semibold select-none text-xs border-b border-gray-200">
              <th className="py-1.5 px-1.5 text-center w-10 border border-gray-200">{t("label.index")}</th>
              <th className="py-1.5 px-2 text-center border border-gray-200 min-w-[70px]">{t("label.docNumber")}</th>
              <th className="py-1.5 px-2 text-center border border-gray-200 min-w-[85px]">{t("ledger.date")}</th>
              <th className="py-1.5 px-2.5 text-right border border-gray-200 min-w-[105px]">{t("label.vault")}</th>
              <th className="py-1.5 px-2 text-center border border-gray-200 min-w-[80px]">{t("ledger.type")}</th>
              <th className="py-1.5 px-2.5 text-right border border-gray-200 min-w-[95px]">{t("label.category")}</th>
              <th className="py-1.5 px-2.5 text-right border border-gray-200 min-w-[105px]">{t("label.party")}</th>
              <th className="py-1.5 px-2.5 text-center border border-gray-200 min-w-[95px]">{t("ledger.amount")}</th>
              <th className="py-1.5 px-1.5 text-center border border-gray-200 min-w-[55px]">{t("label.currency")}</th>
              <th className="py-1.5 px-1.5 text-center border border-gray-200 min-w-[70px]">{t("label.exchangeRate")}</th>
              <th className="py-1.5 px-2.5 text-right border border-gray-200 min-w-[100px]">{t("label.createdBy")}</th>
              <th className="py-1.5 px-2.5 text-right border border-gray-200 min-w-[160px]">{t("ledger.notes")}</th>
              <th className="py-1.5 px-2 text-center min-w-[130px] border border-gray-200">{t("label.actions")}</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {transactions.map((tx, idx) => {
              const isDeposit = isVaultDeposit(tx);
              const rowIndex = ((paginationMeta?.current_page || 1) - 1) * (paginationMeta?.per_page || perPage) + idx + 1;
              const categoryTitle = getCategoryName(tx, isDeposit);
              const party = getPartyName(tx, isDeposit);
              const createdBy = getCreatedBy(tx, isDeposit);
              return (
                <tr
                  key={tx.id}
                  className="hover:bg-amber-50/40 transition-colors even:bg-slate-50/40"
                >
                  <td className="py-1.5 px-1.5 text-center text-gray-400 border border-gray-200 font-mono text-xs font-normal">
                    {rowIndex}
                  </td>
                  <td className="py-1.5 px-2 text-center border border-gray-200 font-mono font-medium text-gray-800 text-xs" dir="ltr">
                    {formatDocNumber(tx.receipt_number, tx.id)}
                  </td>
                  <td className="py-1.5 px-2 text-center font-mono text-gray-600 border border-gray-200 text-xs text-nowrap font-normal" dir="ltr">
                    {toEnglishDigits(tx.shamsi_date || "—")}
                  </td>
                  <td className="py-1.5 px-2.5 border border-gray-200 text-gray-800 text-xs text-nowrap font-medium">
                    {tx.vault?.name || t("ledger.deletedVault")}
                  </td>
                  <td className="py-1.5 px-2 text-center border border-gray-200 text-nowrap">
                    {isDeposit ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium px-1.5 py-0.5 rounded">{t("txDetail.deposit")}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 text-xs font-medium px-1.5 py-0.5 rounded">{t("txDetail.withdraw")}</span>
                    )}
                  </td>
                  <td className="py-1.5 px-2.5 border border-gray-200 text-gray-700 text-xs text-nowrap font-normal">
                    {categoryTitle}
                  </td>
                  <td className="py-1.5 px-2.5 border border-gray-200 text-gray-800 text-xs truncate max-w-[125px] font-normal" title={party}>
                    {party}
                  </td>
                  <td
                    className={`py-1.5 px-2.5 text-center border border-gray-200 font-mono font-medium text-xs text-nowrap ${
                      isDeposit ? "text-emerald-700" : "text-rose-700"
                    }`}
                    dir="ltr"
                  >
                    {isDeposit ? "+" : "−"}{Number(tx.amount || 0).toLocaleString("en-US")}
                  </td>
                  <td className="py-1.5 px-1.5 text-center border border-gray-200 text-nowrap">
                    <span className="font-mono text-gray-700 bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded text-xs font-medium">
                      {tx.currency}
                    </span>
                  </td>
                  <td className="py-1.5 px-1.5 text-center border border-gray-200 font-mono text-gray-600 text-xs text-nowrap font-normal" dir="ltr">
                    {getExchangeRate(tx)}
                  </td>
                  <td className="py-1.5 px-2.5 border border-gray-200 text-gray-700 text-xs truncate max-w-[115px] font-normal" title={createdBy}>
                    {createdBy}
                  </td>
                  <td className="py-1.5 px-2.5 text-gray-700 border border-gray-200 text-xs leading-relaxed whitespace-normal break-words min-w-[160px] max-w-[320px] font-normal">
                    {tx.notes ? (
                      <span className="block">{tx.notes}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="py-1.5 px-2 text-center border border-gray-200">
                    <div className="flex items-center justify-center gap-1.5">
                      <TooltipButton
                        tooltip={t("ledger.detailTip")}
                        onClick={() => setDetailTx(tx)}
                        className="w-8 h-8 flex items-center justify-center bg-white text-gray-400 hover:text-slate-800 hover:bg-slate-100 hover:border-slate-300 rounded border border-gray-200 transition-colors cursor-pointer"
                      >
                        <Info size={15} />
                      </TooltipButton>
                      <TooltipButton
                        tooltip={t("ledger.editTip")}
                        onClick={() => navigate(tx.transaction_type?.startsWith("transfer_") ? `/transfers/${tx.id}/edit` : `/deposits-withdrawals/${tx.id}/edit`, { state: { tx } })}
                        className="w-8 h-8 flex items-center justify-center bg-white text-gray-400 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-300 rounded border border-gray-200 transition-colors cursor-pointer"
                      >
                        <Pencil size={15} />
                      </TooltipButton>
                      <TooltipButton
                        tooltip={t("ledger.printTip")}
                        onClick={() => onPrint(tx)}
                        className="w-8 h-8 flex items-center justify-center bg-white text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 rounded border border-gray-200 transition-colors cursor-pointer"
                      >
                        <FileText size={15} />
                      </TooltipButton>
                      <TooltipButton
                        tooltip={t("ledger.deleteTip")}
                        onClick={() => setDeleteTx(tx)}
                        className="w-8 h-8 flex items-center justify-center bg-white text-gray-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-300 rounded border border-gray-200 transition-colors cursor-pointer"
                      >
                        <Trash2 size={15} />
                      </TooltipButton>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <TxDetailModal
        tx={detailTx}
        onClose={() => setDetailTx(null)}
        onPrint={onPrint}
      />
      <DeleteConfirmationModal
        isOpen={Boolean(deleteTx)}
        onClose={() => setDeleteTx(null)}
        onConfirm={handleConfirmDelete}
        title={t("ledger.deleteTitle")}
        question={t("ledger.deleteQuestion")}
        warning={t("ledger.deleteWarning")}
        itemName={deleteTx ? `سند شماره ${formatDocNumber(deleteTx.receipt_number, deleteTx.id)}` : ""}
        loading={deleting}
      />
      <TablePagination
        currentPage={paginationMeta?.current_page || 1}
        lastPage={paginationMeta?.last_page || 1}
        total={paginationMeta?.total || 0}
        perPage={perPage}
        onPageChange={onPageChange}
        onPerPageChange={onPerPageChange}
        perPageOptions={[10, 25, 50, 100]}
        unit={t("ledger.unit")}
        className="rounded-xl border border-gray-200"
      />
    </div>
  );
}
