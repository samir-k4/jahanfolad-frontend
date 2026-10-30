import { useState, useEffect, useCallback } from "react";
import { TEXT_FIELD_MAX_LENGTH, NOTES_MAX_LENGTH } from "../constants/treasuryDomain";
import { createPortal } from "react-dom";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Landmark,
  Building2,
  Wallet,
  ArrowRightLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Edit3,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  RefreshCw,
  Info,
} from "lucide-react";
import TxDetailModal from "../components/treasury/TxDetailModal";
import { DocumentPreviewModal } from "../components/common";
import useBodyScrollLock from "../hooks/useBodyScrollLock";
import useAbortController, { isAbortError } from "../hooks/useAbortController";
import { apiUrl } from "../api";
import { TooltipButton, CustomDropdown, TablePagination, DeleteConfirmationModal, usePagePerms } from "../components/common";
import { useTranslation } from "react-i18next";
import { toEnglishDigits } from "../utils";
import { showToast } from "../utils/toast";
import { getCleanErrorMessage } from "../utils/errorHandler";
import {
  formatTransactionDocNumber,
  getPartyName,
  getCategoryName,
  getCreatedBy,
  cleanTransactionNotes,
  CURRENCY_OPTIONS,
  VAULT_TYPE_OPTIONS,
  VAULT_TYPE_LABELS,
  isDeposit as isVaultDeposit,
} from "../components/treasury/treasuryHelpers";
export default function VaultDetailPage() {
  const nextSignal = useAbortController();
  const { id } = useParams();
  const { t } = useTranslation("treasury");
  const { canEdit, canDelete } = usePagePerms("treasury");
  const navigate = useNavigate();
  const [vault, setVault] = useState(null);
  const [vaultLoading, setVaultLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  useBodyScrollLock(isEditModalOpen);
  const [editFormData, setEditFormData] = useState({
    name: "",
    account_number: "",
    type: "cash_drawer",
    currency: "AFN",
    holder_name: "",
    notes: "",
    status: "active",
  });
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(false);
  const [paginationMeta, setPaginationMeta] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
    from: 0,
    to: 0,
  });
  const [perPage, setPerPage] = useState(15);
  const [detailTx, setDetailTx] = useState(null);
  const [deleteTx, setDeleteTx] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [voucherTx, setVoucherTx] = useState(null);
  const fetchVault = useCallback(async () => {
    setVaultLoading(true);
    try {
      const res = await fetch(apiUrl(`/vaults/${encodeURIComponent(id)}`));
      if (res.ok) {
        setVault((await res.json()).data || null);
      } else {
        const j = await (await fetch(apiUrl("/vaults"))).json();
        setVault(
          (j.data || []).find((v) => String(v.id) === String(id)) || null
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setVaultLoading(false);
    }
  }, [id]);
  const handleOpenEditModal = () => {
    if (!vault) return;
    setEditFormData({
      name: vault.name || "",
      account_number: vault.account_number || "",
      type: vault.type || "cash_drawer",
      currency: vault.currency || "AFN",
      holder_name: vault.holder_name || "",
      notes: vault.notes || "",
      status: vault.status || "active",
    });
    setIsEditModalOpen(true);
  };
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditSubmitting(true);
    try {
      const res = await fetch(apiUrl(`/vaults/${encodeURIComponent(id)}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(editFormData),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.message || t("messages.editFailed"));
      setVault(resData.data);
      setIsEditModalOpen(false);
      showToast.success(t("messages.vaultSaved"));
    } catch (err) {
      showToast.error(getCleanErrorMessage(err, t("messages.vaultSaveFailed")));
    } finally {
      setEditSubmitting(false);
    }
  };
  const fetchTransactions = useCallback(
    async (page = 1) => {
    const signal = nextSignal();
      setTxLoading(true);
      try {
        const params = new URLSearchParams({
          page,
          per_page: perPage,
          vault_id: id,
        });
        const res = await fetch(apiUrl(`/vault-transactions?${params}`), { signal });
        if (res.ok) {
          const json = await res.json();
          setTransactions(json.data || []);
          setPaginationMeta({
            current_page: json.current_page || 1,
            last_page: json.last_page || 1,
            per_page: json.per_page || perPage,
            total: json.total || 0,
            from: json.from || 0,
            to: json.to || 0,
          });
        }
      } catch (e) {
        if (isAbortError(e)) return;
        console.error(e);
      } finally {
        setTxLoading(false);
      }
    },
    [id, perPage]
  );
  useEffect(() => {
    fetchVault();
  }, [fetchVault, nextSignal]);
  useEffect(() => {
    fetchTransactions(1);
  }, [fetchTransactions]);
  const handleConfirmDelete = async () => {
    if (!deleteTx) return;
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
      fetchTransactions(paginationMeta.current_page);
      fetchVault();
    } catch (err) {
      showToast.error(getCleanErrorMessage(err, t("messages.serverError")));
    } finally {
      setDeleting(false);
    }
  };
  const typeIcon =
    vault?.type === "sarafi" ? (
      <ArrowRightLeft size={15} />
    ) : vault?.type === "bank" ? (
      <Building2 size={15} />
    ) : (
      <Wallet size={15} />
    );
  return (
    <div className="space-y-4 min-h-screen font-sans" dir="rtl">
      <nav className="flex items-center gap-1.5 text-xs text-gray-500 font-bold">
        <Link to="/treasury" className="hover:text-slate-900 transition-colors">{t("navigation.pages.treasury", { ns: "common" })}</Link>
        <ChevronRight size={14} className="text-gray-400" />
        <span className="text-slate-900 font-bold bg-slate-100 px-2 py-0.5 rounded-badge border border-slate-200">
          {vaultLoading ? "..." : vault?.name || `حساب #${id}`}
        </span>
      </nav>
      {!vaultLoading && vault && (
        <div className="bg-white border border-gray-200 rounded-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-white">
            <div className="flex items-center gap-3">
              <span className="text-slate-800 bg-slate-100 rounded-btn p-2 border border-slate-200">
                {typeIcon}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-gray-900">
                    {vault.name}
                  </span>
                  <span className="font-mono text-xs text-gray-600 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-badge">
                    #{vault.account_number || vault.id}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-left" dir="ltr">
                <p className="text-xs text-gray-500 mb-0.5">{t("vaultDetail.currentBalance")}</p>
                <p className={`font-mono text-base font-bold leading-none ${Number(vault.current_balance) < 0 ? "text-rose-600" : "text-slate-900"}`}>
                  {Number(vault.current_balance || 0).toLocaleString("en-US")}
                  <span className="text-xs text-gray-500 ml-1">
                    {vault.currency}
                  </span>
                </p>
              </div>
              {canEdit && (
              <button
                type="button"
                onClick={handleOpenEditModal}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-btn transition-colors cursor-pointer bg-white"
              >
                <Edit3 size={12} />
                <span>{t("actions.edit")}</span>
              </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-gray-200">
            {[
              {
                label: t("vaultsTable.accountNumber"),
                value: vault.account_number || `00${vault.id}`,
                mono: true,
              },
              {
                label: t("vaultDetail.typeLabel"),
                value: VAULT_TYPE_LABELS[vault.type] || vault.type,
              },
              { label: t("vaultDetail.currencyLabel"), value: vault.currency },
              {
                label: t("vaultDetail.holder"),
                value: vault.holder_name || "—",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="px-4 py-2.5 border-b border-gray-100 last:border-b-0 sm:border-b-0 sm:border-l border-gray-200 last:border-l-0"
              >
                <p className="text-xs text-gray-600 mb-0.5">{item.label}</p>
                <p
                  className={`text-base font-bold text-gray-800 ${
                    item.mono ? "font-mono" : ""
                  }`}
                >
                  {item.value}
                </p>
              </div>
            ))}
          </div>
          {vault.notes && (
            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
              <span className="font-bold text-gray-600">{t("vaultDetail.noteLabel")}</span>
              {vault.notes}
            </div>
          )}
        </div>
      )}
      {isEditModalOpen &&
        createPortal(
          <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 m-0 mt-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs font-sans" dir="rtl">
            <div className="bg-white rounded-modal shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-150 m-0">
              <div className="bg-white px-5 py-3.5 flex justify-between items-center border-b border-gray-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-btn bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shadow-2xs">
                    <Edit3 size={18} />
                  </div>
                  <h3 className="text-base font-bold text-gray-900">{t("vaultDetail.editTitle")}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded-btn transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleEditSubmit} className="p-5 space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-gray-800 mb-1">{t("vaultDetail.nameLabel")}<span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={TEXT_FIELD_MAX_LENGTH}
                    required
                    value={editFormData.name}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, name: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-input px-3 py-2 text-xs outline-none focus:border-slate-800 bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-800 mb-1">{t("vaultsTable.accountNumber")}</label>
                    <input
                      type="text"
                      maxLength={TEXT_FIELD_MAX_LENGTH}
                      value={editFormData.account_number}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          account_number: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded-input px-3 py-2 text-xs outline-none font-mono focus:border-slate-800 bg-white text-right"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-800 mb-1">{t("vaultsTable.type")}<span className="text-rose-600">*</span>
                    </label>
                    <CustomDropdown
                      value={editFormData.type}
                      onChange={(val) =>
                        setEditFormData({ ...editFormData, type: val })
                      }
                      options={VAULT_TYPE_OPTIONS}
                      usePortal={true}
                      buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-input text-xs bg-white text-gray-800"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-800 mb-1">{t("vaultDetail.currencyLabel")}<span className="text-rose-600">*</span>
                    </label>
                    <CustomDropdown
                      value={editFormData.currency}
                      onChange={(val) =>
                        setEditFormData({
                          ...editFormData,
                          currency: val,
                        })
                      }
                      options={CURRENCY_OPTIONS}
                      usePortal={true}
                      buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-input text-xs bg-white text-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-800 mb-1">{t("vaultDetail.holder")}</label>
                    <input
                      type="text"
                      maxLength={TEXT_FIELD_MAX_LENGTH}
                      value={editFormData.holder_name}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          holder_name: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded-input px-3 py-2 text-xs outline-none focus:border-slate-800 bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-gray-800 mb-1">{t("vaultDetail.note")}</label>
                  <textarea maxLength={NOTES_MAX_LENGTH}
                    rows={2}
                    value={editFormData.notes}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, notes: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-input px-3 py-2 text-xs outline-none resize-none focus:border-slate-800 bg-white"
                  />
                </div>
                <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-btn text-xs font-bold cursor-pointer transition-colors bg-white"
                  >{t("actions.cancel")}</button>
                  <button
                    type="submit"
                    disabled={editSubmitting}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-btn text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    {editSubmitting ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={14} />
                    )}
                    <span>{t("actions.saveChanges")}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
      <div className="bg-white rounded-table border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3  bg-gray-50">
          <div className="flex items-center gap-2">
            <Landmark size={16} className="text-slate-800" />
            <span className="text-base font-bold text-gray-800">{t("filters.title")}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchTransactions(paginationMeta.current_page)}
            disabled={txLoading}
            aria-label={t("actions.refresh")}
            className={`p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-btn cursor-pointer disabled:opacity-40 transition-colors border border-gray-300 bg-white ${txLoading ? "animate-spin" : ""}`}
          >
            <RefreshCw size={14} />
          </button>
        </div>
        {txLoading ? (
          <div className="p-16 text-center">
            <div className="w-6 h-6 border-2 border-slate-800 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center text-base text-gray-500 font-bold">{t("vaultDetail.noTransactions")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold select-none text-xs border-b border-gray-200">
                  <th className="py-1.5 px-1.5 text-center w-10 border border-gray-200">{t("label.index")}</th>
                  <th className="py-1.5 px-2 text-center border border-gray-200 min-w-[70px]">{t("label.docNumber")}</th>
                  <th className="py-1.5 px-2 text-center border border-gray-200 min-w-[85px]">{t("ledger.date")}</th>
                  <th className="py-1.5 px-2 text-center border border-gray-200 min-w-[80px]">{t("ledger.type")}</th>
                  <th className="py-1.5 px-2.5 text-right border border-gray-200 min-w-[95px]">{t("label.category")}</th>
                  <th className="py-1.5 px-2.5 text-right border border-gray-200 min-w-[105px]">{t("label.party")}</th>
                  <th className="py-1.5 px-2.5 text-center border border-gray-200 min-w-[95px]">{t("ledger.amount")}</th>
                  <th className="py-1.5 px-1.5 text-center border border-gray-200 min-w-[55px]">{t("label.currency")}</th>
                  <th className="py-1.5 px-2 text-center border border-gray-200 min-w-[95px]">{t("vaultDetail.balanceColumn")}</th>
                  <th className="py-1.5 px-2.5 text-right border border-gray-200 min-w-[100px]">{t("label.createdBy")}</th>
                  <th className="py-1.5 px-2.5 text-right border border-gray-200 min-w-[160px]">{t("ledger.notes")}</th>
                  <th className="py-1.5 px-2 text-center min-w-[100px] border border-gray-200">{t("label.actions")}</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {transactions.map((tx, idx) => {
                  const isDeposit = isVaultDeposit(tx);
                  const rowIndex =
                    (paginationMeta.current_page - 1) *
                      paginationMeta.per_page +
                    idx +
                    1;
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
                      <td
                        className="py-1.5 px-2 text-center border border-gray-200 font-mono font-medium text-gray-800 text-xs"
                        dir="ltr"
                      >
                        {formatTransactionDocNumber(tx.receipt_number, tx.id)}
                      </td>
                      <td
                        className="py-1.5 px-2 text-center font-mono text-gray-600 border border-gray-200 text-xs text-nowrap font-normal"
                        dir="ltr"
                      >
                        {toEnglishDigits(tx.shamsi_date || "—")}
                      </td>
                      <td className="py-1.5 px-2 text-center border border-gray-200 text-nowrap">
                        {isDeposit ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium px-1.5 py-0.5 rounded">
                            <TrendingUp size={11} />
                            <span>{t("txDetail.deposit")}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 text-xs font-medium px-1.5 py-0.5 rounded">
                            <TrendingDown size={11} />
                            <span>{t("txDetail.withdraw")}</span>
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 px-2.5 border border-gray-200 text-gray-700 text-xs text-nowrap font-normal">
                        {categoryTitle}
                      </td>
                      <td
                        className="py-1.5 px-2.5 border border-gray-200 text-gray-800 text-xs truncate max-w-[125px] font-normal"
                        title={party}
                      >
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
                      <td
                        className="py-1.5 px-2 text-center border border-gray-200 font-mono font-medium text-xs text-gray-800 text-nowrap"
                        dir="ltr"
                      >
                        {Number(tx.balance_after || 0).toLocaleString("en-US")}
                      </td>
                      <td
                        className="py-1.5 px-2.5 border border-gray-200 text-gray-700 text-xs truncate max-w-[115px] font-normal"
                        title={createdBy}
                      >
                        {createdBy}
                      </td>
                      <td className="py-1.5 px-2.5 text-gray-700 border border-gray-200 text-xs leading-relaxed whitespace-normal break-words min-w-[160px] max-w-[320px] font-normal">
                        {cleanTransactionNotes(tx.notes) ? (
                          <span className="block">{cleanTransactionNotes(tx.notes)}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-center border border-gray-200">
                        <div className="flex items-center justify-center gap-1.5">
                          <TooltipButton
                            tooltip={t("ledger.detailTip")}
                            onClick={() => setDetailTx(tx)}
                            className="w-6 h-6 p-0 flex items-center justify-center bg-white text-gray-400 hover:text-slate-800 hover:bg-slate-100 hover:border-slate-300 rounded border border-gray-200 transition-colors cursor-pointer"
                          >
                            <Info size={13} />
                          </TooltipButton>
                          {canEdit && (
                          <TooltipButton
                            tooltip={t("ledger.editTip")}
                            onClick={() => navigate(`/deposits-withdrawals/${tx.id}/edit`, { state: { tx } })}
                            className="w-6 h-6 p-0 flex items-center justify-center bg-white text-gray-400 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-300 rounded border border-gray-200 transition-colors cursor-pointer"
                          >
                            <Pencil size={13} />
                          </TooltipButton>
                          )}
                          {canDelete && (
                          <TooltipButton
                            tooltip={t("ledger.deleteTip")}
                            onClick={() => setDeleteTx(tx)}
                            className="w-6 h-6 p-0 flex items-center justify-center bg-white text-gray-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-300 rounded border border-gray-200 transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </TooltipButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <TxDetailModal
        tx={detailTx}
        onClose={() => setDetailTx(null)}
        onPrint={setVoucherTx}
      />
      <DocumentPreviewModal
        isOpen={Boolean(voucherTx)}
        onClose={() => setVoucherTx(null)}
        htmlPath={voucherTx ? `/vault-transactions/${voucherTx.id}/voucher-html` : ""}
        pdfPath={voucherTx ? `/vault-transactions/${voucherTx.id}/voucher-pdf` : ""}
        title={t("common:voucher.transactionTitle")}
        subtitle={voucherTx ? t("common:voucher.transactionMeta", { doc: formatTransactionDocNumber(voucherTx.receipt_number, voucherTx.id), vault: voucherTx.vault?.name || vault?.name || "" }) : ""}
        icon={<Landmark className="w-5 h-5" />}
      />
      <DeleteConfirmationModal
        isOpen={Boolean(deleteTx)}
        onClose={() => setDeleteTx(null)}
        onConfirm={handleConfirmDelete}
        title={t("ledger.deleteTitle")}
        question={t("ledger.deleteQuestion")}
        warning={t("ledger.deleteWarning")}
        itemName={deleteTx ? `سند شماره ${formatTransactionDocNumber(deleteTx.receipt_number, deleteTx.id)}` : ""}
        loading={deleting}
      />
      {!txLoading && transactions.length > 0 && (
        <TablePagination
          currentPage={paginationMeta.current_page}
          lastPage={paginationMeta.last_page}
          total={paginationMeta.total}
          perPage={perPage}
          perPageOptions={[10, 15, 25, 50]}
          onPageChange={(page) => fetchTransactions(page)}
          onPerPageChange={(size) => {
            setPerPage(size);
            fetchTransactions(1);
          }}
          unit={t("ledger.unit")}
          className="rounded-b-table"
        />
      )}
    </div>
  );
}
