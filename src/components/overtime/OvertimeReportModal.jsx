import { useState, useEffect, useRef, useCallback } from "react";
import { printReportFrame, useReportFrameHeight } from "../../utils/reportFrame";
import { createPortal } from "react-dom";
import { X, Printer, Download, FileText, Sun, Loader2, RotateCw, ZoomIn, ZoomOut, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { apiUrl } from "../../api";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
const SHEET_WIDTH_PX = 1122.5;
const MIN_SHEET_HEIGHT_PX = 794;
const ZOOM_MIN = 0.65;
const ZOOM_MAX = 1.3;
const ZOOM_STEP = 0.05;
export default function OvertimeReportModal({
  isOpen,
  onClose,
  branchId,
  branchName,
  selectedDate,
  initialReportType = "regular_week",
}) {
  const { t } = useTranslation("overtime");
  useBodyScrollLock(isOpen);
  const [reportHtml, setReportHtml] = useState("");
  const [isLoadingPreview, setIsLoadingPreview] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [existingPayout, setExistingPayout] = useState(null);
  const iframeRef = useRef(null);
   const PADDING = 64;
  const isFridayReport = initialReportType === "friday";
  const reportParams = useCallback(() => {
    const params = new URLSearchParams();
    if (branchId && branchId !== "all") params.append("branch_id", branchId);
    if (selectedDate) params.append("date", selectedDate);
    params.append("type", initialReportType);
    return params.toString();
  }, [branchId, selectedDate, initialReportType]);
  const [iframeHeight, setIframeHeight] = useReportFrameHeight(iframeRef, 800);
  const fetchReportHtml = useCallback(async () => {
    if (!isOpen) return;
    try {
      setIsLoadingPreview(true);
      const res = await fetch(apiUrl(`/overtimes/report-html?${reportParams()}`), {
        method: "GET",
        headers: { Accept: "text/html, application/json" },
      });
      if (!res.ok) throw new Error(t("report.errorTitle"));
      setReportHtml(await res.text());
    } catch {
      setReportHtml(`
        <div style="font-family: sans-serif; text-align: center; padding: 40px; color: #dc2626;" dir="rtl">
          <h3>${t("report.errorTitle")}</h3>
          <p>${t("report.errorDesc")}</p>
        </div>
      `);
    } finally {
      setIsLoadingPreview(false);
    }
  }, [isOpen, reportParams, t]);
  useEffect(() => {
    if (isOpen) {
      fetchReportHtml();
    } else {
      setReportHtml("");
      setIsLoadingPreview(true);
      setZoomScale(1);
      setExistingPayout(null);
    }
  }, [isOpen, fetchReportHtml]);
  useEffect(() => {
    if (!isOpen || !selectedDate) return undefined;
    const controller = new AbortController();
    const params = new URLSearchParams({ date: selectedDate });
    if (branchId && branchId !== "all") params.append("branch_id", branchId);
    fetch(apiUrl(`/overtime-payouts/preview?${params.toString()}`), { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        const key = isFridayReport ? "friday" : "week";
        setExistingPayout(body?.periods?.[key]?.payout || null);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [isOpen, selectedDate, branchId, isFridayReport]);
  const handlePrint = () => {
    printReportFrame(iframeRef.current);
  };
  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    let objectUrl;
    try {
      const res = await fetch(apiUrl(`/overtimes/report-pdf?${reportParams()}`));
      if (!res.ok) {
        handlePrint();
        return;
      }
      const blob = await res.blob();
      objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${t(
        isFridayReport ? "report.fridayFileName" : "report.weeklyFileName"
      )}.pdf`;
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
            <div className="w-8 h-8 rounded-btn bg-accent-subtle border border-accent-line flex items-center justify-center text-accent">
              {isFridayReport ? (
                <Sun className="w-4 h-4" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
            </div>
            <div>
              <h2 className="text-base font-black text-content-strong leading-tight">
                {isFridayReport
                  ? t("report.previewFriday")
                  : t("report.previewWeekly")}
              </h2>
              <p className="text-[11px] text-content-subtle font-medium">
                {branchName || t("report.defaultBranchTitle")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-surface-subtle border border-line-strong rounded-btn p-0.5 gap-0.5">
              <button
                type="button"
                onClick={() =>
                  setZoomScale((s) =>
                    Math.max(ZOOM_MIN, Number((s - ZOOM_STEP).toFixed(2))),
                  )
                }
                className="p-1 hover:text-content-strong hover:bg-surface-strong rounded-btn transition-colors cursor-pointer"
                title={t("pdf.zoomOut", { ns: "common" })}
              >
                <ZoomOut size={13} />
              </button>
              <button
                type="button"
                onClick={() => setZoomScale(1)}
                className="px-1.5 py-0.5 text-xs font-bold text-content-body hover:text-content-strong transition-colors cursor-pointer"
                title={t("pdf.zoomReset", { ns: "common" })}
              >
                {Math.round(zoomScale * 100)}%
              </button>
              <button
                type="button"
                onClick={() =>
                  setZoomScale((s) =>
                    Math.min(ZOOM_MAX, Number((s + ZOOM_STEP).toFixed(2))),
                  )
                }
                className="p-1 hover:text-content-strong hover:bg-surface-strong rounded-btn transition-colors cursor-pointer"
                title={t("pdf.zoomIn", { ns: "common" })}
              >
                <ZoomIn size={13} />
              </button>
            </div>
            <button
              type="button"
              onClick={fetchReportHtml}
              className="p-1.5 bg-surface hover:bg-surface-muted text-content-muted hover:text-content-strong rounded-btn border border-line-strong transition-colors cursor-pointer shadow-2xs"
              title={t("pdf.reload", { ns: "common" })}
            >
              <RotateCw
                size={14}
                className={
                  isLoadingPreview ? "animate-spin text-accent" : ""
                }
              />
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={isLoadingPreview}
              className="px-3 py-1.5 bg-surface hover:bg-surface-muted text-content-body text-xs font-bold rounded-btn border border-line-strong flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              <Printer size={14} />
              <span>
                {isFridayReport
                  ? t("report.printFridaySheet")
                  : t("report.printWeeklySheet")}
              </span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="px-3.5 py-1.5 bg-accent hover:bg-accent-hover text-content-inverse text-xs font-bold rounded-btn shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {isDownloading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Download size={14} />
              )}
              <span>
                {isDownloading
                  ? t("report.generatingPdf")
                  : t("report.downloadPdf")}
              </span>
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
        {existingPayout ? (
          <div
            className="shrink-0 flex items-start gap-2 px-5 py-2.5 bg-notice-soft border-b border-notice-line text-notice-deep"
            dir="rtl"
          >
            <AlertTriangle size={15} className="shrink-0 mt-0.5 text-notice-icon" />
            <p className="text-label-text font-medium whitespace-normal break-words">
              {t("payout.alreadyPaidWarning", {
                receipt: existingPayout.receipt_number,
                state: existingPayout.state_label || "",
              })}
            </p>
          </div>
        ) : null}
        <div className="flex-1 overflow-auto p-4 sm:p-6 flex justify-center items-start bg-accent-subtle/90 relative">
          {isLoadingPreview && (
            <div className="absolute inset-0 flex items-center justify-center bg-surface/70 z-10 backdrop-blur-xs">
              <div className="flex items-center gap-2 bg-surface border border-line px-4 py-2.5 rounded-btn shadow-xl text-content text-xs font-bold">
                <Loader2 size={16} className="animate-spin text-accent" />
                <span>{t("pdf.loading", { ns: "common" })}</span>
              </div>
            </div>
          )}
          <div
            className="relative shrink-0 mx-auto shadow-2xl rounded-modal bg-surface border border-line-strong overflow-hidden p-8"
            style={{
              width: `${(SHEET_WIDTH_PX + PADDING) * zoomScale}px`,
              height: `${(iframeHeight + PADDING) * zoomScale}px`,
              transition: "width 120ms ease, height 120ms ease",
            }}
          >
            <iframe
              ref={iframeRef}
              srcDoc={reportHtml}
              sandbox="allow-scripts allow-modals"
              referrerPolicy="no-referrer"
              scrolling="no"
              title={t("report.iframeTitle")}
              className="bg-surface border-none block rounded-modal pointer-events-auto"
              style={{
                width: `${SHEET_WIDTH_PX}px`,
                height: `${iframeHeight}px`,
                transform: `scale(${zoomScale})`,
                transformOrigin: "top left", // Changed from "top right"
                overflow: "hidden",
              }}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
