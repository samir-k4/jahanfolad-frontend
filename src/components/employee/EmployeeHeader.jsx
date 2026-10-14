import React from "react";
import { UserPlus, Printer, Download, Loader2 } from "lucide-react";
import { usePagePerms, BranchSelect } from "../common";
import { useTranslation } from "react-i18next";

const StatBadge = ({ label, value, unit, color = "gray" }) => {
  const colorMap = {
    gray: "bg-gray-50 text-gray-700 border-gray-200 text-gray-500 text-gray-900 text-gray-400",
    emerald: "bg-emerald-50 text-emerald-800 border-emerald-200 text-emerald-700 text-emerald-900 text-emerald-600",
  };
  const colorClass = colorMap[color] || colorMap.gray;
  const [bgColor, textColor, borderColor, labelColor, valueColor, unitColor] = colorClass.split(" ");

  return (
    <div className={`inline-flex items-center gap-1.5 ${bgColor} ${textColor} px-2.5 py-1 rounded-badge border ${borderColor} font-medium`}>
      <span className={`${labelColor} text-[11px]`}>{label}</span>
      <span className="font-mono font-bold text-gray-900" dir="ltr">{value.toLocaleString("en-US")}</span>
      <span className={`${unitColor} text-[10px]`}>{unit}</span>
    </div>
  );
};

export default function EmployeeHeader({
  selectedBranch = "all",
  onBranchChange,
  onOpenCreateModal,
  onPrintList,
  onDownloadBlankForm,
  isDownloadingForm = false,
  stats = {},
}) {
  const { t } = useTranslation("employee");
  const { canCreate } = usePagePerms("employees");

  const statItems = [
    { label: t("list.statTotal"), value: Number(stats.total) || 0, color: "gray" },
    { label: t("list.statActive"), value: Number(stats.active) || 0, color: "emerald" },
    { label: t("list.statNail"), value: Number(stats.nailMachineCount) || 0, color: "gray" },
    { label: t("list.statWire"), value: Number(stats.wireCount) || 0, color: "gray" },
    { label: t("list.statPackaging"), value: Number(stats.packagingCount) || 0, color: "gray" },
    { label: t("list.statOutsideHangar"), value: Number(stats.outsideHangarCount) || 0, color: "gray" },
  ];

  return (
    <div className="space-y-4 font-sans" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 border-b border-gray-200 pb-4">
        <div className="pt-1">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">{t("page.title")}</h1>
        </div>
        <div className="flex flex-col items-start md:items-end gap-2.5">
          <div className="flex items-center gap-2">
            <BranchSelect
              value={selectedBranch || "all"}
              onChange={onBranchChange}
              includeAll
              allLabel={t("filters.allBranches", { ns: "common" })}
              placeholder={t("filters.allBranches", { ns: "common" })}
              buttonClassName="h-8 px-3 text-xs font-bold text-gray-700 bg-white border border-gray-300 hover:border-gray-400 rounded-btn transition-colors shadow-2xs min-w-[140px]"
              width="w-48"
              align="right"
            />
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={onDownloadBlankForm}
              disabled={isDownloadingForm}
              className="px-3.5 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-btn hover:bg-gray-50 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isDownloadingForm ? (
                <Loader2 size={15} className="animate-spin text-gray-600" />
              ) : (
                <Download size={15} className="text-gray-600" />
              )}
              <span>{t("list.downloadBlankForm")}</span>
            </button>
            <button
              type="button"
              onClick={onPrintList}
              className="px-3.5 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-btn hover:bg-gray-50 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Printer size={15} className="text-gray-600" />
              <span>{t("list.printReport")}</span>
            </button>
            {canCreate && (
              <button
                type="button"
                onClick={onOpenCreateModal}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-btn transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus size={16} />
                <span>{t("list.addEmployee")}</span>
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="bg-white p-3 rounded-card border border-gray-200 shadow-2xs flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {statItems.map((item, idx) => (
            <StatBadge
              key={idx}
              label={item.label}
              value={item.value}
              unit={t("list.unitPerson")}
              color={item.color}
            />
          ))}
        </div>
        <div className="text-xs text-gray-500 font-medium">{t("page.subtitle")}</div>
      </div>
    </div>
  );
}
