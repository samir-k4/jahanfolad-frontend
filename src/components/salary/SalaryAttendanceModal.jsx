import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { apiUrl } from "../../api";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import { formatToGregorian } from "../../utils/dateHelpers";
import { formatShamsiDate, showToast } from "../../utils";
import {
  ATTENDANCE_STATUS,
  isLeaveStatus,
  isSickStatus,
  isPresentStatus,
  isAbsentStatus,
} from "../../constants/attendanceDomain";
import { DEFAULT_MONTH_DAYS } from "../../constants/salaryDomain";
const STATUS_TEXT = {
  present: "text-gray-800",
  absent: "text-rose-700 font-bold",
  leave: "text-gray-600",
  sick: "text-gray-600",
  unpaidLeave: "text-rose-700 font-bold",
  unrecorded: "text-gray-400",
};
const CELL = "py-1.5 px-3 border-l border-gray-100";
const HEAD = "py-2 px-3 border-l border-gray-200 font-bold text-gray-600";
const statusKey = (status) => {
  if (isPresentStatus(status)) return "present";
  if (isSickStatus(status)) return "sick";
  if (status === ATTENDANCE_STATUS.UNPAID_LEAVE) return "unpaidLeave";
  if (isLeaveStatus(status)) return "leave";
  if (isAbsentStatus(status)) return "absent";
  return "unrecorded";
};
export default function SalaryAttendanceModal({
  isOpen,
  onClose,
  employeeData,
  selectedDateObject,
  afghanMonthInfo,
}) {
  useBodyScrollLock(isOpen);
  const { t } = useTranslation("salary");
  const [loading, setLoading] = useState(false);
  const [attendanceData, setAttendanceData] = useState(null);
  const employeeId = employeeData?.id;
  useEffect(() => {
    if (!isOpen || !employeeId) return undefined;
    const controller = new AbortController();
    const dateStr = formatToGregorian(selectedDateObject) || "";
    setLoading(true);
    setAttendanceData(null);
    fetch(
      apiUrl(
        `/attendances/employee/${encodeURIComponent(employeeId)}?date=${encodeURIComponent(dateStr)}`
      ),
      { signal: controller.signal }
    )
      .then((res) => {
        if (!res.ok) throw new Error("attendance");
        return res.json();
      })
      .then(setAttendanceData)
      .catch((err) => {
        if (err.name !== "AbortError") showToast.error(t("attendance.loadError"));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [isOpen, employeeId, selectedDateObject, t]);
  const monthName = afghanMonthInfo?.shamsi_month_name || t("page.currentMonth");
  const yearName = afghanMonthInfo?.shamsi_year || "";
  const days = attendanceData?.days || [];
  const stats = attendanceData?.stats;
  const tiles = useMemo(
    () => [
      {
        key: "totalDays",
        value: stats?.total_days ?? afghanMonthInfo?.total_days_in_month ?? DEFAULT_MONTH_DAYS,
      },
      { key: "presentDays", value: stats?.present_count ?? employeeData?.presentDays ?? 0 },
      {
        key: "absentDays",
        value: stats?.absent_count ?? employeeData?.absentDays ?? 0,
        accent: true,
      },
      { key: "leaveDays", value: stats?.leave_count ?? 0 },
      { key: "unrecorded", value: stats?.unrecorded_count ?? 0 },
    ],
    [stats, afghanMonthInfo, employeeData]
  );
  const halves = useMemo(() => {
    const pivot = Math.ceil(days.length / 2);
    return [days.slice(0, pivot), days.slice(pivot)];
  }, [days]);
  const statusLabel = (day) =>
    day.is_recorded
      ? t(`statusLabel.${statusKey(day.status)}`, {
          ns: "attendance",
          defaultValue: t("attendance.statusUnrecorded"),
        })
      : t("attendance.statusUnrecorded");
  if (!isOpen || !employeeData) return null;
  const renderTable = (rows, offset) => (
    <div className="border border-gray-200 rounded-sm overflow-hidden">
      <table className="w-full text-right border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200 text-table-header-text">
            <th className={`${HEAD} text-center w-10`}>{t("table.rowIndex", { ns: "common" })}</th>
            <th className={`${HEAD} text-center`}>{t("attendance.columns.shamsiDate")}</th>
            <th className={`${HEAD} text-center`}>{t("attendance.columns.weekday")}</th>
            <th className="py-2 px-3 text-center font-bold text-gray-600">
              {t("attendance.columns.status")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white text-table-cell-text">
          {rows.map((day, index) => (
            <tr key={day.gregorian_date || day.shamsi_date} className={day.is_friday ? "bg-gray-50" : ""}>
              <td className={`${CELL} text-center font-mono text-gray-400`}>{offset + index + 1}</td>
              <td className={`${CELL} text-center font-mono text-gray-800`} dir="ltr">
                {formatShamsiDate(day.shamsi_date)}
              </td>
              <td className={`${CELL} text-center text-gray-500`}>
                {day.weekday || t("placeholder.dash")}
              </td>
              <td className={`py-1.5 px-3 text-center ${STATUS_TEXT[statusKey(day.status)]}`}>
                {statusLabel(day)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/40 font-sans"
      dir="rtl"
    >
      <div className="w-full max-w-5xl rounded-md bg-white shadow-lg border border-gray-300 overflow-hidden max-h-[92vh] flex flex-col">
        <div className="px-5 py-3.5 border-b border-gray-200 flex items-start justify-between gap-3 shrink-0">
          <div>
            <h3 className="text-section-title text-gray-900">
              {t("attendance.modalTitle", { name: employeeData.full_name })}
            </h3>
            <p className="text-caption-text text-gray-500 font-medium mt-0.5">
              {t("attendance.modalMeta", {
                month: monthName,
                year: yearName,
                code: employeeData.employee_ID,
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("actions.close", { ns: "common" })}
            className="w-7 h-7 rounded-sm flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 bg-white">
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 border border-gray-200 rounded-sm divide-x divide-x-reverse divide-gray-200">
              {tiles.map((tile) => (
                <div key={tile.key} className="px-3 py-2.5 text-center">
                  <span className="text-caption-text text-gray-500 font-bold block">
                    {t(`attendance.${tile.key}`)}
                  </span>
                  <span
                    className={`font-mono font-bold text-section-title block mt-0.5 ${
                      tile.accent ? "text-rose-700" : "text-gray-900"
                    }`}
                    dir="ltr"
                  >
                    {tile.value}
                    <span className="text-caption-text font-sans font-normal text-gray-400 mr-1">
                      {t("attendance.dayUnit")}
                    </span>
                  </span>
                </div>
              ))}
            </div>
            {loading ? (
              <div className="p-12 text-center text-gray-500 text-body-text">
                {t("attendance.loading")}
              </div>
            ) : days.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-body-text border border-gray-200 rounded-sm">
                {t("attendance.empty")}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {renderTable(halves[0], 0)}
                {halves[1].length > 0 && renderTable(halves[1], halves[0].length)}
              </div>
            )}
          </div>
        </div>
        <div className="px-5 py-3 border-t border-gray-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-btn-text font-bold rounded-sm border text-gray-700 bg-white border-gray-300 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            {t("actions.close", { ns: "common" })}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
