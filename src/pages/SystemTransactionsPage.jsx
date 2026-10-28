import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Info, RefreshCw, Search, X } from "lucide-react";
import DatePicker from "react-multi-date-picker";
import { apiFetch } from "../api";
import { persian, persian_af, formatAfghanDateTime, formatToGregorian } from "../utils/dateHelpers";
import useDatePresets from "../hooks/useDatePresets";
import useDebounce from "../hooks/useDebounce";
import useAbortController, { isAbortError } from "../hooks/useAbortController";
import { FilterPresetButtons, SearchableSelect, TooltipButton } from "../components/common";
import ActivityLogDetailModal, { ActivityStatusBadge } from "../components/system/ActivityLogDetailModal";
import ActivityLogPager from "../components/system/ActivityLogPager";
import { DEFAULT_PER_PAGE, eventToneClass, formatAmount } from "../constants/activityLogDomain";

const TABLE_HEADER_CELL = "px-3 py-2.5 border-l border-line whitespace-nowrap text-table-header-text font-bold text-content-body";
const TABLE_CELL = "px-3 py-2.5 border-l border-line align-top";
const BADGE = "inline-flex items-center px-2 py-0.5 rounded-badge border text-caption-text font-bold whitespace-nowrap";
const DATE_INPUT = "w-28 h-8 font-mono text-center bg-surface border border-line-strong rounded-input px-2 text-xs outline-none focus:border-accent";
const ALL = "all";

const MobileField = ({ label, children }) => (
  <div className="min-w-0">
    <p className="text-caption-text text-content-subtle mb-0.5">{label}</p>
    <div className="text-content break-words">{children}</div>
  </div>
);

