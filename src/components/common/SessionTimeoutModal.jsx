import React from "react";
import { useTranslation } from "react-i18next";
import { Clock, LogOut, RotateCcw } from "lucide-react";
export default function SessionTimeoutModal({ secondsLeft, onStay, onLogout }) {
  const { t } = useTranslation("common");
  if (secondsLeft === null || secondsLeft === undefined) return null;
  return (
    <div
      dir="rtl"
      role="alertdialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4 font-sans"
    >
      <div className="bg-white rounded-modal shadow-xl w-full max-w-sm p-6 flex flex-col items-center text-center gap-3">
        <div className="w-12 h-12 rounded-card bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
          <Clock size={22} />
        </div>
        <p className="text-section-title font-bold text-gray-900">{t("session.warnTitle")}</p>
        <p className="text-body-text text-gray-500 font-medium">
          {t("session.warnBody", { seconds: secondsLeft })}
        </p>
        <div className="flex items-center gap-2 w-full mt-1.5">
          <button
            type="button"
            onClick={onStay}
            autoFocus
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-btn text-btn-text font-bold cursor-pointer"
          >
            <RotateCcw size={15} />
            <span>{t("session.stay")}</span>
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 rounded-btn text-btn-text font-bold cursor-pointer"
          >
            <LogOut size={15} className="text-gray-600" />
            <span>{t("session.logout")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
