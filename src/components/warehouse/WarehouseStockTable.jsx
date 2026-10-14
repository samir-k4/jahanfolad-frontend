import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { usePagePerms } from "../common";
import {
  Package,
  ArrowDownRight,
  Plus,
  Edit2,
  Check,
  X,
  FileText,
} from "lucide-react";
import { formatProductName } from "../../utils/productFormat";
import { TooltipButton, SearchableSelect, CustomDropdown, TablePagination } from "../common";
export default function WarehouseStockTable({
  showBranch = true,
  inventoryData = [],
  categories = [],
  isLoading = false,
  isGlobal = true,
  selectedCategoryFilter = "all",
  onCategoryFilterChange,
  statusFilter = "all",
  onStatusFilterChange,
  onOpenExportModal,
  onOpenImportModal,
  onUpdateThreshold,
  onOpenReportModal,
}) {
  const { t } = useTranslation("warehouse");
  const { canCreate, canEdit } = usePagePerms("warehouse");
  const [editingThresholdId, setEditingThresholdId] = useState(null);
  const [tempThresholdValue, setTempThresholdValue] = useState("");
  const [isSavingThreshold, setIsSavingThreshold] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategoryFilter, statusFilter]);
  const statusOptions = [
    { value: "all", label: t("filters.statusAll") },
    { value: "in_stock", label: t("filters.statusInStock") },
    { value: "low_stock", label: t("filters.statusLowStock") },
    { value: "out_of_stock", label: t("filters.statusOutOfStock") },
  ];
  const startEditing = (item) => {
    setEditingThresholdId(item.product_id);
    setTempThresholdValue(String(item.low_stock_threshold ?? ""));
  };
  const cancelEditing = () => {
    setEditingThresholdId(null);
    setTempThresholdValue("");
  };
  const handleSaveThreshold = async (productId) => {
    const val = Number(tempThresholdValue);
    if (isNaN(val) || val < 0) return;
    try {
      setIsSavingThreshold(true);
      await onUpdateThreshold?.(productId, val);
      setEditingThresholdId(null);
    } catch (err) {
      console.error("Failed to update threshold", err);
    } finally {
      setIsSavingThreshold(false);
    }
  };
  const categoryFilterOptions = useMemo(() => {
    const allCount = inventoryData.length;
    return [
      {
        id: "all",
        name: `${t("filters.categoryAll")} (${allCount})`,
      },
      ...categories.map((c) => {
        const count = inventoryData.filter(
          (i) => String(i.category_id) === String(c.id),
        ).length;
        return {
          id: String(c.id),
          name: `${c.name} (${count})`,
        };
      }),
    ];
  }, [categories, inventoryData]);
  const totalPages = Math.max(1, Math.ceil(inventoryData.length / perPage));
  const paginatedInventory = useMemo(() => {
    const page = Math.min(currentPage, totalPages);
    const start = (page - 1) * perPage;
    return inventoryData.slice(start, start + perPage);
  }, [inventoryData, currentPage, perPage, totalPages]);
  return (
    <div className="w-full font-sans rounded-b-xl">
      <div className="p-4 bg-white border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-20">
        <div className="flex items-center gap-2.5">
          <span className="text-label-text text-gray-700 font-bold whitespace-nowrap">
            {t("filters.categoryLabel")}
          </span>
          <SearchableSelect
            options={categoryFilterOptions}
            value={selectedCategoryFilter}
            onChange={(val) => onCategoryFilterChange(val || "all")}
            placeholder={t("filters.categoryAll")}
            searchPlaceholder={
              t("filters.categorySearchPlaceholder")
            }
            noResultsText={t("filters.categoryNoResults")}
            getOptionLabel={(c) => c.name}
            getOptionValue={(c) => c.id}
            buttonClassName="py-1.5 px-3 text-table-cell-text font-medium rounded-lg"
            className="w-52 sm:w-60"
          />
        </div>
        <div className="flex items-center flex-wrap gap-2.5 w-full sm:w-auto justify-start sm:justify-end">
          <div className="flex items-center space-x-2 space-x-reverse">
            <span className="text-label-text text-gray-700 font-bold whitespace-nowrap">
              {t("filters.statusLabel")}
            </span>
            <CustomDropdown
              options={statusOptions}
              value={statusFilter}
              onChange={(val) => onStatusFilterChange(val)}
              placeholder={t("filters.statusAll")}
              buttonClassName="px-3 py-1.5 text-table-cell-text font-medium rounded-lg"
              width="w-48"
              align="left"
            />
          </div>
          {onOpenReportModal && (
            <button
              type="button"
              onClick={onOpenReportModal}
              title={t("actions.stockReportTooltip")}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-btn-text rounded-lg font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <FileText size={16} className="text-amber-400" />
              <span>{t("actions.stockReport")}</span>
            </button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto bg-white min-h-[300px] rounded-b-xl">
        {isLoading ? (
          <div className="py-20 text-center text-gray-500 font-medium">
            <div className="w-8 h-8 border-2 border-slate-800 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-table-cell-text text-gray-600">
              {t("stock.loading")}
            </p>
          </div>
        ) : inventoryData.length === 0 ? (
          <div className="py-16 text-center text-gray-500 font-medium">
            <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 mx-auto mb-2 border border-gray-200 shadow-2xs">
              <Package size={24} />
            </div>
            <p className="font-bold text-gray-800 text-table-cell-text">
              {t("stock.emptyTitle")}
            </p>
          </div>
        ) : (
          <table className="w-full min-w-[1080px] text-right border-collapse bg-white">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-700 text-table-header-text font-bold">
                <th className="p-3.5 w-14 text-center border-l border-gray-200">
                  {t("stock.colIndex")}
                </th>
                <th className="p-3.5 w-[22%] border-l border-gray-200">
                  {t("stock.colProductName")}
                </th>
                <th className="p-3.5 border-l border-gray-200">
                  {t("stock.colCategory")}
                </th>
                <th className="p-3.5 text-center border-l border-gray-200">
                  {t("stock.colCartonWeight")}
                </th>
                <th className="p-3.5 text-center border-l border-gray-200">
                  {isGlobal
                    ? t("tabs.stockGlobal")
                    : t("tabs.stockBranch")}
                </th>
                {isGlobal && showBranch && (
                  <th className="p-3.5 border-l border-gray-200">
                    {t("stock.colBranchBreakdown")}
                  </th>
                )}
                <th className="p-3.5 text-center border-l border-gray-200">
                  {t("stock.colThreshold")}
                </th>
                <th className="p-3.5 text-center border-l border-gray-200">
                  {t("stock.colStatus")}
                </th>
                <th className="p-3.5 text-center w-36">
                  {t("stock.colActions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-table-cell-text bg-white">
              {paginatedInventory.map((item, idx) => {
                const formattedName = formatProductName(item.product_name);
                return (
                  <tr
                    key={item.product_id || idx}
                    className="hover:bg-gray-50/70 transition-colors border-b border-gray-100"
                  >
                    <td className="p-3.5 text-center text-gray-500 font-mono text-caption-text border-l border-gray-100">
                      {(Math.min(currentPage, totalPages) - 1) * perPage + idx + 1}
                    </td>
                    <td className="p-3.5 font-bold text-gray-900 border-l border-gray-100 whitespace-normal break-words">
                      <span className="inline-block">{formattedName}</span>
                    </td>
                    <td className="p-3.5 text-gray-700 font-medium border-l border-gray-100">
                      <span className="bg-gray-100 text-gray-800 px-2.5 py-0.5 rounded-md text-caption-text font-medium border border-gray-200">
                        {item.category_name}
                      </span>
                    </td>
                    <td
                      className="p-3.5 text-center text-gray-700 font-mono border-l border-gray-100"
                      dir="ltr"
                    >
                      {item.weight || "—"}
                    </td>
                    <td className="p-3.5 text-center border-l border-gray-100">
                      <span
                        className={`font-bold font-mono px-3 py-0.5 rounded-lg inline-block border ${
                          item.current_stock === 0
                            ? "bg-rose-50 text-rose-800 border-rose-200"
                            : item.status === "low_stock"
                              ? "bg-amber-50 text-amber-900 border-amber-200"
                              : "bg-emerald-50 text-emerald-800 border-emerald-200"
                        }`}
                        dir="ltr"
                      >
                        {Number(item.current_stock).toLocaleString("en-US")}
                      </span>
                    </td>
                    {isGlobal && showBranch && (
                      <td className="p-3.5 border-l border-gray-100">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {Array.isArray(item.branches) &&
                          item.branches.length > 0 ? (
                            item.branches.map((b) => (
                              <span
                                key={b.branch_id}
                                className={`text-caption-text px-2 py-0.5 rounded-lg border font-medium inline-flex items-center space-x-1 space-x-reverse ${
                                  b.stock > 0
                                    ? "bg-slate-50 text-slate-800 border-slate-200"
                                    : "bg-gray-50 text-gray-400 border-gray-200"
                                }`}
                              >
                                <span className="font-bold">
                                  {b.branch_name}:
                                </span>
                                <span className="font-mono font-bold" dir="ltr">
                                  {Number(b.stock).toLocaleString("en-US")}
                                </span>
                              </span>
                            ))
                          ) : (
                            <span className="text-caption-text text-gray-400">
                              —
                            </span>
                          )}
                        </div>
                      </td>
                    )}
                    <td className="p-3.5 text-center border-l border-gray-100">
                      {editingThresholdId === item.product_id ? (
                        <div
                          className="flex items-center justify-center space-x-1 space-x-reverse"
                          dir="ltr"
                        >
                          <input
                            type="number"
                            min="0"
                            dir="ltr"
                            onFocus={(e) => e.target.select()}
                            onWheel={(e) => e.target.blur()}
                            value={tempThresholdValue}
                            onChange={(e) =>
                              setTempThresholdValue(e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                handleSaveThreshold(item.product_id);
                              if (e.key === "Escape") cancelEditing();
                            }}
                            autoFocus
                            className="w-16 px-2 py-1 text-table-cell-text font-mono font-bold border-2 border-slate-800 rounded-lg outline-none text-center bg-white text-gray-900"
                          />
                          <button
                            onClick={() => handleSaveThreshold(item.product_id)}
                            disabled={isSavingThreshold}
                            className="p-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg cursor-pointer transition-colors shadow-2xs"
                            title={t("stock.saveThresholdTitle")}
                          >
                            <Check size={14} />
                          </button>
                          {canEdit && (
                            <button
                              onClick={cancelEditing}
                              className="p-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg cursor-pointer transition-colors shadow-2xs"
                              title={t("stock.cancelEditTitle")}
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <div
                          onClick={() => startEditing(item)}
                          className="group inline-flex items-center space-x-1 space-x-reverse cursor-pointer px-2.5 py-0.5 rounded-lg hover:bg-gray-100 transition-colors"
                          title={t("stock.editThresholdTitle")}
                        >
                          <span className="font-mono font-bold text-gray-700 text-table-cell-text">
                            {item.low_stock_threshold ?? 10}
                          </span>
                          <Edit2
                            size={13}
                            className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          />
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 text-center border-l border-gray-100">
                      {item.current_stock === 0 ? (
                        <span className="bg-rose-50 text-rose-800 text-caption-text px-2.5 py-0.5 rounded-lg font-bold border border-rose-200">
                          {t("stock.statusOutOfStock")}
                        </span>
                      ) : item.status === "low_stock" ? (
                        <span className="bg-amber-50 text-amber-900 text-caption-text px-2.5 py-0.5 rounded-lg font-bold border border-amber-200 animate-pulse">
                          {t("stock.statusLowStock")}
                        </span>
                      ) : (
                        <span className="bg-emerald-50 text-emerald-800 text-caption-text px-2.5 py-0.5 rounded-lg font-medium border border-emerald-200">
                          {t("stock.statusNormal")}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center space-x-1.5 space-x-reverse">
                        {canCreate && (
                          <TooltipButton
                            icon={<Plus size={15} />}
                            tooltip={t("stock.actionImportTooltip")}
                            onClick={() => onOpenImportModal?.(item.product_id)}
                            colorClass="text-emerald-700 bg-white hover:bg-emerald-50 border border-emerald-200 hover:border-emerald-300"
                          />
                        )}
                        <TooltipButton
                          icon={<ArrowDownRight size={15} />}
                          tooltip={
                            item.current_stock === 0
                              ? t("stock.statusOutOfStock")
                              : t("stock.actionExportTooltip")
                          }
                          onClick={() => onOpenExportModal?.(item.product_id)}
                          disabled={item.current_stock === 0}
                          colorClass="text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 hover:border-rose-300"
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {inventoryData.length > 0 && (
        <TablePagination
          currentPage={Math.min(currentPage, totalPages)}
          lastPage={totalPages}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          total={inventoryData.length}
          totalEntries={inventoryData.length}
          perPage={perPage}
          onPerPageChange={(newPerPage) => {
            setPerPage(newPerPage);
            setCurrentPage(1);
          }}
          unit={t("kpi.productUnit")}
        />
      )}
    </div>
  );
}
