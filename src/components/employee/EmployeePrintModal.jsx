import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { printReportFrame, useReportFrameHeight } from "../../utils/reportFrame";
import { createPortal } from "react-dom";
import { Printer, Download, X, FileText, Loader2, RotateCw, ZoomIn, ZoomOut, DollarSign } from "lucide-react";
import { apiUrl } from "../../api";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useEmployees from "../../hooks/useEmployees";
import CustomDropdown from "../common/CustomDropdown";
import { BranchSelect } from "../common";
import { useTranslation } from "react-i18next";

const buildReportParams = (branch, category, salary) => {
  const params = new URLSearchParams();
  if (branch && branch !== "all") params.append("branch_id", branch);
  if (category && category !== "all") params.append("category", category);
  if (salary) params.append("show_salary", "true");
  return params.toString();
};

const downloadPdf = async (url, branches, selectedBranch, t) => {
  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/pdf" },
  });
  if (!response.ok) throw new Error(t("printModal.errorPdfDownload"));
  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  const branchName =
    selectedBranch === "all" || !selectedBranch
      ? t("filters.allBranches", { ns: "common" })
      : branches.find((b) => String(b.id) === String(selectedBranch))?.name ||
        t("printModal.fallbackBranch");
  const cleanBranch = branchName.replace(/\s+/g, "_");
  link.download = t("printModal.listFilename", { branchName: cleanBranch });
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);
};

