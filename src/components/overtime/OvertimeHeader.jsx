import { Calendar, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_af from "../../utils/persian_af";
import { BranchSelect, CustomDropdown } from "../common";
const CONTROL_SHELL =
  "flex items-center gap-1.5 bg-surface border border-line-strong rounded-input px-2.5 py-1.5 shadow-2xs";
const ACTION_BASE =
  "inline-flex items-center gap-1 px-3 py-1.5 rounded-btn text-label-text font-bold transition-colors cursor-pointer";
const ACTION = `${ACTION_BASE} bg-accent-soft hover:bg-accent-subtle text-accent-strong border border-accent-line shadow-2xs`;
const PRINT_WEEK = "weekly-report";
const PRINT_FRIDAY = "friday-report";
const PRINT_BLANK = "blank-sheet";
export default function OvertimeHeader({
  selectedBranch,
  onBranchChange,
  selectedDateObject,
  onDateChange,
  onOpenWeeklyReport,
  onOpenFridayReport,
  onOpenBatchModal,
  onOpenBlankSheet,
  onOpenPayout,
  onOpenPayoutHistory,
}) {
  const { t } = useTranslation("overtime");
  const printOptions = [
    { value: PRINT_WEEK, label: t("actions.weeklyReport"), onClick: onOpenWeeklyReport },
    { value: PRINT_FRIDAY, label: t("actions.fridayReport"), onClick: onOpenFridayReport },
    ...(onOpenBlankSheet
      ? [{ divider: true }, { value: PRINT_BLANK, label: t("actions.blankSheet"), onClick: onOpenBlankSheet }]
      : []),
  ];
  return (
    <div
      className="w-full flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 border-b border-line pb-4 font-sans"
      dir="rtl"
    >
      <div className="space-y-1.5 min-w-0">
        <h1 className="text-page-title text-content-strong tracking-tight">{t("page.title")}</h1>
        <p className="text-caption-text text-content-subtle font-medium whitespace-normal break-words">
          {t("page.subtitle")}
        </p>
      </div>
      <div className="flex flex-col items-stretch lg:items-end gap-2.5 shrink-0">
        <div className="flex flex-wrap items-center gap-2.5 lg:justify-end">
          <div className={CONTROL_SHELL}>
            <Calendar size={14} className="text-content-faint shrink-0" />
            <DatePicker
              value={selectedDateObject}
              onChange={onDateChange}
              calendar={persian}
              locale={persian_af}
              calendarPosition="bottom-right"
              inputClass="bg-transparent text-label-text font-bold text-content outline-none cursor-pointer w-[88px] text-center font-sans border-0 shadow-none focus:ring-0 p-0"
              containerClassName="w-auto"
              placeholder={t("filters.selectDate")}
              format="YYYY/MM/DD"
              className="rmdp-steel"
              portal
              zIndex={9999}
            />
          </div>
          <BranchSelect
            value={selectedBranch}
            onChange={(val) => onBranchChange(val)}
            placeholder={t("filters.selectBranch", { ns: "common" })}
            buttonClassName="px-3 py-1.5 bg-surface hover:bg-surface-muted text-content-body border border-line-strong rounded-input text-label-text font-bold shadow-2xs min-w-[140px]"
            width="w-48"
            align="right"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2.5 lg:justify-end">
          {onOpenPayout && (
            <button type="button" onClick={onOpenPayout} className={ACTION}>
              <span>{t("actions.requestPayout")}</span>
            </button>
          )}
          <button type="button" onClick={onOpenBatchModal} className={ACTION}>
            <span>{t("actions.batchEntry")}</span>
          </button>
          <CustomDropdown
            options={printOptions}
            align="right"
            width="w-52"
            usePortal
            trigger={({ isOpen, toggle }) => (
              <button
                type="button"
                onClick={toggle}
                className={`${ACTION} ${isOpen ? "bg-accent-subtle" : ""}`}
              >
                <span>{t("actions.print")}</span>
                <ChevronDown
                  size={14}
                  className={`text-content-faint shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
            )}
          />
          {onOpenPayoutHistory && (
            <button type="button" onClick={onOpenPayoutHistory} className={ACTION}>
              <span>{t("actions.payoutHistory")}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
