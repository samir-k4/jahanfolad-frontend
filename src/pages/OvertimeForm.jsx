import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import showToast from "../utils/toast";
import { apiUrl } from "../api";
import { DateObject, persian, persian_af, formatToGregorian } from "../utils/dateHelpers";
import { useBranch } from "../context/BranchContext";
import { ATTENDANCE_STATUS } from "../constants/attendanceDomain";
import { resolveHourlyRate } from "../constants/overtimeDomain";
import {
  OvertimeHeader,
  OvertimeTable,
  OvertimeReportModal,
  OvertimeBatchModal,
  OvertimeBlankSheetModal,
  OvertimePayoutModal,
  OvertimePayoutHistoryModal,
} from "../components/overtime";
const LEAVE_STATUSES = new Set([
  ATTENDANCE_STATUS.LEAVE,
  ATTENDANCE_STATUS.LEAVE_ALT,
  ATTENDANCE_STATUS.SICK,
]);
const toRecordList = (json) =>
  Array.isArray(json?.data) ? json.data : Array.isArray(json?.records) ? json.records : [];
export default function OvertimeForm() {
  const { t } = useTranslation("overtime");
  const { selectedBranch, setSelectedBranch, branches, branchName } = useBranch();
  const [selectedDateObject, setSelectedDateObject] = useState(
    () => new DateObject({ calendar: persian, locale: persian_af })
  );
  const [employees, setEmployees] = useState([]);
  const [overtimeMap, setOvertimeMap] = useState({});
  const [hourlyRates, setHourlyRates] = useState({});
  const [weekRange, setWeekRange] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [leaveEmployeeIds, setLeaveEmployeeIds] = useState(new Set());
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportModalType, setReportModalType] = useState("regular_week");
  const [showBlankSheetModal, setShowBlankSheetModal] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [showPayoutHistory, setShowPayoutHistory] = useState(false);
  const [payoutReloadKey, setPayoutReloadKey] = useState(0);
  const fetchOvertimeData = useCallback(async (branchId, dateObj) => {
    const dateStr = formatToGregorian(dateObj);
    if (!branchId || !dateStr) return;
    const query = new URLSearchParams({ branch_id: String(branchId), date: dateStr }).toString();
    setIsLoading(true);
    try {
      const [otRes, attRes] = await Promise.all([
        fetch(apiUrl(`/overtimes?${query}`)),
        fetch(apiUrl(`/attendances?${query}`)).catch(() => null),
      ]);
      if (!otRes.ok) {
        showToast.error(t("toast.fetchError"));
        return;
      }
      const json = await otRes.json();
      const empList = toRecordList(json);
      setEmployees(empList);
      if (json.week_range) setWeekRange(json.week_range);
      const otMap = {};
      const rateMap = {};
      empList.forEach((emp) => {
        otMap[emp.id] = emp.today_hours ?? emp.hours ?? "";
        rateMap[emp.id] = resolveHourlyRate(emp.hourly_rate);
      });
      setOvertimeMap(otMap);
      setHourlyRates(rateMap);
      if (attRes?.ok) {
        const attList = toRecordList(await attRes.json());
        setLeaveEmployeeIds(
          new Set(
            attList
              .filter((a) => LEAVE_STATUSES.has(a.today_status || a.status || ""))
              .map((a) => a.employee_id || a.id)
          )
        );
      } else {
        setLeaveEmployeeIds(new Set());
      }
    } catch {
      showToast.error(t("toast.fetchError"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);
  useEffect(() => {
    if (selectedBranch) {
      fetchOvertimeData(selectedBranch, selectedDateObject);
    }
  }, [selectedBranch, selectedDateObject, fetchOvertimeData]);
  const activeBranchObj = useMemo(
    () => ({ name: branchName(selectedBranch) }),
    [selectedBranch, branchName]
  );
  const buildPayload = useCallback(
    (dateStr, ids, hoursFor, rateFor) => ({
      date: dateStr,
      overtimes: ids.map((empId) => {
        const emp = employees.find((e) => e.id === empId);
        return {
          employee_id: empId,
          hours: leaveEmployeeIds.has(empId) ? 0 : hoursFor(empId),
          hourly_rate: rateFor(empId, emp),
        };
      }),
    }),
    [employees, leaveEmployeeIds]
  );
  const handleHoursChange = (empId, hours) =>
    setOvertimeMap((prev) => ({ ...prev, [empId]: hours }));
  const handleHourlyRateChange = (empId, rate) =>
    setHourlyRates((prev) => ({ ...prev, [empId]: rate }));
  const handleSelectDateString = (dateStr) => {
    if (!dateStr) return;
    const [year, month, day] = dateStr.split("-").map(Number);
    if (!year || !month || !day) return;
    setSelectedDateObject(
      new DateObject({ date: new Date(year, month - 1, day), calendar: persian, locale: persian_af })
    );
  };
  const handleOpenWeeklyReport = () => {
    setReportModalType("regular_week");
    setShowReportModal(true);
  };
  const handleOpenFridayReport = () => {
    setReportModalType("friday");
    setShowReportModal(true);
  };
  const handleSaveOvertime = async () => {
    if (!selectedBranch || employees.length === 0) return;
    try {
      setIsSaving(true);
      const payload = buildPayload(
        formatToGregorian(selectedDateObject),
        employees.map((emp) => emp.id),
        (empId) => Number(overtimeMap[empId]) || 0,
        (empId, emp) => resolveHourlyRate(hourlyRates[empId] ?? emp?.hourly_rate)
      );
      const res = await fetch(apiUrl("/overtimes"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const resData = await res.json().catch(() => null);
      if (res.ok) {
        showToast.success(resData?.message || t("toast.saveSuccess"));
        fetchOvertimeData(selectedBranch, selectedDateObject);
      } else {
        showToast.error(resData?.message || t("toast.saveError"));
      }
    } catch {
      showToast.error(t("toast.saveError"));
    } finally {
      setIsSaving(false);
    }
  };
  const handleApplyBatchToTable = ({ employeeIds, hours, hourlyRate }) => {
    if (!Array.isArray(employeeIds) || employeeIds.length === 0) return;
    setOvertimeMap((prev) => {
      const next = { ...prev };
      employeeIds.forEach((id) => {
        next[id] = hours;
      });
      return next;
    });
    if (hourlyRate !== undefined) {
      setHourlyRates((prev) => {
        const next = { ...prev };
        employeeIds.forEach((id) => {
          next[id] = hourlyRate;
        });
        return next;
      });
    }
    showToast.success(t("toast.appliedToTable", { hours, count: employeeIds.length }));
  };
  const handleDirectSaveBatch = async ({ employeeIds, dates, hours, hourlyRate }) => {
    if (!selectedBranch || !employeeIds?.length || !dates?.length) return;
    try {
      setIsSaving(true);
      const results = await Promise.all(
        dates.map((dateStr) =>
          fetch(apiUrl("/overtimes"), {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify(
              buildPayload(
                dateStr,
                employeeIds,
                () => Number(hours) || 0,
                (empId, emp) => resolveHourlyRate(hourlyRate ?? emp?.hourly_rate)
              )
            ),
          })
        )
      );
      const failed = results.filter((res) => !res.ok).length;
      if (failed > 0) {
        showToast.error(t("toast.batchError"));
      } else {
        setShowBatchModal(false);
        showToast.success(
          t("toast.batchSaved", { hours, count: employeeIds.length, days: dates.length })
        );
      }
      fetchOvertimeData(selectedBranch, selectedDateObject);
    } catch {
      showToast.error(t("toast.batchError"));
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <div className="w-full space-y-4 font-sans" dir="rtl">
      <OvertimeHeader
        branches={branches}
        selectedBranch={selectedBranch}
        onBranchChange={setSelectedBranch}
        selectedDateObject={selectedDateObject}
        onDateChange={setSelectedDateObject}
        onOpenWeeklyReport={handleOpenWeeklyReport}
        onOpenFridayReport={handleOpenFridayReport}
        onOpenBatchModal={() => setShowBatchModal(true)}
        onOpenBlankSheet={() => setShowBlankSheetModal(true)}
        onOpenPayout={() => setShowPayoutModal(true)}
        onOpenPayoutHistory={() => setShowPayoutHistory(true)}
      />
      <OvertimeTable
        employees={employees}
        overtimeMap={overtimeMap}
        hourlyRates={hourlyRates}
        onHoursChange={handleHoursChange}
        onHourlyRateChange={handleHourlyRateChange}
        isLoading={isLoading}
        selectedBranch={selectedBranch}
        weekRange={weekRange}
        onSelectDate={handleSelectDateString}
        onSave={handleSaveOvertime}
        isSaving={isSaving}
        leaveEmployeeIds={leaveEmployeeIds}
        onOpenBlankSheet={() => setShowBlankSheetModal(true)}
      />
      <OvertimeBatchModal
        isOpen={showBatchModal}
        onClose={() => setShowBatchModal(false)}
        employees={employees}
        weekRange={weekRange}
        selectedDate={formatToGregorian(selectedDateObject)}
        onApplyToTable={handleApplyBatchToTable}
        onDirectSaveBatch={handleDirectSaveBatch}
        isSaving={isSaving}
        leaveEmployeeIds={leaveEmployeeIds}
      />
      <OvertimeReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        branchId={selectedBranch}
        branchName={activeBranchObj?.name}
        selectedDate={formatToGregorian(selectedDateObject)}
        initialReportType={reportModalType}
      />
      <OvertimePayoutModal
        isOpen={showPayoutModal}
        onClose={() => setShowPayoutModal(false)}
        date={formatToGregorian(selectedDateObject)}
        branchId={selectedBranch}
        onRequested={() => {
          setPayoutReloadKey((key) => key + 1);
          fetchOvertimeData(selectedBranch, selectedDateObject);
        }}
      />
      <OvertimePayoutHistoryModal
        isOpen={showPayoutHistory}
        onClose={() => setShowPayoutHistory(false)}
        branchId={selectedBranch}
        reloadKey={payoutReloadKey}
        onChanged={() => fetchOvertimeData(selectedBranch, selectedDateObject)}
      />
      <OvertimeBlankSheetModal
        isOpen={showBlankSheetModal}
        onClose={() => setShowBlankSheetModal(false)}
        branchId={selectedBranch}
        branchName={activeBranchObj?.name || t("branch.defaultFactory")}
        selectedDate={formatToGregorian(selectedDateObject)}
      />
    </div>
  );
}
