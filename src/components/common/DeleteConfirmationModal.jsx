import React from "react";
import { createPortal } from "react-dom";
import { Trash2, X } from "lucide-react";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import { useTranslation } from "react-i18next";
import { formatProductName } from "../../utils/productFormat";
import TooltipButton from "./TooltipButton";

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  productName,
  itemName,
  title,
  question,
  warning,
  loading,
  namespace = "common",
  reasonRequired = false,
  reason = "",
  onReasonChange,
  reasonLabel,
  reasonPlaceholder,
  confirmLabel,
}) {
  const { t } = useTranslation(namespace);
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  const displayName = itemName || (productName ? formatProductName(productName) : "");
  const resolvedWarning = warning === undefined ? t("deleteConfirm.warning") : warning;

  return createPortal(
    <div
      className="fixed inset-0 top-0 left-0 right-0 bottom-0 m-0 mt-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs font-sans"
      dir="rtl"
    >
      <div className="w-full max-w-md overflow-hidden rounded-modal bg-white shadow-2xl m-0">
        <div className="border-b border-gray-200 bg-white px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
                <Trash2 size={16} />
              </div>
              <h3 className="text-section-title font-bold text-gray-900">
                {title ?? t("deleteConfirm.title")}
              </h3>
            </div>
            <TooltipButton
              onClick={onClose}
              disabled={loading}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-btn hover:bg-gray-100 transition-colors disabled:cursor-not-allowed cursor-pointer"
            >
              <X size={18} />
            </TooltipButton>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="space-y-1">
            <p className="text-table-cell-text font-bold text-gray-800">
              {question ?? t("deleteConfirm.question")}
            </p>
            {displayName && (
              <p className="text-table-cell-text text-gray-600">
                {t("deleteConfirm.itemPrefix")}{" "}
                <span className="font-bold text-gray-900" dir="ltr">
                  {displayName}
                </span>{" "}
                {t("deleteConfirm.itemSuffix")}
              </p>
            )}
          </div>

          {resolvedWarning && (
            <div className="rounded-card bg-rose-50 p-3">
              <p className="text-caption-text font-medium text-rose-800">
                {resolvedWarning}
              </p>
            </div>
          )}
          {reasonRequired && (
            <div>
              <label className="mb-1.5 block text-label-text font-bold text-gray-700">
                {reasonLabel} <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(event) => onReasonChange?.(event.target.value)}
                placeholder={reasonPlaceholder}
                maxLength={500}
                className="w-full resize-none rounded-input border border-gray-300 bg-white px-3 py-2 text-body-text outline-none focus:border-slate-800"
              />
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-2.5 px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-btn bg-white border border-gray-300 px-4 py-2 text-btn-text font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer transition-colors"
          >
            {t("actions.cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading || (reasonRequired && !reason.trim())}
            className="flex items-center justify-center gap-1.5 rounded-btn bg-rose-600 hover:bg-rose-700 px-4 py-2 text-btn-text font-medium text-white disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer transition-colors"
          >
            <Trash2 size={16} />
            {loading ? t("actions.deleting") : confirmLabel || t("deleteConfirm.confirmButton")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
