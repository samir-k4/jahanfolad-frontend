import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  RefreshCw,
  FileText,
  Users,
  Printer,
} from "lucide-react";
import useDebounce from "../hooks/useDebounce";
import { apiUrl } from "../api";
import { showToast } from "../utils/toast";
import { TooltipButton, TablePagination, CustomDropdown } from "../components/common";
import CustomerLoanReportModal from "../components/customers/CustomerLoanReportModal";
import { useTranslation } from "react-i18next";

const fmt = (n) => Number(n || 0).toLocaleString("en-US");
const currSymbol = (c) => (c === "USD" ? "$" : "؋");

export default function CustomerLoansPage() {
  const { t } = useTranslation("customers");
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 1000);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedCurrency, setSelectedCurrency] = useState("all");
  const [perPage, setPerPage] = useState(15);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
  });
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const fetchLoans = useCallback(
    async (page = 1, customPerPage = perPage) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page,
          per_page: customPerPage,
          search: debouncedSearchQuery.trim(),
          status: selectedStatus,
          currency: selectedCurrency,
        });

        const res = await fetch(apiUrl(`/customer-loans?${params.toString()}`));
        if (!res.ok) throw new Error(t("loans.fetchFailed"));
        const result = await res.json();
        setLoans(result.data || []);
        setPagination(
          result.pagination || {
            current_page: 1,
            last_page: 1,
            per_page: customPerPage,
            total: 0,
          }
        );
      } catch (err) {
        showToast.error(err.message);
      } finally {
        setLoading(false);
      }
    },
    [debouncedSearchQuery, selectedStatus, selectedCurrency, perPage, t]
  );

  useEffect(() => {
    fetchLoans(1);
  }, [fetchLoans]);

  return (
    <div className="w-full space-y-4 font-sans" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-page-title text-gray-900 tracking-tight">
              {t("navigation.pages.customerLoans", { ns: "common" })}
            </h1>
          </div>
          <p className="text-subtitle text-gray-500 mt-1">
            {t("loans.subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            to="/customers"
            className="px-3.5 py-2 text-btn-text font-bold text-gray-700 bg-white border border-gray-300 rounded-btn hover:bg-gray-50 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <Users size={15} />
            <span>{t("page.title")}</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            className="px-4 py-2 text-btn-text font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-btn transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Printer size={16} />
            <span>{t("loans.printReport")}</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={15} className="absolute right-3 top-2.5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("loans.searchPlaceholder")}
            className="w-full border border-gray-300 rounded-lg pr-9 pl-3 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-emerald-600 bg-white"
          />
        </div>

        <CustomDropdown
          options={[
            { value: "all", label: t("loans.status.all") },
            { value: "has_debt", label: t("loans.status.debtor") },
            { value: "has_credit", label: t("loans.status.creditor") },
            { value: "cleared", label: t("loans.status.settled") },
          ]}
          value={selectedStatus}
          onChange={(val) => setSelectedStatus(val)}
          placeholder={t("loans.accountType")}
          buttonClassName="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white min-w-[150px]"
          width="w-48"
        />

        <CustomDropdown
          options={[
            { value: "all", label: t("loans.currency.all") },
            { value: "USD", label: t("loans.currency.usd") },
            { value: "AFN", label: t("loans.currency.afn") },
          ]}
          value={selectedCurrency}
          onChange={(val) => setSelectedCurrency(val)}
          placeholder={t("loans.currency.label")}
          buttonClassName="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white min-w-[110px]"
          width="w-36"
        />

        <TooltipButton
          icon={<RefreshCw size={14} className={loading ? "animate-spin" : ""} />}
          tooltip={t("loans.refresh")}
          onClick={() => fetchLoans(pagination.current_page)}
          colorClass="bg-white hover:bg-slate-800 hover:text-white text-gray-700 border border-gray-300"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 text-gray-700 border-b border-gray-200 font-bold text-xs">
                <th className="px-3.5 py-2.5 text-center w-12 border-l border-gray-200">{t("table.columns.index")}</th>
                <th className="px-3.5 py-2.5 text-center w-24 border-l border-gray-200">{t("table.columns.code")}</th>
                <th className="px-3.5 py-2.5 border-l border-gray-200">{t("table.columns.name")}</th>
                <th className="px-3.5 py-2.5 border-l border-gray-200">{t("table.columns.phone")}</th>
                <th className="px-3.5 py-2.5 text-center w-28 border-l border-gray-200 whitespace-nowrap">{t("table.columns.creditLimit")}</th>
                <th className="px-3.5 py-2.5 text-center w-28 border-l border-gray-200 whitespace-nowrap">{t("loans.columns.lastInvoice")}</th>
                <th className="px-3.5 py-2.5 text-center w-20 border-l border-gray-200 whitespace-nowrap">{t("loans.columns.lastPaymentDate")}</th>
                <th className="px-3.5 py-2.5 text-center w-28 border-l border-gray-200 whitespace-nowrap">{t("loans.columns.lastPaymentAmount")}</th>
                <th className="px-3.5 py-2.5 text-center w-20 border-l border-gray-200">{t("loans.currency.label")}</th>
                <th className="px-3.5 py-2.5 text-center w-28 border-l border-gray-200 whitespace-nowrap">{t("loans.columns.balance")}</th>
                <th className="px-3.5 py-2.5 border-l border-gray-200 whitespace-nowrap">{t("table.createdBy", { ns: "common" })}</th>
                <th className="px-3.5 py-2.5 text-center w-24 border-l border-gray-200">{t("table.columns.status")}</th>
                <th className="px-3.5 py-2.5 text-center w-20">{t("table.columns.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={13} className="p-12 text-center text-gray-500 text-sm">
                    {t("loans.loading")}
                  </td>
                </tr>
              ) : loans.length === 0 ? (
                <tr>
                  <td colSpan={13} className="p-12 text-center text-gray-500 text-sm">
                    {t("loans.empty")}
                  </td>
                </tr>
              ) : (
                loans.map((loan, idx) => (
                  <tr key={loan.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-3.5 py-2.5 text-center font-mono text-gray-500 border-l border-gray-200">
                      {(pagination.current_page - 1) * (pagination.per_page || 15) + idx + 1}
                    </td>
                    <td
                      className="px-3.5 py-2.5 text-center font-mono font-bold text-gray-800 border-l border-gray-200"
                      dir="ltr"
                    >
                      {loan.customer_code || "—"}
                    </td>
                    <td className="px-3.5 py-2.5 font-bold text-gray-900 border-l border-gray-200">
                      <div className="flex items-center gap-1.5">
                        <Link
                          to={`/customers/${loan.customer_id}`}
                          className="hover:text-emerald-700 transition-colors"
                        >
                          {loan.customer_name}
                        </Link>
                        {loan.other_currencies?.length > 0 && (
                          <span
                            className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-mono font-bold text-3xs"
                            title={t("loans.otherCurrenciesTitle", {
                              currencies: loan.other_currencies.join(" و "),
                            })}
                          >
                            +{loan.other_currencies.join("/")}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-gray-700 border-l border-gray-200" dir="ltr">
                      {loan.phone || "—"}
                    </td>
                    <td
                      className={`px-3.5 py-2.5 text-center font-mono border-l border-gray-200 ${
                        loan.over_credit_limit ? "text-rose-700 font-bold" : "text-gray-700"
                      }`}
                      dir="ltr"
                      title={loan.over_credit_limit ? t("loans.overCreditLimit") : undefined}
                    >
                      {loan.credit_limit > 0 ? `${fmt(loan.credit_limit)} ${currSymbol(loan.currency)}` : "—"}
                    </td>
                    <td
                      className="px-3.5 py-2.5 text-center font-mono text-gray-800 font-bold border-l border-gray-200"
                      dir="ltr"
                    >
                      {loan.last_invoice_amount > 0 ? `${fmt(loan.last_invoice_amount)} ${currSymbol(loan.currency)}` : "—"}
                    </td>
                    <td
                      className="px-3.5 py-2.5 text-center font-mono text-gray-600 border-l border-gray-200"
                      dir="ltr"
                    >
                      {loan.last_payment_shamsi || "—"}
                    </td>
                    <td
                      className="px-3.5 py-2.5 text-center font-mono text-gray-800 font-bold border-l border-gray-200"
                      dir="ltr"
                    >
                      {loan.last_payment_amount > 0 ? `${fmt(loan.last_payment_amount)} ${currSymbol(loan.currency)}` : "—"}
                    </td>
                    <td className="px-3.5 py-2.5 text-center border-l border-gray-200">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-50 text-gray-700 border border-gray-200 font-mono font-medium text-xs"
                        dir="ltr"
                      >
                        {loan.currency}
                      </span>
                    </td>
                    <td
                      className={`px-3.5 py-2.5 text-center font-mono font-bold border-l border-gray-200 ${
                        loan.current_balance > 0
                          ? "text-rose-700"
                          : loan.current_balance < 0
                          ? "text-emerald-700"
                          : "text-gray-700"
                      }`}
                      dir="ltr"
                    >
                      {fmt(Math.abs(loan.current_balance))} {currSymbol(loan.currency)}
                      {loan.over_credit_limit && (
                        <span className="mr-1 inline-block w-1.5 h-1.5 rounded-full bg-rose-600" title={t("loans.overCreditLimit")} />
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 border-l border-gray-200 text-gray-700 whitespace-nowrap">
                      {loan.created_by || "—"}
                    </td>
                    <td className="px-3.5 py-2.5 text-center border-l border-gray-200">
                      {loan.status === "has_debt" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200 font-bold text-xs">
                          {t("loans.status.debtor")}
                        </span>
                      ) : loan.status === "has_credit" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-200 font-bold text-xs">
                          {t("loans.status.creditor")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-xs">
                          {t("loans.status.settled")}
                        </span>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Link
                          to={`/customers/${loan.customer_id}`}
                          className="p-1.5 bg-white hover:bg-slate-800 hover:text-white text-gray-500 border border-gray-300 rounded-lg shadow-2xs transition-all cursor-pointer inline-flex items-center justify-center"
                          title={t("loans.viewStatement")}
                        >
                          <FileText size={14} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          currentPage={pagination.current_page}
          lastPage={pagination.last_page}
          total={pagination.total}
          perPage={perPage}
          onPageChange={(page) => fetchLoans(page)}
          onPerPageChange={(size) => {
            setPerPage(size);
            fetchLoans(1, size);
          }}
          unit={t("pagination.unit")}
        />
      </div>

      <CustomerLoanReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />
    </div>
  );
}
