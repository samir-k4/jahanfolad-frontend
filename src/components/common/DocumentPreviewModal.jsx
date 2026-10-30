import React, { useCallback, useEffect, useRef, useState } from "react";
import { printReportFrame, useReportFrameHeight } from "../../utils/reportFrame";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Download, Loader2, Printer, X } from "lucide-react";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useReportPreview from "../../hooks/useReportPreview";
import { showToast } from "../../utils";
import { getCleanErrorMessage } from "../../utils/errorHandler";
const MIN_SHEET_HEIGHT_PX = 560;
const A4_PORTRAIT_HEIGHT_PX = 1123;
export default function DocumentPreviewModal({
  isOpen,
  onClose,
  htmlPath,
  pdfPath,
  method = "GET",
  buildPayload,
  title,
  subtitle,
  icon,
  sheetWidth = 794,
  fitToWidth = false,
  previewSheetHeight = A4_PORTRAIT_HEIGHT_PX,
  maxWidth = "max-w-4xl",
  fileName,
}) {
  useBodyScrollLock(isOpen);
  const { t } = useTranslation("common");
  const previewAreaRef = useRef(null);
  const [fitScale, setFitScale] = useState(1);
  const onError = useCallback(
    (err) => showToast.error(getCleanErrorMessage(err, t("voucher.loadError"))),
    [t]
  );
  const { iframeRef, reportHtml, isLoadingPreview, isDownloading, downloadPdf, print } =
    useReportPreview({
      isOpen: isOpen && !!htmlPath,
      htmlPath,
      pdfPath,
      method,
      buildPayload,
      fallbackFilename: () => fileName || t("voucher.fallbackFile"),
      onError,
    });
  const [sheetHeight] = useReportFrameHeight(
    iframeRef,
    fitToWidth ? previewSheetHeight : MIN_SHEET_HEIGHT_PX,
  );
  useEffect(() => {
    if (!isOpen || !fitToWidth) {
      setFitScale(1);
      return undefined;
    }

    const updateScale = () => {
      const area = previewAreaRef.current;
      if (!area) return;
      const availableWidth = Math.max(0, area.clientWidth - 32);
      const scale = Math.min(1, availableWidth / sheetWidth);
      setFitScale(scale > 0 ? scale : 1);
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    const observer = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(updateScale);
    if (previewAreaRef.current) observer?.observe(previewAreaRef.current);

    return () => {
      window.removeEventListener("resize", updateScale);
      observer?.disconnect();
    };
  }, [fitToWidth, isOpen, sheetWidth]);
  if (!isOpen) return null;
  const busy = isLoadingPreview || isDownloading;
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs font-sans"
      dir="rtl"
    >
      <div className={`w-full ${maxWidth} rounded-modal bg-white shadow-2xl border border-gray-200 overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150`}>
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-3 bg-white shrink-0">
          <div className="flex items-center gap-3">
            {icon && (
              <span className="w-10 h-10 rounded-card bg-slate-100 text-slate-700 flex items-center justify-center shadow-xs">
                {icon}
              </span>
            )}
            <div>
              <h3 className="text-section-title text-gray-900">{title}</h3>
              {subtitle && <p className="text-caption-text text-gray-500 font-medium">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("actions.close")}
            className="w-8 h-8 rounded-btn flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div ref={previewAreaRef} className="flex-1 overflow-auto bg-gray-100 p-4 flex justify-center">
          {isLoadingPreview ? (
            <div className="flex flex-col items-center justify-center gap-3 py-24 text-gray-600">
              <Loader2 className="w-7 h-7 animate-spin text-slate-800" />
              <span className="text-label-text">{t("voucher.loading")}</span>
            </div>
          ) : (
            fitToWidth ? (
              <div
                className="shrink-0"
                dir="ltr"
                style={{
                  width: `${sheetWidth * fitScale}px`,
                  height: `${sheetHeight * fitScale}px`,
                  position: "relative",
                }}
              >
                <iframe
                  ref={iframeRef}
                  srcDoc={reportHtml}
                  title={t("voucher.iframeTitle")}
                  sandbox="allow-scripts allow-modals"
                  className="bg-white shadow-lg border border-gray-300 rounded-card"
                  style={{
                    width: `${sheetWidth}px`,
                    height: `${sheetHeight}px`,
                    border: "none",
                    position: "absolute",
                    top: 0,
                    left: 0,
                    transform: `scale(${fitScale})`,
                    transformOrigin: "top left",
                  }}
                />
              </div>
            ) : (
              <iframe
                ref={iframeRef}
                srcDoc={reportHtml}
                title={t("voucher.iframeTitle")}
                sandbox="allow-scripts allow-modals"
                className="bg-white shadow-lg border border-gray-300 rounded-card"
                style={{ width: `${sheetWidth}px`, height: `${sheetHeight}px`, border: "none" }}
              />
            )
          )}
        </div>
        <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-200 flex justify-between items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-btn-text font-bold text-gray-700 bg-white hover:bg-gray-100 rounded-btn border border-gray-300 transition-colors cursor-pointer"
          >
            {t("actions.close")}
          </button>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={downloadPdf}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-btn text-btn-text font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>{isDownloading ? t("voucher.downloading") : t("voucher.downloadPdf")}</span>
            </button>
            <button
              type="button"
              onClick={print}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-btn text-btn-text font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="w-4 h-4" />
              <span>{t("voucher.print")}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
