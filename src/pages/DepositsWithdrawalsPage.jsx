import React, { useState, useEffect, useCallback } from "react";
import { showToast as appToast } from "../utils/toast";
import { Link, useNavigate } from "react-router-dom";
import {
  Printer,
  Search,
  RefreshCw,
  X,
  Info,
  Pencil,
  Trash2,
} from "lucide-react";
import DatePicker from "react-multi-date-picker";
import { DateObject, persian, persian_af } from "../utils/dateHelpers";
import { toEnglishDigits } from "../utils/dariNumberFormatter";
import { formatDocNumber } from "../utils/formatDocNumber";
import DepositWithdrawModal from "../components/treasury/DepositWithdrawModal";
import TxDetailModal from "../components/treasury/TxDetailModal";
import TransactionReportModal from "../components/treasury/TransactionReportModal";
import useDebounce from "../hooks/useDebounce";
import { apiUrl } from "../api";
import {
  TooltipButton,
  TablePagination,
  CustomDropdown,
  SearchableSelect,
  FilterPresetButtons,
  DeleteConfirmationModal,
  usePagePerms,
} from "../components/common";
import { useTranslation } from "react-i18next";
const TYPE_FILTER_VALUES = ["deposit_withdrawal", "deposit", "withdrawal"];
const DATE_PRESET_KEYS = ["today", "week", "month", "year", "all"];
const CURRENCY_CODES = ["AFN", "USD", "EUR", "IRR", "PKR"];
const FILTER_CONTROL = "h-10 px-3 text-xs font-medium text-content-body bg-surface rounded-input";
const TABLE_HEADER_CELL = "px-3 py-2.5 border-l border-line whitespace-nowrap text-table-header-text font-bold text-content-body";
const TABLE_CELL = "px-3 py-2.5 border-l border-line whitespace-nowrap";
const persianNow = () => new DateObject({ calendar: persian, locale: persian_af });
const daysInPersianMonth = (d) => d.month.length || (d.month.number <= 6 ? 31 : d.month.number <= 11 ? 30 : 29);
const resolvePresetRange = (key) => {
  const today = persianNow();
  if (key === "all") return { start: null, end: null };
  if (key === "today") return { start: persianNow(), end: today };
  if (key === "week") {
    const start = persianNow();
    start.subtract((today.toDate().getDay() + 1) % 7, "days");
    return { start, end: today };
  }
  if (key === "year") {
    const start = persianNow();
    start.setMonth(1);
    start.setDay(1);
    return { start, end: today };
  }
  const start = persianNow();
  start.setDay(1);
  const end = persianNow();
  end.setDay(daysInPersianMonth(end));
  return { start, end };
};
const MobileField = ({ label, children }) => (
  <div className="min-w-0">
    <p className="text-caption-text text-content-subtle mb-0.5">{label}</p>
    <div className="text-content break-words">{children}</div>
  </div>
);

