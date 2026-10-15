import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Building2, Loader2, LogIn, X } from "lucide-react";
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
      setError(err.message || "ورود انجام نشد. لطفاً دوباره تلاش کنید.");
      setPassword("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main
      dir="rtl"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 px-4 py-10 font-sans"
    >
      <div className="pointer-events-none absolute -right-28 -top-32 h-96 w-96 rounded-full bg-slate-300/50 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-28 h-96 w-96 rounded-full bg-blue-200/50 blur-3xl" />

      <section className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 text-white shadow-2xl shadow-slate-900/25">
        <div className="h-1.5 bg-gradient-to-l from-amber-400 via-amber-300 to-slate-700" />
        <div className="p-7 sm:p-9">
          <header className="mb-8 text-center">
            <div
              aria-label="جایگاه نشان سیستم"
              className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-600 bg-slate-800 text-amber-300 shadow-inner"
            >
              <Building2 size={30} strokeWidth={1.7} />
            </div>
            <p className="mb-1 text-xs font-semibold tracking-[0.18em] text-slate-400">
              سیستم مدیریت مالی
            </p>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">
              سیستم حسابدار نور
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              برای ادامه، به حساب کاربری خود وارد شوید
            </p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="login-email"
                className="mb-2 block text-sm font-semibold text-slate-200"
              >
                ایمیل یا نام کاربری
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
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-left text-white outline-none transition placeholder:text-slate-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 disabled:opacity-60"
                dir="ltr"
                placeholder="Email or username"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="mb-2 block text-sm font-semibold text-slate-200"
              >
                رمز عبور
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
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-left text-white outline-none transition placeholder:text-slate-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 disabled:opacity-60"
                dir="ltr"
                placeholder="Enter your password"
              />
            </div>

            <div className="flex justify-start">
              <button
                type="button"
                onClick={() => setShowRecoveryNotice(true)}
                className="text-sm font-semibold text-amber-300 transition hover:text-amber-200 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300"
              >
                رمز عبور خود را فراموش کرده‌اید؟
              </button>
            </div>

            {!error && endedReason && (
              <div
                role="status"
                className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm font-medium text-amber-100"
              >
                {endedReason === "idle"
                  ? t("session.endedIdle")
                  : t("session.endedExpired")}
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm font-medium text-rose-200"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-amber-400 px-4 py-3 font-bold text-slate-950 transition hover:bg-amber-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <LogIn size={18} />
              )}
              <span>{isSubmitting ? "در حال ورود..." : "ورود به سیستم"}</span>
            </button>
          </form>
        </div>
        <footer className="border-t border-slate-800 px-7 py-4 text-center text-xs text-slate-500 sm:px-9">
          دسترسی مجاز برای کاربران ثبت‌شده
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
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <AlertTriangle size={22} />
              </div>
              <button
                type="button"
                aria-label="بستن"
                onClick={() => setShowRecoveryNotice(false)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={19} />
              </button>
            </div>
            <h2 id="recovery-notice-title" className="text-lg font-bold">
              بازیابی رمز عبور
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              برای بازیابی یا تغییر رمز عبور، لطفاً با مدیر سیستم تماس بگیرید.
            </p>
            <button
              type="button"
              onClick={() => setShowRecoveryNotice(false)}
              className="mt-5 w-full rounded-lg bg-slate-900 px-4 py-2.5 font-bold text-white transition hover:bg-slate-800"
            >
              فهمیدم
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
