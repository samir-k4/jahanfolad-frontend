import React, { useState, useEffect, useCallback } from "react";
import { showToast as appToast } from "../utils/toast";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, RefreshCw, Edit3, Trash2, Info, X, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import useBodyScrollLock from "../hooks/useBodyScrollLock";
import useDebounce from "../hooks/useDebounce";
import { apiUrl } from "../api";
import {
  TooltipButton,
  TablePagination,
  CustomDropdown,
  SearchableSelect,
  DeleteConfirmationModal,
  usePagePerms,
} from "../components/common";
import CustomersReportModal from "../components/customers/CustomersReportModal";
const AFGHAN_PROVINCES = [
  "کابل", "هرات", "بلخ", "ننگرهار", "کندز", "کندهار", "غزنی", "بغلان",
  "تخار", "بدخشان", "فاریاب", "جوزجان", "سرپل", "سمنگان", "پروان",
  "کاپیسا", "پنجشیر", "وردک", "لوگر", "خوست", "پکتیا", "پکتیکا",
  "هلمند", "زابل", "ارزگان", "غور", "بادغیس", "فراه", "نیمروز",
  "دایکندی", "بامیان", "کنر", "لغمان", "نورستان"
];
const FALLBACK_CUSTOMER_CODE = "1001";
const DEFAULT_PER_PAGE = 15;
const FILTER_CONTROL = "h-10 px-3 text-xs font-medium text-content-body bg-surface rounded-input";
const FORM_CONTROL = "w-full px-3 py-2 text-xs text-content bg-surface border border-line-strong rounded-input outline-none focus:border-accent";
const LABEL = "block text-label-text text-content-body mb-1";
const TABLE_CELL = "px-3 py-2.5 border-l border-line";
const TABLE_HEADER_CELL = "px-3 py-2.5 border-l border-line whitespace-nowrap text-table-header-text font-bold text-content-body";
const ACTION_BUTTON = "p-1.5 bg-surface text-content-subtle border border-line-strong shadow-2xs transition-colors";
const VIEW_HOVER = "hover:bg-accent-subtle hover:text-accent hover:border-accent-line";
const EDIT_HOVER = "hover:bg-notice-soft hover:text-notice-text hover:border-notice-line";
const DELETE_HOVER = "hover:bg-danger-soft hover:text-danger-text hover:border-danger-line";
const STATUS_BADGE = "inline-flex items-center px-2 py-0.5 rounded-badge border font-bold text-xs";
const STATUS_BADGE_TONE = {
  active: "bg-positive-soft text-positive-text border-positive-line",
  inactive: "bg-danger-soft text-danger-text border-danger-line",
};
const fmt = (n) => Number(n || 0).toLocaleString("en-US");
const MobileField = ({ label, children }) => (
  <div className="min-w-0">
    <p className="text-caption-text text-content-subtle mb-0.5">{label}</p>
    <div className="text-content break-words">{children}</div>
  </div>
);
export default function CustomersPage() {
  const { t } = useTranslation("customers");
  const navigate = useNavigate();
  const { canCreate, canDelete, canEdit } = usePagePerms("customers");
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 1000);
  const [selectedProvince, setSelectedProvince] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: DEFAULT_PER_PAGE,
    total: 0,
  });
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [deletingCustomer, setDeletingCustomer] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const createEmptyForm = (customerCode = "") => ({
    customer_code: customerCode,
    name: "",
    phone: "",
    phone2: "",
    province: AFGHAN_PROVINCES[0],
    address: "",
    credit_limit: "",
    status: "active",
    notes: "",
  });
  const [formData, setFormData] = useState(() => createEmptyForm());
  const showToast = (message, type = "success") => {
    (appToast[type] || appToast.info)(message);
  };
  useBodyScrollLock(isFormModalOpen || !!deletingCustomer || isReportModalOpen);
  const fetchCustomers = useCallback(async (page = 1, customPerPage = perPage) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        per_page: customPerPage,
        search: debouncedSearchQuery.trim(),
        status: selectedStatus,
        province: selectedProvince,
      });
      const res = await fetch(apiUrl(`/customers?${params.toString()}`));
      if (!res.ok) throw new Error(t("messages.fetchFailed"));
      const result = await res.json();
      setCustomers(result.data || []);
      setPagination(result.pagination || { current_page: 1, last_page: 1, per_page: customPerPage, total: 0 });
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchQuery, selectedStatus, selectedProvince, perPage, t]);
  useEffect(() => {
    fetchCustomers(1);
  }, [fetchCustomers]);
  const handleOpenCreate = async () => {
    setEditingCustomer(null);
    let nextCode = FALLBACK_CUSTOMER_CODE;
    try {
      const res = await fetch(apiUrl("/customers/next-code"));
      if (res.ok) {
        const data = await res.json();
        if (data.next_code) nextCode = data.next_code;
      }
    } catch (e) {
      console.error(e);
    }
    setFormData(createEmptyForm(nextCode));
    setIsFormModalOpen(true);
  };
  const handleOpenEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      customer_code: customer.customer_code || "",
      name: customer.name || "",
      phone: customer.phone || "",
      phone2: customer.phone2 || "",
      province: customer.province || AFGHAN_PROVINCES[0],
      address: customer.address || "",
      credit_limit: customer.credit_limit ? String(customer.credit_limit) : "",
      status: customer.status || "active",
      notes: customer.notes || "",
    });
    setIsFormModalOpen(true);
  };
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      showToast(t("messages.required"), "error");
      return;
    }
    setSubmitting(true);
    try {
      const url = editingCustomer
        ? apiUrl(`/customers/${editingCustomer.id}`)
        : apiUrl("/customers");
      const method = editingCustomer ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || t("messages.saveFailed"));
      }
      showToast(editingCustomer ? t("messages.updated") : t("messages.created"));
      setIsFormModalOpen(false);
      fetchCustomers(pagination.current_page);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };
  const handleDeleteCustomer = async () => {
    if (!deletingCustomer) return;
    setSubmitting(true);
    try {
      const res = await fetch(apiUrl(`/customers/${deletingCustomer.id}`), {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || t("messages.deleteFailed"));
      }
      showToast(t("messages.deleted"));
      setDeletingCustomer(null);
      fetchCustomers(pagination.current_page);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };
  const provinceOptions = [
    { value: "all", label: t("filters.allProvinces") },
    ...AFGHAN_PROVINCES.map((p) => ({ value: p, label: p })),
  ];
  const statusOptions = [
    { value: "all", label: t("filters.allStatuses") },
    { value: "active", label: t("filters.activeOnly") },
    { value: "inactive", label: t("filters.inactive") },
  ];
  const formStatusOptions = [
    { value: "active", label: t("status.active") },
    { value: "inactive", label: t("status.inactive") },
  ];
  const renderStatusBadge = (status) => {
    const tone = status === "active" ? STATUS_BADGE_TONE.active : STATUS_BADGE_TONE.inactive;
    return (
      <span className={`${STATUS_BADGE} ${tone}`}>
        {status === "active" ? t("status.active") : t("status.inactive")}
      </span>
    );
  };
  const renderActionButtons = (c) => (
    <div className="inline-flex items-center justify-center gap-1.5">
      <TooltipButton
        tooltip={t("actions.details")}
        onClick={() => navigate(`/customers/${c.id}`)}
        colorClass={`${ACTION_BUTTON} ${VIEW_HOVER}`}
      >
        <Info size={15} />
      </TooltipButton>
      {canEdit && (
        <TooltipButton
          tooltip={t("actions.edit")}
          onClick={() => handleOpenEdit(c)}
          colorClass={`${ACTION_BUTTON} ${EDIT_HOVER}`}
        >
          <Edit3 size={15} />
        </TooltipButton>
      )}
      {canDelete && (
        <TooltipButton
          tooltip={t("actions.delete")}
          onClick={() => setDeletingCustomer(c)}
          colorClass={`${ACTION_BUTTON} ${DELETE_HOVER}`}
        >
          <Trash2 size={15} />
        </TooltipButton>
      )}
    </div>
  );
  return (
    <div className="w-full space-y-4 font-sans" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-line pb-4">
        <div>
          <h1 className="text-xl font-bold text-content tracking-tight">
            {t("page.title")}
          </h1>
          <p className="text-xs text-content-subtle font-medium mt-1">
            {t("page.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            className="px-4 py-2 text-btn-text font-bold text-content-body bg-surface border border-line-strong hover:bg-surface-muted rounded-btn transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <FileText size={16} />
            <span>راپور مشتریان</span>
          </button>
          {canCreate && (
            <Link
              to="/customers/create"
              className="px-4 py-2 text-btn-text font-bold text-content-inverse bg-positive hover:bg-positive-strong rounded-btn transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={16} />
              <span>{t("actions.create")}</span>
            </Link>
          )}
        </div>
      </div>
      <div className="bg-surface rounded-table border border-line shadow-2xs overflow-hidden">
        <div className="p-3.5 bg-surface-muted border-b border-line flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative w-full md:flex-1 md:max-w-md">
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-content-faint" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("filters.searchPlaceholder")}
              className="w-full h-10 pl-3 pr-9 bg-surface border border-line-strong rounded-input text-xs outline-none focus:border-accent placeholder-content-faint"
            />
          </div>
          <div className="grid grid-cols-[1fr_auto] md:flex md:items-center md:flex-wrap gap-2.5">
            <div className="col-span-2 md:col-span-1 md:w-52">
              <SearchableSelect
                options={provinceOptions}
                value={selectedProvince}
                onChange={(val) => setSelectedProvince(val)}
                placeholder={t("filters.allProvinces")}
                usePortal
              />
            </div>
            <div className="md:w-36">
              <CustomDropdown
                options={statusOptions}
                value={selectedStatus}
                onChange={(val) => setSelectedStatus(val)}
                buttonClassName={`${FILTER_CONTROL} w-full min-w-[120px] justify-between`}
                width="w-36"
                usePortal
              />
            </div>
            <TooltipButton
              icon={<RefreshCw size={14} className={loading ? "animate-spin" : ""} />}
              onClick={() => fetchCustomers(pagination.current_page)}
              colorClass="h-10 w-10 flex items-center justify-center bg-surface border border-line-strong text-content-body hover:bg-surface-subtle transition-colors"
            />
          </div>
        </div>
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-right border-collapse text-table-cell-text text-content">
            <thead>
              <tr className="bg-surface-muted border-b border-line">
                <th className="px-3 py-2.5 text-center w-12 whitespace-nowrap border-l border-line text-table-header-text font-bold text-content-body">{t("table.columns.index")}</th>
                <th className={`${TABLE_HEADER_CELL} text-center w-24`}>{t("table.columns.code")}</th>
                <th className={TABLE_HEADER_CELL}>{t("table.columns.name")}</th>
                <th className={TABLE_HEADER_CELL}>{t("table.columns.phone")}</th>
                <th className={TABLE_HEADER_CELL}>{t("table.columns.province")}</th>
                <th className={`${TABLE_HEADER_CELL} text-center w-28`}>{t("table.columns.creditLimit")}</th>
                <th className={`${TABLE_HEADER_CELL} text-center w-28`}>{t("table.columns.createdBy")}</th>
                <th className={`${TABLE_HEADER_CELL} text-center w-24`}>{t("table.columns.status")}</th>
                <th className="px-3 py-2.5 text-center w-36 whitespace-nowrap text-table-header-text font-bold text-content-body">{t("table.columns.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft bg-surface">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-content-subtle text-body-text">
                    {t("messages.loading")}
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-content-subtle text-body-text">
                    {t("messages.empty")}
                  </td>
                </tr>
              ) : (
                customers.map((c, idx) => (
                  <tr key={c.id} className="hover:bg-surface-muted/70 transition-colors">
                    <td className={`${TABLE_CELL} text-center font-mono text-content-subtle`}>
                      {(pagination.current_page - 1) * (pagination.per_page || DEFAULT_PER_PAGE) + idx + 1}
                    </td>
                    <td className={`${TABLE_CELL} text-center font-mono font-bold text-content`} dir="ltr">
                      {c.customer_code || t("emptyValue")}
                    </td>
                    <td className={`${TABLE_CELL} font-bold text-content-strong`}>
                      <Link to={`/customers/${c.id}`} className="hover:text-accent transition-colors">
                        {c.name}
                      </Link>
                    </td>
                    <td className={`${TABLE_CELL} font-mono text-content-body`} dir="ltr">
                      {c.phone || t("emptyValue")}
                    </td>
                    <td className={`${TABLE_CELL} text-content-body`}>
                      {c.province || t("emptyValue")}
                    </td>
                    <td className={`${TABLE_CELL} text-center font-mono font-bold text-content`} dir="ltr">
                      ${fmt(c.credit_limit)}
                    </td>
                    <td className={`${TABLE_CELL} text-center text-content-muted`}>
                      {c.created_by || t("emptyValue")}
                    </td>
                    <td className={`${TABLE_CELL} text-center`}>
                      {renderStatusBadge(c.status)}
                    </td>
                    <td className="px-3 py-2.5 text-center whitespace-nowrap">
                      {renderActionButtons(c)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="lg:hidden divide-y divide-line-soft bg-surface">
          {loading || customers.length === 0 ? (
            <p className="p-8 text-center text-content-subtle text-body-text">
              {loading ? t("messages.loading") : t("messages.empty")}
            </p>
          ) : (
            customers.map((c) => (
              <div key={c.id} className="p-3 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Link to={`/customers/${c.id}`} className="font-bold text-content-strong hover:text-accent transition-colors break-words min-w-0">
                    {c.name}
                  </Link>
                  {renderStatusBadge(c.status)}
                </div>
                <div className="grid grid-cols-2 gap-3 text-table-cell-text">
                  <MobileField label={t("table.columns.code")}>
                    <span className="font-mono font-bold" dir="ltr">{c.customer_code || t("emptyValue")}</span>
                  </MobileField>
                  <MobileField label={t("table.columns.phone")}>
                    <span className="font-mono" dir="ltr">{c.phone || t("emptyValue")}</span>
                  </MobileField>
                  <MobileField label={t("table.columns.province")}>
                    {c.province || t("emptyValue")}
                  </MobileField>
                  <MobileField label={t("table.columns.creditLimit")}>
                    <span className="font-mono font-bold" dir="ltr">${fmt(c.credit_limit)}</span>
                  </MobileField>
                  <MobileField label={t("table.columns.createdBy")}>
                    {c.created_by || t("emptyValue")}
                  </MobileField>
                </div>
                <div className="flex justify-end">{renderActionButtons(c)}</div>
              </div>
            ))
          )}
        </div>
        <TablePagination
          currentPage={pagination.current_page}
          lastPage={pagination.last_page}
          total={pagination.total}
          perPage={perPage}
          onPageChange={(page) => fetchCustomers(page)}
          onPerPageChange={(size) => {
            setPerPage(size);
            fetchCustomers(1, size);
          }}
          unit={t("pagination.unit")}
        />
      </div>
      {isFormModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-overlay/50 font-sans" dir="rtl">
          <div className="bg-surface rounded-modal shadow-2xl max-w-lg w-full overflow-hidden border border-line animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 border-b border-line flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-section-title font-bold text-content-strong">
                  {editingCustomer ? t("form.editTitle") : t("form.createTitle")}
                </h3>
                <p className="text-caption-text text-content-subtle mt-0.5">{t("form.subtitle")}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="p-1.5 rounded-btn text-content-subtle hover:text-content-body hover:bg-surface-muted transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleFormSubmit} className="p-5 space-y-3.5 max-h-[85vh] overflow-y-auto font-sans">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className={LABEL}>
                    {t("form.name")} <span className="text-danger-text">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`${FORM_CONTROL} font-bold`}
                  />
                </div>
                <div>
                  <label className={LABEL}>{t("form.code")}</label>
                  <input
                    type="text"
                    value={formData.customer_code}
                    onChange={(e) => setFormData({ ...formData, customer_code: e.target.value })}
                    className={`${FORM_CONTROL} font-mono font-bold text-center`}
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>
                    {t("form.phone")} <span className="text-danger-text">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={`${FORM_CONTROL} font-mono`}
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className={LABEL}>{t("form.phone2")}</label>
                  <input
                    type="text"
                    value={formData.phone2}
                    onChange={(e) => setFormData({ ...formData, phone2: e.target.value })}
                    className={`${FORM_CONTROL} font-mono`}
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>{t("form.province")}</label>
                  <SearchableSelect
                    options={AFGHAN_PROVINCES.map((p) => ({ value: p, label: p }))}
                    value={formData.province}
                    onChange={(val) => setFormData({ ...formData, province: val })}
                    usePortal
                  />
                </div>
                <div>
                  <label className={LABEL}>{t("form.status")}</label>
                  <CustomDropdown
                    options={formStatusOptions}
                    value={formData.status}
                    onChange={(val) => setFormData({ ...formData, status: val })}
                    usePortal
                    buttonClassName={`${FILTER_CONTROL} w-full justify-between`}
                  />
                </div>
              </div>
              <div>
                <label className={LABEL}>{t("form.creditLimit")}</label>
                <input
                  type="number"
                  step="any"
                  dir="ltr"
                  onFocus={(e) => e.target.select()}
                  onWheel={(e) => e.target.blur()}
                  value={formData.credit_limit}
                  onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                  placeholder="0.00"
                  className={`${FORM_CONTROL} font-mono`}
                />
              </div>
              <div>
                <label className={LABEL}>{t("form.address")}</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className={FORM_CONTROL}
                />
              </div>
              <div>
                <label className={LABEL}>{t("form.notes")}</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className={`${FORM_CONTROL} leading-relaxed`}
                />
              </div>
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 text-btn-text font-medium text-content-body bg-surface hover:bg-surface-muted border border-line-strong rounded-btn transition-colors cursor-pointer"
                >
                  {t("actions.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-btn-text font-bold text-content-inverse bg-positive hover:bg-positive-strong rounded-btn transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {submitting
                    ? t("actions.submitting")
                    : editingCustomer
                      ? t("actions.saveChanges")
                      : t("actions.submit")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {deletingCustomer && (
        <DeleteConfirmationModal
          isOpen={true}
          onClose={() => setDeletingCustomer(null)}
          onConfirm={handleDeleteCustomer}
          loading={submitting}
          namespace="customers"
          title={t("delete.title")}
          itemName={t("delete.itemName", { name: deletingCustomer.name, code: deletingCustomer.customer_code })}
        />
      )}
      <CustomersReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />
    </div>
  );
}
