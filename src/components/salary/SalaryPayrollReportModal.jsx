import { useCallback, useEffect, useRef, useState } from "react";
import { printReportFrame, useReportFrameHeight } from "../../utils/reportFrame";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Download, FileSpreadsheet, Loader2, Printer, X } from "lucide-react";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useReportPreview from "../../hooks/useReportPreview";
import { showToast } from "../../utils";
import { getCleanErrorMessage } from "../../utils/errorHandler";
import { ALL_BRANCHES } from "../../constants/salaryDomain";
const HTML_PATH = "/salary-payments/payroll-html";
const PDF_PATH = "/salary-payments/payroll-pdf";
const PAGE_WIDTH_PX = 1122;
const PAGE_PAD_X_PX = 26;
const PAGE_PAD_TOP_PX = 42;
const PAGE_PAD_BOTTOM_PX = 34;
const SHEET_WIDTH_PX = PAGE_WIDTH_PX - PAGE_PAD_X_PX * 2;
const MIN_SHEET_HEIGHT_PX = 700;
const VIEWPORT_PADDING_PX = 32;
const MIN_PREVIEW_SCALE = 0.4;
const REMEASURE_DELAY_MS = 150;
export default function SalaryPayrollReportModal({
  isOpen,
  onClose,
  payrollList = [],
  afghanMonthInfo,
  branchName,
  selectedBranch,
}) {
  useBodyScrollLock(isOpen);
  const { t } = useTranslation("salary");
  const [scale, setScale] = useState(1);
  const viewportRef = useRef(null);
  const buildPayload = useCallback(
    () => ({
      branch_id: selectedBranch && selectedBranch !== ALL_BRANCHES ? selectedBranch : undefined,
      shamsi_year: afghanMonthInfo?.shamsi_year,
      shamsi_month: afghanMonthInfo?.shamsi_month,
    }),
    [selectedBranch, afghanMonthInfo]
  );
  const onError = useCallback(
    (err) => showToast.error(getCleanErrorMessage(err, t("payroll.loadError"))),
    [t]
  );
  const { iframeRef, reportHtml, isLoadingPreview, isDownloading, downloadPdf, print } =
    useReportPreview({
      isOpen,
      htmlPath: HTML_PATH,
      pdfPath: PDF_PATH,
      buildPayload,
      fallbackFilename: () => t("payroll.fallbackFile"),
      onError,
    });
  useEffect(() => {
    const node = viewportRef.current;
    if (!isOpen || !node) return undefined;
    const fit = () => {
      const available = node.clientWidth - VIEWPORT_PADDING_PX;
      if (available <= 0) return;
      setScale(Math.min(1, Math.max(MIN_PREVIEW_SCALE, available / PAGE_WIDTH_PX)));
    };
    fit();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", fit);
      return () => window.removeEventListener("resize", fit);
    }
    const observer = new ResizeObserver(fit);
    observer.observe(node);
    return () => observer.disconnect();
  }, [isOpen, isLoadingPreview]);
  const [sheetHeight, setSheetHeight] = useReportFrameHeight(iframeRef, MIN_SHEET_HEIGHT_PX);
  if (!isOpen) return null;
  const busy = isLoadingPreview || isDownloading;
  const pageHeight = PAGE_PAD_TOP_PX + sheetHeight + PAGE_PAD_BOTTOM_PX;
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-overlay/50 backdrop-blur-xs font-sans"
      dir="rtl"
    >
      <div className="w-full max-w-[1200px] rounded-modal bg-surface shadow-2xl border border-line overflow-hidden max-h-[94vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-line flex items-center justify-between gap-3 bg-surface shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-card bg-accent-subtle text-accent-strong flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-section-title text-content-strong">{t("payroll.modalTitle")}</h3>
              <p className="text-caption-text text-content-subtle font-medium">
                {t("payroll.modalMeta", {
                  branch: branchName,
                  month: afghanMonthInfo?.shamsi_month_name || t("page.currentMonth"),
                  year: afghanMonthInfo?.shamsi_year || "",
                  count: payrollList.length,
                })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("actions.close", { ns: "common" })}
            className="w-8 h-8 rounded-btn flex items-center justify-center text-content-faint hover:text-content-muted hover:bg-surface-subtle transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div ref={viewportRef} className="flex-1 overflow-auto bg-surface-subtle p-4">
          {isLoadingPreview ? (
            <div className="flex flex-col items-center justify-center gap-3 py-24 text-content-muted">
              <Loader2 className="w-7 h-7 animate-spin text-accent" />
              <span className="text-label-text">{t("pdf.loading", { ns: "common" })}</span>
            </div>
          ) : (
            <div
              className="mx-auto"
              style={{
                width: `${Math.round(PAGE_WIDTH_PX * scale)}px`,
                height: `${Math.round(pageHeight * scale)}px`,
              }}
            >
              <div
                className="bg-surface shadow-lg border border-line-strong rounded-card"
                style={{
                  width: `${PAGE_WIDTH_PX}px`,
                  height: `${pageHeight}px`,
                  padding: `${PAGE_PAD_TOP_PX}px ${PAGE_PAD_X_PX}px ${PAGE_PAD_BOTTOM_PX}px`,
                  boxSizing: "border-box",
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                }}
              >
                <iframe
                  ref={iframeRef}
                  srcDoc={reportHtml}
                  scrolling="no"
                  title={t("payroll.iframeTitle")}
                  sandbox="allow-scripts allow-modals"
                  className="bg-surface block"
                  style={{
                    width: `${SHEET_WIDTH_PX}px`,
                    height: `${sheetHeight}px`,
                    border: "none",
                    padding: 0,
                  }}
                />
              </div>
            </div>
          )}
        </div>
        <div className="px-6 py-3.5 bg-surface-muted border-t border-line flex justify-between items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-btn-text font-bold text-content-body bg-surface hover:bg-surface-subtle rounded-btn border border-line-strong transition-colors cursor-pointer"
          >
            {t("actions.close", { ns: "common" })}
          </button>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={downloadPdf}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-surface hover:bg-surface-muted text-content-body border border-line-strong rounded-btn text-btn-text font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>{isDownloading ? t("payroll.downloading") : t("payroll.downloadPdf")}</span>
            </button>
            <button
              type="button"
              onClick={print}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-accent hover:bg-accent-hover text-content-inverse rounded-btn text-btn-text font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="w-4 h-4" />
              <span>{t("payroll.print")}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
