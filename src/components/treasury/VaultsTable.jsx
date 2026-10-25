import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { usePagePerms } from "../common";
import { useNavigate } from "react-router-dom";
import { Wallet, ArrowRightLeft, Building2, Info, Trash2, Landmark } from "lucide-react";
import TooltipButton from "../common/TooltipButton";
import DeleteConfirmationModal from "../common/DeleteConfirmationModal";
import { apiUrl } from "../../api";
import { showToast } from "../../utils/toast";
export default function VaultsTable({
  vaults,
  loading,
  onOpenModal,
  onVaultDeleted,
  managerAdvancesSummary = { total_open_afn: 0, total_open_usd: 0, open_advances_count: 0 },
}) {
  const { t } = useTranslation("treasury");
  const { canDelete } = usePagePerms("treasury");
  const navigate = useNavigate();
  const [deleteVault, setDeleteVault] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [hideTrustAccount, setHideTrustAccount] = useState(() => {
    return localStorage.getItem("hide_trust_account_vaults") === "true";
  });
  const sortedVaults = useMemo(() => {
    return [...(vaults || [])].sort((a, b) => Number(a.id) - Number(b.id));
  }, [vaults]);
  const totalAccountsCount = sortedVaults.length + (hideTrustAccount ? 0 : 1);
  const handleDeleteConfirm = async () => {
    if (!deleteVault) return;
    if (deleteVault.id === "manager-advances") {
      const openAfn = Number(managerAdvancesSummary?.total_open_afn || 0);
      const openUsd = Number(managerAdvancesSummary?.total_open_usd || 0);
      if (openAfn > 0 || openUsd > 0) {
        showToast(t("vaultsTable.deleteBlocked"), "error");
        return;
      }
      localStorage.setItem("hide_trust_account_vaults", "true");
      setHideTrustAccount(true);
      showToast(t("vaultsTable.advanceDeleted"), "success");
      setDeleteVault(null);
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(apiUrl(`/vaults/${encodeURIComponent(deleteVault.id)}`), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || t("vaultsTable.deleteError"));
      }
      showToast(data.message || t("vaultsTable.deleted"), "success");
      setDeleteVault(null);
      if (onVaultDeleted) {
        onVaultDeleted();
      }
    } catch (err) {
      showToast(err.message || t("messages.serverError"), "error");
    } finally {
      setDeleting(false);
    }
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-2xs font-sans">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-slate-800 text-white">
            <Landmark size={14} />
          </div>
          <h2 className="text-xs font-bold text-gray-800 tracking-wide">{t("vaultsTable.title")}</h2>
          <span className="text-xs text-gray-600 bg-gray-200 border border-gray-300 px-2 py-0.2 rounded font-mono font-bold">
            {totalAccountsCount}
          </span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse" dir="rtl">
          <thead>
            <tr className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
              <th className="py-2 px-2.5 text-center w-12 border border-gray-200">{t("label.index")}</th>
              <th className="py-2 px-3 text-center w-32 border border-gray-200">{t("vaultsTable.accountNumber")}</th>
              <th className="py-2 px-3 text-right border border-gray-200">{t("vaultsTable.name")}</th>
              <th className="py-2 px-3 text-center w-24 border border-gray-200">{t("vaultsTable.type")}</th>
              <th className="py-2 px-3 text-center w-20 border border-gray-200">{t("label.currency")}</th>
              <th className="py-2 px-3 text-left w-36 border border-gray-200" dir="ltr">{t("vaultsTable.balance")}</th>
              <th className="py-2 px-3 text-right border border-gray-200">{t("label.createdBy")}</th>
              <th className="py-2 px-3 text-center w-20 border border-gray-200">{t("label.actions")}</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-gray-500 text-xs border border-gray-200">{t("actions.loading")}</td>
              </tr>
            ) : (
              <>
                {sortedVaults.map((vault) => {
                  const isAfn = vault.currency === "AFN";
                  const isCash = vault.type === "cash_drawer";
                  const isSarafi = vault.type === "sarafi";
                  const typeLabel = isCash ? t("vaultsTable.shortCash") : isSarafi ? t("label.sarafi") : t("vaultsTable.shortBank");
                  return (
                    <tr key={vault.id}>
                      <td className="py-1.5 px-2.5 text-center font-mono text-xs text-gray-500 font-medium border border-gray-200">
                        {vault.id}
                      </td>
                      <td className="py-1.5 px-2.5 text-center font-mono text-xs text-gray-700 font-medium border border-gray-200">
                        {vault.account_number || `00${vault.id}`}
                      </td>
                      <td className="py-1.5 px-3 border border-gray-200">
                        <div
                          onClick={() => navigate(`/vault/${vault.id}`)}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <div className="w-6 h-6 rounded-full border bg-gray-100 text-gray-500 border-gray-200 flex items-center justify-center shrink-0">
                            {isCash ? (
                              <Wallet size={15} />
                            ) : isSarafi ? (
                              <ArrowRightLeft size={15} />
                            ) : (
                              <Building2 size={15} />
                            )}
                          </div>
                          <span className="font-bold text-gray-900 text-xs">
                            {vault.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-1.5 px-2 text-center text-xs text-gray-700 font-medium border border-gray-200">
                        {typeLabel}
                      </td>
                      <td className="py-1.5 px-2 text-center font-mono font-bold text-xs text-gray-700 border border-gray-200">
                        {vault.currency}
                      </td>
                      <td className="py-1.5 px-3 text-left border border-gray-200 font-bold font-mono text-xs text-gray-900" dir="ltr">
                        {isAfn ? "" : "$"}
                        {Number(vault.current_balance || 0).toLocaleString("en-US")}
                        {isAfn ? " AFN" : " USD"}
                      </td>
                      <td className="py-1.5 px-3 text-gray-700 border border-gray-200">
                        {vault.creator?.name || vault.created_by || "—"}
                      </td>
                      <td className="py-1.5 px-2 text-center border border-gray-200">
                        <div className="flex items-center justify-center gap-1.5">
                          <TooltipButton
                            tooltip={t("vaultsTable.viewTip")}
                            onClick={() => navigate(`/vault/${vault.id}`)}
                            className="w-8 h-8 flex items-center justify-center bg-white text-gray-400 hover:text-slate-800 hover:bg-slate-100 hover:border-slate-300 rounded border border-gray-200 transition-colors cursor-pointer"
                          >
                            <Info size={15} />
                          </TooltipButton>
                          {canDelete && (
                            <TooltipButton
                              tooltip={t("vaultsTable.deleteTip")}
                              onClick={() => setDeleteVault(vault)}
                              className="w-8 h-8 flex items-center justify-center bg-white text-gray-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-300 rounded border border-gray-200 transition-colors cursor-pointer"
                            >
                              <Trash2 size={15} />
                            </TooltipButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!hideTrustAccount && (
                  <tr>
                    <td className="py-1.5 px-2.5 text-center font-mono text-xs text-gray-500 font-medium border border-gray-200">
                      {sortedVaults.length + 1}
                    </td>
                    <td className="py-1.5 px-2.5 text-center font-mono text-xs text-gray-700 font-medium border border-gray-200">
                      {`00${sortedVaults.length + 1}`}
                    </td>
                    <td className="py-1.5 px-3 border border-gray-200">
                      <div
                        onClick={() => navigate("/manager-advances")}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <div className="w-6 h-6 rounded-full border bg-gray-100 text-gray-500 border-gray-200 flex items-center justify-center shrink-0">
                          <Wallet size={15} />
                        </div>
                        <span className="font-bold text-gray-900 text-xs">{t("navigation.pages.advances", { ns: "common" })}</span>
                      </div>
                    </td>
                    <td className="py-1.5 px-2 text-center text-xs text-gray-700 font-medium border border-gray-200">{t("vaultsTable.shortAdvance")}</td>
                    <td className="py-1.5 px-2 text-center font-mono font-bold text-xs text-gray-700 border border-gray-200">
                      {managerAdvancesSummary?.total_open_usd > 0 ? "AFN - USD" : "AFN"}
                    </td>
                    <td className="py-1.5 px-3 text-left border border-gray-200 font-bold font-mono text-xs text-gray-900" dir="ltr">
                      {Number(managerAdvancesSummary?.total_open_afn || 0).toLocaleString("en-US")} AFN
                    </td>
                    <td className="py-1.5 px-3 text-gray-400 border border-gray-200">—</td>
                    <td className="py-1.5 px-2 text-center border border-gray-200">
                      <div className="flex items-center justify-center gap-1.5">
                        <TooltipButton
                          tooltip={t("vaultsTable.viewTip")}
                          onClick={() => navigate("/manager-advances")}
                          className="w-8 h-8 flex items-center justify-center bg-white text-gray-400 hover:text-slate-800 hover:bg-slate-100 hover:border-slate-300 rounded border border-gray-200 transition-colors cursor-pointer"
                        >
                          <Info size={15} />
                        </TooltipButton>
                        {canDelete && (
                          <TooltipButton
                            tooltip={t("vaultsTable.deleteTip")}
                            onClick={() => setDeleteVault({ id: "manager-advances", name: t("navigation.pages.advances", { ns: "common" }), currency: t("vaultsTable.advances") })}
                            className="w-8 h-8 flex items-center justify-center bg-white text-gray-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-300 rounded border border-gray-200 transition-colors cursor-pointer"
                          >
                            <Trash2 size={15} />
                          </TooltipButton>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>
      <DeleteConfirmationModal
        isOpen={Boolean(deleteVault)}
        onClose={() => setDeleteVault(null)}
        onConfirm={handleDeleteConfirm}
        title={t("vaultsTable.deleteTitle")}
        question={t("vaultsTable.deleteQuestion")}
        warning={t("vaultsTable.deleteWarning")}
        itemName={deleteVault ? `${deleteVault.name} (${deleteVault.currency})` : ""}
        loading={deleting}
      />
    </div>
  );
}
