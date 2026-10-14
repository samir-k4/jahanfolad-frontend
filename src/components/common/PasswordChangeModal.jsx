import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, KeyRound, Loader2, X } from "lucide-react";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import { apiFetch } from "../../api";
import TooltipButton from "./TooltipButton";
export default function PasswordChangeModal({ isOpen, onClose, onDone, forced = false }) {
  const { t } = useTranslation("common");
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  useBodyScrollLock(isOpen);
  if (!isOpen) return null;
  const reset = () => {
    setCurrentPassword("");
    setPassword("");
    setConfirmation("");
    setError("");
  };
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (password !== confirmation) {
      setError(t("password.mismatch"));
      return;
    }
    setIsSubmitting(true);
    try {
      const data = await apiFetch("/profile/password", {
        method: "POST",
        body: {
          current_password: currentPassword,
          password,
          password_confirmation: confirmation,
        },
      });
      reset();
      onDone?.(data);
    } catch (err) {
      const fieldErrors = err?.data?.errors ? Object.values(err.data.errors).flat() : [];
      setError(fieldErrors[0] || err?.message || t("password.failed"));
    } finally {
      setIsSubmitting(false);
    }
  };
  const field = (id, label, value, setValue, autoComplete) => (
    <div>
      <label htmlFor={id} className="block text-label-text font-bold text-gray-700 mb-1">
        {label}
      </label>
      <input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        autoComplete={autoComplete}
        required
        disabled={isSubmitting}
        onChange={(event) => setValue(event.target.value)}
        className="w-full border border-gray-300 text-black rounded-input px-3 py-2 bg-gray-50 outline-none focus:border-slate-700 disabled:opacity-60"
        dir="ltr"
      />
    </div>
  );
  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs font-sans"
      dir="rtl"
    >
      <div className="w-full max-w-md overflow-hidden rounded-modal bg-white shadow-2xl">
        <div className="border-b border-gray-200 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center">
              <KeyRound size={16} />
            </div>
            <h3 className="text-section-title font-bold text-gray-900">
              {forced ? t("password.forcedTitle") : t("password.title")}
            </h3>
          </div>
          {!forced && (
            <TooltipButton
              onClick={onClose}
              disabled={isSubmitting}
              tooltip={t("actions.close")}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-btn hover:bg-gray-100 disabled:cursor-not-allowed cursor-pointer"
            >
              <X size={18} />
            </TooltipButton>
          )}
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          {forced && (
            <div className="rounded-card bg-amber-50 border border-amber-200 p-3">
              <p className="text-caption-text font-medium text-amber-900">{t("password.forcedNote")}</p>
            </div>
          )}
          {field("current-password", t("password.current"), currentPassword, setCurrentPassword, "current-password")}
          {field("new-password", t("password.new"), password, setPassword, "new-password")}
          {field("confirm-password", t("password.confirm"), confirmation, setConfirmation, "new-password")}
          <div className="flex items-center justify-between">
            <p className="text-caption-text text-gray-500 font-medium">{t("password.rule")}</p>
            <button
              type="button"
              onClick={() => setVisible((shown) => !shown)}
              className="inline-flex items-center gap-1 text-caption-text font-bold text-gray-600 hover:text-gray-900 cursor-pointer"
            >
              {visible ? <EyeOff size={14} /> : <Eye size={14} />}
              <span>{visible ? t("password.hide") : t("password.show")}</span>
            </button>
          </div>
          {error && (
            <div role="alert" className="rounded-card border border-rose-200 bg-rose-50 px-3 py-2">
              <p className="text-caption-text font-medium text-rose-800">{error}</p>
            </div>
          )}
          <div className="flex items-center justify-end gap-2.5 pt-1">
            {!forced && (
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-btn bg-white border border-gray-300 px-4 py-2 text-btn-text font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-70 cursor-pointer"
              >
                {t("actions.cancel")}
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-1.5 rounded-btn bg-slate-800 hover:bg-slate-900 px-4 py-2 text-btn-text font-bold text-white disabled:opacity-70 cursor-pointer"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
              <span>{isSubmitting ? t("actions.saving") : t("password.submit")}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
