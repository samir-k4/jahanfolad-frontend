import { useCallback, useMemo, useState } from "react";
import DatePicker from "react-multi-date-picker";
import { persian, persian_af, formatToGregorian } from "../../utils/dateHelpers";
import {
  REPORT_PERIOD_PRESET_KEYS,
  buildPresets,
  getDatePresetRange,
} from "../../utils/datePresets";
import useReportPreview from "../../hooks/useReportPreview";
import { showToast } from "../../utils/toast";
import SearchableSelect from "../common/SearchableSelect";
import FilterPresetButtons from "../common/FilterPresetButtons";
import { useTranslation } from "react-i18next";
import ProductionReportPreviewModal from "./ProductionReportPreviewModal";

const PAGE_WIDTH_PX = 794;
const PAGE_HEIGHT_PX = 1122.5;

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
    [t],
  );
  const onError = useCallback(
    (err) => {
      console.error("Periodic production report error:", err);
      showToast.error(t("periodicModal.pdfDownloadError"));
    },
    [t],
  );
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
    [categories, t],
  );
  const branchOptions = useMemo(
    () => [
      { id: "all", name: t("periodicModal.allBranches") },
      ...branches.map((b) => ({ id: b.id, name: b.name })),
    ],
    [branches, t],
  );
  const controls = (
    <div className="w-full space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-gray-700 ml-1">
            {t("periodicModal.filterTimeRange")}
          </span>
          <FilterPresetButtons
            presets={reportPeriodPresets}
            activeKey={periodPreset}
            onChange={setPeriodPreset}
            buttonClassName="px-3.5 py-1.5 rounded-btn text-xs"
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
  );

  return (
    <ProductionReportPreviewModal
      isOpen={isOpen}
      onClose={onClose}
      closeLabel={t("detailModal.closeButton")}
      refreshTitle={t("table.tooltipRefresh")}
      title={t("periodicModal.title")}
      loadingText={t("periodicModal.loadingPreview")}
      noPreviewText={t("periodicModal.noPreview")}
      iframeTitle={t("periodicModal.iframeTitle")}
      reportHtml={reportHtml}
      iframeRef={iframeRef}
      isLoadingPreview={isLoadingPreview}
      isDownloading={isDownloading}
      onRefresh={fetchReportHtml}
      onPrint={print}
      onDownload={downloadPdf}
      printLabel={t("pdfModal.printReportShort")}
      downloadLabel={t("periodicModal.downloadPdfBtn")}
      generatingLabel={t("periodicModal.generatingPdf")}
      pageWidthPx={PAGE_WIDTH_PX}
      pageHeightPx={PAGE_HEIGHT_PX}
      controls={controls}
    />
  );
}
