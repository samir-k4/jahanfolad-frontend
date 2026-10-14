import {
  DateObject,
  persian,
  persian_af,
  formatToGregorian,
  daysBetween,
  isSameAfghanMonth,
  getTodayAfghan,
} from "./dateHelpers";
export const DEFAULT_DATE_PRESET_KEYS = [
  ["today", "today"],
  ["this_week", "this_week"],
  ["this_month", "this_month"],
  ["last_30_days", "last_30_days"],
  ["all", "all_time"],
  ["custom", "custom"],
];
export const LIST_FILTER_PRESET_KEYS = [
  ["today", "today"],
  ["7days", "last_7_days"],
  ["month", "current_month"],
  ["all", "all"],
];
export const REPORT_PERIOD_PRESET_KEYS = [
  ["month", "current_month"],
  ["7days", "last_7_days_long"],
  ["today", "today"],
  ["custom", "custom_range"],
];
export const buildPresets = (entries, t) =>
  entries.map(([key, labelKey]) => ({ key, label: t(`datePreset.${labelKey}`) }));
export const presetLabel = (presets, key) =>
  presets.find((p) => p.key === key)?.label || "";
export const matchesDatePreset = (dateValue, preset, today) => {
  if (preset === "all") return true;
  if (!dateValue) return false;
  const dateStr = String(dateValue).slice(0, 10);
  const todayStr = today?.gregorian || formatToGregorian(new Date());
  if (preset === "today") return dateStr === todayStr;
  if (preset === "7days") {
    const age = daysBetween(dateStr, todayStr);
    return age >= 0 && age <= 6;
  }
  if (preset === "month") {
    return isSameAfghanMonth(dateStr, today?.shamsi || getTodayAfghan());
  }
  return true;
};
export const todayReference = () => ({
  gregorian: formatToGregorian(new Date()),
  shamsi: getTodayAfghan(),
});
export const getDatePresetRange = (preset) => {
  if (preset === "today") {
    const from = new DateObject({ calendar: persian, locale: persian_af });
    const to = new DateObject(from);
    return {
      fromDate: from,
      toDate: to,
      fromShamsi: from.format("YYYY/MM/DD"),
      toShamsi: to.format("YYYY/MM/DD"),
      fromGregorian: formatToGregorian(from),
      toGregorian: formatToGregorian(to),
    };
  }
  if (preset === "this_week" || preset === "last_7_days") {
    const to = new DateObject({ calendar: persian, locale: persian_af });
    const from = new DateObject(to).subtract(6, "days");
    return {
      fromDate: from,
      toDate: to,
      fromShamsi: from.format("YYYY/MM/DD"),
      toShamsi: to.format("YYYY/MM/DD"),
      fromGregorian: formatToGregorian(from),
      toGregorian: formatToGregorian(to),
    };
  }
  if (preset === "this_month" || preset === "current_month" || preset === "month") {
    const from = new DateObject({ calendar: persian, locale: persian_af });
    from.setDay(1);
    const to = new DateObject({ calendar: persian, locale: persian_af });
    const days =
      to.month.length ||
      (to.month.number <= 6 ? 31 : to.month.number <= 11 ? 30 : 29);
    to.setDay(days);
    return {
      fromDate: from,
      toDate: to,
      fromShamsi: from.format("YYYY/MM/DD"),
      toShamsi: to.format("YYYY/MM/DD"),
      fromGregorian: formatToGregorian(from),
      toGregorian: formatToGregorian(to),
    };
  }
  if (preset === "last_30_days") {
    const to = new DateObject({ calendar: persian, locale: persian_af });
    const from = new DateObject(to).subtract(29, "days");
    return {
      fromDate: from,
      toDate: to,
      fromShamsi: from.format("YYYY/MM/DD"),
      toShamsi: to.format("YYYY/MM/DD"),
      fromGregorian: formatToGregorian(from),
      toGregorian: formatToGregorian(to),
    };
  }
  return {
    fromDate: null,
    toDate: null,
    fromShamsi: "",
    toShamsi: "",
    fromGregorian: "",
    toGregorian: "",
  };
};
