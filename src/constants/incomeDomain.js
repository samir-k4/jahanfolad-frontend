export const INCOME_TYPE = {
  INVOICE: "فاکتور",
  PREPAYMENT: "پیش پرداخت",
  DEPOSIT: "امانت",
  MISC: "دریافتی متفرقه",
  DEBT_SETTLEMENT: "تسویه حساب بدهی",
  SCRAP_SALE: "فروش ضایعات",
};
export const INCOME_TYPE_KEYS = {
  [INCOME_TYPE.INVOICE]: "invoice",
  [INCOME_TYPE.PREPAYMENT]: "prepayment",
  [INCOME_TYPE.DEPOSIT]: "deposit",
  [INCOME_TYPE.MISC]: "misc",
  [INCOME_TYPE.DEBT_SETTLEMENT]: "debtSettlement",
  [INCOME_TYPE.SCRAP_SALE]: "scrapSale",
};
export const INCOME_TYPE_IDS = Object.values(INCOME_TYPE);
export const BALANCE_STATE = { DEBTOR: "debtor", CREDITOR: "creditor", SETTLED: "settled" };
export const balanceState = (balance) => {
  if (balance > 0) return BALANCE_STATE.DEBTOR;
  if (balance < 0) return BALANCE_STATE.CREDITOR;
  return BALANCE_STATE.SETTLED;
};