export default function DepositsWithdrawalsPage() {
  const { t } = useTranslation("depositsWithdrawals");
  const navigate = useNavigate();
  const { canEdit, canDelete } = usePagePerms("treasury");
  const [detailTx, setDetailTx] = useState(null);
  const [deleteTx, setDeleteTx] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const typeOptions = TYPE_FILTER_VALUES.map((value) => ({ value, label: t(`filters.types.${value}`) }));
  const datePresets = DATE_PRESET_KEYS.map((key) => ({
    key,
    label: ["last_7_days", "last_30_days"].includes(key)
      ? t(`datePreset.${key}`, { ns: "common" })
      : t(`presets.${key}`),
  }));
  const currencyOptions = CURRENCY_CODES.map((value) => ({ value, label: t(`currencies.${value}`) }));
  const [vaults, setVaults] = useState([]);
  const [vaultsLoading, setVaultsLoading] = useState(false);
  const [typeTab, setTypeTab] = useState("deposit_withdrawal");
  const [selectedVaultFilter, setSelectedVaultFilter] = useState("all");
  const [selectedCurrencyFilter, setSelectedCurrencyFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 1000);
  const [filterPreset, setFilterPreset] = useState("month");
  const [filterStartDate, setFilterStartDate] = useState(() => resolvePresetRange("month").start);
  const [filterEndDate, setFilterEndDate] = useState(() => resolvePresetRange("month").end);
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [paginationMeta, setPaginationMeta] = useState({
    current_page: 1, last_page: 1, per_page: 10, total: 0, from: 0, to: 0,
  });
  const [activeModal, setActiveModal] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const showNotification = (type, message) => {
    (appToast[type] || appToast.info)(message);
  };
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);
  const fetchVaults = useCallback(async () => {
    setVaultsLoading(true);
    try {
      const res = await fetch(apiUrl("/vaults"));
      const json = await res.json();
      if (json.data) setVaults(json.data);
    } catch (err) {
      console.error("Error fetching vaults:", err);
    } finally {
      setVaultsLoading(false);
    }
  }, []);
  const fetchTransactions = useCallback(async (page = 1) => {
    setTxLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", page);
      params.append("per_page", perPage);
      params.append("type", typeTab);
      if (selectedVaultFilter !== "all") params.append("vault_id", selectedVaultFilter);
      if (selectedCurrencyFilter !== "all") params.append("currency", selectedCurrencyFilter);
      if (debouncedSearchTerm.trim()) params.append("search", debouncedSearchTerm.trim());
      if (filterStartDate) {
        params.append("from_date", toEnglishDigits(filterStartDate.format("YYYY/MM/DD")));
      }
      if (filterEndDate) {
        params.append("to_date", toEnglishDigits(filterEndDate.format("YYYY/MM/DD")));
      }
      const res = await fetch(apiUrl(`/vault-transactions?${params.toString()}`));
      const json = await res.json();
      if (json.data) {
        setTransactions(json.data);
        setPaginationMeta({
          current_page: json.current_page || 1,
          last_page:    json.last_page || 1,
          per_page:     json.per_page || perPage,
          total:        json.total || 0,
          from:         json.from || 0,
          to:           json.to || 0,
        });
        setCurrentPage(json.current_page || 1);
      }
    } catch (err) {
      console.error("Error fetching transactions:", err);
    } finally {
      setTxLoading(false);
    }
  }, [typeTab, selectedVaultFilter, selectedCurrencyFilter, debouncedSearchTerm, filterStartDate, filterEndDate, perPage]);
  useEffect(() => { fetchVaults(); }, [fetchVaults]);
  useEffect(() => { fetchTransactions(1); }, [fetchTransactions]);
  const handleTabChange = (tab) => {
    setTypeTab(tab);
    setCurrentPage(1);
  };
  const applyDatePreset = (preset) => {
    setFilterPreset(preset);
    const { start, end } = resolvePresetRange(preset);
    setFilterStartDate(start);
    setFilterEndDate(end);
  };
  const handleConfirmDelete = async () => {
    if (!deleteTx || !canDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(apiUrl(`/vault-transactions/${encodeURIComponent(deleteTx.id)}`), {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || t("messages.deleteFailed"));
      showNotification("success", data.message || t("messages.deleted"));
      setDeleteTx(null);
      fetchVaults();
      fetchTransactions(currentPage);
    } catch (err) {
      showNotification("error", err.message);
    } finally {
      setDeleting(false);
    }
  };
  const renderActionButtons = (tx) => (
    <div className="inline-flex items-center justify-center gap-1.5">
      <TooltipButton
        tooltip={t("actions.details")}
        onClick={() => setDetailTx(tx)}
        colorClass="p-1.5 bg-surface text-content-subtle border border-line-strong shadow-2xs hover:bg-accent-subtle hover:text-accent hover:border-accent-line transition-colors"
      >
        <Info size={15} />
      </TooltipButton>
      {canEdit && (
        <TooltipButton
          tooltip={t("actions.edit")}
          onClick={() => navigate(`/deposits-withdrawals/${tx.id}/edit`, { state: { tx } })}
          colorClass="p-1.5 bg-surface text-content-subtle border border-line-strong shadow-2xs hover:bg-notice-soft hover:text-notice-text hover:border-notice-line transition-colors"
        >
          <Pencil size={15} />
        </TooltipButton>
      )}
      {canDelete && (
        <TooltipButton
          tooltip={t("actions.delete")}
          onClick={() => setDeleteTx(tx)}
          colorClass="p-1.5 bg-surface text-content-subtle border border-line-strong shadow-2xs hover:bg-danger-soft hover:text-danger-text hover:border-danger-line transition-colors"
        >
          <Trash2 size={15} />
        </TooltipButton>
      )}
    </div>
  );
  const openModal = (type) => {
    setActiveModal(type);
  };
  const handleModalSubmit = async (payload) => {
    setModalSubmitting(true);
    try {
      const endpoint = payload.type === "deposit"
        ? apiUrl("/vaults/deposit")
        : apiUrl("/vaults/withdraw");
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.message || t("messages.submitFailed"));
      showNotification("success", resData.message || t("messages.submitSuccess"));
      setActiveModal(null);
      fetchVaults();
      fetchTransactions(currentPage);
    } catch (err) {
      showNotification("error", err.message);
    } finally {
      setModalSubmitting(false);
    }
  };
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
          <Link
            to="/deposits-withdrawals/create?type=deposit"
            className="px-4 py-2 text-btn-text font-bold text-content-inverse bg-positive hover:bg-positive-strong rounded-btn transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <span>{t("actions.createDeposit")}</span>
          </Link>
          <Link
            to="/deposits-withdrawals/create?type=withdraw"
            className="px-4 py-2 text-btn-text font-bold text-content-inverse bg-danger-text hover:bg-danger-text/90 rounded-btn transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <span>{t("actions.createWithdraw")}</span>
          </Link>
          <button
            type="button"
            onClick={() => setShowReportModal(true)}
            className="px-3.5 py-2 text-btn-text font-bold text-content-body bg-surface hover:bg-surface-muted border border-line-strong rounded-btn transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
          >
            <Printer size={15} />
            <span>{t("actions.printReport")}</span>
          </button>
        </div>
      </div>
      <div className="bg-surface rounded-table border border-line shadow-2xs overflow-hidden">
        <div className="border-b border-line bg-surface">
          <div className="p-3.5 border-b border-line flex flex-wrap items-center gap-2">
            <span className="text-label-text text-content-body whitespace-nowrap">{t("filters.rangeLabel")}</span>
            <FilterPresetButtons
              presets={datePresets}
              activeKey={filterPreset}
              onChange={applyDatePreset}
              buttonClassName="px-3 py-1.5 rounded-btn text-xs"
            />
            <div className="flex items-center gap-2">
              <span className="text-label-text text-content-body">{t("filters.dateFrom")}</span>
              <DatePicker
                value={filterStartDate}
                onChange={(d) => { setFilterPreset("custom"); setFilterStartDate(d); }}
                calendar={persian}
                locale={persian_af}
                format="YYYY/MM/DD"
                portal
                inputClass="w-28 h-8 font-mono text-center bg-surface border border-line-strong rounded-input px-2 text-xs outline-none focus:border-accent"
              />
              <span className="text-label-text text-content-body">{t("filters.dateTo")}</span>
              <DatePicker
                value={filterEndDate}
                onChange={(d) => { setFilterPreset("custom"); setFilterEndDate(d); }}
                calendar={persian}
                locale={persian_af}
                format="YYYY/MM/DD"
                portal
                inputClass="w-28 h-8 font-mono text-center bg-surface border border-line-strong rounded-input px-2 text-xs outline-none focus:border-accent"
              />
            </div>
          </div>
          <div className="p-3.5 bg-surface-muted flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-content-faint" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t("filters.searchPlaceholder")}
                className="w-full h-10 pl-3 pr-9 bg-surface border border-line-strong rounded-input text-xs outline-none focus:border-accent placeholder-content-faint"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-content-faint hover:text-content-muted cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="flex items-center flex-wrap gap-2.5">
              <CustomDropdown
                value={typeTab}
                onChange={handleTabChange}
                options={typeOptions}
                buttonClassName={`${FILTER_CONTROL} min-w-[180px]`}
                width="w-56"
                usePortal
              />
              <div className="w-52">
                <SearchableSelect
                  value={selectedVaultFilter}
                  onChange={(val) => {
                    setSelectedVaultFilter(val);
                    setCurrentPage(1);
                  }}
                  options={[
                    { value: "all", label: t("filters.allVaults") },
                    ...vaults.map((v) => ({
                      value: String(v.id),
                      label: `${v.name} (${v.currency})`,
                    })),
                  ]}
                  placeholder={t("filters.allVaults")}
                  usePortal
                />
              </div>
              <CustomDropdown
                value={selectedCurrencyFilter}
                onChange={(val) => {
                  setSelectedCurrencyFilter(val);
                  setCurrentPage(1);
                }}
                options={[
                  { value: "all", label: t("filters.allCurrencies") },
                  ...currencyOptions,
                ]}
                buttonClassName={`${FILTER_CONTROL} min-w-[110px]`}
                width="w-36"
                usePortal
              />
              <TooltipButton
                icon={<RefreshCw size={14} className={txLoading ? "animate-spin" : ""} />}
                tooltip={t("actions.refresh")}
                onClick={() => fetchTransactions(currentPage)}
                colorClass="h-10 w-10 flex items-center justify-center bg-surface border border-line-strong text-content-body hover:bg-surface-subtle transition-colors"
              />
            </div>
          </div>
        </div>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-right border-collapse text-table-cell-text text-content">
            <thead>
              <tr className="bg-surface-muted border-b border-line">
                <th className="px-3 py-2.5 text-center w-12 whitespace-nowrap border-l border-line text-table-header-text font-bold text-content-body">{t("table.columns.index")}</th>
                <th className={TABLE_HEADER_CELL}>{t("table.columns.docNumber")}</th>
                <th className={TABLE_HEADER_CELL}>{t("table.columns.date")}</th>
                <th className={TABLE_HEADER_CELL}>{t("table.columns.type")}</th>
                <th className={TABLE_HEADER_CELL}>{t("table.columns.vault")}</th>
                <th className={TABLE_HEADER_CELL}>{t("table.columns.party")}</th>
                <th className="px-3 py-2.5 w-full border-l border-line text-table-header-text font-bold text-content-body">{t("table.columns.description")}</th>
                <th className={`${TABLE_HEADER_CELL} text-center`}>{t("table.columns.amount")}</th>
                <th className={`${TABLE_HEADER_CELL} text-center`}>{t("table.columns.balance")}</th>
                <th className={TABLE_HEADER_CELL}>{t("label.createdBy")}</th>
                <th className="px-3 py-2.5 text-center w-36 whitespace-nowrap text-table-header-text font-bold text-content-body">{t("table.columns.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft bg-surface">
              {txLoading ? (
                <tr>
                  <td colSpan={11} className="p-12 text-center text-content-subtle text-body-text">
                    {t("status.loading")}
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-12 text-center text-content-subtle text-body-text">
                    {t("status.empty")}
                  </td>
                </tr>
              ) : (
                transactions.map((tx, idx) => {
                  const isDeposit = tx.transaction_type === "deposit";
                  return (
                    <tr key={tx.id} className="hover:bg-surface-muted/70 transition-colors">
                      <td className={`${TABLE_CELL} text-center font-mono text-content-subtle`}>
                        {(paginationMeta.current_page - 1) * (paginationMeta.per_page || 10) + idx + 1}
                      </td>
                      <td className={`${TABLE_CELL} font-mono font-bold text-content`} dir="ltr">
                        {formatDocNumber(tx.receipt_number, tx.id)}
                      </td>
                      <td className={`${TABLE_CELL} font-mono text-content-muted`} dir="ltr">
                        {toEnglishDigits(tx.shamsi_date) || t("emptyValue")}
                      </td>
                      <td className={TABLE_CELL}>
                        {isDeposit ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-badge bg-positive-soft text-positive-text border border-positive-line font-bold text-xs">
                            {t("form.depositType")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-badge bg-danger-soft text-danger-text border border-danger-line font-bold text-xs">
                            {t("form.withdrawType")}
                          </span>
                        )}
                      </td>
                      <td className={`${TABLE_CELL} font-bold text-content-strong`}>
                        {tx.vault?.name || t("emptyValue")}
                      </td>
                      <td className={`${TABLE_CELL} text-content`}>
                        {isDeposit ? tx.paid_by || t("emptyValue") : tx.received_by || t("emptyValue")}
                      </td>
                      <td className="px-3 py-2.5 border-l border-line min-w-[220px] text-content-muted whitespace-normal break-words">
                        {tx.notes || t("emptyValue")}
                      </td>
                      <td
                        className={`${TABLE_CELL} text-center font-mono font-bold ${
                          isDeposit ? "text-positive-strong" : "text-danger-text"
                        }`}
                        dir="ltr"
                      >
                        {Number(tx.amount || 0).toLocaleString("en-US")} {tx.currency}
                      </td>
                      <td className={`${TABLE_CELL} text-center font-mono text-content`} dir="ltr">
                        {Number(tx.balance_after || 0).toLocaleString("en-US")} {tx.currency}
                      </td>
                      <td className={`${TABLE_CELL} text-content-body`}>{tx.created_by || t("emptyValue")}</td>
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">{renderActionButtons(tx)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="md:hidden divide-y divide-line-soft bg-surface">
          {txLoading || transactions.length === 0 ? (
            <p className="p-8 text-center text-content-subtle text-body-text">
              {txLoading ? t("status.loading") : t("status.empty")}
            </p>
          ) : (
            transactions.map((tx) => {
              const isDeposit = tx.transaction_type === "deposit";
              return (
                <div key={tx.id} className="p-3 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-content" dir="ltr">
                      {formatDocNumber(tx.receipt_number, tx.id)}
                    </span>
                    {isDeposit ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-badge bg-positive-soft text-positive-text border border-positive-line font-bold text-xs">
                        {t("form.depositType")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-badge bg-danger-soft text-danger-text border border-danger-line font-bold text-xs">
                        {t("form.withdrawType")}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-table-cell-text">
                    <MobileField label={t("table.columns.date")}>
                      <span className="font-mono text-content-muted" dir="ltr">
                        {toEnglishDigits(tx.shamsi_date) || t("emptyValue")}
                      </span>
                    </MobileField>
                    <MobileField label={t("table.columns.vault")}>
                      <span className="font-bold text-content-strong">
                        {tx.vault?.name || t("emptyValue")}
                      </span>
                    </MobileField>
                    <MobileField label={t("table.columns.party")}>
                      {isDeposit ? tx.paid_by || t("emptyValue") : tx.received_by || t("emptyValue")}
                    </MobileField>
                    <MobileField label={t("table.columns.amount")}>
                      <span
                        className={`font-mono font-bold ${isDeposit ? "text-positive-strong" : "text-danger-text"}`}
                        dir="ltr"
                      >
                        {Number(tx.amount || 0).toLocaleString("en-US")} {tx.currency}
                      </span>
                    </MobileField>
                    <MobileField label={t("table.columns.balance")}>
                      <span className="font-mono text-content" dir="ltr">
                        {Number(tx.balance_after || 0).toLocaleString("en-US")} {tx.currency}
                      </span>
                    </MobileField>
                    <MobileField label={t("table.columns.description")}>
                      <span className="whitespace-normal break-words">
                        {tx.notes || t("emptyValue")}
                      </span>
                    </MobileField>
                    <MobileField label={t("label.createdBy")}>
                      {tx.created_by || t("emptyValue")}
                    </MobileField>
                  </div>
                  <div className="flex justify-end">{renderActionButtons(tx)}</div>
                </div>
              );
            })
          )}
        </div>
        <TablePagination
          currentPage={paginationMeta.current_page}
          lastPage={paginationMeta.last_page}
          total={paginationMeta.total}
          perPage={paginationMeta.per_page || 10}
          onPageChange={(page) => fetchTransactions(page)}
          onPerPageChange={(newPerPage) => {
            setPerPage(newPerPage);
            setCurrentPage(1);
          }}
        />
      </div>
      <TransactionReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        vaults={vaults}
        namespace="depositsWithdrawals"
      />
      <TxDetailModal
        tx={detailTx}
        onClose={() => setDetailTx(null)}
        namespace="depositsWithdrawals"
      />
      <DeleteConfirmationModal
        isOpen={Boolean(deleteTx)}
        onClose={() => setDeleteTx(null)}
        onConfirm={handleConfirmDelete}
        title={t("delete.title")}
        question={t("delete.question")}
        warning={t("delete.warning")}
        itemName={deleteTx ? t("delete.itemName", { number: formatDocNumber(deleteTx.receipt_number, deleteTx.id) }) : ""}
        loading={deleting}
        namespace="depositsWithdrawals"
      />
      <DepositWithdrawModal
        isOpen={["deposit", "withdraw"].includes(activeModal)}
        initialType={activeModal || "deposit"}
        onClose={() => setActiveModal(null)}
        onSubmit={handleModalSubmit}
        submitting={modalSubmitting}
        vaults={vaults}
      />
    </div>
  );
}
