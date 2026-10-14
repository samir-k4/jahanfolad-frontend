import React, { useCallback, useState } from "react";
import { printReportFrame, useReportFrameHeight } from "../../utils/reportFrame";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { CreditCard, Download, Loader2, Printer, X } from "lucide-react";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useReportPreview from "../../hooks/useReportPreview";
import { showToast } from "../../utils";
import { getCleanErrorMessage } from "../../utils/errorHandler";
const HTML_PATH = "/salary-payments/payslip-html";
const PDF_PATH = "/salary-payments/payslip-pdf";
const SHEET_WIDTH_PX = 794;
const MIN_SHEET_HEIGHT_PX = 560;
export default function SalaryPayslipModal({
  isOpen,
  onClose,
  employeeData,
  afghanMonthInfo,
}) {
  useBodyScrollLock(isOpen);
  const { t } = useTranslation("salary");
  const monthName = afghanMonthInfo?.shamsi_month_name || t("page.currentMonth");
  const yearName = afghanMonthInfo?.shamsi_year || "";
  // only which employee and which month: every figure on the sheet is worked
  // out by the server, so the paper always matches what the system paid
  const buildPayload = useCallback(
    () => ({
      employee_id: employeeData?.id,
      shamsi_year: afghanMonthInfo?.shamsi_year,
      shamsi_month: afghanMonthInfo?.shamsi_month,
    }),
    [employeeData, afghanMonthInfo]
  );
  const onError = useCallback(
    (err) => showToast.error(getCleanErrorMessage(err, t("payslip.loadError"))),
    [t]
  );
  const { iframeRef, reportHtml, isLoadingPreview, isDownloading, downloadPdf, print } =
    useReportPreview({
      isOpen: isOpen && !!employeeData?.id,
      htmlPath: HTML_PATH,
      pdfPath: PDF_PATH,
      buildPayload,
      fallbackFilename: () => t("payslip.fallbackFile"),
      onError,
    });
  const [sheetHeight, setSheetHeight] = useReportFrameHeight(iframeRef, MIN_SHEET_HEIGHT_PX);
  if (!isOpen || !employeeData) return null;
  const busy = isDownloading || isLoadingPreview;
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs font-sans"
      dir="rtl"
    >
      <div className="w-full max-w-4xl rounded-modal bg-white shadow-2xl border border-gray-200 overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-3 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-card bg-slate-100 text-slate-700 flex items-center justify-center shadow-xs">
              <CreditCard className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-section-title text-gray-900">
                {t("payslip.modalTitle", { name: employeeData.full_name })}
              </h3>
              <p className="text-caption-text text-gray-500 font-medium">
                {t("payslip.modalMeta", {
                  code: employeeData.employee_ID,
                  month: monthName,
                  year: yearName,
                })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("actions.close", { ns: "common" })}
            className="w-8 h-8 rounded-btn flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto bg-gray-100 p-4 flex justify-center">
          {isLoadingPreview ? (
            <div className="flex flex-col items-center justify-center gap-3 py-24 text-gray-600">
              <Loader2 className="w-7 h-7 animate-spin text-slate-800" />
              <span className="text-label-text">{t("payslip.loading")}</span>
            </div>
          ) : (
            <iframe
              ref={iframeRef}
              srcDoc={reportHtml}
              title={t("payslip.iframeTitle")}
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
              <span>{isDownloading ? t("payslip.downloading") : t("payslip.downloadPdf")}</span>
            </button>
            <button
              type="button"
              onClick={print}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-btn text-btn-text font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="w-4 h-4" />
              <span>{t("payslip.print")}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
