import { useTranslation } from "react-i18next";
import { X, Layers, Printer } from "lucide-react";
import { formatProductName } from "../../utils/productFormat";
import { toAfghanDate, formatAfghanDisplay } from "../../utils/dateHelpers";
import {
  getBatchStats,
  getBatchLogs,
  logWeightKg,
  logWeightTon,
} from "../../utils/batchHelpers";
export default function ProductionDetailModal({
  showBranch = true,
  isOpen,
  onClose,
  batch,
  onPrintReport,
}) {
  const { t } = useTranslation("production");
  if (!isOpen || !batch) return null;
  const stats = getBatchStats(batch);
  const logs = getBatchLogs(batch);
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs font-sans" dir="rtl">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-300 max-w-3xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-white text-gray-900 px-5 py-3.5 flex justify-between items-center border-b border-gray-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
              <Layers size={18} />
            </div>
            <h3 className="text-base font-bold text-gray-900">
              {t("detailModal.title", { batchId: batch.id })}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5 max-h-[75vh] overflow-y-auto space-y-4">
          <div className={`grid grid-cols-2 gap-3 ${showBranch ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
            <div className="bg-gray-50 p-3 rounded-lg">
              <span className="text-caption-text text-gray-500 block mb-1 font-medium">
                {t("form.dateLabel")}
              </span>
              <span className="font-bold text-gray-800 text-table-cell-text block">
                {formatAfghanDisplay(toAfghanDate(batch.date)) || "—"}
              </span>
              <span className="text-caption-text text-gray-400 font-mono" dir="ltr">
                {batch.date?.slice(0, 10)}
              </span>
            </div>
            {showBranch && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <span className="text-caption-text text-gray-500 block mb-1 font-medium">
                  {t("detailModal.branchLabel")}
                </span>
                <span className="font-bold text-emerald-800 text-table-cell-text block">
                  {batch.branch?.name || "—"}
                </span>
              </div>
            )}
            <div className="bg-gray-50 p-3 rounded-lg">
              <span className="text-caption-text text-gray-500 block mb-1 font-medium">
                {t("table.colCreator")}
              </span>
              <span className="font-bold text-gray-800 text-table-cell-text block">
                {batch.user?.name || "—"}
              </span>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <span className="text-caption-text text-gray-500 block mb-1 font-medium">
                {t("table.colTotalProduction")}
              </span>
              <span className="font-extrabold text-slate-900 text-table-cell-text block">
                {t("table.weightTon", { weight: stats.totalWeightTon })}
              </span>
              <span className="text-caption-text text-gray-500">
                {t("table.quantityCarton", { qty: stats.totalQuantity })}
              </span>
            </div>
          </div>
          {batch.description && (
            <div className="bg-gray-50 p-3 rounded-lg text-body-text text-gray-700">
              <strong className="text-label-text text-gray-900 block mb-0.5">
                {t("detailModal.descriptionLabel")}
              </strong>
              <p>{batch.description}</p>
            </div>
          )}
          <div>
            <h4 className="text-label-text font-bold text-gray-800 mb-2">
              {t("detailModal.productsHeader")}
            </h4>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200 text-table-header-text">
                    <th className="p-2.5 text-center w-12 border-l border-gray-200">
                      {t("detailModal.colIndex")}
                    </th>
                    <th className="p-2.5 border-l border-gray-200">
                      {t("detailModal.colProductName")}
                    </th>
                    <th className="p-2.5 border-l border-gray-200">
                      {t("detailModal.colCategory")}
                    </th>
                    <th className="p-2.5 border-l border-gray-200 text-center">
                      {t("detailModal.colQuantity")}
                    </th>
                    <th className="p-2.5 border-l border-gray-200 text-center">
                      {t("detailModal.colCartonWeight")}
                    </th>
                    <th className="p-2.5 text-center">
                      {t("detailModal.colTotalWeightTon")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-table-cell-text">
                  {logs.map((log, idx) => {
                    const pName = formatProductName(
                      log.product?.name ||
                        t("detailModal.fallbackProductName", { productId: log.product_id })
                    );
                    const cat = log.product?.category?.name || "—";
                    const wKg = logWeightKg(log);
                    const q = Number(log.quantity) || 0;
                    const ton = logWeightTon(log).toFixed(3);
                    return (
                      <tr key={log.id || idx} className="hover:bg-gray-50/70">
                        <td className="p-2.5 text-center font-mono text-gray-500 border-l border-gray-100">
                          {idx + 1}
                        </td>
                        <td className="p-2.5 font-bold text-gray-900 border-l border-gray-100">
                          {pName}
                        </td>
                        <td className="p-2.5 text-gray-600 border-l border-gray-100">
                          {cat}
                        </td>
                        <td className="p-2.5 text-center font-bold text-gray-800 border-l border-gray-100">
                          {q}
                        </td>
                        <td className="p-2.5 text-center text-gray-600 font-mono border-l border-gray-100">
                          {wKg ? `${wKg}KG` : "—"}
                        </td>
                        <td className="p-2.5 text-center font-bold text-slate-900">
                          {t("table.weightTon", { weight: ton })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-5 py-3 border-t border-gray-200 flex justify-between items-center">
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onPrintReport) onPrintReport(batch);
            }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-btn-text font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer size={15} />
            <span>{t("detailModal.printReportButton")}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 text-btn-text font-bold rounded-lg border border-gray-300 transition-colors cursor-pointer"
          >
            {t("detailModal.closeButton")}
          </button>
        </div>
      </div>
    </div>
  );
}
