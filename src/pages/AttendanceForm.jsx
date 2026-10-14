import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  DateObject,
  persian,
  persian_af,
} from "../utils/dateHelpers";
import { useBranch } from "../context/BranchContext";
import useAttendance from "../hooks/useAttendance";
import showToast from "../utils/toast";
import { apiUrl } from "../api";
import {
  AttendanceHeader,
  AttendanceTable,
  AttendanceMonthlyPreviewModal,
  AttendanceLeaveRangeModal,
  AttendanceLeaveDetailModal,
} from "../components/attendance";
export default function AttendanceForm() {
  const { t } = useTranslation("attendance");
  const [selectedDateObject, setSelectedDateObject] = useState(
    () => new DateObject({ calendar: persian, locale: persian_af })
  );
  const { selectedBranch, setSelectedBranch, branches, branchName } = useBranch();
  const {
    employees,
    attendanceMap,
    afghanMonthInfo,
    isLoading,
    isSaving,
    fetchAttendance,
    saveAttendance,
    markAllPresent,
    markAllAbsent,
    toggleAttendance,
  } = useAttendance();
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isLeaveDetailOpen, setIsLeaveDetailOpen] = useState(false);
  const [selectedLeaveEmployee, setSelectedLeaveEmployee] = useState(null);
  useEffect(() => {
    if (selectedBranch) {
      fetchAttendance(selectedBranch, selectedDateObject);
    }
  }, [selectedBranch, selectedDateObject, fetchAttendance]);
  const handleMarkAllPresent = () => {
    markAllPresent(selectedDateObject);
    showToast.success(t("toast.markAllPresent"));
  };
  const handleMarkAllAbsent = () => {
    markAllAbsent();
    showToast.info(t("toast.markAllAbsent"));
  };
  const handleSaveAttendance = async () => {
    const res = await saveAttendance(selectedBranch, selectedDateObject);
    if (res.success) {
      showToast.success(res.message || t("toast.saveSuccess"));
    } else {
      showToast.error(res.message || t("toast.saveError"));
    }
  };
  const activeBranchObj = useMemo(() => {
    if (selectedBranch === "all") return { name: t("filters.allBranches", { ns: "common" }) };
    return { name: branchName(selectedBranch) };
  }, [selectedBranch, branchName, t]);
  return (
    <div className="w-full space-y-4 font-sans" dir="rtl">
      <AttendanceHeader
        branches={branches}
        selectedBranch={selectedBranch}
        onBranchChange={setSelectedBranch}
        selectedDateObject={selectedDateObject}
        onDateChange={setSelectedDateObject}
        onMarkAllPresent={handleMarkAllPresent}
        onMarkAllAbsent={handleMarkAllAbsent}
        onOpenMonthlySheet={() => setIsPreviewModalOpen(true)}
        onOpenLeaveModal={() => setIsLeaveModalOpen(true)}
      />
      <AttendanceTable
        employees={employees}
        attendanceMap={attendanceMap}
        onToggleAttendance={toggleAttendance}
        isLoading={isLoading}
        selectedBranch={selectedBranch}
        afghanMonthInfo={afghanMonthInfo}
        selectedDateObject={selectedDateObject}
        onSave={handleSaveAttendance}
        isSaving={isSaving}
        onOpenLeaveDetail={(emp) => {
          setSelectedLeaveEmployee(emp);
          setIsLeaveDetailOpen(true);
        }}
      />
      <AttendanceLeaveRangeModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        employees={employees}
        apiUrl={apiUrl}
        onSuccess={(msg) => {
          showToast.success(msg);
          if (selectedBranch) {
            fetchAttendance(selectedBranch, selectedDateObject);
          }
        }}
      />
      <AttendanceLeaveDetailModal
        isOpen={isLeaveDetailOpen}
        onClose={() => {
          setIsLeaveDetailOpen(false);
          setSelectedLeaveEmployee(null);
        }}
        employee={selectedLeaveEmployee}
        selectedDateObject={selectedDateObject}
        apiUrl={apiUrl}
        onSuccess={(msg) => {
          showToast.success(msg);
          if (selectedBranch) {
            fetchAttendance(selectedBranch, selectedDateObject);
          }
        }}
      />
      <AttendanceMonthlyPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        selectedBranch={selectedBranch}
        branchName={activeBranchObj?.name}
        selectedDateObject={selectedDateObject}
        afghanMonthInfo={afghanMonthInfo}
      />
    </div>
  );
}
