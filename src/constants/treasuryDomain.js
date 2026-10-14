export { TEXT_FIELD_MAX_LENGTH, NOTES_MAX_LENGTH } from "./fieldLimits";
export const TRANSACTION_TYPE = {
  DEPOSIT: "deposit",
  WITHDRAW: "withdraw",
  TRANSFER_IN: "transfer_in",
  TRANSFER_OUT: "transfer_out",
  EXCHANGE_IN: "exchange_in",
  EXCHANGE_OUT: "exchange_out",
};
export const DEPOSIT_TYPES = [
  TRANSACTION_TYPE.DEPOSIT,
  TRANSACTION_TYPE.TRANSFER_IN,
  TRANSACTION_TYPE.EXCHANGE_IN,
];
export const VAULT_TYPE = {
  CASH_DRAWER: "cash_drawer",
  SARAFI: "sarafi",
  BANK: "bank",
};
export const VAULT_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
};
export const CURRENCY = {
  AFN: "AFN",
  USD: "USD",
  IRR: "IRR",
};
export const RECEIPT_TYPE = {
  CASH: "cash",
  HAWALA: "hawala",
  EXCHANGE: "exchange",
  CHECK: "check",
  OTHER: "other",
};
export const MEMBER_ROLE = {
  PARTNER: "partner",
  SARAFI: "sarafi",
  EMPLOYEE: "employee",
  OTHER: "other",
};
export const REFERENCE_TYPE = {
  INCOME: "income",
  EXPENSE: "expense",
  EXPENSES: "expenses",
  SALARY_ADVANCES: "salary_advances",
  SALARY_SETTLEMENT: "salary_settlement",
  SALARY_BATCH_SETTLEMENT: "salary_batch_settlement",
  MANAGER_ADVANCE: "manager_advance",
  SALES_INVOICE: "sales_invoice",
  CURRENCY_EXCHANGE: "currency_exchange",
  MANUAL_TRANSFER: "manual_transfer",
  INTER_VAULT_TRANSFER: "inter_vault_transfer",
};
export const ADVANCE_STATUS = {
  OPEN: "open",
  SETTLED: "settled",
};
export const ALL = "all";
export const NOTE_KEY = {
  CATEGORY: "دسته‌بندی",
  PARTY: "طرف معامله",
  CREATED_BY: "ثبت‌کننده",
  MEMBER: "(?:عضو|مسئول خزانه)",
};
export const isDepositType = (type) => DEPOSIT_TYPES.includes(type);
