import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Info, Pencil, Trash2, Search, RefreshCw, X } from "lucide-react";
import DatePicker from "react-multi-date-picker";
import { showToast as appToast } from "../utils/toast";
import { DateObject, persian, persian_af } from "../utils/dateHelpers";
import { toEnglishDigits } from "../utils/dariNumberFormatter";
import { formatTransactionDocNumber } from "../components/treasury/treasuryHelpers";
import { apiUrl } from "../api";
import useDebounce from "../hooks/useDebounce";
import TransferDetailModal from "../components/transfers/TransferDetailModal";
import {
  TooltipButton,
  TablePagination,
  CustomDropdown,
  SearchableSelect,
  FilterPresetButtons,
  DeleteConfirmationModal,
  usePagePerms,
} from "../components/common";

const PRESET_KEYS = ["today", "week", "month", "year", "all"];
const CURRENCY_CODES = ["AFN", "USD", "IRR"];
const FILTER_CONTROL = "h-10 px-3 text-xs font-medium text-content-body bg-surface rounded-input";
const TABLE_HEADER_CELL = "px-3 py-2.5 border-l border-line whitespace-nowrap text-table-header-text font-bold text-content-body";
const TABLE_CELL = "px-3 py-2.5 border-l border-line whitespace-nowrap";
const ACTION_BUTTON = "p-1.5 bg-surface text-content-subtle border border-line-strong shadow-2xs transition-colors";

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

