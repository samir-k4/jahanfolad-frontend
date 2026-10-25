import { useState, useMemo, useEffect } from "react";
import {
  History,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
} from "lucide-react";
import { formatProductName } from "../../utils/productFormat";
import { formatAfghanDateTime } from "../../utils/dateHelpers";
import { CustomDropdown, FilterPresetButtons, TablePagination } from "../common";
import { LIST_FILTER_PRESET_KEYS, buildPresets } from "../../utils/datePresets";
import { useTranslation } from "react-i18next";
export default function WarehouseTransactionsTable({
  showBranch = true,
  transactionsData = [],
  isLoading = false,
  isGlobal = true,
  txTypeFilter = "all",
  onTxTypeFilterChange,
  txPeriodFilter = "today",
  onTxPeriodFilterChange,
  formatShamsiDateTime,
}) {
  const { t } = useTranslation("warehouse");
  const { t: tCommon } = useTranslation("common");
  const listFilterPresets = useMemo(
    () => buildPresets(LIST_FILTER_PRESET_KEYS, tCommon),
    [tCommon],
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  useEffect(() => {
    setCurrentPage(1);
  }, [txTypeFilter, txPeriodFilter]);
  const totalPages = Math.max(1, Math.ceil(transactionsData.length / perPage));
  const paginatedTransactions = useMemo(() => {
    const page = Math.min(currentPage, totalPages);
    const start = (page - 1) * perPage;
    return transactionsData.slice(start, start + perPage);
  }, [transactionsData, currentPage, perPage, totalPages]);
  const getSourceBadge = (source) => {
    switch (source) {
      case "production":
        return (
          <span className="bg-gray-100 text-gray-800 border border-gray-200 text-caption-text px-2.5 py-0.5 rounded-lg font-medium">
            {t("transactions.sourceProduction")}
          </span>
        );
      case "manual_export":
        return (
          <span className="bg-rose-50 text-rose-800 border border-rose-200 text-caption-text px-2.5 py-0.5 rounded-lg font-medium">
            {t("transactions.sourceManualExport")}
          </span>
        );
      case "manual_import":
        return (
          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-caption-text px-2.5 py-0.5 rounded-lg font-medium">
            {t("transactions.sourceManualImport")}
          </span>
        );
      default:
        return (
          <span className="bg-gray-100 text-gray-700 border border-gray-200 text-caption-text px-2.5 py-0.5 rounded-lg font-medium">
            {source || "—"}
          </span>
        );
    }
  };
  const renderFormattedDate = (dateVal) => {
    if (!dateVal) return "—";
    if (typeof formatShamsiDateTime === "function") {
      return formatShamsiDateTime(dateVal);
    }
    return formatAfghanDateTime(dateVal);
  };
  const txTypeOptions = [
    {
      value: "all",
      label: `${t("transactions.filterAll")} (${transactionsData.length})`,
    },
    {
      value: "in",
      label: t("transactions.filterIn"),
      icon: <ArrowUpRight size={15} className="text-emerald-700" />,
    },
    {
      value: "out",
      label: t("transactions.filterOut"),
      icon: <ArrowDownRight size={15} className="text-rose-600" />,
    },
  ];
  return (
    <div className="w-full bg-white font-sans rounded-b-xl">
      <div className="p-4 bg-white border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-20">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-label-text text-gray-700 font-bold whitespace-nowrap ml-1">
            {t("filters.timeRange")}
          </span>
          <FilterPresetButtons
            presets={listFilterPresets}
            activeKey={txPeriodFilter}
            onChange={onTxPeriodFilterChange}
            buttonClassName="px-3 py-1.5 rounded-pill text-btn-text"
          />
        </div>
        <div className="flex items-center space-x-2 space-x-reverse">
          <span className="text-label-text text-gray-700 font-bold whitespace-nowrap">
            {t("transactions.filterTypeLabel")}
          </span>
          <CustomDropdown
            options={txTypeOptions}
            value={txTypeFilter}
            onChange={(val) => onTxTypeFilterChange(val)}
            placeholder={t("transactions.filterAll")}
            buttonClassName="px-3.5 py-1.5 text-table-cell-text font-medium rounded-lg"
            width="w-52"
            align="left"
          />
        </div>
      </div>
      <div className="overflow-x-auto bg-white min-h-[300px] rounded-b-xl">
        {isLoading ? (
          <div className="py-20 text-center text-gray-500 font-medium">
            <div className="w-8 h-8 border-2 border-slate-800 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-table-cell-text text-gray-600">
              {t("transactions.loading")}
            </p>
          </div>
        ) : transactionsData.length === 0 ? (
          <div className="py-16 text-center text-gray-500 font-medium">
            <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 mx-auto mb-2 border border-gray-200 shadow-2xs">
              <History size={24} />
            </div>
            <p className="font-bold text-gray-800 text-table-cell-text">
              {t("transactions.emptyTitle")}
            </p>
            {txPeriodFilter !== "all" && (
              <button
                type="button"
                onClick={() => onTxPeriodFilterChange?.("all")}
                className="mt-3 px-4 py-2 bg-slate-800 text-white text-btn-text font-bold rounded-lg hover:bg-slate-900 transition-colors cursor-pointer shadow-xs"
              >
                {t("actions.showAllTransactions")}
              </button>
            )}
          </div>
        ) : (
          <table className="w-full min-w-[1080px] text-right border-collapse bg-white">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-700 text-table-header-text font-bold">
                <th className="p-3.5 w-14 text-center border-l border-gray-200">
                  {t("stock.colIndex")}
                </th>
                <th className="p-3.5 text-center w-28 border-l border-gray-200">
                  {t("transactions.colType")}
                </th>
                {isGlobal && showBranch && (
                  <th className="p-3.5 border-l border-gray-200">
                    {t("transactions.colBranch")}
                  </th>
                )}
                <th className="p-3.5 border-l border-gray-200">
                  {t("kpi.productUnit")}
                </th>
                <th className="p-3.5 text-center border-l border-gray-200">
                  {t("transactions.colQuantity")}
                </th>
                <th className="p-3.5 border-l border-gray-200">
                  {t("transactions.colSource")}
                </th>
                <th className="p-3.5 w-[24%] border-l border-gray-200">
                  {t("transactions.colDescription")}
                </th>
                <th className="p-3.5 text-center border-l border-gray-200">
                  {t("transactions.colCreator")}
                </th>
                <th className="p-3.5 text-center w-40">
                  {t("transactions.colDate")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-table-cell-text bg-white">
              {paginatedTransactions.map((tx, idx) => {
                const isOut = tx.type === "out";
                const pName =
                  tx.product?.name ||
                  t("common.unknownProduct", { id: tx.product_id });
                const formattedName = formatProductName(pName);
                return (
                  <tr
                    key={tx.id || idx}
                    className="hover:bg-gray-50/70 transition-colors border-b border-gray-100"
                  >
                    <td className="p-3.5 text-center text-gray-500 font-mono text-caption-text border-l border-gray-100">
                      {(Math.min(currentPage, totalPages) - 1) * perPage + idx + 1}
                    </td>
                    <td className="p-3.5 text-center border-l border-gray-100">
                      {isOut ? (
                        <span className="inline-flex items-center space-x-1 space-x-reverse bg-rose-50 text-rose-800 border border-rose-200 text-caption-text px-2.5 py-0.5 rounded-lg font-bold">
                          <ArrowDownRight size={14} />
                          <span>{t("stock.actionExport")}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 space-x-reverse bg-emerald-50 text-emerald-800 border border-emerald-200 text-caption-text px-2.5 py-0.5 rounded-lg font-bold">
                          <ArrowUpRight size={14} />
                          <span>{t("stock.actionImport")}</span>
                        </span>
                      )}
                    </td>
                    {isGlobal && showBranch && (
                      <td className="p-3.5 font-medium text-gray-800 border-l border-gray-100">
                        <span className="inline-flex items-center space-x-1 space-x-reverse bg-gray-50 text-slate-800 border border-gray-200 px-2.5 py-0.5 rounded-lg text-caption-text font-bold">
                          <Building2 size={13} className="text-gray-500" />
                          <span>
                            {tx.branch?.name || t("table.emptyValue", { ns: "common" })}
                          </span>
                        </span>
                      </td>
                    )}
                    <td className="p-3.5 font-bold text-gray-900 border-l border-gray-100 whitespace-normal break-words">
                      {formattedName}
                    </td>
                    <td className="p-3.5 text-center font-bold font-mono border-l border-gray-100">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-lg border font-mono font-bold text-table-cell-text ${
                          isOut
                            ? "bg-rose-50/50 text-rose-800 border-rose-200"
                            : "bg-emerald-50/50 text-emerald-800 border-emerald-200"
                        }`}
                        dir="ltr"
                      >
                        {isOut ? "-" : "+"}
                        {Number(tx.quantity).toLocaleString("en-US")}
                      </span>
                    </td>
                    <td className="p-3.5 border-l border-gray-100">
                      {getSourceBadge(tx.source)}
                    </td>
                    <td className="p-3.5 text-gray-600 border-l border-gray-100 whitespace-normal break-words">
                      {tx.description || "—"}
                    </td>
                    <td className="p-3.5 text-center text-gray-700 text-caption-text font-medium border-l border-gray-100">
                      {tx.created_by || tx.user?.name || t("table.emptyValue", { ns: "common" })}
                    </td>
                    <td
                      className="p-3.5 text-center font-mono text-caption-text text-gray-600"
                      dir="ltr"
                    >
                      {renderFormattedDate(tx.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {transactionsData.length > 0 && (
        <TablePagination
          currentPage={Math.min(currentPage, totalPages)}
          lastPage={totalPages}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          total={transactionsData.length}
          totalEntries={transactionsData.length}
          perPage={perPage}
          onPerPageChange={(newPerPage) => {
            setPerPage(newPerPage);
            setCurrentPage(1);
          }}
          unit={t("transactions.paginationUnit")}
        />
      )}
    </div>
  );
}
