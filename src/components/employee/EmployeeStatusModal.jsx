import { createPortal } from "react-dom";
import { UserCheck, UserMinus, Loader2 } from "lucide-react";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import { EMPLOYEE_STATUS, isActiveStatus } from "../../constants/employeeDomain";
import { useTranslation } from "react-i18next";

export default function EmployeeStatusModal({
  isOpen,
  onClose,
  employee,
  onConfirm,
  isToggling,
}) {
  const { t } = useTranslation("employee");
  useBodyScrollLock(isOpen);

  if (!isOpen || !employee) return null;

  const willBeActive = !isActiveStatus(employee.status);
  const nextStatus = willBeActive ? EMPLOYEE_STATUS.ACTIVE : EMPLOYEE_STATUS.INACTIVE;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs font-sans"
      dir="rtl"
    >
      <div className="w-full max-w-sm rounded-modal bg-white shadow-2xl border border-gray-200 overflow-hidden p-6 text-center animate-in fade-in zoom-in-95 duration-150">
        <div
          className={`w-14 h-14 rounded-card flex items-center justify-center mx-auto mb-4 border ${
            willBeActive ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-200"
          }`}
        >
          {willBeActive ? <UserCheck size={26} /> : <UserMinus size={26} />}
        </div>

        <h3 className="text-xl font-bold text-gray-900 mb-2">
          {t("statusModal.title")}
        </h3>
        <p className="text-sm text-gray-600 mb-6 leading-relaxed">
          {t("statusModal.desc", { name: employee.full_name, nextStatus })}
        </p>

        <div className="flex space-x-2.5 space-x-reverse justify-center">
          <button
            type="button"
            onClick={() => onConfirm(employee.id, nextStatus)}
            disabled={isToggling}
            className={`flex-1 flex items-center justify-center gap-1.5 text-white font-bold py-2.5 px-4 rounded-btn transition-colors text-sm cursor-pointer disabled:opacity-50 shadow-xs ${
              willBeActive ? "bg-emerald-800 hover:bg-emerald-900" : "bg-slate-800 hover:bg-slate-900"
            }`}
          >
            {isToggling && <Loader2 size={14} className="animate-spin" />}
            <span>
              {isToggling
                ? t("statusModal.submitting")
                : willBeActive
                ? t("statusModal.activate")
                : t("statusModal.deactivate")}
            </span>
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isToggling}
            className="flex-1 bg-white hover:bg-gray-100 text-gray-700 font-bold py-2.5 px-4 rounded-btn border border-gray-300 transition-colors text-sm cursor-pointer shadow-2xs"
          >
            {t("statusModal.cancel")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