export default function SystemTransactionsPage() {
  const { t } = useTranslation("systemTransactions");
  const nextSignal = useAbortController();

  const { activePreset, setActivePreset, applyPreset, presets, fromDate, setFromDate, toDate, setToDate } =
    useDatePresets("this_week");

  const [filters, setFilters] = useState({ user: ALL, module: ALL, event: ALL, status: ALL });
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [options, setOptions] = useState({ users: [], modules: [], events: [], statuses: [] });

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [rows, setRows] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const dateFrom = fromDate ? formatToGregorian(fromDate) : "";
  const dateTo = toDate ? formatToGregorian(toDate) : "";

  useEffect(() => {
    apiFetch("/activity-logs/filter-options")
      .then((body) => setOptions(body.data))
      .catch(() => {
        /* the filters simply stay empty; the list itself reports its own errors */
      });
  }, []);

  const loadRows = useCallback(async () => {
    const signal = nextSignal();
    setLoading(true);
    setFailed(false);

    const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    if (filters.user !== ALL) params.set("user_id", filters.user);
    if (filters.module !== ALL) params.set("module", filters.module);
    if (filters.event !== ALL) params.set("event", filters.event);
    if (filters.status !== ALL) params.set("status", filters.status);
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());

    try {
      const body = await apiFetch(`/activity-logs?${params.toString()}`, { signal });
      setRows(body.data || []);
      setHasMore(Boolean(body.meta?.has_more));
    } catch (err) {
      if (isAbortError(err)) return;
      setRows([]);
      setHasMore(false);
      setFailed(true);
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [nextSignal, page, perPage, dateFrom, dateTo, filters, debouncedSearch]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const withOptionAll = (allLabel, list) => [{ value: ALL, label: allLabel }, ...list.map((o) => ({ ...o, value: String(o.value) }))];
  const userOptions = useMemo(() => withOptionAll(t("filters.user"), options.users), [options.users, t]);
  const moduleOptions = useMemo(() => withOptionAll(t("filters.module"), options.modules), [options.modules, t]);
  const eventOptions = useMemo(() => withOptionAll(t("filters.event"), options.events), [options.events, t]);
  const statusOptions = useMemo(() => withOptionAll(t("filters.status"), options.statuses), [options.statuses, t]);

  const setFilter = (key) => (value) => {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  };
  const changeDate = (setter) => (date) => {
    setPage(1);
    setActivePreset("custom");
    setter(date);
  };
  const changePreset = (key) => {
    setPage(1);
    applyPreset(key);
  };
  const changeSearch = (value) => {
    setPage(1);
    setSearchTerm(value);
  };
  const resetFilters = () => {
    setPage(1);
    setFilters({ user: ALL, module: ALL, event: ALL, status: ALL });
    setSearchTerm("");
    applyPreset("this_week");
  };

  const hasActiveFilters =
    Object.values(filters).some((value) => value !== ALL) || searchTerm !== "" || activePreset !== "this_week";
  const empty = t("emptyValue");
  const firstIndex = (page - 1) * perPage;

  const eventCell = (row) => (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span className={`${BADGE} ${eventToneClass(row.event)}`}>{row.event_label}</span>
      <ActivityStatusBadge status={row.status} t={t} />
    </span>
  );

  const detailsButton = (row) => (
    <TooltipButton
      tooltip={t("actions.details")}
      onClick={() => setSelectedId(row.id)}
      colorClass="p-1.5 bg-surface text-content-subtle border border-line-strong shadow-2xs transition-colors hover:bg-accent-subtle hover:text-accent hover:border-accent-line"
    >
      <Info size={15} />
    </TooltipButton>
  );

  return (
    <div className="w-full space-y-4 font-sans" dir="rtl">
      <div className="border-b border-line pb-4">
        <h1 className="text-xl font-bold text-content tracking-tight">{t("page.title")}</h1>
        <p className="text-xs text-content-subtle font-medium mt-1">{t("page.subtitle")}</p>
      </div>

      <div className="bg-surface rounded-table border border-line shadow-2xs overflow-hidden">
        <div className="border-b border-line bg-surface">
          <div className="p-3.5 border-b border-line flex flex-wrap items-center gap-2">
            <span className="text-label-text text-content-body whitespace-nowrap">{t("filters.rangeLabel")}</span>
            <FilterPresetButtons
              presets={presets}
              activeKey={activePreset}
              onChange={changePreset}
              buttonClassName="px-3 py-1.5 rounded-btn text-xs"
            />
            <div className="flex items-center gap-2">
              <span className="text-label-text text-content-body">{t("filters.dateFrom")}</span>
              <DatePicker
                value={fromDate}
                onChange={changeDate(setFromDate)}
                calendar={persian}
                locale={persian_af}
                format="YYYY/MM/DD"
                portal
                inputClass={DATE_INPUT}
              />
              <span className="text-label-text text-content-body">{t("filters.dateTo")}</span>
              <DatePicker
                value={toDate}
                onChange={changeDate(setToDate)}
                calendar={persian}
                locale={persian_af}
                format="YYYY/MM/DD"
                portal
                inputClass={DATE_INPUT}
              />
            </div>
          </div>

          <div className="p-3.5 bg-surface-muted flex flex-col gap-3">
            <div className="relative max-w-md w-full">
              <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-content-faint" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => changeSearch(event.target.value)}
                placeholder={t("filters.searchPlaceholder")}
                className="w-full h-10 pl-3 pr-9 bg-surface border border-line-strong rounded-input text-xs outline-none focus:border-accent placeholder-content-faint"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => changeSearch("")}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-content-faint hover:text-content-muted cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex items-center flex-wrap gap-2.5">
              <div className="w-full md:w-48">
                <SearchableSelect value={filters.user} onChange={setFilter("user")} options={userOptions} placeholder={t("filters.user")} usePortal />
              </div>
              <div className="w-full md:w-48">
                <SearchableSelect value={filters.module} onChange={setFilter("module")} options={moduleOptions} placeholder={t("filters.module")} usePortal />
              </div>
              <div className="w-full md:w-48">
                <SearchableSelect value={filters.event} onChange={setFilter("event")} options={eventOptions} placeholder={t("filters.event")} usePortal />
              </div>
              <div className="w-full md:w-40">
                <SearchableSelect value={filters.status} onChange={setFilter("status")} options={statusOptions} placeholder={t("filters.status")} usePortal />
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="h-10 px-3 text-xs font-bold text-content-body bg-surface border border-line-strong rounded-btn hover:bg-surface-subtle cursor-pointer"
                >
                  {t("actions.clearFilters")}
                </button>
              )}
              <TooltipButton
                icon={<RefreshCw size={14} className={loading ? "animate-spin" : ""} />}
                tooltip={t("actions.refresh")}
                onClick={loadRows}
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
                <th className={TABLE_HEADER_CELL}>{t("table.columns.time")}</th>
                <th className={TABLE_HEADER_CELL}>{t("table.columns.user")}</th>
                <th className={TABLE_HEADER_CELL}>{t("table.columns.module")}</th>
                <th className={TABLE_HEADER_CELL}>{t("table.columns.event")}</th>
                <th className="px-3 py-2.5 w-full border-l border-line text-table-header-text font-bold text-content-body">{t("table.columns.description")}</th>
                <th className={`${TABLE_HEADER_CELL} text-center`}>{t("table.columns.amount")}</th>
                <th className={TABLE_HEADER_CELL}>{t("table.columns.branch")}</th>
                <th className={TABLE_HEADER_CELL}>{t("table.columns.ip")}</th>
                <th className="px-3 py-2.5 text-center w-20 whitespace-nowrap text-table-header-text font-bold text-content-body">{t("table.columns.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft bg-surface">
              {loading || failed || rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className={`p-12 text-center text-body-text ${failed ? "text-danger-text" : "text-content-subtle"}`}>
                    {loading ? t("status.loading") : failed ? t("status.loadFailed") : t("status.empty")}
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr key={row.id} className="hover:bg-surface-muted/70 transition-colors">
                    <td className={`${TABLE_CELL} text-center font-mono text-content-subtle`}>{firstIndex + index + 1}</td>
                    <td className={`${TABLE_CELL} font-mono text-content-muted whitespace-nowrap`} dir="ltr">
                      {formatAfghanDateTime(row.occurred_at)}
                    </td>
                    <td className={`${TABLE_CELL} whitespace-nowrap`}>
                      <div className="font-bold text-content-strong">{row.user_name || empty}</div>
                      {row.user_role && <div className="text-caption-text text-content-subtle">{row.user_role}</div>}
                    </td>
                    <td className={`${TABLE_CELL} whitespace-nowrap text-content-body`}>{row.module_label}</td>
                    <td className={TABLE_CELL}>{eventCell(row)}</td>
                    <td className={`${TABLE_CELL} text-content`}>
                      <span className="whitespace-normal break-words">{row.description}</span>
                    </td>
                    <td className={`${TABLE_CELL} text-center font-mono font-bold whitespace-nowrap`} dir="ltr">
                      {formatAmount(row.amount, row.currency) || <span className="text-content-faint">{empty}</span>}
                    </td>
                    <td className={`${TABLE_CELL} whitespace-nowrap text-content-body`}>{row.branch_name || empty}</td>
                    <td className={`${TABLE_CELL} font-mono text-caption-text text-content-subtle whitespace-nowrap`} dir="ltr">
                      {row.ip_address || empty}
                    </td>
                    <td className="px-3 py-2.5 text-center align-top">{detailsButton(row)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-line-soft bg-surface">
          {loading || failed || rows.length === 0 ? (
            <p className={`p-8 text-center text-body-text ${failed ? "text-danger-text" : "text-content-subtle"}`}>
              {loading ? t("status.loading") : failed ? t("status.loadFailed") : t("status.empty")}
            </p>
          ) : (
            rows.map((row) => (
              <div key={row.id} className="p-3 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  {eventCell(row)}
                  <span className="font-mono text-caption-text text-content-muted" dir="ltr">
                    {formatAfghanDateTime(row.occurred_at)}
                  </span>
                </div>
                <p className="text-table-cell-text text-content whitespace-normal break-words">{row.description}</p>
                <div className="grid grid-cols-2 gap-3 text-table-cell-text">
                  <MobileField label={t("table.columns.user")}>{row.user_name || empty}</MobileField>
                  <MobileField label={t("table.columns.module")}>{row.module_label}</MobileField>
                  <MobileField label={t("table.columns.amount")}>
                    <span className="font-mono" dir="ltr">{formatAmount(row.amount, row.currency) || empty}</span>
                  </MobileField>
                  <MobileField label={t("table.columns.branch")}>{row.branch_name || empty}</MobileField>
                </div>
                <div className="flex justify-end">{detailsButton(row)}</div>
              </div>
            ))
          )}
        </div>

        <ActivityLogPager
          page={page}
          hasMore={hasMore}
          perPage={perPage}
          disabled={loading}
          onPageChange={setPage}
          onPerPageChange={(value) => {
            setPage(1);
            setPerPage(value);
          }}
        />
      </div>

      <ActivityLogDetailModal logId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
