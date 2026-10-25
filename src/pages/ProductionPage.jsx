import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ApiError, apiFetch, apiList } from "../api";
import { useBranch } from "../context/BranchContext";
import { showToast } from "../utils/toast";
import {
  formatToGregorian,
  getTodayAfghan,
  toAfghanDate,
  formatAfghanDisplay,
} from "../utils/dateHelpers";
import { matchesDatePreset, todayReference } from "../utils/datePresets";
import { getBatchLogs } from "../utils/batchHelpers";
import {
  ProductionEntryForm,
  ProductionBatchesTable,
  ProductionDetailModal,
  ProductionDeleteModal,
  ProductionSuccessModal,
  ProductionPdfModal,
  PeriodicProductionReportModal,
} from "../components/production";
const emptyRow = (id) => ({
  id,
  category: "",
  product: null,
  weight: "",
  quantity: "",
});
export default function ProductionPage() {
  const { t } = useTranslation("production");
  const [globalData, setGlobalData] = useState({
    date: "",
    branch: "",
    description: "",
  });
  const [selectedDay, setSelectedDay] = useState(null);
  const { branches, isMultiBranch } = useBranch();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [productionRows, setProductionRows] = useState([emptyRow(1)]);
  const [isSaving, setIsSaving] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [savedBatchResult, setSavedBatchResult] = useState(null);
  const [batches, setBatches] = useState([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState("today");
  const [selectedBatchForDetail, setSelectedBatchForDetail] = useState(null);
  const [batchToDelete, setBatchToDelete] = useState(null);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfModalData, setPdfModalData] = useState(null);
  const [pdfBranchName, setPdfBranchName] = useState("");
  const [pdfDateString, setPdfDateString] = useState("");
  const [showPeriodicReportModal, setShowPeriodicReportModal] = useState(false);
  const nextRowId = useRef(2);
  const makeRowId = () => nextRowId.current++;
  const fetchBatchesList = useCallback(async () => {
    try {
      setIsLoadingBatches(true);
      setBatches(await apiList("/production-batches"));
    } catch (err) {
      console.error("Failed to fetch production batches:", err);
      showToast.error(t("messages.fetchInitialError"));
    } finally {
      setIsLoadingBatches(false);
    }
  }, []);
  useEffect(() => {
    setGlobalData((prev) => ({ ...prev, date: formatToGregorian(new Date()) }));
    setSelectedDay(getTodayAfghan());
    fetchBatchesList();
    (async () => {
      try {
        const [categoriesData, productsData] = await Promise.all([
          apiList("/product-categories"),
          apiList("/products"),
        ]);
        setCategories(categoriesData);
        setProducts(productsData);
      } catch (error) {
        console.error("Failed to fetch data:", error);
        showToast.error(t("messages.fetchInitialError"));
      }
    })();
  }, [fetchBatchesList]);
  const filteredBatches = useMemo(() => {
    if (!batches.length || filterPeriod === "all") return batches;
    const today = todayReference();
    return batches.filter((b) => matchesDatePreset(b.date, filterPeriod, today));
  }, [batches, filterPeriod]);
  const handleDateChange = (date) => {
    setSelectedDay(date || null);
    setGlobalData((prev) => ({
      ...prev,
      date: date ? formatToGregorian(date) : "",
    }));
  };
  const addRow = () =>
    setProductionRows((prev) => [...prev, emptyRow(makeRowId())]);
  const removeRow = (idToRemove) =>
    setProductionRows((prev) =>
      prev.length === 1 ? prev : prev.filter((r) => r.id !== idToRemove),
    );
  const updateRow = (id, field, value) =>
    setProductionRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );
  useEffect(() => {
    if (branches.length === 1) {
      setGlobalData((prev) => ({ ...prev, branch: prev.branch || branches[0].id }));
    }
  }, [branches]);
  const resetForm = () => {
    setGlobalData({
      date: formatToGregorian(new Date()),
      branch: branches.length === 1 ? branches[0].id : "",
      description: "",
    });
    setSelectedDay(getTodayAfghan());
    setProductionRows([emptyRow(makeRowId())]);
  };
  const branchNameOf = useCallback(
    (branchId) =>
      branches.find((b) => String(b.id) === String(branchId))?.name || "",
    [branches],
  );
  const handleStartEditBatch = (batch) => {
    setEditingBatch(batch);
    const batchDate = batch.date
      ? String(batch.date).slice(0, 10)
      : formatToGregorian(new Date());
    setGlobalData({
      branch: batch.branch_id || batch.branch?.id || "",
      date: batchDate,
      description: batch.description || "",
    });
    setSelectedDay(toAfghanDate(batchDate));
    const rows = getBatchLogs(batch).map((log) => ({
      id: makeRowId(),
      category: log.product?.category_id || log.product?.category?.id || "",
      product: log.product,
      weight:
        log.weight_kg !== null && log.weight_kg !== undefined
          ? `${Number(log.weight_kg)}KG`
          : String(log.product?.weight || ""),
      quantity: log.quantity,
    }));
    setProductionRows(rows.length ? rows : [emptyRow(makeRowId())]);
    window.scrollTo({ top: 0, behavior: "smooth" });
    showToast.info(t("messages.loadBatchForEdit", { batchId: batch.id }));
  };
  const handleCancelEdit = () => {
    setEditingBatch(null);
    resetForm();
    showToast.info(t("messages.editCancelled"));
  };
  const handleConfirmDelete = () => {
    if (!batchToDelete) return;
    const target = batchToDelete;
    setBatchToDelete(null);
    setBatches((prev) => prev.filter((b) => b.id !== target.id));
    showToast.undo(t("messages.deleteBatchUndo", { batchId: target.id }), {
      duration: 4000,
      onUndo: () => {
        fetchBatchesList();
        showToast.info(t("messages.deleteBatchCancelled", { batchId: target.id }));
      },
      onConfirm: async () => {
        try {
          await apiFetch(`/production-batches/${target.id}`, {
            method: "DELETE",
          });
        } catch (err) {
          console.error("Delete error:", err);
          showToast.error(t("messages.deleteBatchError"));
        } finally {
          fetchBatchesList();
        }
      },
    });
  };
  const handleOpenBatchReport = (batch) => {
    setPdfModalData(batch);
    setPdfBranchName(batch.branch?.name || "");
    setPdfDateString(String(batch.date || "").slice(0, 10));
    setShowPdfModal(true);
  };
  const handleGeneratePdf = () => {
    const validRows = productionRows.filter(
      (r) => r.product && Number(r.quantity) > 0,
    );
    if (!validRows.length) {
      showToast.error(t("messages.noValidProductsForPdf"));
      return;
    }
    setPdfModalData({
      products: validRows.map((row) => ({
        product_id: row.product.id,
        weight: row.weight || row.product?.weight,
        quantity: Number(row.quantity),
      })),
      date: globalData.date,
      branch_id: globalData.branch || null,
      description: globalData.description,
      batch: savedBatchResult?.batch,
    });
    setPdfBranchName(branchNameOf(globalData.branch));
    setPdfDateString(globalData.date);
    setShowPdfModal(true);
  };
  const validateForm = () => {
    if (!globalData.date) return t("messages.selectDate");
    if (isMultiBranch && !globalData.branch) return t("messages.selectBranch");
    if (!productionRows.length) return t("messages.addAtLeastOneRow");
    for (const [i, row] of productionRows.entries()) {
      const rowNum = i + 1;
      if (!row.category) return t("messages.selectCategory", { rowNum });
      if (!row.product) return t("messages.selectProduct", { rowNum });
      if (!row.weight) return t("messages.specifyWeight", { rowNum });
      if (!Number.isInteger(Number(row.quantity)) || Number(row.quantity) <= 0) {
        return t("messages.invalidQuantity", { rowNum });
      }
    }
    return null;
  };
  const handleSaveAll = async () => {
    if (isSaving) return;
    const error = validateForm();
    if (error) {
      showToast.error(error);
      return;
    }
    const payload = {
      date: globalData.date,
      branch_id: globalData.branch || null,
      description: globalData.description?.trim() || "",
      products: productionRows.map((row) => ({
        product_id: row.product.id,
        weight: String(row.weight),
        quantity: Number(row.quantity),
      })),
    };
    const isEditing = Boolean(editingBatch);
    try {
      setIsSaving(true);
      const result = await apiFetch(
        isEditing ? `/production-batches/${editingBatch.id}` : "/productions",
        { method: isEditing ? "PUT" : "POST", body: payload },
      );
      fetchBatchesList();
      if (isEditing) {
        setEditingBatch(null);
        resetForm();
        showToast.success(
          t("messages.batchEditSuccess"),
        );
        return;
      }
      setSavedBatchResult({
        data: result?.data || payload.products,
        batch: result?.batch,
        branchName: branchNameOf(globalData.branch),
        dateFormatted: formatAfghanDisplay(selectedDay) || globalData.date,
      });
      setShowSuccessModal(true);
    } catch (err) {
      if (err instanceof ApiError) {
        showToast.error(
          err.status === 422
            ? t("messages.validationError")
            : t("messages.saveError"),
        );
      } else {
        showToast.error(
          navigator.onLine
            ? t("messages.serverConnectionError")
            : t("messages.networkOfflineError"),
        );
      }
    } finally {
      setIsSaving(false);
    }
  };
  const showBranch = isMultiBranch;
  return (
    <div className="w-full space-y-4 font-sans" dir="rtl">
      <ProductionEntryForm
        showBranch={showBranch}
        globalData={globalData}
        setGlobalData={setGlobalData}
        selectedDay={selectedDay}
        onDateChange={handleDateChange}
        branches={branches}
        categories={categories}
        products={products}
        productionRows={productionRows}
        addRow={addRow}
        removeRow={removeRow}
        updateRow={updateRow}
        handleSaveAll={handleSaveAll}
        isSaving={isSaving}
        editingBatch={editingBatch}
        handleCancelEdit={handleCancelEdit}
        handleGeneratePdf={handleGeneratePdf}
      />
      <ProductionBatchesTable
        showBranch={showBranch}
        batches={filteredBatches}
        filterPeriod={filterPeriod}
        setFilterPeriod={setFilterPeriod}
        isLoadingBatches={isLoadingBatches}
        onRefresh={fetchBatchesList}
        onOpenDetail={setSelectedBatchForDetail}
        onStartEdit={handleStartEditBatch}
        onOpenReport={handleOpenBatchReport}
        onOpenDelete={setBatchToDelete}
        onOpenHeaderReport={() => setShowPeriodicReportModal(true)}
      />
      <ProductionDetailModal
        showBranch={showBranch}
        isOpen={Boolean(selectedBatchForDetail)}
        onClose={() => setSelectedBatchForDetail(null)}
        batch={selectedBatchForDetail}
        onPrintReport={handleOpenBatchReport}
      />
      <ProductionDeleteModal
        showBranch={showBranch}
        isOpen={Boolean(batchToDelete)}
        onClose={() => setBatchToDelete(null)}
        batch={batchToDelete}
        onConfirm={handleConfirmDelete}
      />
      <ProductionSuccessModal
        showBranch={showBranch}
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          resetForm();
        }}
        result={savedBatchResult}
        onPrintReport={handleGeneratePdf}
      />
      <ProductionPdfModal
        isOpen={showPdfModal}
        onClose={() => setShowPdfModal(false)}
        dailyData={pdfModalData}
        branchName={pdfBranchName || branchNameOf(globalData.branch)}
        dateString={pdfDateString || globalData.date}
      />
      <PeriodicProductionReportModal
        showBranch={showBranch}
        isOpen={showPeriodicReportModal}
        onClose={() => setShowPeriodicReportModal(false)}
        categories={categories}
        branches={branches}
      />
    </div>
  );
}
