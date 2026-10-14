import { Building2, ArrowLeft, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useBranch } from "../../context/BranchContext";
import { useAuth } from "../../context/AuthContext";
export default function BranchGate() {
  const { t } = useTranslation("common");
  const { branches, setSelectedBranch } = useBranch();
  const { logout } = useAuth();
  return (
    <div
      dir="rtl"
      className="min-h-screen flex items-center justify-center p-4 font-sans bg-gray-50"
    >
      <div className="bg-white border border-gray-200 shadow-xl rounded-card p-8 md:p-10 max-w-lg w-full text-center">
        <div className="w-16 h-16 bg-slate-100 text-slate-800 border border-slate-200 rounded-btn flex items-center justify-center mx-auto mb-5">
          <Building2 size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          {t("branch.gateTitle")}
        </h2>
        <p className="text-base text-gray-600 mb-6 leading-relaxed">
          {t("branch.gateSubtitle")}
        </p>
        <div className="space-y-3">
          {branches.map((branch) => (
            <button
              key={branch.id}
              type="button"
              onClick={() => setSelectedBranch(String(branch.id))}
              className="w-full group flex items-center justify-between p-4 bg-white hover:bg-gray-50 border border-gray-300 hover:border-slate-800 rounded-btn transition-colors cursor-pointer"
            >
              <div className="flex items-center space-x-3.5 space-x-reverse">
                <div className="w-10 h-10 rounded-btn bg-gray-50 border border-gray-200 text-gray-700 group-hover:text-slate-900 flex items-center justify-center transition-colors">
                  <Building2 size={18} />
                </div>
                <div className="text-right">
                  <div className="text-base font-bold text-gray-900 group-hover:text-slate-900 transition-colors">
                    {branch.name}
                  </div>
                  {branch.location && (
                    <div className="text-sm text-gray-500 mt-0.5">
                      {t("branch.gateLocationPrefix")} {branch.location}
                    </div>
                  )}
                </div>
              </div>
              <div className="w-8 h-8 rounded-btn bg-gray-100 group-hover:bg-slate-800 text-gray-500 group-hover:text-white flex items-center justify-center transition-colors">
                <ArrowLeft size={16} />
              </div>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={logout}
          className="w-full mt-6 flex items-center justify-center gap-1.5 text-sm font-medium text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
        >
          <LogOut size={14} />
          <span>{t("branch.gateLogout")}</span>
        </button>
      </div>
    </div>
  );
}
