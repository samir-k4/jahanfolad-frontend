import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { showToast as appToast } from "../utils/toast";
import {
  Users,
  Tag,
  Building,
  Sliders,
  Wallet,
  Shield,
  Plus,
  Search,
  AlertTriangle,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Download,
  Save,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  Printer,
  ChevronLeft,
  Upload,
  Image as ImageIcon,
  Eye,
  KeyRound,
  Lock,
  LockOpen,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import UserFormModal from "../components/settings/UserFormModal";
import PasswordResetResultModal from "../components/settings/PasswordResetResultModal";
import CategoryFormModal from "../components/settings/CategoryFormModal";
import VaultTransactionCategoriesManager from "../components/settings/VaultTransactionCategoriesManager";
import PayRulesTable from "../components/settings/PayRulesTable";
import SalaryPaymentTypesTable from "../components/settings/SalaryPaymentTypesTable";
import { useCompany } from "../context/CompanyContext";
import { useBranch } from "../context/BranchContext";
import CompanyLogoPlate from "../components/common/CompanyLogoPlate";
import useDebounce from "../hooks/useDebounce";
import { apiFetch, apiList } from "../api";
import { TooltipButton, CustomDropdown, usePagePerms } from "../components/common";
const TAB_IDS = ["users", "categories", "company", "policies", "branches", "backup"];
const TAB_ICONS = {
  users: Users,
  categories: Tag,
  company: Building,
  policies: Sliders,
  branches: MapPin,
  backup: Download,
};
const CATEGORY_DOMAIN_IDS = [
  "all",
  "product_category",
  "expense_type",
  "expense_category",
  "job_category",
  "job_position",
  "warehouse_category",
  "vault_type",
  "vault_transaction_category",
];
const LOGO_PRESETS = [
  { key: "small", size: 60 },
  { key: "standard", size: 80 },
  { key: "large", size: 120 },
  { key: "xlarge", size: 180 },
  { key: "max", size: 250 },
];
const LOGO_SIZE_DEFAULT = 80;
const LOGO_MAX_BYTES = 5 * 1024 * 1024;
const ROLE_BADGE_CLASS = {
  super_admin: "bg-slate-900 text-white border-slate-900",
  finance_manager: "bg-emerald-50 text-emerald-800 border-emerald-200",
  production_manager: "bg-slate-100 text-slate-800 border-slate-200",
  warehouse_manager: "bg-amber-50 text-amber-900 border-amber-300",
  hr_manager: "bg-gray-100 text-gray-700 border-gray-200",
  auditor_viewer: "bg-gray-100 text-gray-700 border-gray-200",
};
const ROLE_BADGE_FALLBACK = "bg-gray-100 text-gray-700 border-gray-200";
const PANEL_CLASS = "bg-white rounded-card border border-gray-200 shadow-2xs overflow-hidden";
const TOOLBAR_CLASS = "px-4 py-3 bg-gray-50/70 border-b border-gray-200";
const INPUT_CLASS =
  "w-full px-3 py-2 bg-white border border-gray-300 rounded-input text-body-text text-gray-900 outline-none focus:border-slate-800 transition-colors";
const NUMERIC_INPUT_CLASS =
  "w-full px-3 py-2 bg-white border border-gray-300 rounded-input text-body-text font-mono font-bold text-center text-gray-900 outline-none focus:border-slate-800 transition-colors";
const PRIMARY_BTN_CLASS =
  "px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-btn-text font-bold rounded-btn flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50";
const SECONDARY_BTN_CLASS =
  "px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 text-btn-text font-bold rounded-btn border border-gray-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer";
const CARD_FIELD_CLASS = "p-3.5 bg-gray-50/70 rounded-card border border-gray-200";
const HINT_CLASS = "text-caption-text text-gray-500 block mt-1.5 whitespace-normal break-words";
const TH_CLASS = "py-2.5 px-4 text-table-header-text font-bold text-gray-700";
const TD_CLASS = "py-3 px-4 text-table-cell-text text-gray-800";
const PanelHeader = ({ icon: Icon, title, subtitle, children }) => (
  <div className="px-4 py-3 border-b border-gray-200 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0">
      <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
        <Icon size={17} className="text-gray-400 shrink-0" />
        <span className="whitespace-normal break-words">{title}</span>
      </h2>
      <p className="text-caption-text text-gray-500 mt-0.5 whitespace-normal break-words">{subtitle}</p>
    </div>
    {children ? <div className="shrink-0">{children}</div> : null}
  </div>
);
const StatusToggle = ({ isActive, onClick, activeLabel, inactiveLabel, size = 20 }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex items-center gap-1.5 cursor-pointer font-bold"
  >
    {isActive ? (
      <>
        <ToggleRight size={size} className="text-emerald-600" />
        <span className="text-caption-text font-bold text-emerald-700">{activeLabel}</span>
      </>
    ) : (
      <>
        <ToggleLeft size={size} className="text-gray-400" />
        <span className="text-caption-text text-gray-400">{inactiveLabel}</span>
      </>
    )}
  </button>
);
export default function SettingsPage() {
  const { t } = useTranslation("settings");
  const navigate = useNavigate();
  const { canEdit: canEditUsers, canDelete: canDeleteUsers, canCreate: canCreateUsers } =
    usePagePerms("users");
  const { canEdit: canEditSettings } = usePagePerms("settings");
  const { canView: canViewTreasury } = usePagePerms("treasury");
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(
    () => searchParams.get("tab") || "users",
  );
  const notify = (type, message) => {
    (appToast[type] || appToast.info)(message);
  };
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const { branches, ensureBranches, refreshBranches } = useBranch();
  const [branchFormOpen, setBranchFormOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [branchForm, setBranchForm] = useState({ name: "", location: "" });
  const [savingBranch, setSavingBranch] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const debouncedUserSearch = useDebounce(userSearch, 1000);
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [resetResult, setResetResult] = useState(null);
  const [categories, setCategories] = useState([]);
  const categoriesRequestId = useRef(0);
  const [catDomainFilter, setCatDomainFilter] = useState(
    () => searchParams.get("domain") || "all",
  );
  const [catSearch, setCatSearch] = useState("");
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [modalDefaultDomain, setModalDefaultDomain] = useState("expense");
  const {
    settings: companySettings,
    settingsLoaded,
    updateLogo,
    removeLogo,
    syncSettingsToStateAndCache,
    saveLogoSize,
  } = useCompany();
  const [settings, setSettings] = useState({
    company_name: "",
    company_tagline: "",
    company_about: "",
    company_phone: "",
    company_email: "",
    company_address: "",
    company_website: "",
    company_logo: null,
    company_logo_size: LOGO_SIZE_DEFAULT,
    default_currency: "AFN",
    usd_rate: "70",
    standard_daily_hours: "8",
    low_balance_alert_afn: "10000",
    print_voucher_footer: "",
    employee_account_start: "",
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoSize = Number(settings.company_logo_size) || LOGO_SIZE_DEFAULT;
  const openNewBranchForm = () => {
    setEditingBranch(null);
    setBranchForm({ name: "", location: "" });
    setBranchFormOpen(true);
  };
  const openEditBranchForm = (branch) => {
    setEditingBranch(branch);
    setBranchForm({ name: branch.name || "", location: branch.location || "" });
    setBranchFormOpen(true);
  };
  const saveBranch = async (event) => {
    event.preventDefault();
    setSavingBranch(true);
    try {
      await apiFetch(
        editingBranch ? `/branches/${editingBranch.id}` : "/branches",
        {
          method: editingBranch ? "PUT" : "POST",
          body: {
            name: branchForm.name.trim(),
            location: branchForm.location.trim() || null,
          },
        },
      );
      await refreshBranches();
      setBranchFormOpen(false);
      setEditingBranch(null);
      notify("success", t(editingBranch ? "branches.updated" : "branches.created"));
    } catch (error) {
      const validationMessage = Object.values(error.data?.errors || {})
        .flat()
        .find((message) => typeof message === "string");
      notify(
        "error",
        error.status === 422 && validationMessage
          ? validationMessage
          : t("branches.saveError"),
      );
    } finally {
      setSavingBranch(false);
    }
  };
  const deleteBranch = async (branch) => {
    if (!window.confirm(t("branches.confirmDelete", { name: branch.name }))) return;
    try {
      await apiFetch(`/branches/${branch.id}`, { method: "DELETE" });
      await refreshBranches();
      notify("success", t("branches.deleted"));
    } catch (error) {
      notify("error", error.message || t("branches.deleteError"));
    }
  };
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const params = new URLSearchParams();
      if (userRoleFilter !== "all") params.append("role", userRoleFilter);
      if (debouncedUserSearch.trim()) params.append("search", debouncedUserSearch.trim());
      const data = await apiFetch(`/users?${params.toString()}`);
      setUsers(data.data || []);
      setRoles(data.roles || []);
    } catch (e) {
      notify("error", t("message.usersError"));
    } finally {
      setLoadingUsers(false);
    }
  }, [userRoleFilter, debouncedUserSearch, t]);
  const [jobCategories, setJobCategories] = useState([]);
  const [expenseTypes, setExpenseTypes] = useState([]);
  const fetchCategories = useCallback(async () => {
    const requestId = ++categoriesRequestId.current;
    if (catDomainFilter === "vault_transaction_category") {
      setLoadingCategories(false);
      return;
    }
    setLoadingCategories(true);
    try {
      if (catDomainFilter === "all") {
        const [data, availableBranches, vaults] = await Promise.all([
          apiFetch("/categories/all-grouped"),
          ensureBranches(),
          canViewTreasury ? apiList("/vaults") : Promise.resolve([]),
        ]);
        if (requestId !== categoriesRequestId.current) return;
        const jCats = data.job_categories || [];
        setJobCategories(jCats);
        const eTypes = data.expense_types || [];
        setExpenseTypes(eTypes);
        const withDomain = (list, domain) =>
          (list || []).map((c) => ({ ...c, _domain: domain }));
        setCategories([
          ...withDomain(data.product_categories, "product_category"),
          ...withDomain(eTypes, "expense_type"),
          ...withDomain(data.expense_categories, "expense_category"),
          ...withDomain(jCats, "job_category"),
          ...withDomain(data.job_positions, "job_position"),
          ...withDomain(availableBranches, "warehouse_category"),
          ...withDomain(vaults, "vault_type"),
        ]);
      } else {
        const domainData =
          catDomainFilter === "warehouse_category"
            ? await ensureBranches()
            : catDomainFilter === "vault_type"
              ? canViewTreasury
                ? await apiList("/vaults")
                : []
              : await apiList(`/categories/${encodeURIComponent(catDomainFilter)}`);
        if (requestId !== categoriesRequestId.current) return;
        setCategories(
          (Array.isArray(domainData) ? domainData : []).map((c) => ({
            ...c,
            _domain: catDomainFilter,
          })),
        );

        if (catDomainFilter === "job_position") {
          const jcData = await apiList("/categories/job_category");
          if (requestId !== categoriesRequestId.current) return;
          setJobCategories(jcData);
        } else if (catDomainFilter === "expense_category") {
          const etData = await apiList("/categories/expense_type");
          if (requestId !== categoriesRequestId.current) return;
          setExpenseTypes(etData);
        }
      }
    } catch (e) {
      if (requestId === categoriesRequestId.current) {
        notify("error", t("message.categoriesError"));
      }
    } finally {
      if (requestId === categoriesRequestId.current) {
        setLoadingCategories(false);
      }
    }
  }, [catDomainFilter, canViewTreasury, ensureBranches, t]);
  useEffect(() => {
    if (settingsLoaded) {
      setSettings((prev) => ({ ...prev, ...companySettings }));
    }
  }, [companySettings, settingsLoaded]);
  useEffect(() => {
    if (activeTab === "users") fetchUsers();
    if (activeTab === "categories") fetchCategories();
  }, [activeTab, fetchUsers, fetchCategories]);
  const domainLabel = (domain) =>
    domain === "expense_type"
      ? t("navigation.pages.expenseTypes", { ns: "common" })
      : t(`domain.${domain}`, { defaultValue: domain });
  const roleLabel = (roleKey) => t(`role.${roleKey}`, { defaultValue: roleKey });
  const userBranchAccessLabel = (user) =>
    user.all_branches
      ? t("branch.all", { ns: "common" })
      : user.accessible_branches?.map((branch) => branch.name).join("، ") ||
        t("company.headOffice", { ns: "common" });
  const handleToggleUserStatus = async (user) => {
    try {
      const data = await apiFetch(`/users/${user.id}/toggle-status`, {
        method: "POST",
      });
      notify("success", data.message || t("message.userStatusChanged"));
      fetchUsers();
    } catch (e) {
      notify("error", e.message);
    }
  };
  const isLocked = (user) =>
    Boolean(user?.locked_until) && new Date(user.locked_until).getTime() > Date.now();
  const handleUnlockUser = async (user) => {
    try {
      const data = await apiFetch(`/users/${user.id}/unlock`, { method: "POST" });
      notify("success", data?.message || t("users.lock.unlocked"));
      fetchUsers();
    } catch (e) {
      notify("error", e.message || t("users.lock.failed"));
    }
  };
  const handleResetPassword = async (user) => {
    if (!window.confirm(t("users.reset.confirm", { name: user.name }))) return;
    try {
      const data = await apiFetch(`/users/${user.id}/reset-password`, { method: "POST" });
      setResetResult({ name: user.name, password: data?.temporary_password });
      fetchUsers();
    } catch (e) {
      notify("error", e.message || t("users.reset.failed"));
    }
  };
  const handleDeleteUser = async (user) => {
    if (!window.confirm(t("users.confirmDelete", { name: user.name }))) return;
    try {
      const data = await apiFetch(`/users/${user.id}`, { method: "DELETE" });
      notify("success", data?.message || t("message.userDeleted"));
      fetchUsers();
    } catch (e) {
      notify("error", e.message);
    }
  };
  const handleToggleCategoryStatus = async (cat) => {
    try {
      const targetDomain = cat._domain || catDomainFilter;
      const data = await apiFetch(
        `/categories/${encodeURIComponent(targetDomain)}/${cat.id}/toggle`,
        { method: "POST" },
      );
      notify("success", data?.message || t("message.categoryStatusChanged"));
      fetchCategories();
    } catch (e) {
      notify("error", e.message);
    }
  };
  const handleDeleteCategory = async (cat) => {
    if (!window.confirm(t("categories.confirmDelete", { name: cat.name }))) return;
    try {
      const targetDomain = cat._domain || catDomainFilter;
      const data = await apiFetch(
        `/categories/${encodeURIComponent(targetDomain)}/${cat.id}`,
        { method: "DELETE" },
      );
      notify("success", data?.message || t("message.categoryDeleted"));
      fetchCategories();
    } catch (e) {
      notify("error", e.message);
    }
  };
  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();
    setSavingSettings(true);
    try {
      await apiFetch("/settings/general", {
        method: "POST",
        body: { settings },
      });
      syncSettingsToStateAndCache(settings);
      notify("success", t("message.settingsSaved"));
    } catch (err) {
      notify("error", err.message);
    } finally {
      setSavingSettings(false);
    }
  };
  const handleLogoFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      notify("error", t("company.logoInvalidType"));
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      notify("error", t("company.logoTooLarge"));
      return;
    }
    setUploadingLogo(true);
    try {
      const res = await updateLogo(file);
      setSettings((prev) => ({ ...prev, company_logo: res.logo_url }));
      notify("success", t("company.logoUploaded"));
    } catch (err) {
      notify("error", err.message || t("company.logoUploadError"));
    } finally {
      setUploadingLogo(false);
      e.target.value = "";
    }
  };
  const handleRemoveLogo = async () => {
    if (!window.confirm(t("company.logoRemoveConfirm"))) return;
    setUploadingLogo(true);
    try {
      await removeLogo();
      setSettings((prev) => ({ ...prev, company_logo: null }));
      notify("success", t("company.logoRemoved"));
    } catch (err) {
      notify("error", err.message || t("company.logoRemoveError"));
    } finally {
      setUploadingLogo(false);
    }
  };
  const handleDownloadBackup = async () => {
    try {
      const data = await apiFetch("/settings/backup");
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `jahan_folad_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      notify("success", t("message.backupDownloaded"));
    } catch (err) {
      notify("error", t("message.backupError"));
    }
  };
  const handleLogoSizeChange = (size) => {
    setSettings((prev) => ({ ...prev, company_logo_size: size }));
    if (saveLogoSize) saveLogoSize(size);
  };
  const filteredCategories = categories.filter((c) => {
    if (!catSearch.trim()) return true;
    const s = catSearch.toLowerCase();
    return (
      c.name?.toLowerCase().includes(s) ||
      c.description?.toLowerCase().includes(s) ||
      c.location?.toLowerCase().includes(s) ||
      c.type?.toLowerCase().includes(s) ||
      c.account_number?.toLowerCase().includes(s) ||
      c.holder_name?.toLowerCase().includes(s) ||
      c.notes?.toLowerCase().includes(s) ||
      domainLabel(c._domain)?.toLowerCase().includes(s) ||
      c.job_category?.name?.toLowerCase().includes(s)
    );
  });
  const userActions = (u) => (
    <div className="flex items-center justify-center gap-1.5">
      <TooltipButton
        icon={Eye}
        tooltip={t("users.tooltip.view")}
        onClick={() => navigate(`/settings/users/${u.id}`)}
        className="bg-white text-gray-500 border border-gray-300 hover:text-blue-600 hover:border-blue-300"
      />
      {canEditUsers && (
        <TooltipButton
          icon={Edit2}
          tooltip={t("users.tooltip.edit")}
          onClick={() => {
            setSelectedUser(u);
            setUserModalOpen(true);
          }}
          className="bg-white text-gray-500 border border-gray-300 hover:text-amber-700 hover:border-amber-300"
        />
      )}
      {canEditUsers && isLocked(u) && (
        <TooltipButton
          icon={LockOpen}
          tooltip={t("users.lock.tooltip")}
          onClick={() => handleUnlockUser(u)}
          className="bg-white text-amber-700 border border-amber-300 hover:bg-amber-50"
        />
      )}
      {canEditUsers && (
        <TooltipButton
          icon={KeyRound}
          tooltip={t("users.reset.tooltip")}
          onClick={() => handleResetPassword(u)}
          className="bg-white text-gray-500 border border-gray-300 hover:text-slate-800 hover:border-slate-400"
        />
      )}
      {canDeleteUsers && (
        <TooltipButton
          icon={Trash2}
          tooltip={t("users.tooltip.delete")}
          onClick={() => handleDeleteUser(u)}
          className="bg-white text-gray-500 border border-gray-300 hover:text-rose-600 hover:border-rose-300"
        />
      )}
    </div>
  );
  return (
    <div className="w-full space-y-3.5 font-sans" dir="rtl">
      <div className={`${PANEL_CLASS} px-4 py-3`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <Link
              to="/"
              className="text-caption-text text-gray-400 hover:text-gray-600 font-medium inline-flex items-center gap-1 transition-colors"
            >
              <ChevronLeft size={12} />
              <span>{t("permission.backToDashboard", { ns: "common" })}</span>
            </Link>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight mt-1">
              {t("page.title")}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={handleDownloadBackup} className={SECONDARY_BTN_CLASS}>
              <Download size={15} className="text-gray-500" />
              <span>{t("action.backup")}</span>
            </button>
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className={PRIMARY_BTN_CLASS}
            >
              <Save size={15} />
              <span>{savingSettings ? t("action.saving") : t("actions.saveChanges", { ns: "common" })}</span>
            </button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        <div className="lg:col-span-3 xl:col-span-2 lg:sticky lg:top-24">
          <nav
            className={`${PANEL_CLASS} p-1.5 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible`}
          >
            {TAB_IDS.map((tabId) => {
              const Icon = TAB_ICONS[tabId];
              const isActive = activeTab === tabId;
              return (
                <button
                  key={tabId}
                  type="button"
                  onClick={() => setActiveTab(tabId)}
                  className={`shrink-0 lg:w-full text-right px-3 py-2 rounded-btn flex items-center gap-2 transition-colors cursor-pointer text-btn-text ${
                    isActive
                      ? "bg-slate-800 text-white font-bold"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium"
                  }`}
                >
                  <Icon size={16} className={isActive ? "text-white" : "text-gray-400"} />
                  <span className="whitespace-nowrap">{t(`tab.${tabId}.label`)}</span>
                </button>
              );
            })}
          </nav>
        </div>
        <div className="lg:col-span-9 xl:col-span-10 min-w-0">
          {activeTab === "users" && (
            <div className={PANEL_CLASS}>
              <PanelHeader icon={Shield} title={t("users.title")} subtitle={t("users.subtitle")}>
                {canCreateUsers && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUser(null);
                      setUserModalOpen(true);
                    }}
                    className={`${PRIMARY_BTN_CLASS} w-full sm:w-auto`}
                  >
                    <Plus size={16} />
                    <span>{t("users.add")}</span>
                  </button>
                )}
              </PanelHeader>
              <div className={`${TOOLBAR_CLASS} flex flex-col sm:flex-row items-stretch sm:items-center gap-2`}>
                <div className="relative flex-1">
                  <Search size={15} className="absolute right-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t("users.searchPlaceholder")}
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className={`${INPUT_CLASS} pr-9`}
                  />
                </div>
                <div className="w-full sm:w-56 shrink-0">
                  <CustomDropdown
                    value={userRoleFilter}
                    onChange={(val) => setUserRoleFilter(val)}
                    options={[
                      { value: "all", label: t("users.allRoles") },
                      ...roles.map((r) => ({ value: String(r.id), label: r.title })),
                    ]}
                    buttonClassName="w-full px-3 py-2 bg-white border border-gray-300 rounded-input text-label-text font-bold text-gray-700"
                  />
                </div>
              </div>
              {loadingUsers ? (
                <div className="py-16 text-center text-gray-400">
                  <RefreshCw size={26} className="mx-auto animate-spin mb-2" />
                  <p className="text-caption-text">{t("users.loading")}</p>
                </div>
              ) : users.length === 0 ? (
                <div className="py-16 px-4 text-center text-gray-400">
                  <Users size={30} className="mx-auto mb-2 opacity-40" />
                  <p className="text-body-text font-bold text-gray-600">{t("users.emptyTitle")}</p>
                  <p className="text-caption-text mt-1">{t("users.emptyHint")}</p>
                </div>
              ) : (
                <>
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-right">
                      <thead className="bg-gray-50/70 border-b border-gray-200">
                        <tr>
                          <th className={TH_CLASS}>{t("users.col.user")}</th>
                          <th className={TH_CLASS}>{t("users.col.username")}</th>
                          <th className={TH_CLASS}>{t("users.col.role")}</th>
                          <th className={TH_CLASS}>{t("users.col.branch")}</th>
                          <th className={TH_CLASS}>{t("table.status", { ns: "common" })}</th>
                          <th className={`${TH_CLASS} w-36 text-center`}>{t("users.col.actions")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {users.map((u) => (
                          <tr key={u.id} className="hover:bg-gray-50/70 transition-colors">
                            <td className={TD_CLASS}>
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-caption-text shrink-0">
                                  {u.name ? u.name.charAt(0) : "U"}
                                </div>
                                <div className="min-w-0">
                                  <span className="font-bold text-gray-900 block whitespace-normal break-words">
                                    {u.name}
                                  </span>
                                  <span className="text-caption-text text-gray-400 block font-mono" dir="ltr">
                                    {u.email}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className={TD_CLASS}>
                              <span
                                className="font-mono font-bold text-gray-700 bg-gray-100/80 px-2 py-0.5 rounded-badge"
                                dir="ltr"
                              >
                                {u.username || t("placeholder.dash")}
                              </span>
                            </td>
                            <td className={TD_CLASS}>
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-badge border text-caption-text font-bold ${
                                  ROLE_BADGE_CLASS[u.role] || ROLE_BADGE_FALLBACK
                                }`}
                              >
                                {roleLabel(u.role)}
                              </span>
                            </td>
                            <td className={`${TD_CLASS} text-gray-600`}>
                              {userBranchAccessLabel(u)}
                            </td>
                            <td className={TD_CLASS}>
                              <div className="flex items-center gap-2">
                                <StatusToggle
                                  isActive={u.status === "active"}
                                  onClick={() => handleToggleUserStatus(u)}
                                  activeLabel={t("status.active")}
                                  inactiveLabel={t("status.inactive")}
                                  size={22}
                                />
                                {isLocked(u) && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-badge bg-amber-50 border border-amber-200 text-caption-text font-bold text-amber-800">
                                    <Lock size={12} />
                                    {t("users.lock.badge")}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className={`${TD_CLASS} text-center`}>{userActions(u)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="md:hidden divide-y divide-gray-100">
                    {users.map((u) => (
                      <div key={u.id} className="p-4 space-y-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-caption-text shrink-0">
                            {u.name ? u.name.charAt(0) : "U"}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-gray-900 block whitespace-normal break-words">
                              {u.name}
                            </span>
                            <span className="text-caption-text text-gray-400 block font-mono" dir="ltr">
                              {u.email}
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-caption-text text-gray-500 block">
                              {t("users.col.username")}
                            </span>
                            <span className="font-mono font-bold text-gray-800 text-table-cell-text" dir="ltr">
                              {u.username || t("placeholder.dash")}
                            </span>
                          </div>
                          <div>
                            <span className="text-caption-text text-gray-500 block">
                              {t("users.col.branch")}
                            </span>
                            <span className="text-table-cell-text text-gray-800">
                              {userBranchAccessLabel(u)}
                            </span>
                          </div>
                          <div>
                            <span className="text-caption-text text-gray-500 block mb-0.5">
                              {t("users.col.role")}
                            </span>
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-badge border text-caption-text font-bold ${
                                ROLE_BADGE_CLASS[u.role] || ROLE_BADGE_FALLBACK
                              }`}
                            >
                              {roleLabel(u.role)}
                            </span>
                          </div>
                          <div>
                            <span className="text-caption-text text-gray-500 block mb-0.5">
                              {t("table.status", { ns: "common" })}
                            </span>
                            <StatusToggle
                              isActive={u.status === "active"}
                              onClick={() => handleToggleUserStatus(u)}
                              activeLabel={t("status.active")}
                              inactiveLabel={t("status.inactive")}
                            />
                          </div>
                        </div>
                        <div className="pt-2 border-t border-gray-100 flex justify-end">
                          {userActions(u)}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          {activeTab === "categories" && (
            <div className={PANEL_CLASS}>
              <PanelHeader icon={Tag} title={t("categories.title")} subtitle={t("categories.subtitle")}>
                {!["warehouse_category", "vault_type", "vault_transaction_category"].includes(catDomainFilter) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory(null);
                      setModalDefaultDomain(
                        catDomainFilter === "all" ? "expense_category" : catDomainFilter,
                      );
                      setCategoryModalOpen(true);
                    }}
                    className={`${PRIMARY_BTN_CLASS} w-full sm:w-auto`}
                  >
                    <Plus size={16} />
                    <span>{t("categories.add")}</span>
                  </button>
                )}
              </PanelHeader>
              <div className={`${TOOLBAR_CLASS} space-y-2.5`}>
                <div className="flex flex-wrap items-center gap-1.5">
                  {CATEGORY_DOMAIN_IDS.map((domain) => (
                    <button
                      key={domain}
                      type="button"
                      onClick={() => setCatDomainFilter(domain)}
                      className={`px-3 py-1.5 rounded-btn border text-caption-text font-bold transition-colors cursor-pointer ${
                        catDomainFilter === domain
                          ? "bg-slate-800 text-white border-slate-800"
                          : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {domainLabel(domain)}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <Search size={15} className="absolute right-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t("categories.searchPlaceholder")}
                    value={catSearch}
                    onChange={(e) => setCatSearch(e.target.value)}
                    className={`${INPUT_CLASS} pr-9`}
                  />
                </div>
              </div>
              {catDomainFilter === "vault_transaction_category" ? (
                <VaultTransactionCategoriesManager canEdit={canEditSettings} searchTerm={catSearch} />
              ) : (
              <div className="p-4">
                {loadingCategories ? (
                  <div className="py-16 text-center text-gray-400">
                    <RefreshCw size={26} className="mx-auto animate-spin mb-2" />
                    <p className="text-caption-text">{t("categories.loading")}</p>
                  </div>
                ) : filteredCategories.length === 0 ? (
                  <div className="py-16 text-center text-gray-400">
                    <Tag size={30} className="mx-auto mb-2 opacity-40" />
                    <p className="text-body-text font-bold text-gray-600">
                      {catDomainFilter === "vault_type" && !canViewTreasury
                        ? t("categories.permissionRequired")
                        : t("categories.emptyTitle")}
                    </p>
                    <p className="text-caption-text mt-1">
                      {catDomainFilter === "vault_type" && !canViewTreasury
                        ? t("categories.vaultPermissionHint")
                        : t("categories.emptyHint")}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full min-w-[760px] border-collapse text-right">
                      <thead className="bg-gray-50 text-xs font-bold text-gray-600">
                        <tr>
                          <th className="whitespace-nowrap px-4 py-3">{t("categories.col.name")}</th>
                          <th className="whitespace-nowrap px-4 py-3">{t("categories.col.domain")}</th>
                          <th className="whitespace-nowrap px-4 py-3">{t("categories.col.related")}</th>
                          <th className="px-4 py-3">{t("categories.col.description")}</th>
                          <th className="whitespace-nowrap px-4 py-3">                          {t("table.status", { ns: "common" })}</th>
                          <th className="whitespace-nowrap px-4 py-3 text-center">{t("categories.col.actions")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white text-sm">
                        {filteredCategories.map((cat) => (
                          <tr
                            key={`${cat._domain || "cat"}-${cat.id}`}
                            className={cat.is_active ? "hover:bg-gray-50/70" : "bg-gray-50/50 text-gray-400"}
                          >
                            <td className="max-w-56 px-4 py-3 font-semibold text-gray-900">
                              <span className="block whitespace-normal break-words">{cat.name}</span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                              {domainLabel(cat._domain)}
                            </td>
                            <td className="max-w-56 px-4 py-3 text-gray-600">
                              {cat.job_category?.name ||
                                cat.expense_type?.name ||
                                cat.location ||
                                (cat.type
                                ? t(`categories.vaultKind.${cat.type}`, {
                                    defaultValue: cat.type,
                                  })
                                : null) ||
                              t("placeholder.dash")}
                            </td>
                            <td className="max-w-sm px-4 py-3 text-gray-500">
                              <span className="block whitespace-normal break-words">
                              {cat._domain === "vault_type" && (
                                <span className="mb-1 block text-xs text-gray-600" dir="ltr">
                                  {[
                                    cat.account_number,
                                    cat.currency,
                                    cat.current_balance != null
                                      ? Number(cat.current_balance).toLocaleString("en-US")
                                      : null,
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </span>
                              )}
                              {cat.description || cat.notes || t("placeholder.dash")}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3">
                              {["warehouse_category", "vault_type"].includes(cat._domain) ? (
                                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                  {t("status.active")}
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleToggleCategoryStatus(cat)}
                                  className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                                    cat.is_active
                                      ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                  }`}
                                >
                                  {cat.is_active ? t("status.active") : t("status.inactive")}
                                </button>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3">
                              <div className="flex items-center justify-center gap-1.5">
                                {["warehouse_category", "vault_type"].includes(cat._domain) ? (
                                  <TooltipButton
                                    icon={Eye}
                                    tooltip={t("categories.tooltip.viewSource")}
                                    onClick={() =>
                                      navigate(
                                        cat._domain === "warehouse_category" ? "/godam" : "/vaults",
                                      )
                                    }
                                    className="bg-white text-gray-500 border border-gray-300 hover:text-blue-600 hover:border-blue-300"
                                  />
                                ) : (
                                  <>
                                    <TooltipButton
                                      icon={Edit2}
                                      tooltip={t("categories.tooltip.edit")}
                                      onClick={() => {
                                        setSelectedCategory(cat);
                                        setModalDefaultDomain(cat._domain || catDomainFilter);
                                        setCategoryModalOpen(true);
                                      }}
                                      className="bg-white text-gray-500 border border-gray-300 hover:text-amber-700 hover:border-amber-300"
                                    />
                                    <TooltipButton
                                      icon={Trash2}
                                      tooltip={t("categories.tooltip.delete")}
                                      onClick={() => handleDeleteCategory(cat)}
                                      className="bg-white text-gray-500 border border-gray-300 hover:text-rose-600 hover:border-rose-300"
                                    />
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              )}
            </div>
          )}
          {activeTab === "company" && (
            <form onSubmit={handleSaveSettings} className={PANEL_CLASS}>
              <PanelHeader icon={Building} title={t("company.title")} subtitle={t("company.subtitle")} />
              <div className="p-4 space-y-4">
                <div className={`${CARD_FIELD_CLASS} space-y-3.5`}>
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <ImageIcon size={16} className="text-gray-400 shrink-0" />
                        <h3 className="text-label-text font-bold text-gray-800 whitespace-normal break-words">
                          {t("company.logoTitle")}
                        </h3>
                      </div>
                      <p className="text-caption-text text-gray-500 leading-relaxed whitespace-normal break-words">
                        {t("company.logoHint")}
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 lg:shrink-0">
                      <div className="bg-white p-3 border border-gray-300 rounded-card shadow-2xs flex items-center justify-center w-full sm:w-auto sm:min-w-[160px] sm:max-w-[260px] min-h-[100px] overflow-hidden">
                        <CompanyLogoPlate
                          logo={settings.company_logo}
                          companyName={settings.company_name}
                          height={logoSize}
                          width={logoSize}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <label
                          className={`flex items-center justify-center gap-1.5 px-3.5 py-2 text-btn-text font-bold rounded-btn cursor-pointer transition-colors ${
                            uploadingLogo
                              ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                              : "bg-slate-800 hover:bg-slate-900 text-white"
                          }`}
                        >
                          {uploadingLogo ? (
                            <RefreshCw size={14} className="animate-spin" />
                          ) : (
                            <Upload size={14} />
                          )}
                          <span>
                            {settings.company_logo
                              ? t("company.logoChange")
                              : t("company.logoUpload")}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            disabled={uploadingLogo}
                            onChange={handleLogoFileChange}
                            className="hidden"
                          />
                        </label>
                        {settings.company_logo && (
                          <button
                            type="button"
                            disabled={uploadingLogo}
                            onClick={handleRemoveLogo}
                            className="text-caption-text font-bold text-rose-600 hover:text-rose-700 text-center cursor-pointer transition-colors"
                          >
                            {t("company.logoRemove")}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className="text-label-text font-bold text-gray-700">
                        {t("company.logoSize")}
                      </span>
                      <span
                        className="px-2 py-0.5 text-caption-text font-mono font-bold bg-gray-100/80 text-gray-800 border border-gray-200 rounded-badge"
                        dir="ltr"
                      >
                        {logoSize} px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="40"
                      max="250"
                      step="5"
                      value={logoSize}
                      onChange={(e) => handleLogoSizeChange(Number(e.target.value))}
                      className="w-full accent-slate-800 cursor-pointer"
                    />
                    <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                      {LOGO_PRESETS.map((preset) => (
                        <button
                          key={preset.size}
                          type="button"
                          onClick={() => handleLogoSizeChange(preset.size)}
                          className={`px-2.5 py-1 text-caption-text rounded-badge border transition-colors cursor-pointer ${
                            logoSize === preset.size
                              ? "bg-slate-800 text-white border-slate-800 font-bold"
                              : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {t(`company.preset.${preset.key}`)}
                          <span className="font-mono opacity-60 mr-1" dir="ltr">
                            {preset.size}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-label-text text-gray-700 mb-1">
                      {t("company.field.name")} <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={settings.company_name}
                      onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                      className={`${INPUT_CLASS} font-bold`}
                    />
                  </div>
                  <div>
                    <label className="block text-label-text text-gray-700 mb-1">
                      {t("company.field.tagline")}
                    </label>
                    <input
                      type="text"
                      value={settings.company_tagline}
                      onChange={(e) => setSettings({ ...settings, company_tagline: e.target.value })}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className="block text-label-text text-gray-700 mb-1">
                      {t("company.field.about")}
                    </label>
                    <input
                      type="text"
                      value={settings.company_about || ""}
                      onChange={(e) => setSettings({ ...settings, company_about: e.target.value })}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className="block text-label-text text-gray-700 mb-1">
                      {t("company.field.phone")}
                    </label>
                    <div className="relative">
                      <Phone size={15} className="absolute right-3 top-2.5 text-gray-400" />
                      <input
                        type="text"
                        dir="ltr"
                        value={settings.company_phone}
                        onChange={(e) => setSettings({ ...settings, company_phone: e.target.value })}
                        className={`${INPUT_CLASS} pr-9 font-mono text-left`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-label-text text-gray-700 mb-1">
                      {t("company.field.email")}
                    </label>
                    <div className="relative">
                      <Mail size={15} className="absolute right-3 top-2.5 text-gray-400" />
                      <input
                        type="email"
                        dir="ltr"
                        value={settings.company_email}
                        onChange={(e) => setSettings({ ...settings, company_email: e.target.value })}
                        className={`${INPUT_CLASS} pr-9 font-mono text-left`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-label-text text-gray-700 mb-1">
                      {t("company.field.website")}
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={settings.company_website || ""}
                      onChange={(e) =>
                        setSettings({ ...settings, company_website: e.target.value })
                      }
                      className={`${INPUT_CLASS} font-mono text-left`}
                      placeholder="www.example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-label-text text-gray-700 mb-1">
                      {t("company.field.address")}
                    </label>
                    <div className="relative">
                      <MapPin size={15} className="absolute right-3 top-2.5 text-gray-400" />
                      <input
                        type="text"
                        value={settings.company_address}
                        onChange={(e) => setSettings({ ...settings, company_address: e.target.value })}
                        className={`${INPUT_CLASS} pr-9`}
                      />
                    </div>
                  </div>
                </div>
                <div className={`${CARD_FIELD_CLASS} space-y-2.5`}>
                  <h3 className="text-label-text font-bold text-gray-800 flex items-center gap-2">
                    <Printer size={15} className="text-gray-400 shrink-0" />
                    <span className="whitespace-normal break-words">{t("company.footerTitle")}</span>
                  </h3>
                  <textarea
                    rows={3}
                    value={settings.print_voucher_footer}
                    onChange={(e) =>
                      setSettings({ ...settings, print_voucher_footer: e.target.value })
                    }
                    className={`${INPUT_CLASS} resize-none`}
                  />
                  <span className={HINT_CLASS}>{t("company.footerHint")}</span>
                </div>
                <div className="pt-1 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className={`${PRIMARY_BTN_CLASS} w-full sm:w-auto`}
                  >
                    <Save size={16} />
                    <span>{savingSettings ? t("action.saving") : t("action.saveCompany")}</span>
                  </button>
                </div>
              </div>
            </form>
          )}
          {activeTab === "policies" && (
            <form onSubmit={handleSaveSettings} className={PANEL_CLASS}>
              <PanelHeader
                icon={Sliders}
                title={t("policies.title")}
                subtitle={t("policies.subtitle")}
              />
              <div className="space-y-5 p-4 sm:p-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <div className={`${CARD_FIELD_CLASS} flex flex-col`}>
                    <label className="text-label-text font-bold text-gray-800 mb-1 flex items-center gap-1.5">
                      <DollarSign size={15} className="text-gray-400 shrink-0" />
                      <span className="whitespace-normal break-words">{t("policies.currency")}</span>
                    </label>
                    <CustomDropdown
                      value={settings.default_currency}
                      onChange={(val) => setSettings({ ...settings, default_currency: val })}
                      options={[
                        { value: "AFN", label: t("policies.currencyOption.AFN") },
                        { value: "USD", label: t("policies.currencyOption.USD") },
                      ]}
                      buttonClassName="w-full px-3 py-2 bg-white border border-gray-300 rounded-input text-label-text font-bold text-gray-800"
                    />
                    <span className={`${HINT_CLASS} flex-1`}>{t("policies.currencyHint")}</span>
                  </div>
                  <div className={`${CARD_FIELD_CLASS} flex flex-col`}>
                    <label className="text-label-text font-bold text-gray-800 mb-1 flex items-center gap-1.5">
                      <DollarSign size={15} className="text-gray-400 shrink-0" />
                      <span className="whitespace-normal break-words">{t("policies.usdRate")}</span>
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      dir="ltr"
                      onFocus={(e) => e.target.select()}
                      onWheel={(e) => e.target.blur()}
                      value={settings.usd_rate}
                      onChange={(e) => setSettings({ ...settings, usd_rate: e.target.value })}
                      className={NUMERIC_INPUT_CLASS}
                    />
                    <span className={`${HINT_CLASS} flex-1`}>{t("policies.usdRateHint")}</span>
                  </div>
                  <div className={`${CARD_FIELD_CLASS} flex flex-col`}>
                    <label className="text-label-text font-bold text-gray-800 mb-1 flex items-center gap-1.5">
                      <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                      <span className="whitespace-normal break-words">{t("policies.lowBalance")}</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      dir="ltr"
                      onFocus={(e) => e.target.select()}
                      onWheel={(e) => e.target.blur()}
                      value={settings.low_balance_alert_afn}
                      onChange={(e) =>
                        setSettings({ ...settings, low_balance_alert_afn: e.target.value })
                      }
                      className={NUMERIC_INPUT_CLASS}
                    />
                    <span className={`${HINT_CLASS} flex-1`}>{t("policies.lowBalanceHint")}</span>
                  </div>
                </div>
                <div className="flex justify-end border-t border-gray-100 pt-4">
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className={`${PRIMARY_BTN_CLASS} w-full sm:w-auto`}
                  >
                    <Save size={16} />
                    <span>{savingSettings ? t("action.saving") : t("action.savePolicies")}</span>
                  </button>
                </div>
              </div>
            </form>
          )}
          {activeTab === "policies" && (
            <div className={`${PANEL_CLASS} mt-3.5`}>
              <PanelHeader
                icon={Sliders}
                title={t("payRules.title")}
                subtitle={t("payRules.subtitle")}
              />
              <PayRulesTable canEdit={canEditSettings} />
            </div>
          )}
          {activeTab === "policies" && (
            <div className={`${PANEL_CLASS} mt-3.5`}>
              <PanelHeader
                icon={Wallet}
                title={t("paymentTypes.title")}
                subtitle={t("paymentTypes.subtitle")}
              />
              <SalaryPaymentTypesTable canEdit={canEditSettings} />
            </div>
          )}
          {activeTab === "branches" && (
            <div className={PANEL_CLASS}>
              <PanelHeader
                icon={MapPin}
                title={t("branches.title")}
                subtitle={t("branches.subtitle")}
              >
                {canEditSettings && (
                  <button
                    type="button"
                    onClick={branchFormOpen ? () => setBranchFormOpen(false) : openNewBranchForm}
                    className={PRIMARY_BTN_CLASS}
                  >
                    <Plus size={15} />
                    <span>{t(branchFormOpen ? "branches.cancel" : "branches.add")}</span>
                  </button>
                )}
              </PanelHeader>
              <div className="space-y-4 p-4">
                {branchFormOpen && (
                  <form
                    onSubmit={saveBranch}
                    className="grid grid-cols-1 gap-3 rounded-card border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2"
                  >
                    <label className="text-sm font-semibold text-gray-700">
                      {t("branches.name")}
                      <input
                        className={`${INPUT_CLASS} mt-1`}
                        value={branchForm.name}
                        onChange={(event) =>
                          setBranchForm((form) => ({ ...form, name: event.target.value }))
                        }
                        maxLength={255}
                        required
                        autoFocus
                      />
                    </label>
                    <label className="text-sm font-semibold text-gray-700">
                      {t("branches.location")}
                      <input
                        className={`${INPUT_CLASS} mt-1`}
                        value={branchForm.location}
                        onChange={(event) =>
                          setBranchForm((form) => ({ ...form, location: event.target.value }))
                        }
                        maxLength={255}
                      />
                    </label>
                    <div className="flex gap-2 sm:col-span-2">
                      <button
                        type="submit"
                        disabled={savingBranch}
                        className={PRIMARY_BTN_CLASS}
                      >
                        <Save size={15} />
                        <span>
                          {savingBranch ? t("branches.saving") : t("branches.save")}
                        </span>
                      </button>
                      <button
                        type="button"
                        disabled={savingBranch}
                        onClick={() => setBranchFormOpen(false)}
                        className={SECONDARY_BTN_CLASS}
                      >
                        {t("branches.cancel")}
                      </button>
                    </div>
                  </form>
                )}
                {branches.length === 0 ? (
                  <div className="py-12 text-center text-gray-400">
                    <Building size={30} className="mx-auto mb-2 opacity-40" />
                    <p className="text-caption-text">{t("branches.empty")}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {branches.map((b) => (
                      <div
                        key={b.id}
                        className="p-3.5 rounded-card border border-gray-200 bg-gray-50/70 flex items-start gap-3"
                      >
                        <div className="w-10 h-10 rounded-btn bg-white border border-gray-200 text-gray-500 flex items-center justify-center shrink-0">
                          <Building size={18} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-gray-900 text-body-text whitespace-normal break-words">
                              {b.name}
                            </h3>
                            {b.is_default && (
                              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                {t("branches.defaultBadge")}
                              </span>
                            )}
                          </div>
                          <p className="text-caption-text text-gray-500 mt-1 whitespace-normal break-words">
                            {b.location || t("branches.defaultLocation")}
                          </p>
                          {b.phone && (
                            <p className="text-caption-text font-mono text-gray-400 mt-0.5" dir="ltr">
                              {b.phone}
                            </p>
                          )}
                          {canEditSettings && (
                            <div className="mt-3 flex gap-2">
                              <button
                                type="button"
                                onClick={() => openEditBranchForm(b)}
                                className="inline-flex items-center gap-1 rounded-btn border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-100"
                              >
                                <Edit2 size={13} />
                                {t("branches.edit")}
                              </button>
                              {!b.is_default && (
                                <button
                                  type="button"
                                  onClick={() => deleteBranch(b)}
                                  className="inline-flex items-center gap-1 rounded-btn border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-50"
                                >
                                  <Trash2 size={13} />
                                  {t("branches.delete")}
                                </button>
                              )}
                            </div>
                          )}
                          {b.is_default && (
                            <p className="mt-2 text-xs text-gray-500">
                              {t("branches.defaultDeleteLocked")}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          {activeTab === "backup" && (
            <div className={PANEL_CLASS}>
              <PanelHeader icon={Download} title={t("backup.title")} subtitle={t("backup.subtitle")} />
              <div className="p-4 space-y-4">
                <div className="p-4 rounded-card bg-slate-800 text-white flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="font-bold text-base sm:text-lg whitespace-normal break-words">
                      {t("backup.downloadTitle")}
                    </h3>
                    <p className="text-caption-text text-gray-300 mt-1 leading-relaxed whitespace-normal break-words">
                      {t("backup.downloadHint")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadBackup}
                    className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-800 text-btn-text font-bold rounded-btn flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0"
                  >
                    <Download size={16} />
                    <span>{t("backup.download")}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <UserFormModal
        isOpen={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        user={selectedUser}
        roles={roles}
        branches={branches}
        onSaved={(msg) => {
          notify("success", msg);
          fetchUsers();
        }}
      />
      <PasswordResetResultModal
        isOpen={Boolean(resetResult)}
        onClose={() => setResetResult(null)}
        userName={resetResult?.name}
        password={resetResult?.password}
      />
      <CategoryFormModal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        category={selectedCategory}
        defaultDomain={modalDefaultDomain}
        jobCategories={jobCategories}
        expenseTypes={expenseTypes}
        onSaved={(msg) => {
          notify("success", msg);
          fetchCategories();
        }}
      />
    </div>
  );
}
