import i18n from "../../i18n";
import {
  DEPOSIT_TYPES,
  NOTE_KEY,
  RECEIPT_TYPE,
  REFERENCE_TYPE,
  VAULT_TYPE,
  MEMBER_ROLE,
  CURRENCY,
} from "../../constants/treasuryDomain";
const t = (key) => i18n.t(key, { ns: "treasury" });
const CATEGORY_BY_REFERENCE = {
  [REFERENCE_TYPE.EXPENSE]: "category.expense",
  [REFERENCE_TYPE.EXPENSES]: "category.expense",
  [REFERENCE_TYPE.SALARY_ADVANCES]: "category.salaryAdvance",
  [REFERENCE_TYPE.SALARY_SETTLEMENT]: "category.salaryPayment",
  [REFERENCE_TYPE.SALARY_BATCH_SETTLEMENT]: "category.salaryPayment",
  [REFERENCE_TYPE.MANAGER_ADVANCE]: "category.managerAdvance",
  [REFERENCE_TYPE.SALES_INVOICE]: "category.cashSale",
  [REFERENCE_TYPE.CURRENCY_EXCHANGE]: "category.currencyExchange",
  [REFERENCE_TYPE.MANUAL_TRANSFER]: "category.transfer",
  [REFERENCE_TYPE.INTER_VAULT_TRANSFER]: "category.transfer",
};
const SOURCE_BY_REFERENCE = {
  [REFERENCE_TYPE.INCOME]: "source.income",
  [REFERENCE_TYPE.EXPENSE]: "source.expense",
  [REFERENCE_TYPE.EXPENSES]: "source.expense",
  [REFERENCE_TYPE.SALARY_ADVANCES]: "source.salaryAdvance",
  [REFERENCE_TYPE.SALARY_SETTLEMENT]: "source.salaryPayment",
  [REFERENCE_TYPE.SALARY_BATCH_SETTLEMENT]: "source.salaryPayment",
  [REFERENCE_TYPE.MANAGER_ADVANCE]: "source.managerAdvance",
  [REFERENCE_TYPE.SALES_INVOICE]: "source.cashSale",
  [REFERENCE_TYPE.CURRENCY_EXCHANGE]: "source.currencyExchange",
  [REFERENCE_TYPE.MANUAL_TRANSFER]: "source.transfer",
  [REFERENCE_TYPE.INTER_VAULT_TRANSFER]: "source.transfer",
};
const fromNotes = (notes, key) => {
  if (!notes) return null;
  const matched = notes.match(new RegExp(`${key}:\\s*([^-]+)`));
  return matched?.[1]?.trim() || null;
};
export const isDeposit = (tx) => DEPOSIT_TYPES.includes(tx?.transaction_type);
export { formatDocNumber } from "../../utils/formatDocNumber";
export const getCategoryName = (tx, deposit) =>
  tx?.category?.name ||
  fromNotes(tx?.notes, NOTE_KEY.CATEGORY) ||
  (tx?.reference_type === REFERENCE_TYPE.INCOME
    ? i18n.t("navigation.pages.incomes", { ns: "common" })
    : t(CATEGORY_BY_REFERENCE[tx?.reference_type] || (deposit ? "category.shareIn" : "category.personalOut")));
export const getSourceTitle = (tx) => t(SOURCE_BY_REFERENCE[tx?.reference_type] || "source.direct");
export const getPaymentMethod = (tx) => t(`receiptType.${tx?.receipt_type || RECEIPT_TYPE.CASH}`);
export const getPartyName = (tx, deposit) =>
  fromNotes(tx?.notes, NOTE_KEY.PARTY) ||
  tx?.party_name ||
  (deposit ? tx?.paid_by || tx?.received_by : tx?.received_by || tx?.paid_by) ||
  i18n.t("placeholder.dash", { ns: "salary" });
export const getCreatedBy = (tx, deposit) =>
  tx?.created_by ||
  fromNotes(tx?.notes, NOTE_KEY.CREATED_BY) ||
  i18n.t("placeholder.dash", { ns: "salary" });
export const getExchangeRate = (tx) => {
  const vaultCurrency = String(tx?.vault?.currency || "").toUpperCase();
  const txCurrency = String(tx?.currency || "").toUpperCase();
  if (vaultCurrency && vaultCurrency === txCurrency) return "1";
  const rate = Number(tx?.exchange_rate);
  return !rate || rate === 1 ? "1" : rate.toLocaleString("en-US", { maximumFractionDigits: 4 });
};
const options = (values, prefix) =>
  values.map((value) => ({ value, label: t(`${prefix}.${value}`) }));
export const PAYMENT_METHODS = options(Object.values(RECEIPT_TYPE), "receiptType");
export const CURRENCY_OPTIONS = options([CURRENCY.AFN, CURRENCY.USD], "currency");
export const MEMBER_ROLE_OPTIONS = options(Object.values(MEMBER_ROLE), "memberRole");
export const VAULT_TYPE_OPTIONS = options(Object.values(VAULT_TYPE), "vaultType");
export const VAULT_TYPE_LABELS = Object.fromEntries(
  Object.values(VAULT_TYPE).map((value) => [value, t(`vaultType.${value}`)])
);
