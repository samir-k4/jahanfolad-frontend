import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, RefreshCw, Search, WalletCards, Printer } from "lucide-react";
import { CustomDropdown, TablePagination, TooltipButton } from "../components/common";
import { apiFetch } from "../api";
import { showToast } from "../utils/toast";

export default function SupplierPaymentListPage() {
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [currency, setCurrency] = useState("all");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
  const load = async () => {
    setLoading(true);
    try {
      const result = await apiFetch(`/supplier-payments?${new URLSearchParams({ page, per_page: perPage, search: query, currency: currency === "all" ? "" : currency })}`);
      setRows(result.data || []);
      setPagination(result);
    }
    catch (error) { showToast.error(error.message || "بارگذاری پرداختی‌ها انجام نشد."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [page, perPage, currency]); // eslint-disable-line react-hooks/exhaustive-deps
  const visible = useMemo(() => rows.filter((row) => {
    const text = `${row.supplier?.name || row.supplier_name || ""} ${row.supplier?.code || row.supplier_code || ""} ${row.notes || ""}`.toLowerCase();
    return !query || text.includes(query.toLowerCase());
  }), [rows, query, currency]);
  return <div className="w-full space-y-4 font-sans" dir="rtl">
    <header className="flex flex-col gap-4 border-b border-gray-200 pb-4 md:flex-row md:items-center md:justify-between"><div><h1 className="text-page-title tracking-tight text-gray-900">پرداختی‌ها</h1><p className="mt-1 text-subtitle text-gray-500">فهرست پرداخت‌های انجام‌شده به فروشندگان</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-btn bg-slate-800 px-3.5 py-2 text-btn-text font-bold text-white hover:bg-slate-900"><Printer size={15} /> گزارش پرداختی‌ها</button><Link to="/seller-payables" className="inline-flex items-center gap-1.5 rounded-btn border border-gray-300 bg-white px-3.5 py-2 text-btn-text font-bold text-gray-700 hover:bg-gray-50">حساب پرداختنی</Link><Link to="/seller-payments/create" className="inline-flex items-center gap-1.5 rounded-btn bg-emerald-600 px-4 py-2 text-btn-text font-bold text-white hover:bg-emerald-700"><Plus size={16} /> پرداختی جدید</Link></div></header>
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs"><div className="relative min-w-[240px] flex-1"><Search size={15} className="absolute right-3 top-2.5 text-gray-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="جستجوی فروشنده..." className="w-full rounded-lg border border-gray-300 py-1.5 pl-3 pr-9 text-xs focus:border-emerald-600 focus:outline-none" /></div><CustomDropdown value={currency} onChange={setCurrency} options={[{ value: "all", label: "همه ارزها" }, { value: "AFN", label: "افغانی" }, { value: "USD", label: "دالر" }, { value: "IRR", label: "تومان" }]} buttonClassName="min-w-[130px] px-3 py-1.5 text-xs" width="w-36" /><TooltipButton icon={<RefreshCw size={14} />} tooltip="بازخوانی" onClick={load} colorClass="border border-gray-300 bg-white text-gray-700 hover:bg-slate-800 hover:text-white" /></div>
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xs"><div className="overflow-x-auto"><table className="w-full border-collapse text-right text-xs"><thead><tr className="border-b border-gray-200 bg-gray-50 font-bold text-gray-700">{["#", "نمبر پرداختی", "فروشنده", "تاریخ", "مبلغ", "ارز", "خزانه", "پرداخت‌کننده", "یادداشت"].map((heading) => <th key={heading} className="border-l border-gray-200 px-3.5 py-2.5">{heading}</th>)}</tr></thead><tbody className="divide-y divide-gray-100">{loading ? <tr><td colSpan={9} className="p-12 text-center text-gray-500">در حال بارگذاری...</td></tr> : visible.length === 0 ? <tr><td colSpan={9} className="p-12 text-center"><WalletCards className="mx-auto mb-3 text-gray-300" size={30} /><p className="font-bold text-gray-600">پرداختی ثبت نشده است.</p></td></tr> : visible.map((row, index) => <tr key={row.id} className="hover:bg-gray-50/70"><td className="border-l border-gray-200 px-3.5 py-2.5 text-center">{(page - 1) * perPage + index + 1}</td><td className="border-l border-gray-200 px-3.5 py-2.5 font-mono">{row.payment_number || row.id}</td><td className="border-l border-gray-200 px-3.5 py-2.5 font-bold">{row.supplier?.name || row.supplier_name || "—"}</td><td className="border-l border-gray-200 px-3.5 py-2.5">{row.shamsi_date || "—"}</td><td className="border-l border-gray-200 px-3.5 py-2.5 font-mono" dir="ltr">{Number(row.amount || 0).toFixed(2)}</td><td className="border-l border-gray-200 px-3.5 py-2.5 text-center">{row.currency}</td><td className="border-l border-gray-200 px-3.5 py-2.5">{row.vault?.name || row.vault_name || "—"}</td><td className="border-l border-gray-200 px-3.5 py-2.5">{row.received_by || row.receiver || "—"}</td><td className="px-3.5 py-2.5">{row.notes || "—"}</td></tr>)}</tbody></table></div><TablePagination currentPage={pagination.current_page || page} lastPage={pagination.last_page || 1} total={pagination.total || 0} perPage={perPage} onPageChange={setPage} onPerPageChange={(size) => { setPerPage(size); setPage(1); }} unit="مورد" /></div>
  </div>;
}
