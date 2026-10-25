import DateObject from "react-date-object";
import persian from "react-date-object/calendars/persian";
import persian_af from "./persian_af";
import { formatTimeDari } from "./timeHelpers";
import { formatShamsiDate } from "./dariNumberFormatter";
export { persian, persian_af, DateObject };
export { toEnglishDigits } from "./dariNumberFormatter";
export const formatToGregorian = (date) => {
  if (!date) return "";
  let jsDate;
  if (date instanceof DateObject) {
    jsDate = date.toDate();
  } else if (typeof date === "string") {
    const cleanStr = date.split("T")[0];
    const [y, m, d] = cleanStr.split("-").map(Number);
    jsDate = new Date(y, m - 1, d);
  } else if (date instanceof Date) {
    jsDate = date;
  } else {
    jsDate = new Date(date);
  }
  const yyyy = jsDate.getFullYear();
  const mm = String(jsDate.getMonth() + 1).padStart(2, "0");
  const dd = String(jsDate.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};
export const daysBetween = (fromStr, toStr) => {
  const toUtc = (s) => {
    const [y, m, d] = String(s).slice(0, 10).split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return (toUtc(toStr) - toUtc(fromStr)) / 86400000;
};
export const isSameAfghanMonth = (dateStr, reference) => {
  const a = toAfghanDate(dateStr);
  if (!a) return false;
  return a.year === reference.year && a.month.number === reference.month.number;
};
export const getTodayAfghan = () => {
  return new DateObject({
    date: new Date(),
    calendar: persian,
    locale: persian_af,
  });
};
export const toAfghanDate = (gregorianDate) => {
  if (!gregorianDate) return null;
  let jsDate;
  if (gregorianDate instanceof DateObject) {
    return gregorianDate;
  } else if (typeof gregorianDate === "string") {
    const cleanStr = gregorianDate.split("T")[0];
    const [y, m, d] = cleanStr.split("-").map(Number);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      jsDate = new Date(y, m - 1, d);
    } else {
      jsDate = new Date(gregorianDate);
    }
  } else if (gregorianDate instanceof Date) {
    jsDate = gregorianDate;
  } else {
    jsDate = new Date(gregorianDate);
  }
  return new DateObject({
    date: jsDate,
    calendar: persian,
    locale: persian_af,
  });
};
export const formatAfghanDisplay = (dateObj) => {
  if (!dateObj) return "";
  const monthNum = dateObj.month?.number ?? dateObj.month;
  return formatShamsiDate(`${dateObj.year}/${monthNum}/${dateObj.day}`);
};
export const formatAfghanDateTime = (dateInput) => {
  if (!dateInput) return "—";
  const jsDate = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(jsDate.getTime())) return "—";
  const afDate = toAfghanDate(jsDate);
  if (!afDate) return "—";
  const monthNum = String(afDate.month?.number ?? afDate.month).padStart(2, "0");
  const day = String(afDate.day).padStart(2, "0");
  return `${formatShamsiDate(`${afDate.year}/${monthNum}/${day}`)} - ${formatTimeDari(jsDate)}`;
};

export const getWeekDayName = (dateObj, dayNames = [], fallback = "") => {
  if (!dateObj) return fallback;
  if (dateObj.weekDay?.name) return dateObj.weekDay.name;
  try {
    const formatted = dateObj.format("dddd");
    if (formatted) return formatted;
  } catch {}
  try {
    const jsDate = dateObj.toDate ? dateObj.toDate() : new Date(dateObj);
    return dayNames[jsDate.getDay()] ?? fallback;
  } catch {
    return fallback;
  }
};
