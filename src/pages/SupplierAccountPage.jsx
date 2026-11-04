import { useEffect, useMemo, useState } from "react";
import { ArrowRight, RefreshCw, Wallet } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../api";
import { showToast } from "../utils/toast";
import { formatCurrencyAmount } from "../utils/dariNumberFormatter";

const money = (value, currency) => formatCurrencyAmount(value, currency);

const dateLabel = (value) => value ? String(value).slice(0, 10) : "—";

export default function SupplierAccountPage() {
  const { id } = useParams();
  const [account, setAccount] = useState(null);
  const [activeTab, setActiveTab] = useState("statement");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setAccount(await apiFetch(`/suppliers/${id}/account`));
    } catch (error) {
      showToast.error(error.message || "بارگذاری حساب فروشنده انجام نشد.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalBalance = useMemo(
    () => (account?.summary || []).filter((row) => Number(row.balance) > 0),
    [account],
  );

  if (loading && !account) {
    return <div dir="rtl" className="p-8 text-center text-sm text-gray-500">در حال بارگذاری حساب فروشنده...</div>;
  }

  const supplier = account?.supplier;
  const statement = account?.statement || [];
  const purchases = account?.purchases || [];
  const payments = account?.payments || [];

  return (
    <section dir="rtl" className="w-full space-y-5 pb-12 font-sans text-gray-800">
      <header className="flex flex-col gap-3 border-b border-rose-100 pb-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Link to="/sellers" className="rounded-btn border border-gray-300 bg-white p-2 text-gray-600 hover:bg-gray-50" aria-label="بازگشت">
            <ArrowRight size={16} />
          </Link>
          <div>
            <p className="text-xs font-bold text-rose-600">حساب فروشنده</p>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-gray-900">{supplier?.name || "—"}</h1>
            <p className="mt-1 font-mono text-xs text-gray-500" dir="ltr">{supplier?.code || "—"} · {supplier?.phone || "—"}</p>
          </div>
        </div>
        <button type="button" onClick={load} className="inline-flex items-center justify-center gap-1.5 rounded-btn border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> تازه‌سازی
        </button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(account?.summary || []).map((row) => (
          <div key={row.currency} className="rounded-card border border-rose-200 bg-rose-50/60 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-800">طلب فروشنده ({row.currency})</span>
              <Wallet size={16} className="text-rose-600" />
            </div>
            <p className="mt-2 font-mono text-xl font-bold text-rose-700" dir="ltr">{money(row.balance, row.currency)}</p>
            <p className="mt-1 text-[11px] text-rose-700">خرید: {money(row.credit, row.currency)} · پرداخت: {money(row.debit, row.currency)}</p>
          </div>
        ))}
        {!totalBalance.length && (
          <div className="rounded-card border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">این فروشنده در حال حاضر بدهی باقی‌مانده ندارد.</div>
        )}
      </div>

      <div className="overflow-hidden rounded-card border border-rose-100 bg-white shadow-2xs">
        <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 bg-gray-50 p-2">
          {[
            ["statement", "صورت حساب", statement.length],
            ["purchases", "بل خرید", purchases.length],
            ["payments", "پرداختی‌ها", payments.length],
          ].map(([tab, label, count]) => (
            <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`rounded-btn px-3.5 py-2 text-xs font-bold transition ${activeTab === tab ? "bg-rose-600 text-white" : "text-gray-700 hover:bg-white"}`}>
              {label} <span className={`mr-1 rounded-full px-1.5 py-0.5 text-[10px] ${activeTab === tab ? "bg-white/20" : "bg-gray-200"}`}>{count}</span>
            </button>
          ))}
        </div>

        {activeTab === "statement" && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-right text-xs">
              <thead><tr className="border-b border-gray-200 bg-gray-50 font-bold text-gray-700">{["تاریخ", "شرح", "ارز", "بدهکار", "بستانکار", "مانده طلب"].map((heading) => <th key={heading} className="border-l border-gray-200 px-3.5 py-3">{heading}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100">
                {statement.length ? statement.map((row, index) => (
                  <tr key={`${row.reference_type}-${row.reference_id}-${index}`} className="hover:bg-rose-50/30">
                    <td className="border-l border-gray-100 px-3.5 py-3 font-mono" dir="ltr">{row.shamsi_date || dateLabel(row.date)}</td>
                    <td className="border-l border-gray-100 px-3.5 py-3 font-bold">{row.description}</td>
                    <td className="border-l border-gray-100 px-3.5 py-3 font-mono">{row.currency}</td>
                    <td className="border-l border-gray-100 px-3.5 py-3 font-mono text-gray-700" dir="ltr">{money(row.debit, row.currency)}</td>
                    <td className="border-l border-gray-100 px-3.5 py-3 font-mono text-rose-700" dir="ltr">{money(row.credit, row.currency)}</td>
                    <td className="px-3.5 py-3 font-mono font-bold text-rose-700" dir="ltr">{money(row.balance, row.currency)}</td>
                  </tr>
                )) : <tr><td colSpan={6} className="p-10 text-center text-gray-500">هنوز تراکنشی برای این فروشنده ثبت نشده است.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "purchases" && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-right text-xs">
              <thead><tr className="border-b border-gray-200 bg-gray-50 font-bold text-gray-700">{["شماره بل خرید", "تاریخ", "مجموع", "پرداخت‌شده", "باقی‌مانده", "وضعیت"].map((heading) => <th key={heading} className="border-l border-gray-200 px-3.5 py-3">{heading}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100">
                {purchases.length ? purchases.map((purchase) => <tr key={purchase.id} className="hover:bg-rose-50/30"><td className="border-l border-gray-100 px-3.5 py-3 font-mono font-bold">{purchase.purchase_number || `P-${purchase.id}`}</td><td className="border-l border-gray-100 px-3.5 py-3 font-mono" dir="ltr">{purchase.shamsi_date || dateLabel(purchase.gregorian_date)}</td><td className="border-l border-gray-100 px-3.5 py-3 font-mono" dir="ltr">{money(purchase.total, purchase.currency)} {purchase.currency}</td><td className="border-l border-gray-100 px-3.5 py-3 font-mono" dir="ltr">{money(purchase.paid, purchase.currency)}</td><td className="border-l border-gray-100 px-3.5 py-3 font-mono font-bold text-rose-700" dir="ltr">{money(purchase.remaining, purchase.currency)}</td><td className="px-3.5 py-3">{purchase.status === "paid" ? "تسویه‌شده" : purchase.status === "partial" ? "قسمتی" : "پرداخت‌نشده"}</td></tr>) : <tr><td colSpan={6} className="p-10 text-center text-gray-500">هنوز بل خریدی ثبت نشده است.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "payments" && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] border-collapse text-right text-xs">
              <thead><tr className="border-b border-gray-200 bg-gray-50 font-bold text-gray-700">{["تاریخ", "مبلغ پرداختی", "ارز", "صندوق", "یادداشت"].map((heading) => <th key={heading} className="border-l border-gray-200 px-3.5 py-3">{heading}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100">
                {payments.length ? payments.map((payment) => <tr key={payment.id} className="hover:bg-rose-50/30"><td className="border-l border-gray-100 px-3.5 py-3 font-mono" dir="ltr">{payment.shamsi_date || dateLabel(payment.gregorian_date)}</td><td className="border-l border-gray-100 px-3.5 py-3 font-mono font-bold text-gray-700" dir="ltr">{money(payment.amount, payment.currency)}</td><td className="border-l border-gray-100 px-3.5 py-3 font-mono">{payment.currency}</td><td className="border-l border-gray-100 px-3.5 py-3">{payment.vault?.name || "—"}</td><td className="px-3.5 py-3">{payment.notes || "—"}</td></tr>) : <tr><td colSpan={5} className="p-10 text-center text-gray-500">هنوز پرداختی ثبت نشده است.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
