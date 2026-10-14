import { useState, useCallback } from "react";
import { apiUrl } from "../api";
import { formatToGregorian } from "../utils/dateHelpers";
import { ATTENDANCE_STATUS, isProtectedStatus } from "../constants/attendanceDomain";

const employeeJoinDate = (emp) =>
  emp.join_date || emp.joining_date || (emp.created_at ? emp.created_at.substring(0, 10) : null);

export default function useAttendance() {
  const [employees, setEmployees] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [afghanMonthInfo, setAfghanMonthInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchAttendance = useCallback(async (branchId, dateObj) => {
    const dateStr = formatToGregorian(dateObj);
    if (!branchId || !dateStr) return { success: false, data: [] };
    setIsLoading(true);
    try {
      const res = await fetch(apiUrl(`/attendances?branch_id=${branchId}&date=${dateStr}`));
      if (!res.ok) return { success: false, data: [] };
      const json = await res.json();
      const empList = Array.isArray(json.data)
        ? json.data
        : Array.isArray(json.records)
        ? json.records
        : [];
      setEmployees(empList);
      if (json.afghan_month) setAfghanMonthInfo(json.afghan_month);
      setAttendanceMap(
        Object.fromEntries(
          empList.map((emp) => [emp.id, emp.today_status || emp.status || ATTENDANCE_STATUS.PRESENT])
        )
      );
      return { success: true, data: empList };
    } catch {
      return { success: false, data: [] };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveAttendance = useCallback(
    async (branchId, dateObj) => {
      const dateStr = formatToGregorian(dateObj);
      if (!branchId || !dateStr || employees.length === 0) {
        return { success: false, message: null };
      }
      setIsSaving(true);
      try {
        const res = await fetch(apiUrl("/attendances"), {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            date: dateStr,
            attendances: employees.map((emp) => ({
              employee_id: emp.id,
              status: attendanceMap[emp.id] || ATTENDANCE_STATUS.PRESENT,
            })),
          }),
        });
        const resData = await res.json().catch(() => null);
        if (!res.ok) return { success: false, message: resData?.message || null };
        await fetchAttendance(branchId, dateObj);
        return { success: true, message: resData?.message || null };
      } catch {
        return { success: false, message: null };
      } finally {
        setIsSaving(false);
      }
    },
    [employees, attendanceMap, fetchAttendance]
  );

  const markAllPresent = useCallback(
    (dateObj) => {
      const selectedDateStr = formatToGregorian(dateObj);
      setAttendanceMap((prev) =>
        Object.fromEntries(
          employees.map((emp) => {
            const current = prev[emp.id];
            const joinDate = employeeJoinDate(emp);
            if (joinDate && selectedDateStr && selectedDateStr < joinDate) {
              return [emp.id, ATTENDANCE_STATUS.ABSENT];
            }
            return [emp.id, isProtectedStatus(current) ? current : ATTENDANCE_STATUS.PRESENT];
          })
        )
      );
    },
    [employees]
  );

  const markAllAbsent = useCallback(() => {
    setAttendanceMap((prev) =>
      Object.fromEntries(
        employees.map((emp) => {
          const current = prev[emp.id];
          return [emp.id, isProtectedStatus(current) ? current : ATTENDANCE_STATUS.ABSENT];
        })
      )
    );
  }, [employees]);

  const toggleAttendance = useCallback((employeeId, newStatus) => {
    setAttendanceMap((prev) => ({ ...prev, [employeeId]: newStatus }));
  }, []);

  return {
    employees,
    attendanceMap,
    setAttendanceMap,
    afghanMonthInfo,
    isLoading,
    isSaving,
    fetchAttendance,
    saveAttendance,
    markAllPresent,
    markAllAbsent,
    toggleAttendance,
  };
}
