import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Download,
  Loader2,
  Printer,
  RefreshCw,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import { apiUrl } from "../../api";
import {
  printReportFrame,
  REPORT_FRAME_MIN_HEIGHT,
  useReportFrameHeight,
} from "../../utils/reportFrame";

export default function CustomersReportModal({ isOpen, onClose }) {
  const [reportHtml, setReportHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [zoomScale, setZoomScale] = useState(1);
  const iframeRef = useRef(null);
  const [iframeHeight, setIframeHeight] = useReportFrameHeight(
    iframeRef,
    REPORT_FRAME_MIN_HEIGHT,
    35,
  );
  useBodyScrollLock(isOpen);

  const fetchReportHtml = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`${apiUrl("/customers/report-html")}?t=${Date.now()}`);
      if (!response.ok) throw new Error("بارگذاری راپور مشتریان ناموفق بود.");
      setReportHtml(await response.text());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setZoomScale(1);
    setIframeHeight(793.7);
    setReportHtml("");
    fetchReportHtml();
  }, [fetchReportHtml, isOpen, setIframeHeight]);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const response = await fetch(apiUrl("/customers/report-pdf"));
      if (!response.ok) throw new Error("دریافت فایل PDF ناموفق بود.");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `راپور_مشتریان_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDownloading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-3 sm:p-4 font-sans animate-in fade-in duration-150"
      dir="rtl"
    >
      <div className="flex h-[95vh] w-full max-w-[1300px] flex-col overflow-hidden rounded-modal border border-gray-200 bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-btn border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-2xs">
              <Printer size={18} />
            </div>
            <h3 className="text-section-title font-bold text-gray-900">پیش‌نمایش راپور مشتریان</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => printReportFrame(iframeRef.current)}
              disabled={!reportHtml}
              className="inline-flex items-center gap-1.5 rounded-btn bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Printer size={14} />
              چاپ راپور
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 rounded-btn bg-slate-800 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              ذخیره سند (PDF)
            </button>
            <button
              type="button"
              onClick={fetchReportHtml}
              disabled={loading}
              className="rounded-btn border border-gray-300 bg-white p-2 text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50"
              title="بارگذاری مجدد"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
            <div className="flex items-center gap-1 rounded-btn border border-gray-300 bg-white px-2 py-1.5">
              <button type="button" onClick={() => setZoomScale((value) => Math.max(0.7, value - 0.1))} className="p-0.5 text-gray-700">
                <ZoomOut size={14} />
              </button>
              <span className="min-w-10 text-center text-xs font-bold text-gray-700">{Math.round(zoomScale * 100)}%</span>
              <button type="button" onClick={() => setZoomScale((value) => Math.min(1.3, value + 0.1))} className="p-0.5 text-gray-700">
                <ZoomIn size={14} />
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 transition-colors hover:text-gray-700"
              aria-label="بستن راپور"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-6">
          {loading && !reportHtml ? (
            <div className="flex min-h-56 items-center justify-center gap-2 text-sm text-gray-500">
              <Loader2 size={18} className="animate-spin" />
              <span>در حال آماده‌سازی پیش‌نمایش راپور...</span>
            </div>
          ) : error ? (
            <div className="p-10 text-center text-sm text-rose-700">{error}</div>
          ) : (
            <div className="mx-auto w-full max-w-[1180px] overflow-hidden rounded-card bg-white shadow-xl">
              <div style={{ height: iframeHeight, transform: `scale(${zoomScale})`, transformOrigin: "top center" }}>
                <iframe
                  ref={iframeRef}
                  title="پیش‌نمایش راپور مشتریان"
                  srcDoc={reportHtml}
                  className="h-full w-full border-0 bg-white"
                  sandbox="allow-scripts allow-modals"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
