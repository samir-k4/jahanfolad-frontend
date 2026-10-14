import { HANGAR_CATEGORY_KEYWORD } from "./employeeDomain";
import { ADVANCE_STATUS, ALL, CURRENCY } from "./treasuryDomain";
export { ADVANCE_STATUS, ALL, CURRENCY };
export const EMPLOYEE_ACTIVE_STATUS = ["فعال", "active"];
export const isOutsideHangarEmployee = (category) =>
  !String(category || "").includes(HANGAR_CATEGORY_KEYWORD);
export const isActiveEmployee = (employee) =>
  !employee?.status || EMPLOYEE_ACTIVE_STATUS.includes(employee.status);