export default function EmployeePrintModal({ isOpen, onClose, branches = [], activeBranchId = "" }) {
  const { t } = useTranslation("employee");
  useBodyScrollLock(isOpen);
  const { categories } = useEmployees();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedBranch, setSelectedBranch] = useState(activeBranchId || "all");
  const [showSalary, setShowSalary] = useState(false);
  const [reportHtml, setReportHtml] = useState("");
  const [isLoadingPreview, setIsLoadingPreview] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const iframeRef = useRef(null);

  const categoryOptions = useMemo(() => {
    return [
      { value: "all", label: t("printModal.categoryAll") },
      ...categories.map((c) => ({ value: c.name, label: c.name })),
    ];
  }, [categories]);

  useEffect(() => {
    if (activeBranchId) setSelectedBranch(activeBranchId);
  }, [activeBranchId]);

  const [iframeHeight, setIframeHeight] = useReportFrameHeight(iframeRef, 800);

  const fetchReportHtml = useCallback(async () => {
    if (!isOpen) return;
    try {
      setIsLoadingPreview(true);
      const params = buildReportParams(selectedBranch, selectedCategory, showSalary);
      const res = await fetch(apiUrl(`/employee-reports/list-html?${params}`), {
        method: "GET",
        headers: { Accept: "text/html, application/json" },
      });
      if (!res.ok) throw new Error(t("printModal.errorTitle"));
      const html = await res.text();
      setReportHtml(html);
    } catch {
      setReportHtml(`
        <div style="font-family: sans-serif; text-align: center; padding: 40px; color: #dc2626;" dir="rtl">
          <h3>${t("printModal.errorTitle")}</h3>
          <p>${t("printModal.errorDesc")}</p>
        </div>
      `);
    } finally {
      setIsLoadingPreview(false);
    }
  }, [isOpen, selectedBranch, selectedCategory, showSalary]);

  useEffect(() => {
    if (isOpen) {
      fetchReportHtml();
    } else {
      setReportHtml("");
      setIsLoadingPreview(true);
      setZoomScale(1);
    }
  }, [isOpen, fetchReportHtml]);


  const handlePrint = () => {
    printReportFrame(iframeRef.current);
  };

  const handleDownloadPdf = async () => {
    try {
      setIsDownloading(true);
      const params = buildReportParams(selectedBranch, selectedCategory, showSalary);
      await downloadPdf(
        apiUrl(`/employee-reports/list-pdf?${params}`),
        branches,
        selectedBranch,
        t,
      );
    } catch {
      alert(t("printModal.errorPdfDownload"));
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs font-sans animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="bg-white rounded-modal shadow-2xl border border-gray-200 w-full max-w-[1240px] h-[94vh] flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-card bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800">
              <FileText size={18} />
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900 leading-tight">{t("printModal.title")}</h2>
              <p className="text-[11px] text-gray-500 font-medium">{t("printModal.subtitle")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-44">
              <CustomDropdown
                options={categoryOptions}
                value={selectedCategory}
                onChange={setSelectedCategory}
                usePortal={true}
                buttonClassName="w-full h-8 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-input px-2.5 text-xs text-gray-800 font-medium outline-none text-right"
              />
            </div>
            <div className="w-48">
              <BranchSelect
                variant="searchable"
                value={selectedBranch}
                onChange={setSelectedBranch}
                includeAll
                allLabel={t("filters.allBranches", { ns: "common" })}
                placeholder={t("form.branch")}
                usePortal={true}
                buttonClassName="w-full h-8 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-input px-2.5 text-xs text-gray-800 font-medium outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowSalary(!showSalary)}
              className={`h-8 px-2.5 rounded-btn border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                showSalary ? "bg-slate-800 text-white border-slate-800" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              <DollarSign size={13} />
              <span>{t("list.colSalary")}</span>
            </button>
            <div className="h-5 w-px bg-gray-200 mx-0.5" />
            <div className="flex items-center bg-gray-100 border border-gray-300 rounded-btn p-0.5 gap-0.5">
              <button
                type="button"
                onClick={() => setZoomScale((s) => Math.max(0.65, Number((s - 0.05).toFixed(2))))}
                className="p-1 hover:text-gray-900 hover:bg-gray-200 rounded-btn transition-colors cursor-pointer"
                title={t("pdf.zoomOut", { ns: "common" })}
              >
                <ZoomOut size={13} />
              </button>
              <button
                type="button"
                onClick={() => setZoomScale(1)}
                className="px-1.5 py-0.5 text-xs font-bold text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
                title={t("pdf.zoomReset", { ns: "common" })}
              >
                {Math.round(zoomScale * 100)}%
              </button>
              <button
                type="button"
                onClick={() => setZoomScale((s) => Math.min(1.3, Number((s + 0.05).toFixed(2))))}
                className="p-1 hover:text-gray-900 hover:bg-gray-200 rounded-btn transition-colors cursor-pointer"
                title={t("pdf.zoomIn", { ns: "common" })}
              >
                <ZoomIn size={13} />
              </button>
            </div>
            <button
              type="button"
              onClick={fetchReportHtml}
              className="p-1.5 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900 rounded-btn border border-gray-300 transition-colors cursor-pointer shadow-2xs"
              title={t("pdf.reload", { ns: "common" })}
            >
              <RotateCw size={14} className={isLoadingPreview ? "animate-spin text-slate-800" : ""} />
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-btn shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              <span>{isDownloading ? t("printModal.downloading") : t("actions.downloadPdf", { ns: "common" })}</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={isLoadingPreview}
              className="px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-btn border border-gray-300 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              <Printer size={14} />
              <span>{t("actions.print", { ns: "common" })}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-btn transition-colors cursor-pointer"
              title={t("actions.closeWindow", { ns: "common" })}
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6 sm:p-6 flex justify-center items-start  relative">
          {isLoadingPreview && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10 backdrop-blur-xs">
              <div className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2.5 rounded-btn shadow-xl text-gray-800 text-xs font-bold">
                <Loader2 size={16} className="animate-spin text-slate-800" />
                <span>{t("printModal.loadingPreview")}</span>
              </div>
            </div>
          )}
          <div
            className="relative shrink-0 mx-auto   overflow-hidden"
            style={{
              width: `${1122.5 * zoomScale}px`,
              height: `${iframeHeight * zoomScale}px`,
              transition: "width 120ms ease, height 120ms ease",
            }}
          >
            <iframe
              ref={iframeRef}
              srcDoc={reportHtml}
              sandbox="allow-scripts allow-modals"
              scrolling="no"
              title={t("printModal.iframeTitle")}
              className="bg-white border-none block rounded-modal pointer-events-auto"
              style={{
                width: "1122.5px",
                height: `${iframeHeight}px`,
                transform: `scale(${zoomScale})`,
                transformOrigin: "top right",
                overflow: "hidden",
              }}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
