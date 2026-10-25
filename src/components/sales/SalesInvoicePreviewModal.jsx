import React, { useState, useEffect, useRef, useCallback } from "react";
import { printReportFrame } from "../../utils/reportFrame";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import {
  X,
  Download,
  Loader2,
  FileText,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Printer,
  Filter,
  Plus,
  Trash2,
  RefreshCw,
} from "lucide-react";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import { apiUrl, apiFetch } from "../../api";
import { showToast } from "../../utils/toast";
import { getCleanErrorMessage } from "../../utils/errorHandler";
import { formatProductName } from "../../utils/productFormat";
import { formatShamsiDate } from "../../utils";

const fmt = (n) => Number(n || 0).toLocaleString("en-US");

export default function SalesInvoicePreviewModal({
  isOpen,
  onClose,
  invoice,
  mode = "invoice",
}) {
  const { t } = useTranslation("sales");
  useBodyScrollLock(isOpen);
  const isExit = mode === "warehouse-exit";
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(true);
  const [invoiceHtml, setInvoiceHtml] = useState("");
  const [zoomScale, setZoomScale] = useState(1.0);
  const iframeRef = useRef(null);

  const [activeDispatch, setActiveDispatch] = useState(null);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelSubmitting, setPanelSubmitting] = useState(false);
  const [itemsSummary, setItemsSummary] = useState([]);
  const [dispatchList, setDispatchList] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [panelDriverName, setPanelDriverName] = useState("");
  const [panelTruckPlate, setPanelTruckPlate] = useState("");
  const [deletingDispatchBusyId, setDeletingDispatchBusyId] = useState(null);

  const isDispatch = isExit && !!activeDispatch;

  const invoiceNumber = invoice?.invoice_number || invoice?.id || "—";
  const invoiceHtmlUrl = invoice?.id
    ? apiUrl(isDispatch
        ? `/sales-invoices/${invoice.id}/dispatches/${activeDispatch.id}/preview-html`
        : isExit
        ? `/sales-invoices/${invoice.id}/warehouse-exit/preview-html`
        : `/sales-invoices/${invoice.id}/preview-html`)
    : "";
  const invoicePdfUrl = invoice?.id
    ? apiUrl(isDispatch
        ? `/sales-invoices/${invoice.id}/dispatches/${activeDispatch.id}/pdf`
        : isExit
        ? `/sales-invoices/${invoice.id}/warehouse-exit/pdf`
        : `/sales-invoices/${invoice.id}/pdf`)
    : "";

  const fetchPreviewHtml = useCallback(async () => {
    if (!invoiceHtmlUrl) return;
    try {
      setIsLoadingPreview(true);
      const res = await fetch(`${invoiceHtmlUrl}?t=${Date.now()}`);
      if (!res.ok) throw new Error(t(isDispatch ? "invoicePreviewModal.dispatchExitErrorFetchPreview" : isExit ? "invoicePreviewModal.warehouseExitErrorFetchPreview" : "invoicePreviewModal.errorFetchPreview"));
      const html = await res.text();
      setInvoiceHtml(html);
    } catch (err) {
      console.error("Failed to load invoice preview HTML:", err);
    } finally {
      setIsLoadingPreview(false);
    }
  }, [invoiceHtmlUrl, isExit, isDispatch, t]);

  const fetchDispatchSummary = useCallback(async () => {
    if (!isExit || !invoice?.id) return null;
    setPanelLoading(true);
    try {
      const res = await apiFetch(`/sales-invoices/${invoice.id}/dispatches`);
      const items = res.items || [];
      setItemsSummary(items);
      setDispatchList(res.dispatches || []);
      setQuantities(() => {
        const next = {};
        items.forEach((it) => {
          next[it.id] = it.remaining_quantity > 0 ? String(it.remaining_quantity) : "";
        });
        return next;
      });
      return res;
    } catch (err) {
      showToast.error(getCleanErrorMessage(err));
      return null;
    } finally {
      setPanelLoading(false);
    }
  }, [isExit, invoice?.id]);

  useEffect(() => {
    if (isOpen && invoice?.id) {
      fetchPreviewHtml();
      if (isExit) {
        setPanelDriverName(invoice.driver_name || "");
        setPanelTruckPlate(invoice.truck_plate || "");
        fetchDispatchSummary();
      }
    } else {
      setInvoiceHtml("");
      setZoomScale(1.0);
      setActiveDispatch(null);
      setShowFilterPanel(false);
      setItemsSummary([]);
      setDispatchList([]);
      setQuantities({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, invoice?.id]);

  useEffect(() => {
    if (isOpen && invoice?.id) {
      fetchPreviewHtml();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDispatch]);

  if (!isOpen || !invoice?.id) return null;

  const handlePrint = () => {
    printReportFrame(iframeRef.current);
  };

  const handleDownloadPdf = async () => {
    try {
      setIsDownloading(true);
      const res = await fetch(`${invoicePdfUrl}?t=${Date.now()}`);
      if (!res.ok) throw new Error("Failed to generate PDF from server");

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;

      const customer = (invoice.customer_name || t("invoicePreviewModal.defaultCustomer")).replace(/\s+/g, "_");
      const dateStr = (formatShamsiDate(invoice.shamsi_date) || "date").replace(/\//g, "-");
      const filenamePrefix = t(isDispatch ? "invoicePreviewModal.dispatchExitFilenamePrefix" : isExit ? "invoicePreviewModal.warehouseExitFilenamePrefix" : "invoicePreviewModal.filenamePrefix");
      link.download = `${filenamePrefix}_${customer}_${invoiceNumber}_${dateStr}.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error("Backend PDF download error:", err);
      window.open(invoicePdfUrl ? `${invoicePdfUrl}?t=${Date.now()}` : invoicePdfUrl, "_blank");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleFillRemaining = () => {
    const next = {};
    itemsSummary.forEach((it) => {
      next[it.id] = it.remaining_quantity > 0 ? String(it.remaining_quantity) : "";
    });
    setQuantities(next);
  };

  const handleCreateDispatch = async () => {
    const payloadItems = itemsSummary
      .map((it) => ({
        sales_invoice_item_id: it.id,
        quantity: parseFloat(quantities[it.id]) || 0,
      }))
      .filter((row) => row.quantity > 0);

    if (payloadItems.length === 0) {
      showToast.error("حداقل یک قلم با مقدار بیشتر از صفر باید انتخاب شود.");
      return;
    }

    setPanelSubmitting(true);
    try {
      const createRes = await apiFetch(`/sales-invoices/${invoice.id}/dispatches`, {
        method: "POST",
        body: {
          driver_name: panelDriverName.trim() || null,
          truck_plate: panelTruckPlate.trim() || null,
          items: payloadItems,
        },
      });
      showToast.success("حواله خروجی گدام با موفقیت ثبت شد.");
      const summary = await fetchDispatchSummary();
      const created = (summary?.dispatches || []).find((d) => d.id === createRes.data.id);
      setActiveDispatch(created ? { id: created.id, ordinal: created.ordinal } : { id: createRes.data.id, ordinal: null });
      setShowFilterPanel(false);
    } catch (err) {
      showToast.error(getCleanErrorMessage(err));
    } finally {
      setPanelSubmitting(false);
    }
  };

  const handleDeleteDispatch = async (dispatch) => {
    setDeletingDispatchBusyId(dispatch.id);
    try {
      await apiFetch(`/sales-invoices/${invoice.id}/dispatches/${dispatch.id}`, {
        method: "DELETE",
      });
      showToast.success("حواله خروجی گدام حذف شد.");
      if (activeDispatch?.id === dispatch.id) {
        setActiveDispatch(null);
      }
      await fetchDispatchSummary();
    } catch (err) {
      showToast.error(getCleanErrorMessage(err));
    } finally {
      setDeletingDispatchBusyId(null);
    }
  };

  const totalRemaining = itemsSummary.reduce((acc, it) => acc + (it.remaining_quantity || 0), 0);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-xs font-sans"
      dir="rtl"
    >
      <div className="bg-white w-full max-w-5xl h-[95vh] rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 border border-gray-200">
        <div className="bg-white px-5 py-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 shrink-0 text-gray-800 font-sans">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-2xs">
              <FileText size={17} />
            </div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900">
                {isDispatch
                  ? `${t("invoicePreviewModal.dispatchExitTitle")} #${activeDispatch.ordinal ?? ""}`
                  : t(isExit ? "invoicePreviewModal.warehouseExitTitle" : "invoicePreviewModal.title")}
              </h3>
              <span
                className="font-mono text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md border border-slate-300 font-bold"
                dir="ltr"
              >
                #{invoiceNumber}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isExit && (
              <button
                type="button"
                onClick={() => setShowFilterPanel((s) => !s)}
                className={`px-3 py-2 text-xs font-bold rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                  showFilterPanel
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
                title="فیلتر / تقسیم اقلام بین چند راننده"
              >
                <Filter size={14} />
                <span>فیلتر / تقسیم</span>
              </button>
            )}

            <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-700">
              <button
                type="button"
                onClick={() => setZoomScale((s) => Math.max(0.5, Number((s - 0.05).toFixed(2))))}
                className="p-1 hover:text-gray-900 hover:bg-gray-200/70 rounded-md transition-colors cursor-pointer"
                title={t("invoicePreviewModal.zoomOutTooltip")}
              >
                <ZoomOut size={14} />
              </button>
              <button
                type="button"
                onClick={() => setZoomScale(1.0)}
                className="px-1.5 py-0.5 text-xs font-bold text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
                title={t("invoicePreviewModal.zoomDefaultTooltip")}
              >
                {Math.round(zoomScale * 100)}%
              </button>
              <button
                type="button"
                onClick={() => setZoomScale((s) => Math.min(1.4, Number((s + 0.05).toFixed(2))))}
                className="p-1 hover:text-gray-900 hover:bg-gray-200/70 rounded-md transition-colors cursor-pointer"
                title={t("invoicePreviewModal.zoomInTooltip")}
              >
                <ZoomIn size={14} />
              </button>
            </div>

            <button
              type="button"
              onClick={fetchPreviewHtml}
              className="p-2 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900 rounded-lg border border-gray-300 transition-colors cursor-pointer shadow-2xs"
              title={t("invoicePreviewModal.reloadTooltip")}
            >
              <RotateCw size={15} className={isLoadingPreview ? "animate-spin text-slate-700" : ""} />
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              title={t("invoicePreviewModal.downloadTooltip")}
            >
              {isDownloading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Download size={15} />
              )}
              <span>{isDownloading ? t("invoicePreviewModal.downloadingText") : t("invoicePreviewModal.downloadButton")}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={isLoadingPreview}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
              title={t(isDispatch ? "invoicePreviewModal.dispatchExitPrintTooltip" : isExit ? "invoicePreviewModal.warehouseExitPrintTooltip" : "invoicePreviewModal.printTooltip")}
            >
              <Printer size={15} />
              <span>{t(isDispatch ? "invoicePreviewModal.dispatchExitPrintButton" : isExit ? "invoicePreviewModal.warehouseExitPrintButton" : "invoicePreviewModal.printButton")}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg transition-colors cursor-pointer"
              title={t("invoicePreviewModal.closeTooltip")}
              aria-label={t("invoicePreviewModal.closeAriaLabel")}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {isExit && dispatchList.length > 0 && (
          <div className="px-5 py-2.5 border-b border-gray-200 bg-gray-50/70 flex items-center gap-2 overflow-x-auto shrink-0">
            <button
              type="button"
              onClick={() => setActiveDispatch(null)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold whitespace-nowrap border transition-colors cursor-pointer ${
                !activeDispatch
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
              }`}
            >
              کل فاکتور (بدون تفکیک)
            </button>
            {dispatchList.map((d) => (
              <div
                key={d.id}
                className={`flex items-center gap-1 rounded-md border pl-1 pr-2.5 py-1 whitespace-nowrap transition-colors ${
                  activeDispatch?.id === d.id
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveDispatch({ id: d.id, ordinal: d.ordinal })}
                  className="text-[11px] font-bold cursor-pointer"
                >
                  حواله #{d.ordinal} {d.driver_name ? `— ${d.driver_name}` : ""}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteDispatch(d)}
                  disabled={deletingDispatchBusyId === d.id}
                  className={`p-0.5 rounded transition-colors cursor-pointer ${
                    activeDispatch?.id === d.id ? "hover:bg-white/20" : "hover:bg-rose-100 text-rose-500"
                  }`}
                  title="حذف این حواله"
                >
                  {deletingDispatchBusyId === d.id ? (
                    <Loader2 size={11} className="animate-spin" />
                  ) : (
                    <Trash2 size={11} />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        {isExit && showFilterPanel && (
          <div className="px-5 py-4 border-b border-gray-200 bg-white space-y-3 shrink-0 max-h-[40vh] overflow-y-auto">
            {panelLoading ? (
              <div className="flex items-center justify-center py-6 text-gray-500 text-xs">
                <Loader2 size={18} className="animate-spin ml-2" />
                <span>در حال بارگذاری اقلام...</span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-800">انتخاب اقلام و مقدار برای حواله جدید</span>
                  <button
                    type="button"
                    onClick={handleFillRemaining}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer flex items-center gap-1"
                  >
                    <RefreshCw size={11} />
                    پر کردن با باقیمانده
                  </button>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                      <tr>
                        <th className="p-2">محصول</th>
                        <th className="p-2 text-center">مجموع</th>
                        <th className="p-2 text-center">خارج‌شده</th>
                        <th className="p-2 text-center">باقیمانده</th>
                        <th className="p-2 text-center w-28">مقدار این حواله</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {itemsSummary.map((it) => (
                        <tr key={it.id}>
                          <td className="p-2 font-bold text-gray-900">{formatProductName(it.product_name)}</td>
                          <td className="p-2 text-center font-mono text-gray-700" dir="ltr">{fmt(it.quantity)}</td>
                          <td className="p-2 text-center font-mono text-amber-700" dir="ltr">{fmt(it.dispatched_quantity)}</td>
                          <td className="p-2 text-center font-mono font-bold text-emerald-700" dir="ltr">{fmt(it.remaining_quantity)}</td>
                          <td className="p-1.5 text-center">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              max={it.remaining_quantity}
                              dir="ltr"
                              disabled={it.remaining_quantity <= 0}
                              value={quantities[it.id] ?? ""}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => setQuantities((prev) => ({ ...prev, [it.id]: e.target.value }))}
                              className="w-full h-[32px] bg-white border border-gray-300 rounded-lg px-2 text-xs font-mono font-bold text-center focus:outline-none focus:border-slate-800 disabled:bg-gray-100 disabled:text-gray-400"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">نام راننده این حواله:</label>
                    <input
                      type="text"
                      value={panelDriverName}
                      onChange={(e) => setPanelDriverName(e.target.value)}
                      className="w-full h-[34px] bg-white border border-gray-300 rounded-lg px-3 text-xs text-gray-900 focus:outline-none focus:border-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">نمبر پلیت موتر:</label>
                    <input
                      type="text"
                      value={panelTruckPlate}
                      onChange={(e) => setPanelTruckPlate(e.target.value)}
                      className="w-full h-[34px] bg-white border border-gray-300 rounded-lg px-3 text-xs text-gray-900 font-mono focus:outline-none focus:border-slate-800 text-center"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCreateDispatch}
                  disabled={panelSubmitting || totalRemaining <= 0}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {panelSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  <span>{panelSubmitting ? "در حال ثبت حواله..." : "ایجاد و پیش‌نمایش حواله جدید"}</span>
                </button>
              </>
            )}
          </div>
        )}

        <div className="flex-1 overflow-auto p-4 sm:p-6 flex justify-center items-start bg-slate-100/90 relative">
          {isLoadingPreview && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10 backdrop-blur-xs">
              <div className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2.5 rounded-lg shadow-xl text-gray-800 text-xs font-bold">
                <Loader2 size={18} className="animate-spin text-slate-800" />
                <span>{t("invoicePreviewModal.loadingPreview")}</span>
              </div>
            </div>
          )}

          <div
            className="relative shrink-0 mx-auto shadow-2xl rounded-lg bg-white border border-gray-300 overflow-hidden"
            style={{
              width: `${(148 * zoomScale).toFixed(2)}mm`,
              height: `${(210 * zoomScale).toFixed(2)}mm`,
              transition: "width 120ms ease, height 120ms ease",
            }}
          >
            <iframe
              ref={iframeRef}
              srcDoc={invoiceHtml}
              sandbox="allow-scripts allow-modals"
              title={t(isDispatch ? "invoicePreviewModal.dispatchExitIframeTitle" : isExit ? "invoicePreviewModal.warehouseExitIframeTitle" : "preview.iframeTitle", { invoiceNumber, number: invoiceNumber })}
              className="bg-white border-none block"
              style={{
                width: "148mm",
                height: "210mm",
                transform: `scale(${zoomScale})`,
                transformOrigin: "0 0",
                display: "block",
              }}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
