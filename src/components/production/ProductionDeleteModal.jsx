import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import { toAfghanDate, formatAfghanDisplay } from "../../utils/dateHelpers";
import { getBatchStats } from "../../utils/batchHelpers";
export default function ProductionDeleteModal({
  showBranch = true,
  isOpen,
  onClose,
  batch,
  onConfirm,
}) {
  const { t } = useTranslation("production");
  if (!isOpen || !batch) return null;
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs font-sans" dir="rtl">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-300 max-w-md w-full p-6 text-right animate-in fade-in zoom-in-95 duration-150">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-200">
          <Trash2 size={24} />
        </div>
        <h3 className="text-lg font-bold text-gray-900 text-center mb-2">
          {t("deleteModal.title", { batchId: batch.id })}
        </h3>
        <p className="text-body-text text-gray-600 leading-relaxed text-center mb-4">
          {t("deleteModal.description")}
        </p>
        <div className="bg-gray-50 p-3 rounded-lg text-table-cell-text space-y-1.5 mb-5 font-semibold text-gray-700">
          <div className="flex justify-between">
            <span className="text-gray-500">{t("deleteModal.dateLabel")}</span>
            <span>{formatAfghanDisplay(toAfghanDate(batch.date)) || "—"}</span>
          </div>
          {showBranch && (
            <div className="flex justify-between">
              <span className="text-gray-500">{t("deleteModal.branchLabel")}</span>
              <span>{batch.branch?.name || "—"}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-500">{t("deleteModal.itemsLabel")}</span>
            <span className="font-bold text-rose-700">
              {t("table.productsCount", { count: getBatchStats(batch).productsCount })}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-white hover:bg-gray-100 text-gray-700 font-bold py-2.5 px-4 rounded-lg border border-gray-300 text-btn-text transition-colors cursor-pointer"
          >
            {t("deleteModal.cancelButton")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 px-4 rounded-lg text-btn-text transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Trash2 size={15} />
            <span>{t("deleteModal.confirmButton")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
