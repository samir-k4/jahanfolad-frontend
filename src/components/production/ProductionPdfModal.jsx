import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useMemo, useState } from "react";
import useReportPreview from "../../hooks/useReportPreview";
import { getBatchLogs } from "../../utils/batchHelpers";
import { showToast } from "../../utils/toast";
import SearchableSelect from "../common/SearchableSelect";
import ProductionReportPreviewModal from "./ProductionReportPreviewModal";

const PAGE_WIDTH_PX = 794;
const PAGE_HEIGHT_PX = 560;

export default function ProductionPdfModal({
  isOpen,
  onClose,
  dailyData,
  branchName,
  dateString,
  products = [],
}) {
  const { t } = useTranslation("production");
  const [selectedProduct, setSelectedProduct] = useState("all");
  const rawItems = useMemo(
    () =>
      Array.isArray(dailyData?.products)
        ? dailyData.products
        : Array.isArray(dailyData)
          ? dailyData
          : getBatchLogs(dailyData),
    [dailyData],
  );
  const productOptions = useMemo(() => {
    const availableProducts = new Map();
    rawItems.forEach((item) => {
      const productId = item.product_id || item.product?.id;
      if (!productId) return;
      const product =
        item.product ||
        products.find((candidate) => String(candidate.id) === String(productId));
      availableProducts.set(String(productId), {
        id: String(productId),
        name: product?.name || item.name || String(productId),
      });
    });
    return [
      { id: "all", name: t("pdfModal.allProducts") },
      ...availableProducts.values(),
    ];
  }, [products, rawItems, t]);
  useEffect(() => {
    if (isOpen) setSelectedProduct("all");
  }, [dailyData, isOpen]);
  const buildPayload = useCallback(() => {
    return {
      batch_id: dailyData?.batch?.id || dailyData?.id || null,
      branch_id:
        dailyData?.branch_id || dailyData?.branch?.id || dailyData?.branch || null,
      date:
        dailyData?.date || dateString || new Date().toISOString().slice(0, 10),
      description: dailyData?.description || "",
      product_id: selectedProduct,
      products: rawItems.map((item) => ({
        product_id: item.product_id || item.product?.id,
        quantity:
          item.product?.weight_type === "variable" ? null : Number(item.quantity) || 0,
        weight: item.weight ?? item.weight_kg ?? item.product?.weight,
        total_weight_kg: item.total_weight_kg ?? null,
      })),
    };
  }, [dailyData, dateString, rawItems, selectedProduct]);
  const fallbackFilename = useCallback(() => {
    const branch = (branchName || "report").replace(/\s+/g, "_");
    const date = (dateString || "date").replace(/[/-]/g, "-");
    return `${t("pdfModal.filenamePrefix")}_${branch}_${date}.pdf`;
  }, [branchName, dateString, t]);
  const onError = useCallback(
    (err) => {
      console.error("Production report error:", err);
      showToast.error(t("pdfModal.errorDescription"));
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
    htmlPath: "/production-reports/daily-html",
    pdfPath: "/production-reports/daily-pdf",
    buildPayload,
    fallbackFilename,
    onError,
  });
  const controls = (
    <div className="flex items-center gap-2 min-w-[220px]">
      <label className="text-xs font-bold text-gray-700 whitespace-nowrap">
        {t("pdfModal.productFilterLabel")}
      </label>
      <SearchableSelect
        options={productOptions}
        value={selectedProduct}
        onChange={setSelectedProduct}
        placeholder={t("pdfModal.allProducts")}
        searchPlaceholder={t("table.searchPlaceholder")}
        noResultsText={t("table.noResults")}
        getOptionLabel={(option) => option.name}
        getOptionValue={(option) => option.id}
        buttonClassName="py-1.5 px-2.5 text-xs rounded-lg bg-white border-gray-300"
        className="w-56"
      />
    </div>
  );

  return (
    <ProductionReportPreviewModal
      isOpen={isOpen}
      onClose={onClose}
      closeLabel={t("detailModal.closeButton")}
      refreshTitle={t("pdf.reload", { ns: "common" })}
      title={t("pdfModal.title")}
      loadingText={t("pdfModal.loadingPreview")}
      noPreviewText={t("periodicModal.noPreview")}
      iframeTitle={t("pdfModal.iframeTitle")}
      reportHtml={reportHtml}
      iframeRef={iframeRef}
      isLoadingPreview={isLoadingPreview}
      isDownloading={isDownloading}
      onRefresh={fetchReportHtml}
      onPrint={print}
      onDownload={downloadPdf}
      printLabel={t("pdfModal.printReportShort")}
      downloadLabel={t("pdfModal.downloadButton")}
      generatingLabel={t("pdfModal.generatingButton")}
      pageWidthPx={PAGE_WIDTH_PX}
      pageHeightPx={PAGE_HEIGHT_PX}
      controls={controls}
    />
  );
}
