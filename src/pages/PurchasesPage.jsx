import { useCallback, useEffect, useMemo, useState } from "react";
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_af from "../utils/persian_af";
import { Link, useNavigate } from "react-router-dom";
import { Edit3, Plus, Printer, Search, RefreshCw, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { apiFetch, apiList, apiUrl } from "../api";
import { showToast } from "../utils/toast";
import { formatCurrencyAmount } from "../utils/dariNumberFormatter";
import { TablePagination, TooltipButton } from "../components/common";
import PurchasePreviewModal from "../components/purchases/PurchasePreviewModal";
import { useBranch } from "../context/BranchContext";

const EMPTY_ITEM = { name: "", quantity: "", unit: "کیلوگرم", unit_price: "", raw_material: false, note: "" };
const UNITS = ["کیلوگرم", "تن", "سیر", "خروار", "دانه", "متر", "لیتر", "بسته", "سایر"];
const RAW_MATERIAL_UNITS = ["کیلوگرم", "تن", "سیر", "خروار", "دانه"];
const money = (value, currency) => formatCurrencyAmount(value, currency);

export default function PurchasesPage() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const { branches } = useBranch();
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingPurchaseId, setEditingPurchaseId] = useState(null);
  const [previewPurchase, setPreviewPurchase] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0, per_page: 15 });
  const [dateObj, setDateObj] = useState(() => new DateObject({ calendar: persian, locale: persian_af }));
  const [form, setForm] = useState({
    supplier_id: "",
    branch_id: "",
    supplier_name: "",
    supplier_code: "",
    expense_type_id: "",
    expense_category_id: "",
    currency: "AFN",
    paid_amount: "",
    notes: "",
    items: [{ ...EMPTY_ITEM }],
  });

  const loadPurchases = useCallback(async (nextPage = page) => {
    setLoading(true);
    try {
      const result = await apiFetch(`/purchases?${new URLSearchParams({ page: nextPage, per_page: 15, search })}`);
      setPurchases(result.data || []);
      setPagination(result.pagination || {
        current_page: result.current_page || 1,
        last_page: result.last_page || 1,
        total: result.total || 0,
        per_page: result.per_page || 15,
      });
    } catch (error) {
      showToast.error(error.message || "بارگذاری خریدها انجام نشد.");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    Promise.all([
      apiList("/suppliers"),
      fetch(apiUrl("/expenses/form-defaults")).then((response) => response.ok ? response.json() : null),
    ]).then(([supplierList, defaults]) => {
      setSuppliers(supplierList || []);
      setCategories(defaults?.categories || []);
    }).catch((error) => showToast.error(error.message || "منابع فرم خرید بارگذاری نشد."));
  }, []);

  useEffect(() => { loadPurchases(1); }, [search]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (branches.length === 1) {
      setForm((current) => ({ ...current, branch_id: String(branches[0].id) }));
    }
  }, [branches]);

  const total = useMemo(
    () => form.items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0), 0),
    [form.items],
  );
  const paid = Number(form.paid_amount) || 0;
  const remaining = Math.max(total - paid, 0);

  const updateForm = (key, value) => setForm((current) => ({ ...current, [key]: value }));
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
  const selectSupplier = (value) => {
    const supplier = suppliers.find((item) => String(item.id) === String(value));
    setForm((current) => ({
      ...current,
      supplier_id: value,
      supplier_name: supplier?.name || "",
      supplier_code: supplier?.code || "",
    }));
  };
  const resetForm = () => {
    setEditingPurchaseId(null);
    setForm({ supplier_id: "", branch_id: branches.length === 1 ? String(branches[0].id) : "", supplier_name: "", supplier_code: "", expense_type_id: "", expense_category_id: "", currency: "AFN", paid_amount: "", notes: "", items: [{ ...EMPTY_ITEM }] });
    setDateObj(new DateObject({ calendar: persian, locale: persian_af }));
  };
  const editPurchase = (purchase) => {
    setEditingPurchaseId(purchase.id);
    setForm({
      supplier_id: String(purchase.supplier_id || purchase.supplier?.id || ""),
      branch_id: String(purchase.branch_id || ""),
      supplier_name: purchase.supplier?.name || purchase.seller || "",
      supplier_code: purchase.supplier?.code || "",
      expense_type_id: String(purchase.expense_category?.expense_type_id || ""),
      expense_category_id: String(purchase.expense_category_id || purchase.expense_category?.id || ""),
      currency: purchase.currency || "AFN",
      paid_amount: String(purchase.paid || ""),
      notes: purchase.notes || "",
      items: (purchase.items || []).map((item) => ({
        ...EMPTY_ITEM,
        ...item,
        quantity: String(item.quantity ?? ""),
        unit_price: String(item.unit_price ?? ""),
        raw_material: Boolean(item.raw_material),
      })),
    });
    setShowForm(true);
  };
  const deletePurchase = async (purchase) => {
    if (!window.confirm(`بل خرید «${purchase.purchase_number || purchase.id}» حذف شود؟`)) return;
    try {
      await apiFetch(`/purchases/${purchase.id}`, { method: "DELETE" });
      showToast.success("بل خرید حذف شد.");
      loadPurchases(page);
    } catch (error) {
      showToast.error(error.message || "حذف بل خرید انجام نشد.");
    }
  };
  const submit = async (event) => {
    event.preventDefault();
    const currency = ["AFN", "USD", "IRR"].includes(form.currency) ? form.currency : "AFN";
    const items = form.items.map((item) => ({
      ...item,
      name: String(item.name || "").trim(),
      note: String(item.note || "").trim(),
    }));
    const invalidItemIndex = items.findIndex((item) => !item.name || Number(item.quantity) <= 0 || Number(item.unit_price) < 0);
    if (!form.supplier_id || !form.expense_category_id || (items.some((item) => item.raw_material) && !form.branch_id) || invalidItemIndex !== -1) {
      showToast.error(invalidItemIndex !== -1
        ? `نام، مقدار و قیمت قلم شماره ${invalidItemIndex + 1} را تکمیل کنید.`
        : "فروشنده، دسته‌بندی و گدام مواد خام را تکمیل کنید.");
      return;
    }
    try {
      const selectedType = [...new Map(categories.map((category) => [category.expense_type_id, category.expense_type])).values()]
        .find((type) => String(type?.id) === String(form.expense_type_id));
      const selectedCategory = categories.find((category) => String(category.id) === String(form.expense_category_id));
      await apiFetch(editingPurchaseId ? `/purchases/${editingPurchaseId}` : "/purchases", {
        method: editingPurchaseId ? "PUT" : "POST",
        body: {
          supplier_id: form.supplier_id,
          branch_id: form.branch_id || null,
          seller: form.supplier_name,
          shamsi_date: dateObj.format("YYYY/MM/DD"),
          expense_type: selectedType?.name || "",
          category: selectedCategory?.name || "",
          expense_category_id: form.expense_category_id ? Number(form.expense_category_id) : null,
          currency,
          paid: paid,
          notes: form.notes,
          items,
        },
      });
      showToast.success("خرید با موفقیت ثبت شد.");
      setShowForm(false);
      resetForm();
      loadPurchases(1);
    } catch (error) {
      const validationMessages = error.data?.errors
        ? Object.values(error.data.errors).flat().join(" | ")
        : error.message;
      showToast.error(validationMessages || "ثبت خرید انجام نشد.");
    }
  };

  return (
    <section className="w-full space-y-4 font-sans" dir="rtl">
      <header className="flex flex-col gap-4 border-b border-line pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-content">خرید</h1>
          <p className="mt-1 text-xs font-medium text-content-subtle">ثبت خرید مواد خام و سایر مصارف از فروشندگان</p>
        </div>
        <button type="button" onClick={() => navigate("/purchases/create")} className="inline-flex items-center gap-1.5 rounded-btn bg-emerald-600 px-4 py-2 text-btn-text font-bold text-white shadow-xs hover:bg-emerald-700">
          <Plus size={16} /> ثبت خرید جدید
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-3.5 shadow-2xs">
        <div className="relative min-w-[240px] flex-1">
          <Search size={15} className="absolute right-3 top-2.5 text-content-faint" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="جستجوی شماره، فروشنده یا شرح..." className="w-full rounded-input border border-line-strong bg-surface py-1.5 pl-3 pr-9 text-xs text-content focus:border-accent focus:outline-none" />
        </div>
        <TooltipButton icon={<RefreshCw size={14} className={loading ? "animate-spin" : ""} />} tooltip="به‌روزرسانی" onClick={() => loadPurchases(page)} colorClass="border border-line-strong bg-surface text-content-body hover:bg-slate-800 hover:text-white" />
      </div>

      <div className="overflow-hidden rounded-table border border-line bg-surface shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-center text-xs">
            <thead><tr className="border-b border-line bg-surface-muted font-bold text-content-body">
              {["ردیف", "شماره خرید", "تاریخ", "فروشنده", "نوع مصرف", "مجموع", "پرداخت‌شده", "باقی‌مانده", "وضعیت", "عملیات"].map((heading) => <th key={heading} className="whitespace-nowrap border-l border-line px-3.5 py-2.5 text-center">{heading}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-line bg-surface">
              {loading ? <tr><td colSpan={10} className="p-12 text-center text-content-subtle">در حال بارگذاری...</td></tr> : purchases.length === 0 ? <tr><td colSpan={10} className="p-12 text-center text-content-subtle">هنوز خریدی ثبت نشده است.</td></tr> : purchases.map((purchase, index) => (
                <tr key={purchase.id} className="hover:bg-surface-muted">
                  <td className="border-l border-line px-3.5 py-2.5 text-center font-mono">{index + 1}</td>
                  <td className="border-l border-line px-3.5 py-2.5 text-center font-mono font-bold">{purchase.purchase_number || `P-${String(purchase.id).padStart(4, "0")}`}</td>
                  <td className="border-l border-line px-3.5 py-2.5 text-center">{purchase.shamsi_date || "—"}</td>
                  <td className="border-l border-line px-3.5 py-2.5 text-center font-bold">{purchase.supplier?.name || purchase.seller || "—"}</td>
                  <td className="border-l border-line px-3.5 py-2.5 text-center">{purchase.category || "—"}</td>
                  <td className="border-l border-line px-3.5 py-2.5 text-center font-mono">{money(purchase.total, purchase.currency)} {purchase.currency}</td>
                  <td className="border-l border-line px-3.5 py-2.5 text-center font-mono">{money(purchase.paid, purchase.currency)} {purchase.currency}</td>
                  <td className="border-l border-line px-3.5 py-2.5 text-center font-mono font-bold">{money(purchase.remaining, purchase.currency)} {purchase.currency}</td>
                  <td className="border-l border-line px-3.5 py-2.5 text-center">{purchase.status === "paid" ? "پرداخت‌شده" : purchase.status === "partial" ? "قسمتی پرداخت‌شده" : "پرداخت‌نشده"}</td>
                  <td className="px-3.5 py-2.5 text-center"><div className="flex justify-center gap-1.5"><button type="button" onClick={() => editPurchase(purchase)} className="rounded border border-line-strong p-1.5 text-content-subtle hover:bg-slate-800 hover:text-white" title="ویرایش" aria-label="ویرایش"><Edit3 size={14} /></button><button type="button" onClick={() => deletePurchase(purchase)} className="rounded border border-line-strong p-1.5 text-content-subtle hover:bg-rose-50 hover:text-rose-700" title="حذف" aria-label="حذف"><Trash2 size={14} /></button><button type="button" onClick={() => setPreviewPurchase(purchase)} className="rounded border border-line-strong p-1.5 text-content-subtle hover:bg-slate-800 hover:text-white" title="پیش‌نمایش بل خرید" aria-label="پیش‌نمایش بل خرید"><Printer size={14} /></button></div></td>
                </tr>
              ))}</tbody>
          </table>
        </div>
        <TablePagination currentPage={pagination.current_page} lastPage={pagination.last_page} total={pagination.total} perPage={pagination.per_page} onPageChange={(nextPage) => { setPage(nextPage); loadPurchases(nextPage); }} unit="مورد" />
      </div>

      {showForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
        <form onSubmit={submit} className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-card bg-surface p-5 shadow-xl">
          <div className="mb-5 flex items-center justify-between border-b border-line pb-3"><div><h2 className="text-lg font-bold text-content">{editingPurchaseId ? "ویرایش بل خرید" : "ثبت خرید جدید"}</h2><p className="mt-1 text-xs text-content-subtle">مبلغ پرداخت‌شده از مجموع کم و باقی‌مانده به حساب فروشنده اضافه می‌شود.</p></div><button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="text-content-subtle hover:text-content"><X size={20} /></button></div>
          <div className="grid gap-3 md:grid-cols-4">
            <label className="text-xs font-bold text-content-body">فروشنده<select value={form.supplier_id} onChange={(event) => selectSupplier(event.target.value)} className="mt-1 w-full rounded-input border border-line-strong bg-surface px-3 py-2 text-xs"><option value="">انتخاب فروشنده...</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.code} - {supplier.name}</option>)}</select></label>
            <label className="text-xs font-bold text-content-body">تاریخ شمسی<DatePicker value={dateObj} onChange={setDateObj} calendar={persian} locale={persian_af} format="YYYY/MM/DD" calendarPosition="bottom-right" inputClass="mt-1 w-full rounded-input border border-line-strong bg-surface px-3 py-2 text-xs" /></label>
            <label className="text-xs font-bold text-content-body">شعبه / گدام<select value={form.branch_id} onChange={(event) => updateForm("branch_id", event.target.value)} className="mt-1 w-full rounded-input border border-line-strong bg-surface px-3 py-2 text-xs"><option value="">انتخاب شعبه...</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
            <label className="text-xs font-bold text-content-body">نوع مصرف<select value={form.expense_type_id} onChange={(event) => updateForm("expense_type_id", event.target.value)} className="mt-1 w-full rounded-input border border-line-strong bg-surface px-3 py-2 text-xs"><option value="">انتخاب نوع مصرف...</option>{[...new Map(categories.map((category) => [category.expense_type_id, category.expense_type])).values()].filter(Boolean).map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label>
            <label className="text-xs font-bold text-content-body">مصرف / دسته‌بندی<select value={form.expense_category_id} onChange={(event) => updateForm("expense_category_id", event.target.value)} className="mt-1 w-full rounded-input border border-line-strong bg-surface px-3 py-2 text-xs"><option value="">انتخاب دسته‌بندی...</option>{categories.filter((category) => !form.expense_type_id || String(category.expense_type_id) === String(form.expense_type_id)).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          </div>
          <div className="mt-5 overflow-x-auto rounded-table border border-line"><table className="w-full min-w-[850px] text-right text-xs"><thead className="bg-surface-muted"><tr>{["نام قلم", "مقدار", "واحد", "قیمت واحد", "مواد خام؟", "یادداشت", ""].map((heading) => <th key={heading} className="border-l border-line px-2.5 py-2">{heading}</th>)}</tr></thead><tbody>{form.items.map((item, index) => <tr key={index} className="border-t border-line"><td className="p-2"><input value={item.name} onChange={(event) => updateItem(index, "name", event.target.value)} className="w-full rounded-input border border-line-strong px-2 py-1.5" placeholder="مثلاً خاک اره" /></td><td className="p-2"><input type="number" min="0" step="0.001" value={item.quantity} onChange={(event) => updateItem(index, "quantity", event.target.value)} className="w-24 rounded-input border border-line-strong px-2 py-1.5" /></td><td className="p-2"><select value={item.unit} onChange={(event) => updateItem(index, "unit", event.target.value)} className="rounded-input border border-line-strong px-2 py-1.5">{(item.raw_material ? RAW_MATERIAL_UNITS : UNITS).map((unit) => <option key={unit}>{unit}</option>)}</select></td><td className="p-2"><input type="number" min="0" step="0.01" value={item.unit_price} onChange={(event) => updateItem(index, "unit_price", event.target.value)} className="w-28 rounded-input border border-line-strong px-2 py-1.5" /></td><td className="p-2 text-center"><input type="checkbox" checked={item.raw_material} onChange={(event) => toggleRawMaterial(index, event.target.checked)} /></td><td className="p-2"><input value={item.note} onChange={(event) => updateItem(index, "note", event.target.value)} className="w-full rounded-input border border-line-strong px-2 py-1.5" /></td><td className="p-2"><button type="button" disabled={form.items.length === 1} onClick={() => setForm((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }))} className="text-danger-text disabled:opacity-30"><Trash2 size={15} /></button></td></tr>)}</tbody></table></div>
          <button type="button" onClick={() => setForm((current) => ({ ...current, items: [...current.items, { ...EMPTY_ITEM }] }))} className="mt-3 text-xs font-bold text-accent hover:underline">+ افزودن قلم</button>
          <div className="mt-5 grid gap-3 md:grid-cols-4"><label className="text-xs font-bold text-content-body">ارز<select value={form.currency} onChange={(event) => updateForm("currency", event.target.value)} className="mt-1 w-full rounded-input border border-line-strong bg-surface px-3 py-2 text-xs"><option>AFN</option><option>USD</option><option>IRR</option></select></label><label className="text-xs font-bold text-content-body">مبلغ پرداخت‌شده<input type="number" min="0" step="0.01" value={form.paid_amount} onChange={(event) => updateForm("paid_amount", event.target.value)} className="mt-1 w-full rounded-input border border-line-strong bg-surface px-3 py-2 text-xs" /></label><div className="rounded-input bg-surface-muted p-3 text-xs"><span>مجموع: </span><b dir="ltr">{money(total, form.currency)} {form.currency}</b></div><div className="rounded-input bg-amber-50 p-3 text-xs text-amber-900"><span>باقی‌مانده: </span><b dir="ltr">{money(remaining, form.currency)} {form.currency}</b></div></div>
          <label className="mt-4 block text-xs font-bold text-content-body">یادداشت<textarea value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} rows={2} className="mt-1 w-full rounded-input border border-line-strong bg-surface px-3 py-2 text-xs" /></label>
          <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="rounded-btn border border-line-strong px-4 py-2 text-xs font-bold">انصراف</button><button type="submit" className="rounded-btn bg-slate-800 px-5 py-2 text-xs font-bold text-white hover:bg-slate-900">{editingPurchaseId ? "ذخیره تغییرات" : "ثبت خرید"}</button></div>
        </form>
      </div>}
      <PurchasePreviewModal isOpen={Boolean(previewPurchase)} purchase={previewPurchase} onClose={() => setPreviewPurchase(null)} />
    </section>
  );
}
