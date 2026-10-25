import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { apiUrl } from "../../api";
import { toEnglishDigits } from "../../utils";
import { showToast } from "../../utils/toast";

const DIRECTIONS = [
  { value: "customer_owes", label: "قرضدار" },
  { value: "company_owes", label: "بدهکار" },
];

const CURRENCIES = [
  { value: "AFN", label: "افغانی" },
  { value: "USD", label: "دالر" },
  { value: "both", label: "هر دو" },
];

const amountForCurrency = (entries, currency) => {
  const entry = entries.find((item) => item.currency === currency);
  if (!entry) return "";
  const amount = Number(entry.debit || 0) > 0 ? entry.debit : entry.credit;
  return String(Number(amount || 0));
};

export default function CustomerOpeningBalanceModal({
  isOpen,
  onClose,
  customerId,
  openingBalances = [],
  onSuccess,
}) {
  const [direction, setDirection] = useState("customer_owes");
  const [currency, setCurrency] = useState("AFN");
  const [afnAmount, setAfnAmount] = useState("");
  const [usdAmount, setUsdAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const hasOpeningBalance = openingBalances.some(
    (item) => Number(item.debit || 0) > 0 || Number(item.credit || 0) > 0,
  );
  const addedDuringCreation = openingBalances.some(
    (item) => item.created_during_customer_creation,
  );

  useEffect(() => {
    if (!isOpen) return;

    const afn = openingBalances.find((item) => item.currency === "AFN");
    const usd = openingBalances.find((item) => item.currency === "USD");
    const currencies = [afn, usd].filter(
      (item) => item && (Number(item.debit || 0) > 0 || Number(item.credit || 0) > 0),
    );

    setDirection(
      currencies.some((item) => Number(item.debit || 0) > 0)
        ? "customer_owes"
        : "company_owes",
    );
    setCurrency(
      afn && usd
        ? "both"
        : afn
          ? "AFN"
          : usd
            ? "USD"
            : "AFN",
    );
    setAfnAmount(amountForCurrency(openingBalances, "AFN"));
    setUsdAmount(amountForCurrency(openingBalances, "USD"));
  }, [isOpen, openingBalances]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      const payload = {
        opening_balance_direction: direction,
        opening_balance_currency: currency,
        opening_balance_afn: currency !== "USD" && afnAmount
          ? Number.parseFloat(toEnglishDigits(afnAmount))
          : null,
        opening_balance_usd: currency !== "AFN" && usdAmount
          ? Number.parseFloat(toEnglishDigits(usdAmount))
          : null,
      };
      const response = await fetch(apiUrl(`/customers/${customerId}/opening-balance`), {
        method: "PUT",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "خطا در ذخیره بیلانس افتتاحیه");

      showToast.success(data.message || "بیلانس افتتاحیه با موفقیت ذخیره شد.");
      onSuccess();
    } catch (error) {
      showToast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const renderOptions = (options, selected, onChange, name) => (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => (
        <label
          key={option.value}
          className={`inline-flex items-center gap-1.5 rounded border px-2 py-1.5 text-[10px] cursor-pointer transition-colors ${
            selected === option.value
              ? "border-emerald-500 bg-emerald-50 text-emerald-800"
              : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={selected === option.value}
            onChange={() => onChange(option.value)}
            className="h-3 w-3 accent-emerald-600"
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  );

  const renderAmount = (label, value, onChange, suffix) => (
    <div>
      <label className="block text-[10px] font-bold text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <input
          type="number"
          min="0"
          step="any"
          dir="ltr"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="0.00"
          className="w-full h-9 px-3 pl-12 bg-white border border-gray-300 rounded text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-emerald-600 text-left"
        />
        <span className="absolute left-3 top-2.5 text-[10px] text-gray-400 font-bold">
          {suffix}
        </span>
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs font-sans"
      dir="rtl"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200">
        <div className="px-4 py-3 flex items-center justify-between border-b border-gray-200">
          <div>
            <h3 className="text-sm font-bold text-gray-900">بیلانس افتتاحیه</h3>
            <p className="text-[10px] text-gray-500 mt-0.5">{customerId ? `مشتری #${customerId}` : ""}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="بستن"
            className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {hasOpeningBalance && (
            <p className="rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-[10px] leading-relaxed text-sky-800">
              {addedDuringCreation
                ? "بیلانس افتتاحیه هنگام ایجاد مشتری ثبت شده است؛ می‌توانید آن را تغییر دهید."
                : "بیلانس افتتاحیه قبلاً ثبت شده است؛ می‌توانید آن را تغییر دهید."}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <fieldset>
              <legend className="block text-[10px] font-bold text-gray-700 mb-1.5">وضعیت حساب</legend>
              {renderOptions(DIRECTIONS, direction, setDirection, "openingBalanceDirection")}
            </fieldset>
            <fieldset>
              <legend className="block text-[10px] font-bold text-gray-700 mb-1.5">واحد پول</legend>
              {renderOptions(CURRENCIES, currency, setCurrency, "openingBalanceCurrency")}
            </fieldset>
          </div>

          <div className={`grid gap-3 ${currency === "both" ? "grid-cols-2" : "grid-cols-1"}`}>
            {currency !== "USD" && renderAmount("مبلغ افغانی", afnAmount, setAfnAmount, "AFN")}
            {currency !== "AFN" && renderAmount("مبلغ دالر", usdAmount, setUsdAmount, "USD")}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-3 py-1.5 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 rounded-lg text-[10px] font-bold cursor-pointer disabled:opacity-50"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold cursor-pointer disabled:opacity-50"
            >
              {saving ? "در حال ذخیره..." : "ذخیره بیلانس"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
