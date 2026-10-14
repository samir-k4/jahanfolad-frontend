import React from "react";
import { Users, Building2 } from "lucide-react";
import { useBranch } from "../../context/BranchContext";
export default function BranchEmptyState({ title, description, actionLabel }) {
  const { isMultiBranch, selectedBranch, setSelectedBranch } = useBranch();
  const canShowAllBranches = isMultiBranch && selectedBranch !== "all";
  return (
    <div className="p-12 text-center flex flex-col items-center justify-center gap-2" dir="rtl">
      <div className="w-12 h-12 rounded-card bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mb-1">
        <Users size={22} />
      </div>
      <p className="text-base font-bold text-gray-900">{title}</p>
      <p className="text-body-text text-gray-500 font-medium max-w-md">{description}</p>
      {canShowAllBranches && actionLabel && (
        <button
          type="button"
          onClick={() => setSelectedBranch("all")}
          className="mt-1.5 inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 rounded-btn text-btn-text font-bold cursor-pointer shadow-2xs"
        >
          <Building2 size={15} className="text-gray-600" />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
}
