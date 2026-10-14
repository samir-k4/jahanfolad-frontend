import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  CalendarRange,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import DatePicker from "react-multi-date-picker";
import { DateObject, persian, persian_af, formatToGregorian } from "../../utils/dateHelpers";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import SearchableSelect from "../common/SearchableSelect";
import {
  ATTENDANCE_STATUS,
  HANGAR_KEYWORD,
  JOB_CATEGORY,
  employeeCategory,
} from "../../constants/attendanceDomain";

const safeText = (val, fallback = "—") => {
  if (val === null || val === undefined || val === "") return fallback;
  if (typeof val === "object") return val.name || val.title || val.description || fallback;
  return String(val);
};

export default function AttendanceLeaveRangeModal({
  isOpen,
  onClose,
  employees = [],
  apiUrl,
  onSuccess,
}) {
  const { t } = useTranslation("attendance");

  const STATUS_LEAVE = ATTENDANCE_STATUS.LEAVE_ALT;
  const STATUS_SICK = ATTENDANCE_STATUS.SICK;
  const STATUS_ABSENT = ATTENDANCE_STATUS.ABSENT;
  const STATUS_UNPAID_LEAVE = ATTENDANCE_STATUS.UNPAID_LEAVE;

  useBodyScrollLock(isOpen);

  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [statusType, setStatusType] = useState(STATUS_LEAVE);
  const [startDateObj, setStartDateObj] = useState(
    () => new DateObject({ calendar: persian, locale: persian_af })
  );
  const [endDateObj, setEndDateObj] = useState(
    () => new DateObject({ calendar: persian, locale: persian_af })
  );
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (isOpen) {
      setErrorMessage("");
      setNote("");
      if (employees.length > 0 && !selectedEmpId) {
        setSelectedEmpId(String(employees[0].id));
      }
    }
  }, [isOpen, employees, selectedEmpId]);

  const selectedEmployee = useMemo(() => {
    return employees.find((emp) => String(emp.id) === String(selectedEmpId));
  }, [employees, selectedEmpId]);

  const isHangerEmployee = useMemo(() => {
    if (!selectedEmployee) return false;
    const cat = employeeCategory(selectedEmployee) || String(selectedEmployee.category || "").trim();
    return cat === JOB_CATEGORY.HANGAR || cat.includes(HANGAR_KEYWORD);
  }, [selectedEmployee]);

  useEffect(() => {
    if (isHangerEmployee && statusType === STATUS_UNPAID_LEAVE) {
      setStatusType(STATUS_LEAVE);
    }
  }, [isHangerEmployee, statusType]);

  const daysCount = useMemo(() => {
    if (!startDateObj || !endDateObj) return 0;
    try {
      const startJs = startDateObj.toDate ? startDateObj.toDate() : new Date(startDateObj);
      const endJs = endDateObj.toDate ? endDateObj.toDate() : new Date(endDateObj);
      const diffMs = endJs.getTime() - startJs.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
      return diffDays > 0 ? diffDays : 0;
    } catch {
      return 1;
    }
  }, [startDateObj, endDateObj]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!selectedEmpId) {
      setErrorMessage(t("leaveRangeModal.errorSelectEmployee"));
      return;
    }

    if (daysCount <= 0) {
      setErrorMessage(t("leaveDetailModal.errorDateRange"));
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const targetStatus = statusType === STATUS_UNPAID_LEAVE ? STATUS_ABSENT : statusType;
      const leaveNote = note.trim() || (statusType === STATUS_UNPAID_LEAVE ? STATUS_UNPAID_LEAVE : undefined);
      const payload = {
        employee_id: selectedEmpId,
        start_date: formatToGregorian(startDateObj),
        end_date: formatToGregorian(endDateObj),
        status: targetStatus,
        note: leaveNote,
      };

      const res = await fetch(apiUrl("/attendances/leave-range"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (res.ok) {
        onSuccess?.(data?.message || t("leaveRangeModal.success"));
        onClose();
      } else {
        setErrorMessage(data?.message || t("leaveRangeModal.error"));
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(t("toast.serverError", { ns: "common" }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const employeeOptions = employees.map((emp) => {
    const code = emp.employee_ID || emp.employee_code || "—";
    const name = emp.full_name || emp.name;
    const father = emp.father_name ? `(${t("leaveDetailModal.fatherName")} ${emp.father_name})` : "";
    const pos = safeText(emp.position || emp.jobPosition || emp.job_category || emp.jobCategory, t("leaveDetailModal.leaveTypeStandard"));
    return {
      value: String(emp.id),
      label: `[${code}] ${name} ${father} - ${pos}`.trim(),
    };
  });

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs font-sans"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg rounded-card shadow-xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-btn bg-slate-100 text-slate-800 flex items-center justify-center">
              <CalendarRange className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">{t("leaveRangeModal.title")}</h2>
              <p className="text-xs text-gray-500">{t("leaveRangeModal.subtitle")}</p>
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

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 font-sans">
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 rounded-btn bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              {t("leaveRangeModal.stepEmployee")}
            </label>
            <SearchableSelect
              options={employeeOptions}
              value={selectedEmpId}
              onChange={(val) => setSelectedEmpId(val)}
              placeholder={t("leaveRangeModal.searchEmployee")}
              usePortal={true}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              {t("leaveRangeModal.stepLeaveType")}
            </label>
            <div className={`grid ${!isHangerEmployee ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2"} gap-2`}>
              <button
                type="button"
                onClick={() => setStatusType(STATUS_LEAVE)}
                className={`flex items-center gap-2 p-3 rounded-btn border text-xs transition-colors cursor-pointer ${
                  statusType === STATUS_LEAVE
                    ? "bg-slate-800 text-white border-slate-800 shadow-xs"
                    : "bg-white hover:bg-gray-50 text-gray-700 border-gray-200"
                }`}
              >
                <div className="text-right">
                  <span className="block font-bold">{t("leaveDetailModal.normalLabel")}</span>
                  <span className={`block text-[11px] mt-0.5 ${statusType === STATUS_LEAVE ? "text-slate-300" : "text-gray-500"}`}>
                    {!isHangerEmployee ? t("leaveRangeModal.leavePaidSubtitle") : t("leaveRangeModal.leavePeriodicSubtitle")}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setStatusType(STATUS_SICK)}
                className={`flex items-center gap-2 p-3 rounded-btn border text-xs transition-colors cursor-pointer ${
                  statusType === STATUS_SICK
                    ? "bg-slate-800 text-white border-slate-800 shadow-xs"
                    : "bg-white hover:bg-gray-50 text-gray-700 border-gray-200"
                }`}
              >
                <div className="text-right">
                  <span className="block font-bold">{t("leaveDetailModal.leaveTypeSick")}</span>
                  <span className={`block text-[11px] mt-0.5 ${statusType === STATUS_SICK ? "text-slate-300" : "text-gray-500"}`}>
                    {t("leaveRangeModal.leaveSickSubtitle")}
                  </span>
                </div>
              </button>

              {!isHangerEmployee && (
                <button
                  type="button"
                  onClick={() => setStatusType(STATUS_UNPAID_LEAVE)}
                  className={`flex items-center gap-2 p-3 rounded-btn border text-xs transition-colors cursor-pointer ${
                    statusType === STATUS_UNPAID_LEAVE
                      ? "bg-slate-800 text-white border-slate-800 shadow-xs"
                      : "bg-white hover:bg-gray-50 text-gray-700 border-gray-200"
                  }`}
                >
                  <div className="text-right">
                    <span className="block font-bold">{t("statusLabel.unpaidLeave")}</span>
                    <span className={`block text-[11px] mt-0.5 ${statusType === STATUS_UNPAID_LEAVE ? "text-slate-300" : "text-gray-500"}`}>
                      {t("leaveRangeModal.leaveUnpaidSubtitle")}
                    </span>
                  </div>
                </button>
              )}
            </div>

            {!isHangerEmployee && statusType === STATUS_UNPAID_LEAVE && (
              <div className="mt-2 p-2.5 rounded-btn bg-gray-50 border border-gray-200 text-xs text-gray-700 font-medium leading-relaxed">
                {t("leaveDetailModal.unpaidNotice")}
              </div>
            )}
          </div>

          <div className="space-y-2 pt-2 border-t border-gray-100">
            <label className="block text-xs font-bold text-gray-700">
              {t("leaveRangeModal.stepTimeRange")}
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 font-bold mb-1">{t("form.fromDate")}</label>
                <div className="bg-white border border-gray-300 rounded-input px-2.5 py-1.5 focus-within:border-slate-800">
                  <DatePicker
                    value={startDateObj}
                    onChange={setStartDateObj}
                    calendar={persian}
                    locale={persian_af}
                    calendarPosition="bottom-right"
                    inputClass="w-full bg-transparent border-none text-xs font-bold text-gray-900 focus:outline-none cursor-pointer text-center"
                    format="YYYY/MM/DD"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-600 font-bold mb-1">{t("form.toDate")}</label>
                <div className="bg-white border border-gray-300 rounded-input px-2.5 py-1.5 focus-within:border-slate-800">
                  <DatePicker
                    value={endDateObj}
                    onChange={setEndDateObj}
                    calendar={persian}
                    locale={persian_af}
                    calendarPosition="bottom-right"
                    inputClass="w-full bg-transparent border-none text-xs font-bold text-gray-900 focus:outline-none cursor-pointer text-center"
                    format="YYYY/MM/DD"
                  />
                </div>
              </div>
            </div>

            <div className="mt-2 p-3 rounded-card bg-gray-50 border border-gray-200 flex items-center justify-between text-xs">
              <span className="text-gray-700 font-bold">{t("leaveRangeModal.totalDuration")}</span>
              <span className="font-mono font-bold text-slate-900 bg-white px-3 py-1 rounded-badge border border-gray-200">
                {daysCount} {t("leaveRangeModal.calendarDaysUnit")}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-700 font-bold mb-1">{t("leaveRangeModal.noteLabel")}</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("leaveRangeModal.notePlaceholder")}
              className="w-full bg-white border border-gray-300 focus:border-slate-800 rounded-input px-3 py-2 text-xs font-medium text-gray-800 outline-none transition-colors"
            />
          </div>
        </form>

        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-btn border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 text-xs font-bold transition-colors cursor-pointer"
          >
            {t("actions.cancel", { ns: "common" })}
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedEmpId || daysCount <= 0}
            className="flex items-center gap-1.5 px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-btn text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin ml-1" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            <span>{t("leaveRangeModal.applyDays", { count: daysCount })}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
