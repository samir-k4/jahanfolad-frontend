import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { X, Save, Trash2, Edit3, PackagePlus } from "lucide-react";
import { apiFetch, apiItem } from "../../api";
import { DeleteConfirmationModal, SearchableSelect } from "../common";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import { PRODUCT_DEFAULTS } from "../../constants/productDefaults";
import { showToast } from "../../utils/toast";
const MODES = {
  create: {
    tKey: "insertModal",
    icon: PackagePlus,
    iconClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    submitKey: "submitButton",
    submittingKey: "submittingButton",
    successMessage: "insertSuccess",
    errorMessage: "insertError",
    allowsNewCategory: true,
    allowsDelete: false,
  },
  edit: {
    tKey: "editModal",
    icon: Edit3,
    iconClass: "bg-blue-50 text-blue-700 border-blue-200",
    submitKey: "updateButton",
    submittingKey: "savingButton",
    successMessage: "updateToast",
    errorMessage: "updateError",
    allowsNewCategory: false,
    allowsDelete: true,
  },
};
const emptyForm = () => ({
  name: "",
  weight: "",
  weightType: "fixed",
  categoryId: "",
  threshold: String(PRODUCT_DEFAULTS.LOW_STOCK_THRESHOLD),
});
export default function ProductFormModal({
  mode = "create",
  isOpen,
  onClose,
  product = null,
  categories = [],
  onSaved,
  onDelete,
}) {
  const { t } = useTranslation("products");
  useBodyScrollLock(isOpen);
  const config = MODES[mode];
  const label = useCallback((key) => t(`${config.tKey}.${key}`), [t, config.tKey]);
  const isEdit = mode === "edit";
  const [form, setForm] = useState(emptyForm);
  const [useNewCategory, setUseNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  useEffect(() => {
    if (!isOpen) return;
    setUseNewCategory(false);
    setNewCategoryName("");
    setSaving(false);
    setShowDeleteModal(false);
    if (isEdit && product) {
      setForm({
        name: product.name || "",
        weight: product.weight || "",
        weightType: product.weight_type || "fixed",
        categoryId: product.category_id || "",
        threshold: String(
          product.low_stock_threshold ?? PRODUCT_DEFAULTS.LOW_STOCK_THRESHOLD,
        ),
      });
      return;
    }
    setForm({ ...emptyForm(), categoryId: categories[0]?.id ?? "" });
  }, [isOpen, isEdit, product, categories]);
  const setField = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));
  const validate = useCallback(() => {
    if (!form.name.trim()) return t("messages.enterProductName");
    if (form.weightType === "fixed" && !form.weight.trim()) {
      return t("messages.enterFixedWeight");
    }
    if (useNewCategory && !newCategoryName.trim()) {
      return t("messages.enterCategoryName");
    }
    if (!useNewCategory && !form.categoryId) return t("messages.selectCategory");
    const threshold = Number(form.threshold);
    if (form.threshold !== "" && (!Number.isInteger(threshold) || threshold < 0)) {
      return t("messages.invalidThreshold");
    }
    return null;
  }, [form, useNewCategory, newCategoryName]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    const error = validate();
    if (error) {
      showToast.error(error);
      return;
    }
    setSaving(true);
    let step = t("messages.createCategoryError");
    try {
      let categoryId = form.categoryId;
      if (useNewCategory) {
        const created = await apiItem("/product-categories", {
          method: "POST",
          body: { name: newCategoryName.trim() },
        });
        categoryId = created.id;
      }
      step = t(`messages.${config.errorMessage}`);
      const weight = form.weight.trim();
      const body = {
        name: form.name.trim(),
        category_id: categoryId,
        weight_type: form.weightType,
        weight: form.weightType === "fixed" && weight !== "" ? weight : null,
        low_stock_threshold:
          form.threshold === ""
            ? PRODUCT_DEFAULTS.LOW_STOCK_THRESHOLD
            : Number(form.threshold),
      };
      await apiFetch(isEdit ? `/products/${product.id}` : "/products", {
        method: isEdit ? "PUT" : "POST",
        body,
      });
      showToast.success(t(`messages.${config.successMessage}`));
      onSaved?.();
      onClose();
    } catch (err) {
      showToast.error(step || t("messages.genericError"));
    } finally {
      setSaving(false);
    }
  };
  const handleConfirmDelete = () => {
    setShowDeleteModal(false);
    onClose();
    onDelete?.(product);
  };
  if (!isOpen || (isEdit && !product)) return null;
  const Icon = config.icon;
  const inputClass =
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-table-cell-text placeholder:text-placeholder-text text-gray-900 font-medium outline-none focus:border-slate-800 transition-colors";
  const labelClass = "mb-1.5 block text-label-text font-semibold text-gray-700";
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs font-sans"
      dir="rtl"
    >
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-lg border flex items-center justify-center ${config.iconClass}`}
            >
              <Icon size={18} />
            </div>
            <h3 className="text-section-title font-bold text-gray-900">
              {label("title")}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            title={t("editModal.closeButton")}
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-6 font-sans rounded-b-xl">
          <div>
            <label className={labelClass}>{t("insertModal.categoryLabel")}</label>
            {useNewCategory ? (
              <>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder={t("insertModal.newCategoryPlaceholder")}
                  maxLength={255}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => {
                    setUseNewCategory(false);
                    setNewCategoryName("");
                  }}
                  className="mt-2 text-caption-text font-semibold text-gray-600 hover:text-slate-800 cursor-pointer block"
                >
                  {t("insertModal.backToExistingCategory")}
                </button>
              </>
            ) : (
              <>
                <SearchableSelect
                  options={Array.isArray(categories) ? categories : []}
                  value={form.categoryId}
                  onChange={(val) => setField("categoryId", val)}
                  placeholder={t("insertModal.categoryPlaceholder")}
                  searchPlaceholder={t("insertModal.categorySearchPlaceholder")}
                  noResultsText={t("insertModal.categoryNoResults")}
                  getOptionLabel={(cat) => cat?.name || ""}
                  getOptionValue={(cat) => cat?.id}
                  buttonClassName="py-2 px-3 text-table-cell-text"
                />
                {config.allowsNewCategory && (
                  <button
                    type="button"
                    onClick={() => setUseNewCategory(true)}
                    className="mt-2 text-caption-text font-semibold text-slate-800 hover:text-slate-900 cursor-pointer block"
                  >
                    {t("insertModal.addNewCategory")}
                  </button>
                )}
              </>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className={labelClass}>{t("insertModal.productNameLabel")}</label>
              <input
                type="text"
                dir="ltr"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder={label("productNamePlaceholder")}
                maxLength={255}
                className={`${inputClass} text-right`}
              />
            </div>
            <div>
              <label className={labelClass}>{t("insertModal.weightTypeLabel")}</label>
              <div className="flex gap-4 rounded-lg border border-gray-200 px-3 py-2.5">
                {["fixed", "variable"].map((weightType) => (
                  <label key={weightType} className="flex items-center gap-2 text-table-cell-text font-medium text-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      name="product-weight-type"
                      value={weightType}
                      checked={form.weightType === weightType}
                      onChange={() => {
                        setField("weightType", weightType);
                        if (weightType === "variable") setField("weight", "");
                      }}
                    />
                    {t(`insertModal.weightTypes.${weightType}`)}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className={labelClass}>{t("insertModal.weightFieldLabel")}</label>
              <input
                type="text"
                dir="ltr"
                value={form.weight}
                onChange={(e) => setField("weight", e.target.value)}
                placeholder={form.weightType === "variable" ? t("insertModal.variableWeightHint") : label("weightPlaceholder")}
                disabled={form.weightType === "variable"}
                maxLength={255}
                className={`${inputClass} text-right ${form.weightType === "variable" ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`}
              />
            </div>
            <div>
              <label className={labelClass}>{t("insertModal.lowStockLabel")}</label>
              <input
                type="number"
                min="0"
                step="1"
                dir="ltr"
                value={form.threshold}
                onFocus={(e) => e.target.select()}
                onWheel={(e) => e.target.blur()}
                onChange={(e) => setField("threshold", e.target.value)}
                placeholder={String(PRODUCT_DEFAULTS.LOW_STOCK_THRESHOLD)}
                className={`${inputClass} text-right font-mono font-bold`}
              />
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2.5 pt-2 sm:flex-row sm:justify-end">
            {config.allowsDelete && onDelete && (
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-rose-300 bg-white px-4 py-2 text-btn-text font-medium text-rose-700 hover:bg-rose-50 transition cursor-pointer sm:mr-auto"
              >
                <Trash2 size={16} />
                {t("actions.delete", { ns: "common" })}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-btn-text text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              {t("actions.cancel", { ns: "common" })}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 px-5 py-2 font-medium text-btn-text text-white disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer transition-colors"
            >
              <Save size={16} />
              {saving ? label(config.submittingKey) : label(config.submitKey)}
            </button>
          </div>
        </form>
        {config.allowsDelete && (
          <DeleteConfirmationModal
            isOpen={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            onConfirm={handleConfirmDelete}
            productName={product?.name}
          />
        )}
      </div>
    </div>,
    document.body,
  );
}
