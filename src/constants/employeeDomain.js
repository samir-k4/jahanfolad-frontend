export const EMPLOYEE_STATUS = {
  ACTIVE: "فعال",
  INACTIVE: "غیرفعال",
};
export const isActiveStatus = (status) => status === EMPLOYEE_STATUS.ACTIVE;
export const POSITION_KEYWORD = {
  NAIL_MACHINE: "ماشین میخ",
  NAIL_PRODUCTION: "تولید میخ",
  PACKAGING: ["بسته بندی", "بسته‌بندی"],
  WIRE: ["سیم کش", "سیم‌کش", "سیم کشی", "سیم‌کشی"],
};
export const HANGAR_CATEGORY_KEYWORD = "زیر هنگر";
const includesAny = (value, keywords) =>
  keywords.some((keyword) => value.includes(keyword));
export const isPackagingPosition = (position) =>
  includesAny(String(position), POSITION_KEYWORD.PACKAGING);
export const isNailPosition = (position) =>
  (String(position).includes(POSITION_KEYWORD.NAIL_MACHINE) ||
    String(position).includes(POSITION_KEYWORD.NAIL_PRODUCTION)) &&
  !isPackagingPosition(position);
export const isWirePosition = (position) =>
  includesAny(String(position), POSITION_KEYWORD.WIRE);
