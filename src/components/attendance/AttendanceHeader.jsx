import {
  Calendar,
  CheckSquare,
  XSquare,
  FileDown,
  CalendarRange,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_af from "../../utils/persian_af";
import { getWeekDayName } from "../../utils/dateHelpers";
import { BranchSelect } from "../common";
export default function AttendanceHeader({
  selectedBranch,
  onBranchChange,
  selectedDateObject,
  onDateChange,
  onMarkAllPresent,
  onMarkAllAbsent,
  onOpenMonthlySheet,
  onOpenLeaveModal,
}) {
  const { t } = useTranslation("attendance");
  const dayName = getWeekDayName(
    selectedDateObject,
    t("days", { returnObjects: true }),
    t("filters.unknownDay")
  );
  return (
    <div className="font-sans" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 border-b border-gray-200 pb-4">
        <div className="pt-1">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">
            {t("page.title")}
          </h1>
          <p className="text-xs text-gray-500 font-medium mt-1">
            {t("page.subtitle")}
          </p>
        </div>
        <div className="flex flex-col items-start md:items-end gap-2.5">
          <div className="flex items-center gap-2">
            <BranchSelect
              value={selectedBranch}
              onChange={(val) => onBranchChange?.(val)}
              placeholder={t("filters.selectBranch", { ns: "common" })}
              buttonClassName="h-8 px-3 text-xs font-bold text-gray-700 bg-white border border-gray-300 hover:border-gray-400 rounded-btn transition-colors shadow-2xs min-w-[140px]"
              width="w-48"
              align="right"
            />
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 bg-white border border-gray-300 rounded-btn px-2.5 py-1 shadow-2xs">
              <span className="bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded-badge text-[11px] font-bold text-gray-700 shrink-0">
                {dayName}
              </span>
              <Calendar size={14} className="text-gray-400" />
              <DatePicker
                value={selectedDateObject}
                onChange={onDateChange}
                calendar={persian}
                locale={persian_af}
                calendarPosition="bottom-right"
                inputClass="bg-transparent text-xs font-bold text-gray-800 outline-none cursor-pointer w-24 text-center font-sans border-0 shadow-none focus:ring-0 p-0"
                containerClassName="w-auto"
                placeholder={t("filters.selectDate")}
                format="YYYY/MM/DD"
                className="rmdp-steel"
              />
            </div>
            <button
              type="button"
              onClick={onOpenLeaveModal}
              className="px-3.5 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-btn hover:bg-gray-50 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <CalendarRange size={14} className="text-gray-600" />
              <span>{t("actions.registerLeave")}</span>
            </button>
            <button
              type="button"
              onClick={onOpenMonthlySheet}
              className="px-3.5 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-btn hover:bg-gray-50 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <FileDown size={14} className="text-gray-600" />
              <span>{t("actions.downloadSheet")}</span>
            </button>
            <button
              type="button"
              onClick={onMarkAllPresent}
              className="flex items-center gap-1 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-btn text-xs font-bold transition-colors cursor-pointer shadow-2xs"
            >
              <CheckSquare size={14} />
              <span>{t("actions.markAllPresent")}</span>
            </button>
            <button
              type="button"
              onClick={onMarkAllAbsent}
              className="flex items-center gap-1 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-btn text-xs font-bold transition-colors cursor-pointer shadow-2xs"
            >
              <XSquare size={14} />
              <span>{t("actions.markAllAbsent")}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
