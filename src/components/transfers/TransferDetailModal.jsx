import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import { formatDocNumber } from "../../utils/formatDocNumber";
import { formatTimeDari } from "../../utils/timeHelpers";
import { formatShamsiDate } from "../../utils";

export default function TransferDetailModal({ transfer, onClose }) {
  const { t } = useTranslation("transfers");
  useBodyScrollLock(Boolean(transfer));

  if (!transfer) return null;

  const rows = [
    [t("detail.docNumber"), formatDocNumber(transfer.receipt_number, transfer.id)],
    [t("detail.date"), formatShamsiDate(transfer.shamsi_date) || t("emptyValue")],
    [t("detail.time"), formatTimeDari(transfer.transaction_time)],
    [t("detail.from"), transfer.from_vault?.name || t("emptyValue")],
    [t("detail.to"), transfer.to_vault?.name || t("emptyValue")],
    [t("detail.amount"), `${Number(transfer.amount || 0).toLocaleString("en-US")} ${transfer.currency}`],
    [t("detail.createdBy"), transfer.created_by || t("emptyValue")],
    [t("detail.notes"), transfer.notes || t("emptyValue")],
  ];

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-overlay/50 font-sans" dir="rtl">
      <div className="bg-surface rounded-modal shadow-2xl w-full max-w-lg overflow-hidden border border-line">
        <div className="px-5 py-3.5 flex items-center justify-between border-b border-line">
          <h3 className="text-section-title font-bold text-content-strong">{t("detail.title")}</h3>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-btn-text font-bold text-content-body bg-surface border border-line-strong rounded-btn hover:bg-surface-muted cursor-pointer"
          >
            {t("actions.close")}
          </button>
        </div>
        <dl className="divide-y divide-line-soft">
          {rows.map(([label, value]) => (
            <div key={label} className="flex flex-col gap-1 px-5 py-2.5 text-table-cell-text sm:grid sm:grid-cols-3 sm:gap-3">
              <dt className="text-content-subtle font-medium">{label}</dt>
              <dd className="sm:col-span-2 text-content break-words whitespace-normal">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>,
    document.body
  );
}
