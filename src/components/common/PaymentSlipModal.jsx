import React, { useCallback, useMemo, useState } from "react";
import { printReportFrame, useReportFrameHeight } from "../../utils/reportFrame";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Download, Loader2, Printer, ReceiptText, X } from "lucide-react";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useReportPreview from "../../hooks/useReportPreview";
import { showToast } from "../../utils";
import { getCleanErrorMessage } from "../../utils/errorHandler";
const SHEET_WIDTH_PX = 794;
const MIN_SHEET_HEIGHT_PX = 520;
const REQUEST_HEADERS = Object.freeze({ "X-Branch-Id": "all" });
export default function PaymentSlipModal({ isOpen, onClose, payment, basePath = "/employee-payments" }) {
  useBodyScrollLock(isOpen);
  const { t } = useTranslation("salary");
  const paymentId = payment?.id;
  const htmlPath = useMemo(
    () => (paymentId ? `${basePath}/${paymentId}/slip-html` : ""),
    [paymentId, basePath],
  );
  const pdfPath = useMemo(
    () => (paymentId ? `${basePath}/${paymentId}/slip-pdf` : ""),
    [paymentId, basePath],
  );
  const buildPayload = useCallback(() => ({}), []);
  const onError = useCallback(
    (err) => showToast.error(getCleanErrorMessage(err, t("slip.loadError"))),
    [t],
  );
  const { iframeRef, reportHtml, isLoadingPreview, isDownloading, downloadPdf, print } =
    useReportPreview({
      isOpen: isOpen && Boolean(paymentId),
      htmlPath,
      pdfPath,
      buildPayload,
      fallbackFilename: () => `${payment?.receipt_number || t("slip.fallbackFile")}.pdf`,
      onError,
      method: "GET",
      headers: REQUEST_HEADERS,
    });
  const [sheetHeight, setSheetHeight] = useReportFrameHeight(iframeRef, MIN_SHEET_HEIGHT_PX);
  if (!isOpen || !payment) return null;
  const busy = isDownloading || isLoadingPreview;
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs font-sans"
      dir="rtl"
    >
      <div className="w-full max-w-4xl rounded-modal bg-white shadow-2xl border border-gray-200 overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-3 bg-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-card bg-slate-100 text-slate-700 flex items-center justify-center shadow-xs shrink-0">
              <ReceiptText className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h3 className="text-section-title text-gray-900 whitespace-normal break-words">
                {t("slip.modalTitle", { name: payment.employee?.full_name || "" })}
              </h3>
              <p className="text-caption-text text-gray-500 font-medium">
                <span className="font-mono" dir="ltr">
                  {payment.receipt_number}
                </span>
                {" · "}
                {payment.shamsi_month_name} {payment.shamsi_year}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("actions.close", { ns: "common" })}
            className="w-8 h-8 rounded-btn flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto bg-gray-100 p-4 flex justify-center">
          {isLoadingPreview ? (
            <div className="flex flex-col items-center justify-center gap-3 py-24 text-gray-600">
              <Loader2 className="w-7 h-7 animate-spin text-slate-800" />
              <span className="text-label-text">{t("slip.loading")}</span>
            </div>
          ) : (
            <iframe
              ref={iframeRef}
              srcDoc={reportHtml}
              title={t("slip.iframeTitle")}
              sandbox="allow-scripts allow-modals"
              className="bg-white shadow-lg border border-gray-300 rounded-card"
              style={{ width: `${SHEET_WIDTH_PX}px`, height: `${sheetHeight}px`, border: "none" }}
            />
          )}
        </div>
        <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-200 flex justify-between items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 text-btn-text font-bold text-gray-700 bg-white hover:bg-gray-100 rounded-btn border border-gray-300 transition-colors cursor-pointer disabled:opacity-50"
          >
            {t("actions.close", { ns: "common" })}
          </button>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={downloadPdf}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-btn text-btn-text font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>{isDownloading ? t("slip.downloading") : t("slip.downloadPdf")}</span>
            </button>
            <button
              type="button"
              onClick={print}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-btn text-btn-text font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="w-4 h-4" />
              <span>{t("slip.print")}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
