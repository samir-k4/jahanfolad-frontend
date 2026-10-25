import { toDariDigits, toEnglishDigits } from "./dariNumberFormatter";

const parseClock = (value) => {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return {
      hour: value.getHours(),
      minute: value.getMinutes(),
      period: value.getHours() >= 12 ? "PM" : "AM",
    };
  }

  const input = toEnglishDigits(String(value ?? "")).trim();
  if (!input) return null;

  const date = new Date(input);
  if (!/^\d{1,2}:\d{2}/.test(input) && !Number.isNaN(date.getTime())) {
    return {
      hour: date.getHours(),
      minute: date.getMinutes(),
      period: date.getHours() >= 12 ? "PM" : "AM",
    };
  }

  const match = input.match(
    /(?:^|[T\s])(\d{1,2}):(\d{2})(?::\d{2})?(?:\.\d+)?\s*(AM|PM|ق\.ظ|ب\.ظ)?\s*$/i
  );
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const marker = match[3]?.toUpperCase();
  const period = marker === "PM" || marker === "ب.ظ"
    ? "PM"
    : marker === "AM" || marker === "ق.ظ"
      ? "AM"
      : hour >= 12
        ? "PM"
        : "AM";

  if (minute > 59) return null;
  if (marker) {
    if (hour < 1 || hour > 12) return null;
    hour = (hour % 12) + (period === "PM" ? 12 : 0);
  } else if (hour > 23) {
    return null;
  }

  return { hour, minute, period };
};

export const parseTimeParts = (value) => {
  const parsed = parseClock(value);
  if (!parsed) return null;

  return {
    hour: parsed.hour % 12 || 12,
    minute: String(parsed.minute).padStart(2, "0"),
    period: parsed.period,
  };
};

export const formatTime12 = (value) => {
  const parsed = parseTimeParts(value);
  if (!parsed) return "—";

  const marker = parsed.period === "PM" ? "ب.ظ" : "ق.ظ";
  return `${String(parsed.hour).padStart(2, "0")}:${parsed.minute} ${marker}`;
};

export const formatTimeDari = (value) => {
  const formatted = formatTime12(value);
  return formatted === "—" ? formatted : toDariDigits(formatted);
};
