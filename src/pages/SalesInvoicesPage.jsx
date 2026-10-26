import React, { useState, useEffect, useCallback } from "react";
import { usePagePerms } from "../components/common";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FileText,
  Plus,
  Search,
  Printer,
  Info,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Truck,
  Pencil,
  X,
} from "lucide-react";
import useBodyScrollLock from "../hooks/useBodyScrollLock";
import useDebounce from "../hooks/useDebounce";
import { apiUrl } from "../api";
import SalesInvoicePreviewModal from "../components/sales/SalesInvoicePreviewModal";
import {
  TooltipButton,
  CustomDropdown,
  TablePagination,
  DeleteConfirmationModal,
} from "../components/common";
import { showToast, formatProductName, formatShamsiDate } from "../utils";

const fmt = (n) => Number(n || 0).toLocaleString("en-US");
const currencySign = (currency) => currency === "AFN" ? "؋" : "$";
const transportAmountInInvoiceCurrency = (invoice) => {
  const amountAfn = Number(invoice?.transport_amount_afn || 0);
  if (invoice?.currency === "USD") {
    const rate = Number(invoice?.transport_exchange_rate || 70);
    return rate > 0 ? amountAfn / rate : 0;
  }
  return amountAfn;
};

export default function SalesInvoicesPage() {
  const { canCreate, canEdit, canDelete } = usePagePerms("sales");
  const location = useLocation();
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 400);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [perPage, setPerPage] = useState(15);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
  });

  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [deletingInvoice, setDeletingInvoice] = useState(null);
  const [createdSuccessInvoice, setCreatedSuccessInvoice] = useState(null);
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [warehouseExitInvoice, setWarehouseExitInvoice] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useBodyScrollLock(!!viewingInvoice || !!deletingInvoice || !!createdSuccessInvoice || !!previewInvoice || !!warehouseExitInvoice);

  useEffect(() => {
    if (location.state?.justCreated && location.state?.newInvoice) {
      setCreatedSuccessInvoice(location.state.newInvoice);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const fetchInvoices = useCallback(async (page = 1, customPerPage = perPage) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        per_page: customPerPage,
        search: debouncedSearchQuery.trim(),
        status: selectedStatus,
      });

      const res = await fetch(apiUrl(`/sales-invoices?${params.toString()}`));
      if (!res.ok) throw new Error("خطا در دریافت لیست فاکتورها");
      const result = await res.json();
      setInvoices(result.data || []);
      setPagination(result.pagination || { current_page: 1, last_page: 1, total: 0 });
    } catch (err) {
      showToast.error(err.message || "خطا در دریافت لیست فاکتورها");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchQuery, selectedStatus, perPage]);

  useEffect(() => {
    fetchInvoices(1);
  }, [fetchInvoices]);

  const handleDeleteInvoice = async () => {
    if (!deletingInvoice) return;
    setSubmitting(true);
    try {
      const res = await fetch(apiUrl(`/sales-invoices/${deletingInvoice.id}`), {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.message || "خطا در حذف فاکتور");

      showToast.success(resData.message || "فاکتور با موفقیت حذف گردید.");
      setDeletingInvoice(null);
      fetchInvoices(pagination.current_page);
    } catch (err) {
      showToast.error(err.message || "خطا در حذف فاکتور");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintInvoice = (inv) => {
    if (!inv) return;
    setPreviewInvoice(inv);
  };

  return (
    <div className="w-full space-y-4 font-sans text-gray-800" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              لیست و مدیریت فاکتورهای فروش
            </h1>
          </div>
          <p className="text-xs text-gray-500 font-medium mt-1">
            صدور فاکتور رسمی، وضعیت تسویه مالی، بارگیری و پرینت اسناد فروش
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {canCreate && (
            <Link
              to="/sales/invoices/create"
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={16} />
              <span>ثبت فاکتور جدید</span>
            </Link>
          )}
        </div>
      </div>

      <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-2.5 text-gray-400" size={15} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو بر اساس شماره فاکتور، نام مشتری، راننده یا پلیت..."
            className="w-full border border-gray-300 rounded-lg pr-9 pl-3 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-emerald-600 bg-white"
          />
        </div>

        <CustomDropdown
          value={selectedStatus}
          onChange={(val) => setSelectedStatus(val)}
          options={[
            { value: "all", label: "همه وضعیت‌ها" },
            { value: "paid", label: "کاملاً تسویه شده" },
            { value: "partial", label: "تسویه قسمتی (باقی‌دار)" },
            { value: "unpaid", label: "کاملاً باقی‌دار" },
          ]}
          placeholder="وضعیت تسویه"
          buttonClassName="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white min-w-[160px]"
          width="w-52"
          align="right"
        />

        <TooltipButton
          onClick={() => fetchInvoices(pagination.current_page)}
          tooltip="بروزرسانی لیست"
          icon={<RefreshCw size={14} className={loading ? "animate-spin" : ""} />}
          colorClass="bg-white text-gray-600 hover:text-gray-900 border border-gray-300"
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
                <th className="p-3 text-center w-12 border-l border-gray-200">#</th>
                <th className="p-3 text-center w-24 border-l border-gray-200">شماره فاکتور</th>
                <th className="p-3 border-l border-gray-200">نام مشتری</th>
                <th className="p-3 text-center border-l border-gray-200">حساب مقصد</th>
                <th className="p-3 text-center w-24 border-l border-gray-200">تاریخ</th>
                <th className="p-3 text-center w-28 border-l border-gray-200" dir="ltr">مبلغ فاکتور</th>
                <th className="p-3 text-center w-24 border-l border-gray-200" dir="ltr">تخفیف</th>
                <th className="p-3 text-center w-28 border-l border-gray-200">ثبت‌کننده</th>
                <th className="p-3 text-center w-28">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-500">
                    <RefreshCw size={22} className="animate-spin mx-auto mb-2 text-slate-700" />
                    <span>در حال بارگذاری فاکتورهای فروش...</span>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-500">
                    <FileText size={32} className="mx-auto mb-2 text-gray-300" />
                    <span>هیچ فاکتوری ثبت نشده است.</span>
                  </td>
                </tr>
              ) : (
                invoices.map((inv, idx) => {
                  const isAfn = inv.currency === "AFN" || inv.currency === "afn" || inv.currency === "افغانی";
                  const currSign = isAfn ? "؋" : "$";

                  return (
                    <tr key={inv.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="p-3 text-center text-gray-500 font-mono border-l border-gray-100">
                        {idx + 1 + (pagination.current_page - 1) * 15}
                      </td>

                      <td className="p-3 text-center font-mono font-bold text-gray-900 border-l border-gray-100">
                        <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-bold">
                          {inv.invoice_number}
                        </span>
                      </td>

                      <td className="p-3 font-bold text-gray-900 border-l border-gray-100">
                        <div className="flex flex-col gap-1">
                          {inv.customer_id ? (
                            <Link
                              to={`/customers/${inv.customer_id}`}
                              className="hover:text-emerald-700 hover:underline cursor-pointer"
                            >
                              {inv.customer_name}
                            </Link>
                          ) : (
                            <span>{inv.customer_name}</span>
                          )}
                          {(inv.driver_name || inv.truck_plate) && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-500">
                              <Truck size={11} className="shrink-0" />
                              {inv.driver_name && <span>راننده: {inv.driver_name}</span>}
                              {inv.truck_plate && <span dir="ltr">({inv.truck_plate})</span>}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3 text-center border-l border-gray-100">
                        <span className="px-2 py-0.5 font-medium text-xs text-gray-600">
                          {inv.target_account || "لست طلبات"}
                        </span>
                      </td>

                      <td className="p-3 text-center font-mono text-gray-700 border-l border-gray-100">
                        {formatShamsiDate(inv.shamsi_date) || "—"}
                      </td>

                      <td className="p-3 text-center font-mono font-bold text-gray-900 border-l border-gray-100" dir="ltr">
                        <span className="inline-flex items-center gap-1 font-mono font-bold">
                          <span>{fmt(inv.total_amount)}</span>
                          <span className="text-xs font-sans text-gray-600">{currSign}</span>
                        </span>
                      </td>

                      <td className="p-3 text-center font-mono text-gray-700 border-l border-gray-100" dir="ltr">
                        {Number(inv.discount || 0) > 0 ? (
                          <span className="inline-flex items-center gap-1 font-mono font-medium text-amber-800">
                            <span>{fmt(inv.discount)}</span>
                            <span className="text-xs font-sans">{currSign}</span>
                          </span>
                        ) : (
                          <span className="text-gray-400 font-sans">—</span>
                        )}
                      </td>

                      <td className="p-3 text-center text-gray-700 border-l border-gray-100">
                        {inv.created_by || "—"}
                      </td>

                      <td className="p-3 text-center min-w-[120px]">
                        <div className="flex items-center justify-center gap-1.5">
                          <TooltipButton
                            tooltip="مشاهده جزییات فاکتور"
                            onClick={() => setViewingInvoice(inv)}
                            icon={<Info size={14} />}
                            colorClass="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300"
                          />

                          {canEdit && (
                            <TooltipButton
                              tooltip="ویرایش فاکتور"
                              onClick={() => navigate(`/sales/invoices/${inv.id}/edit`)}
                              icon={<Pencil size={14} />}
                              colorClass="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300"
                            />
                          )}

                          <TooltipButton
                            tooltip="چاپ فاکتور رسمی"
                            onClick={() => handlePrintInvoice(inv)}
                            icon={<Printer size={14} />}
                            colorClass="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300"
                          />

                          <TooltipButton
                            tooltip="خروجی گدام (برای راننده)"
                            onClick={() => setWarehouseExitInvoice(inv)}
                            icon={<Truck size={14} />}
                            colorClass="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300"
                          />

                          {canDelete && (
                            <TooltipButton
                              tooltip="حذف فاکتور"
                              onClick={() => setDeletingInvoice(inv)}
                              icon={<Trash2 size={14} />}
                              colorClass="bg-white text-red-600 hover:text-white hover:bg-red-600 border border-gray-300"
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          currentPage={pagination.current_page || 1}
          lastPage={pagination.last_page || 1}
          total={pagination.total || 0}
          perPage={perPage}
          onPageChange={(page) => fetchInvoices(page)}
          onPerPageChange={(size) => {
            setPerPage(size);
            fetchInvoices(1, size);
          }}
          unit="فاکتور"
        />
      </div>

      {viewingInvoice && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs font-sans" dir="rtl">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">جزییات فاکتور {viewingInvoice.invoice_number}</h3>
                  <p className="text-xs text-gray-500 font-medium">مشاهده اقلام، مبالغ و وضعیت فاکتور</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingInvoice(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs max-h-[85vh] overflow-y-auto">
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 flex items-center justify-between">
                <div>
                  <span className="text-gray-500 block text-[11px]">خریدار:</span>
                  <span className="text-sm font-bold text-gray-900">{viewingInvoice.customer_name}</span>
                </div>
                <div className="text-left font-mono font-bold text-gray-700">
                  {formatShamsiDate(viewingInvoice.shamsi_date)}
                </div>
              </div>

              {(viewingInvoice.driver_name || viewingInvoice.truck_plate || viewingInvoice.notes) && (
                <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-2">
                  {(viewingInvoice.driver_name || viewingInvoice.truck_plate) && (
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-gray-700">
                      {viewingInvoice.driver_name && (
                        <span><strong className="text-gray-500">راننده:</strong> {viewingInvoice.driver_name}</span>
                      )}
                      {viewingInvoice.truck_plate && (
                        <span><strong className="text-gray-500">پلیت موتر:</strong> <bdi dir="ltr">{viewingInvoice.truck_plate}</bdi></span>
                      )}
                    </div>
                  )}
                  {viewingInvoice.notes && (
                    <div className="border-t border-gray-100 pt-2 whitespace-pre-wrap break-words">
                      <strong className="text-gray-500">توضیحات فاکتور:</strong>
                      <p className="mt-1 text-gray-800">{viewingInvoice.notes}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-right border-collapse">
                  <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
                    <tr>
                      <th className="p-2.5">اقلام کالا</th>
                      <th className="p-2.5 text-center">مقدار / واحد</th>
                      <th className="p-2.5 text-left" dir="ltr">مجموع ({viewingInvoice.currency})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(viewingInvoice.items || []).map((it, i) => (
                      <tr key={i}>
                        <td className="p-2.5 font-medium text-gray-900">{formatProductName(it.product_name)}</td>
                        <td className="p-2.5 text-center text-gray-700" dir="ltr">
                          {Number(it.billable_quantity || it.quantity).toLocaleString()} {it.sales_scale || "تن"}
                        </td>
                        <td className="p-2.5 text-left font-mono font-bold text-gray-900" dir="ltr">
                          {currencySign(viewingInvoice.currency)}{fmt(it.total_price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-1.5">
                {transportAmountInInvoiceCurrency(viewingInvoice) > 0 && (
                  <div className="flex justify-between font-semibold text-gray-700">
                    <span>هزینه انتقال:</span>
                    <span className="font-mono" dir="ltr">
                      {currencySign(viewingInvoice.currency)}{fmt(transportAmountInInvoiceCurrency(viewingInvoice))}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-gray-900">
                  <span>مجموع کل فاکتور:</span>
                  <span className="font-mono" dir="ltr">{currencySign(viewingInvoice.currency)}{fmt(viewingInvoice.total_amount)}</span>
                </div>
                <div className="flex justify-between font-semibold text-emerald-700">
                  <span>مبلغ دریافت شده:</span>
                  <span className="font-mono" dir="ltr">{currencySign(viewingInvoice.currency)}{fmt(viewingInvoice.paid_amount)}</span>
                </div>
                <div className="flex justify-between font-bold text-rose-700 border-t border-gray-200 pt-1.5">
                  <span>مانده حساب طلب:</span>
                  <span className="font-mono" dir="ltr">{currencySign(viewingInvoice.currency)}{fmt(viewingInvoice.remaining_amount)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => handlePrintInvoice(viewingInvoice)}
                  className="px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-gray-300 shadow-2xs"
                >
                  <Printer size={14} />
                  <span>چاپ فاکتور</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingInvoice(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-xs"
                >
                  بستن
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmationModal
        isOpen={Boolean(deletingInvoice)}
        onClose={() => setDeletingInvoice(null)}
        onConfirm={handleDeleteInvoice}
        itemName={deletingInvoice ? `فاکتور شماره ${deletingInvoice.invoice_number} (${deletingInvoice.customer_name})` : ""}
        title="تایید حذف فاکتور"
        question="آیا از حذف این فاکتور مطمئن هستید؟"
        warning="با حذف فاکتور، اسناد و تراکنش‌های مربوطه لغو خواهند شد."
        loading={submitting}
      />

      {createdSuccessInvoice && (
        <div className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 font-sans" dir="rtl">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    فاکتور با موفقیت ثبت شد
                  </h3>
                  <p className="text-xs text-gray-500 font-mono">
                    شماره فاکتور: {createdSuccessInvoice.invoice_number}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreatedSuccessInvoice(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium">مشتری:</span>
                  <span className="font-bold text-gray-900">{createdSuccessInvoice.customer_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium">تاریخ فاکتور:</span>
                  <span className="font-mono text-gray-800">{formatShamsiDate(createdSuccessInvoice.shamsi_date) || "—"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium">مجموع نهایی:</span>
                  <span className="font-bold text-emerald-700 font-mono text-sm" dir="ltr">
                    ${fmt(createdSuccessInvoice.total_amount)}
                  </span>
                </div>
                {Number(createdSuccessInvoice.paid_amount) > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-medium">مبلغ پرداخت شده:</span>
                    <span className="font-bold text-emerald-600 font-mono" dir="ltr">
                      ${fmt(createdSuccessInvoice.paid_amount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center border-t border-gray-200 pt-2">
                  <span className="text-gray-500 font-medium">باقی:</span>
                  <span className="font-bold text-rose-700 font-mono" dir="ltr">
                    ${fmt(createdSuccessInvoice.remaining_amount)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setCreatedSuccessInvoice(null)}
                  className="flex-1 py-2 px-3.5 bg-white hover:bg-gray-50 text-gray-800 font-bold text-xs rounded-lg border border-gray-300 transition-colors cursor-pointer shadow-2xs text-center"
                >
                  تمام
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const targetInv = createdSuccessInvoice;
                    setCreatedSuccessInvoice(null);
                    handlePrintInvoice(targetInv);
                  }}
                  className="flex-1 py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer size={15} />
                  <span>چاپ فاکتور</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {previewInvoice && (
        <SalesInvoicePreviewModal
          isOpen={!!previewInvoice}
          onClose={() => setPreviewInvoice(null)}
          invoice={previewInvoice}
        />
      )}

      {warehouseExitInvoice && (
        <SalesInvoicePreviewModal
          isOpen={!!warehouseExitInvoice}
          onClose={() => setWarehouseExitInvoice(null)}
          invoice={warehouseExitInvoice}
          mode="warehouse-exit"
        />
      )}
    </div>
  );
}
