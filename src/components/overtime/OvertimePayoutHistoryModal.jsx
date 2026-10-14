import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { FileSpreadsheet, Printer, Trash2, X } from "lucide-react";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import { apiFetch } from "../../api";
import { DocumentPreviewModal, TooltipButton, usePagePerms } from "../common";
import { showToast, toEnglishDigits } from "../../utils";
import { getCleanErrorMessage } from "../../utils/errorHandler";
const HEAD =
  "px-2 py-2 rounded-none text-table-header-text font-bold text-content-body border-l border-line whitespace-nowrap bg-surface-muted";
const CELL = "px-2 py-1.5 rounded-none border-l border-line align-middle text-caption-text";
const NUM = `${CELL} text-center font-mono whitespace-nowrap`;
const SHEET_HEIGHT = "h-[70vh] max-h-[70vh]";
const ACTION_REST = "bg-surface border border-line text-content-subtle";
const STATE_TONE = {
  pending: "bg-notice-soft text-notice-text border-notice-line",
  paid: "bg-positive-soft text-positive-text border-positive-line",
  rejected: "bg-danger-soft text-danger-text border-danger-line",
  reversed: "bg-surface-subtle text-content-muted border-line",
};
const money = (value) => Number(value || 0).toLocaleString("en-US");
const dash = (value) => (value === null || value === undefined || value === "" ? "—" : value);
export default function OvertimePayoutHistoryModal({ isOpen, onClose, branchId, reloadKey = 0, onChanged }) {
  useBodyScrollLock(isOpen);
  const { t } = useTranslation("overtime");
  const { canDelete } = usePagePerms("overtime");
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ total_amount: 0, total_count: 0, total_hours: 0 });
  const [loading, setLoading] = useState(false);
  const [sheet, setSheet] = useState(null);
  const load = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ paginate: "false" });
      if (branchId && branchId !== "all") params.set("branch_id", String(branchId));
      const body = await apiFetch(`/overtime-payouts?${params.toString()}`);
      setRows(Array.isArray(body?.data) ? body.data : []);
      setSummary(body?.summary || { total_amount: 0, total_count: 0, total_hours: 0 });
    } catch (err) {
      showToast.error(getCleanErrorMessage(err, t("payout.historyError")));
    } finally {
      setLoading(false);
    }
  }, [isOpen, branchId, t]);
  useEffect(() => {
    load();
  }, [load, reloadKey]);
  const remove = async (payout) => {
    try {
      const body = await apiFetch(`/overtime-payouts/${payout.id}`, { method: "DELETE" });
      showToast.success(body?.message || "");
      onChanged?.();
      load();
    } catch (err) {
      showToast.error(getCleanErrorMessage(err, t("payout.deleteError")));
    }
  };
  if (!isOpen) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-overlay/50 backdrop-blur-xs font-sans"
      dir="rtl"
    >
      <div
        className={`w-full max-w-6xl ${SHEET_HEIGHT} rounded-modal bg-surface shadow-2xl border border-line overflow-hidden flex flex-col`}
      >
        <div className="px-6 py-3.5 border-b border-line flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-card bg-accent-subtle text-accent-strong flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h3 className="text-section-title text-content-strong">{t("payout.historyTitle")}</h3>
              <p className="text-caption-text text-content-subtle font-medium">
                {t("payout.historyMeta", { count: summary.total_count })}{" "}
                <span className="font-mono text-content-body" dir="ltr">
                  {money(summary.total_amount)}
                </span>
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
        <div className="flex-1 min-h-0 overflow-auto">
          {loading ? (
            <p className="py-12 text-center text-label-text text-content-subtle">{t("payout.historyLoading")}</p>
          ) : rows.length === 0 ? (
            <p className="py-12 text-center text-label-text text-content-subtle">{t("payout.historyEmpty")}</p>
          ) : (
            <table className="w-full text-right border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-line">
                  <th className={`${HEAD} text-center w-12`}>{t("table.rowIndex", { ns: "common" })}</th>
                  <th className={`${HEAD} text-center`}>{t("payout.colDoc")}</th>
                  <th className={`${HEAD} text-center`}>{t("payout.colVoucher")}</th>
                  <th className={`${HEAD} text-center`}>{t("payout.colKind")}</th>
                  <th className={`${HEAD} whitespace-normal break-words`}>{t("payout.colPeriod")}</th>
                  <th className={`${HEAD} text-center`}>{t("payout.colDate")}</th>
                  <th className={`${HEAD} text-center`}>{t("payout.colPeople")}</th>
                  <th className={`${HEAD} text-center`}>{t("payout.colTotalHours")}</th>
                  <th className={`${HEAD} text-center`}>{t("table.amount", { ns: "common" })}</th>
                  <th className={`${HEAD} text-center`}>{t("table.status", { ns: "common" })}</th>
                  <th className={`${HEAD} text-center`}>{t("payout.colSource")}</th>
                  <th className={HEAD}>{t("payout.colReceiver")}</th>
                  <th className={`${HEAD} w-28 text-center border-l-0`}>
                    {t("table.actions", { ns: "common" })}
                  </th>
                </tr>
              </thead>
              <tbody className="text-content">
                {rows.map((payout, index) => (
                  <tr key={payout.id} className="border-b border-line hover:bg-surface-muted/70 transition-colors">
                    <td className={`${NUM} text-content-subtle`} dir="ltr">
                      {index + 1}
                    </td>
                    <td className={`${NUM} font-bold text-content-strong`} dir="ltr">
                      {payout.receipt_number}
                    </td>
                    <td className={`${NUM} text-content-muted`} dir="ltr">
                      {dash(payout.voucher_no)}
                    </td>
                    <td className={`${CELL} text-center whitespace-nowrap`}>{payout.kind_label}</td>
                    <td className={`${CELL} whitespace-normal break-words min-w-[150px] leading-snug`}>
                      {dash(payout.period_label)}
                    </td>
                    <td className={NUM} dir="ltr">
                      {toEnglishDigits(payout.shamsi_date || "") || "—"}
                    </td>
                    <td className={NUM} dir="ltr">
                      {payout.employee_count}
                    </td>
                    <td className={NUM} dir="ltr">
                      {payout.total_hours}
                    </td>
                    <td className={`${NUM} font-bold text-content-strong`} dir="ltr">
                      {money(payout.total_amount)}
                    </td>
                    <td className={`${CELL} text-center whitespace-nowrap`}>
                      <span
                        className={`inline-block px-2 py-0.5 rounded-badge border text-caption-text font-medium ${
                          STATE_TONE[payout.state] || STATE_TONE.reversed
                        }`}
                      >
                        {dash(payout.state_label)}
                      </span>
                    </td>
                    <td className={`${CELL} text-center whitespace-normal break-words leading-snug`}>
                      {dash(payout.source_label)}
                    </td>
                    <td className={`${CELL} whitespace-normal break-words min-w-[100px] leading-snug`}>
                      {dash(payout.receiver_name)}
                    </td>
                    <td className={`${CELL} text-center border-l-0`}>
                      <div className="flex items-center justify-center gap-1.5">
                        <TooltipButton
                          icon={<Printer size={14} />}
                          tooltip={t("voucher.print", { ns: "common" })}
                          onClick={() => setSheet(payout)}
                          colorClass={`${ACTION_REST} hover:bg-positive-soft hover:text-positive-text hover:border-positive-line`}
                        />
                        {canDelete ? (
                          <TooltipButton
                            icon={<Trash2 size={14} />}
                            tooltip={t("payout.deleteSheet")}
                            onClick={() => remove(payout)}
                            colorClass={`${ACTION_REST} hover:bg-danger-soft hover:text-danger-text hover:border-danger-line`}
                          />
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <DocumentPreviewModal
          isOpen={!!sheet}
          onClose={() => setSheet(null)}
          htmlPath={sheet ? `/overtime-payouts/${sheet.id}/sheet-html` : ""}
          pdfPath={sheet ? `/overtime-payouts/${sheet.id}/sheet-pdf` : ""}
          title={t("payout.historyTitle")}
          subtitle={sheet ? `${sheet.receipt_number} · ${sheet.period_label || ""}` : ""}
          icon={<FileSpreadsheet className="w-5 h-5" />}
          maxWidth="max-w-6xl"
          sheetWidth={1123}
          fileName={sheet ? `${sheet.receipt_number}.pdf` : ""}
        />
      </div>
    </div>,
    document.body,
  );
}
