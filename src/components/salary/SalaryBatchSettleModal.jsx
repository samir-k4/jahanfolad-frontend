import { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { AlertCircle, Building2, Calendar, CheckCheck, FileText, Loader2, RotateCcw, Users, X } from "lucide-react";
import { apiUrl } from "../../api";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import { formatToGregorian } from "../../utils/dateHelpers";
import { getCleanErrorMessage } from "../../utils/errorHandler";
import { ALL_BRANCHES, RUN_STATE } from "../../constants/salaryDomain";
const TILE = "bg-gray-50 border border-gray-200 rounded-card p-3";
const money = (value) => Number(value || 0).toLocaleString("en-US");
export default function SalaryBatchSettleModal({
  isOpen,
  onClose,
  payrollList = [],
  totals,
  run,
  afghanMonthInfo,
  branchName,
  selectedBranch,
  onDone,
}) {
  useBodyScrollLock(isOpen);
  const { t } = useTranslation("salary");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [cancelAcknowledged, setCancelAcknowledged] = useState(false);
  const [collectorIds, setCollectorIds] = useState([]);
  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage("");
    setCancelAcknowledged(false);
  }, [isOpen]);
  useEffect(() => {
    if (!isOpen) return;
    setCollectorIds(
      payrollList.filter((row) => !row.isPaidUp && !row.awaitingApproval && row.remaining > 0).map((row) => row.id)
    );
  }, [isOpen, payrollList]);
  const monthName = afghanMonthInfo?.shamsi_month_name || t("page.currentMonth");
  const yearName = afghanMonthInfo?.shamsi_year || "";
  const pending = useMemo(
    () => payrollList.filter((row) => !row.isPaidUp && !row.awaitingApproval && row.remaining > 0),
    [payrollList]
  );
  const settled = useMemo(() => payrollList.filter((row) => row.isPaidUp || row.awaitingApproval), [payrollList]);
  const isCollecting = useCallback((id) => collectorIds.includes(id), [collectorIds]);
  const toggleCollector = (id) =>
    setCollectorIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  const chosen = useMemo(() => pending.filter((row) => isCollecting(row.id)), [pending, isCollecting]);
  const payableTotal = useMemo(
    () => chosen.reduce((sum, row) => sum + Number(row.remaining || 0), 0),
    [chosen]
  );
  const isClosed = Boolean(run);
  const isPendingRun = run?.state === RUN_STATE.PENDING;
  const needsBranch = !selectedBranch || selectedBranch === ALL_BRANCHES;
  const send = async (path, body) => {
    const res = await fetch(apiUrl(path), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body || {}),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(getCleanErrorMessage(data, t("batch.closeError")));
    return data;
  };
  const handleClose = async () => {
    setErrorMessage("");
    if (needsBranch) {
      setErrorMessage(t("batch.branchRequired"));
      return;
    }
    if (chosen.length === 0 || payableTotal <= 0) {
      setErrorMessage(t("batch.nothingPayable"));
      return;
    }
    setIsProcessing(true);
    try {
      const data = await send("/payroll/runs", {
        branch_id: selectedBranch,
        shamsi_year: afghanMonthInfo?.shamsi_year,
        shamsi_month: afghanMonthInfo?.shamsi_month,
        payment_date: formatToGregorian(new Date()),
        employee_ids: chosen.map((row) => row.id),
      });
      onDone?.(data?.message);
      onClose();
    } catch (err) {
      setErrorMessage(getCleanErrorMessage(err, t("batch.closeError")));
    } finally {
      setIsProcessing(false);
    }
  };
  const handleCancel = async () => {
    setErrorMessage("");
    setIsProcessing(true);
    try {
      const data = await send(`/payroll/runs/${run.id}/cancel`);
      onDone?.(data?.message);
      onClose();
    } catch (err) {
      setErrorMessage(getCleanErrorMessage(err, t("batch.cancelError")));
    } finally {
      setIsProcessing(false);
    }
  };
  if (!isOpen) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs font-sans"
      dir="rtl"
    >
      <div className="w-full max-w-2xl rounded-modal bg-white shadow-2xl border border-gray-200 overflow-hidden max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-card bg-emerald-50 text-emerald-700 flex items-center justify-center shadow-xs">
              <CheckCheck className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-section-title text-gray-900">{t("batch.title")}</h3>
              <p className="text-caption-text text-gray-500">{t("batch.subtitle")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("actions.close", { ns: "common" })}
            className="w-8 h-8 rounded-btn flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className={`${TILE} flex items-center gap-2.5`}>
              <Calendar className="w-5 h-5 text-gray-500 shrink-0" />
              <div>
                <span className="text-caption-text text-gray-500 font-medium block">{t("batch.period")}</span>
                <span className="text-body-text font-bold text-gray-900 block mt-0.5">
                  {t("batch.periodValue", { month: monthName, year: yearName })}
                </span>
              </div>
            </div>
            <div className={`${TILE} flex items-center gap-2.5`}>
              <Building2 className="w-5 h-5 text-gray-500 shrink-0" />
              <div>
                <span className="text-caption-text text-gray-500 font-medium block">{t("batch.branch")}</span>
                <span className="text-body-text font-bold text-gray-900 block mt-0.5">{branchName}</span>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-card p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-body-text font-bold text-gray-800 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-slate-800" />
                <span>{t("batch.overview")}</span>
              </span>
              <span className="text-label-text font-mono font-bold text-gray-700">
                {t("batch.totalEmployees", { count: payrollList.length })}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-200">
              <div className="bg-emerald-50 border border-emerald-200 rounded-card p-3">
                <span className="text-caption-text text-emerald-800 font-medium block">
                  {t("batch.settledSoFar")}
                </span>
                <span className="text-body-text font-bold text-emerald-900 block mt-0.5">
                  {t("batch.peopleUnit", { count: settled.length })}
                </span>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-card p-3">
                <span className="text-caption-text text-amber-900 font-medium block">{t("batch.pending")}</span>
                <span className="text-body-text font-bold text-amber-900 block mt-0.5">
                  {t("batch.peopleUnit", { count: pending.length })}
                </span>
              </div>
            </div>
            {!isClosed && pending.length > 0 && (
              <div className="pt-2 border-t border-gray-200 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-label-text text-gray-700">{t("batch.chooseCollectors")}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setCollectorIds(collectorIds.length === pending.length ? [] : pending.map((row) => row.id))
                    }
                    className="px-3 py-1 rounded-badge border border-gray-300 bg-white text-caption-text font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
                  >
                    {t(collectorIds.length === pending.length ? "batch.untickAll" : "batch.tickAll")}
                  </button>
                </div>
                <p className="text-caption-text text-gray-500">{t("batch.collectorsHint")}</p>
                <div className="max-h-56 overflow-y-auto border border-gray-200 rounded-card divide-y divide-gray-200">
                  {pending.map((row) => (
                    <label
                      key={row.id}
                      className="flex items-center justify-between gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50"
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isCollecting(row.id)}
                          onChange={() => toggleCollector(row.id)}
                          className="cursor-pointer"
                        />
                        <span className="text-table-cell-text text-gray-800">{row.full_name}</span>
                        <span className="font-mono text-caption-text text-gray-400" dir="ltr">
                          {row.employee_ID}
                        </span>
                      </span>
                      <span className="font-mono text-table-cell-text font-bold text-gray-800" dir="ltr">
                        {money(row.remaining)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-200">
              <span className="text-body-text font-bold text-gray-800">{t("batch.payableTotal")}</span>
              <span className="text-label-text font-mono font-bold text-gray-900">
                {money(payableTotal)}
                <span className="text-caption-text font-sans font-normal text-gray-500 mr-2">
                  {t("batch.peopleUnit", { count: chosen.length })}
                </span>
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <span className="text-body-text font-bold text-gray-800">{t("batch.chooseAction")}</span>
            {isClosed ? (
              <div className="rounded-card border border-emerald-200 bg-emerald-50 p-3 space-y-1.5">
                <p className="text-body-text font-bold text-emerald-900 flex items-center gap-1.5">
                  <FileText className="w-4 h-4" />
                  {t("batch.closedTitle")}
                </p>
                <p className="text-caption-text font-medium text-emerald-900">
                  {t(isPendingRun ? "batch.closedPending" : "batch.closedPaid", {
                    voucher: run?.expense?.voucher_no || "—",
                    amount: money(run?.total_amount),
                  })}
                </p>
              </div>
            ) : (
              <p className="text-caption-text font-medium text-gray-600 rounded-card border border-gray-200 bg-gray-50 p-3">
                {t("batch.closeHint")}
              </p>
            )}
            {isPendingRun && (
              <label className="flex items-start gap-2 rounded-card border border-rose-200 bg-rose-50 p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cancelAcknowledged}
                  onChange={(event) => setCancelAcknowledged(event.target.checked)}
                  className="mt-0.5 cursor-pointer"
                />
                <span>
                  <span className="text-body-text font-bold text-rose-900 block">{t("batch.cancelClose")}</span>
                  <span className="text-caption-text font-medium text-rose-800 block mt-0.5">
                    {t("batch.cancelHint")}
                  </span>
                  <span className="text-caption-text font-medium text-rose-900 block mt-1">
                    {t("batch.cancelConfirm")}
                  </span>
                </span>
              </label>
            )}
          </div>
          {errorMessage && (
            <div role="alert" className="rounded-card border border-rose-200 bg-rose-50 px-3 py-2 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-700 mt-0.5 shrink-0" />
              <p className="text-caption-text font-medium text-rose-800">{errorMessage}</p>
            </div>
          )}
        </div>
        <div className="border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-2.5 px-5 py-3.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="rounded-btn bg-white border border-gray-300 px-4 py-2 text-btn-text font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-70 cursor-pointer"
          >
            {t("actions.cancel", { ns: "common" })}
          </button>
          {isPendingRun ? (
            <button
              type="button"
              onClick={handleCancel}
              disabled={isProcessing || !cancelAcknowledged}
              className="inline-flex items-center gap-1.5 rounded-btn bg-rose-600 hover:bg-rose-700 px-4 py-2 text-btn-text font-bold text-white disabled:opacity-70 cursor-pointer"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              <span>{isProcessing ? t("batch.processing") : t("batch.confirmCancel")}</span>
            </button>
          ) : (
            !isClosed && (
              <button
                type="button"
                onClick={handleClose}
                disabled={isProcessing || pending.length === 0 || payableTotal <= 0}
                className="inline-flex items-center gap-1.5 rounded-btn bg-slate-800 hover:bg-slate-900 px-4 py-2 text-btn-text font-bold text-white disabled:opacity-70 cursor-pointer"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
                <span>
                  {isProcessing ? t("batch.processing") : t("batch.confirmClose", { count: pending.length })}
                </span>
              </button>
            )
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
