import { useEffect, useState } from "react";
import { ArrowRight, BarChart3, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { apiUrl } from "../api";
import { showToast } from "../utils";
import { getCleanErrorMessage } from "../utils/errorHandler";

const fmt = (value) => Number(value || 0).toLocaleString("en-US", {
  maximumFractionDigits: 3,
});

const inputClass = "h-9 rounded-lg border border-gray-300 bg-white px-2.5 text-xs text-gray-800 outline-none focus:border-emerald-600";

export default function SalesAnalyticsPage() {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [filters, setFilters] = useState({
    from_date: "",
    to_date: "",
    status: "all",
    currency: "all",
    product_id: "",
    customer_id: "",
    sale_type: "",
    target_account: "",
    search: "",
  });
  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(apiUrl("/products")).then((res) => res.json()),
      fetch(apiUrl("/customers?per_page=1000")).then((res) => res.json()),
    ])
      .then(([productBody, customerBody]) => {
        setProducts(productBody?.data || productBody || []);
        setCustomers(customerBody?.data || customerBody || []);
      })
      .catch((error) => showToast.error(getCleanErrorMessage(error, "خطا در دریافت گزینه‌های تحلیل")));
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== "" && value !== "all") params.set(key, value);
      });
      const res = await fetch(apiUrl(`/sales-invoices/analytics?${params.toString()}`), {
        headers: { Accept: "application/json" },
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "خطا در دریافت تحلیل فروش");
      setSummary(body.summary || null);
      setRows(body.rows || []);
    } catch (error) {
      showToast.error(getCleanErrorMessage(error, "خطا در دریافت تحلیل فروش"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="w-full space-y-4 font-sans text-gray-800" dir="rtl">
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <div>
          <div className="flex items-center gap-2 font-bold text-gray-900">
            <BarChart3 size={19} className="text-emerald-700" />
            <span>تحلیل فروش محصولات</span>
          </div>
          <p className="mt-1 text-xs text-gray-500">تحلیل مقدار و مبلغ فروش بر اساس محصول، مشتری، تاریخ و وضعیت فاکتور</p>
        </div>
        <Link to="/sales/invoices" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">
          <ArrowRight size={15} />
          بازگشت به فاکتورها
        </Link>
      </div>

      <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 md:grid-cols-3 lg:grid-cols-5">
            <input className={inputClass} value={filters.from_date} onChange={(e) => updateFilter("from_date", e.target.value)} placeholder="از تاریخ: 1403/01/01" />
            <input className={inputClass} value={filters.to_date} onChange={(e) => updateFilter("to_date", e.target.value)} placeholder="تا تاریخ: 1403/12/29" />
            <select className={inputClass} value={filters.status} onChange={(e) => updateFilter("status", e.target.value)}>
              <option value="all">همه وضعیت‌ها</option>
              <option value="paid">کاملاً تسویه</option>
              <option value="partial">تسویه قسمتی</option>
              <option value="unpaid">باقی‌دار</option>
            </select>
            <select className={inputClass} value={filters.currency} onChange={(e) => updateFilter("currency", e.target.value)}>
              <option value="all">همه واحدها</option>
              <option value="AFN">افغانی</option>
              <option value="USD">دالر</option>
            </select>
            <input className={inputClass} value={filters.search} onChange={(e) => updateFilter("search", e.target.value)} placeholder="جستجوی فاکتور، مشتری یا محصول" />
            <select className={inputClass} value={filters.product_id} onChange={(e) => updateFilter("product_id", e.target.value)}>
              <option value="">همه محصولات</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
            </select>
            <select className={inputClass} value={filters.customer_id} onChange={(e) => updateFilter("customer_id", e.target.value)}>
              <option value="">همه مشتریان</option>
              {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} ({customer.customer_code || customer.id})</option>)}
            </select>
            <input className={inputClass} value={filters.sale_type} onChange={(e) => updateFilter("sale_type", e.target.value)} placeholder="نوع فروش" />
            <input className={inputClass} value={filters.target_account} onChange={(e) => updateFilter("target_account", e.target.value)} placeholder="حساب مقصد" />
            <button type="button" onClick={loadAnalytics} disabled={loading} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              تحلیل
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
            {[
              ["تعداد فاکتور", summary?.invoice_count, ""],
              ["مقدار فروش", summary?.quantity, ""],
              ["مقدار قابل محاسبه", summary?.billable_quantity, ""],
              ["فروش افغانی", summary?.afn_sales_amount, "؋"],
              ["فروش دالر", summary?.usd_sales_amount, "$"],
            ].map(([label, value, suffix]) => (
              <div key={label} className="rounded-lg border border-gray-200 bg-white p-3 shadow-2xs">
                <p className="text-[11px] font-medium text-gray-500">{label}</p>
                <p className="mt-1 font-mono text-base font-bold text-gray-900" dir="ltr">{summary ? `${fmt(value)} ${suffix}` : "—"}</p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full min-w-[900px] border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-gray-700">
                  <th className="border-l border-gray-200 px-3 py-2 text-right">محصول</th>
                  <th className="border-l border-gray-200 px-3 py-2 text-right">مشتری</th>
                  <th className="border-l border-gray-200 px-3 py-2 text-center">واحد</th>
                  <th className="border-l border-gray-200 px-3 py-2 text-center">فاکتورها</th>
                  <th className="border-l border-gray-200 px-3 py-2 text-center">مقدار</th>
                  <th className="border-l border-gray-200 px-3 py-2 text-center">قابل محاسبه</th>
                  <th className="px-3 py-2 text-center">مبلغ فروش</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="p-8 text-center text-gray-500">در حال محاسبه...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-gray-500">برای این فیلتر اطلاعاتی پیدا نشد.</td></tr>
                ) : rows.map((row) => (
                  <tr key={`${row.product_id || row.product_name}-${row.customer_id || row.customer_name}-${row.currency}`} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 font-bold text-gray-900">{row.product_name}</td>
                    <td className="px-3 py-2 text-gray-700">{row.customer_name}</td>
                    <td className="px-3 py-2 text-center font-mono">{row.currency}</td>
                    <td className="px-3 py-2 text-center font-mono">{fmt(row.invoice_count)}</td>
                    <td className="px-3 py-2 text-center font-mono">{fmt(row.quantity)}</td>
                    <td className="px-3 py-2 text-center font-mono">{fmt(row.billable_quantity)}</td>
                    <td className="px-3 py-2 text-center font-mono font-bold" dir="ltr">{fmt(row.sales_amount)} {row.currency === "AFN" ? "؋" : "$"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      </div>
    </div>
  );
}
