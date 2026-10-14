import { useState, useEffect, useRef, useCallback } from "react";
import { printReportFrame, useReportFrameHeight } from "../../utils/reportFrame";
import { createPortal } from "react-dom";
import { X, Printer, Download, FileText, Loader2, RotateCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { apiUrl } from "../../api";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
const SHEET_WIDTH_PX = 1122.5;
const MIN_SHEET_HEIGHT_PX = 794;
export default function OvertimeBlankSheetModal({
  isOpen,
  onClose,
  branchId,
  branchName,
  selectedDate,
}) {
  const { t } = useTranslation("overtime");
  useBodyScrollLock(isOpen);
  const [sheetHtml, setSheetHtml] = useState("");
  const [isLoadingPreview, setIsLoadingPreview] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [fitScale, setFitScale] = useState(1);
  const iframeRef = useRef(null);
  const fitRef = useRef(null);
  const sheetParams = useCallback(() => {
    const params = new URLSearchParams();
    if (branchId && branchId !== "all") params.append("branch_id", branchId);
    if (selectedDate) params.append("date", selectedDate);
    return params.toString();
  }, [branchId, selectedDate]);
  const [iframeHeight, setIframeHeight] = useReportFrameHeight(iframeRef, MIN_SHEET_HEIGHT_PX);
  const fetchSheetHtml = useCallback(async () => {
    if (!isOpen) return;
    try {
      setIsLoadingPreview(true);
      const res = await fetch(apiUrl(`/overtimes/blank-sheet-html?${sheetParams()}`), {
        method: "GET",
        headers: { Accept: "text/html, application/json" },
      });
      if (!res.ok) throw new Error(t("report.errorTitle"));
      setSheetHtml(await res.text());
    } catch {
      setSheetHtml(`
        <div style="font-family: sans-serif; text-align: center; padding: 40px; color: #dc2626;" dir="rtl">
          <h3>${t("report.errorTitle")}</h3>
          <p>${t("report.errorDesc")}</p>
        </div>
      `);
    } finally {
      setIsLoadingPreview(false);
    }
  }, [isOpen, sheetParams, t]);
  useEffect(() => {
    if (isOpen) {
      fetchSheetHtml();
    } else {
      setSheetHtml("");
      setIsLoadingPreview(true);
    }
  }, [isOpen, fetchSheetHtml]);
  useEffect(() => {
    const node = fitRef.current;
    if (!isOpen || !node) return undefined;
    const update = () => {
      const available = node.clientWidth;
      setFitScale(available > 0 ? Math.min(1, available / SHEET_WIDTH_PX) : 1);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [isOpen]);
  const handlePrint = () => {
    printReportFrame(iframeRef.current);
  };
  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    let objectUrl;
    try {
      const res = await fetch(apiUrl(`/overtimes/blank-sheet-pdf?${sheetParams()}`));
      if (!res.ok) {
        handlePrint();
        return;
      }
      const blob = await res.blob();
      objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${t("blankSheet.fileName")}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      handlePrint();
    } finally {
      if (objectUrl) window.URL.revokeObjectURL(objectUrl);
      setIsDownloading(false);
    }
  };
  if (!isOpen) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-overlay/60 backdrop-blur-xs font-sans animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="bg-surface rounded-modal shadow-2xl border border-line w-full max-w-[1300px] h-[95vh] flex flex-col overflow-hidden">
        <div className="bg-surface border-b border-line px-5 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-btn bg-notice-soft border border-notice-line flex items-center justify-center text-notice-text">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-content-strong leading-tight">
                {t("blankSheet.heading")}
              </h2>
              <p className="text-[11px] text-content-subtle font-medium">
                {branchName || t("branch.defaultFactory")} • {t("blankSheet.description")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={fetchSheetHtml}
              className="p-1.5 bg-surface hover:bg-surface-muted text-content-muted hover:text-content-strong rounded-btn border border-line-strong transition-colors cursor-pointer shadow-2xs"
              title={t("pdf.reload", { ns: "common" })}
            >
              <RotateCw size={14} className={isLoadingPreview ? "animate-spin text-accent" : ""} />
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={isLoadingPreview}
              className="px-3 py-1.5 bg-surface hover:bg-surface-muted text-content-body text-xs font-bold rounded-btn border border-line-strong flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              <Printer size={14} />
              <span>{t("actions.blankSheet")}</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="px-3.5 py-1.5 bg-accent hover:bg-accent-hover text-content-inverse text-xs font-bold rounded-btn shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              <span>{isDownloading ? t("report.generatingPdf") : t("report.downloadPdf")}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-content-faint hover:text-content-body hover:bg-surface-subtle rounded-btn transition-colors cursor-pointer"
              title={t("actions.closeWindow", { ns: "common" })}
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-3 sm:p-5 bg-accent-subtle/90 relative">
          {isLoadingPreview && (
            <div className="absolute inset-0 flex items-center justify-center bg-surface/70 z-10 backdrop-blur-xs">
              <div className="flex items-center gap-2 bg-surface border border-line px-4 py-2.5 rounded-btn shadow-xl text-content text-xs font-bold">
                <Loader2 size={16} className="animate-spin text-accent" />
                <span>{t("pdf.loading", { ns: "common" })}</span>
              </div>
            </div>
          )}
          <div ref={fitRef} className="w-full flex justify-center items-start">
            <div
              className="relative shrink-0 shadow-2xl rounded-modal bg-surface border border-line-strong overflow-hidden"
              style={{ width: `${SHEET_WIDTH_PX * fitScale}px`, height: `${iframeHeight * fitScale}px` }}
            >
              <iframe
                ref={iframeRef}
                srcDoc={sheetHtml}
                sandbox="allow-scripts allow-modals"
                referrerPolicy="no-referrer"
                scrolling="no"
                title={t("blankSheet.heading")}
                className="absolute top-0 left-0 bg-surface border-none block pointer-events-auto"
                style={{
                  width: `${SHEET_WIDTH_PX}px`,
                  height: `${iframeHeight}px`,
                  transform: `scale(${fitScale})`,
                  transformOrigin: "top left",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
