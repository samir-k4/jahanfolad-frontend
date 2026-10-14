import { createPortal } from "react-dom";
import { Trash2 } from "lucide-react";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import { useTranslation } from "react-i18next";

export default function EmployeeDeleteModal({
  isOpen,
  onClose,
  employee,
  onConfirm,
}) {
  const { t } = useTranslation("employee");
  useBodyScrollLock(isOpen);

  if (!isOpen || !employee) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs font-sans"
      dir="rtl"
    >
      <div className="w-full max-w-sm rounded-modal bg-white shadow-2xl border border-gray-200 overflow-hidden p-6 text-center animate-in fade-in zoom-in-95 duration-150">
        <div className="w-14 h-14 bg-rose-50 text-rose-700 border border-rose-200 rounded-card flex items-center justify-center mx-auto mb-4">
          <Trash2 size={26} />
        </div>

        <h3 className="text-xl font-bold text-gray-900 mb-2">
          {t("list.tooltipDelete")}
        </h3>
        <p className="text-sm text-gray-600 mb-6 leading-relaxed">
          {t("deleteModal.desc", {
            name: employee.full_name,
            code: employee.employee_ID,
          })}
        </p>

        <div className="flex space-x-2.5 space-x-reverse justify-center">
          <button
            type="button"
            onClick={() => onConfirm(employee.id)}
            className="flex-1 flex items-center justify-center gap-1.5 bg-rose-800 hover:bg-rose-900 text-white font-bold py-2.5 px-4 rounded-btn transition-colors text-sm cursor-pointer shadow-xs"
          >
            {t("deleteModal.confirm")}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-white hover:bg-gray-100 text-gray-700 font-bold py-2.5 px-4 rounded-btn border border-gray-300 transition-colors text-sm cursor-pointer shadow-2xs"
          >
            {t("deleteModal.cancelLabel")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
