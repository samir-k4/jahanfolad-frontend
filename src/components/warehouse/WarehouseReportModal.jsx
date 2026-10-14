import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
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
  Maximize2,
} from "lucide-react";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useReportPreview from "../../hooks/useReportPreview";
import { showToast } from "../../utils/toast";
import SearchableSelect from "../common/SearchableSelect";
import CustomDropdown from "../common/CustomDropdown";
import { formatProductOption } from "../../utils/productFormat";
const PAGE_WIDTH_PX = 1150;
const PAGE_HEIGHT_PX = 750;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 1.4;
const ZOOM_STEP = 0.1;
export default function WarehouseReportModal({
  isOpen,
  onClose,
  branches = [],
  showBranch = true,
  categories = [],
  products = [],
  initialBranchId = "all",
  initialCategoryId = "all",
}) {
  const { t } = useTranslation("warehouse");
  useBodyScrollLock(isOpen);
  const [selectedBranch, setSelectedBranch] = useState(initialBranchId || "all");
  const [selectedCategory, setSelectedCategory] = useState(initialCategoryId || "all");
  const [selectedProduct, setSelectedProduct] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [zoomScale, setZoomScale] = useState(1);
  useEffect(() => {
    if (!isOpen) return;
    setSelectedBranch(initialBranchId || "all");
    setSelectedCategory(initialCategoryId || "all");
    setSelectedProduct("all");
    setZoomScale(1);
  }, [isOpen, initialBranchId, initialCategoryId]);
  const filteredProductsList = useMemo(() => {
    if (!selectedCategory || selectedCategory === "all") return products;
    return products.filter(
      (p) => String(p.category_id ?? p.category?.id) === String(selectedCategory),
    );
  }, [products, selectedCategory]);
  const branchOptions = useMemo(
    () => [
      { id: "all", name: t("reportModal.filterAllBranches") },
      ...branches.map((b) => ({ id: b.id, name: b.name })),
    ],
    [branches],
  );
  const categoryOptions = useMemo(
    () => [
      { id: "all", name: t("reportModal.filterAllCategories") },
      ...categories.map((c) => ({ id: c.id, name: c.name })),
    ],
    [categories],
  );
  const productOptions = useMemo(
    () => [
      { id: "all", name: t("reportModal.filterAllProducts") },
      ...filteredProductsList.map((p) => ({ id: p.id, name: formatProductOption(p) })),
    ],
    [filteredProductsList],
  );
  const statusOptions = useMemo(
    () => [
      { value: "all", label: t("filters.statusAll") },
      { value: "in_stock", label: t("filters.statusInStock") },
      { value: "low_stock", label: t("filters.statusLowStock") },
      { value: "out_of_stock", label: t("filters.statusOutOfStock") },
    ],
    [],
  );
  const buildPayload = useCallback(
    () => ({
      branch_id: selectedBranch,
      category_id: selectedCategory,
      product_id: selectedProduct,
      status: selectedStatus,
    }),
    [selectedBranch, selectedCategory, selectedProduct, selectedStatus],
  );
  const fallbackFilename = useCallback(
    () =>
      `${t("reportModal.filenamePrefix")}_${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`,
    [],
  );
  const onError = useCallback((err) => {
    console.error("Warehouse stock report error:", err);
    showToast.error(t("messages.pdfLoadError"));
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
    htmlPath: "/warehouse-reports/stock-html",
    pdfPath: "/warehouse-reports/stock-pdf",
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
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs font-sans"
      dir="rtl"
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-gray-200">
        <div className="bg-white px-5 py-3.5 flex justify-between items-center shrink-0 border-b border-gray-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shadow-2xs">
              <FileText size={18} />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
              {t("reportModal.title")}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded-lg transition-colors cursor-pointer"
            title={t("reportModal.tooltipClose")}
          >
            <X size={18} />
          </button>
        </div>
        <div className="bg-gray-50/70 border-b border-gray-200 p-3 sm:p-4 shrink-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {showBranch && (
                <div className="flex items-center gap-1.5 min-w-[170px]">
                  <label className="text-xs font-bold text-gray-700 whitespace-nowrap">
                    {t("reportModal.filterBranch")}
                  </label>
                  <SearchableSelect
                    options={branchOptions}
                    value={selectedBranch}
                    onChange={setSelectedBranch}
                    placeholder={t("reportModal.filterAllBranches")}
                    searchPlaceholder={t("tabs.searchPlaceholder")}
                    noResultsText={t("common.noResults")}
                    getOptionLabel={(opt) => opt.name}
                    getOptionValue={(opt) => opt.id}
                    buttonClassName="py-1 px-2.5 text-xs rounded-lg bg-white border-gray-300"
                    className="w-44"
                  />
                </div>
              )}
              <div className="flex items-center gap-1.5 min-w-[170px]">
                <label className="text-xs font-bold text-gray-700 whitespace-nowrap">
                  {t("filters.categoryLabel")}
                </label>
                <SearchableSelect
                  options={categoryOptions}
                  value={selectedCategory}
                  onChange={(val) => {
                    setSelectedCategory(val);
                    setSelectedProduct("all");
                  }}
                  placeholder={t("reportModal.filterAllCategories")}
                  searchPlaceholder={t("tabs.searchPlaceholder")}
                  noResultsText={t("common.noResults")}
                  getOptionLabel={(opt) => opt.name}
                  getOptionValue={(opt) => opt.id}
                  buttonClassName="py-1 px-2.5 text-xs rounded-lg bg-white border-gray-300"
                  className="w-40"
                />
              </div>
              <div className="flex items-center gap-1.5 min-w-[170px]">
                <label className="text-xs font-bold text-gray-700 whitespace-nowrap">
                  {t("reportModal.filterProduct")}
                </label>
                <SearchableSelect
                  options={productOptions}
                  value={selectedProduct}
                  onChange={setSelectedProduct}
                  placeholder={t("reportModal.filterAllProducts")}
                  searchPlaceholder={t("tabs.searchPlaceholder")}
                  noResultsText={t("common.noResults")}
                  getOptionLabel={(opt) => opt.name}
                  getOptionValue={(opt) => opt.id}
                  buttonClassName="py-1 px-2.5 text-xs rounded-lg bg-white border-gray-300"
                  className="w-44"
                />
              </div>
              <div className="flex items-center gap-1.5 min-w-[170px]">
                <label className="text-xs font-bold text-gray-700 whitespace-nowrap">
                  {t("reportModal.filterStatus")}
                </label>
                <CustomDropdown
                  options={statusOptions}
                  value={selectedStatus}
                  onChange={setSelectedStatus}
                  placeholder={t("filters.statusAll")}
                  buttonClassName="py-1 px-2.5 text-xs rounded-lg bg-white border-gray-300"
                  width="w-44"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchReportHtml}
                disabled={isLoadingPreview}
                title={t("reportModal.tooltipReload")}
                className="p-1.5 bg-white hover:bg-slate-800 hover:text-white text-gray-700 rounded-lg border border-gray-300 transition-colors cursor-pointer disabled:opacity-40 shadow-2xs"
              >
                <RotateCw
                  size={15}
                  className={isLoadingPreview ? "animate-spin text-slate-600" : ""}
                />
              </button>
              <div className="h-4 w-px bg-gray-300 mx-0.5" />
              <div className="flex items-center rounded-lg border border-gray-300 bg-white overflow-hidden shadow-2xs">
                <button
                  type="button"
                  onClick={() => zoomBy(-ZOOM_STEP)}
                  disabled={zoomScale <= ZOOM_MIN}
                  title={t("pdf.zoomOut", { ns: "common" })}
                  className="p-1.5 hover:bg-gray-100 text-gray-700 disabled:opacity-30 cursor-pointer transition-colors"
                >
                  <ZoomOut size={14} />
                </button>
                <span className="text-xs px-2.5 font-mono font-medium text-gray-600 border-x border-gray-200 select-none">
                  {Math.round(zoomScale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => zoomBy(ZOOM_STEP)}
                  disabled={zoomScale >= ZOOM_MAX}
                  title={t("pdf.zoomIn", { ns: "common" })}
                  className="p-1.5 hover:bg-gray-100 text-gray-700 disabled:opacity-30 cursor-pointer transition-colors"
                >
                  <ZoomIn size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomScale(1)}
                  title={t("pdf.zoomReset", { ns: "common" })}
                  className="p-1.5 hover:bg-gray-100 text-gray-700 border-r border-gray-200 cursor-pointer transition-colors"
                >
                  <Maximize2 size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 bg-slate-100/90 p-4 sm:p-6 overflow-auto flex justify-center items-start relative">
          {isLoadingPreview ? (
            <div className="flex flex-col items-center justify-center text-gray-500 py-16 m-auto">
              <Loader2 size={32} className="animate-spin text-slate-800 mb-2" />
              <span className="text-sm font-bold text-gray-700">
                {t("reportModal.loadingPreview")}
              </span>
            </div>
          ) : reportHtml ? (
            <div
              className="relative shrink-0 mx-auto transition-transform duration-200 shadow-2xl rounded-lg bg-white border border-gray-300 overflow-hidden"
              style={{
                transform: `scale(${zoomScale})`,
                transformOrigin: "top center",
                width: `${PAGE_WIDTH_PX}px`,
                maxWidth: "100%",
              }}
            >
              <iframe
                ref={iframeRef}
                title={t("reportModal.iframeTitle")}
                srcDoc={reportHtml.replace(
                  "<style>",
                  "<style>body{margin:0 auto !important;}",
                )}
                sandbox="allow-scripts allow-modals"
                className="w-full bg-white border-none block"
                style={{ height: `${PAGE_HEIGHT_PX}px` }}
              />
            </div>
          ) : (
            <div className="text-center py-16 text-gray-500 text-xs m-auto">
              {t("reportModal.errorDescription")}
            </div>
          )}
        </div>
        <div className="bg-white px-5 py-3.5 border-t border-gray-200 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={print}
              disabled={isLoadingPreview || !reportHtml}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Printer size={15} />
              <span>{t("reportModal.printButton")}</span>
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
                  ? t("reportModal.generatingButton")
                  : t("reportModal.downloadButton")}
              </span>
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-lg border border-gray-300 transition-colors cursor-pointer"
          >
            {t("actions.close", { ns: "common" })}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
