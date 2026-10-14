import { useTranslation } from "react-i18next";
import { Check, FileText } from "lucide-react";
import { formatProductName } from "../../utils";
export default function ProductionSuccessModal({
  showBranch = true,
  isOpen,
  onClose,
  result,
  onPrintReport,
}) {
  const { t } = useTranslation("production");
  if (!isOpen) return null;
  const branchName = showBranch ? result?.branchName || "" : "";
  const dateFormatted = result?.dateFormatted || "";
  const productsList = Array.isArray(result?.data) ? result.data : [];
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs font-sans"
      dir="rtl"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-md w-full p-6 text-center animate-in fade-in zoom-in-95 duration-150">
        <div className="w-14 h-14 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-200 shadow-xs">
          <Check size={28} strokeWidth={2.5} />
        </div>
        <div className="mb-5">
          <h3 className="text-xl font-bold text-gray-800 mb-1">
            {t("successModal.batchRegistered")}
          </h3>
          {(branchName || dateFormatted) && (
            <p className="text-sm text-gray-500 font-medium">
              {branchName}
              {branchName && dateFormatted ? t("successModal.nameSeparator") : ""}
              {dateFormatted}
            </p>
          )}
        </div>
        {productsList.length > 0 && (
          <div className="bg-gray-50 rounded-xl p-3.5 mb-6 border border-gray-200 text-right max-h-56 overflow-y-auto">
            <div className="divide-y divide-gray-200/70">
              {productsList.map((item, idx) => {
                const rawProductName =
                  item.product?.name ||
                  item.product_name ||
                  item.name ||
                  (item.product_id
                    ? t("detailModal.fallbackProductName", { productId: item.product_id })
                    : `${idx + 1}`);
                const productName = formatProductName(rawProductName);
                const quantity = item.quantity ?? 0;
                return (
                  <div
                    key={item.id || item.product_id || idx}
                    className="flex justify-between items-center py-2.5 first:pt-1 last:pb-1 text-sm"
                  >
                    <span className="font-bold text-gray-800 truncate pl-2">
                      {productName}
                    </span>
                    <span className="font-bold text-emerald-800 shrink-0 font-mono" dir="ltr">
                      {t("table.quantityCarton", { qty: quantity })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onPrintReport}
            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 px-4 rounded-xl text-base transition-colors flex items-center justify-center space-x-2 space-x-reverse cursor-pointer shadow-xs"
          >
            <FileText size={16} />
            <span>{t("successModal.createPdfButton")}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-white hover:bg-gray-50 text-gray-700 font-bold py-2.5 px-4 rounded-xl text-base border border-gray-300 transition-colors cursor-pointer shadow-xs"
          >
            {t("successModal.doneButton")}
          </button>
        </div>
      </div>
    </div>
  );
}
