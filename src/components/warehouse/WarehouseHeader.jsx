import {
  ArrowUpRight,
  ArrowDownRight,
  Globe2,
  Building2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { CustomDropdown } from "../common";
import { useAuth } from "../../context/AuthContext";
export default function WarehouseHeader({
  branches = [],
  showBranch = true,
  selectedBranch = "all",
  onSelectBranch,
  onOpenExportModal,
  onOpenImportModal,
}) {
  const { t } = useTranslation("warehouse");
  const { can } = useAuth();
  const isGlobal = !selectedBranch || selectedBranch === "all";
  const activeBranchObj = branches.find(
    (b) => String(b.id) === String(selectedBranch),
  );
  const branchOptions = [
    {
      id: "all",
      label: t("page.globalBranchName"),
      icon: <Globe2 size={15} className="text-emerald-700" />,
    },
    ...branches.map((b) => ({
      id: String(b.id),
      label: b.name,
      icon: <Building2 size={15} className="text-gray-500" />,
    })),
  ];
  return (
    <div
      className="w-full flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 pb-4 font-sans"
      dir="rtl"
    >
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">
            {t("page.title")}
          </h1>
        </div>
        <p className="text-xs text-gray-500 font-medium mt-1">
          {!showBranch
            ? t("page.title")
            : isGlobal
              ? t("page.subtitleGlobal")
              : t("page.subtitleBranch", {
                  branchName: activeBranchObj?.name || "",
                })}
        </p>
      </div>
      <div className="flex items-center flex-wrap gap-2.5">
        {showBranch && (
          <CustomDropdown
            options={branchOptions}
            value={selectedBranch || "all"}
            onChange={(val) => onSelectBranch?.(val)}
            header={t("actions.selectBranchPlaceholder")}
            buttonClassName="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white min-w-[170px]"
            width="w-60"
            align="right"
          />
        )}
        {can("warehouse", "create") && (
        <button
          type="button"
          onClick={onOpenImportModal}
          className="px-3.5 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowUpRight size={15} className="text-emerald-700" />
          <span>{t("actions.manualImport")}</span>
        </button>
        )}
        {can("warehouse", "create") && (
        <button
          type="button"
          onClick={onOpenExportModal}
          className="px-4 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowDownRight size={15} className="text-rose-400" />
          <span>{t("actions.manualExport")}</span>
        </button>
        )}
      </div>
    </div>
  );
}
