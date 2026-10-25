import React, { Fragment, useState, useEffect } from "react";
import {
  X,
  User,
  Mail,
  Phone,
  Lock,
  Shield,
  Building,
  CheckSquare,
  Square,
  AlertCircle,
  Save,
  Key,
} from "lucide-react";
import { apiFetch } from "../../api";
import { useBranch } from "../../context/BranchContext";
import { useAuth } from "../../context/AuthContext";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import SearchableSelect from "../common/SearchableSelect";
import CustomDropdown from "../common/CustomDropdown";
import {
  ACTIONS,
  PAGES,
  PAGE_GROUPS,
  PAGE_KEYS,
  emptyMatrix,
} from "../../constants/permissions";
const STATUS_OPTIONS = [
  { value: "active", label: "فعال (Active)" },
  { value: "inactive", label: "غیرفعال (Suspended)" },
];
export default function UserFormModal({
  isOpen,
  onClose,
  user,
  roles,
  branches,
  onSaved,
}) {
  const { isMultiBranch, selectedBranch } = useBranch();
  const { user: currentUser } = useAuth();
  const canGrantAllBranches = Boolean(
    currentUser?.all_branches || currentUser?.is_super_admin,
  );
  useBodyScrollLock(isOpen);
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    phone: "",
    password: "",
    role: "finance_manager",
    roles: ["finance_manager"],
    branch_id: "",
    branch_ids: [],
    all_branches: false,
    status: "active",
  });
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!isOpen) return;
    const preferredBranch = branches.some((branch) => String(branch.id) === selectedBranch)
      ? selectedBranch
      : branches[0]
        ? String(branches[0].id)
        : "";
    if (user) {
      setFormData({
        name: user.name || "",
        username: user.username || "",
        email: user.email || "",
        phone: user.phone || "",
        password: "",
        role: user.role || "finance_manager",
        roles:
          Array.isArray(user.roles) && user.roles.length > 0
            ? user.roles
            : [user.role || "finance_manager"],
        branch_id: user.branch_id ? String(user.branch_id) : "",
        branch_ids: user.all_branches
          ? []
          : Array.isArray(user.branch_ids)
            ? user.branch_ids.map(String)
            : user.branch_id
              ? [String(user.branch_id)]
              : [],
        all_branches: user.all_branches ?? !user.branch_id,
        status: user.status || "active",
      });
      const initialPerms = emptyMatrix();
      const stored = user.permissions || {};
      PAGE_KEYS.forEach((pageKey) => {
        const row = stored[pageKey];
        if (row === undefined) return;
        PAGES[pageKey].actions.forEach((action) => {
          initialPerms[pageKey][action] =
            typeof row === "boolean" ? row : Boolean(row?.[action]);
        });
      });
      setPermissions(initialPerms);
    } else {
      setFormData({
        name: "",
        username: "",
        email: "",
        phone: "",
        password: "",
        role: "finance_manager",
        roles: ["finance_manager"],
        branch_id: preferredBranch,
        branch_ids: preferredBranch ? [preferredBranch] : [],
        all_branches: false,
        status: "active",
      });
      applyRoleDefaults(["finance_manager"]);
    }
    setError(null);
  }, [isOpen, user, branches, selectedBranch]);
  const applyRoleDefaults = (roleIds) => {
    const newPerms = emptyMatrix();
    roleIds.forEach((roleId) => {
      const rolePerms =
        roles.find((rolePreset) => rolePreset.id === roleId)?.permissions || {};
      PAGE_KEYS.forEach((pageKey) => {
        PAGES[pageKey].actions.forEach((action) => {
          const row = rolePerms[pageKey];
          if (typeof row === "boolean" ? row : Boolean(row?.[action])) {
            newPerms[pageKey][action] = true;
          }
        });
      });
    });
    setPermissions(newPerms);
  };
  const handleRoleToggle = (roleId) => {
    const currentRoles = formData.roles || [];
    const nextRoles = currentRoles.includes(roleId)
      ? currentRoles.filter((selectedRole) => selectedRole !== roleId)
      : [...currentRoles, roleId];

    setFormData({
      ...formData,
      role: nextRoles[0] || "",
      roles: nextRoles,
    });
    applyRoleDefaults(nextRoles);
  };
  const handleCellToggle = (pageKey, action) => {
    setPermissions((prev) => {
      const row = { ...(prev[pageKey] || {}) };
      const next = !row[action];
      row[action] = next;
      if (action === "view" && !next) {
        PAGES[pageKey].actions.forEach((a) => {
          row[a] = false;
        });
      } else if (action !== "view" && next) {
        row.view = true;
      }
      return { ...prev, [pageKey]: row };
    });
  };
  const handleRowToggle = (pageKey) => {
    setPermissions((prev) => {
      const row = prev[pageKey] || {};
      const allOn = PAGES[pageKey].actions.every((a) => row[a]);
      const next = {};
      PAGES[pageKey].actions.forEach((a) => {
        next[a] = !allOn;
      });
      return { ...prev, [pageKey]: next };
    });
  };
  const handleSelectAll = (select) => {
    const updated = emptyMatrix();
    if (select) {
      PAGE_KEYS.forEach((pageKey) => {
        PAGES[pageKey].actions.forEach((a) => {
          updated[pageKey][a] = true;
        });
      });
    }
    setPermissions(updated);
  };
  const grantedCount = PAGE_KEYS.filter((k) =>
    PAGES[k].actions.some((a) => permissions[k]?.[a]),
  ).length;
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!formData.name.trim() || !formData.username.trim() || !formData.email.trim()) {
      setError("لطفاً تمامی فیلدهای الزامی ستاره‌دار را تکمیل نمایید.");
      return;
    }
    if (!formData.roles?.length) {
      setError("لطفاً حداقل یک نقش برای کاربر انتخاب نمایید.");
      return;
    }
    if (branches.length > 0 && !formData.all_branches && formData.branch_ids.length === 0) {
      setError("برای کاربر دست‌کم یک شعبه مجاز انتخاب کنید.");
      return;
    }
    if (!user && !formData.password) {
      setError("برای کاربر جدید، درج کلمه عبور الزامی می‌باشد.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        username: formData.username.trim(),
        email: formData.email.trim(),
        phone: formData.phone?.trim() || null,
        role: formData.roles?.[0] || formData.role,
        roles: formData.roles || [formData.role],
        branch_id: formData.branch_id ? Number(formData.branch_id) : null,
        all_branches: formData.all_branches,
        branch_ids: formData.all_branches
          ? []
          : formData.branch_ids.map(Number),
        status: formData.status,
        permissions: permissions,
      };
      if (formData.password) {
        payload.password = formData.password;
      }
      const resData = await apiFetch(user ? `/users/${user.id}` : "/users", {
        method: user ? "PUT" : "POST",
        body: payload,
      });
      if (onSaved) {
        onSaved(
          resData.message ||
            (user
              ? "مشخصات کاربر با موفقیت به‌روزرسانی شد."
              : "کاربر جدید با موفقیت ایجاد شد."),
        );
      }
      onClose();
    } catch (err) {
      console.error("Save user error:", err);
      const fieldErrors = err.data?.errors
        ? Object.values(err.data.errors).flat().join(" - ")
        : null;
      setError(
        err.message ||
          fieldErrors ||
          "خطای نامشخص در ارتباط با سرور رخ داده است.",
      );
    } finally {
      setLoading(false);
    }
  };
  if (!isOpen) return null;
  const branchOptions = [
    { value: "", label: "دفتر مرکزی (دسترسی عمومی)" },
    ...branches.map((b) => ({
      value: String(b.id),
      label: `${b.name} (${b.location || "شعبه"})`,
    })),
  ];
  const toggleAllowedBranch = (branchId) => {
    setFormData((current) => {
      const selected = current.branch_ids.includes(branchId)
        ? current.branch_ids.filter((id) => id !== branchId)
        : [...current.branch_ids, branchId];
      const primaryBranch = selected.includes(current.branch_id)
        ? current.branch_id
        : selected[0] || "";
      return {
        ...current,
        branch_ids: selected,
        branch_id: primaryBranch,
      };
    });
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs font-sans overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-3xl overflow-hidden my-4 sm:my-8 animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-white text-gray-900 px-6 py-4 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <User size={22} />
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-900">
                {user
                  ? `ویرایش حساب کاربری: ${user.name}`
                  : "تعریف کاربر جدید در سیستم"}
              </h3>
              <p className="text-xs text-gray-500">
                تعیین نقش، مشخصات هویتی و تنظیم دقیق مجوزهای دسترسی
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>
        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700 text-sm">
            <AlertCircle size={18} className="shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}
        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-6 max-h-[75vh] overflow-y-auto"
        >
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              اطلاعات هویتی و ورود
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  نام و تخلص *
                </label>
                <div className="relative">
                  <User
                    size={16}
                    className="absolute right-3 top-3 text-slate-400"
                  />
                  <input
                    type="text"
                    required
                    placeholder="مثلاً: احمد رضایی"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-hidden transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  نام کاربری (Username) *
                </label>
                <div className="relative">
                  <Key
                    size={16}
                    className="absolute right-3 top-3 text-slate-400"
                  />
                  <input
                    type="text"
                    required
                    placeholder="مثلاً: ahmad_finance"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono text-left focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-hidden transition-all"
                    dir="ltr"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  آدرس ایمیل *
                </label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute right-3 top-3 text-slate-400"
                  />
                  <input
                    type="email"
                    required
                    placeholder="name@jahanfolad.af"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono text-left focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-hidden transition-all"
                    dir="ltr"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  شماره تماس
                </label>
                <div className="relative">
                  <Phone
                    size={16}
                    className="absolute right-3 top-3 text-slate-400"
                  />
                  <input
                    type="text"
                    placeholder="0799000000"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono text-left focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-hidden transition-all"
                    dir="ltr"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {user ? "کلمه عبور جدید (اختیاری)" : "کلمه عبور سیستم *"}
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute right-3 top-3 text-slate-400"
                  />
                  <input
                    type="password"
                    placeholder={
                      user ? "تنها در صورت تغییر پر کنید" : "••••••••"
                    }
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-hidden transition-all"
                  />
                </div>
              </div>
              {isMultiBranch && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    شعبه / نمایندگی
                  </label>
                  <SearchableSelect
                    options={branchOptions}
                    value={formData.branch_id}
                    onChange={(val) => setFormData({ ...formData, branch_id: val })}
                    placeholder="انتخاب نمایندگی..."
                    searchPlaceholder="جستجوی نمایندگی..."
                    usePortal={true}
                    buttonClassName="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium bg-slate-50 focus:bg-white outline-none"
                  />
                </div>
              )}
            </div>
          </div>
          {branches.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                دسترسی به شعبه‌ها
              </h4>
              {canGrantAllBranches && (
                <label className="flex items-center gap-2 p-3 border border-slate-200 rounded-lg bg-slate-50 text-sm font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.all_branches}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        all_branches: event.target.checked,
                        branch_ids: event.target.checked
                          ? []
                          : current.branch_ids.length
                            ? current.branch_ids
                            : branches[0]
                              ? [String(branches[0].id)]
                              : [],
                      }))
                    }
                  />
                  دسترسی به همه شعبه‌ها
                </label>
              )}
              {!formData.all_branches && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {branches.map((branch) => {
                    const branchId = String(branch.id);
                    return (
                      <label
                        key={branch.id}
                        className="flex items-center gap-2 p-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.branch_ids.includes(branchId)}
                          onChange={() => toggleAllowedBranch(branchId)}
                        />
                        {branch.name}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              نقش‌های کاربری (می‌توانید چند نقش انتخاب کنید)
              <span className="text-[10px] font-medium text-slate-400">
                ({(formData.roles || []).length} نقش انتخاب شده)
              </span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {roles.map((r) => {
                const isSelected = (formData.roles || []).includes(r.id);
                return (
                  <div
                    key={r.id}
                    onClick={() => handleRoleToggle(r.id)}
                    className={`p-3.5 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected
                        ? "border-emerald-600 bg-emerald-50/50 shadow-xs"
                        : "border-slate-200 bg-slate-50/40 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`text-xs font-bold ${isSelected ? "text-emerald-900" : "text-slate-800"}`}
                      >
                        {r.title}
                      </span>
                      <Shield
                        size={16}
                        className={
                          isSelected ? "text-emerald-600" : "text-slate-400"
                        }
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                      {r.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                دسترسی به صفحات
                <span className="text-[10px] font-medium text-slate-400">
                  ({grantedCount} از {PAGE_KEYS.length} صفحه)
                </span>
              </h4>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleSelectAll(true)}
                  className="text-emerald-700 hover:underline font-bold cursor-pointer"
                >
                  انتخاب همه
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => handleSelectAll(false)}
                  className="text-rose-600 hover:underline font-bold cursor-pointer"
                >
                  لغو همه
                </button>
              </div>
            </div>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse min-w-[520px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-2.5 text-[11px] font-bold text-slate-700 text-right">
                        نام صفحه
                      </th>
                      {ACTIONS.map((a) => (
                        <th
                          key={a.id}
                          className="p-2.5 text-[11px] font-bold text-slate-700 text-center w-20"
                        >
                          {a.label}
                        </th>
                      ))}
                      <th className="p-2.5 w-12" />
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(PAGE_GROUPS).map(([groupName, groupPages]) => (
                      <Fragment key={groupName}>
                        <tr className="bg-slate-100/70 border-b border-slate-200">
                          <td
                            colSpan={ACTIONS.length + 2}
                            className="px-2.5 py-1.5 text-[10px] font-bold text-slate-500"
                          >
                            {groupName}
                          </td>
                        </tr>
                        {groupPages.map(({ key, label, actions }) => {
                          const row = permissions[key] || {};
                          const anyOn = actions.some((a) => row[a]);
                          const allOn = actions.every((a) => row[a]);
                          return (
                            <tr
                              key={key}
                              className={`border-b border-slate-100 transition-colors ${
                                anyOn ? "bg-emerald-50/30" : "bg-white"
                              }`}
                            >
                              <td
                                className={`p-2.5 text-xs font-bold ${
                                  anyOn ? "text-emerald-950" : "text-slate-700"
                                }`}
                              >
                                {label}
                              </td>
                              {ACTIONS.map((a) => {
                                const applies = actions.includes(a.id);
                                if (!applies) {
                                  return (
                                    <td
                                      key={a.id}
                                      className="p-2.5 text-center text-slate-200 select-none"
                                    >
                                      —
                                    </td>
                                  );
                                }
                                const checked = Boolean(row[a.id]);
                                return (
                                  <td key={a.id} className="p-2.5 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleCellToggle(key, a.id)}
                                      aria-label={`${label} — ${a.label}`}
                                      aria-pressed={checked}
                                      className={`inline-flex items-center justify-center cursor-pointer transition-colors ${
                                        checked
                                          ? "text-emerald-600"
                                          : "text-slate-300 hover:text-slate-400"
                                      }`}
                                    >
                                      {checked ? (
                                        <CheckSquare size={18} />
                                      ) : (
                                        <Square size={18} />
                                      )}
                                    </button>
                                  </td>
                                );
                              })}
                              <td className="p-2.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRowToggle(key)}
                                  title={allOn ? "لغو همه" : "انتخاب همه"}
                                  className="text-[10px] font-bold text-slate-400 hover:text-slate-700 cursor-pointer"
                                >
                                  {allOn ? "لغو" : "همه"}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="mt-2 text-[10px] text-slate-400 leading-relaxed">
              صفحه‌ای که «مشاهده» آن فعال نباشد، در منوی کاربر نمایش داده
              نمی‌شود. با فعال کردن ثبت، ویرایش یا حذف، دسترسی مشاهده نیز
              به‌صورت خودکار فعال می‌گردد.
            </p>
          </div>
          <div className="flex items-center justify-between p-3.5 bg-slate-100/70 rounded-lg border border-slate-200">
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                وضعیت حساب کاربری
              </span>
              <span className="text-[11px] text-slate-500 block">
                کاربران غیرفعال اجازه ورود به پنل را نخواهند داشت.
              </span>
            </div>
            <CustomDropdown
              options={STATUS_OPTIONS}
              value={formData.status}
              onChange={(val) => setFormData({ ...formData, status: val })}
              usePortal={true}
              buttonClassName="bg-white border border-slate-300 text-xs font-bold rounded-lg px-3 py-1.5 text-slate-800 outline-hidden min-w-[130px]"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-lg transition-colors cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-lg shadow-md flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Save size={16} />
              <span>
                {loading
                  ? "در حال ذخیره‌سازی..."
                  : user
                    ? "به‌روزرسانی کاربر"
                    : "ایجاد حساب کاربری"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}