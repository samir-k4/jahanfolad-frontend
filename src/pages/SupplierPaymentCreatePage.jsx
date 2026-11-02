import { useEffect, useState } from "react";
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_af from "../utils/persian_af";
import { ArrowRight, Save } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { CustomDropdown } from "../components/common";
import { apiFetch, apiList } from "../api";
import { showToast } from "../utils/toast";

export default function SupplierPaymentCreatePage() {
  const navigate = useNavigate();
  const [sellers, setSellers] = useState([]);
  const [vaults, setVaults] = useState([]);
  const [dateObj, setDateObj] = useState(() => new DateObject({ calendar: persian, locale: persian_af }));
  const [form, setForm] = useState({ supplier_id: "", amount: "", currency: "AFN", vault_id: "", received_by: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    Promise.all([apiList("/suppliers?per_page=100"), apiList("/vaults?per_page=100")])
      .then(([sellerRows, vaultRows]) => { setSellers(sellerRows || []); setVaults(vaultRows || []); })
      .catch((error) => showToast.error(error.message || "اطلاعات فرم پرداخت بارگذاری نشد."));
  }, []);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    if (!form.supplier_id || Number(form.amount) <= 0 || !form.vault_id) {
      showToast.error("فروشنده، مبلغ و خزانه را انتخاب کنید.");
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch("/supplier-payments", { method: "POST", body: JSON.stringify({ ...form, shamsi_date: dateObj.format("YYYY/MM/DD") }) });
      showToast.success("پرداخت به فروشنده ثبت شد.");
      navigate("/seller-payments");
    } catch (error) {
      showToast.error(error.message || "ثبت پرداخت انجام نشد.");
    } finally { setSubmitting(false); }
  };
  return (
    <div className="space-y-6 pb-16 font-sans text-gray-800" dir="rtl">
      <header className="flex flex-col gap-4 border-b border-gray-200 pb-4 md:flex-row md:items-center md:justify-between"><div><h1 className="text-xl font-bold tracking-tight text-gray-900">ثبت پرداختی جدید</h1><p className="mt-1 text-xs text-gray-500">پرداخت از خزانه و کاهش حساب پرداختنی فروشنده</p></div><Link to="/seller-payments" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"><ArrowRight size={15} /> بازگشت</Link></header>
      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-12"><section className="grid gap-4 rounded-card border border-gray-200 bg-white p-5 shadow-2xs lg:col-span-8 md:grid-cols-2"><h2 className="border-b border-gray-100 pb-3 text-sm font-bold md:col-span-2">مشخصات پرداخت</h2><div><label className="text-xs font-bold">فروشنده</label><CustomDropdown value={form.supplier_id} onChange={(value) => update("supplier_id", value)} options={sellers.map((seller) => ({ value: String(seller.id), label: `${seller.code} - ${seller.name}` }))} placeholder="انتخاب فروشنده..." buttonClassName="mt-1 w-full border-gray-300 bg-white px-3 py-2 text-xs" width="w-full" align="right" /></div><label className="text-xs font-bold">تاریخ شمسی<DatePicker value={dateObj} onChange={setDateObj} calendar={persian} locale={persian_af} format="YYYY/MM/DD" inputClass="mt-1 h-10 w-full rounded-input border border-gray-300 px-3 text-xs" /></label><label className="text-xs font-bold">مبلغ<input required type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => update("amount", event.target.value)} className="mt-1 h-10 w-full rounded-input border border-gray-300 px-3 text-xs" /></label><div><label className="text-xs font-bold">ارز</label><CustomDropdown value={form.currency} onChange={(value) => update("currency", value)} options={[{ value: "AFN", label: "افغانی (AFN)" }, { value: "USD", label: "دالر (USD)" }, { value: "IRR", label: "تومان (IRR)" }]} buttonClassName="mt-1 w-full border-gray-300 bg-white px-3 py-2 text-xs" width="w-full" align="right" /></div><div><label className="text-xs font-bold">خزانه / حساب پرداخت</label><CustomDropdown value={form.vault_id} onChange={(value) => update("vault_id", value)} options={vaults.map((vault) => ({ value: String(vault.id), label: vault.name }))} placeholder="انتخاب خزانه..." buttonClassName="mt-1 w-full border-gray-300 bg-white px-3 py-2 text-xs" width="w-full" align="right" /></div><label className="text-xs font-bold">پرداخت‌کننده<input value={form.received_by} onChange={(event) => update("received_by", event.target.value)} className="mt-1 h-10 w-full rounded-input border border-gray-300 px-3 text-xs" /></label><label className="text-xs font-bold md:col-span-2">یادداشت<textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} rows={4} className="mt-1 w-full rounded-input border border-gray-300 px-3 py-2 text-xs" /></label></section><aside className="h-fit rounded-card border border-gray-200 bg-white p-5 shadow-2xs lg:col-span-4"><h2 className="border-b border-gray-100 pb-3 text-sm font-bold">ثبت پرداخت</h2><p className="mt-3 text-xs leading-6 text-gray-500">این پرداخت از موجودی خزانه کم شده و از مبلغ باقی‌مانده فروشنده کسر می‌شود.</p><button disabled={submitting} className="mt-6 flex w-full items-center justify-center gap-2 rounded-btn bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"><Save size={16} /> {submitting ? "در حال ثبت..." : "ثبت پرداختی"}</button></aside></form>
    </div>
  );
}
