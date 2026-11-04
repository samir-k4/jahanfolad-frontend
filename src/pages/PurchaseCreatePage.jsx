import { useEffect, useMemo, useState } from "react";
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_af from "../utils/persian_af";
import { ArrowRight, Lock, Plus, Save, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { CustomDropdown } from "../components/common";
import { apiFetch, apiList, apiUrl } from "../api";
import { useBranch } from "../context/BranchContext";
import { showToast } from "../utils/toast";
import { formatCurrencyAmount } from "../utils/dariNumberFormatter";

const UNITS = ["کیلوگرم", "تن", "سیر", "خروار", "دانه", "متر", "لیتر", "بسته", "سایر"];
const RAW_MATERIAL_UNITS = ["کیلوگرم", "تن", "سیر", "خروار", "دانه"];
const EMPTY_ITEM = { name: "", quantity: "", unit: "کیلوگرم", unit_price: "", raw_material: false, note: "" };
const money = (value, currency) => formatCurrencyAmount(value, currency);

export default function PurchaseCreatePage() {
  const navigate = useNavigate();
  const { branches } = useBranch();
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [dateObj, setDateObj] = useState(() => new DateObject({ calendar: persian, locale: persian_af }));
  const [form, setForm] = useState({
    supplier_id: "",
    branch_id: "",
    expense_type_id: "",
    expense_category_id: "",
    currency: "AFN",
    paid: "",
    notes: "",
    items: [{ ...EMPTY_ITEM }],
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      apiList("/suppliers?per_page=100"),
      fetch(apiUrl("/expenses/form-defaults")).then((response) => response.ok ? response.json() : null),
    ]).then(([sellerList, defaults]) => {
      setSuppliers(sellerList || []);
      setCategories(defaults?.categories || []);
    }).catch((error) => showToast.error(error.message || "منابع فرم خرید بارگذاری نشد."));
  }, []);

  useEffect(() => {
    if (branches.length === 1) {
      setForm((current) => ({ ...current, branch_id: String(branches[0].id) }));
    }
  }, [branches]);

  const total = useMemo(
    () => form.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_price || 0), 0),
    [form.items],
  );
  const paidAmount = Number(form.paid || 0);
  const remainingAmount = Math.max(total - paidAmount, 0);
  const hasRawMaterial = form.items.some((item) => item.raw_material);
  const expenseTypes = [...new Map(categories.map((category) => [category.expense_type_id, category.expense_type])).values()].filter(Boolean);
  const selectedType = expenseTypes.find((type) => String(type.id) === String(form.expense_type_id));
  const selectedCategory = categories.find((category) => String(category.id) === String(form.expense_category_id));
  const categoryOptions = categories
    .filter((category) => !form.expense_type_id || String(category.expense_type_id) === String(form.expense_type_id))
    .map((category) => ({ value: String(category.id), label: category.name }));

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const updateItem = (index, key, value) => setForm((current) => ({
    ...current,
    items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item),
  }));
  const toggleRawMaterial = (index, checked) => setForm((current) => ({
    ...current,
    items: current.items.map((item, itemIndex) => itemIndex === index
      ? { ...item, raw_material: checked, unit: checked && !RAW_MATERIAL_UNITS.includes(item.unit) ? "کیلوگرم" : item.unit }
      : item),
  }));

  const submit = async (event) => {
    event.preventDefault();
    const selectedSupplier = suppliers.find((seller) => String(seller.id) === String(form.supplier_id));
    const currency = ["AFN", "USD", "IRR"].includes(form.currency) ? form.currency : "AFN";
    const items = form.items.map((item) => ({
      ...item,
      name: String(item.name || "").trim(),
      note: String(item.note || "").trim(),
    }));
    const invalidItemIndex = items.findIndex((item) => !item.name || Number(item.quantity) <= 0 || Number(item.unit_price) < 0);
    if (
      !selectedSupplier
      || !form.expense_category_id
      || !currency
      || (hasRawMaterial && !form.branch_id)
      || invalidItemIndex !== -1
    ) {
      showToast.error(invalidItemIndex !== -1
        ? `نام، مقدار و قیمت قلم شماره ${invalidItemIndex + 1} را تکمیل کنید.`
        : "فروشنده، دسته‌بندی و گدام مواد خام را تکمیل کنید.");
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch("/purchases", {
        method: "POST",
        body: {
          supplier_id: Number(form.supplier_id),
          seller: selectedSupplier.name,
          branch_id: form.branch_id || null,
          shamsi_date: dateObj.format("YYYY/MM/DD"),
          expense_type: selectedType?.name || "",
          category: selectedCategory?.name || "",
          expense_category_id: Number(form.expense_category_id),
          currency,
          paid: paidAmount,
          notes: form.notes,
          items,
        },
      });
      showToast.success("خرید با موفقیت ثبت شد.");
      navigate("/purchases");
    } catch (error) {
      const validationMessages = error.data?.errors
        ? Object.values(error.data.errors).flat().join(" | ")
        : error.message;
      showToast.error(validationMessages || "ثبت خرید انجام نشد.");
    } finally {
      setSubmitting(false);
    }
  };

  const dropdownClass = "mt-1 h-10 w-full border-gray-300 bg-white px-3 text-xs";
  const inputClass = "mt-1 h-10 w-full rounded-input border border-gray-300 bg-white px-3 text-xs text-gray-800 focus:border-emerald-600 focus:outline-none";

  return (
    <div className="space-y-6 pb-16 font-sans text-gray-800" dir="rtl">
      <header className="flex flex-col gap-4 border-b border-gray-200 pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-page-title tracking-tight text-gray-900">ثبت خرید جدید</h1>
          <p className="mt-1 text-subtitle text-gray-500">ثبت خرید، پرداخت و باقی‌مانده حساب فروشنده</p>
        </div>
        <Link to="/purchases" className="inline-flex items-center gap-1.5 rounded-btn border border-gray-300 bg-white px-3.5 py-2 text-btn-text font-bold text-gray-700 hover:bg-gray-50">
          <ArrowRight size={15} /> بازگشت به لیست خریدها
        </Link>
      </header>

      <form onSubmit={submit} className="space-y-6">
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50/80 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-100 font-mono text-xs font-bold text-emerald-800">۱</span>
              <span className="text-sm font-bold text-gray-900">مشخصات اصلی خرید و فروشنده</span>
            </div>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="min-w-0 w-full">
                <label className="mb-1.5 block text-xs font-bold text-gray-800">
                  شماره خرید <span className="font-normal text-gray-500">(خودکار)</span>
                </label>
                <div className="relative">
                  <Lock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value="پس از ثبت تولید می‌شود" readOnly aria-readonly="true" className="h-10 w-full cursor-not-allowed rounded-lg border border-gray-300 bg-gray-100 px-3 pr-9 text-center text-xs font-bold text-gray-500" />
                </div>
                <p className="mt-1 text-[10px] text-gray-500">شماره خرید بعد از ثبت به‌صورت خودکار ایجاد می‌شود.</p>
              </div>
              <div className="min-w-0 w-full">
                <label className="mb-1.5 block text-xs font-bold text-gray-800">انتخاب فروشنده <span className="text-rose-500">*</span></label>
                <CustomDropdown
                  value={form.supplier_id}
                  onChange={(value) => update("supplier_id", value)}
                  options={suppliers.map((seller) => ({ value: String(seller.id), label: `${seller.code} - ${seller.name}` }))}
                  placeholder="انتخاب فروشنده..."
                  buttonClassName={dropdownClass}
                  className="w-full"
                  width="w-full"
                  align="right"
                />
              </div>
              <div className="min-w-0 w-full">
                <label className="mb-1.5 block text-xs font-bold text-gray-800">
                  تاریخ خرید <span className="text-rose-500">*</span>
                </label>
                <DatePicker
                  value={dateObj}
                  onChange={setDateObj}
                  calendar={persian}
                  locale={persian_af}
                  format="YYYY/MM/DD"
                  calendarPosition="bottom-right"
                  inputClass={`${inputClass} rounded-lg text-center`}
                  containerClassName="w-full"
                />
              </div>
              <div className="min-w-0 w-full">
                <label className="mb-1.5 block text-xs font-bold text-gray-800">ارز خرید <span className="text-rose-500">*</span></label>
                <CustomDropdown
                  value={form.currency}
                  onChange={(value) => update("currency", value)}
                  options={[
                    { value: "AFN", label: "افغانی (AFN)" },
                    { value: "USD", label: "دالر (USD)" },
                    { value: "IRR", label: "تومان (IRR)" },
                  ]}
                  buttonClassName={dropdownClass}
                  className="w-full"
                  width="w-full"
                  align="right"
                />
              </div>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-4 border-t border-gray-100 pt-5 sm:grid-cols-2 lg:grid-cols-3">
              <div className="min-w-0 w-full">
                <label className="mb-1.5 block text-xs font-bold text-gray-800">نوع مصرف <span className="text-rose-500">*</span></label>
                <CustomDropdown
                  value={form.expense_type_id}
                  onChange={(value) => setForm((current) => ({ ...current, expense_type_id: value, expense_category_id: "" }))}
                  options={expenseTypes.map((type) => ({ value: String(type.id), label: type.name }))}
                  placeholder="انتخاب نوع مصرف..."
                  buttonClassName={dropdownClass}
                  className="w-full"
                  width="w-full"
                  align="right"
                />
              </div>
              <div className="min-w-0 w-full">
                <label className="mb-1.5 block text-xs font-bold text-gray-800">دسته‌بندی مصرف <span className="text-rose-500">*</span></label>
                <CustomDropdown
                  value={form.expense_category_id}
                  onChange={(value) => update("expense_category_id", value)}
                  options={categoryOptions}
                  placeholder={form.expense_type_id ? "انتخاب دسته‌بندی..." : "ابتدا نوع مصرف را انتخاب کنید"}
                  disabled={!form.expense_type_id}
                  buttonClassName={dropdownClass}
                  className="w-full"
                  width="w-full"
                  align="right"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-card border border-gray-200 bg-white p-5 shadow-2xs">
          <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-100 font-mono text-xs font-bold text-emerald-800">۲</span>
              <h2 className="text-sm font-bold text-gray-900">اقلام خرید</h2>
            </div>
            <button type="button" onClick={() => update("items", [...form.items, { ...EMPTY_ITEM }])} className="inline-flex items-center gap-1.5 rounded-btn border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100">
              <Plus size={15} /> افزودن قلم
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse border border-gray-200 text-center text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-center font-bold text-gray-700">
                  {["نام قلم", "مقدار", "واحد", "قیمت واحد", "مواد خام", "یادداشت", "عملیات"].map((title) => (
                    <th key={title} className="border border-gray-200 px-3 py-2.5">{title}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {form.items.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50/70">
                    <td className="border border-gray-200 p-2"><input value={item.name} onChange={(event) => updateItem(index, "name", event.target.value)} className="w-full rounded-input border border-gray-300 px-2.5 py-2 text-center text-xs focus:border-emerald-600 focus:outline-none" placeholder="نام قلم" /></td>
                    <td className="border border-gray-200 p-2"><input type="number" min="0" step="0.001" value={item.quantity} onChange={(event) => updateItem(index, "quantity", event.target.value)} className="w-24 rounded-input border border-gray-300 px-2.5 py-2 text-center text-xs focus:border-emerald-600 focus:outline-none" placeholder="0.0" dir="ltr" /></td>
                    <td className="border border-gray-200 p-2"><CustomDropdown value={item.unit} onChange={(value) => updateItem(index, "unit", value)} options={(item.raw_material ? RAW_MATERIAL_UNITS : UNITS).map((unit) => ({ value: unit, label: unit }))} buttonClassName="w-32 border-gray-300 bg-white px-2 py-2 text-center text-xs" width="w-32" align="right" /></td>
                    <td className="border border-gray-200 p-2"><input type="number" min="0" step="0.01" value={item.unit_price} onChange={(event) => updateItem(index, "unit_price", event.target.value)} className="w-28 rounded-input border border-gray-300 px-2.5 py-2 text-center text-xs focus:border-emerald-600 focus:outline-none" placeholder="0.0" dir="ltr" /></td>
                    <td className="border border-gray-200 p-2 text-center"><input type="checkbox" checked={item.raw_material} onChange={(event) => toggleRawMaterial(index, event.target.checked)} className="h-4 w-4 accent-emerald-600" /></td>
                    <td className="border border-gray-200 p-2"><input value={item.note} onChange={(event) => updateItem(index, "note", event.target.value)} className="w-full rounded-input border border-gray-300 px-2.5 py-2 text-center text-xs focus:border-emerald-600 focus:outline-none" placeholder="یادداشت" /></td>
                    <td className="border border-gray-200 p-2 text-center"><button type="button" disabled={form.items.length === 1} onClick={() => update("items", form.items.filter((_, itemIndex) => itemIndex !== index))} className="rounded p-1 text-rose-600 hover:bg-rose-50 disabled:opacity-30" aria-label="حذف قلم"><Trash2 size={15} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hasRawMaterial && (
            <div className="mt-5 max-w-sm border-t border-gray-100 pt-5">
              <label className="mb-1.5 block text-xs font-bold text-gray-800">
                گدام <span className="text-rose-500">*</span>
              </label>
              <CustomDropdown
                value={form.branch_id}
                onChange={(value) => update("branch_id", value)}
                options={branches.map((branch) => ({ value: String(branch.id), label: branch.name }))}
                placeholder="انتخاب گدام..."
                buttonClassName={dropdownClass}
                className="w-full"
                width="w-full"
                align="right"
              />
            </div>
          )}
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-card border border-gray-200 bg-white p-5 shadow-2xs">
            <div className="mb-5 flex items-center gap-2.5 border-b border-gray-100 pb-3">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-100 font-mono text-xs font-bold text-emerald-800">۳</span>
              <h2 className="text-sm font-bold text-gray-900">خلاصه خرید</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-btn border border-gray-200 bg-gray-50 px-3.5 py-3">
                <span className="text-xs text-gray-500">مجموع خرید</span>
                <span className="font-mono text-base font-bold text-gray-900" dir="ltr">{money(total, form.currency)} <span className="text-xs font-normal">{form.currency}</span></span>
              </div>
              <div className="flex items-center justify-between rounded-btn border border-gray-200 px-3.5 py-3">
                <span className="text-xs text-gray-500">تعداد اقلام</span>
                <span className="font-mono text-sm font-bold text-gray-900">{form.items.length}</span>
              </div>
            </div>
          </section>

          <section className="rounded-card border border-gray-200 bg-white p-5 shadow-2xs">
            <div className="mb-5 flex items-center gap-2.5 border-b border-gray-100 pb-3">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-100 font-mono text-xs font-bold text-emerald-800">۴</span>
              <h2 className="text-sm font-bold text-gray-900">پرداخت و بدهی</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-bold text-gray-800">
                مبلغ پرداختی
                <input type="number" min="0" step="0.01" value={form.paid} onChange={(event) => update("paid", event.target.value)} placeholder="0.0" className={`${inputClass} text-center`} dir="ltr" />
              </label>
              <div className="rounded-btn border border-amber-200 bg-amber-50 p-3.5">
                <p className="text-xs text-amber-800">باقی‌مانده بدهی</p>
                <p className="mt-1 font-mono text-lg font-bold text-amber-900" dir="ltr">{money(remainingAmount, form.currency)} <span className="text-xs font-normal">{form.currency}</span></p>
              </div>
            </div>
            <label className="mt-4 block text-xs font-bold text-gray-800">
              یادداشت پرداخت
              <textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} rows={3} placeholder="یادداشت" className="mt-1 w-full rounded-input border border-gray-300 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none" />
            </label>
          </section>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Link to="/purchases" className="inline-flex items-center justify-center rounded-btn border border-gray-300 bg-white px-6 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50">انصراف</Link>
          <button disabled={submitting} className="inline-flex items-center justify-center gap-2 rounded-btn bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60">
            <Save size={16} /> {submitting ? "در حال ثبت..." : "ثبت خرید"}
          </button>
        </div>
      </form>
    </div>
  );
}