export default function TransfersPage() {
  const { t } = useTranslation("transfers");
  const navigate = useNavigate();
  const { canCreate, canEdit, canDelete } = usePagePerms("treasury");

  const [vaults, setVaults] = useState([]);
  const [fromVaultFilter, setFromVaultFilter] = useState("all");
  const [toVaultFilter, setToVaultFilter] = useState("all");
  const [currencyFilter, setCurrencyFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 1000);
  const [filterPreset, setFilterPreset] = useState("month");
  const [filterStartDate, setFilterStartDate] = useState(() => resolvePresetRange("month").start);
  const [filterEndDate, setFilterEndDate] = useState(() => resolvePresetRange("month").end);

  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [perPage, setPerPage] = useState(10);
  const [paginationMeta, setPaginationMeta] = useState({
    current_page: 1, last_page: 1, per_page: 10, total: 0, from: 0, to: 0,
  });

  const [detailRow, setDetailRow] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const showNotification = (type, message) => {
    (appToast[type] || appToast.info)(message);
  };

  const presets = useMemo(
    () => PRESET_KEYS.map((key) => ({ key, label: t(`presets.${key}`) })),
    [t]
  );
  const currencyOptions = useMemo(
    () => [
      { value: "all", label: t("filters.allCurrencies") },
      ...CURRENCY_CODES.map((value) => ({ value, label: t(`currencies.${value}`) })),
    ],
    [t]
  );
  const vaultOptions = useMemo(
    () => [
      { value: "all", label: t("filters.allVaults") },
      ...vaults.map((v) => ({ value: String(v.id), label: `${v.name} (${v.currency})` })),
    ],
    [vaults, t]
  );

  const fetchVaults = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/vaults"));
      const json = await res.json();
      if (json.data) setVaults(json.data);
    } catch (err) {
      console.error("Error fetching vaults:", err);
    }
  }, []);

  const fetchTransfers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", page);
      params.append("per_page", perPage);
      if (fromVaultFilter !== "all") params.append("vault_id", fromVaultFilter);
      if (toVaultFilter !== "all") params.append("to_vault_id", toVaultFilter);
      if (currencyFilter !== "all") params.append("currency", currencyFilter);
      if (debouncedSearchTerm.trim()) params.append("search", debouncedSearchTerm.trim());
      if (filterStartDate) params.append("from_date", toEnglishDigits(filterStartDate.format("YYYY/MM/DD")));
      if (filterEndDate) params.append("to_date", toEnglishDigits(filterEndDate.format("YYYY/MM/DD")));

      const res = await fetch(apiUrl(`/transfers?${params.toString()}`));
      const json = await res.json();
      if (json.data) {
        setTransfers(json.data);
        setPaginationMeta({
          current_page: json.current_page || 1,
          last_page: json.last_page || 1,
          per_page: json.per_page || perPage,
          total: json.total || 0,
          from: json.from || 0,
          to: json.to || 0,
        });
      }
    } catch (err) {
      console.error("Error fetching transfers:", err);
    } finally {
      setLoading(false);
    }
  }, [fromVaultFilter, toVaultFilter, currencyFilter, debouncedSearchTerm, filterStartDate, filterEndDate, perPage]);

  useEffect(() => { fetchVaults(); }, [fetchVaults]);
  useEffect(() => { fetchTransfers(1); }, [fetchTransfers]);

  const applyDatePreset = (preset) => {
    setFilterPreset(preset);
    const { start, end } = resolvePresetRange(preset);
    setFilterStartDate(start);
    setFilterEndDate(end);
  };

  const handleConfirmDelete = async () => {
    if (!deleteRow || !canDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(apiUrl(`/transfers/${deleteRow.id}`), {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || t("messages.deleteFailed"));
      showNotification("success", data.message || t("messages.deleted"));
      setDeleteRow(null);
      fetchTransfers(paginationMeta.current_page);
    } catch (err) {
      showNotification("error", err.message);
    } finally {
      setDeleting(false);
    }
  };

  const renderActionButtons = (row) => (
    <div className="inline-flex items-center justify-center gap-1.5">
      <TooltipButton
        tooltip={t("actions.details")}
        onClick={() => setDetailRow(row)}
        colorClass={`${ACTION_BUTTON} hover:bg-accent-subtle hover:text-accent hover:border-accent-line`}
      >
        <Info size={15} />
      </TooltipButton>
      {canEdit && (
        <TooltipButton
          tooltip={t("actions.edit")}
          onClick={() => navigate(`/transfers/${row.id}/edit`)}
          colorClass={`${ACTION_BUTTON} hover:bg-notice-soft hover:text-notice-text hover:border-notice-line`}
        >
          <Pencil size={15} />
        </TooltipButton>
      )}
      {canDelete && (
        <TooltipButton
          tooltip={t("actions.delete")}
          onClick={() => setDeleteRow(row)}
          colorClass={`${ACTION_BUTTON} hover:bg-danger-soft hover:text-danger-text hover:border-danger-line`}
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
          <h1 className="text-xl font-bold text-content tracking-tight">{t("page.title")}</h1>
          <p className="text-xs text-content-subtle font-medium mt-1">{t("page.subtitle")}</p>
        </div>
        {canCreate && (
          <Link
            to="/transfers/create"
            className="px-4 py-2 text-btn-text font-bold text-content-inverse bg-accent hover:bg-accent-hover rounded-btn transition-colors shadow-xs cursor-pointer"
          >
            {t("actions.create")}
          </Link>
        )}
      </div>

      <div className="bg-surface rounded-table border border-line shadow-2xs overflow-hidden">
        <div className="border-b border-line bg-surface">
          <div className="p-3.5 border-b border-line flex flex-wrap items-center gap-2">
            <span className="text-label-text text-content-body whitespace-nowrap">{t("filters.rangeLabel")}</span>
            <FilterPresetButtons
              presets={presets}
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
              <div className="w-full md:w-52">
                <SearchableSelect
                  value={fromVaultFilter}
                  onChange={(val) => setFromVaultFilter(val)}
                  options={vaultOptions}
                  placeholder={t("filters.fromVault")}
                  usePortal
                />
              </div>
              <div className="w-full md:w-52">
                <SearchableSelect
                  value={toVaultFilter}
                  onChange={(val) => setToVaultFilter(val)}
                  options={vaultOptions}
                  placeholder={t("filters.toVault")}
                  usePortal
                />
              </div>
              <CustomDropdown
                value={currencyFilter}
                onChange={(val) => setCurrencyFilter(val)}
                options={currencyOptions}
                buttonClassName={`${FILTER_CONTROL} min-w-[110px]`}
                width="w-36"
                usePortal
              />
              <TooltipButton
                icon={<RefreshCw size={14} className={loading ? "animate-spin" : ""} />}
                tooltip={t("actions.refresh")}
                onClick={() => fetchTransfers(paginationMeta.current_page)}
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
                <th className={TABLE_HEADER_CELL}>{t("table.columns.from")}</th>
                <th className={TABLE_HEADER_CELL}>{t("table.columns.to")}</th>
                <th className={`${TABLE_HEADER_CELL} text-center`}>{t("table.columns.amount")}</th>
                <th className="px-3 py-2.5 w-full border-l border-line text-table-header-text font-bold text-content-body">{t("table.columns.notes")}</th>
                <th className={TABLE_HEADER_CELL}>{t("table.columns.createdBy")}</th>
                <th className="px-3 py-2.5 text-center w-36 whitespace-nowrap text-table-header-text font-bold text-content-body">{t("table.columns.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft bg-surface">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-content-subtle text-body-text">{t("status.loading")}</td>
                </tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-content-subtle text-body-text">{t("status.empty")}</td>
                </tr>
              ) : (
                transfers.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-surface-muted/70 transition-colors">
                    <td className={`${TABLE_CELL} text-center font-mono text-content-subtle`}>
                      {(paginationMeta.current_page - 1) * (paginationMeta.per_page || 10) + idx + 1}
                    </td>
                    <td className={`${TABLE_CELL} font-mono font-bold text-content`} dir="ltr">
                      {formatTransactionDocNumber(row.receipt_number, row.id)}
                    </td>
                    <td className={`${TABLE_CELL} font-mono text-content-muted`} dir="ltr">
                      {toEnglishDigits(row.shamsi_date) || t("emptyValue")}
                    </td>
                    <td className={`${TABLE_CELL} font-bold text-content-strong`}>{row.from_vault?.name || t("emptyValue")}</td>
                    <td className={`${TABLE_CELL} font-bold text-content-strong`}>{row.to_vault?.name || t("emptyValue")}</td>
                    <td className={`${TABLE_CELL} text-center font-mono font-bold text-content`} dir="ltr">
                      {Number(row.amount || 0).toLocaleString("en-US")} {row.currency}
                    </td>
                    <td className="px-3 py-2.5 border-l border-line text-content-muted whitespace-normal break-words min-w-[220px]">
                      {row.notes || t("emptyValue")}
                    </td>
                    <td className={`${TABLE_CELL} text-content`}>{row.created_by || t("emptyValue")}</td>
                    <td className="px-3 py-2.5 text-center whitespace-nowrap">{renderActionButtons(row)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-line-soft bg-surface">
          {loading || transfers.length === 0 ? (
            <p className="p-8 text-center text-content-subtle text-body-text">
              {loading ? t("status.loading") : t("status.empty")}
            </p>
          ) : (
            transfers.map((row) => (
              <div key={row.id} className="p-3 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-content" dir="ltr">{formatTransactionDocNumber(row.receipt_number, row.id)}</span>
                  <span className="font-mono font-bold text-content" dir="ltr">{Number(row.amount || 0).toLocaleString("en-US")} {row.currency}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-table-cell-text">
                  <MobileField label={t("table.columns.from")}>{row.from_vault?.name || t("emptyValue")}</MobileField>
                  <MobileField label={t("table.columns.to")}>{row.to_vault?.name || t("emptyValue")}</MobileField>
                  <MobileField label={t("table.columns.date")}>
                    <span className="font-mono text-content-muted" dir="ltr">{toEnglishDigits(row.shamsi_date) || t("emptyValue")}</span>
                  </MobileField>
                  <MobileField label={t("table.columns.createdBy")}>{row.created_by || t("emptyValue")}</MobileField>
                  <div className="col-span-2">
                    <MobileField label={t("table.columns.notes")}>
                      <span className="whitespace-normal break-words">{row.notes || t("emptyValue")}</span>
                    </MobileField>
                  </div>
                </div>
                <div className="flex justify-end">{renderActionButtons(row)}</div>
              </div>
            ))
          )}
        </div>

        <TablePagination
          currentPage={paginationMeta.current_page}
          lastPage={paginationMeta.last_page}
          total={paginationMeta.total}
          perPage={paginationMeta.per_page || 10}
          onPageChange={(page) => fetchTransfers(page)}
          onPerPageChange={(newPerPage) => {
            setPerPage(newPerPage);
          }}
        />
      </div>

      <TransferDetailModal transfer={detailRow} onClose={() => setDetailRow(null)} />
      <DeleteConfirmationModal
        isOpen={Boolean(deleteRow)}
        onClose={() => setDeleteRow(null)}
        onConfirm={handleConfirmDelete}
        title={t("delete.title")}
        question={t("delete.question")}
        warning={t("delete.warning")}
        itemName={deleteRow ? t("delete.itemName", { number: formatTransactionDocNumber(deleteRow.receipt_number, deleteRow.id) }) : ""}
        loading={deleting}
        namespace="transfers"
      />
    </div>
  );
}
