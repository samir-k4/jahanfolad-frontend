import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, ArrowRight } from "lucide-react";
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_af from "../../utils/persian_af";
import { apiUrl } from "../../api";
import { toEnglishDigits } from "../../utils";
import { BranchSelect, CustomDropdown } from "../common";
import { useTranslation } from "react-i18next";

const money = (value) => Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
const cell = "p-3 border-l border-gray-200 whitespace-nowrap";

export default function PaidSalariesPage() {
  const { t } = useTranslation("salary");
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("all");
  const [branch, setBranch] = useState("all");
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ per_page: "100", paginate: "false" });
    if (source !== "all") params.set("source", source);
    if (branch !== "all") params.set("branch_id", branch);
    if (search.trim()) params.set("search", search.trim());
    if (fromDate) params.set("from_date", toEnglishDigits(fromDate.format("YYYY/MM/DD")));
    if (toDate) params.set("to_date", toEnglishDigits(toDate.format("YYYY/MM/DD")));
    setLoading(true);
    fetch(apiUrl(`/employee-payments?${params}`), { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => setPayments(Array.isArray(body?.data) ? body.data : []))
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [source, branch, search, fromDate, toDate]);

  return (
    <div className="w-full space-y-4 font-sans" dir="rtl">
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-lg font-bold text-gray-900">{t("payment.paidSalaries.title")}</h2>
        </div>
        <Link to="/salaries" className="inline-flex items-center gap-1.5 rounded-btn border border-gray-300 bg-white px-3 py-1.5 text-caption-text font-bold text-gray-700 hover:bg-gray-50">
          <ArrowRight size={15} />
          {t("payment.paidSalaries.back")}
        </Link>
      </div>
      <div className="overflow-hidden rounded-card border border-gray-200 bg-white shadow-2xs">
        <div className="flex flex-wrap items-end gap-2.5 border-b border-gray-200 bg-gray-50/70 p-4">
          <div className="w-44">
            <label className="mb-1 block text-caption-text font-bold text-gray-700">{t("payment.history.fromLabel")}</label>
            <DatePicker value={fromDate} onChange={setFromDate} calendar={persian} locale={persian_af} format="YYYY/MM/DD" inputClass="w-full rounded-input border border-gray-300 px-2.5 py-2 text-center font-mono text-caption-text" />
          </div>
          <div className="w-44">
            <label className="mb-1 block text-caption-text font-bold text-gray-700">{t("payment.history.toLabel")}</label>
            <DatePicker value={toDate} onChange={setToDate} calendar={persian} locale={persian_af} format="YYYY/MM/DD" inputClass="w-full rounded-input border border-gray-300 px-2.5 py-2 text-center font-mono text-caption-text" />
          </div>
          <div className="w-44">
            <BranchSelect variant="searchable" value={branch} onChange={setBranch} includeAll allLabel={t("payment.history.branchAll")} placeholder={t("payment.history.branchPlaceholder")} buttonClassName="w-full rounded-input border border-gray-300 px-2.5 py-2 text-caption-text" />
          </div>
          <div className="w-44">
            <CustomDropdown
              value={source}
              onChange={setSource}
              options={[
                { value: "all", label: t("payment.history.source.all") },
                { value: "hand", label: t("payment.history.source.hand") },
                { value: "payroll", label: t("payment.history.source.payroll") },
              ]}
              buttonClassName="w-full rounded-input border border-gray-300 px-2.5 py-2 text-caption-text"
              width="w-full"
              usePortal
            />
          </div>
          <div className="relative min-w-[240px] flex-1">
            <Search size={15} className="absolute right-2.5 top-3 text-gray-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("payment.history.searchPlaceholder")} className="w-full rounded-input border border-gray-300 py-2 pl-3 pr-8 text-caption-text outline-none focus:border-slate-700" />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          {loading ? (
            <p className="p-12 text-center text-label-text text-gray-500">{t("payment.history.loading")}</p>
          ) : payments.length === 0 ? (
            <p className="p-12 text-center text-label-text text-gray-500">{t("payment.paidSalaries.empty")}</p>
          ) : (
            <table className="min-w-[1050px] w-full border-collapse text-right text-table-cell-text text-gray-800">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/70">
                  <th className={`${cell} font-bold`}>{t("payment.history.columns.receipt")}</th>
                  <th className={`${cell} text-center font-bold`}>{t("payment.history.columns.paymentDate")}</th>
                  <th className={`${cell} text-center font-bold`}>{t("payment.history.columns.forMonth")}</th>
                  <th className={`${cell} font-bold`}>{t("payment.history.columns.employeeName")}</th>
                  <th className={`${cell} font-bold`}>{t("payment.history.columns.type")}</th>
                  <th className={`${cell} font-bold`}>{t("payment.history.columns.vault")}</th>
                  <th className={`${cell} text-center font-bold`}>{t("payment.history.columns.amount")}</th>
                  <th className={`${cell} font-bold`}>{t("payment.history.columns.description")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50/70">
                    <td className={`${cell} font-mono`} dir="ltr">{payment.receipt_number || "—"}</td>
                    <td className={`${cell} text-center font-mono`} dir="ltr">{toEnglishDigits(payment.shamsi_date || "—")}</td>
                    <td className={`${cell} text-center`}>{payment.shamsi_month_name} {payment.shamsi_year}</td>
                    <td className={`${cell} font-bold`}>{payment.employee?.full_name || "—"}</td>
                    <td className={cell}>{payment.payment_type?.name || (payment.payroll_run_id ? t("payment.history.badge.payroll") : t("payment.history.badge.hand"))}</td>
                    <td className={cell}>{payment.manager_advance ? `${payment.manager_advance.receiver_name} (امانت مدیریت)` : payment.vault?.name || "—"}</td>
                    <td className={`${cell} text-center font-mono font-bold`} dir="ltr">{money(payment.amount)}</td>
                    <td className={`${cell} whitespace-normal`}>{payment.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
