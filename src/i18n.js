import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import commonFa from "./locales/fa/common.json";
import attendanceFa from "./locales/fa/attendance.json";
import employeeFa from "./locales/fa/employee.json";
import productionFa from "./locales/fa/production.json";
import warehouseFa from "./locales/fa/warehouse.json";
import productsFa from "./locales/fa/products.json";
import salesFa from "./locales/fa/sales.json";
import overtimeFa from "./locales/fa/overtime.json";
import salaryFa from "./locales/fa/salary.json";
import treasuryFa from "./locales/fa/treasury.json";
import advancesFa from "./locales/fa/advances.json";
import incomesFa from "./locales/fa/incomes.json";
import settingsFa from "./locales/fa/settings.json";
import expensesFa from "./locales/fa/expenses.json";
import depositsWithdrawalsFa from "./locales/fa/depositsWithdrawals.json";
import transfersFa from "./locales/fa/transfers.json";
import customersFa from "./locales/fa/customers.json";

i18n.use(initReactI18next).init({
  resources: {
    fa: {
      common: commonFa,
      attendance: attendanceFa,
      employee: employeeFa,
      production: productionFa,
      warehouse: warehouseFa,
      products: productsFa,
      sales: salesFa,
      overtime: overtimeFa,
      salary: salaryFa,
      treasury: treasuryFa,
      advances: advancesFa,
      incomes: incomesFa,
      settings: settingsFa,
      expenses: expensesFa,
      depositsWithdrawals: depositsWithdrawalsFa,
      transfers: transfersFa,
      customers: customersFa,
    },
  },
  lng: "fa",
  fallbackLng: "fa",
  fallbackNS: "common",
  defaultNS: "common",
  ns: ["common", "attendance", "employee", "production", "warehouse", "products", "sales", "overtime", "salary", "treasury", "advances", "incomes", "settings", "expenses", "depositsWithdrawals", "transfers", "customers"],
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
