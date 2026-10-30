import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { TEXT_FIELD_MAX_LENGTH } from "../../constants/treasuryDomain";
import DatePicker from "react-multi-date-picker";
import { persian, persian_af } from "../../utils/dateHelpers";
import { Search, RotateCcw, FileText } from "lucide-react";
import SearchableSelect from "../common/SearchableSelect";
import { apiUrl } from "../../api";
const PRESET_KEYS = ["current_month", "today", "last_7_days", "last_30_days", "all"];
const TRANSACTION_TYPE_VALUES = [
  ["all", "allTypes"],
  ["deposit", "typeDeposit"],
  ["withdrawal", "typeWithdraw"],
  ["transfer", "typeTransfer"],
  ["exchange", "typeExchange"],
  ["expense", "typeExpense"],
];
export default function TransactionFilters({
  filterPreset,
  filterStartDate,
  filterEndDate,
  selectedVaultFilter,
  selectedCurrencyFilter,
  selectedTypeFilter = "all",
  selectedCategoryFilter = "all",
  searchTerm,
  vaults = [],
  loading,
  onPresetChange,
  onStartDateChange,
  onEndDateChange,
  onVaultChange,
  onCurrencyChange,
  onTypeChange,
  onCategoryChange,
  onSearchChange,
  onRefresh,
  onOpenReportModal,
  total,
}) {
  const { t } = useTranslation("treasury");
  const PRESETS = useMemo(
    () => PRESET_KEYS.map((key) => ({
      key,
      label: ["last_7_days", "last_30_days"].includes(key)
        ? t(`datePreset.${key}`, { ns: "common" })
        : t(`preset.${key}`),
    })),
    [t]
  );
  const TRANSACTION_TYPES = useMemo(
    () => TRANSACTION_TYPE_VALUES.map(([value, key]) => ({ value, label: t(`filters.${key}`) })),
    [t]
  );
  const [categories, setCategories] = useState([]);
  useEffect(() => {
    fetch(apiUrl("/vault-transaction-categories"))
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.data)) {
          setCategories(data.data);
        }
      })
      .catch(() => {});
  }, []);
  const availableCurrencies = [
    { value: "all", label: t("filters.allCurrencies") },
    ...Array.from(new Set(vaults.map((v) => v.currency).filter(Boolean))).map((cur) => ({
      value: cur,
      label: cur === "AFN" ? t("currency.AFN") : cur === "USD" ? t("currency.USD") : cur,
    })),
  ];
  const vaultOptions = [
    { value: "all", label: t("filters.allVaults") },
    ...vaults.map((v) => ({
      value: v.id,
      label: `[${v.account_number || v.id}] ${v.name} (${v.currency})`,
    })),
  ];
  const categoryOptions = [
    { value: "all", label: t("filters.allCategories") },
    ...categories.map((c) => ({
      value: String(c.id),
      label: c.name,
    })),
  ];
  const showDateRange = filterPreset === "all" || filterPreset === "custom";
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-2xs px-4 py-2.5 space-y-2.5 font-sans">
      <div className="flex items-center justify-between border-b border-gray-100 pb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold text-gray-800 tracking-tight">{t("filters.title")}</h3>
        </div>
        <div className="flex items-center gap-2">
          {onOpenReportModal && (
            <button
              type="button"
              onClick={onOpenReportModal}
              className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-800 hover:text-white text-slate-800 border border-gray-300 rounded text-xs font-bold transition-all cursor-pointer shadow-2xs group"
            >
              <FileText size={14} className="text-amber-600 group-hover:text-amber-400" />
              <span>{t("filters.report")}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 text-gray-600 hover:text-white hover:bg-slate-800 bg-white rounded border border-gray-300 transition-colors cursor-pointer disabled:opacity-40"
          >
            <RotateCcw size={14} className={loading ? "animate-spin text-slate-800" : ""} />
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => onPresetChange(p.key)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer border ${
                filterPreset === p.key
                  ? "bg-slate-800 text-white border-slate-800 font-bold"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          {availableCurrencies.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => onCurrencyChange(value)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer border ${
                selectedCurrencyFilter === value
                  ? "bg-slate-800 text-white border-slate-800 font-bold"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 pt-0.5">
        {showDateRange && <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">{t("filters.fromDate")}</label>
          <DatePicker
            value={filterStartDate}
            onChange={(date) => onStartDateChange(date)}
            calendar={persian}
            locale={persian_af}
            format="YYYY/MM/DD"
            inputClass="w-full bg-white border border-gray-300 hover:border-gray-400 focus:border-slate-800 rounded px-2.5 py-1.5 text-xs text-gray-900 outline-none transition-colors font-sans"
            placeholder={t("filters.fromPlaceholder")}
          />
        </div>}
        {showDateRange && <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">{t("filters.toDate")}</label>
          <DatePicker
            value={filterEndDate}
            onChange={(date) => onEndDateChange(date)}
            calendar={persian}
            locale={persian_af}
            format="YYYY/MM/DD"
            inputClass="w-full bg-white border border-gray-300 hover:border-gray-400 focus:border-slate-800 rounded px-2.5 py-1.5 text-xs text-gray-900 outline-none transition-colors font-sans"
            placeholder={t("filters.toPlaceholder")}
          />
        </div>}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">{t("filters.type")}</label>
          <SearchableSelect
            options={TRANSACTION_TYPES}
            value={selectedTypeFilter}
            onChange={(val) => onTypeChange(val)}
            placeholder={t("filters.typePlaceholder")}
            searchPlaceholder={t("filters.typeSearch")}
            buttonClassName="w-full bg-white border border-gray-300 hover:border-gray-400 focus:border-slate-800 rounded px-2.5 py-1.5 text-xs text-gray-900 outline-none cursor-pointer"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">{t("label.category")}</label>
          <SearchableSelect
            options={categoryOptions}
            value={selectedCategoryFilter}
            onChange={(val) => onCategoryChange && onCategoryChange(val)}
            placeholder={t("filters.categoryPlaceholder")}
            searchPlaceholder={t("filters.categorySearch")}
            buttonClassName="w-full bg-white border border-gray-300 hover:border-gray-400 focus:border-slate-800 rounded px-2.5 py-1.5 text-xs text-gray-900 outline-none cursor-pointer"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">{t("filters.vault")}</label>
          <SearchableSelect
            options={vaultOptions}
            value={selectedVaultFilter}
            onChange={(val) => onVaultChange(val)}
            placeholder={t("filters.vaultPlaceholder")}
            searchPlaceholder={t("label.vaultSearch")}
            buttonClassName="w-full bg-white border border-gray-300 hover:border-gray-400 focus:border-slate-800 rounded px-2.5 py-1.5 text-xs text-gray-900 outline-none cursor-pointer"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">{t("filters.search")}</label>
          <div className="relative">
            <Search size={14} className="text-gray-400 absolute right-2.5 top-2" />
            <input
              type="text"
              maxLength={TEXT_FIELD_MAX_LENGTH}
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t("filters.searchPlaceholder")}
              className="w-full bg-white border border-gray-300 hover:border-gray-400 focus:border-slate-800 rounded pr-8 pl-6 py-1.5 text-xs text-gray-900 placeholder-gray-400 outline-none transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute left-2 top-1.5 text-gray-400 hover:text-gray-600 cursor-pointer text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
