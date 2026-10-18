import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Layers, History, Search } from "lucide-react";
import { apiFetch, apiList } from "../api";
import { useBranch } from "../context/BranchContext";
import { formatAfghanDateTime } from "../utils/dateHelpers";
import { matchesDatePreset, todayReference } from "../utils/datePresets";
import { showToast } from "../utils/toast";
import useDebounce from "../hooks/useDebounce";
import {
  WarehouseHeader,
  WarehouseStockTable,
  WarehouseTransactionsTable,
  WarehouseExportModal,
  WarehouseImportModal,
  WarehouseReportModal,
} from "../components/warehouse";
const TX_PAGE_SIZE = 200;
const matchesText = (needle, ...haystacks) => {
  if (!needle) return true;
  const term = needle.toLowerCase();
  return haystacks.some((v) => String(v ?? "").toLowerCase().includes(term));
};
export default function WarehousePage() {
  const { t } = useTranslation("warehouse");
  const {
    selectedBranch: contextBranch,
    setSelectedBranch: setContextBranch,
    branches,
    isMultiBranch,
  } = useBranch();
  const [selectedBranch, setSelectedBranch] = useState(contextBranch || "all");
  const [isLoading, setIsLoading] = useState(false);
  const [inventoryData, setInventoryData] = useState([]);
  const [transactionsData, setTransactionsData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeTab, setActiveTab] = useState("stock");
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [txTypeFilter, setTxTypeFilter] = useState("all");
  const [txPeriodFilter, setTxPeriodFilter] = useState("today");
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [prefillProductId, setPrefillProductId] = useState(null);
  const requestIdRef = useRef(0);
  useEffect(() => {
    (async () => {
      try {
        const [cData, pData] = await Promise.all([
          apiList("/product-categories"),
          apiList("/products"),
        ]);
        setCategories(cData);
        setProducts(pData);
      } catch (err) {
        console.error("Error loading metadata:", err);
        showToast.error(t("messages.fetchBranchesError"));
      }
    })();
  }, []);
  const fetchBranchData = useCallback(async (branchId, silent = false) => {
    const requestId = ++requestIdRef.current;
    if (!silent) setIsLoading(true);
    const query = new URLSearchParams({
      branch_id: branchId && branchId !== "all" ? String(branchId) : "all",
      limit: String(TX_PAGE_SIZE),
    }).toString();
    try {
      const [invData, txData] = await Promise.all([
        apiList(`/inventories?${query}`),
        apiList(`/inventory-transactions?${query}`),
      ]);
      if (requestIdRef.current !== requestId) return;
      setInventoryData(invData);
      setTransactionsData(txData);
    } catch (err) {
      if (requestIdRef.current !== requestId) return;
      console.error("Error fetching branch inventory:", err);
      showToast.error(t("messages.fetchStockError"));
    } finally {
      if (requestIdRef.current === requestId) setIsLoading(false);
    }
  }, []);
  const showBranch = isMultiBranch;
  const effectiveBranch = showBranch
    ? selectedBranch
    : branches[0]
      ? String(branches[0].id)
      : "all";
  useEffect(() => {
    fetchBranchData(effectiveBranch);
  }, [effectiveBranch, fetchBranchData]);
  const handleSelectBranch = (branchId) => {
    setSelectedBranch(branchId);
    if (branchId !== "all") setContextBranch(branchId);
  };
  const isGlobal = !effectiveBranch || effectiveBranch === "all";
  const filteredInventory = useMemo(
    () =>
      inventoryData.filter((item) => {
        const matchSearch = matchesText(
          debouncedSearchTerm,
          item.product_name,
          item.category_name,
          item.weight,
        );
        const matchCategory =
          selectedCategoryFilter === "all" ||
          String(item.category_id) === String(selectedCategoryFilter);
        const matchStatus =
          statusFilter === "all" ||
          (statusFilter === "in_stock"
            ? Number(item.current_stock) > 0
            : item.status === statusFilter);
        return matchSearch && matchCategory && matchStatus;
      }),
    [inventoryData, debouncedSearchTerm, selectedCategoryFilter, statusFilter],
  );
  const filteredTransactions = useMemo(() => {
    if (!transactionsData.length) return [];
    const today = todayReference();
    return transactionsData.filter((tx) => {
      if (txTypeFilter !== "all" && tx.type !== txTypeFilter) return false;
      if (
        !matchesText(
          debouncedSearchTerm,
          tx.product?.name,
          tx.description,
          tx.source,
          tx.branch?.name,
        )
      ) {
        return false;
      }
      return matchesDatePreset(
        tx.created_at || tx.date || tx.transaction_date,
        txPeriodFilter,
        today,
      );
    });
  }, [transactionsData, txTypeFilter, debouncedSearchTerm, txPeriodFilter]);
  const openMoveModal = (setter) => (productId = null) => {
    setPrefillProductId(productId);
    setter(true);
  };
  const handleUpdateThreshold = async (productId, newThreshold) => {
    try {
      await apiFetch(`/products/${productId}`, {
        method: "PUT",
        body: { low_stock_threshold: newThreshold },
      });
      setInventoryData((prev) =>
        prev.map((item) => {
          if (item.product_id !== productId) return item;
          const stock = Number(item.current_stock) || 0;
          const status =
            stock <= 0
              ? "out_of_stock"
              : stock <= newThreshold
                ? "low_stock"
                : "normal";
          return { ...item, low_stock_threshold: newThreshold, status };
        }),
      );
      showToast.success(t("messages.thresholdUpdateSuccess"));
    } catch (err) {
      console.error("Error updating threshold:", err);
      showToast.error(err.message || t("messages.thresholdUpdateError"));
    }
  };
  const moveModalProps = {
    branches,
    showBranch,
    selectedBranch: effectiveBranch,
    inventoryData,
    categories,
    prefillProductId,
    onSuccess: () => fetchBranchData(effectiveBranch, true),
  };
  const tabClass = (key) =>
    `pb-3 px-2 text-btn-text font-bold flex items-center space-x-2 space-x-reverse transition-colors border-b-2 cursor-pointer ${
      activeTab === key
        ? "border-slate-800 text-slate-900"
        : "border-transparent text-gray-500 hover:text-gray-800"
    }`;
  return (
    <div className="w-full space-y-4 font-sans" dir="rtl">
      <WarehouseHeader
        branches={branches}
        showBranch={showBranch}
        selectedBranch={effectiveBranch}
        onSelectBranch={handleSelectBranch}
        onOpenExportModal={() => openMoveModal(setShowExportModal)()}
        onOpenImportModal={() => openMoveModal(setShowImportModal)()}
      />
      <div className="bg-white rounded-xl border border-gray-200 font-sans shadow-sm">
        <div className="border-b border-gray-200 px-6 pt-3 bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex space-x-4 space-x-reverse">
            <button
              type="button"
              onClick={() => setActiveTab("stock")}
              className={tabClass("stock")}
            >
              <Layers size={18} />
              <span>
                {isGlobal
                  ? t("tabs.stockGlobal")
                  : t("tabs.stockBranch")}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("transactions")}
              className={tabClass("transactions")}
            >
              <History size={18} />
              <span>{t("tabs.transactions")}</span>
            </button>
          </div>
          <div className="relative w-full sm:w-80 pb-3 sm:pb-0 mb-1">
            <input
              type="text"
              placeholder={t("tabs.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-gray-300 hover:border-gray-400 focus:border-slate-800 rounded-lg py-2 pr-9 pl-4 text-table-cell-text placeholder:text-placeholder-text text-gray-900 outline-none transition-colors"
            />
            <Search size={16} className="text-gray-400 absolute right-3 top-3" />
          </div>
        </div>
        {activeTab === "stock" ? (
          <WarehouseStockTable
            showBranch={showBranch}
            inventoryData={filteredInventory}
            categories={categories}
            isLoading={isLoading}
            isGlobal={isGlobal}
            selectedCategoryFilter={selectedCategoryFilter}
            onCategoryFilterChange={setSelectedCategoryFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            onOpenExportModal={openMoveModal(setShowExportModal)}
            onOpenImportModal={openMoveModal(setShowImportModal)}
            onUpdateThreshold={handleUpdateThreshold}
            onOpenReportModal={() => setShowReportModal(true)}
          />
        ) : (
          <WarehouseTransactionsTable
            showBranch={showBranch}
            transactionsData={filteredTransactions}
            isLoading={isLoading}
            isGlobal={isGlobal}
            txTypeFilter={txTypeFilter}
            onTxTypeFilterChange={setTxTypeFilter}
            txPeriodFilter={txPeriodFilter}
            onTxPeriodFilterChange={setTxPeriodFilter}
            formatShamsiDateTime={formatAfghanDateTime}
          />
        )}
      </div>
      <WarehouseExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        {...moveModalProps}
      />
      <WarehouseImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        {...moveModalProps}
      />
      <WarehouseReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        branches={branches}
        showBranch={showBranch}
        categories={categories}
        products={products}
        initialBranchId={effectiveBranch}
        initialCategoryId={selectedCategoryFilter}
      />
    </div>
  );
}
