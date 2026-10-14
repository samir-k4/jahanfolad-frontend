import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Check, Copy, KeyRound } from "lucide-react";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
export default function PasswordResetResultModal({ isOpen, onClose, userName, password }) {
  const { t } = useTranslation("settings");
  const [copied, setCopied] = useState(false);
  useBodyScrollLock(isOpen);
  if (!isOpen || !password) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs font-sans"
      dir="rtl"
    >
      <div className="w-full max-w-md overflow-hidden rounded-modal bg-white shadow-2xl">
        <div className="border-b border-gray-200 px-5 py-4 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
            <KeyRound size={16} />
          </div>
          <h3 className="text-section-title font-bold text-gray-900">
            {t("users.reset.resultTitle")}
          </h3>
        </div>
        <div className="p-5 space-y-3.5">
          <p className="text-table-cell-text font-bold text-gray-800">
            {t("users.reset.resultFor", { name: userName })}
          </p>
          <div className="rounded-card border border-gray-300 bg-gray-50 px-3 py-3 flex items-center justify-between gap-3">
            <code className="text-lg font-bold tracking-widest text-gray-900" dir="ltr">
              {password}
            </code>
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1.5 rounded-btn bg-white border border-gray-300 px-3 py-1.5 text-btn-text font-bold text-gray-800 hover:bg-gray-100 cursor-pointer"
            >
              {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
              <span>{copied ? t("users.reset.copied") : t("users.reset.copy")}</span>
            </button>
          </div>
          <div className="rounded-card bg-amber-50 border border-amber-200 p-3 space-y-1.5">
            <p className="text-caption-text font-bold text-amber-900">
              {t("users.reset.onceWarning")}
            </p>
            <p className="text-caption-text font-medium text-amber-900">
              {t("users.reset.handoverNote")}
            </p>
          </div>
        </div>
        <div className="border-t border-gray-200 bg-gray-50 flex items-center justify-end px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-btn bg-slate-800 hover:bg-slate-900 px-4 py-2 text-btn-text font-bold text-white cursor-pointer"
          >
            {t("users.reset.done")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
