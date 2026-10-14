import { useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Printer, Download, X, FileText, Loader2, RotateCw } from "lucide-react";
import DatePicker from "react-multi-date-picker";
import { persian, persian_af, formatToGregorian } from "../../utils/dateHelpers";
import {
  REPORT_PERIOD_PRESET_KEYS,
  buildPresets,
  getDatePresetRange,
} from "../../utils/datePresets";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useReportPreview from "../../hooks/useReportPreview";
import { showToast } from "../../utils/toast";
import SearchableSelect from "../common/SearchableSelect";
import FilterPresetButtons from "../common/FilterPresetButtons";
import { useTranslation } from "react-i18next";
const PAGE_WIDTH_PX = 794;
const PAGE_HEIGHT_PX = 560;
export default function PeriodicProductionReportModal({
  isOpen,
  onClose,
  categories = [],
  branches = [],
  showBranch = true,
}) {
  const { t } = useTranslation("production");
  const { t: tCommon } = useTranslation("common");
  const reportPeriodPresets = useMemo(
    () => buildPresets(REPORT_PERIOD_PRESET_KEYS, tCommon),
    [tCommon],
  );
  useBodyScrollLock(isOpen);
  const [periodPreset, setPeriodPreset] = useState("month");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const monthRange = getDatePresetRange("month");
  const [customStartDate, setCustomStartDate] = useState(monthRange.fromDate);
  const [customEndDate, setCustomEndDate] = useState(monthRange.toDate);
  const isCustom = periodPreset === "custom";
  const buildPayload = useCallback(
    () => ({
      period_preset: periodPreset,
      start_date: isCustom ? formatToGregorian(customStartDate) : "",
      end_date: isCustom ? formatToGregorian(customEndDate) : "",
      category_id: selectedCategory,
      branch_id: selectedBranch,
    }),
    [
      periodPreset,
      isCustom,
      customStartDate,
      customEndDate,
      selectedCategory,
      selectedBranch,
    ],
  );
  const fallbackFilename = useCallback(
    () =>
      `${t("periodicModal.filenamePrefix")}_${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`,
    [],
  );
  const onError = useCallback((err) => {
    console.error("Periodic production report error:", err);
    showToast.error(t("periodicModal.pdfDownloadError"));
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
    htmlPath: "/production-reports/periodic-html",
    pdfPath: "/production-reports/periodic-pdf",
    buildPayload,
    fallbackFilename,
    onError,
  });
  const categoryOptions = useMemo(
    () => [
      { id: "all", name: t("periodicModal.allCategories") },
      ...categories.map((c) => ({ id: c.id, name: c.name })),
    ],
    [categories],
  );
  const branchOptions = useMemo(
    () => [
      { id: "all", name: t("periodicModal.allBranches") },
      ...branches.map((b) => ({ id: b.id, name: b.name })),
    ],
    [branches],
  );
  if (!isOpen) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs font-sans"
      dir="rtl"
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-gray-200">
        <div className="bg-white px-5 py-3.5 flex justify-between items-center shrink-0 border-b border-gray-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shadow-2xs">
              <FileText size={18} />
            </div>
            <h3 className="text-base font-bold text-gray-800 leading-tight">
              {t("periodicModal.title")}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded-lg transition-colors cursor-pointer"
            title={t("detailModal.closeButton")}
          >
            <X size={18} />
          </button>
        </div>
        <div className="bg-gray-50/70 border-b border-gray-200 p-3 sm:p-4 shrink-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-gray-700 ml-1">
                {t("periodicModal.filterTimeRange")}
              </span>
              <FilterPresetButtons
                presets={reportPeriodPresets}
                activeKey={periodPreset}
                onChange={setPeriodPreset}
                buttonClassName="px-3.5 py-1.5 rounded-pill text-xs"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 min-w-[170px]">
                <label className="text-xs font-bold text-gray-700 whitespace-nowrap">
                  {t("periodicModal.filterCategory")}
                </label>
                <SearchableSelect
                  options={categoryOptions}
                  value={selectedCategory}
                  onChange={setSelectedCategory}
                  placeholder={t("periodicModal.allCategories")}
                  searchPlaceholder={t("table.searchPlaceholder")}
                  noResultsText={t("table.noResults")}
                  getOptionLabel={(opt) => opt.name}
                  getOptionValue={(opt) => opt.id}
                  buttonClassName="py-1 px-2.5 text-xs rounded-lg bg-white border-gray-300"
                  className="w-40"
                />
              </div>
              {showBranch && (
                <div className="flex items-center gap-1.5 min-w-[170px]">
                  <label className="text-xs font-bold text-gray-700 whitespace-nowrap">
                    {t("deleteModal.branchLabel")}
                  </label>
                  <SearchableSelect
                    options={branchOptions}
                    value={selectedBranch}
                    onChange={setSelectedBranch}
                    placeholder={t("periodicModal.allBranches")}
                    searchPlaceholder={t("table.searchPlaceholder")}
                    noResultsText={t("table.noResults")}
                    getOptionLabel={(opt) => opt.name}
                    getOptionValue={(opt) => opt.id}
                    buttonClassName="py-1 px-2.5 text-xs rounded-lg bg-white border-gray-300"
                    className="w-44"
                  />
                </div>
              )}
              <button
                type="button"
                onClick={fetchReportHtml}
                disabled={isLoadingPreview}
                className="p-1.5 bg-white hover:bg-slate-800 hover:text-white text-gray-700 rounded-lg border border-gray-300 transition-colors cursor-pointer disabled:opacity-40 shadow-2xs"
                title={t("table.tooltipRefresh")}
              >
                <RotateCw
                  size={15}
                  className={isLoadingPreview ? "animate-spin text-slate-600" : ""}
                />
              </button>
            </div>
          </div>
          {isCustom && (
            <div className="pt-2 border-t border-gray-200 flex flex-wrap items-center gap-4 animate-in fade-in slide-in-from-top-1 duration-150">
              <span className="text-xs font-bold text-gray-700">
                {t("periodicModal.customRange")}
              </span>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600">
                  {t("periodicModal.fromDate")}
                </label>
                <div className="w-40">
                  <DatePicker
                    value={customStartDate}
                    onChange={setCustomStartDate}
                    calendar={persian}
                    locale={persian_af}
                    calendarPosition="bottom-right"
                    inputClass="w-full bg-white border border-gray-300 text-gray-800 text-xs px-2.5 py-1.5 rounded-lg text-center focus:outline-none focus:border-slate-800"
                    format="YYYY/MM/DD"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600">
                  {t("periodicModal.toDate")}
                </label>
                <div className="w-40">
                  <DatePicker
                    value={customEndDate}
                    onChange={setCustomEndDate}
                    calendar={persian}
                    locale={persian_af}
                    calendarPosition="bottom-right"
                    inputClass="w-full bg-white border border-gray-300 text-gray-800 text-xs px-2.5 py-1.5 rounded-lg text-center focus:outline-none focus:border-slate-800"
                    format="YYYY/MM/DD"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={fetchReportHtml}
                disabled={isLoadingPreview}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {t("periodicModal.applyRange")}
              </button>
            </div>
          )}
        </div>
        <div className="flex-1 bg-slate-100/90 p-4 sm:p-6 overflow-auto flex justify-center items-start relative">
          {isLoadingPreview ? (
            <div className="flex flex-col items-center justify-center text-gray-500 py-16 m-auto">
              <Loader2 size={32} className="animate-spin text-slate-800 mb-2" />
              <span className="text-sm font-bold text-gray-700">
                {t("periodicModal.loadingPreview")}
              </span>
            </div>
          ) : reportHtml ? (
            <div
              className="relative shrink-0 mx-auto shadow-2xl rounded-lg bg-white border border-gray-300 overflow-hidden"
              style={{
                width: `${PAGE_WIDTH_PX}px`,
                height: `${PAGE_HEIGHT_PX}px`,
                maxWidth: "100%",
              }}
            >
              <iframe
                ref={iframeRef}
                title={t("periodicModal.iframeTitle")}
                srcDoc={reportHtml.replace(
                  "<style>",
                  "<style>body{margin:0 auto !important;}",
                )}
                sandbox="allow-scripts allow-modals"
                className="w-full h-full bg-white border-none block"
              />
            </div>
          ) : (
            <div className="text-center py-16 text-gray-500 text-xs m-auto">
              {t("periodicModal.noPreview")}
            </div>
          )}
        </div>
        <div className="bg-white px-5 py-3 border-t border-gray-200 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={print}
              disabled={isLoadingPreview || !reportHtml}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Printer size={15} />
              <span>{t("pdfModal.printReportShort")}</span>
            </button>
            <button
              type="button"
              onClick={downloadPdf}
              disabled={isDownloading || isLoadingPreview}
              className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isDownloading ? (
                <Loader2 size={15} className="animate-spin text-amber-700" />
              ) : (
                <Download size={15} className="text-amber-700" />
              )}
              <span>
                {isDownloading
                  ? t("periodicModal.generatingPdf")
                  : t("periodicModal.downloadPdfBtn")}
              </span>
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-lg border border-gray-300 transition-colors cursor-pointer"
          >
            {t("detailModal.closeButton")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
