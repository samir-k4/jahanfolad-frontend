import { useTranslation } from "react-i18next";
import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import {
  Printer,
  Download,
  X,
  FileText,
  Loader2,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useReportPreview from "../../hooks/useReportPreview";
import { getBatchLogs } from "../../utils/batchHelpers";
import { showToast } from "../../utils/toast";
const PAGE_WIDTH_PX = 1122.5;
const PAGE_HEIGHT_PX = 793.7;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 1.3;
const ZOOM_STEP = 0.05;
export default function ProductionPdfModal({
  isOpen,
  onClose,
  dailyData,
  branchName,
  dateString,
}) {
  const { t } = useTranslation("production");
  useBodyScrollLock(isOpen);
  const [zoomScale, setZoomScale] = useState(1);
  const buildPayload = useCallback(() => {
    const rawItems = Array.isArray(dailyData?.products)
      ? dailyData.products
      : Array.isArray(dailyData)
        ? dailyData
        : getBatchLogs(dailyData);
    return {
      batch_id: dailyData?.batch?.id || dailyData?.id || null,
      branch_id:
        dailyData?.branch_id || dailyData?.branch?.id || dailyData?.branch || null,
      date:
        dailyData?.date || dateString || new Date().toISOString().slice(0, 10),
      description: dailyData?.description || "",
      products: rawItems.map((item) => ({
        product_id: item.product_id || item.product?.id,
        quantity: Number(item.quantity) || 0,
        weight: item.weight ?? item.weight_kg ?? item.product?.weight,
      })),
    };
  }, [dailyData, dateString]);
  const fallbackFilename = useCallback(() => {
    const branch = (branchName || "report").replace(/\s+/g, "_");
    const date = (dateString || "date").replace(/[/-]/g, "-");
    return `${t("pdfModal.filenamePrefix")}_${branch}_${date}.pdf`;
  }, [branchName, dateString]);
  const onError = useCallback((err) => {
    console.error("Production report error:", err);
    showToast.error(t("pdfModal.errorDescription"));
  }, []);
  const {
    iframeRef,
    reportHtml,
    isLoadingPreview,
    isDownloading,
    fetchReportHtml,
    print,
    downloadPdf,
  } = useReportPreview({
    isOpen,
    htmlPath: "/production-reports/daily-html",
    pdfPath: "/production-reports/daily-pdf",
    buildPayload,
    fallbackFilename,
    onError,
  });
  if (!isOpen) return null;
  const zoomBy = (delta) =>
    setZoomScale((s) =>
      Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Number((s + delta).toFixed(2)))),
    );
  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs font-sans"
      dir="rtl"
    >
      <div className="bg-white w-full max-w-[1240px] h-[95vh] rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 border border-gray-200">
        <div className="bg-white px-4 py-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 shrink-0 text-gray-800 font-sans">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-700 flex items-center justify-center shadow-2xs">
              <FileText size={18} />
            </div>
            <span className="text-base font-bold text-gray-900">
              {t("pdfModal.title")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-caption-text text-gray-700">
              <button
                type="button"
                onClick={() => zoomBy(-ZOOM_STEP)}
                className="p-1 hover:text-gray-900 hover:bg-gray-200/70 rounded-md transition-colors cursor-pointer"
                title={t("pdf.zoomOut", { ns: "common" })}
              >
                <ZoomOut size={14} />
              </button>
              <button
                type="button"
                onClick={() => setZoomScale(1)}
                className="px-1.5 py-0.5 text-caption-text font-bold text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
                title={t("pdf.zoomReset", { ns: "common" })}
              >
                {Math.round(zoomScale * 100)}%
              </button>
              <button
                type="button"
                onClick={() => zoomBy(ZOOM_STEP)}
                className="p-1 hover:text-gray-900 hover:bg-gray-200/70 rounded-md transition-colors cursor-pointer"
                title={t("pdf.zoomIn", { ns: "common" })}
              >
                <ZoomIn size={14} />
              </button>
            </div>
            <button
              type="button"
              onClick={fetchReportHtml}
              disabled={isLoadingPreview}
              className="p-2 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900 rounded-lg border border-gray-300 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
              title={t("pdf.reload", { ns: "common" })}
            >
              <RotateCw
                size={15}
                className={isLoadingPreview ? "animate-spin text-slate-700" : ""}
              />
            </button>
            <button
              type="button"
              onClick={downloadPdf}
              disabled={isDownloading}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-btn-text font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {isDownloading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Download size={15} />
              )}
              <span>
                {isDownloading
                  ? t("pdfModal.generatingButton")
                  : t("pdfModal.downloadButton")}
              </span>
            </button>
            <button
              type="button"
              onClick={print}
              disabled={isLoadingPreview || !reportHtml}
              className="px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 text-btn-text font-bold rounded-lg border border-gray-300 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              <Printer size={15} />
              <span>{t("pdfModal.printReportShort")}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors mr-1 cursor-pointer"
              title={t("actions.closeWindow", { ns: "common" })}
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 sm:p-6 flex justify-center items-start bg-slate-100/90 relative">
          {isLoadingPreview && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10 backdrop-blur-xs">
              <div className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2.5 rounded-lg shadow-xl text-gray-800 text-btn-text font-bold">
                <Loader2 size={18} className="animate-spin text-slate-800" />
                <span>{t("pdfModal.loadingPreview")}</span>
              </div>
            </div>
          )}
          <div
            className="relative shrink-0 mx-auto shadow-2xl rounded-lg bg-white border border-gray-300 overflow-hidden"
            style={{
              width: `${PAGE_WIDTH_PX * zoomScale}px`,
              height: `${PAGE_HEIGHT_PX * zoomScale}px`,
              transition: "width 120ms ease, height 120ms ease",
            }}
          >
            <iframe
              ref={iframeRef}
              srcDoc={reportHtml}
              title={t("pdfModal.iframeTitle")}
              sandbox="allow-scripts allow-modals"
              className="bg-white border-none block"
              style={{
                width: `${PAGE_WIDTH_PX}px`,
                height: `${PAGE_HEIGHT_PX}px`,
                transform: `scale(${zoomScale})`,
                transformOrigin: "0 0",
              }}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
