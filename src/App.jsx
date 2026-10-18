import React, { lazy, Suspense, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Routes,
  Route,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { ChevronDown, LogOut, Bell, User } from "lucide-react";
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ProductionPage = lazy(() => import("./pages/ProductionPage"));
const ProductsList = lazy(() => import("./pages/ProductsList"));
const AttendanceForm = lazy(() => import("./pages/AttendanceForm"));
const OvertimeForm = lazy(() => import("./pages/OvertimeForm"));
const Reports = lazy(() => import("./pages/Reports"));
const EmployeePage = lazy(() => import("./pages/EmployeePage"));
const EmployeeFormPage = lazy(() => import("./pages/EmployeeFormPage"));
const EmployeeProfilePage = lazy(() => import("./pages/EmployeeProfilePage"));
const SalaryPage = lazy(() => import("./pages/SalaryPage"));
const EmployeePaymentPage = lazy(() => import("./pages/EmployeePaymentPage"));
const WarehousePage = lazy(() => import("./pages/WarehousePage"));
const ExpensesPage = lazy(() => import("./pages/ExpensesPage"));
const CustomerReceiptsPage = lazy(() => import("./pages/CustomerReceiptsPage"));
const CustomerReceiptCreatePage = lazy(() => import("./pages/CustomerReceiptCreatePage"));
const CustomersPage = lazy(() => import("./pages/CustomersPage"));
const CustomerCreatePage = lazy(() => import("./pages/CustomerCreatePage"));
const CustomerProfilePage = lazy(() => import("./pages/CustomerProfilePage"));
const CustomerLoansPage = lazy(() => import("./pages/CustomerLoansPage"));
const SalesInvoicesPage = lazy(() => import("./pages/SalesInvoicesPage"));
const InvoiceCreatePage = lazy(() => import("./pages/InvoiceCreatePage"));
const ScrapSalesPage = lazy(() => import("./pages/ScrapSalesPage"));
const TreasuryVaultsPage = lazy(() => import("./pages/TreasuryVaultsPage"));
const DepositsWithdrawalsPage = lazy(() => import("./pages/DepositsWithdrawalsPage"));
const DepositWithdrawCreatePage = lazy(() => import("./pages/DepositWithdrawCreatePage"));
const TransfersPage = lazy(() => import("./pages/TransfersPage"));
const TransferCreatePage = lazy(() => import("./pages/TransferCreatePage"));
const VaultDetailPage = lazy(() => import("./pages/VaultDetailPage"));
const ManagerAdvancesPage = lazy(() => import("./pages/ManagerAdvancesPage"));
const ManagerAdvanceDetailPage = lazy(() => import("./pages/ManagerAdvanceDetailPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const Login = lazy(() => import("./pages/Login"));
const UserProfilePage = lazy(() => import("./pages/UserProfilePage"));
import { NavGroup, PageLink, RequirePage, BranchGate, PasswordChangeModal } from "./components/common";
import { pageForPath } from "./constants/pageRoutes";
import { useAuth } from "./context/AuthContext";
import { useBranch } from "./context/BranchContext";
import useExpenseTypes from "./hooks/useExpenseTypes";
import { AppToaster } from "./utils/toast";

const PageLoading = () => (
  <div className="flex min-h-[40vh] items-center justify-center" role="status">
    <div className="w-8 h-8 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function App() {
  const { t, i18n } = useTranslation("common");
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isRestoring, isAuthenticated, mustChangePassword, logout, refreshUser, can } =
    useAuth();
  const { needsBranchGate } = useBranch();
  const { types: expenseTypes } = useExpenseTypes(isAuthenticated);
  useEffect(() => {
    document.title = t("app.title");
  }, [i18n.resolvedLanguage, t]);
  const activeTab = location.pathname;
  const isFluidPage = [
    "/treasury",
    "/vault",
    "/vaults",
    "/production",
    "/godam",
    "/products",
    "/employees",
    "/attendance",
    "/overtime",
    "/salary",
    "/salaries",
    "/customer-receipts",
    "/incomes",
    "/manager-advances",
    "/expenses",
    "/deposits-withdrawals",
    "/transfers",
    "/customers",
    "/customer-loans",
    "/sales",
    "/settings",
  ].some((path) => location.pathname.startsWith(path));
  const isCustomersPage = ["/customers", "/customer-loans"].some((path) =>
    location.pathname.startsWith(path)
  );
  const handleMobileNavChange = (event) => {
    navigate(event.target.value);
  };
  if (isRestoring) {
    return (
      <div
        dir="rtl"
        className="min-h-screen flex items-center justify-center bg-gray-50 font-sans"
      >
        <div className="w-8 h-8 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated) {
    return (
      <Suspense fallback={<PageLoading />}>
        <Login />
        <AppToaster />
      </Suspense>
    );
  }
  if (mustChangePassword) {
    return (
      <>
        <div className="min-h-screen bg-gray-200" />
        <PasswordChangeModal isOpen forced onDone={() => refreshUser()} />
        <AppToaster />
      </>
    );
  }
  if (needsBranchGate) {
    return (
      <>
        <BranchGate />
        <AppToaster />
      </>
    );
  }
  return (
    <div
      dir="rtl"
      className="min-h-screen flex flex-col font-sans bg-gray-50 text-gray-800"
    >
      <AppToaster />
      <nav className="bg-slate-900 text-white px-6 py-2.5 flex justify-between items-center shadow-xs fixed top-0 w-full z-40 border-b border-slate-800">
        <div className="hidden md:flex items-center space-x-6 space-x-reverse text-base font-medium pr-1">
          <Link
            to="/"
            className={`hover:text-slate-300 py-1.5 transition-colors ${
              activeTab === "/"
                ? "text-white border-b-2 border-white font-bold"
                : "text-slate-300"
            }`}
          >
            {t("navigation.home")}
          </Link>
          <NavGroup pages={["production", "products", "warehouse"]}>
          <div className="relative group cursor-pointer">
            <div className="flex items-center space-x-1 space-x-reverse hover:text-slate-300 py-1.5 text-slate-300">
              <span>{t("navigation.groups.productionWarehouse")}</span>
              <ChevronDown size={14} />
            </div>
            <div className="absolute right-0 w-52 bg-white text-gray-800 rounded-card shadow-xl hidden group-hover:block border border-gray-200 overflow-hidden z-50">
              <PageLink
                page="production"
                to="/production"
                className="w-full text-right block px-4 py-3 hover:bg-gray-100 border-b border-gray-100 font-bold text-slate-900"
              >
                {t("navigation.pages.production")}
              </PageLink>
              <PageLink
                page="products"
                to="/products"
                className="w-full text-right block px-4 py-3 hover:bg-gray-100 border-b border-gray-100 text-gray-700"
              >
                {t("navigation.pages.products")}
              </PageLink>
              <PageLink
                page="warehouse"
                to="/godam"
                className="w-full text-right block px-4 py-3 hover:bg-gray-100 text-gray-700"
              >
                {t("navigation.pages.warehouse")}
              </PageLink>
            </div>
          </div>
          </NavGroup>
          <NavGroup pages={["employees", "attendance", "overtime", "salaries"]}>
          <div className="relative group cursor-pointer">
            <div className="flex items-center space-x-1 space-x-reverse hover:text-slate-300 py-1.5 text-slate-300">
              <span>{t("navigation.groups.humanResources")}</span>
              <ChevronDown size={14} />
            </div>
            <div className="absolute right-0 w-52 bg-white text-gray-800 rounded-card shadow-xl hidden group-hover:block border border-gray-200 overflow-hidden z-50">
              <PageLink
                page="employees"
                to="/employees"
                className="w-full text-right block px-4 py-3 hover:bg-gray-100 border-b border-gray-100 text-gray-700"
              >
                {t("navigation.pages.employees")}
              </PageLink>
              <PageLink
                page="attendance"
                to="/attendance"
                className="w-full text-right block px-4 py-3 hover:bg-gray-100 border-b border-gray-100 text-gray-700"
              >
                {t("navigation.pages.attendance")}
              </PageLink>
              <PageLink
                page="overtime"
                to="/overtime"
                className="w-full text-right block px-4 py-3 hover:bg-gray-100 border-b border-gray-100 text-gray-700"
              >
                {t("navigation.pages.overtime")}
              </PageLink>
              <PageLink
                page="salaries"
                to="/salaries"
                className="w-full text-right block px-4 py-3 hover:bg-gray-100 text-gray-700"
              >
                {t("navigation.pages.salary")}
              </PageLink>
            </div>
          </div>
          </NavGroup>
          <NavGroup pages={["treasury", "advances", "incomes"]}>
          <div className="relative group cursor-pointer">
            <div className="flex items-center space-x-1 space-x-reverse hover:text-slate-300 py-1.5 text-slate-300">
              <span>{t("navigation.groups.accounts")}</span>
              <ChevronDown size={14} />
            </div>
            <div className="absolute right-0 w-48 bg-white text-gray-800 rounded-card shadow-xl hidden group-hover:block border border-gray-200 overflow-hidden z-50">
              <PageLink
                page="treasury"
                to="/treasury"
                className="w-full text-right block px-4 py-3 hover:bg-gray-100 border-b border-gray-100 text-gray-700"
              >
                {t("navigation.pages.treasury")}
              </PageLink>
              <PageLink
                page="advances"
                to="/manager-advances"
                className="w-full text-right block px-4 py-3 hover:bg-gray-100 border-b border-gray-100 text-gray-700"
              >
                {t("navigation.pages.advances")}
              </PageLink>
              <PageLink
                page="incomes"
                to="/incomes"
                className="w-full text-right block px-4 py-3 hover:bg-gray-100 text-gray-700"
              >
                {t("navigation.pages.incomes")}
              </PageLink>
            </div>
          </div>
          </NavGroup>
          <NavGroup pages={["treasury"]}>
          <div className="relative group cursor-pointer">
            <div className="flex items-center space-x-1 space-x-reverse hover:text-slate-300 py-1.5 text-slate-300">
              <span>{t("navigation.groups.transactions")}</span>
              <ChevronDown size={14} />
            </div>
            <div className="absolute right-0 w-48 bg-white text-gray-800 rounded-card shadow-xl hidden group-hover:block border border-gray-200 overflow-hidden z-50">
              <PageLink
                page="treasury"
                to="/deposits-withdrawals"
                className="w-full text-right block px-4 py-3 hover:bg-gray-100 border-b border-gray-100 text-gray-700"
              >
                {t("navigation.pages.depositsWithdrawals")}
              </PageLink>
              <PageLink
                page="treasury"
                to="/transfers"
                className="w-full text-right block px-4 py-3 hover:bg-gray-100 text-gray-700"
              >
                {t("navigation.pages.transfers")}
              </PageLink>
            </div>
          </div>
          </NavGroup>
          <NavGroup pages={["expenses", "settings"]}>
          <div className="relative group cursor-pointer">
            <div className="flex items-center space-x-1 space-x-reverse hover:text-slate-300 py-1.5 text-slate-300">
              <span>{t("navigation.groups.expenses")}</span>
              <ChevronDown size={14} />
            </div>
            <div className="absolute right-0 w-56 bg-white text-gray-800 rounded-card shadow-xl hidden group-hover:block border border-gray-200 overflow-hidden z-50">
              <PageLink
                page="expenses"
                to="/expenses"
                className="w-full text-right block px-4 py-3 hover:bg-gray-100 border-b border-gray-100 text-gray-700 font-bold"
              >
                {t("navigation.pages.expenses")}
              </PageLink>
              {expenseTypes.map((type) => (
                <PageLink
                  key={type.id}
                  page="expenses"
                  to={`/expenses?expense_type=${type.slug}`}
                  className="w-full text-right block px-4 py-3 hover:bg-gray-100 border-b border-gray-100 text-gray-700"
                >
                  {type.name}
                </PageLink>
              ))}
              <PageLink
                page="settings"
                to="/settings?tab=categories&domain=expense_type"
                className="w-full text-right block px-4 py-3 hover:bg-gray-100 text-gray-700"
              >
                {t("navigation.pages.expenseTypes")}
              </PageLink>
            </div>
          </div>
          </NavGroup>
          <NavGroup pages={["customers"]}>
          <div className="relative group cursor-pointer">
            <div
              className={`flex items-center space-x-1 space-x-reverse hover:text-slate-300 py-1.5 ${
                isCustomersPage ? "text-white font-bold" : "text-slate-300"
              }`}
            >
              <span>{t("navigation.groups.customers")}</span>
              <ChevronDown size={14} />
            </div>
            <div className="absolute right-0 w-48 bg-white text-gray-800 rounded-card shadow-xl hidden group-hover:block border border-gray-200 overflow-hidden z-50">
              <PageLink
                page="customers"
                to="/customers"
                className="w-full text-right block px-4 py-3 hover:bg-gray-100 border-b border-gray-100 text-gray-700"
              >
                {t("navigation.pages.customers")}
              </PageLink>
              <PageLink
                page="customers"
                to="/customer-loans"
                className="w-full text-right block px-4 py-3 hover:bg-gray-100 text-gray-700"
              >
                {t("navigation.pages.customerLoans")}
              </PageLink>
            </div>
          </div>
          </NavGroup>
          <NavGroup pages={["sales"]}>
          <div className="relative group cursor-pointer">
            <div className="flex items-center space-x-1 space-x-reverse hover:text-slate-300 py-1.5 text-slate-300">
              <span>{t("navigation.groups.sales")}</span>
              <ChevronDown size={14} />
            </div>
            <div className="absolute right-0 w-48 bg-white text-gray-800 rounded-card shadow-xl hidden group-hover:block border border-gray-200 overflow-hidden z-50">
              <PageLink
                page="sales"
                to="/sales/invoices"
                className="w-full text-right block px-4 py-3 hover:bg-gray-100 border-b border-gray-100 text-gray-700"
              >
                {t("navigation.pages.invoices")}
              </PageLink>
              <PageLink
                page="sales"
                to="/sales/scrap"
                className="w-full text-right block px-4 py-3 hover:bg-gray-100 text-gray-700"
              >
                {t("sales.scrapCategory")}
              </PageLink>
            </div>
          </div>
          </NavGroup>
          <PageLink
            page="reports"
            to="/reports"
            className={`hover:text-slate-300 py-1.5 ${activeTab === "/reports" ? "text-white border-b-2 border-white font-bold" : "text-slate-300"}`}
          >
            {t("navigation.pages.reports")}
          </PageLink>
        </div>
        <div className="flex items-center space-x-3.5 space-x-reverse">
          <div className="relative group/tip inline-flex">
            <button
              type="button"
              className="relative p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
            >
              <Bell size={19} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-slate-900" />
            </button>
            <div
              className="absolute top-full left-0 mt-1.5 hidden group-hover/tip:flex flex-col items-start pointer-events-none z-50 whitespace-nowrap animate-in fade-in zoom-in-95 duration-150"
              dir="rtl"
            >
            </div>
          </div>
          <div className="h-5 w-px bg-slate-700 mx-1 hidden sm:block" />
          <PageLink
            page="settings"
            to="/settings"
            className="flex items-center gap-2.5 bg-slate-800/90 hover:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700/80 cursor-pointer transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-inner">
              <User size={15} />
            </div>
            <div className="hidden sm:flex flex-col text-right leading-tight">
              <span className="text-xs font-bold text-white">{user?.name}</span>
              <span className="text-[10px] text-emerald-400 font-medium">
                {user?.role_title}
              </span>
            </div>
          </PageLink>
          <button
            type="button"
            onClick={logout}
            title={t("navigation.logout")}
            aria-label={t("navigation.logout")}
            className="hidden md:flex items-center space-x-1 space-x-reverse text-slate-300 hover:text-rose-400 p-1.5 rounded-btn transition-colors cursor-pointer"
          >
            <LogOut size={17} />
          </button>
        </div>
      </nav>
      <div className="md:hidden bg-white p-2 border-b border-gray-200 fixed top-12 w-full z-40 shadow-xs mt-1">
        <select
          className="w-full p-2 border border-gray-300 rounded-input text-base text-gray-800 bg-white"
          value={activeTab}
          onChange={handleMobileNavChange}
        >
          {can("dashboard") && (
            <option value="/">{t("navigation.pages.dashboard")}</option>
          )}
          {can("production") && (
            <option value="/production">{t("navigation.pages.production")}</option>
          )}
          {can("products") && (
            <option value="/products">{t("navigation.pages.products")}</option>
          )}
          {can("warehouse") && (
            <option value="/godam">{t("navigation.pages.warehouse")}</option>
          )}
          {can("employees") && (
            <option value="/employees">{t("navigation.pages.employees")}</option>
          )}
          {can("employees") && (
            <option value="/employees/create">{t("navigation.pages.employeeCreate")}</option>
          )}
          {can("attendance") && (
            <option value="/attendance">{t("navigation.pages.attendance")}</option>
          )}
          {can("overtime") && (
            <option value="/overtime">{t("navigation.pages.overtime")}</option>
          )}
          {can("salaries") && (
            <option value="/salaries">{t("navigation.pages.salary")}</option>
          )}
          {can("treasury") && (
            <option value="/treasury">{t("navigation.pages.treasuryMobile")}</option>
          )}
          {can("advances") && (
            <option value="/manager-advances">{t("navigation.pages.advancesMobile")}</option>
          )}
          {can("incomes") && (
            <option value="/incomes">{t("navigation.pages.incomesMobile")}</option>
          )}
          {can("customers") && (
            <option value="/customers">{t("navigation.pages.customers")}</option>
          )}
          {can("customers") && (
            <option value="/customer-loans">{t("navigation.pages.customerLoansMobile")}</option>
          )}
          {can("expenses") && (
            <option value="/expenses">{t("navigation.pages.expensesMobile")}</option>
          )}
          {can("reports") && (
            <option value="/reports">{t("navigation.pages.reports")}</option>
          )}
          {can("settings") && (
            <option value="/settings">{t("navigation.pages.settings")}</option>
          )}
        </select>
      </div>
      <main
        className={`flex-1 overflow-y-auto w-full ${
          isFluidPage
            ? "px-6 pt-20 md:pt-24 pb-14 md:pb-16"
            : "px-[1px] max-w-7xl mx-auto pt-20 md:pt-24 pb-16"
        }`}
      >
        <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route
            path="/"
            element={
              <RequirePage page={pageForPath("/")}>
                <Dashboard />
              </RequirePage>
            }
          />
          <Route
            path="/production"
            element={
              <RequirePage page={pageForPath("/production")}>
                <ProductionPage />
              </RequirePage>
            }
          />
          <Route
            path="/godam"
            element={
              <RequirePage page={pageForPath("/godam")}>
                <WarehousePage />
              </RequirePage>
            }
          />
          <Route
            path="/products"
            element={
              <RequirePage page={pageForPath("/products")}>
                <ProductsList />
              </RequirePage>
            }
          />
          <Route
            path="/employees"
            element={
              <RequirePage page={pageForPath("/employees")}>
                <EmployeePage />
              </RequirePage>
            }
          />
          <Route
            path="/employees/create"
            element={
              <RequirePage page={pageForPath("/employees/create")}>
                <EmployeeFormPage />
              </RequirePage>
            }
          />
          <Route
            path="/employees/new"
            element={
              <RequirePage page={pageForPath("/employees/new")}>
                <EmployeeFormPage />
              </RequirePage>
            }
          />
          <Route
            path="/employees/:id"
            element={
              <RequirePage page={pageForPath("/employees/:id")}>
                <EmployeeProfilePage />
              </RequirePage>
            }
          />
          <Route
            path="/employees/:id/edit"
            element={
              <RequirePage page={pageForPath("/employees/:id/edit")}>
                <EmployeeFormPage />
              </RequirePage>
            }
          />
          <Route
            path="/attendance"
            element={
              <RequirePage page={pageForPath("/attendance")}>
                <AttendanceForm />
              </RequirePage>
            }
          />
          <Route
            path="/overtime"
            element={
              <RequirePage page={pageForPath("/overtime")}>
                <OvertimeForm />
              </RequirePage>
            }
          />
          <Route
            path="/salaries"
            element={
              <RequirePage page={pageForPath("/salaries")}>
                <SalaryPage />
              </RequirePage>
            }
          />
          <Route
            path="/salary"
            element={
              <RequirePage page={pageForPath("/salary")}>
                <SalaryPage />
              </RequirePage>
            }
          />
          <Route
            path="/salaries/payment"
            element={
              <RequirePage page={pageForPath("/salaries/payment")}>
                <EmployeePaymentPage />
              </RequirePage>
            }
          />
          <Route
            path="/salary/payment"
            element={
              <RequirePage page={pageForPath("/salary/payment")}>
                <EmployeePaymentPage />
              </RequirePage>
            }
          />
          <Route
            path="/treasury"
            element={
              <RequirePage page={pageForPath("/treasury")}>
                <TreasuryVaultsPage />
              </RequirePage>
            }
          />
          <Route
            path="/vault"
            element={
              <RequirePage page={pageForPath("/vault")}>
                <TreasuryVaultsPage />
              </RequirePage>
            }
          />
          <Route
            path="/vaults"
            element={
              <RequirePage page={pageForPath("/vaults")}>
                <TreasuryVaultsPage />
              </RequirePage>
            }
          />
          <Route
            path="/deposits-withdrawals"
            element={
              <RequirePage page={pageForPath("/deposits-withdrawals")}>
                <DepositsWithdrawalsPage />
              </RequirePage>
            }
          />
          <Route
            path="/deposits-withdrawals/create"
            element={
              <RequirePage page={pageForPath("/deposits-withdrawals/create")}>
                <DepositWithdrawCreatePage />
              </RequirePage>
            }
          />
          <Route
            path="/deposits-withdrawals/:id/edit"
            element={
              <RequirePage page={pageForPath("/deposits-withdrawals/:id/edit")}>
                <DepositWithdrawCreatePage />
              </RequirePage>
            }
          />
          <Route
            path="/transfers"
            element={
              <RequirePage page={pageForPath("/transfers")}>
                <TransfersPage />
              </RequirePage>
            }
          />
          <Route
            path="/transfers/create"
            element={
              <RequirePage page={pageForPath("/transfers/create")}>
                <TransferCreatePage />
              </RequirePage>
            }
          />
          <Route
            path="/transfers/:id/edit"
            element={
              <RequirePage page={pageForPath("/transfers/:id/edit")}>
                <TransferCreatePage />
              </RequirePage>
            }
          />
          <Route
            path="/transactions/deposits-withdrawals"
            element={
              <RequirePage page={pageForPath("/transactions/deposits-withdrawals")}>
                <DepositsWithdrawalsPage />
              </RequirePage>
            }
          />
          <Route
            path="/transactions/deposits-withdrawals/create"
            element={
              <RequirePage page={pageForPath("/transactions/deposits-withdrawals/create")}>
                <DepositWithdrawCreatePage />
              </RequirePage>
            }
          />
          <Route
            path="/transactions/deposits-withdrawals/:id/edit"
            element={
              <RequirePage page={pageForPath("/transactions/deposits-withdrawals/:id/edit")}>
                <DepositWithdrawCreatePage />
              </RequirePage>
            }
          />
          <Route
            path="/vault/:id"
            element={
              <RequirePage page={pageForPath("/vault/:id")}>
                <VaultDetailPage />
              </RequirePage>
            }
          />
          <Route
            path="/manager-advances"
            element={
              <RequirePage page={pageForPath("/manager-advances")}>
                <ManagerAdvancesPage />
              </RequirePage>
            }
          />
          <Route
            path="/manager-advances/:id"
            element={
              <RequirePage page={pageForPath("/manager-advances/:id")}>
                <ManagerAdvanceDetailPage />
              </RequirePage>
            }
          />
          <Route
            path="/incomes"
            element={
              <RequirePage page={pageForPath("/incomes")}>
                <CustomerReceiptsPage />
              </RequirePage>
            }
          />
          <Route
            path="/incomes/create"
            element={
              <RequirePage page={pageForPath("/incomes/create")}>
                <CustomerReceiptCreatePage />
              </RequirePage>
            }
          />
          <Route
            path="/incomes/new"
            element={
              <RequirePage page={pageForPath("/incomes/new")}>
                <CustomerReceiptCreatePage />
              </RequirePage>
            }
          />
          <Route
            path="/customer-receipts"
            element={
              <RequirePage page={pageForPath("/customer-receipts")}>
                <CustomerReceiptsPage />
              </RequirePage>
            }
          />
          <Route
            path="/customer-receipts/create"
            element={
              <RequirePage page={pageForPath("/customer-receipts/create")}>
                <CustomerReceiptCreatePage />
              </RequirePage>
            }
          />
          <Route
            path="/customers"
            element={
              <RequirePage page={pageForPath("/customers")}>
                <CustomersPage />
              </RequirePage>
            }
          />
          <Route
            path="/customer-loans"
            element={
              <RequirePage page={pageForPath("/customer-loans")}>
                <CustomerLoansPage />
              </RequirePage>
            }
          />
          <Route
            path="/customers/create"
            element={
              <RequirePage page={pageForPath("/customers/create")}>
                <CustomerCreatePage />
              </RequirePage>
            }
          />
          <Route
            path="/customers/new"
            element={
              <RequirePage page={pageForPath("/customers/new")}>
                <CustomerCreatePage />
              </RequirePage>
            }
          />
          <Route
            path="/customers/:id"
            element={
              <RequirePage page={pageForPath("/customers/:id")}>
                <CustomerProfilePage />
              </RequirePage>
            }
          />
          <Route
            path="/sales/invoices"
            element={
              <RequirePage page={pageForPath("/sales/invoices")}>
                <SalesInvoicesPage />
              </RequirePage>
            }
          />
          <Route
            path="/sales/invoices/create"
            element={
              <RequirePage page={pageForPath("/sales/invoices/create")}>
                <InvoiceCreatePage />
              </RequirePage>
            }
          />
          <Route
            path="/sales/invoices/:id/edit"
            element={
              <RequirePage page={pageForPath("/sales/invoices/:id/edit")}>
                <InvoiceCreatePage />
              </RequirePage>
            }
          />
          <Route
            path="/sales/factors"
            element={
              <RequirePage page={pageForPath("/sales/factors")}>
                <SalesInvoicesPage />
              </RequirePage>
            }
          />
          <Route
            path="/sales/factors/create"
            element={
              <RequirePage page={pageForPath("/sales/factors/create")}>
                <InvoiceCreatePage />
              </RequirePage>
            }
          />
          <Route
            path="/sales/factors/:id/edit"
            element={
              <RequirePage page={pageForPath("/sales/factors/:id/edit")}>
                <InvoiceCreatePage />
              </RequirePage>
            }
          />
          <Route
            path="/sales/scrap"
            element={
              <RequirePage page={pageForPath("/sales/scrap")}>
                <ScrapSalesPage />
              </RequirePage>
            }
          />
          <Route
            path="/expenses"
            element={
              <RequirePage page={pageForPath("/expenses")}>
                <ExpensesPage />
              </RequirePage>
            }
          />
          <Route
            path="/reports"
            element={
              <RequirePage page={pageForPath("/reports")}>
                <Reports />
              </RequirePage>
            }
          />
          <Route
            path="/settings/users/:id"
            element={
              <RequirePage page="users">
                <UserProfilePage />
              </RequirePage>
            }
          />
          <Route
            path="/settings"
            element={
              <RequirePage page={pageForPath("/settings")}>
                <SettingsPage />
              </RequirePage>
            }
          />
        </Routes>
        </Suspense>
      </main>
    </div>
  );
}
