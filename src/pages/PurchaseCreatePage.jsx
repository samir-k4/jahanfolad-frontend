import { useEffect, useMemo, useState } from "react";
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_af from "../utils/persian_af";
import { ArrowRight, Plus, Save, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { CustomDropdown } from "../components/common";
import { apiFetch, apiList, apiUrl } from "../api";
import { useBranch } from "../context/BranchContext";
import { showToast } from "../utils/toast";

const UNITS = ["کیلوگرم", "تن", "سیر", "خروار", "دانه", "متر", "لیتر", "بسته", "سایر"];
const EMPTY_ITEM = { name: "", quantity: "", unit: "کیلوگرم", unit_price: "", raw_material: false, note: "" };
const money = (value) => Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function PurchaseCreatePage() {
  const navigate = useNavigate();
  const { branches } = useBranch();
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [dateObj, setDateObj] = useState(() => new DateObject({ calendar: persian, locale: persian_af }));
  const [form, setForm] = useState({ supplier_id: "", branch_id: "", expense_type_id: "", expense_category_id: "", currency: "AFN", paid: "", notes: "", items: [{ ...EMPTY_ITEM }] });
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
    if (branches.length === 1) setForm((current) => ({ ...current, branch_id: String(branches[0].id) }));
  }, [branches]);
  const total = useMemo(() => form.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_price || 0), 0), [form.items]);
  const selectedType = [...new Map(categories.map((category) => [category.expense_type_id, category.expense_type])).values()].find((type) => String(type?.id) === String(form.expense_type_id));
  const selectedCategory = categories.find((category) => String(category.id) === String(form.expense_category_id));
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const updateItem = (index, key, value) => setForm((current) => ({ ...current, items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item) }));
  const submit = async (event) => {
    event.preventDefault();
    const hasRaw = form.items.some((item) => item.raw_material);
    if (!form.supplier_id || !form.expense_category_id || (hasRaw && !form.branch_id) || form.items.some((item) => !item.name.trim() || Number(item.quantity) <= 0 || Number(item.unit_price) < 0)) {
      showToast.error("فروشنده، دسته‌بندی، شعبه مواد خام و اطلاعات اقلام را تکمیل کنید.");
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch("/purchases", {
        method: "POST",
        body: JSON.stringify({
          supplier_id: form.supplier_id,
          seller: suppliers.find((seller) => String(seller.id) === String(form.supplier_id))?.name,
          branch_id: form.branch_id || null,
          shamsi_date: dateObj.format("YYYY/MM/DD"),
          expense_type: selectedType?.name || "",
          category: selectedCategory?.name || "",
          currency: form.currency,
          paid: Number(form.paid || 0),
          notes: form.notes,
          items: form.items,
        }),
      });
      showToast.success("خرید با موفقیت ثبت شد.");
      navigate("/purchases");
    } catch (error) {
      showToast.error(error.message || "ثبت خرید انجام نشد.");
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="space-y-6 pb-16 font-sans text-gray-800" dir="rtl">
      <header className="flex flex-col gap-4 border-b border-gray-200 pb-4 md:flex-row md:items-center md:justify-between"><div><h1 className="text-xl font-bold tracking-tight text-gray-900">ثبت خرید جدید</h1><p className="mt-1 text-xs text-gray-500">ثبت خرید، پرداخت و باقی‌مانده حساب فروشنده</p></div><Link to="/purchases" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"><ArrowRight size={15} /> بازگشت به لیست خریدها</Link></header>
      <form onSubmit={submit} className="space-y-6">
        <section className="rounded-card border border-gray-200 bg-white p-5 shadow-2xs"><h2 className="mb-4 border-b border-gray-100 pb-3 text-sm font-bold">مشخصات خرید</h2><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div><label className="text-xs font-bold">فروشنده</label><CustomDropdown value={form.supplier_id} onChange={(value) => update("supplier_id", value)} options={suppliers.map((seller) => ({ value: String(seller.id), label: `${seller.code} - ${seller.name}` }))} placeholder="انتخاب فروشنده..." buttonClassName="mt-1 w-full border-gray-300 bg-white px-3 py-2 text-xs" width="w-full" align="right" /></div>
          <label className="text-xs font-bold">تاریخ شمسی<DatePicker value={dateObj} onChange={setDateObj} calendar={persian} locale={persian_af} format="YYYY/MM/DD" inputClass="mt-1 h-10 w-full rounded-input border border-gray-300 px-3 text-xs" /></label>
          <div><label className="text-xs font-bold">نوع مصرف</label><CustomDropdown value={form.expense_type_id} onChange={(value) => update("expense_type_id", value)} options={[...new Map(categories.map((category) => [category.expense_type_id, category.expense_type])).values()].filter(Boolean).map((type) => ({ value: String(type.id), label: type.name }))} placeholder="انتخاب نوع مصرف..." buttonClassName="mt-1 w-full border-gray-300 bg-white px-3 py-2 text-xs" width="w-full" align="right" /></div>
          <div><label className="text-xs font-bold">دسته‌بندی مصرف</label><CustomDropdown value={form.expense_category_id} onChange={(value) => update("expense_category_id", value)} options={categories.filter((category) => !form.expense_type_id || String(category.expense_type_id) === String(form.expense_type_id)).map((category) => ({ value: String(category.id), label: category.name }))} placeholder="انتخاب دسته‌بندی..." buttonClassName="mt-1 w-full border-gray-300 bg-white px-3 py-2 text-xs" width="w-full" align="right" /></div>
          <div><label className="text-xs font-bold">ارز</label><CustomDropdown value={form.currency} onChange={(value) => update("currency", value)} options={[{ value: "AFN", label: "افغانی (AFN)" }, { value: "USD", label: "دالر (USD)" }, { value: "IRR", label: "تومان (IRR)" }]} buttonClassName="mt-1 w-full border-gray-300 bg-white px-3 py-2 text-xs" width="w-full" align="right" /></div>
          <div><label className="text-xs font-bold">شعبه / گدام</label><CustomDropdown value={form.branch_id} onChange={(value) => update("branch_id", value)} options={branches.map((branch) => ({ value: String(branch.id), label: branch.name }))} placeholder="انتخاب شعبه..." buttonClassName="mt-1 w-full border-gray-300 bg-white px-3 py-2 text-xs" width="w-full" align="right" /></div>
        </div></section>
        <section className="rounded-card border border-gray-200 bg-white p-5 shadow-2xs"><div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3"><h2 className="text-sm font-bold">اقلام خرید</h2><button type="button" onClick={() => update("items", [...form.items, { ...EMPTY_ITEM }])} className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline"><Plus size={15} /> افزودن قلم</button></div><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-right text-xs"><thead className="bg-gray-50"><tr>{["نام قلم", "مقدار", "واحد", "قیمت واحد", "مواد خام", "یادداشت", "عملیات"].map((title) => <th key={title} className="border-l border-gray-200 px-2.5 py-2.5">{title}</th>)}</tr></thead><tbody>{form.items.map((item, index) => <tr key={index} className="border-t border-gray-100"><td className="p-2"><input value={item.name} onChange={(e) => updateItem(index, "name", e.target.value)} className="w-full rounded-input border border-gray-300 px-2 py-2 text-xs" placeholder="نام خرید" /></td><td className="p-2"><input type="number" min="0" step="0.001" value={item.quantity} onChange={(e) => updateItem(index, "quantity", e.target.value)} className="w-24 rounded-input border border-gray-300 px-2 py-2 text-xs" /></td><td className="p-2"><CustomDropdown value={item.unit} onChange={(value) => updateItem(index, "unit", value)} options={UNITS.map((unit) => ({ value: unit, label: unit }))} buttonClassName="border-gray-300 bg-white px-2 py-2 text-xs" width="w-32" align="right" /></td><td className="p-2"><input type="number" min="0" step="0.01" value={item.unit_price} onChange={(e) => updateItem(index, "unit_price", e.target.value)} className="w-28 rounded-input border border-gray-300 px-2 py-2 text-xs" /></td><td className="p-2 text-center"><input type="checkbox" checked={item.raw_material} onChange={(e) => updateItem(index, "raw_material", e.target.checked)} /></td><td className="p-2"><input value={item.note} onChange={(e) => updateItem(index, "note", e.target.value)} className="w-full rounded-input border border-gray-300 px-2 py-2 text-xs" /></td><td className="p-2 text-center"><button type="button" disabled={form.items.length === 1} onClick={() => update("items", form.items.filter((_, itemIndex) => itemIndex !== index))} className="text-rose-600 disabled:opacity-30"><Trash2 size={15} /></button></td></tr>)}</tbody></table></div></section>
        <section className="grid gap-4 rounded-card border border-gray-200 bg-white p-5 shadow-2xs md:grid-cols-3"><div className="rounded-lg bg-gray-50 p-3 text-xs">مجموع خرید: <b dir="ltr">{money(total)} {form.currency}</b></div><label className="text-xs font-bold">مبلغ پرداخت‌شده<input type="number" min="0" step="0.01" value={form.paid} onChange={(e) => update("paid", e.target.value)} className="mt-1 h-10 w-full rounded-input border border-gray-300 px-3 text-xs" /></label><div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">باقی‌مانده: <b dir="ltr">{money(Math.max(total - Number(form.paid || 0), 0))} {form.currency}</b></div><label className="text-xs font-bold md:col-span-3">یادداشت<textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={3} className="mt-1 w-full rounded-input border border-gray-300 px-3 py-2 text-xs" /></label></section>
        <div className="flex justify-end"><button disabled={submitting} className="inline-flex items-center gap-2 rounded-btn bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"><Save size={16} /> {submitting ? "در حال ثبت..." : "ثبت خرید"}</button></div>
      </form>
    </div>
  );
}
