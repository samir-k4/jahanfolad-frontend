import { useTranslation } from "react-i18next";
import {
  Plus,
  Trash2,
  Save,
  FileText,
  Printer,
  Edit2,
  X,
} from "lucide-react";
import DatePicker from "react-multi-date-picker";
import {
  toAfghanDate,
  formatAfghanDisplay,
  persian,
  persian_af,
} from "../../utils/dateHelpers";
import { formatProductOption, getProductWeights } from "../../utils/productFormat";
import { SearchableSelect } from "../common";
export default function ProductionEntryForm({
  globalData,
  setGlobalData,
  selectedDay,
  onDateChange,
  branches = [],
  showBranch = true,
  categories = [],
  products = [],
  productionRows = [],
  addRow,
  removeRow,
  updateRow,
  handleSaveAll,
  isSaving = false,
  editingBatch = null,
  handleCancelEdit,
  handleGeneratePdf,
}) {
  const { t } = useTranslation("production");
  return (
    <div className="w-full space-y-4 font-sans" dir="rtl">
      <div className="bg-white p-5 border border-gray-200 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center space-x-3 space-x-reverse">
          <div className="p-2 rounded-lg border bg-slate-100 text-slate-800 border-slate-200 shrink-0">
            <FileText size={22} className="shrink-0" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">
              {t("navigation.pages.production", { ns: "common" })}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={handleGeneratePdf}
            className="flex items-center space-x-2 space-x-reverse bg-white hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-lg border border-gray-300 text-btn-text transition-colors cursor-pointer"
            title={t("form.printPreviewTitle")}
          >
            <Printer size={16} className="text-gray-600" />
            <span>{t("form.printPreviewButton")}</span>
          </button>
        </div>
      </div>
      {editingBatch && (
        <div className="bg-amber-50 border-r-4 border-amber-500 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs animate-in fade-in duration-150">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-900 rounded-lg shrink-0">
              <Edit2 size={18} />
            </div>
            <div>
              <h4 className="font-bold text-amber-950 text-base">
                {t("form.editBannerTitle", {
                  batchId: editingBatch.id,
                  formattedDate:
                    formatAfghanDisplay(toAfghanDate(editingBatch.date)) ||
                    t("table.emptyValue", { ns: "common" }),
                })}
              </h4>
              <p className="text-body-text text-amber-800 mt-0.5">
                {t("form.editBannerDescription")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancelEdit}
            className="px-3.5 py-1.5 bg-white hover:bg-amber-100 text-amber-950 text-btn-text font-bold rounded-lg border border-amber-300 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs"
          >
            <X size={14} />
            <span>{t("form.cancelEditButton")}</span>
          </button>
        </div>
      )}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
          <div className="flex flex-col justify-between space-y-4">
            <div>
              <label className="block text-label-text text-gray-700 mb-1.5">
                {t("form.dateLabel")}{" "}
                <span className="text-rose-600">*</span>
              </label>
              <DatePicker
                value={selectedDay}
                onChange={onDateChange}
                calendar={persian}
                locale={persian_af}
                calendarPosition="bottom-right"
                inputClass="bg-white w-full border border-gray-300 hover:border-gray-400 rounded-lg py-2 px-3 focus:border-slate-800 outline-none text-table-cell-text text-gray-800 cursor-pointer font-sans"
                containerClassName="w-full"
                placeholder={t("form.datePlaceholder")}
                format="YYYY/MM/DD"
              />
            </div>
            {showBranch && (
              <div>
                <label className="block text-label-text text-gray-700 mb-1.5">
                  {t("branch.gateTitle", { ns: "common" })}{" "}
                  <span className="text-rose-600">*</span>
                </label>
                <SearchableSelect
                  options={Array.isArray(branches) ? branches : []}
                  value={globalData.branch}
                  onChange={(val) =>
                    setGlobalData((prev) => ({ ...prev, branch: val }))
                  }
                  placeholder={t("form.branchPlaceholder")}
                  searchPlaceholder={
                    t("table.searchPlaceholder")
                  }
                  noResultsText={t("table.noResults")}
                  getOptionLabel={(b) => b?.name || ""}
                  getOptionValue={(b) => b?.id}
                  buttonClassName="py-2 px-3 text-table-cell-text"
                />
              </div>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <label className="block text-label-text text-gray-700 mb-1.5">
              {t("form.descriptionLabel")}{" "}
              <span className="text-gray-400 text-caption-text font-normal">
                {t("form.optionalSuffix")}
              </span>
            </label>
            <textarea
              dir="rtl"
              className="bg-white w-full flex-1 min-h-[95px] border border-gray-300 hover:border-gray-400 rounded-lg py-2 px-3 focus:border-slate-800 outline-none text-gray-800 resize-none overflow-hidden placeholder:text-placeholder-text text-body-text"
              style={{ unicodeBidi: "plaintext" }}
              placeholder={t("form.descriptionPlaceholder")}
              value={globalData.description}
              onChange={(e) =>
                setGlobalData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
            />
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs">
        <div className="border border-gray-200 rounded-lg">
          <div className="hidden md:grid grid-cols-12 bg-gray-50 border-b border-gray-200 text-table-header-text font-bold text-gray-700 rounded-t-lg">
            <div className="col-span-3 p-3 border-l border-gray-200">
              {t("form.categoryLabel")}{" "}
              <span className="text-rose-600">*</span>
            </div>
            <div className="col-span-4 p-3 border-l border-gray-200">
              {t("form.productLabel")}{" "}
              <span className="text-rose-600">*</span>
            </div>
            <div className="col-span-2 p-3 border-l border-gray-200">
              {t("form.weightLabel")}{" "}
              <span className="text-rose-600">*</span>
            </div>
            <div className="col-span-2 p-3 border-l border-gray-200 text-center">
              {t("form.quantityLabel")}{" "}
              <span className="text-rose-600">*</span>
            </div>
            <div className="col-span-1 p-3 text-center">
              {t("form.deleteHeader")}
            </div>
          </div>
          <div className="divide-y divide-gray-200 bg-white rounded-b-lg">
            {productionRows.map((row, index) => (
              <div
                key={row.id}
                style={{ zIndex: (productionRows.length - index) * 10 }}
                className="relative grid grid-cols-1 md:grid-cols-12 items-center p-3 md:p-0 bg-white hover:bg-slate-50/70 transition-colors last:rounded-b-lg"
              >
                <div className="col-span-3 md:p-2.5 md:border-l md:border-gray-100">
                  <label className="block md:hidden text-label-text text-gray-500 mb-1">
                    {t("form.categoryLabelColon")}
                  </label>
                  <SearchableSelect
                    options={Array.isArray(categories) ? categories : []}
                    value={row.category}
                    onChange={(val) => {
                      updateRow(row.id, "category", val);
                      updateRow(row.id, "product", null);
                      updateRow(row.id, "weight", "");
                      updateRow(row.id, "weight_unit", "کیلوگرم");
                      updateRow(row.id, "quantity", "");
                    }}
                    placeholder={
                      t("form.categoryPlaceholder")
                    }
                    searchPlaceholder={
                      t("table.searchPlaceholder")
                    }
                    noResultsText={
                      t("table.noResults")
                    }
                    getOptionLabel={(cat) => cat?.name || ""}
                    getOptionValue={(cat) => cat?.id}
                    buttonClassName="py-1.5 px-2.5 text-table-cell-text"
                  />
                </div>
                <div className="col-span-4 md:p-2.5 md:border-l md:border-gray-100 mt-2 md:mt-0">
                  <label className="block md:hidden text-label-text text-gray-500 mb-1">
                    {t("form.productLabelColon")}
                  </label>
                  <SearchableSelect
                    options={
                      Array.isArray(products)
                        ? products.filter(
                            (p) =>
                              Number(p.category_id) ===
                              Number(row.category),
                          )
                        : []
                    }
                    value={row.product ? row.product.id : ""}
                    onChange={(val) => {
                      const selectedProduct = products.find(
                        (p) => String(p.id) === String(val),
                      );
                      updateRow(
                        row.id,
                        "product",
                        selectedProduct || null,
                      );
                      updateRow(
                        row.id,
                        "weight",
                        selectedProduct?.weight_type === "variable"
                          ? ""
                          : selectedProduct?.weight ||
                              getProductWeights(selectedProduct)[0] ||
                              "",
                      );
                      updateRow(row.id, "weight_unit", "کیلوگرم");
                      updateRow(
                        row.id,
                        "quantity",
                        selectedProduct?.weight_type === "variable" ? "" : row.quantity,
                      );
                    }}
                    disabled={!row.category}
                    placeholder={
                      !row.category
                        ? t("form.productPlaceholderDisabled")
                        : t("form.productPlaceholder")
                    }
                    searchPlaceholder={
                      t("table.searchPlaceholder")
                    }
                    noResultsText={
                      t("table.noResults")
                    }
                    getOptionLabel={(p) => formatProductOption(p)}
                    getOptionValue={(p) => p?.id}
                    buttonClassName="py-1.5 px-2.5 text-table-cell-text"
                  />
                </div>
                <div className="col-span-2 md:p-2.5 md:border-l md:border-gray-100 mt-2 md:mt-0">
                  <label className="block md:hidden text-label-text text-gray-500 mb-1">
                    {t("form.weightLabelColon")}
                  </label>
                  {row.product?.weight_type === "variable" ? (
                    <div className="flex gap-1">
                      <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={row.weight}
                        onChange={(e) => updateRow(row.id, "weight", e.target.value)}
                        placeholder="وزن کل"
                        className="min-w-0 w-full bg-white border border-gray-300 rounded-lg py-1.5 px-2 text-table-cell-text text-gray-800 text-center font-mono"
                        dir="ltr"
                      />
                      <select
                        value={row.weight_unit || "کیلوگرم"}
                        onChange={(e) => updateRow(row.id, "weight_unit", e.target.value)}
                        className="max-w-20 bg-white border border-gray-300 rounded-lg px-1 text-xs font-bold"
                      >
                        <option value="کیلوگرم">کیلوگرم</option>
                        <option value="تن">تن</option>
                      </select>
                    </div>
                  ) : (
                    <div
                      className="w-full bg-gray-100 border border-gray-200 rounded-lg py-1.5 px-2.5 text-table-cell-text text-gray-700 text-center font-mono cursor-not-allowed"
                      aria-readonly="true"
                      title="وزن بسته از مشخصات محصول گرفته می‌شود و قابل تغییر نیست"
                    >
                      {row.weight || "—"}
                    </div>
                  )}
                </div>
                <div className="col-span-2 md:p-2.5 md:border-l md:border-gray-100 mt-2 md:mt-0">
                  <label className="block md:hidden text-label-text text-gray-500 mb-1">
                    {t("form.quantityLabelColon")}
                  </label>
                  {row.product?.weight_type === "variable" ? (
                    <div className="text-center text-gray-400">—</div>
                  ) : (
                    <input
                      type="number"
                      min="1"
                      step="1"
                      dir="ltr"
                      onFocus={(e) => e.target.select()}
                      onWheel={(e) => e.target.blur()}
                      className="w-full bg-white border border-gray-300 rounded-lg py-1.5 px-2.5 text-table-cell-text text-gray-800 focus:border-slate-800 outline-none text-center font-mono font-medium placeholder:text-placeholder-text"
                      placeholder={t("form.quantityPlaceholder")}
                      value={row.quantity}
                      onChange={(e) => updateRow(row.id, "quantity", e.target.value)}
                    />
                  )}
                </div>
                <div className="col-span-1 md:p-2.5 text-center mt-2 md:mt-0 flex justify-center">
                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    disabled={productionRows.length === 1}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                    title={t("form.deleteRowTitle")}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
          <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-3">
            <button
              type="button"
              onClick={addRow}
              className="flex items-center space-x-1 space-x-reverse text-slate-800 hover:text-slate-950 font-bold text-btn-text bg-slate-100 hover:bg-slate-200 py-2 px-4 rounded-lg transition-colors border border-slate-300 cursor-pointer"
            >
              <Plus size={16} />
              <span>{t("form.addRowButton")}</span>
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSaving}
              className="flex items-center space-x-2 space-x-reverse bg-slate-800 hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 px-7 rounded-lg transition-colors text-btn-text cursor-pointer"
            >
              <Save size={16} />
              <span>
                {isSaving
                  ? t("form.savingButton")
                  : editingBatch
                  ? t("form.saveEditButton")
                  : t("form.saveAllButton")}
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }
