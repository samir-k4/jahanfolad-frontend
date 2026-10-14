import { Fragment, useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Mail,
  Phone,
  KeyRound,
  Shield,
  User as UserIcon,
  XCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { apiFetch } from "../api";
import { ActiveSessionsPanel, PasswordChangeModal, usePagePerms } from "../components/common";
import { useAuth } from "../context/AuthContext";
import { ACTIONS, PAGES, PAGE_GROUPS } from "../constants/permissions";
import { formatAfghanDateTime } from "../utils/dateHelpers";
import { showToast } from "../utils/toast";

function Field({ icon: Icon, label, value }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
      <span className="text-[10px] text-gray-500 font-medium flex items-center gap-1.5 mb-1">
        <Icon size={12} />
        {label}
      </span>
      <span className="text-xs font-bold text-gray-900 block" dir="auto">
        {value || "—"}
      </span>
    </div>
  );
}

export default function UserProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation("common");
  const { canEdit } = usePagePerms("users");
  const { user: signedInUser } = useAuth();
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch(`/users/${id}`);
      setUser(data?.data ?? data?.user ?? data);
    } catch (err) {
      setError(err.message || "خطا در دریافت اطلاعات کاربر");
      showToast.error(err.message || "خطا در دریافت اطلاعات کاربر");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="p-16 text-center text-gray-500 font-medium font-sans text-sm" dir="rtl">
        در حال بارگذاری مشخصات کاربر...
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="p-16 text-center font-sans" dir="rtl">
        <p className="text-rose-600 font-bold text-sm mb-4">
          {error || "کاربر یافت نشد"}
        </p>
        <button
          type="button"
          onClick={() => navigate("/settings?tab=users")}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg cursor-pointer"
        >
          بازگشت به فهرست کاربران
        </button>
      </div>
    );
  }

  const roleTitles =
    user.role_titles ||
    (Array.isArray(user.roles) ? user.roles : [user.role]).filter(Boolean);
  const perms = user.permissions || {};
  const isActive = (user.status ?? "active") === "active";
  const isSuper =
    user.is_super_admin ||
    (Array.isArray(user.roles) ? user.roles : [user.role]).includes(
      "super_admin",
    );

  return (
    <div className="space-y-4 font-sans pb-16" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/settings?tab=users")}
            title="بازگشت"
            className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-600 cursor-pointer transition-colors"
          >
            <ArrowRight size={16} />
          </button>
          <div className="w-11 h-11 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold">
            <UserIcon size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              {user.name}
            </h1>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              @{user.username}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border inline-flex items-center gap-1 ${
              isActive
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-rose-50 text-rose-800 border-rose-200"
            }`}
          >
            {isActive ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
            {isActive ? "فعال" : "غیرفعال"}
          </span>
          {signedInUser?.id === user.id && (
            <button
              type="button"
              onClick={() => setPasswordModalOpen(true)}
              className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 text-xs font-bold rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1.5"
            >
              <KeyRound size={14} className="text-gray-600" />
              {t("password.changeButton")}
            </button>
          )}
          {canEdit && (
            <button
              type="button"
              onClick={() => navigate("/settings?tab=users")}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
            >
              ویرایش کاربر
            </button>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs p-5 space-y-4">
        <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-slate-700" />
          مشخصات حساب
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Field icon={Mail} label="ایمیل" value={user.email} />
          <Field icon={Phone} label="شماره تماس" value={user.phone} />
          <Field
            icon={Building2}
            label="نمایندگی"
            value={user.branch?.name || "دفتر مرکزی"}
          />
          <Field
            icon={Clock}
            label="آخرین ورود"
            value={
              user.last_login_at
                ? formatAfghanDateTime(user.last_login_at)
                : "تا کنون وارد نشده"
            }
          />
        </div>
      </div>

      {/* Roles */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs p-5 space-y-3">
        <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          نقش‌های کاربری
          <span className="text-[10px] font-medium text-gray-400">
            ({roleTitles.length})
          </span>
        </h2>
        <div className="flex flex-wrap gap-2">
          {roleTitles.map((title) => (
            <span
              key={title}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-900 text-xs font-bold"
            >
              <Shield size={13} />
              {title}
            </span>
          ))}
        </div>
      </div>

      {/* Effective permissions */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="p-5 pb-3">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            دسترسی‌های مؤثر
          </h2>
          {isSuper && (
            <p className="text-[11px] text-emerald-700 font-medium mt-1">
              این کاربر مدیر ارشد است و به تمام بخش‌ها دسترسی کامل دارد.
            </p>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse min-w-[520px]">
            <thead>
              <tr className="bg-gray-50 border-y border-gray-200">
                <th className="p-2.5 text-[11px] font-bold text-gray-700">
                  نام صفحه
                </th>
                {ACTIONS.map((a) => (
                  <th
                    key={a.id}
                    className="p-2.5 text-[11px] font-bold text-gray-700 text-center w-20"
                  >
                    {a.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(PAGE_GROUPS).map(([groupName, groupPages]) => (
                <Fragment key={groupName}>
                  <tr className="bg-gray-100/70 border-b border-gray-200">
                    <td
                      colSpan={ACTIONS.length + 1}
                      className="px-2.5 py-1.5 text-[10px] font-bold text-gray-500"
                    >
                      {groupName}
                    </td>
                  </tr>
                  {groupPages.map(({ key, label, actions }) => {
                    const row = perms[key] || {};
                    const anyOn = isSuper || actions.some((a) => row[a]);
                    return (
                      <tr
                        key={key}
                        className={`border-b border-gray-100 ${
                          anyOn ? "bg-emerald-50/30" : "bg-white"
                        }`}
                      >
                        <td
                          className={`p-2.5 text-xs font-bold ${
                            anyOn ? "text-emerald-950" : "text-gray-400"
                          }`}
                        >
                          {label}
                        </td>
                        {ACTIONS.map((a) => {
                          if (!actions.includes(a.id)) {
                            return (
                              <td
                                key={a.id}
                                className="p-2.5 text-center text-gray-200 select-none"
                              >
                                —
                              </td>
                            );
                          }
                          const on = isSuper || Boolean(row[a.id]);
                          return (
                            <td key={a.id} className="p-2.5 text-center">
                              {on ? (
                                <CheckCircle2
                                  size={16}
                                  className="inline text-emerald-600"
                                />
                              ) : (
                                <XCircle
                                  size={16}
                                  className="inline text-gray-200"
                                />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {signedInUser?.id === user.id && <ActiveSessionsPanel />}
      <PasswordChangeModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        onDone={() => {
          setPasswordModalOpen(false);
          showToast.success(t("password.changed"));
        }}
      />
    </div>
  );
}
