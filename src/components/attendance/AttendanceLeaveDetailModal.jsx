import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Calendar,
  Edit3,
  Trash2,
  AlertCircle,
  Loader2,
  Plane,
  HeartPulse,
  Save,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import DatePicker from "react-multi-date-picker";
import { DateObject, persian, persian_af, formatToGregorian } from "../../utils/dateHelpers";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import {
  ATTENDANCE_STATUS,
  HANGAR_KEYWORD,
  JOB_CATEGORY,
} from "../../constants/attendanceDomain";

export default function AttendanceLeaveDetailModal({
  isOpen,
  onClose,
  employee,
  selectedDateObject,
  apiUrl,
  onSuccess,
}) {
  const { t } = useTranslation("attendance");
  useBodyScrollLock(isOpen);

  const STATUS_LEAVE = ATTENDANCE_STATUS.LEAVE_ALT;
  const STATUS_SICK = ATTENDANCE_STATUS.SICK;
  const STATUS_ABSENT = ATTENDANCE_STATUS.ABSENT;
  const STATUS_UNPAID_LEAVE = ATTENDANCE_STATUS.UNPAID_LEAVE;
  const HANGAR_CATEGORY_NAME = JOB_CATEGORY.HANGAR;
  const LEAVE_TYPE_STANDARD = ATTENDANCE_STATUS.LEAVE_ALT;
  const LEAVE_TYPE_UNPAID = ATTENDANCE_STATUS.UNPAID_LEAVE;

  const [leaveData, setLeaveData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [editStatus, setEditStatus] = useState(STATUS_LEAVE);
  const [editStartDate, setEditStartDate] = useState(null);
  const [editEndDate, setEditEndDate] = useState(null);

  const isHangerEmployee = useMemo(() => {
    if (!employee) return false;
    const cat = String(employee.job_category?.name || employee.job_category || employee.category || "").trim();
    return cat === HANGAR_CATEGORY_NAME || cat.includes(HANGAR_KEYWORD);
  }, [employee]);

  useEffect(() => {
    if (!isOpen || !employee) return;

    setIsLoading(true);
    setIsEditing(false);
    setErrorMessage("");

    const dateStr = formatToGregorian(selectedDateObject);

    fetch(apiUrl(`/attendances/leave-info?employee_id=${employee.id}&date=${dateStr}`))
      .then((res) => {
        if (!res.ok) throw new Error(t("leaveDetailModal.errorFetch"));
        return res.json();
      })
      .then((data) => {
        setLeaveData(data);
        setEditStatus(data.status || STATUS_LEAVE);
        if (data.start_date) {
          setEditStartDate(new DateObject({ date: new Date(data.start_date), calendar: persian, locale: persian_af }));
        }
        if (data.end_date) {
          setEditEndDate(new DateObject({ date: new Date(data.end_date), calendar: persian, locale: persian_af }));
        }
      })
      .catch((err) => {
        console.error(err);
        setErrorMessage(t("leaveDetailModal.errorFetch"));
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen, employee, selectedDateObject, apiUrl, t, STATUS_LEAVE]);

  const editDaysCount = useMemo(() => {
    if (!editStartDate || !editEndDate) return 0;
    try {
      const s = editStartDate.toDate ? editStartDate.toDate() : new Date(editStartDate);
      const e = editEndDate.toDate ? editEndDate.toDate() : new Date(editEndDate);
      const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return diff > 0 ? diff : 0;
    } catch {
      return 1;
    }
  }, [editStartDate, editEndDate]);

  const handleUpdateLeave = async () => {
    if (editDaysCount <= 0) {
      setErrorMessage(t("leaveDetailModal.errorDateRange"));
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const targetStatus = editStatus === STATUS_UNPAID_LEAVE ? STATUS_ABSENT : editStatus;
      const payload = {
        employee_id: employee.id,
        start_date: formatToGregorian(editStartDate),
        end_date: formatToGregorian(editEndDate),
        status: targetStatus,
      };

      const res = await fetch(apiUrl("/attendances/leave-range"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (res.ok) {
        onSuccess?.(data?.message || t("leaveDetailModal.updateSuccess"));
        onClose();
      } else {
        setErrorMessage(data?.message || t("leaveDetailModal.updateError"));
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(t("toast.unexpectedError", { ns: "common" }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelLeave = async () => {
    if (!leaveData?.start_date || !leaveData?.end_date) return;
    const empName = employee.full_name || employee.name || "";
    if (!window.confirm(t("leaveDetailModal.confirmCancel", { name: empName }))) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const payload = {
        employee_id: employee.id,
        start_date: leaveData.start_date,
        end_date: leaveData.end_date,
      };

      const res = await fetch(apiUrl("/attendances/cancel-leave-range"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (res.ok) {
        onSuccess?.(data?.message || t("leaveDetailModal.cancelSuccess"));
        onClose();
      } else {
        setErrorMessage(data?.message || t("leaveDetailModal.cancelError"));
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(t("toast.unexpectedError", { ns: "common" }));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !employee) return null;

  const empCode = employee.employee_ID || employee.employee_code;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs font-sans"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-card shadow-xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-btn bg-slate-100 text-slate-800 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">{t("leaveDetailModal.title")}</h2>
              <p className="text-gray-500 text-xs mt-0.5">
                {employee.full_name || employee.name}{" "}
                {empCode ? t("leaveDetailModal.codeLabel", { code: empCode }) : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-btn flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto font-sans">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-btn text-rose-800 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-7 h-7 animate-spin text-slate-800" />
              <span className="text-xs text-gray-600 font-bold">{t("leaveDetailModal.loading")}</span>
            </div>
          ) : !isEditing ? (
            <div className="space-y-4">
              <div className="p-3.5 bg-gray-50 rounded-card border border-gray-200 space-y-2 text-xs">
                <div className="flex items-center">
                  <span className="text-gray-500 ml-1.5">{t("leaveDetailModal.employeeName")}</span>
                  <span className="font-bold text-gray-900">{employee.full_name || employee.name}</span>
                </div>
                {employee.father_name && (
                  <div className="flex items-center">
                    <span className="text-gray-500 ml-1.5">{t("leaveDetailModal.fatherName")}</span>
                    <span className="font-bold text-gray-800">{employee.father_name}</span>
                  </div>
                )}
                <div className="flex items-center">
                  <span className="text-gray-500 ml-1.5">{t("leaveDetailModal.position")}</span>
                  <span className="font-bold text-gray-800">{employee.position || t("leaveDetailModal.leaveTypeStandard")}</span>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-card border border-gray-200 space-y-3">
                <div className="flex items-center justify-between border-b border-gray-200 pb-2.5">
                  <span className="text-xs font-bold text-gray-800">{t("leaveDetailModal.leaveType")}</span>
                  <span className="px-2.5 py-0.5 rounded-badge text-white text-xs font-bold bg-slate-800">
                    {leaveData?.status_label || (
                      leaveData?.status === ATTENDANCE_STATUS.SICK
                        ? t("leaveDetailModal.leaveTypeSick")
                        : leaveData?.status === ATTENDANCE_STATUS.ABSENT ||
                          leaveData?.status === ATTENDANCE_STATUS.UNPAID_LEAVE
                        ? t("leaveDetailModal.unpaidBadge")
                        : t("leaveDetailModal.normalLabel")
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-white p-2.5 rounded-card border border-gray-200">
                    <span className="block text-xs text-gray-500 font-medium mb-1">{t("leaveDetailModal.startDate")}</span>
                    <span className="font-mono text-xs font-bold text-gray-900" dir="ltr">
                      {leaveData?.shamsi_start_date || "—"}
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-card border border-gray-200">
                    <span className="block text-xs text-gray-500 font-medium mb-1">{t("leaveDetailModal.endDate")}</span>
                    <span className="font-mono text-xs font-bold text-gray-900" dir="ltr">
                      {leaveData?.shamsi_end_date || "—"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-gray-800 font-bold">{t("leaveDetailModal.totalDays")}</span>
                  <span className="text-xs font-bold font-mono text-slate-900">
                    {leaveData?.total_days ?? 1} {t("leaveDetailModal.daysUnit")}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-btn text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>{t("leaveDetailModal.editLeave")}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCancelLeave}
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-btn text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{t("leaveDetailModal.cancelLeave")}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 font-sans">
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1.5">
                  {t("leaveDetailModal.leaveTypeTitle")}
                </label>
                <div className={`grid ${!isHangerEmployee ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2"} gap-2`}>
                  <button
                    type="button"
                    onClick={() => setEditStatus(STATUS_LEAVE)}
                    className={`py-2 px-3 rounded-btn border text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                      editStatus === STATUS_LEAVE
                        ? "bg-slate-800 text-white border-slate-800 shadow-xs"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <Plane className="w-4 h-4" />
                    <span>{!isHangerEmployee ? t("leaveDetailModal.leaveTypePaid") : LEAVE_TYPE_STANDARD}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditStatus(STATUS_SICK)}
                    className={`py-2 px-3 rounded-btn border text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                      editStatus === STATUS_SICK
                        ? "bg-slate-800 text-white border-slate-800 shadow-xs"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <HeartPulse className="w-4 h-4" />
                    <span>{t("leaveDetailModal.leaveTypeSick")}</span>
                  </button>

                  {!isHangerEmployee && (
                    <button
                      type="button"
                      onClick={() => setEditStatus(STATUS_ABSENT)}
                      className={`py-2 px-3 rounded-btn border text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                        editStatus === STATUS_ABSENT || editStatus === STATUS_UNPAID_LEAVE
                          ? "bg-slate-800 text-white border-slate-800 shadow-xs"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <span>{LEAVE_TYPE_UNPAID}</span>
                    </button>
                  )}
                </div>

                {!isHangerEmployee && (editStatus === STATUS_ABSENT || editStatus === STATUS_UNPAID_LEAVE) && (
                  <div className="mt-2 p-2.5 rounded-btn bg-gray-50 border border-gray-200 text-xs text-gray-700 font-medium leading-relaxed">
                    {t("leaveDetailModal.unpaidNotice")}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-700 font-bold mb-1">{t("form.fromDate")}</label>
                  <div className="bg-white border border-gray-300 rounded-input px-2.5 py-1.5 focus-within:border-slate-800">
                    <DatePicker
                      value={editStartDate}
                      onChange={setEditStartDate}
                      calendar={persian}
                      locale={persian_af}
                      calendarPosition="bottom-right"
                      inputClass="w-full bg-transparent border-none text-xs font-bold text-gray-900 focus:outline-none cursor-pointer text-center"
                      format="YYYY/MM/DD"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-700 font-bold mb-1">{t("form.toDate")}</label>
                  <div className="bg-white border border-gray-300 rounded-input px-2.5 py-1.5 focus-within:border-slate-800">
                    <DatePicker
                      value={editEndDate}
                      onChange={setEditEndDate}
                      calendar={persian}
                      locale={persian_af}
                      calendarPosition="bottom-right"
                      inputClass="w-full bg-transparent border-none text-xs font-bold text-gray-900 focus:outline-none cursor-pointer text-center"
                      format="YYYY/MM/DD"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-card p-3 flex items-center justify-between text-xs">
                <span className="text-gray-800 font-bold">{t("leaveDetailModal.newDuration")}</span>
                <span className="font-mono font-bold text-slate-900">
                  {editDaysCount} {t("leaveDetailModal.daysUnit")}
                </span>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleUpdateLeave}
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-btn text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{t("actions.saveChanges", { ns: "common" })}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-btn text-xs font-bold transition-colors cursor-pointer"
                >
                  {t("actions.cancel", { ns: "common" })}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-gray-50 border-t border-gray-100 px-5 py-3 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-btn text-xs font-bold transition-colors cursor-pointer"
          >
            {t("actions.closeWindow", { ns: "common" })}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
