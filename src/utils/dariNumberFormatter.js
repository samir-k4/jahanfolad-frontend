const DARI_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export const toDariDigits = (value) => {
  if (value === null || value === undefined || value === "") return "";
  return String(value).replace(/\d/g, (d) => DARI_DIGITS[Number(d)]);
};

export const toEnglishDigits = (value) => {
  if (value === null || value === undefined || value === "") return "";
  return String(value)
    .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d))
    .replace(/٫/g, ".");
};

export const formatShamsiDate = (value) => toEnglishDigits(value);

export const formatNumber = (value, options = {}) => {
  const {
    minimumFractionDigits = 0,
    maximumFractionDigits = 2,
    toDari = false,
  } = options;

  const num = Number(toEnglishDigits(value) || 0);
  const formatted = num.toLocaleString("en-US", {
    minimumFractionDigits,
    maximumFractionDigits,
  });

  return toDari ? toDariDigits(formatted) : formatted;
};

export const formatDariNumber = (value, options = {}) => {
  return formatNumber(value, { ...options, toDari: true });
};
