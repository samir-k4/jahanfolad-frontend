import { createPortal } from "react-dom";
import {
  Download,
  FileText,
  Loader2,
  Printer,
  RotateCw,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 1.5;
const ZOOM_STEP = 0.1;

export default function ProductionReportPreviewModal({
  isOpen,
  onClose,
  closeLabel,
  refreshTitle,
  title,
  loadingText,
  noPreviewText,
  iframeTitle,
  reportHtml,
  iframeRef,
  isLoadingPreview,
  isDownloading,
  onRefresh,
  onPrint,
  onDownload,
  printLabel,
  downloadLabel,
  generatingLabel,
  pageWidthPx,
  pageHeightPx,
  controls,
}) {
  const [zoomScale, setZoomScale] = useState(1);
  const { t } = useTranslation("common");
  useBodyScrollLock(isOpen);
  useEffect(() => {
    if (isOpen) setZoomScale(1);
  }, [isOpen]);

  if (!isOpen) return null;

  const zoomBy = (delta) =>
    setZoomScale((scale) =>
      Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Number((scale + delta).toFixed(2)))),
    );

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs font-sans"
      dir="rtl"
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-[1240px] h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-gray-200">
        <div className="bg-white px-5 py-3.5 flex justify-between items-center shrink-0 border-b border-gray-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shadow-2xs">
              <FileText size={18} />
            </div>
            <h3 className="text-base font-bold text-gray-800 leading-tight">
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded-lg transition-colors cursor-pointer"
            title={closeLabel}
          >
            <X size={18} />
          </button>
        </div>
        <div className="bg-gray-50/70 border-b border-gray-200 p-3 sm:p-4 shrink-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1 min-w-0">{controls}</div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-700">
                <button
                  type="button"
                  onClick={() => zoomBy(-ZOOM_STEP)}
                  disabled={zoomScale <= ZOOM_MIN}
                  className="p-1 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors cursor-pointer disabled:opacity-40"
                  title={t("pdf.zoomOut")}
                >
                  <ZoomOut size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomScale(1)}
                  className="px-1.5 py-0.5 text-xs font-bold text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
                  title={t("pdf.zoomReset")}
                >
                  {Math.round(zoomScale * 100)}%
                </button>
                <button
                  type="button"
                  onClick={() => zoomBy(ZOOM_STEP)}
                  disabled={zoomScale >= ZOOM_MAX}
                  className="p-1 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors cursor-pointer disabled:opacity-40"
                  title={t("pdf.zoomIn")}
                >
                  <ZoomIn size={14} />
                </button>
              </div>
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoadingPreview}
                className="p-1.5 bg-white hover:bg-slate-800 hover:text-white text-gray-700 rounded-lg border border-gray-300 transition-colors cursor-pointer disabled:opacity-40 shadow-2xs"
                title={refreshTitle}
              >
                <RotateCw
                  size={15}
                  className={isLoadingPreview ? "animate-spin text-slate-600" : ""}
                />
              </button>
            </div>
          </div>
        </div>
        <div className="flex-1 bg-slate-100/90 p-4 sm:p-6 overflow-auto flex justify-center items-start relative">
          {isLoadingPreview ? (
            <div className="flex flex-col items-center justify-center text-gray-500 py-16 m-auto">
              <Loader2 size={32} className="animate-spin text-slate-800 mb-2" />
              <span className="text-sm font-bold text-gray-700">
                {loadingText}
              </span>
            </div>
          ) : reportHtml ? (
            <div
              className="relative shrink-0 mx-auto shadow-2xl rounded-lg bg-white border border-gray-300 overflow-hidden"
              style={{
                width: `${pageWidthPx * zoomScale}px`,
                height: `${pageHeightPx * zoomScale}px`,
                transition: "width 120ms ease, height 120ms ease",
              }}
            >
              <div
                style={{
                  width: `${pageWidthPx}px`,
                  height: `${pageHeightPx}px`,
                  transform: `scale(${zoomScale})`,
                  transformOrigin: "top left",
                }}
              >
                <iframe
                  ref={iframeRef}
                  title={iframeTitle}
                  srcDoc={reportHtml.replace(
                    "<style>",
                    "<style>body{margin:0 auto !important;}",
                  )}
                  sandbox="allow-scripts allow-modals"
                  className="w-full h-full bg-white border-none block"
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-gray-500 text-xs m-auto">
              {noPreviewText}
            </div>
          )}
        </div>
        <div
          dir="ltr"
          className="bg-white px-5 py-3 border-t border-gray-200 flex justify-between items-center shrink-0"
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPrint}
              disabled={isLoadingPreview || !reportHtml}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Printer size={15} />
              <span>{printLabel}</span>
            </button>
            <button
              type="button"
              onClick={onDownload}
              disabled={isDownloading || isLoadingPreview}
              className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isDownloading ? (
                <Loader2 size={15} className="animate-spin text-amber-700" />
              ) : (
                <Download size={15} className="text-amber-700" />
              )}
              <span>{isDownloading ? generatingLabel : downloadLabel}</span>
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-lg border border-gray-300 transition-colors cursor-pointer"
          >
            {closeLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
