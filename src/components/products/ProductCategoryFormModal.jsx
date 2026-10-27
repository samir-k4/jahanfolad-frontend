import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Save, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { apiFetch } from "../../api";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import { showToast } from "../../utils/toast";
import { getCleanErrorMessage } from "../../utils/errorHandler";

export default function ProductCategoryFormModal({
  isOpen,
  category,
  onClose,
  onSaved,
}) {
  const { t } = useTranslation("products");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen || !category) return;
    setName(category.name || "");
    setUnit("");
  }, [category, isOpen]);

  if (!isOpen || !category) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSaving) return;
    if (!name.trim()) {
      showToast.error(t("messages.enterCategoryName"));
      return;
    }
    if (!unit.trim()) {
      showToast.error(t("messages.enterCategoryUnit"));
      return;
    }
    setIsSaving(true);
    try {
      await apiFetch(`/product-categories/${category.id}`, {
        method: "PUT",
        body: { name: name.trim(), unit: unit.trim() },
      });
      showToast.success(t("messages.updateCategorySuccess"));
      onSaved?.();
    } catch (error) {
      showToast.error(
        getCleanErrorMessage(error, t("messages.updateCategoryError")),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-table-cell-text text-gray-900 outline-none focus:border-slate-800";

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
      dir="rtl"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-base font-bold text-gray-900">
            {t("categoryEdit.title")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            title={t("common:actions.close")}
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-label-text font-semibold text-gray-700">
              {t("categoryEdit.nameLabel")}
            </label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("categoryEdit.namePlaceholder")}
              maxLength={255}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-label-text font-semibold text-gray-700">
              {t("categoryEdit.unitLabel")}{" "}
              <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={unit}
              onChange={(event) => setUnit(event.target.value)}
              placeholder={t("categoryEdit.unitPlaceholder")}
              maxLength={80}
              required
              className={inputClass}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-btn-text font-medium text-gray-700 hover:bg-gray-50"
            >
              {t("categoryEdit.cancelButton")}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-4 py-2 text-btn-text font-medium text-white hover:bg-slate-900 disabled:opacity-50"
            >
              <Save size={15} />
              {isSaving
                ? t("categoryEdit.savingButton")
                : t("common:actions.saveChanges")}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
