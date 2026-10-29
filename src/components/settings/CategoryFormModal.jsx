import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  X,
  Tag,
  Layers,
  Save,
  AlertCircle,
  Briefcase,
} from "lucide-react";
import { apiFetch } from "../../api";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import SearchableSelect from "../common/SearchableSelect";
import CustomDropdown from "../common/CustomDropdown";

const DOMAIN_OPTIONS = [
  { value: "product_category", label: "دسته‌بندی محصولات (Product Category)" },
  { value: "expense_type", label: "نوعیت مصارف (Expense Type)" },
  { value: "expense_category", label: "سرفصل مصارف شرکت (Expense Category)" },
  { value: "job_category", label: "دسته پرسونل (Job Category)" },
  { value: "job_position", label: "عنوان و سمت شغلی (Job Position)" },
  { value: "warehouse_category", label: "دسته‌بندی گدام و انبار (Warehouse Category)" },
  { value: "vault_type", label: "نوع حساب و دخل خزانه (Vault Type)" },
];

export default function CategoryFormModal({
  isOpen,
  onClose,
  category,
  defaultDomain = "expense_category",
  jobCategories = [],
  expenseTypes = [],
  onSaved,
}) {
  const { t } = useTranslation("settings");
  useBodyScrollLock(isOpen);

  const [formData, setFormData] = useState({
    domain: defaultDomain,
    name: "",
    job_category_id: "",
    pay_mode: "monthly",
    month_basis: "fixed_30",
    paid_leave: true,
    paid_sick_leave: true,
    overtime_eligible: false,
    expense_type_id: "",
    description: "",
    is_active: true,
    is_locked: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    if (category) {
      setFormData({
        domain: category._domain || defaultDomain,
        name: category.name || "",
        job_category_id: category.job_category_id ? String(category.job_category_id) : "",
        pay_mode: category.pay_mode || "monthly",
        month_basis: category.month_basis || "fixed_30",
        paid_leave: Boolean(category.paid_leave),
        paid_sick_leave: Boolean(category.paid_sick_leave),
        overtime_eligible: Boolean(category.overtime_eligible),
        expense_type_id: category.expense_type_id ? String(category.expense_type_id) : "",
        description: category.description || "",
        is_active: category.is_active !== undefined ? category.is_active : true,
        is_locked: Boolean(category.is_locked),
      });
    } else {
      setFormData({
        domain: defaultDomain,
        name: "",
        job_category_id: "",
        pay_mode: "monthly",
        month_basis: "fixed_30",
        paid_leave: true,
        paid_sick_leave: true,
        overtime_eligible: false,
        expense_type_id: "",
        description: "",
        is_active: true,
        is_locked: false,
      });
    }
    setError(null);
  }, [isOpen, category, defaultDomain]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError("لطفاً عنوان دسته‌بندی را وارد نمایید.");
      return;
    }

    if (formData.domain === "expense_category" && !formData.expense_type_id) {
      setError("لطفاً نوعیت مصرف مربوطه را انتخاب نمایید.");
      return;
    }

    setLoading(true);

    try {
      const targetDomain = formData.domain;
      const payload = {
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        is_active: formData.is_active,
      };

      if (targetDomain === "job_category") {
        payload.pay_mode = formData.pay_mode;
        payload.month_basis = formData.month_basis;
        payload.paid_leave = formData.paid_leave;
        payload.paid_sick_leave = formData.paid_sick_leave;
        payload.overtime_eligible = formData.overtime_eligible;
      }

      if (targetDomain === "job_position" && formData.job_category_id) {
        payload.job_category_id = formData.job_category_id;
      }

      if (targetDomain === "expense_category") {
        payload.expense_type_id = formData.expense_type_id || null;
        payload.is_locked = formData.is_locked;
      }

      const domainPath = encodeURIComponent(targetDomain);
      const resData = await apiFetch(
        category
          ? `/categories/${domainPath}/${category.id}`
          : `/categories/${domainPath}`,
        { method: category ? "PUT" : "POST", body: payload },
      );

      // onSaved expects a message STRING — passing resData would render an
      // object in the toast and crash the page (same bug as UserFormModal).
      if (onSaved) {
        onSaved(
          resData?.message ||
            (category
              ? "دسته‌بندی با موفقیت به‌روزرسانی شد."
              : "دسته‌بندی جدید با موفقیت ایجاد شد."),
        );
      }
      onClose();
    } catch (err) {
      console.error("Category save error:", err);
      const fieldErrors = err.data?.errors
        ? Object.values(err.data.errors).flat().join(" - ")
        : null;
      setError(err.message || fieldErrors || "خطا در ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  };

  const expenseTypeOptions = [
    { value: "", label: "-- بدون نوعیت مشخص --" },
    ...expenseTypes.map((t) => ({
      value: String(t.id),
      label: t.name,
    })),
  ];

  const jobCategoryOptions = [
    { value: "", label: "-- بدون انتخاب دسته والد --" },
    ...jobCategories.map((jc) => ({
      value: String(jc.id),
      label: jc.name,
    })),
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs font-sans">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-white text-gray-900 px-6 py-4 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Tag size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-900">
                {category
                  ? `ویرایش: ${category.name}`
                  : "افزودن دسته‌بندی جدید"}
              </h3>
              <p className="text-xs text-gray-500">
                ثبت عنوان در پایگاه داده جهت استفاده در سیستم
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              حوزه دسته‌بندی *
            </label>
            <CustomDropdown
              options={DOMAIN_OPTIONS}
              value={formData.domain}
              onChange={(val) => setFormData({ ...formData, domain: val })}
              disabled={!!category}
              usePortal={true}
              buttonClassName="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium bg-slate-50 focus:bg-white outline-none text-right disabled:opacity-60"
            />
          </div>

          {formData.domain === "expense_category" && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                نوعیت مصرف مربوطه (Expense Type) <span className="text-rose-600">*</span>
              </label>
              <SearchableSelect
                options={expenseTypeOptions}
                value={formData.expense_type_id}
                onChange={(val) => setFormData({ ...formData, expense_type_id: val })}
                placeholder="انتخاب نوعیت مصرف..."
                searchPlaceholder="جستجوی نوعیت..."
                usePortal={true}
                buttonClassName="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium bg-slate-50 focus:bg-white outline-none"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                مثلاً سرفصل «معاشات» به نوعیت «مصارف ماهانه» تعلق می‌گیرد.
              </p>
            </div>
          )}

          {formData.domain === "job_category" && (
            <div className="space-y-3 rounded-card border border-gray-200 bg-gray-50/70 p-3">
              <div>
                <label className="block text-label-text text-gray-700 mb-1">
                  {t("categories.payMode")}
                </label>
                <div className="flex items-center gap-2">
                  {["monthly", "daily"].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setFormData({ ...formData, pay_mode: mode })}
                      className={`flex-1 rounded-btn border px-3 py-2 text-caption-text font-bold cursor-pointer transition-colors ${
                        formData.pay_mode === mode
                          ? "bg-slate-800 text-white border-slate-800"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {t(`categories.payMode_${mode}`)}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-caption-text text-gray-500">
                  {t(`categories.payModeHint_${formData.pay_mode}`)}
                </p>
              </div>
              <div>
                <label className="block text-label-text text-gray-700 mb-1">
                  {t("categories.monthBasis")}
                </label>
                <div className="flex items-center gap-2">
                  {["fixed_30", "actual"].map((basis) => (
                    <button
                      key={basis}
                      type="button"
                      onClick={() => setFormData({ ...formData, month_basis: basis })}
                      className={`flex-1 rounded-btn border px-3 py-2 text-caption-text font-bold cursor-pointer transition-colors ${
                        formData.month_basis === basis
                          ? "bg-slate-800 text-white border-slate-800"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {t(`categories.monthBasis_${basis}`)}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-caption-text text-gray-500">
                  {t(`categories.monthBasisHint_${formData.month_basis}`)}
                </p>
              </div>
              <div className="space-y-1.5 border-t border-gray-200 pt-2.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.paid_leave}
                    onChange={(e) => setFormData({ ...formData, paid_leave: e.target.checked })}
                    className="cursor-pointer"
                  />
                  <span className="text-label-text text-gray-700">{t("categories.paidLeave")}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.paid_sick_leave}
                    onChange={(e) => setFormData({ ...formData, paid_sick_leave: e.target.checked })}
                    className="cursor-pointer"
                  />
                  <span className="text-label-text text-gray-700">{t("categories.paidSickLeave")}</span>
                </label>
                <p className="text-caption-text text-gray-500">{t("categories.paidLeaveHint")}</p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer border-t border-gray-200 pt-2.5">
                <input
                  type="checkbox"
                  checked={formData.overtime_eligible}
                  onChange={(e) => setFormData({ ...formData, overtime_eligible: e.target.checked })}
                  className="cursor-pointer"
                />
                <span className="text-label-text text-gray-700">{t("categories.overtimeEligible")}</span>
              </label>
            </div>
          )}

          {formData.domain === "job_position" && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                دسته پرسونل مربوطه (Job Category)
              </label>
              <SearchableSelect
                options={jobCategoryOptions}
                value={formData.job_category_id}
                onChange={(val) => setFormData({ ...formData, job_category_id: val })}
                placeholder="انتخاب دسته پرسونل..."
                searchPlaceholder="جستجوی دسته..."
                usePortal={true}
                buttonClassName="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium bg-slate-50 focus:bg-white outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              عنوان دسته‌بندی *
            </label>
            <div className="relative">
              <Tag
                size={16}
                className="absolute right-3 top-3 text-slate-400"
              />
              <input
                type="text"
                required
                placeholder="عنوان را وارد کنید..."
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-hidden transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              توضیحات تکمیلی (اختیاری)
            </label>
            <textarea
              rows={3}
              placeholder="توضیحاتی در مورد این سرفصل یا شرایط استفاده بنویسید..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-hidden transition-all resize-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) =>
                setFormData({ ...formData, is_active: e.target.checked })
              }
              className="w-4 h-4 rounded-sm text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
            />
            <label htmlFor="is_active" className="text-xs font-bold text-slate-700 cursor-pointer">
              وضعیت فعال (در فرم‌ها و لیست‌ها نمایش داده شود)
            </label>
          </div>
          {formData.domain === "expense_category" && (
            <div className="flex items-start gap-2 pt-1">
              <input
                type="checkbox"
                id="is_locked"
                checked={formData.is_locked}
                onChange={(e) =>
                  setFormData({ ...formData, is_locked: e.target.checked })
                }
                className="w-4 h-4 mt-0.5 rounded-sm text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
              />
              <label htmlFor="is_locked" className="text-xs font-bold text-slate-700 cursor-pointer">
                محافظت از این سرفصل در برابر حذف
                <span className="block text-[11px] text-slate-500 font-normal mt-0.5">
                  سرفصل محافظت‌شده فقط با غیرفعال‌سازی قابل مدیریت است.
                </span>
              </label>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-lg transition-colors cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-lg shadow-md flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Save size={16} />
              <span>{loading ? "در حال ذخیره..." : "ذخیره تغییرات"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
