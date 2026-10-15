import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { takeSessionEndReason } from "../api";

export default function Login() {
  const { t } = useTranslation("common");
  const { login } = useAuth();
  const [endedReason] = useState(() => takeSessionEndReason());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRecoveryNotice, setShowRecoveryNotice] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err.message || t("login.error"));
      setPassword("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-10 font-sans"
    >
      <section className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-slate-100 text-slate-900 shadow-2xl shadow-black/20">
        <div className="h-1 bg-amber-400" />
        <div className="p-7 sm:p-9">
          <header className="mb-8 text-center">
            <p className="mb-1 text-xs font-semibold tracking-[0.18em] text-slate-500">
              {t("login.productType")}
            </p>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              {t("app.title")}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {t("login.subtitle")}
            </p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="login-email"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                {t("login.username")}
              </label>
              <input
                id="login-email"
                name="email"
                type="text"
                autoComplete="username"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-left text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 disabled:opacity-60"
                dir="ltr"
                placeholder={t("login.usernamePlaceholder")}
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                {t("login.password")}
              </label>
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-left text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 disabled:opacity-60"
                dir="ltr"
                placeholder={t("login.passwordPlaceholder")}
              />
            </div>

            <div className="flex justify-start">
              <button
                type="button"
                onClick={() => setShowRecoveryNotice(true)}
                className="text-sm font-semibold text-slate-700 transition hover:text-slate-950 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-500"
              >
                {t("login.forgotPassword")}
              </button>
            </div>

            {!error && endedReason && (
              <div
                role="status"
                className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900"
              >
                {endedReason === "idle"
                  ? t("session.endedIdle")
                  : t("session.endedExpired")}
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full cursor-pointer items-center justify-center rounded-lg bg-slate-900 px-4 py-3 font-bold text-white transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? t("login.submitting") : t("login.submit")}
            </button>
          </form>
        </div>
        <footer className="border-t border-slate-200 px-7 py-4 text-center text-xs text-slate-500 sm:px-9">
          {t("login.footer")}
        </footer>
      </section>

      {showRecoveryNotice && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowRecoveryNotice(false);
          }}
        >
          <section
            aria-labelledby="recovery-notice-title"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-right text-slate-800 shadow-2xl"
            dir="rtl"
            role="dialog"
          >
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowRecoveryNotice(false)}
                className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              >
                {t("actions.close")}
              </button>
            </div>
            <h2 id="recovery-notice-title" className="text-lg font-bold">
              {t("login.recoveryTitle")}
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              {t("login.recoveryInstructions")}
            </p>
            <button
              type="button"
              onClick={() => setShowRecoveryNotice(false)}
              className="mt-5 w-full rounded-lg bg-slate-900 px-4 py-2.5 font-bold text-white transition hover:bg-slate-800"
            >
              {t("actions.understood")}
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
