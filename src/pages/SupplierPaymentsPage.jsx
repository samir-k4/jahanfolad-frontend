import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, RefreshCw, Users, WalletCards, Printer } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CustomDropdown, TablePagination, TooltipButton } from "../components/common";
import { apiFetch, apiList } from "../api";
import { showToast } from "../utils/toast";
import { formatCurrencyAmount } from "../utils/dariNumberFormatter";

export default function SupplierPaymentsPage() {
  const { t } = useTranslation("supplierPayments");
  const [searchQuery, setSearchQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [currency, setCurrency] = useState("all");
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const sellers = await apiList("/suppliers?per_page=100");
      const rows = (await Promise.all(sellers.map(async (seller) => {
        const result = await apiFetch(`/suppliers/${seller.id}/payables`);
        return (result.summary || []).map((summary) => ({
          ...summary,
          supplier_id: seller.id,
          code: seller.code,
          name: seller.name,
          phone: seller.phone,
        }));
      }))).flat();
      setAccounts(rows);
    } catch (error) {
      showToast.error(error.message || "بارگذاری حساب فروشندگان انجام نشد.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { loadAccounts(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const filteredAccounts = useMemo(() => accounts.filter((account) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query || [account.code, account.name, account.phone].some((value) => String(value || "").toLowerCase().includes(query));
    const matchesCurrency = currency === "all" || account.currency === currency;
    const matchesStatus = status === "all" || (status === "owed" ? Number(account.remaining) > 0 : Number(account.remaining) <= 0);
    return matchesSearch && matchesCurrency && matchesStatus;
  }), [accounts, currency, searchQuery, status]);
  const visibleAccounts = useMemo(
    () => filteredAccounts.slice((page - 1) * perPage, page * perPage),
    [filteredAccounts, page, perPage],
  );
  useEffect(() => { setPage(1); }, [searchQuery, currency, status]);

  return (
    <div className="w-full space-y-4 font-sans" dir="rtl">
      <div className="flex flex-col gap-4 border-b border-gray-200 pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-page-title tracking-tight text-gray-900">{t("page.title")}</h1>
          <p className="mt-1 text-subtitle text-gray-500">{t("page.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            to="/sellers"
            className="inline-flex items-center gap-1.5 rounded-btn border border-gray-300 bg-white px-3.5 py-2 text-btn-text font-bold text-gray-700 shadow-2xs transition-colors hover:bg-gray-50"
          >
            <Users size={15} />
            {t("page.sellers")}
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-btn bg-slate-800 px-4 py-2 text-btn-text font-bold text-white shadow-xs transition-colors hover:bg-slate-900"
          >
            <Printer size={16} />
            راپور پرداختنی‌ها
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs">
        <div className="relative min-w-[240px] flex-1">
          <Search size={15} className="absolute right-3 top-2.5 text-gray-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t("filters.search")}
            className="w-full rounded-lg border border-gray-300 bg-white py-1.5 pl-3 pr-9 text-xs text-gray-800 focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
        </div>
        <CustomDropdown
          options={[
            { value: "all", label: t("filters.status.all") },
            { value: "owed", label: t("filters.status.owed") },
            { value: "settled", label: t("filters.status.settled") },
          ]}
          value={status}
          onChange={setStatus}
          placeholder={t("filters.status.label")}
          buttonClassName="min-w-[150px] px-3 py-1.5 text-xs font-medium text-gray-700"
          width="w-48"
        />
        <CustomDropdown
          options={[
            { value: "all", label: t("filters.currency.all") },
            { value: "AFN", label: t("filters.currency.afn") },
            { value: "USD", label: t("filters.currency.usd") },
            { value: "IRR", label: "تومان" },
          ]}
          value={currency}
          onChange={setCurrency}
          placeholder={t("filters.currency.label")}
          buttonClassName="min-w-[110px] px-3 py-1.5 text-xs font-medium text-gray-700"
          width="w-36"
        />
        <TooltipButton
          icon={<RefreshCw size={14} className={loading ? "animate-spin" : ""} />}
          tooltip={t("filters.refresh")}
          onClick={loadAccounts}
          colorClass="border border-gray-300 bg-white text-gray-700 hover:bg-slate-800 hover:text-white"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-right text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 font-bold text-gray-700">
                {["index", "code", "name", "phone", "purchases", "paid", "balance", "currency", "status"].map((column) => (
                  <th key={column} className="whitespace-nowrap border-l border-gray-200 px-3.5 py-2.5 text-center">
                    {t(`table.${column}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr><td colSpan={9} className="p-12 text-center text-gray-500">{t("table.loading")}</td></tr>
              ) : visibleAccounts.length === 0 ? (
                <tr><td colSpan={9} className="p-12 text-center"><WalletCards className="mx-auto mb-3 text-gray-300" size={30} strokeWidth={1.5} /><p className="font-bold text-gray-600">{t("table.empty")}</p><p className="mt-1 text-gray-400">{t("table.emptyHint")}</p></td></tr>
              ) : visibleAccounts.map((account, index) => (
                <tr key={`${account.supplier_id}-${account.currency}`} className="hover:bg-gray-50/70">
                  <td className="border-l border-gray-200 px-3.5 py-2.5 text-center">{(page - 1) * perPage + index + 1}</td>
                  <td className="border-l border-gray-200 px-3.5 py-2.5 text-center font-mono font-bold">{account.code}</td>
                  <td className="border-l border-gray-200 px-3.5 py-2.5 font-bold">{account.name}</td>
                  <td className="border-l border-gray-200 px-3.5 py-2.5" dir="ltr">{account.phone || "—"}</td>
                  <td className="border-l border-gray-200 px-3.5 py-2.5 text-center font-mono" dir="ltr">{formatCurrencyAmount(account.total, account.currency)}</td>
                  <td className="border-l border-gray-200 px-3.5 py-2.5 text-center font-mono" dir="ltr">{formatCurrencyAmount(account.paid, account.currency)}</td>
                  <td className="border-l border-gray-200 bg-rose-50/30 px-3.5 py-2.5 text-center font-mono font-bold text-rose-700" dir="ltr">{formatCurrencyAmount(account.remaining, account.currency)}</td>
                  <td className="border-l border-gray-200 px-3.5 py-2.5 text-center">{account.currency}</td>
                  <td className="px-3.5 py-2.5 text-center">{Number(account.remaining || 0) > 0 ? t("filters.status.owed") : t("filters.status.settled")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TablePagination
          currentPage={page}
          lastPage={Math.max(1, Math.ceil(filteredAccounts.length / perPage))}
          total={filteredAccounts.length}
          perPage={perPage}
          onPageChange={setPage}
          onPerPageChange={(size) => { setPerPage(size); setPage(1); }}
          unit="مورد"
        />
      </div>
    </div>
  );
}
