import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Edit3, Plus, Search, Trash2, X } from "lucide-react";
import { apiFetch, apiList } from "../api";
import { showToast } from "../utils/toast";

const EMPTY_FORM = { code: "", name: "", phone: "", address: "", notes: "" };

export default function SellersPage() {
  const navigate = useNavigate();
  const [sellers, setSellers] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setSellers(await apiList(`/suppliers?${new URLSearchParams({ search, per_page: 100 })}`));
    } catch (error) {
      showToast.error(error.message || "بارگذاری فروشندگان انجام نشد.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => navigate("/sellers/create");
  const openEdit = (seller) => {
    setEditing(seller);
    setForm({ code: seller.code || "", name: seller.name || "", phone: seller.phone || "", address: seller.address || "", notes: seller.notes || "" });
    setShowForm(true);
  };
  const submit = async (event) => {
    event.preventDefault();
    try {
      await apiFetch(editing ? `/suppliers/${editing.id}` : "/suppliers", {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify(form),
      });
      showToast.success(editing ? "فروشنده ویرایش شد." : "فروشنده ثبت شد.");
      setShowForm(false);
      load();
    } catch (error) {
      showToast.error(error.message || "ذخیره فروشنده انجام نشد.");
    }
  };
  const remove = async (seller) => {
    if (!window.confirm(`فروشنده «${seller.name}» حذف شود؟`)) return;
    try {
      await apiFetch(`/suppliers/${seller.id}`, { method: "DELETE" });
      showToast.success("فروشنده حذف شد.");
      load();
    } catch (error) {
      showToast.error(error.message || "حذف فروشنده انجام نشد.");
    }
  };

  return (
    <section className="w-full space-y-4 font-sans" dir="rtl">
      <header className="flex flex-col gap-4 border-b border-line pb-4 md:flex-row md:items-center md:justify-between">
        <div><h1 className="text-xl font-bold tracking-tight text-content">فروشندگان</h1><p className="mt-1 text-xs font-medium text-content-subtle">مدیریت مشخصات فروشندگان و طرف‌های حساب شرکت</p></div>
        <Link to="/sellers/create" className="inline-flex items-center gap-1.5 rounded-btn bg-emerald-600 px-4 py-2 text-btn-text font-bold text-white hover:bg-emerald-700"><Plus size={16} /> ثبت فروشنده</Link>
      </header>
      <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3.5 shadow-2xs">
        <div className="relative min-w-[240px] flex-1"><Search size={15} className="absolute right-3 top-2.5 text-content-faint" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="جستجوی کد، نام یا شماره تماس..." className="w-full rounded-input border border-line-strong bg-surface py-1.5 pl-3 pr-9 text-xs focus:border-accent focus:outline-none" /></div>
      </div>
      <div className="overflow-hidden rounded-table border border-line bg-surface shadow-2xs"><div className="overflow-x-auto"><table className="w-full border-collapse text-right text-xs"><thead><tr className="border-b border-line bg-surface-muted font-bold text-content-body">{["کد", "نام فروشنده", "شماره تماس", "آدرس", "خریدها", "عملیات"].map((heading) => <th key={heading} className="border-l border-line px-3.5 py-2.5">{heading}</th>)}</tr></thead><tbody className="divide-y divide-line">{loading ? <tr><td colSpan={6} className="p-12 text-center text-content-subtle">در حال بارگذاری...</td></tr> : sellers.length === 0 ? <tr><td colSpan={6} className="p-12 text-center text-content-subtle">هنوز فروشنده‌ای ثبت نشده است.</td></tr> : sellers.map((seller) => <tr key={seller.id} className="hover:bg-surface-muted"><td className="border-l border-line px-3.5 py-2.5 font-mono font-bold">{seller.code}</td><td className="border-l border-line px-3.5 py-2.5 font-bold">{seller.name}</td><td className="border-l border-line px-3.5 py-2.5" dir="ltr">{seller.phone || "—"}</td><td className="border-l border-line px-3.5 py-2.5">{seller.address || "—"}</td>      <td className="border-l border-line px-3.5 py-2.5"><Link to={`/seller-payables?supplier=${seller.id}`} className="font-bold text-accent hover:underline">{seller.purchases_count || 0}</Link></td><td className="px-3.5 py-2.5"><div className="flex gap-1.5"><button type="button" onClick={() => openEdit(seller)} className="rounded border border-line-strong p-1.5 text-content-subtle hover:bg-slate-800 hover:text-white" title="ویرایش"><Edit3 size={14} /></button><button type="button" onClick={() => remove(seller)} className="rounded border border-line-strong p-1.5 text-content-subtle hover:bg-danger-soft hover:text-danger-text" title="حذف"><Trash2 size={14} /></button></div></td></tr>)}</tbody></table></div></div>
      {showForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><form onSubmit={submit} className="w-full max-w-xl rounded-card bg-surface p-5 shadow-xl"><div className="mb-5 flex items-center justify-between border-b border-line pb-3"><h2 className="text-lg font-bold text-content">{editing ? "ویرایش فروشنده" : "ثبت فروشنده جدید"}</h2><button type="button" onClick={() => setShowForm(false)} className="text-content-subtle"><X size={20} /></button></div><div className="grid gap-3 md:grid-cols-2">{[["code", "کد فروشنده"], ["name", "نام فروشنده"], ["phone", "شماره تماس"], ["address", "آدرس"]].map(([key, label]) => <label key={key} className="text-xs font-bold text-content-body">{label}<input required={key === "code" || key === "name"} value={form[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} className="mt-1 w-full rounded-input border border-line-strong bg-surface px-3 py-2 text-xs" /></label>)}</div><label className="mt-3 block text-xs font-bold text-content-body">یادداشت<textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} rows={3} className="mt-1 w-full rounded-input border border-line-strong bg-surface px-3 py-2 text-xs" /></label><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setShowForm(false)} className="rounded-btn border border-line-strong px-4 py-2 text-xs font-bold">انصراف</button><button type="submit" className="rounded-btn bg-slate-800 px-5 py-2 text-xs font-bold text-white">ذخیره</button></div></form></div>}
    </section>
  );
}
