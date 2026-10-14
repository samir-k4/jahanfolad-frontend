import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Building2, Calendar, CheckCheck, Printer, Wallet } from "lucide-react";
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import { BranchSelect } from "../common";
import persian_af from "../../utils/persian_af";
import { DEFAULT_MONTH_DAYS } from "../../constants/salaryDomain";
const CONTROL_SHELL =
  "flex items-center gap-1.5 bg-white border border-gray-300 rounded-input px-2.5 py-1.5 shadow-2xs";
const ACTION_BASE =
  "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-btn text-btn-text font-bold transition-colors cursor-pointer";
export default function SalaryHeader({
  selectedBranch,
  onBranchChange,
  selectedDateObject,
  onDateChange,
  afghanMonthInfo,
  onPrintPayroll,
  onOpenBatchSettle,
  beforeAccountStart = false,
  accountStart = null,
}) {
  const { t } = useTranslation("salary");
  const monthName =
    afghanMonthInfo?.shamsi_month_name || selectedDateObject?.format("MMMM") || t("page.currentMonth");
  const yearName = afghanMonthInfo?.shamsi_year || selectedDateObject?.format("YYYY") || "";
  const totalDays = afghanMonthInfo?.total_days_in_month || DEFAULT_MONTH_DAYS;
  return (
    <div className="w-full flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 border-b border-gray-200 pb-4 font-sans" dir="rtl">
      <div className="space-y-1.5">
        <h1 className="text-page-title text-gray-900 tracking-tight">{t("page.title")}</h1>
        <p className="text-caption-text text-gray-500 font-medium">{t("page.subtitle")}</p>
        <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 border border-gray-200 rounded-badge px-2.5 py-0.5 text-caption-text font-bold">
          <Calendar size={13} className="text-gray-500" />
          <span>{t("page.monthBadge", { month: monthName, year: yearName })}</span>
          <span className="font-mono text-gray-400" dir="ltr">
            {t("page.monthDays", { days: totalDays })}
          </span>
        </span>
        {beforeAccountStart ? (
          <p className="text-caption-text text-gray-500 font-medium whitespace-normal break-words">
            {t("page.beforeAccountStart", {
              month: accountStart?.shamsi_month_name || "",
              year: accountStart?.shamsi_year || "",
            })}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col items-stretch lg:items-end gap-2.5">
        <div className="flex flex-wrap items-center gap-2.5 lg:justify-end">
          <div className={CONTROL_SHELL}>
            <Calendar size={15} className="text-gray-400" />
            <DatePicker
              value={selectedDateObject}
              onChange={onDateChange}
              calendar={persian}
              locale={persian_af}
              calendarPosition="bottom-right"
              className="rmdp-steel"
              format="YYYY/MM/DD"
              portal
              zIndex={9999}
              inputClass="bg-transparent text-label-text font-bold text-gray-800 outline-none cursor-pointer w-24 text-center font-sans border-0 shadow-none focus:ring-0 p-0"
              containerClassName="w-auto"
              placeholder={t("header.selectDate")}
            />
          </div>
          <BranchSelect
            value={selectedBranch}
            onChange={onBranchChange}
            includeAll
            allLabel={t("filters.allBranches", { ns: "common" })}
            icon={<Building2 size={14} className="text-gray-500" />}
            buttonClassName="px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-input text-label-text font-bold shadow-2xs min-w-[150px]"
            width="w-48"
            align="right"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2.5 lg:justify-end">
          <button
            type="button"
            onClick={onOpenBatchSettle}
            disabled={beforeAccountStart}
            title={beforeAccountStart ? t("page.beforeAccountStartShort") : undefined}
            className={`${ACTION_BASE} bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <CheckCheck size={15} />
            <span>{t("header.batchSettle")}</span>
          </button>
          <Link
            to="/salaries/payment"
            className={`${ACTION_BASE} bg-slate-800 hover:bg-slate-900 text-white shadow-xs`}
          >
            <Wallet size={15} />
            <span>{t("header.advancePayments")}</span>
          </Link>
          <button
            type="button"
            onClick={onPrintPayroll}
            className={`${ACTION_BASE} bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-2xs`}
          >
            <Printer size={15} className="text-gray-500" />
            <span>{t("header.printPayroll")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
