import { useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { Download, Loader2, Printer, X } from "lucide-react";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useReportPreview from "../../hooks/useReportPreview";
import { showToast } from "../../utils/toast";
import { getCleanErrorMessage } from "../../utils/errorHandler";

const SHEET_WIDTH = 560;
const SHEET_HEIGHT = 794;

export default function PurchasePreviewModal({ isOpen, purchase, onClose }) {
  useBodyScrollLock(isOpen);
  const purchaseId = purchase?.id;
  const htmlPath = useMemo(() => purchaseId ? `/purchases/${purchaseId}/preview-html` : "", [purchaseId]);
  const pdfPath = useMemo(() => purchaseId ? `/purchases/${purchaseId}/pdf` : "", [purchaseId]);
  const buildPayload = useCallback(() => ({}), []);
  const onError = useCallback(
    (error) => showToast.error(getCleanErrorMessage(error, "بارگذاری پیش‌نمایش بل خرید انجام نشد.")),
    [],
  );
  const {
    iframeRef,
    reportHtml,
    isLoadingPreview,
    isDownloading,
    downloadPdf,
    print,
  } = useReportPreview({
    isOpen: isOpen && Boolean(purchaseId),
    htmlPath,
    pdfPath,
    buildPayload,
    fallbackFilename: () => `بل خرید ${purchase?.purchase_number || purchaseId || ""}.pdf`,
    onError,
    method: "GET",
  });

  if (!isOpen || !purchase) return null;
  const busy = isLoadingPreview || isDownloading;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-3 sm:p-5" dir="rtl">
      <div className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-modal border border-gray-200 bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-5 py-3.5">
          <div>
            <h2 className="text-section-title font-bold text-gray-900">پیش‌نمایش بل خرید</h2>
            <p className="mt-1 text-caption-text text-gray-500">شماره بل: {purchase.purchase_number || `P-${String(purchase.id).padStart(4, "0")}`}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-btn p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="بستن"><X size={19} /></button>
        </div>
        <div className="flex-1 overflow-auto bg-gray-100 p-4">
          {isLoadingPreview ? (
            <div className="flex h-[794px] items-center justify-center text-gray-500"><Loader2 size={26} className="animate-spin" /></div>
          ) : (
            <iframe
              ref={iframeRef}
              srcDoc={reportHtml}
              title="پیش‌نمایش بل خرید"
              sandbox="allow-scripts allow-modals"
              className="mx-auto block border-0 bg-white shadow-lg"
              style={{ width: `${SHEET_WIDTH}px`, height: `${SHEET_HEIGHT}px`, overflow: "hidden" }}
            />
          )}
        </div>
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-gray-200 bg-gray-50 px-5 py-3">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-btn border border-gray-300 bg-white px-4 py-2 text-btn-text font-bold text-gray-700 disabled:opacity-50">بستن</button>
          <div className="flex gap-2">
            <button type="button" onClick={downloadPdf} disabled={busy} className="inline-flex items-center gap-1.5 rounded-btn border border-gray-300 bg-white px-4 py-2 text-btn-text font-bold text-gray-700 disabled:opacity-50">
              {isDownloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} {isDownloading ? "در حال ساخت PDF..." : "دانلود PDF"}
            </button>
            <button type="button" onClick={print} disabled={busy} className="inline-flex items-center gap-1.5 rounded-btn bg-slate-800 px-4 py-2 text-btn-text font-bold text-white disabled:opacity-50"><Printer size={15} /> چاپ سند</button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
