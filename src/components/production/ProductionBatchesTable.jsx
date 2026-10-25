import { useState, useMemo, useEffect } from "react";
import {
  FileText,
  Loader2,
  RefreshCw,
  Info,
  Edit2,
  Trash2,
} from "lucide-react";
import { toAfghanDate, formatAfghanDisplay } from "../../utils/dateHelpers";
import { getBatchStats } from "../../utils/batchHelpers";
import TooltipButton from "../common/TooltipButton";
import FilterPresetButtons from "../common/FilterPresetButtons";
import TablePagination from "../common/TablePagination";
import {
  LIST_FILTER_PRESET_KEYS,
  buildPresets,
  presetLabel,
} from "../../utils/datePresets";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "react-i18next";
export default function ProductionBatchesTable({
  showBranch = true,
  batches = [],
  filterPeriod = "today",
  setFilterPeriod,
  isLoadingBatches = false,
  onRefresh,
  onOpenDetail,
  onStartEdit,
  onOpenReport,
  onOpenDelete,
  onOpenHeaderReport,
}) {
  const { t } = useTranslation("production");
  const { t: tCommon } = useTranslation("common");
  const listFilterPresets = useMemo(
    () => buildPresets(LIST_FILTER_PRESET_KEYS, tCommon),
    [tCommon],
  );
  const { can } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  useEffect(() => {
    setCurrentPage(1);
  }, [filterPeriod]);
  const totalPages = Math.max(1, Math.ceil(batches.length / perPage));
  const paginatedBatches = useMemo(() => {
    const page = Math.min(currentPage, totalPages);
    const start = (page - 1) * perPage;
    return batches.slice(start, start + perPage);
  }, [batches, currentPage, perPage, totalPages]);
  return (
    <div className="w-full bg-white rounded-xl border border-gray-200 shadow-2xs font-sans" dir="rtl">
      <div className="p-4 border-b border-gray-200 bg-gray-50/70 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
            {t("table.title")}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-start md:justify-end">
          <FilterPresetButtons
            presets={listFilterPresets}
            activeKey={filterPeriod}
            onChange={setFilterPeriod}
            buttonClassName="px-3 py-1.5 rounded-pill text-btn-text"
          />
          <TooltipButton
            icon={
              <RefreshCw
                size={15}
                className={isLoadingBatches ? "animate-spin text-slate-600" : ""}
              />
            }
            tooltip={t("table.tooltipRefresh")}
            onClick={onRefresh}
            disabled={isLoadingBatches}
            colorClass="bg-white hover:bg-slate-800 hover:text-white text-gray-700 border border-gray-300"
          />
          <button
            type="button"
            onClick={onOpenHeaderReport}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-btn-text font-bold rounded-lg shadow-2xs transition-all cursor-pointer"
            title={t("table.reportButtonTitle")}
          >
            <FileText size={14} className="text-amber-700" />
            <span>{t("table.reportButton")}</span>
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        {isLoadingBatches ? (
          <div className="py-12 flex flex-col items-center justify-center text-gray-500">
            <Loader2 size={28} className="animate-spin text-slate-700 mb-2" />
            <span className="text-sm font-medium">
              {t("table.loading")}
            </span>
          </div>
        ) : batches.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <h3 className="text-base font-bold text-gray-700 mb-1">
              {t("table.emptyTitle")}
            </h3>
            <p className="text-body-text text-gray-500 max-w-sm mx-auto mb-4">
              {t("table.emptyDescription", {
                filterLabel: presetLabel(listFilterPresets, filterPeriod),
              })}
            </p>
            {filterPeriod !== "all" && (
              <button
                type="button"
                onClick={() => setFilterPeriod("all")}
                className="px-4 py-2 bg-slate-800 text-white text-btn-text font-bold rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
              >
                {t("table.viewAllButton")}
              </button>
            )}
          </div>
        ) : (
          <table className={`w-full text-right border-collapse table-fixed ${showBranch ? "min-w-[900px]" : "min-w-[760px]"}`}>
            <thead>
              <tr className="bg-gray-100/80 border-b border-gray-200 text-table-header-text font-bold text-gray-700 select-none">
                <th className="p-3 text-center w-[4%] border-l border-gray-200">#</th>
                <th className={`p-3 border-l border-gray-200 ${showBranch ? "w-[14%]" : "w-[17%]"}`}>{t("table.colDate")}</th>
                {showBranch && (
                  <th className="p-3 w-[18%] border-l border-gray-200">{t("table.colBranch")}</th>
                )}
                <th className={`p-3 border-l border-gray-200 ${showBranch ? "w-[18%]" : "w-[22%]"}`}>{t("table.colCreator")}</th>
                <th className={`p-3 border-l border-gray-200 text-center ${showBranch ? "w-[13%]" : "w-[17%]"}`}>{t("table.colItems")}</th>
                <th className={`p-3 border-l border-gray-200 text-center ${showBranch ? "w-[20%]" : "w-[24%]"}`}>{t("table.colTotalProduction")}</th>
                <th className={`p-3 text-center ${showBranch ? "w-[13%]" : "w-[16%]"}`}>{t("table.colActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-table-cell-text text-gray-700">
              {paginatedBatches.map((batch, index) => {
                const stats = getBatchStats(batch);
                return (
                  <tr key={batch.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="p-3 text-center border-l border-gray-200 font-mono text-gray-500 text-table-cell-text">
                      {(Math.min(currentPage, totalPages) - 1) * perPage + index + 1}
                    </td>
                    <td className="p-3 border-l border-gray-200 whitespace-nowrap">
                      <span className="font-bold text-gray-900 text-table-cell-text">
                        {formatAfghanDisplay(toAfghanDate(batch.date)) || "—"}
                      </span>
                    </td>
                    {showBranch && (
                      <td className="p-3 border-l border-gray-200 whitespace-normal break-words">
                        <span className="font-bold text-gray-800">
                          {batch.branch?.name}
                        </span>
                      </td>
                    )}
                    <td className="p-3 border-l border-gray-200 whitespace-normal break-words">
                      <span className="text-gray-700 font-medium">
                        {batch.created_by || batch.user?.name || "—"}
                      </span>
                    </td>
                    <td className="p-3 border-l border-gray-200 text-center">
                      <span className="inline-block text-gray-800 text-table-cell-text font-bold px-2 py-0.5 rounded-md">
                        {t("table.productsCount", { count: stats.productsCount })}
                      </span>
                    </td>
                    <td className="p-3 border-l border-gray-200 text-center">
                      <div className="font-bold text-slate-900 text-table-cell-text">
                        <span>{t("table.weightTon", { weight: stats.totalWeightTon })}</span>
                        <span className="text-gray-400 mx-1"> | </span>
                        <span className="text-gray-600 font-normal">
                          {t("table.quantityCarton", { qty: stats.totalQuantity })}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <TooltipButton
                          icon={<Info size={14} />}
                          tooltip={t("table.tooltipInfo")}
                          onClick={() => onOpenDetail(batch)}
                          colorClass="bg-white text-gray-500 border border-gray-300 hover:bg-blue-600 hover:text-white hover:border-blue-600 shadow-2xs"
                        />
                        {can("production", "edit") && (
                          <TooltipButton
                            icon={<Edit2 size={13} />}
                            tooltip={t("table.tooltipEdit")}
                            onClick={() => onStartEdit(batch)}
                            colorClass="bg-white text-gray-500 border border-gray-300 hover:bg-amber-500 hover:text-white hover:border-amber-500 shadow-2xs"
                          />
                        )}
                        <TooltipButton
                          icon={<FileText size={13} />}
                          tooltip={t("table.tooltipReport")}
                          onClick={() => onOpenReport(batch)}
                          colorClass="bg-white text-gray-500 border border-gray-300 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 shadow-2xs"
                        />
                        {can("production", "delete") && (
                          <TooltipButton
                            icon={<Trash2 size={13} />}
                            tooltip={t("table.tooltipDelete")}
                            onClick={() => onOpenDelete(batch)}
                            colorClass="bg-white text-gray-500 border border-gray-300 hover:bg-rose-600 hover:text-white hover:border-rose-600 shadow-2xs"
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {batches.length > 0 && (
        <TablePagination
          currentPage={Math.min(currentPage, totalPages)}
          lastPage={totalPages}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          total={batches.length}
          totalEntries={batches.length}
          perPage={perPage}
          onPerPageChange={(newPerPage) => {
            setPerPage(newPerPage);
            setCurrentPage(1);
          }}
          unit={t("table.paginationUnit")}
        />
      )}
    </div>
  );
}
