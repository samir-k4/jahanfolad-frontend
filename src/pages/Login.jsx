import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, LogIn } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { takeSessionEndReason } from "../api";

export default function Login() {
  const { t } = useTranslation("common");
  const { login } = useAuth();
  // read once per mount, so it disappears after the user has seen it
  const [endedReason] = useState(() => takeSessionEndReason());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      // success unmounts this screen — no navigation needed
    } catch (err) {
      setError(err.message || "ورود ناموفق بود. لطفاً دوباره تلاش کنید.");
      setPassword("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-gray-200 flex items-center justify-center p-4 font-sans"
    >
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#8c2e25]">جهان فولاد</h1>
          <p className="text-gray-500 mt-2">سیستم مدیریت تولید</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-gray-700 mb-1">
              ایمیل
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
              className="w-full border border-gray-300 text-black rounded-lg p-2 text-right bg-gray-100 outline-none focus:border-[#8c2e25] transition-colors disabled:opacity-60"
              dir="ltr"
              placeholder="admin@jahanfolad.af"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="block text-gray-700 mb-1">
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
              className="w-full border border-gray-300 text-black rounded-lg p-2 text-right bg-gray-100 outline-none focus:border-[#8c2e25] transition-colors disabled:opacity-60"
              dir="ltr"
              placeholder="••••••••"
            />
          </div>

          {!error && endedReason && (
            <div
              role="status"
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900"
            >
              {endedReason === "idle" ? t("session.endedIdle") : t("session.endedExpired")}
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
            className="w-full bg-[#8c2e25] text-white p-2 rounded-lg hover:bg-[#6a221c] transition duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <LogIn size={17} />
            )}
            <span>{isSubmitting ? "در حال ورود..." : "ورود به سیستم"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
