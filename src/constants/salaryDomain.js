export { NOTES_MAX_LENGTH, NAME_MAX_LENGTH as PAID_BY_MAX_LENGTH } from "./fieldLimits";
import { PAY_ROUNDING_STEP } from "./overtimeDomain";
export { PAY_ROUNDING_STEP };
export const DEFAULT_MONTH_DAYS = 30;
export const PAY_MODE = { DAILY: "daily", MONTHLY: "monthly" };
export const RUN_STATE = {
  PENDING: "pending",
  PAID: "paid",
  CANCELLED: "cancelled",
  REVERSED: "reversed",
};
export const roundUpToStep = (value, step = PAY_ROUNDING_STEP) => {
  if (!value || Number.isNaN(Number(value)) || value <= 0) return 0;
  const normalized = Math.round(Number(value) * 100) / 100;
  return Math.ceil(normalized / step) * step;
};
export const fromServerRow = (row) => ({
  ...row,
  id: row.employee_id,
  salary: Number(row.base_salary || 0),
  dailyRate: Number(row.daily_rate || 0),
  isDaily: row.pay_mode === PAY_MODE.DAILY,
  presentDays: Number(row.present_days || 0),
  absentDays: Number(row.absent_days || 0),
  leaveDays: Number(row.leave_days || 0),
  absentDeduction: Number(row.absent_deduction || 0),
  fullMonthPayable: Number(row.full_month_payable || 0),
  grossEarned: Number(row.gross_earned || 0),
  paidInMonth: Number(row.paid_in_month || 0),
  paymentCount: Number(row.payment_count || 0),
  remaining: Number(row.remaining || 0),
  overpaid: Number(row.overpaid || 0),
  netSalary: Number(row.payable_now || 0),
  balance: Number(row.gross_earned || 0) - Number(row.paid_in_month || 0),
  isClosed: Boolean(row.is_closed),
  awaitingApproval: Boolean(row.awaiting_approval),
  isSettled: Boolean(row.is_settled),
  isPaidUp: Boolean(row.is_closed || row.is_fully_paid),
  beforeAccountStart: Boolean(row.before_account_start),
});
export const ALL_BRANCHES = "all";
export const PAYMENT_METHOD = {
  CASH: "نقد",
  EXCHANGE: "حواله صرافی",
  BANK: "حساب بانکی",
};
export const VAULT_CURRENCY_AFN = "AFN";
export const VAULT_TYPE_CASH_DRAWER = "cash_drawer";
export const PAYMENT_TYPE_SCOPE = {
  DURING_MONTH: "during_month",
  MONTHLY: "monthly",
};
export const PAYMENT_SOURCE = {
  ALL: "all",
  HAND: "hand",
  PAYROLL: "payroll",
};
export const DATE_PRESET = {
  CURRENT_MONTH: "current_month",
  TODAY: "today",
  LAST_7_DAYS: "last_7_days",
  LAST_30_DAYS: "last_30_days",
  ALL: "all",
  CUSTOM: "custom",
};
export const roundDownToStep = (value, step = PAY_ROUNDING_STEP) => {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized <= 0) return 0;
  return Math.floor(normalized / step) * step;
};
export const isFromPayrollRun = (record) => Boolean(record?.payroll_run_id);
export const defaultVaultId = (vaults) => {
  if (!vaults?.length) return "";
  const preferred = vaults.find(
    (vault) => vault.currency === VAULT_CURRENCY_AFN && vault.type === VAULT_TYPE_CASH_DRAWER
  );
  return String((preferred || vaults[0]).id);
};
export const vaultOption = (vault) => ({
  value: String(vault.id),
  label: `[${vault.account_number || vault.id}] ${vault.name} (${vault.currency} — ${Number(vault.current_balance || 0).toLocaleString("en-US")})`,
});
