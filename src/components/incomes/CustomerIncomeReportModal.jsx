import { useState, useEffect, useRef, useCallback } from "react";
import { printReportFrame, REPORT_FRAME_MIN_HEIGHT, useReportFrameHeight } from "../../utils/reportFrame";
import { useTranslation } from "react-i18next";
import { TEXT_FIELD_MAX_LENGTH } from "../../constants/treasuryDomain";
import { createPortal } from "react-dom";
import {
  Printer,
  X,
  Calendar,
  Search,
  Eye,
  Download,
  Loader2,
  RotateCw,
  ZoomIn,
  ZoomOut,
  SlidersHorizontal,
} from "lucide-react";
import DatePicker from "react-multi-date-picker";
import { persian, persian_af } from "../../utils/dateHelpers";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useDatePresets from "../../hooks/useDatePresets";
import { CustomDropdown, FilterPresetButtons } from "../common";
import { toEnglishDigits } from "../../utils/dariNumberFormatter";
import { apiUrl } from "../../api";
export default function CustomerIncomeReportModal({
  isOpen,
  onClose,
}) {
  const { t } = useTranslation("incomes");
  useBodyScrollLock(isOpen);
  const {
    activePreset,
    setActivePreset,
    fromDate: fromDateObj,
    setFromDate: setFromDateObj,
    toDate: toDateObj,
    setToDate: setToDateObj,
    applyPreset,
    presets,
  } = useDatePresets("this_month");
  const [filterCurrency, setFilterCurrency] = useState("all");
  const [filterCustomer, setFilterCustomer] = useState("");
  const [reportTitle, setReportTitle] = useState(t("report.defaultHeading"));
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [zoomScale, setZoomScale] = useState(1.0);
    const [reportHtml, setReportHtml] = useState("");
  const iframeRef = useRef(null);
  const [iframeHeight, setIframeHeight] = useReportFrameHeight(iframeRef, REPORT_FRAME_MIN_HEIGHT, 35);
  useEffect(() => {
    if (isOpen) {
      applyPreset("this_month");
      setIsExpanded(false);
      setZoomScale(1.0);
      setIframeHeight(793.7);
      setReportHtml("");
    }
  }, [isOpen, applyPreset]);
  const getReportParams = useCallback(() => {
    const params = new URLSearchParams();
    if (activePreset !== "all") {
      if (fromDateObj) {
        params.append("from_date", toEnglishDigits(fromDateObj.format("YYYY/MM/DD")));
      }
      if (toDateObj) {
        params.append("to_date", toEnglishDigits(toDateObj.format("YYYY/MM/DD")));
      }
    }
    if (filterCurrency !== "all") params.append("currency", filterCurrency);
    if (filterCustomer.trim()) params.append("search", filterCustomer.trim());
    if (reportTitle.trim()) params.append("report_title", reportTitle.trim());
    return params;
  }, [activePreset, fromDateObj, toDateObj, filterCurrency, filterCustomer, reportTitle]);
  const fetchReportHtml = useCallback(async () => {
    try {
      setIsLoadingPreview(true);
      const params = getReportParams();
      params.append("t", Date.now().toString());
      const res = await fetch(`${apiUrl("/incomes/report-html")}?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load report preview");
      const html = await res.text();
      setReportHtml(html);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingPreview(false);
    }
  }, [getReportParams]);
  if (!isOpen) return null;
  const handleOpenPreview = () => {
    setIsExpanded(true);
    fetchReportHtml();
  };
  const handlePrint = () => {
    printReportFrame(iframeRef.current);
  };
  const handleDownloadPdf = async () => {
    try {
      setIsDownloading(true);
      const params = getReportParams();
      params.append("t", Date.now().toString());
      const url = `${apiUrl("/incomes/report-pdf")}?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to generate PDF");
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `گزارش_دریافتی_های_مشتریان_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDownloading(false);
    }
  };
  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs font-sans animate-in fade-in duration-150"
      dir="rtl"
    >
      <div
        className={`bg-white border border-gray-200 rounded-modal shadow-2xl overflow-hidden flex flex-col transition-all duration-200 ${
          isExpanded
            ? "w-full max-w-[1300px] h-[95vh]"
            : "w-full max-w-xl max-h-[92vh]"
        }`}
      >
        {!isExpanded ? (
          <>
            <div className="bg-white px-5 py-3.5 flex justify-between items-center border-b border-gray-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-btn bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shadow-2xs">
                  <Printer size={18} />
                </div>
                <div>
                  <h3 className="text-section-title font-bold text-gray-900">{t("report.filterTitle")}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded-btn transition-colors cursor-pointer"
                aria-label={t("detail.close")}
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-label-text font-bold text-gray-700 mb-1.5">{t("report.headingLabel")}</label>
                <input
                  type="text"
                  maxLength={TEXT_FIELD_MAX_LENGTH}
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-input px-3 py-2 text-body-text font-semibold text-gray-800 focus:outline-none focus:border-emerald-600 bg-white shadow-2xs"
                />
              </div>
              <div className="p-3.5 bg-gray-50 border border-gray-200/70 rounded-card space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-label-text font-bold text-gray-800 flex items-center gap-1.5">
                    <Calendar size={14} className="text-emerald-700" />
                    <span>{t("report.rangeLabel")}</span>
                  </span>
                </div>
                <FilterPresetButtons
                  presets={presets}
                  activeKey={activePreset}
                  onChange={applyPreset}
                  className="grid grid-cols-3 sm:grid-cols-6 gap-1.5"
                  buttonClassName="py-1.5 px-1 text-center rounded-pill text-caption-text"
                />
                {activePreset === "all" ? (
                  <div className="p-2.5 bg-white border border-gray-200 rounded-card text-center text-caption-text text-gray-500 font-medium">{t("report.rangeHint")}</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-caption-text font-bold text-gray-600 mb-1">{t("report.fromDate")}</label>
                      <DatePicker
                        value={fromDateObj}
                        onChange={(d) => {
                          setActivePreset("custom");
                          setFromDateObj(d);
                        }}
                        calendar={persian}
                        locale={persian_af}
                        calendarPosition="bottom-right"
                        containerClassName="w-full"
                        inputClass="w-full border border-gray-300 rounded-input px-3 py-1.5 text-body-text font-bold font-mono text-gray-800 focus:outline-none focus:border-emerald-600 bg-white text-center cursor-pointer shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-caption-text font-bold text-gray-600 mb-1">{t("report.toDate")}</label>
                      <DatePicker
                        value={toDateObj}
                        onChange={(d) => {
                          setActivePreset("custom");
                          setToDateObj(d);
                        }}
                        calendar={persian}
                        locale={persian_af}
                        calendarPosition="bottom-right"
                        containerClassName="w-full"
                        inputClass="w-full border border-gray-300 rounded-input px-3 py-1.5 text-body-text font-bold font-mono text-gray-800 focus:outline-none focus:border-emerald-600 bg-white text-center cursor-pointer shadow-2xs"
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-label-text font-bold text-gray-700 mb-1.5">{t("report.type")}</label>
                  <div className="h-[38px] px-3 flex items-center justify-between bg-emerald-50/70 border border-emerald-200 rounded-input text-body-text font-bold text-emerald-800 select-none">
                    <span>{t("navigation.pages.incomes", { ns: "common" })}</span>
                    <span className="text-caption-text font-normal text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-badge">{t("report.typeAll")}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-label-text font-bold text-gray-700 mb-1.5">{t("label.currencyLabel")}</label>
                  <CustomDropdown
                    value={filterCurrency}
                    onChange={(val) => setFilterCurrency(val)}
                    options={[
                      { value: "all", label: t("report.allCurrencies") },
                      { value: "AFN", label: t("report.onlyAfn") },
                      { value: "USD", label: t("report.onlyUsd") },
                    ]}
                    buttonClassName="w-full h-[38px] px-2.5 text-body-text rounded-input min-w-[130px]"
                    width="w-full"
                    usePortal={true}
                  />
                </div>
              </div>
              <div>
                <label className="block text-label-text font-bold text-gray-700 mb-1.5">{t("report.payerLabel")}</label>
                <div className="relative">
                  <Search size={14} className="absolute right-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    maxLength={TEXT_FIELD_MAX_LENGTH}
                    value={filterCustomer}
                    onChange={(e) => setFilterCustomer(e.target.value)}
                    placeholder={t("report.payerPlaceholder")}
                    className="w-full border border-gray-300 rounded-input pr-8 pl-3 py-2 text-body-text text-gray-800 focus:outline-none focus:border-emerald-600 bg-white shadow-2xs"
                  />
                </div>
              </div>
            </div>
            <div className="px-5 py-3.5 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-btn-text font-bold text-gray-700 bg-white border border-gray-300 rounded-btn hover:bg-gray-100 transition-colors cursor-pointer"
              >{t("label.cancel")}</button>
              <button
                type="button"
                onClick={handleOpenPreview}
                className="px-5 py-2 text-btn-text font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-btn transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <Eye size={16} />
                <span>{t("report.showPreview")}</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white px-5 py-3.5 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 shrink-0 text-gray-800 font-sans">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-btn bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shadow-2xs">
                  <Printer size={18} />
                </div>
                <div>
                  <h3 className="text-section-title text-gray-900 font-bold">{t("report.previewTitle")}</h3>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 text-btn-text font-bold rounded-btn border border-gray-300 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                >
                  <SlidersHorizontal size={14} />
                  <span>{t("report.changeFilters")}</span>
                </button>
                <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-btn px-2 py-1 text-caption-text text-gray-700">
                  <button
                    type="button"
                    onClick={() => setZoomScale((s) => Math.max(0.5, Number((s - 0.05).toFixed(2))))}
                    className="p-1 hover:text-gray-900 hover:bg-gray-200/70 rounded-btn transition-colors cursor-pointer"
                    aria-label={t("report.zoomOut")}
                  >
                    <ZoomOut size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomScale(1.0)}
                    className="px-1.5 py-0.5 text-caption-text font-bold text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
                  >
                    {Math.round(zoomScale * 100)}%
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomScale((s) => Math.min(1.4, Number((s + 0.05).toFixed(2))))}
                    className="p-1 hover:text-gray-900 hover:bg-gray-200/70 rounded-btn transition-colors cursor-pointer"
                    aria-label={t("report.zoomIn")}
                  >
                    <ZoomIn size={14} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={fetchReportHtml}
                  className="p-2 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900 rounded-btn border border-gray-300 transition-colors cursor-pointer shadow-2xs"
                  aria-label={t("report.reload")}
                >
                  <RotateCw size={15} className={isLoadingPreview ? "animate-spin text-slate-700" : ""} />
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isDownloading}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-btn-text font-bold rounded-btn shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isDownloading ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Download size={15} />
                  )}
                  <span>{isDownloading ? t("report.generating") : t("report.download")}</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={isLoadingPreview}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-btn-text font-bold rounded-btn flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
                >
                  <Printer size={15} />
                  <span>{t("report.print")}</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-btn transition-colors cursor-pointer"
                  aria-label={t("detail.close")}
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 sm:p-6 flex justify-center items-start bg-slate-100/90 relative">
              {isLoadingPreview && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10 backdrop-blur-xs">
                  <div className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2.5 rounded-card shadow-xl text-gray-800 text-btn-text font-bold">
                    <Loader2 size={18} className="animate-spin text-slate-800" />
                    <span>{t("report.loading")}</span>
                  </div>
                </div>
              )}
              <div
                className="relative shrink-0 mx-auto shadow-2xl rounded-card bg-white border border-gray-300 overflow-hidden"
                style={{
                  width: `${1122.5 * zoomScale}px`,
                  height: `${iframeHeight * zoomScale}px`,
                  transition: "width 120ms ease, height 120ms ease",
                }}
              >
                <iframe
                  ref={iframeRef}
                  srcDoc={reportHtml}
                  sandbox="allow-scripts allow-modals"
                  scrolling="no"
                  title={t("report.previewTitle")}
                  className="bg-white border-none block rounded-card pointer-events-auto"
                  style={{
                    width: "1122.5px",
                    height: `${iframeHeight}px`,
                    transform: `scale(${zoomScale})`,
                    transformOrigin: "top right",
                    overflow: "hidden",
                  }}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
