import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Edit3, Plus, Search, WalletCards, Printer, RotateCcw, Trash2 } from "lucide-react";
import { CustomDropdown, TablePagination, TooltipButton } from "../components/common";
import { apiFetch } from "../api";
import { showToast } from "../utils/toast";
import { formatCurrencyAmount } from "../utils/dariNumberFormatter";
import PaymentSlipModal from "../components/common/PaymentSlipModal";

export default function SupplierPaymentListPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [currency, setCurrency] = useState("all");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [selectedPayment, setSelectedPayment] = useState(null);
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
  const handleResetFilters = () => {
    setQuery("");
    setCurrency("all");
    setPage(1);
  };
  const deletePayment = async (row) => {
    if (!window.confirm(`پرداختی «${row.payment_number || row.id}» حذف شود؟`)) return;
    try {
      await apiFetch(`/supplier-payments/${row.id}`, { method: "DELETE" });
      showToast.success("پرداختی حذف شد.");
      load();
    } catch (error) {
      showToast.error(error.message || "حذف پرداختی انجام نشد.");
    }
  };

  return (
    <div className="w-full space-y-4 font-sans" dir="rtl">
      <header className="flex flex-col gap-4 border-b border-gray-200 pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-page-title tracking-tight text-gray-900">پرداختی‌ها</h1>
          <p className="mt-1 text-subtitle text-gray-500">فهرست پرداخت‌های انجام‌شده به فروشندگان</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-btn bg-slate-800 px-3.5 py-2 text-btn-text font-bold text-white hover:bg-slate-900">
            <Printer size={15} /> گزارش پرداختی‌ها
          </button>
          <Link to="/seller-payments/create" className="inline-flex items-center gap-1.5 rounded-btn bg-rose-600 px-4 py-2 text-btn-text font-bold text-white hover:bg-rose-700">
            <Plus size={16} /> پرداختی جدید
          </Link>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3 rounded-card border border-gray-200 bg-white p-3.5 shadow-2xs">
        <div className="relative min-w-[200px] flex-1">
          <Search size={15} className="absolute right-3 top-2.5 text-gray-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="جستجوی فروشنده یا یادداشت..."
            className="w-full rounded-input border border-gray-300 bg-white py-1.5 pl-3 pr-9 text-body-text text-gray-800 focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
        </div>
        <CustomDropdown
          value={currency}
          onChange={(value) => {
            setCurrency(value);
            setPage(1);
          }}
          options={[
            { value: "all", label: "همه ارزها" },
            { value: "AFN", label: "افغانی" },
            { value: "USD", label: "دالر" },
            { value: "IRR", label: "تومان" },
          ]}
          buttonClassName="min-w-[130px] px-3 py-1.5 text-body-text font-medium text-gray-700 bg-white"
          width="w-36"
          align="right"
        />
        {(query || currency !== "all") && (
          <TooltipButton
            icon={<RotateCcw size={15} />}
            tooltip="پاک‌کردن فیلترها"
            onClick={handleResetFilters}
            colorClass="border border-gray-300 bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-800"
          />
        )}
      </div>

      <div className="overflow-hidden rounded-table border border-gray-200 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-right text-table-cell-text">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-table-header-text font-bold text-gray-700">
                {["#", "نمبر پرداختی", "فروشنده", "تاریخ", "مبلغ", "ارز", "خزانه", "یادداشت", "عملیات"].map((heading) => (
                  <th key={heading} className="whitespace-nowrap border-l border-gray-200 p-3 text-center">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={9} className="p-12 text-center text-gray-500">در حال بارگذاری...</td></tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center">
                    <WalletCards className="mx-auto mb-3 text-gray-300" size={30} strokeWidth={1.5} />
                    <p className="font-bold text-gray-600">پرداختی ثبت نشده است.</p>
                  </td>
                </tr>
              ) : visible.map((row, index) => (
                <tr key={row.id} className="hover:bg-gray-50/70">
                  <td className="border-l border-gray-100 p-3 text-center">{(page - 1) * perPage + index + 1}</td>
                  <td className="border-l border-gray-100 p-3 text-center font-mono">{row.payment_number || row.id}</td>
                  <td className="border-l border-gray-100 p-3 font-bold text-gray-800">{row.supplier?.name || row.supplier_name || "—"}</td>
                  <td className="border-l border-gray-100 p-3 text-center text-gray-600">{row.shamsi_date || "—"}</td>
                  <td className="border-l border-gray-100 bg-rose-50/30 p-3 text-center font-mono font-bold text-rose-700" dir="ltr">-{formatCurrencyAmount(row.amount, row.currency)}</td>
                  <td className="border-l border-gray-100 p-3 text-center font-mono text-gray-600">{row.currency}</td>
                  <td className="border-l border-gray-100 p-3 text-center text-gray-800">{row.vault?.name || row.vault_name || "—"}</td>
                  <td className="border-l border-gray-100 p-3 text-gray-700">{row.notes || "—"}</td>
                  <td className="p-3 text-center"><div className="flex justify-center gap-1.5">
                    <button type="button" onClick={() => navigate("/seller-payments/create", { state: { payment: row } })} className="rounded border border-gray-300 p-1.5 text-gray-500 hover:bg-slate-800 hover:text-white" title="ویرایش" aria-label="ویرایش"><Edit3 size={14} /></button>
                    <button type="button" onClick={() => deletePayment(row)} className="rounded border border-gray-300 p-1.5 text-gray-500 hover:bg-rose-50 hover:text-rose-700" title="حذف" aria-label="حذف"><Trash2 size={14} /></button>
                    <button type="button" onClick={() => setSelectedPayment(row)} className="rounded border border-gray-300 p-1.5 text-gray-500 hover:bg-slate-800 hover:text-white" title="پیش‌نمایش و چاپ" aria-label="پیش‌نمایش و چاپ"><Printer size={14} /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TablePagination
          currentPage={pagination.current_page || page}
          lastPage={pagination.last_page || 1}
          total={pagination.total || 0}
          perPage={perPage}
          onPageChange={setPage}
          onPerPageChange={(size) => { setPerPage(size); setPage(1); }}
          unit="مورد"
        />
      </div>
      <PaymentSlipModal
        isOpen={Boolean(selectedPayment)}
        onClose={() => setSelectedPayment(null)}
        payment={selectedPayment}
        basePath="/supplier-payments"
        title="پیش‌نمایش رسید پرداختی فروشنده"
        subtitle={selectedPayment ? `نمبر ${selectedPayment.payment_number || selectedPayment.id}` : ""}
        sheetWidth={560}
        minSheetHeight={794}
        fixedSheetHeight={794}
      />
    </div>
  );
}
