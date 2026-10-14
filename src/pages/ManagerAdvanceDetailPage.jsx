import  { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Wallet,
  ArrowRight,
  Plus,
  Trash2,
  CheckCircle2,
  RotateCcw,
  Printer,
  ChevronLeft,
  Home,
} from "lucide-react";
import DateObject from "react-date-object";
import persian from "react-date-object/calendars/persian";
import persian_af from "../utils/persian_af";
import { TooltipButton, DeleteConfirmationModal, DocumentPreviewModal, usePagePerms } from "../components/common";
import ManagerExpenseAddModal from "../components/manager_advances/ManagerExpenseAddModal";
import { useTranslation } from "react-i18next";
import { formatDocNumber } from "../components/treasury/treasuryHelpers";
import { apiUrl } from "../api";
import { toEnglishDigits } from "../utils";
import { showToast } from "../utils/toast";
import { getCleanErrorMessage } from "../utils/errorHandler";
const fmt = (n) => Number(n || 0).toLocaleString("en-US");
export default function ManagerAdvanceDetailPage() {
  const { id } = useParams();
  const { t } = useTranslation("advances");
  const { canCreate, canEdit, canDelete } = usePagePerms("advances");
  const navigate = useNavigate();
  const [advance, setAdvance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleSubmitting, setSettleSubmitting] = useState(false);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [isDeletingExpense, setIsDeletingExpense] = useState(false);
  const [showDeleteAdvanceModal, setShowDeleteAdvanceModal] = useState(false);
  const [isDeletingAdvance, setIsDeletingAdvance] = useState(false);
  const fetchAdvance = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/manager-advances/${encodeURIComponent(id)}`));
      if (!res.ok) throw new Error(t("detail.notFoundShort"));
      const json = await res.json();
      setAdvance(json);
    } catch (err) {
      showToast.error(getCleanErrorMessage(err, t("detail.loadError")));
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    fetchAdvance();
  }, [fetchAdvance]);
  const handleConfirmDeleteExpense = async () => {
    if (!expenseToDelete) return;
    setIsDeletingExpense(true);
    try {
      const res = await fetch(apiUrl(`/manager-advances/${encodeURIComponent(id)}/expenses/${encodeURIComponent(expenseToDelete.id)}`), {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || t("detail.expenseDeleteError"));
      showToast.success(json.message || t("detail.expenseDeleted"));
      setExpenseToDelete(null);
      fetchAdvance();
    } catch (err) {
      showToast.error(getCleanErrorMessage(err));
    } finally {
      setIsDeletingExpense(false);
    }
  };
  const handleSettle = async () => {
    setSettleSubmitting(true);
    try {
      const shamsiStr = toEnglishDigits(
        new DateObject({ calendar: persian, locale: persian_af }).format("YYYY/MM/DD")
      );
      const res = await fetch(apiUrl(`/manager-advances/${encodeURIComponent(id)}/settle`), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ shamsi_date: shamsiStr }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || t("detail.settleError"));
      showToast.success(json.message || t("detail.settled"));
      setShowSettleModal(false);
      fetchAdvance();
    } catch (err) {
      showToast.error(getCleanErrorMessage(err));
    } finally {
      setSettleSubmitting(false);
    }
  };
  const handleConfirmDeleteAdvance = async () => {
    setIsDeletingAdvance(true);
    try {
      const res = await fetch(apiUrl(`/manager-advances/${encodeURIComponent(id)}`), {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || t("detail.cancelError"));
      showToast.success(json.message || t("detail.cancelled"));
      setShowDeleteAdvanceModal(false);
      navigate("/manager-advances");
    } catch (err) {
      showToast.error(getCleanErrorMessage(err));
    } finally {
      setIsDeletingAdvance(false);
    }
  };
  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500 font-sans" dir="rtl">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-card border border-gray-200 shadow-xs">
          <RotateCcw size={16} className="animate-spin text-slate-800" />
          <span className="text-sm font-bold">{t("detail.loading")}</span>
        </div>
      </div>
    );
  }
  if (!advance) {
    return (
      <div className="p-8 text-center font-sans space-y-4" dir="rtl">
        <p className="text-gray-600 font-bold text-base">{t("detail.notFound")}</p>
        <Link
          to="/manager-advances"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-btn text-sm font-bold hover:bg-slate-900"
        >
          <ArrowRight size={15} />
          <span>{t("detail.backToListLong")}</span>
        </Link>
      </div>
    );
  }
  const isOpen = advance.status === "open";
  const receiverName = advance.receiver_name || advance.employee?.full_name || t("detail.receiverFallback");
  const spentPercent = advance.amount > 0 ? Math.min(100, Math.round((advance.total_spent / advance.amount) * 100)) : 0;
  return (
    <div className="w-full space-y-4 font-sans" dir="rtl">
      <nav aria-label="Breadcrumb" className="flex items-center flex-wrap gap-2 text-xs font-bold text-gray-500">
        <Link to="/" className="hover:text-slate-900 transition-colors flex items-center gap-1">
          <Home size={14} />
          <span>{t("detail.dashboard")}</span>
        </Link>
        <ChevronLeft size={13} className="text-gray-400" />
        <Link to="/manager-advances" className="hover:text-slate-900 transition-colors flex items-center gap-1">
          <Wallet size={14} />
          <span>{t("page.title")}</span>
        </Link>
        <ChevronLeft size={13} className="text-gray-400" />
        <span className="text-gray-800">سند #{String(advance.id).padStart(4, "0")}</span>
      </nav>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">{t("detail.title")}</h1>
            <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-300 font-bold" dir="ltr">
              #{String(advance.id).padStart(4, "0")}
            </span>
          </div>
          <p className="text-xs text-gray-500 font-medium mt-1">{t("detail.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={fetchAdvance}
            className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 border border-gray-300 rounded-btn cursor-pointer transition-colors bg-white"
            aria-label={t("detail.refresh")}
          >
            <RotateCcw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            type="button"
            onClick={() => setShowVoucherModal(true)}
            className="px-3.5 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-btn hover:bg-gray-50 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <Printer size={15} />
            <span>{t("detail.printVoucher")}</span>
          </button>
          {canDelete && isOpen && (advance.expenses?.length || 0) === 0 && (
            <button
              type="button"
              onClick={() => setShowDeleteAdvanceModal(true)}
              className="px-3.5 py-2 text-xs font-bold text-rose-700 bg-white border border-rose-300 rounded-btn hover:bg-rose-50 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 size={14} />
              <span>{t("detail.cancelAdvance")}</span>
            </button>
          )}
          <Link
            to="/manager-advances"
            className="px-3.5 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-btn hover:bg-gray-50 transition-colors shadow-2xs flex items-center gap-1.5"
          >
            <ArrowRight size={15} />
            <span>{t("detail.backToList")}</span>
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="bg-white rounded-card border border-gray-200 p-4 shadow-2xs space-y-3">
          <div className="flex items-start justify-between border-b border-gray-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-gray-900">{receiverName}</h2>
              <div className="flex items-center gap-1.5 mt-1">
                {advance.employee ? (
                  <span className="text-3xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    کارمند شرکت ({advance.employee.position || advance.employee.employee_ID || t("detail.staffFallback")})
                  </span>
                ) : (
                  <span className="text-3xs text-gray-600 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">{t("label.external")}</span>
                )}
              </div>
            </div>
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded border ${
                isOpen
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
              }`}
            >
              {isOpen ? t("status.open") : t("status.settled")}
            </span>
          </div>
          <div className="space-y-2 text-xs text-gray-700 font-normal">
            <div className="flex items-center justify-between py-1 border-b border-gray-50">
              <span className="text-gray-500">{t("detail.sourceVault")}</span>
              <span className="font-bold text-gray-900">
                {advance.vault?.name} ({advance.currency})
              </span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-gray-50">
              <span className="text-gray-500">{t("detail.paymentDate")}</span>
              <span className="font-bold font-mono text-gray-900" dir="ltr">
                {toEnglishDigits(advance.shamsi_date || "—")}
              </span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-gray-50">
              <span className="text-gray-500">{t("detail.purpose")}</span>
              <span className="font-bold text-slate-800">
                {advance.purpose || t("detail.defaultPurpose")}
              </span>
            </div>
            {advance.notes && (
              <div className="pt-1">
                <span className="text-gray-500 block mb-1">{t("detail.notes")}</span>
                <p className="p-2 bg-gray-50 border border-gray-200 rounded text-gray-800 text-xs leading-relaxed">
                  {advance.notes}
                </p>
              </div>
            )}
          </div>
        </div>
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-card border border-gray-200 p-3.5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-600">{t("detail.amountReceived")}</span>
              <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200 text-3xs font-mono font-bold">
                {advance.currency}
              </span>
            </div>
            <div className="mt-2">
              <span className="text-xl font-black font-mono text-gray-900 block" dir="ltr">
                {fmt(advance.amount)}
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-gray-100 text-3xs text-gray-400">{t("detail.initialWithdraw")}</div>
          </div>
          <div className="bg-white rounded-card border border-gray-200 p-3.5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-600">{t("detail.totalSpent")}</span>
              <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-3xs font-mono font-bold">
                {advance.currency}
              </span>
            </div>
            <div className="mt-2">
              <span className="text-xl font-black font-mono text-rose-700 block" dir="ltr">
                {fmt(advance.total_spent)}
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-gray-100 text-3xs text-gray-500 flex justify-between items-center">
              <span>{advance.expenses?.length || 0} قلم سند مصرف</span>
              <span className="font-bold font-mono text-rose-700">{spentPercent}% مصرف</span>
            </div>
          </div>
          <div className="bg-white rounded-card border border-gray-200 p-3.5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-600">
                {isOpen ? t("detail.remainingOpen") : t("detail.remainingReturned")}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200 text-3xs font-mono font-bold">
                {advance.currency}
              </span>
            </div>
            <div className="mt-2">
              <span className="text-xl font-black font-mono block text-gray-900" dir="ltr">
                {fmt(advance.remaining)}
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-gray-100 text-3xs text-gray-500 flex justify-between items-center">
              <span>{isOpen ? t("detail.inProgress") : t("detail.settledDeposited")}</span>
            </div>
          </div>
          <div className="sm:col-span-3 bg-white p-3 rounded-card border border-gray-200 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-bold text-gray-700 mb-1.5">
              <span>{t("detail.progress")}</span>
              <span className="font-mono">{spentPercent}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  spentPercent > 90
                    ? "bg-rose-600"
                    : spentPercent > 50
                    ? "bg-amber-500"
                    : "bg-emerald-600"
                }`}
                style={{ width: `${spentPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-table border border-gray-200 shadow-2xs overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-gray-900">{t("detail.expensesTitle")}</h3>
            <span className="text-xs bg-gray-100 font-mono font-bold text-gray-700 px-2 py-0.5 rounded border border-gray-200">
              {advance.expenses?.length || 0} سند
            </span>
          </div>
          {canCreate && isOpen && (
            <button
              type="button"
              onClick={() => setShowExpenseForm(true)}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-btn text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Plus size={15} />
              <span>{t("page.addExpense")}</span>
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold select-none text-xs border-b border-gray-200">
                <th className="py-1.5 px-1.5 text-center w-10 border border-gray-200">#</th>
                <th className="py-1.5 px-2.5 text-right border border-gray-200 min-w-[130px]">{t("detail.expenseCategory")}</th>
                <th className="py-1.5 px-2.5 text-right border border-gray-200">{t("detail.expenseDescription")}</th>
                <th className="py-1.5 px-2 text-center border border-gray-200 min-w-[90px]">{t("detail.expenseDate")}</th>
                <th className="py-1.5 px-2.5 text-center border border-gray-200 min-w-[100px]">{t("detail.expenseAmount")}</th>
                {canDelete && isOpen && <th className="py-1.5 px-2 text-center w-16 border border-gray-200">{t("table.actions")}</th>}
              </tr>
            </thead>
            <tbody className="bg-white">
              {(advance.expenses?.length || 0) === 0 ? (
                <tr>
                  <td colSpan={canDelete && isOpen ? 6 : 5} className="p-10 text-center text-gray-400 text-xs">{t("detail.noExpenses")}</td>
                </tr>
              ) : (
                advance.expenses.map((exp, idx) => (
                  <tr key={exp.id} className="hover:bg-amber-50/40 transition-colors even:bg-slate-50/40">
                    <td className="py-1.5 px-1.5 text-center text-gray-400 border border-gray-200 font-mono text-xs font-normal">
                      {idx + 1}
                    </td>
                    <td className="py-1.5 px-2.5 text-xs text-gray-800 border border-gray-200 font-medium">
                      {exp.category?.name || exp.category_name || (typeof exp.category === "string" ? exp.category : "") || "متفرقه"}
                    </td>
                    <td className="py-1.5 px-2.5 text-xs text-gray-700 border border-gray-200 font-normal">
                      {exp.description || "—"}
                    </td>
                    <td className="py-1.5 px-2 text-center font-mono text-gray-600 border border-gray-200 text-xs font-normal" dir="ltr">
                      {toEnglishDigits(exp.shamsi_date || "—")}
                    </td>
                    <td className="py-1.5 px-2.5 text-center font-mono font-medium text-xs text-rose-700 border border-gray-200 text-nowrap" dir="ltr">
                      −{fmt(exp.amount)} {advance.currency}
                    </td>
                    {canDelete && isOpen && (
                      <td className="py-1.5 px-2 text-center border border-gray-200">
                        <div className="flex items-center justify-center">
                          <TooltipButton
                            tooltip={t("detail.deleteExpenseTip")}
                            onClick={() => setExpenseToDelete(exp)}
                            className="w-6 h-6 flex items-center justify-center bg-white text-gray-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-300 rounded border border-gray-200 transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </TooltipButton>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
            {(advance.expenses?.length || 0) > 0 && (
              <tfoot>
                <tr className="bg-slate-50 border-t border-gray-200 font-bold text-xs">
                  <td colSpan={4} className="py-2 px-3 text-gray-800 border border-gray-200">{t("detail.expensesTotal")}</td>
                  <td className="py-2 px-3 text-center font-mono font-bold text-rose-700 text-xs border border-gray-200" dir="ltr">
                    −{fmt(advance.total_spent)} {advance.currency}
                  </td>
                  {canDelete && isOpen && <td className="border border-gray-200" />}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
      <div className="bg-white rounded-card border border-gray-200 p-4 shadow-2xs">
        {isOpen ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-700" />
                <span>{t("detail.settleTitle")}</span>
              </h3>
              <p className="text-xs text-gray-500 font-normal">
                {t("detail.settleHint", {
                  amount: fmt(advance.remaining),
                  currency: advance.currency,
                  vault: advance.vault?.name || "",
                })}
              </p>
            </div>
            {!canEdit ? null : !showSettleModal ? (
              <button
                type="button"
                onClick={() => setShowSettleModal(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-btn text-xs font-bold transition-colors cursor-pointer shadow-xs shrink-0 flex items-center gap-1.5"
              >
                <CheckCircle2 size={15} />
                <span>{t("detail.settleButton")}</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSettleModal(false)}
                  className="px-3.5 py-1.5 border border-gray-300 rounded-btn text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
                >{t("create.cancel")}</button>
                <button
                  type="button"
                  onClick={handleSettle}
                  disabled={settleSubmitting}
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-btn text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {settleSubmitting ? t("detail.settling") : t("detail.confirmSettle")}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 text-emerald-900">
            <div className="w-8 h-8 rounded-btn bg-emerald-100 flex items-center justify-center border border-emerald-200">
              <CheckCircle2 size={18} className="text-emerald-800" />
            </div>
            <div>
              <h4 className="text-sm font-bold">{t("detail.settledTitle")}</h4>
              <p className="text-xs text-emerald-700 font-medium mt-0.5">{t("detail.settledSubtitle")}</p>
            </div>
          </div>
        )}
      </div>
      <DocumentPreviewModal
        isOpen={showVoucherModal}
        onClose={() => setShowVoucherModal(false)}
        htmlPath={`/manager-advances/${advance.id}/voucher-html`}
        pdfPath={`/manager-advances/${advance.id}/voucher-pdf`}
        title={t("common:voucher.advanceTitle")}
        subtitle={t("common:voucher.advanceMeta", { doc: formatDocNumber(advance.doc_code || advance.id, advance.id), receiver: receiverName })}
        icon={<Wallet className="w-5 h-5" />}
      />
      <DeleteConfirmationModal
        isOpen={Boolean(expenseToDelete)}
        onClose={() => setExpenseToDelete(null)}
        onConfirm={handleConfirmDeleteExpense}
        itemName={
          expenseToDelete
            ? t("delete.expenseItemName", {
                category: expenseToDelete.category?.name || expenseToDelete.category_name || "",
                amount: fmt(expenseToDelete.amount),
                currency: advance.currency || "",
              })
            : ""
        }
        title={t("detail.deleteExpenseTitle")}
        question={t("detail.deleteExpenseQuestion")}
        warning={t("detail.deleteExpenseWarning")}
        loading={isDeletingExpense}
      />
      <ManagerExpenseAddModal
        isOpen={showExpenseForm}
        onClose={() => setShowExpenseForm(false)}
        initialAdvanceId={advance.id}
        onSuccess={() => {
          setShowExpenseForm(false);
          fetchAdvance();
        }}
      />
      <DeleteConfirmationModal
        isOpen={showDeleteAdvanceModal}
        onClose={() => setShowDeleteAdvanceModal(false)}
        onConfirm={handleConfirmDeleteAdvance}
        itemName={t("delete.advanceItemName", { name: receiverName, amount: fmt(advance.amount), currency: advance.currency })}
        title={t("detail.cancelTitle")}
        question={t("detail.cancelQuestion")}
        warning={t("detail.cancelWarning")}
        loading={isDeletingAdvance}
      />
    </div>
  );
}
