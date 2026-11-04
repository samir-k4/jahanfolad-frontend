import { useEffect, useState } from "react";
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_af from "../utils/persian_af";
import { ArrowRight, Save } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { CustomDropdown, SearchableSelect } from "../components/common";
import { apiFetch, apiList } from "../api";
import { showToast } from "../utils/toast";
import { formatCurrencyAmount } from "../utils/dariNumberFormatter";

const CURRENCIES = [
  { value: "AFN", label: "افغانی (AFN)" },
  { value: "USD", label: "دالر (USD)" },
  { value: "IRR", label: "تومان (IRR)" },
];
const CURRENCY_DISPLAY = {
  AFN: { symbol: "؋", label: "افغانی (AFN)" },
  USD: { symbol: "$", label: "دالر (USD)" },
  IRR: { symbol: "﷼", label: "تومان (IRR)" },
};

const PAYMENT_TYPES = [
  { value: "supplier_debt", label: "پرداخت بدهی فروشنده" },
];
const USD_RATE = 70;

export default function SupplierPaymentCreatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const editingPayment = location.state?.payment || null;
  const [editingPaymentId, setEditingPaymentId] = useState(editingPayment?.id || null);
  const [sellers, setSellers] = useState([]);
  const [vaults, setVaults] = useState([]);
  const [supplierSummary, setSupplierSummary] = useState([]);
  const [loadingSupplierBalance, setLoadingSupplierBalance] = useState(false);
  const [dateObj, setDateObj] = useState(() => new DateObject({ calendar: persian, locale: persian_af }));
  const [form, setForm] = useState({
    supplier_id: "",
    amount: "",
    currency: "AFN",
    vault_id: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([apiList("/suppliers?per_page=100"), apiList("/vaults?per_page=100")])
      .then(([sellerRows, vaultRows]) => {
        setSellers(sellerRows || []);
        setVaults(vaultRows || []);
      })
      .catch((error) => showToast.error(error.message || "اطلاعات فرم پرداخت بارگذاری نشد."));
  }, []);

  useEffect(() => {
    if (!editingPayment) return;
    setForm((current) => ({
      ...current,
      supplier_id: String(editingPayment.supplier_id || editingPayment.supplier?.id || ""),
      amount: String(editingPayment.amount || ""),
      currency: editingPayment.currency || "AFN",
      vault_id: String(editingPayment.vault_id || editingPayment.vault?.id || ""),
      notes: editingPayment.notes || "",
    }));
    if (editingPayment.shamsi_date) {
      setDateObj(new DateObject({
        date: editingPayment.shamsi_date,
        calendar: persian,
        locale: persian_af,
      }));
    }
  }, [editingPayment]);

  useEffect(() => {
    let active = true;
    if (!form.supplier_id) {
      setSupplierSummary([]);
      setLoadingSupplierBalance(false);
      return () => { active = false; };
    }

    setLoadingSupplierBalance(true);
    apiFetch(`/suppliers/${form.supplier_id}/account`)
      .then((account) => {
        if (active) setSupplierSummary(account.summary || []);
      })
      .catch((error) => {
        if (active) {
          setSupplierSummary([]);
          showToast.error(error.message || "مانده حساب فروشنده بارگذاری نشد.");
        }
      })
      .finally(() => {
        if (active) setLoadingSupplierBalance(false);
      });

    return () => { active = false; };
  }, [form.supplier_id]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    const balance = supplierSummary.find((row) => row.currency === form.currency)?.balance || 0;
    if (!form.supplier_id || Number(form.amount) <= 0 || !form.vault_id) {
      showToast.error("فروشنده، مبلغ و خزانه را انتخاب کنید.");
      return;
    }
    if (Number(form.amount) > Number(balance)) {
      showToast.error("مبلغ پرداختی نمی‌تواند بیشتر از طلب باقی‌مانده فروشنده باشد.");
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch(editingPaymentId ? `/supplier-payments/${editingPaymentId}` : "/supplier-payments", {
        method: editingPaymentId ? "PUT" : "POST",
        body: {
          supplier_id: Number(form.supplier_id),
          amount: Number(form.amount),
          currency: form.currency,
          vault_id: Number(form.vault_id),
          notes: form.notes.trim() || null,
          shamsi_date: dateObj.format("YYYY/MM/DD"),
        },
      });
      showToast.success(editingPaymentId ? "پرداختی ویرایش شد." : "پرداخت به فروشنده ثبت شد.");
      navigate("/seller-payments");
    } catch (error) {
      showToast.error(error.message || "ثبت پرداخت انجام نشد.");
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass = "mt-1 h-10 w-full rounded-input border border-gray-300 bg-white px-3 text-xs text-gray-800 focus:border-rose-600 focus:ring-1 focus:ring-rose-500";
  const dropdownClass = "h-10 w-full border-gray-300 bg-white px-3 text-xs focus:border-rose-600 focus:ring-1 focus:ring-rose-500";
  const selectedSeller = sellers.find((seller) => String(seller.id) === String(form.supplier_id));
  const selectedVault = vaults.find((vault) => String(vault.id) === String(form.vault_id));
  const selectedCurrency = CURRENCIES.find((currency) => currency.value === form.currency);
  const currencyDisplay = CURRENCY_DISPLAY[form.currency];
  const amountValue = Number(form.amount) || 0;
  const supplierBalance = Number(
    supplierSummary.find((row) => row.currency === form.currency)?.balance || 0,
  );
  const usdEquivalent = form.currency === "USD"
    ? amountValue
    : form.currency === "AFN"
      ? amountValue / USD_RATE
      : null;

  return (
    <div className="w-full space-y-4 pb-16 font-sans text-gray-800" dir="rtl">
      <header className="flex flex-col gap-4 border-b border-gray-200 pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">{editingPaymentId ? "ویرایش پرداختی" : "ثبت پرداختی جدید"}</h1>
          <p className="mt-1 text-xs text-gray-500">ثبت پرداخت به حساب فروشنده از موجودی شرکت</p>
        </div>
        <Link
          to="/seller-payments"
          className="inline-flex items-center gap-1.5 rounded-btn border border-gray-300 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 shadow-2xs hover:bg-gray-50"
        >
          <ArrowRight size={15} />
          بازگشت به پرداختی‌ها
        </Link>
      </header>

      <form onSubmit={submit} className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <section className="space-y-5 rounded-card border border-gray-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h2 className="text-sm font-bold text-gray-900">اطلاعات طرف حساب و مشخصات سند</h2>
            <span className="rounded-badge border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700">
              پرداخت فروشنده
            </span>
          </div>

          <div className="grid w-full grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
            <div className="min-w-0 w-full">
              <label className="mb-1.5 block text-xs font-bold text-gray-800">
                فروشنده <span className="text-rose-500">*</span>
              </label>
              <SearchableSelect
                value={form.supplier_id}
                onChange={(value) => update("supplier_id", value)}
                options={sellers.map((seller) => ({
                  value: String(seller.id),
                  label: `${seller.code} - ${seller.name}`,
                }))}
                placeholder="انتخاب فروشنده..."
                searchPlaceholder="جستجوی فروشنده..."
                noResultsText="فروشنده‌ای یافت نشد."
                className="w-full"
                buttonClassName={dropdownClass}
              />
            </div>

            <div className="min-w-0 w-full">
              <label className="mb-1.5 block text-xs font-bold text-gray-800">
                نوعیت پرداختی <span className="text-rose-500">*</span>
              </label>
              <CustomDropdown
                value="supplier_debt"
                options={PAYMENT_TYPES}
                className="w-full"
                buttonClassName={dropdownClass}
                width="w-full"
                align="right"
              />
            </div>

            <div className="min-w-0 w-full">
              <label className="mb-1.5 block text-xs font-bold text-gray-800">
                خزانه / حساب پرداخت <span className="text-rose-500">*</span>
              </label>
              <CustomDropdown
                value={form.vault_id}
                onChange={(value) => update("vault_id", value)}
                options={vaults
                  .filter((vault) => String(vault.currency || "").toUpperCase() === form.currency)
                  .map((vault) => ({ value: String(vault.id), label: vault.name }))}
                placeholder="انتخاب خزانه..."
                className="w-full"
                buttonClassName={dropdownClass}
                width="w-full"
                align="right"
              />
            </div>

            <div className="min-w-0 w-full">
              <label className="mb-1.5 block text-xs font-bold text-gray-800">
                تاریخ پرداخت <span className="text-rose-500">*</span>
              </label>
              <DatePicker
                value={dateObj}
                onChange={setDateObj}
                calendar={persian}
                locale={persian_af}
                calendarPosition="bottom-right"
                format="YYYY/MM/DD"
                inputClass="h-10 w-full cursor-pointer rounded-btn border border-gray-300 bg-white px-3 text-xs font-normal text-gray-800 outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-500"
                containerClassName="w-full"
              />
            </div>
          </div>
          </section>

          <section className="rounded-card border border-rose-200 bg-rose-50/60 p-5 shadow-2xs">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-bold text-rose-900">طلب باقی‌مانده فروشنده</h2>
                <p className="mt-1 text-[11px] text-rose-700">حداکثر مبلغ قابل پرداخت در ارز انتخاب‌شده</p>
              </div>
              <div className="font-mono text-2xl font-bold text-rose-800" dir="ltr">
                {loadingSupplierBalance ? "..." : `${formatCurrencyAmount(supplierBalance, form.currency)} ${form.currency}`}
              </div>
            </div>
          </section>

          <section className="space-y-5 rounded-card border border-gray-200 bg-white p-5 shadow-2xs">
          <h2 className="border-b border-gray-100 pb-3 text-sm font-bold text-gray-900">
            مبلغ پرداختی و توضیحات سند
          </h2>

          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
            <label className="text-xs font-bold text-gray-800">
              مبلغ پرداختی <span className="text-rose-500">*</span>
              <div className="relative mt-1">
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.amount}
                  onChange={(event) => update("amount", event.target.value)}
                  placeholder="0.0"
                  className={`${fieldClass} pl-3 pr-28 text-left font-mono focus:border-rose-600`}
                  dir="ltr"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 border-l border-gray-200 pl-2 text-xs font-bold text-rose-700">
                  <span className="text-sm">{currencyDisplay.symbol}</span>
                  <span>{currencyDisplay.label}</span>
                </span>
              </div>
              <div className="mt-2 rounded-btn border border-rose-200 bg-rose-50/70 px-3 py-2.5">
                <div className="flex items-center justify-between text-[11px] font-medium text-rose-800">
                  <span>معادل کل به دالر (USD):</span>
                  {form.currency === "AFN" && <span className="text-[10px] text-gray-500">نرخ ۱ دالر = {USD_RATE} افغانی</span>}
                </div>
                <div className="mt-1 flex items-center gap-1 font-mono text-lg font-bold text-rose-700" dir="ltr">
                  <span>$</span>
                  <span>{usdEquivalent === null ? "—" : usdEquivalent.toFixed(2)}</span>
                  <span className="text-xs font-normal text-gray-500">USD</span>
                </div>
              </div>
            </label>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-gray-800">
                ارز پرداخت <span className="text-rose-500">*</span>
              </label>
              <CustomDropdown
                value={form.currency}
                onChange={(value) => {
                  update("currency", value);
                  update("vault_id", "");
                }}
                options={CURRENCIES}
                className="w-full"
                buttonClassName={dropdownClass}
                width="w-full"
                align="right"
              />
            </div>
          </div>

          <label className="block text-xs font-bold text-gray-800">
            توضیحات پرداخت
            <textarea
              value={form.notes}
              onChange={(event) => update("notes", event.target.value)}
              rows={4}
              placeholder="توضیحات مربوط به این پرداخت را بنویسید..."
              className="mt-1 w-full rounded-input border border-gray-300 px-3 py-2 text-xs focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </label>

          </section>
        </div>

        <aside className="h-fit rounded-card border border-gray-200 bg-white p-5 shadow-2xs lg:col-span-4">
          <h2 className="border-b border-gray-100 pb-3 text-sm font-bold text-gray-900">خلاصه سند پرداختی</h2>
          <dl className="mt-2 divide-y divide-gray-100 text-xs">
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-gray-500">شماره سند</dt>
              <dd className="font-mono font-bold text-gray-400">تولید خودکار</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-gray-500">طرف حساب</dt>
              <dd className="font-bold text-gray-800">{selectedSeller?.name || "—"}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-gray-500">نوعیت پرداخت</dt>
              <dd className="rounded-badge border border-rose-200 bg-rose-50 px-2 py-1 font-bold text-rose-700">پرداخت بدهی</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-gray-500">خزانه مقصد</dt>
              <dd className="font-bold text-gray-800">{selectedVault?.name || "—"}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-gray-500">ارز پرداخت</dt>
              <dd className="font-bold text-gray-800">{selectedCurrency?.label || "—"}</dd>
            </div>
            <div className="mt-3 rounded-btn border border-rose-200 bg-rose-50 px-3 py-3">
              <div className="flex items-center justify-between">
                <dt className="font-bold text-rose-700">مبلغ قابل ثبت</dt>
                <dd className="font-mono text-lg font-bold text-rose-700" dir="ltr">{formatCurrencyAmount(amountValue, form.currency)} <span className="text-xs font-normal">{form.currency}</span></dd>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-rose-100 pt-2 text-xs">
                <dt className="text-rose-800">معادل کل به دالر (USD)</dt>
                <dd className="font-mono font-bold text-rose-700" dir="ltr">{usdEquivalent === null ? "—" : `$ ${usdEquivalent.toFixed(2)} USD`}</dd>
              </div>
            </div>
          </dl>
          <button
            disabled={submitting}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-btn bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-rose-700 disabled:opacity-60"
          >
            <Save size={16} />
            {submitting ? "در حال ثبت..." : "ثبت پرداختی"}
          </button>
          <Link to="/seller-payments" className="mt-2 flex w-full items-center justify-center rounded-btn border border-gray-300 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50">
            انصراف
          </Link>
        </aside>
      </form>
    </div>
  );
}
