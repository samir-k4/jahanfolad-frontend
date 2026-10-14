import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { printReportFrame, useReportFrameHeight } from "../../utils/reportFrame";
import { createPortal } from "react-dom";
import { Printer, Download, X, FileText, Loader2, RotateCw, ZoomIn, ZoomOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { apiUrl } from "../../api";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import CustomDropdown from "../common/CustomDropdown";
import { DateObject, persian, persian_af, formatToGregorian } from "../../utils/dateHelpers";
import { JOB_CATEGORY } from "../../constants/attendanceDomain";

const SHEET_WIDTH_PX = 1122.5;
const MIN_SHEET_HEIGHT_PX = 794;
const ZOOM_MIN = 0.65;
const ZOOM_MAX = 1.3;
const ZOOM_STEP = 0.05;
const DEFAULT_YEAR = 1404;
const MID_MONTH_DAY = 15;

export default function AttendanceMonthlyPreviewModal({
  isOpen,
  onClose,
  selectedBranch,
  branchName,
  selectedDateObject,
  afghanMonthInfo,
}) {
  const { t } = useTranslation("attendance");
  useBodyScrollLock(isOpen);

  const initialMonth = useMemo(() => {
    if (afghanMonthInfo?.shamsi_month) return String(afghanMonthInfo.shamsi_month);
    if (selectedDateObject?.month?.number) return String(selectedDateObject.month.number);
    return "1";
  }, [afghanMonthInfo, selectedDateObject]);

  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isBlankMode, setIsBlankMode] = useState(false);
  const [reportHtml, setReportHtml] = useState("");
  const [isLoadingPreview, setIsLoadingPreview] = useState(true);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const iframeRef = useRef(null);

  const monthOptions = useMemo(
    () =>
      t("monthlyPreviewModal.months", { returnObjects: true }).map((label, index) => ({
        value: String(index + 1),
        label,
      })),
    [t]
  );

  const categoryOptions = useMemo(
    () => [
      { value: "all", label: t("monthlyPreviewModal.allDepartments") },
      { value: JOB_CATEGORY.HANGAR, label: JOB_CATEGORY.HANGAR },
      { value: JOB_CATEGORY.OFFICE, label: t("monthlyPreviewModal.officeEmployees") },
      { value: JOB_CATEGORY.REPRESENTATION, label: t("monthlyPreviewModal.representationEmployees") },
      { value: JOB_CATEGORY.SECURITY, label: t("monthlyPreviewModal.securityEmployees") },
      { value: JOB_CATEGORY.KITCHEN, label: t("monthlyPreviewModal.kitchenEmployees") },
    ],
    [t]
  );

  const [iframeHeight, setIframeHeight] = useReportFrameHeight(iframeRef, 800);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedMonth(initialMonth);
    setSelectedCategory("all");
    setIsBlankMode(false);
    setZoomScale(1);
  }, [isOpen, initialMonth]);

  const dateStr = useMemo(() => {
    try {
      return formatToGregorian(
        new DateObject({
          calendar: persian,
          locale: persian_af,
          year: Number(afghanMonthInfo?.shamsi_year || selectedDateObject?.year || DEFAULT_YEAR),
          month: Number(selectedMonth),
          day: MID_MONTH_DAY,
        })
      );
    } catch {
      return formatToGregorian(selectedDateObject) || new Date().toISOString().substring(0, 10);
    }
  }, [selectedMonth, afghanMonthInfo, selectedDateObject]);

  const reportParams = useCallback(() => {
    const params = new URLSearchParams();
    if (selectedBranch && selectedBranch !== "all") params.append("branch_id", selectedBranch);
    if (dateStr) params.append("date", dateStr);
    if (selectedCategory && selectedCategory !== "all") params.append("category", selectedCategory);
    if (isBlankMode) params.append("is_blank", "true");
    return params.toString();
  }, [selectedBranch, dateStr, selectedCategory, isBlankMode]);

  const fetchReportHtml = useCallback(async () => {
    if (!isOpen) return;
    try {
      setIsLoadingPreview(true);
      const res = await fetch(apiUrl(`/attendances/monthly-sheet-html?${reportParams()}`), {
        method: "GET",
        headers: { Accept: "text/html, application/json" },
      });
      if (!res.ok) throw new Error(t("monthlyPreviewModal.errorTitle"));
      setReportHtml(await res.text());
    } catch {
      setReportHtml(`
        <div style="font-family: sans-serif; text-align: center; padding: 40px; color: #dc2626;" dir="rtl">
          <h3>${t("monthlyPreviewModal.errorTitle")}</h3>
          <p>${t("monthlyPreviewModal.errorDesc")}</p>
        </div>
      `);
    } finally {
      setIsLoadingPreview(false);
    }
  }, [isOpen, reportParams, t]);

  useEffect(() => {
    if (isOpen) {
      fetchReportHtml();
    } else {
      setReportHtml("");
      setIsLoadingPreview(true);
    }
  }, [isOpen, fetchReportHtml]);


  const handlePrint = () => {
    printReportFrame(iframeRef.current);
  };

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    let objectUrl;
    try {
      const res = await fetch(apiUrl(`/attendances/monthly-sheet-pdf?${reportParams()}`));
      if (!res.ok) {
        handlePrint();
        return;
      }
      const blob = await res.blob();
      objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${t(
        isBlankMode ? "monthlyPreviewModal.fileNameBlank" : "monthlyPreviewModal.fileName",
        { month: selectedMonth }
      )}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      handlePrint();
    } finally {
      if (objectUrl) window.URL.revokeObjectURL(objectUrl);
      setIsDownloadingPdf(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs font-sans animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="bg-white rounded-modal shadow-2xl border border-gray-200 w-full max-w-[1300px] h-[95vh] flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-btn bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800">
              <FileText size={18} />
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900 leading-tight">
                {t("monthlyPreviewModal.title")}
              </h2>
              <p className="text-[11px] text-gray-500 font-medium">
                {branchName || t("filters.allBranches", { ns: "common" })} •{" "}
                {t("monthlyPreviewModal.subtitle")} {t("company.name", { ns: "common" })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-36">
              <CustomDropdown
                options={monthOptions}
                value={selectedMonth}
                onChange={setSelectedMonth}
                placeholder={t("monthlyPreviewModal.selectMonth")}
                usePortal={true}
                icon={null}
                buttonClassName="w-full h-8 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-input px-2.5 text-xs text-gray-800 font-medium outline-none text-right"
              />
            </div>

            <div className="w-44">
              <CustomDropdown
                options={categoryOptions}
                value={selectedCategory}
                onChange={setSelectedCategory}
                placeholder={t("monthlyPreviewModal.selectCategory")}
                usePortal={true}
                icon={null}
                buttonClassName="w-full h-8 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-input px-2.5 text-xs text-gray-800 font-medium outline-none text-right"
              />
            </div>

            <button
              type="button"
              onClick={() => setIsBlankMode((prev) => !prev)}
              className={`h-8 px-3 rounded-btn border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isBlankMode
                  ? "bg-amber-800 text-white border-amber-800 shadow-xs"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-2xs"
              }`}
              title={t("monthlyPreviewModal.blankModeTitle")}
            >
              <FileText size={13} />
              <span>
                {isBlankMode
                  ? t("monthlyPreviewModal.blankModeDisable")
                  : t("monthlyPreviewModal.blankModeEnable")}
              </span>
            </button>

            <div className="h-5 w-px bg-gray-200 mx-0.5" />

            <div className="flex items-center bg-gray-100 border border-gray-300 rounded-btn p-0.5 gap-0.5">
              <button
                type="button"
                onClick={() => setZoomScale((s) => Math.max(ZOOM_MIN, Number((s - ZOOM_STEP).toFixed(2))))}
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
                onClick={() => setZoomScale((s) => Math.min(ZOOM_MAX, Number((s + ZOOM_STEP).toFixed(2))))}
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
              onClick={handlePrint}
              disabled={isLoadingPreview}
              className="px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-btn border border-gray-300 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              <Printer size={14} />
              <span>{t("actions.print", { ns: "common" })}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-btn shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {isDownloadingPdf ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Download size={14} />
              )}
              <span>{t("actions.downloadPdf", { ns: "common" })}</span>
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

        <div className="flex-1 overflow-auto p-4 sm:p-6 flex justify-center items-start relative">
          {isLoadingPreview && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10 backdrop-blur-xs">
              <div className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2.5 rounded-btn shadow-xl text-gray-800 text-xs font-bold">
                <Loader2 size={16} className="animate-spin text-slate-800" />
                <span>{t("monthlyPreviewModal.loadingPreview")}</span>
              </div>
            </div>
          )}

          <div
            className="relative shrink-0 mx-auto  overflow-hidden"
            style={{
              width: `${SHEET_WIDTH_PX * zoomScale}px`,
              height: `${iframeHeight * zoomScale}px`,
              transition: "width 120ms ease, height 120ms ease",
            }}
          >
            <iframe
              ref={iframeRef}
              srcDoc={reportHtml}
              sandbox="allow-scripts allow-modals"
              scrolling="no"
              title={t("monthlyPreviewModal.iframeTitle")}
              className="bg-white border-none block rounded-modal pointer-events-auto"
              style={{
                width: `${SHEET_WIDTH_PX}px`,
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
