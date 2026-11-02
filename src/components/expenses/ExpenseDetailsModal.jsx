import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { Eye, FileText, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatTimeDari } from "../../utils";
import { formatAfghanDateTime } from "../../utils/dateHelpers";
import { formatShamsiDate } from "../../utils";
import DocumentPreviewModal from "../common/DocumentPreviewModal";
const fmt = (n) =>
  Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const LANDSCAPE_SHEET_WIDTH_PX = 1123;
const PORTRAIT_SHEET_WIDTH_PX = 794;
const orDash = (value) => (value === null || value === undefined || value === "" ? "—" : value);
export default function ExpenseDetailsModal({ isOpen, expense, onClose }) {
  const { t } = useTranslation("expenses");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const source = expense?.source_document || null;
  const buildPayload = useCallback(() => source?.params ?? {}, [source]);
  if (!isOpen || !expense) return null;
  const currency = String(expense.currency || "AFN").toUpperCase();
  const sourceKind = source ? t(`detailsModal.sourceKinds.${source.kind}`) : null;
  const rows = [
    [t("detailsModal.voucher"), expense.voucher_no || `#${expense.id}`],
    [t("detailsModal.date"), formatShamsiDate(expense.shamsi_date)],
    [t("detailsModal.time"), formatTimeDari(expense.expense_time)],
    [t("detailsModal.type"), expense.expense_type_name],
    [t("table.category"), expense.category_title],
    [t("detailsModal.source"), expense.source_title],
    [t("detailsModal.vault"), expense.vault_name],
    [t("detailsModal.amount"), expense.amount == null ? null : `${fmt(expense.amount)} ${currency}`],
    [t("table.exchangeRate"), expense.exchange_rate == null ? null : fmt(expense.exchange_rate)],
    [t("table.convertedUsd"), expense.converted_amount_usd == null ? null : `$${fmt(expense.converted_amount_usd)}`],
    [t("detailsModal.paidTo"), expense.paid_to],
    [t("detailsModal.createdBy"), expense.created_by],
    [t("detailsModal.paidBy"), expense.paid_by],
    [t("detailsModal.paidAt"), expense.paid_at ? formatAfghanDateTime(expense.paid_at) : null],
    [t("detailsModal.reversedBy"), expense.reversed_by],
    [t("detailsModal.reversedAt"), expense.reversed_at ? formatAfghanDateTime(expense.reversed_at) : null],
  ];
  return createPortal(
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
        <div className="bg-white rounded-modal border border-gray-200 shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto font-sans">
          <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-5 py-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-9 h-9 rounded-btn flex items-center justify-center shrink-0 bg-slate-100 text-slate-700">
                <Eye size={17} />
              </span>
              <div className="min-w-0">
                <h3 className="text-section-title font-bold text-gray-900">{t("detailsModal.title")}</h3>
                <p className="text-caption-text text-gray-500 mt-0.5 font-mono" dir="ltr">
                  {expense.voucher_no || `#${expense.id}`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("detailsModal.close")}
              className="p-1 text-gray-400 hover:text-gray-700 cursor-pointer shrink-0"
            >
              <X size={18} />
            </button>
          </div>
          <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5">
            {rows.map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-caption-text text-gray-500">{label}</dt>
                <dd className="text-body-text font-bold text-gray-900 break-words">{orDash(value)}</dd>
              </div>
            ))}
            <div className="sm:col-span-2 min-w-0">
              <dt className="text-caption-text text-gray-500">{t("table.description")}</dt>
              <dd className="text-body-text text-gray-900 whitespace-pre-line break-words">{orDash(expense.description)}</dd>
            </div>
            {expense.reversal_reason && (
              <div className="sm:col-span-2 min-w-0">
                <dt className="text-caption-text text-gray-500">{t("detailsModal.reversalReason")}</dt>
                <dd className="text-body-text text-gray-900 whitespace-pre-line break-words">{expense.reversal_reason}</dd>
              </div>
            )}
          </div>
          {source && (
            <div className="mx-5 mb-4 flex items-center justify-between gap-3 bg-gray-50 border border-gray-200 rounded-card px-3.5 py-3">
              <div className="min-w-0">
                <p className="text-caption-text text-gray-500">{t("detailsModal.sourceDocument")}</p>
                <p className="text-body-text font-bold text-gray-900">
                  {sourceKind} <span className="font-mono" dir="ltr">{orDash(source.reference)}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 rounded-btn text-btn-text font-bold transition-colors cursor-pointer shrink-0"
              >
                <FileText size={15} />
                <span>{t("detailsModal.viewSource")}</span>
              </button>
            </div>
          )}
          <div className="px-5 py-3 border-t border-gray-200 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-btn-text font-bold text-gray-700 bg-white hover:bg-gray-50 rounded-btn border border-gray-300 transition-colors cursor-pointer"
            >
              {t("detailsModal.close")}
            </button>
          </div>
        </div>
      </div>
      {source && (
        <DocumentPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          htmlPath={source.html_path}
          pdfPath={source.pdf_path}
          method={source.method}
          buildPayload={buildPayload}
          maxWidth={source.landscape ? "max-w-6xl" : "max-w-4xl"}
          sheetWidth={source.landscape ? LANDSCAPE_SHEET_WIDTH_PX : PORTRAIT_SHEET_WIDTH_PX}
          title={sourceKind}
          subtitle={t("detailsModal.sourceSubtitle", { reference: orDash(source.reference) })}
          fileName={t("detailsModal.sourceFile")}
        />
      )}
    </>,
    document.body
  );
}
