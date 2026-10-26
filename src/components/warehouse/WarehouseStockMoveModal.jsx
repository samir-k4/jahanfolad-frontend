import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowDownRight,
  ArrowUpRight,
  X,
  Plus,
  Trash2,
  RefreshCw,
  Building2,
} from "lucide-react";
import { apiFetch } from "../../api";
import { formatProductName, formatProductOption, showToast } from "../../utils";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import { SearchableSelect } from "../common";
import TooltipButton from "../common/TooltipButton";
const MODES = {
  export: {
    tKey: "exportModal",
    path: "/inventories/export",
    branchLabelKey: "sourceBranchLabel",
    icon: ArrowDownRight,
    iconClass: "bg-rose-50 text-rose-600 border-rose-200",
    missingBranchMessage: "selectSourceBranch",
    successMessage: "exportSuccess",
    errorMessage: "exportError",
    checksStock: true,
  },
  import: {
    tKey: "importModal",
    path: "/inventories/import",
    branchLabelKey: "destBranchLabel",
    icon: ArrowUpRight,
    iconClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    missingBranchMessage: "selectDestBranch",
    successMessage: "importSuccess",
    errorMessage: "importError",
    checksStock: false,
  },
};
function availableStockOf(invItem, branchId) {
  if (!invItem) return 0;
  if (Array.isArray(invItem.branches) && branchId && branchId !== "all") {
    const row = invItem.branches.find(
      (b) => String(b.branch_id) === String(branchId),
    );
    return row ? Number(row.stock) || 0 : 0;
  }
  return Number(invItem.current_stock) || 0;
}
function BranchSection({ label, isGlobal, branchId, setBranchId, branches, activeBranchName }) {
  const { t } = useTranslation("warehouse");
  return (
    <div className="bg-gray-50 border border-gray-200 p-3.5 rounded-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div className="flex items-center space-x-2 space-x-reverse">
        <Building2 size={18} className="text-slate-700" />
        <span className="font-bold text-gray-800 text-label-text">{label}</span>
      </div>
      {isGlobal ? (
        <SearchableSelect
          options={branches}
          value={String(branchId)}
          onChange={setBranchId}
          placeholder={t("common.branchSelectPlaceholder")}
          searchPlaceholder={t("common.branchSearchPlaceholder")}
          noResultsText={t("common.noResults")}
          getOptionLabel={(b) => b.name}
          getOptionValue={(b) => String(b.id)}
          usePortal
          buttonClassName="bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-900 outline-none hover:border-gray-400 cursor-pointer shadow-xs min-w-[180px]"
        />
      ) : (
        <span className="bg-white border border-gray-200 px-3 py-1 text-table-cell-text font-bold text-slate-900 rounded-badge shadow-xs">
          {activeBranchName}
        </span>
      )}
    </div>
  );
}
function MoveRowItem({
  row,
  index,
  label,
  categories,
  inventoryData,
  targetBranchId,
  showStock,
  updateRow,
  removeRow,
  canRemove,
}) {
  const { t } = useTranslation("warehouse");
  const categoryOptions = useMemo(
    () => [{ id: "all", name: label("allCategories") }, ...categories],
    [categories, label],
  );
  const rowProducts = useMemo(
    () =>
      inventoryData.filter(
        (inv) =>
          !row.category_id ||
          row.category_id === "all" ||
          String(inv.category_id) === String(row.category_id),
      ),
    [inventoryData, row.category_id],
  );
  const selectedInvItem = useMemo(
    () =>
      inventoryData.find((inv) => String(inv.product_id) === String(row.product_id)),
    [inventoryData, row.product_id],
  );
  const availableStock = availableStockOf(selectedInvItem, targetBranchId);
  const isVariable = selectedInvItem?.weight_type === "variable";
  return (
    <div className="p-3 bg-gray-50/70 border border-gray-200 rounded-card flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
      <span className="font-mono text-gray-400 text-caption-text w-6 text-center shrink-0 hidden md:block">
        {index + 1}
      </span>
      <div className="w-full md:w-48 shrink-0">
        <SearchableSelect
          options={categoryOptions}
          value={row.category_id || "all"}
          onChange={(val) => updateRow(row.id, "category_id", val)}
          placeholder={label("allCategories")}
          searchPlaceholder={label("categorySearchPlaceholder")}
          noResultsText={label("categoryNoResults")}
          getOptionLabel={(c) => c.name}
          getOptionValue={(c) => c.id}
          buttonClassName="py-2 px-2.5 text-table-cell-text font-medium rounded-input"
        />
      </div>
      <div className="flex-1 min-w-[200px]">
        <SearchableSelect
          options={rowProducts}
          value={row.product_id}
          onChange={(val) => updateRow(row.id, "product_id", val)}
          placeholder={label("selectProduct")}
          searchPlaceholder={label("productSearchPlaceholder")}
          noResultsText={label("productNoResults")}
          getOptionLabel={(inv) => formatProductOption(inv)}
          getOptionValue={(inv) => inv.product_id}
          buttonClassName="py-2 px-2.5 text-table-cell-text font-medium rounded-input"
        />
        <div className="mt-1 px-2 text-caption-text text-gray-600 font-mono">
          {selectedInvItem?.weight_type === "variable"
            ? "وزن متغیر"
            : `${t("stock.colCartonWeight")}: ${selectedInvItem?.weight || "—"}`}
        </div>
      </div>
      <div className="w-full md:w-48 shrink-0 flex items-center space-x-2 space-x-reverse">
        <input
          type="number"
          min={isVariable ? "0.001" : "1"}
          step={isVariable ? "0.001" : "1"}
          max={showStock && selectedInvItem
            ? availableStock / (isVariable && row.weight_unit === "تن" ? 1000 : 1)
            : undefined}
          value={row.quantity}
          onFocus={(e) => e.target.select()}
          onWheel={(e) => e.target.blur()}
          onChange={(e) => updateRow(row.id, "quantity", e.target.value)}
          placeholder={label("qtyPlaceholder")}
          required
          className="flex-1 min-w-0 w-full bg-white border border-gray-300 rounded-input px-3 py-2 text-table-cell-text text-gray-900 font-bold font-mono outline-none focus:border-slate-800 placeholder:text-placeholder-text shadow-xs"
          dir="ltr"
        />
        {isVariable && (
          <select
            value={row.weight_unit || "کیلوگرم"}
            onChange={(e) => updateRow(row.id, "weight_unit", e.target.value)}
            className="bg-white border border-gray-300 rounded-input px-2 py-2 text-xs font-bold text-gray-800"
          >
            <option value="کیلوگرم">کیلوگرم</option>
            <option value="تن">تن</option>
          </select>
        )}
        {showStock && selectedInvItem && (
          <div className="text-caption-text bg-slate-100 text-slate-800 border border-slate-200 px-2 py-2 rounded-badge font-mono shrink-0 whitespace-nowrap shadow-2xs">
            {label("stockPrefix")} {Number(availableStock).toLocaleString("en-US", { maximumFractionDigits: 3 })} {selectedInvItem.weight_type === "variable" ? "کیلوگرم" : "عدد"}
          </div>
        )}
      </div>
      <TooltipButton
        tooltip={t("common.deleteRowTooltip")}
        onClick={() => removeRow(row.id)}
        disabled={!canRemove}
        className="p-2 text-gray-400 hover:text-rose-600 rounded-btn hover:bg-rose-50 disabled:opacity-30 disabled:hover:text-gray-400 disabled:hover:bg-transparent transition-colors cursor-pointer shrink-0"
        icon={<Trash2 size={16} />}
      />
    </div>
  );
}
export default function WarehouseStockMoveModal({
  mode,
  isOpen,
  onClose,
  branches = [],
  showBranch = true,
  selectedBranch = "all",
  inventoryData = [],
  categories = [],
  prefillProductId = null,
  onSuccess,
}) {
  useBodyScrollLock(isOpen);
  const { t } = useTranslation("warehouse");
  const config = MODES[mode];
  const label = useCallback(
    (key) => t([`${config.tKey}.${key}`, `sharedModal.${key}`]),
    [t, config.tKey],
  );
  const isGlobal = !selectedBranch || selectedBranch === "all";
  const nextRowId = useRef(1);
  const makeRowId = () => nextRowId.current++;
  const emptyRow = () => ({
    id: makeRowId(),
    category_id: "all",
    product_id: "",
    quantity: "",
    weight_unit: "کیلوگرم",
  });
  const [modalBranchId, setModalBranchId] = useState("");
  const [rows, setRows] = useState([emptyRow()]);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  useEffect(() => {
    if (!isOpen) return;
    setModalBranchId(
      isGlobal ? (branches[0] ? String(branches[0].id) : "") : String(selectedBranch),
    );
    const prefilled = prefillProductId
      ? inventoryData.find(
          (inv) => String(inv.product_id) === String(prefillProductId),
        )
      : null;
    setRows([
      prefilled
        ? {
            id: makeRowId(),
            category_id: String(prefilled.category_id || "all"),
            product_id: String(prefilled.product_id),
            quantity: prefilled.weight_type === "variable" ? "" : "1",
            weight_unit: "کیلوگرم",
          }
        : emptyRow(),
    ]);
    setDescription("");
    setIsSubmitting(false);
  }, [isOpen, isGlobal, selectedBranch, branches, prefillProductId, inventoryData]);
  if (!isOpen) return null;
  const targetBranchId = isGlobal ? modalBranchId : selectedBranch;
  const addRow = () => setRows((prev) => [...prev, emptyRow()]);
  const removeRow = (id) =>
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)));
  const updateRow = (id, field, value) =>
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        if (field === "category_id") {
          return { ...r, category_id: value, product_id: "", quantity: "", weight_unit: "کیلوگرم" };
        }
        if (field === "product_id") {
          return { ...r, product_id: value, quantity: "", weight_unit: "کیلوگرم" };
        }
        if (field === "weight_unit") {
          const amount = Number(r.quantity) || 0;
          const kilograms = amount * (r.weight_unit === "تن" ? 1000 : 1);
          return {
            ...r,
            weight_unit: value,
            quantity: String(kilograms / (value === "تن" ? 1000 : 1) || ""),
          };
        }
        return { ...r, [field]: value };
      }),
    );
  const validate = () => {
    if (showBranch && (!targetBranchId || targetBranchId === "all")) {
      return t(`messages.${config.missingBranchMessage}`);
    }
    const seen = new Set();
    for (const [i, row] of rows.entries()) {
      const rowNum = i + 1;
      if (!row.product_id) return t("messages.selectProductRow", { rowNum });
      const qty = Number(row.quantity);
      const invItem = inventoryData.find(
        (inv) => String(inv.product_id) === String(row.product_id),
      );
      const isVariable = invItem?.weight_type === "variable";
      if ((!isVariable && (!Number.isInteger(qty) || qty <= 0)) || (isVariable && (!Number.isFinite(qty) || qty <= 0))) {
        return t("messages.enterValidQtyRow", { rowNum });
      }
      if (seen.has(String(row.product_id))) {
        return t("messages.duplicateProductRow", { rowNum });
      }
      seen.add(String(row.product_id));
      if (config.checksStock) {
        const available = availableStockOf(invItem, targetBranchId);
        const requested = qty * (isVariable && row.weight_unit === "تن" ? 1000 : 1);
        if (requested > available) {
          return t("messages.exportQtyExceedsStock", {
            productName:
              formatProductName(invItem?.product_name) ||
              t("common.unknownProduct", { id: row.product_id }),
            qty,
            available,
          });
        }
      }
    }
    return null;
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    const error = validate();
    if (error) {
      showToast.error(error);
      return;
    }
    try {
      setIsSubmitting(true);
      await apiFetch(config.path, {
        method: "POST",
        body: {
          branch_id: targetBranchId ? Number(targetBranchId) : null,
          description: description.trim(),
          products: rows.map((r) => ({
            product_id: Number(r.product_id),
            quantity: Number(r.quantity),
            weight_unit: r.weight_unit,
          })),
        },
      });
      showToast.success(t(`messages.${config.successMessage}`));
      onSuccess?.();
      onClose();
    } catch (err) {
      showToast.error(t(`messages.${config.errorMessage}`));
    } finally {
      setIsSubmitting(false);
    }
  };
  const activeBranchName =
    branches.find((b) => String(b.id) === String(selectedBranch))?.name ||
    branches[0]?.name ||
    t("table.emptyValue", { ns: "common" });
  const Icon = config.icon;
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs font-sans"
      dir="rtl"
    >
      <div className="w-full max-w-3xl rounded-xl border border-gray-200 bg-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-white px-6 py-4 flex items-center justify-between shrink-0 border-b border-gray-200">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div
              className={`w-8 h-8 rounded-btn flex items-center justify-center border shadow-2xs ${config.iconClass}`}
            >
              <Icon size={18} />
            </div>
            <div>
              <h3 className="text-section-title font-bold text-gray-900 leading-tight">
                {label("title")}
              </h3>
              <p className="text-subtitle text-gray-500 mt-0.5">
                {label("subtitle")}
              </p>
            </div>
          </div>
          <TooltipButton
            
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded-btn transition-colors cursor-pointer"
            icon={<X size={18} />}
          />
        </div>
        <form
          onSubmit={handleSubmit}
          className="p-6 overflow-y-auto flex-1 space-y-5 font-sans"
        >
          {showBranch && (
            <BranchSection
              label={label(config.branchLabelKey)}
              isGlobal={isGlobal}
              branchId={modalBranchId}
              setBranchId={setModalBranchId}
              branches={branches}
              activeBranchName={activeBranchName}
            />
          )}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 space-x-reverse">
                <label className="font-bold text-gray-800 text-label-text">
                  {label("itemsListLabel")}
                </label>
                <span className="text-caption-text text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded-badge">
                  {rows.length}
                </span>
              </div>
              <button
                type="button"
                onClick={addRow}
                className="inline-flex items-center space-x-1 space-x-reverse text-caption-text font-medium text-slate-800 hover:text-slate-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-btn transition-colors cursor-pointer"
              >
                <Plus size={15} />
                <span>{label("addRow")}</span>
              </button>
            </div>
            <div className="space-y-2.5">
              {rows.map((row, index) => (
                <MoveRowItem
                  key={row.id}
                  row={row}
                  index={index}
                  label={label}
                  categories={categories}
                  inventoryData={inventoryData}
                  targetBranchId={targetBranchId}
                  showStock={config.checksStock}
                  updateRow={updateRow}
                  removeRow={removeRow}
                  canRemove={rows.length > 1}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-label-text font-bold text-gray-700 mb-1">
              {label("descriptionLabel")}
            </label>
            <textarea
              rows="2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={label("descriptionPlaceholder")}
              className="w-full bg-white border border-gray-300 rounded-input p-3 text-table-cell-text text-gray-800 outline-none focus:border-slate-800 placeholder:text-placeholder-text shadow-xs"
            />
          </div>
          <div className="pt-3 border-t border-gray-200 flex items-center justify-end space-x-3 space-x-reverse">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-btn border border-gray-300 text-gray-700 font-medium text-btn-text hover:bg-gray-50 transition-colors cursor-pointer shadow-xs"
            >
              {label("cancelButton")}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 rounded-btn bg-slate-800 hover:bg-slate-900 text-white font-medium text-btn-text transition-colors flex items-center space-x-2 space-x-reverse cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {isSubmitting ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Icon size={16} />
              )}
              <span>
                {isSubmitting ? label("submittingButton") : label("submitButton")}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
