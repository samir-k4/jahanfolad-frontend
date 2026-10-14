import { JOB_POSITION } from "./jobPositions";
export const ATTENDANCE_STATUS = {
  PRESENT: "حاضر",
  ABSENT: "غیر حاضر",
  LEAVE: "رخصت",
  LEAVE_ALT: "رخصتی",
  SICK: "مریضی",
  UNPAID_LEAVE: "رخصتی بدون معاش",
};

export const JOB_CATEGORY = {
  HANGAR: "کارمند زیر هنگر",
  OFFICE: "کارمند دفتر",
  REPRESENTATION: "کارمند نمایندگی",
  SECURITY: "گارد امنیتی",
  KITCHEN: "آشپزخانه",
};

export const HANGAR_KEYWORD = "هنگر";

export const POSITION_RANK = {
  [JOB_POSITION.HR_MANAGER]: 1,
  [JOB_POSITION.FINANCE_MANAGER]: 2,
  [JOB_POSITION.ADMIN_MANAGER]: 3,
  [JOB_POSITION.ACCOUNTANT]: 4,
  [JOB_POSITION.OFFICE_STAFF]: 5,
  [JOB_POSITION.ADMIN_STAFF]: 6,
  [JOB_POSITION.NAIL_MACHINE]: 10,
  [JOB_POSITION.NAIL_PACKING]: 11,
  [JOB_POSITION.WIRE_MACHINE]: 12,
  [JOB_POSITION.NAIL_PRODUCTION]: 13,
  [JOB_POSITION.WIRING]: 14,
  [JOB_POSITION.TECHNICIAN]: 15,
  [JOB_POSITION.FOREMAN]: 16,
  [JOB_POSITION.ELECTRICIAN]: 17,
  [JOB_POSITION.GENERAL_WORKER]: 18,
  [JOB_POSITION.GENERAL_STAFF]: 19,
  [JOB_POSITION.BRANCH_STAFF]: 30,
  [JOB_POSITION.GUARD_LEAD]: 40,
  [JOB_POSITION.GUARD]: 41,
  [JOB_POSITION.SECURITY_GUARD]: 42,
  [JOB_POSITION.COOK]: 50,
  [JOB_POSITION.KITCHEN]: 51,
  [JOB_POSITION.SERVICES]: 52,
};

const CATEGORY_RANK = {
  [JOB_CATEGORY.OFFICE]: 5,
  [JOB_CATEGORY.HANGAR]: 20,
  [JOB_CATEGORY.REPRESENTATION]: 30,
  [JOB_CATEGORY.SECURITY]: 42,
  [JOB_CATEGORY.KITCHEN]: 52,
};

const DEFAULT_RANK = 25;

export const employeePosition = (emp) =>
  String(emp?.job_position?.name || emp?.position || "").trim();

export const employeeCategory = (emp) =>
  String(emp?.job_category?.name || emp?.job_category || "").trim();

export const getAttendanceRank = (emp) => {
  const position = employeePosition(emp);
  if (POSITION_RANK[position] !== undefined) return POSITION_RANK[position];
  return CATEGORY_RANK[employeeCategory(emp)] ?? DEFAULT_RANK;
};

export const isLeaveStatus = (status) =>
  status === ATTENDANCE_STATUS.LEAVE || status === ATTENDANCE_STATUS.LEAVE_ALT;

export const isSickStatus = (status) => status === ATTENDANCE_STATUS.SICK;

export const isPresentStatus = (status) =>
  status === ATTENDANCE_STATUS.PRESENT || status === true || status === 1;

export const isAbsentStatus = (status) =>
  status === ATTENDANCE_STATUS.ABSENT || status === false;

export const isProtectedStatus = (status) =>
  isLeaveStatus(status) || isSickStatus(status);
