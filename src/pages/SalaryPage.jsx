import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import DateObject from "react-date-object";
import persian from "react-date-object/calendars/persian";
import { apiUrl } from "../api";
import { useBranch } from "../context/BranchContext";
import persian_af from "../utils/persian_af";
import {
  SalaryHeader,
  SalaryTable,
  SalaryPayslipModal,
  SalaryAttendanceModal,
  SalaryPayrollReportModal,
  SalaryBatchSettleModal,
} from "../components/salary";
import { fromServerRow, DEFAULT_MONTH_DAYS, ALL_BRANCHES } from "../constants/salaryDomain";
import { showToast } from "../utils";
export default function SalaryPage() {
  const { t } = useTranslation("salary");
  const { selectedBranch, setSelectedBranch, branchName } = useBranch();
  const [selectedDateObject, setSelectedDateObject] = useState(
    () => new DateObject({ calendar: persian, locale: persian_af })
  );
  const [payrollList, setPayrollList] = useState([]);
  const [afghanMonthInfo, setAfghanMonthInfo] = useState(null);
  const [totals, setTotals] = useState(null);
  const [run, setRun] = useState(null);
  const [accountStart, setAccountStart] = useState(null);
  const [beforeAccountStart, setBeforeAccountStart] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPayslipEmp, setSelectedPayslipEmp] = useState(null);
  const [selectedAttendanceEmp, setSelectedAttendanceEmp] = useState(null);
  const [showBatchSettleModal, setShowBatchSettleModal] = useState(false);
  const [showPayrollReport, setShowPayrollReport] = useState(false);
  const abortRef = useRef(null);
  const loadPayroll = useCallback(async () => {
    if (!selectedBranch) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;
    const params = new URLSearchParams({
      shamsi_year: selectedDateObject.year,
      shamsi_month: selectedDateObject.month.number,
    });
    if (selectedBranch !== ALL_BRANCHES) params.set("branch_id", selectedBranch);
    setIsLoading(true);
    try {
      const res = await fetch(apiUrl(`/payroll/preview?${params.toString()}`), { signal });
      if (!res.ok) throw new Error("preview");
      const body = await res.json();
      if (signal.aborted) return;
      setAfghanMonthInfo(body.month || null);
      setPayrollList((body.rows || []).map(fromServerRow));
      setTotals(body.totals || null);
      setRun(body.run || null);
      setAccountStart(body.account_start || null);
      setBeforeAccountStart(Boolean(body.before_account_start));
    } catch (err) {
      if (err.name === "AbortError") return;
      showToast.error(t("messages.loadError"));
    } finally {
      if (!signal.aborted) setIsLoading(false);
    }
  }, [selectedBranch, selectedDateObject, t]);
  useEffect(() => {
    loadPayroll();
    return () => abortRef.current?.abort();
  }, [loadPayroll]);
  const activeBranchName = useMemo(
    () => branchName(selectedBranch) || t("filters.allBranches", { ns: "common" }),
    [selectedBranch, branchName, t]
  );
  const totalDaysInMonth = afghanMonthInfo?.total_days_in_month || DEFAULT_MONTH_DAYS;
  return (
    <div className="w-full space-y-4 font-sans" dir="rtl">
      <SalaryHeader
        selectedBranch={selectedBranch}
        onBranchChange={setSelectedBranch}
        selectedDateObject={selectedDateObject}
        onDateChange={setSelectedDateObject}
        afghanMonthInfo={afghanMonthInfo}
        onPrintPayroll={() => setShowPayrollReport(true)}
        onOpenBatchSettle={() => setShowBatchSettleModal(true)}
        beforeAccountStart={beforeAccountStart}
        accountStart={accountStart}
      />
      <SalaryTable
        payrollList={payrollList}
        isLoading={isLoading}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onOpenPayslip={setSelectedPayslipEmp}
        onOpenAttendance={setSelectedAttendanceEmp}
      />
      <SalaryBatchSettleModal
        isOpen={showBatchSettleModal && !beforeAccountStart}
        onClose={() => setShowBatchSettleModal(false)}
        payrollList={payrollList}
        totals={totals}
        run={run}
        afghanMonthInfo={afghanMonthInfo}
        branchName={activeBranchName}
        selectedBranch={selectedBranch}
        onDone={loadPayroll}
      />
      <SalaryPayslipModal
        isOpen={!!selectedPayslipEmp}
        onClose={() => setSelectedPayslipEmp(null)}
        employeeData={selectedPayslipEmp}
        afghanMonthInfo={afghanMonthInfo}
      />
      <SalaryAttendanceModal
        isOpen={!!selectedAttendanceEmp}
        onClose={() => setSelectedAttendanceEmp(null)}
        employeeData={selectedAttendanceEmp}
        selectedDateObject={selectedDateObject}
        afghanMonthInfo={afghanMonthInfo}
      />
      <SalaryPayrollReportModal
        isOpen={showPayrollReport}
        onClose={() => setShowPayrollReport(false)}
        payrollList={payrollList}
        afghanMonthInfo={afghanMonthInfo}
        branchName={activeBranchName}
        selectedBranch={selectedBranch}
        totalDaysInMonth={totalDaysInMonth}
      />
    </div>
  );
}
