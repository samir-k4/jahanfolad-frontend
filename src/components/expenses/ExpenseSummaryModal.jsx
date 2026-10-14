import { useCallback, useEffect, useRef, useState } from "react";
import { printReportFrame, useReportFrameHeight } from "../../utils/reportFrame";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { BarChart3, CalendarDays, Download, Loader2, Printer, X } from "lucide-react";
import DatePicker from "react-multi-date-picker";
import { DateObject, persian, persian_af } from "../../utils/dateHelpers";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useReportPreview from "../../hooks/useReportPreview";
import useExpenseTypes from "../../hooks/useExpenseTypes";
import { showToast } from "../../utils";
import { getCleanErrorMessage } from "../../utils/errorHandler";
import CustomDropdown from "../common/CustomDropdown";
const HTML_PATH = "/expenses/monthly-summary-html";
const PDF_PATH = "/expenses/monthly-summary-pdf";
const ALL_TYPES = "all";
const PAGE_WIDTH_PX = 793.7;
const PAGE_PAD_X_PX = 38;
const PAGE_PAD_TOP_PX = 38;
const PAGE_PAD_BOTTOM_PX = 38;
const SHEET_WIDTH_PX = PAGE_WIDTH_PX - PAGE_PAD_X_PX * 2;
const MIN_SHEET_HEIGHT_PX = 500;
const VIEWPORT_PADDING_PX = 32;
const MIN_PREVIEW_SCALE = 0.4;
const REMEASURE_DELAY_MS = 150;
export default function ExpenseSummaryModal({ isOpen, onClose }) {
  useBodyScrollLock(isOpen);
  const { t } = useTranslation("expenses");
  const { types: expenseTypes } = useExpenseTypes(isOpen);
  const [month, setMonth] = useState(() => new DateObject({ calendar: persian, locale: persian_af }));
  const [typeId, setTypeId] = useState(ALL_TYPES);
  const [scale, setScale] = useState(1);
  const viewportRef = useRef(null);
  const buildPayload = useCallback(
    () => ({
      shamsi_year: month.year,
      shamsi_month: month.month.number,
      expense_type_id: typeId !== ALL_TYPES ? typeId : undefined,
    }),
    [month, typeId]
  );
  const onError = useCallback(
    (err) => showToast.error(getCleanErrorMessage(err, t("summary.loadError"))),
    [t]
  );
  const { iframeRef, reportHtml, isLoadingPreview, isDownloading, downloadPdf, print } =
    useReportPreview({
      isOpen,
      htmlPath: HTML_PATH,
      pdfPath: PDF_PATH,
      buildPayload,
      fallbackFilename: () => t("summary.fallbackFile"),
      onError,
    });
  useEffect(() => {
    const node = viewportRef.current;
    if (!isOpen || !node) return undefined;
    const fit = () => {
      const available = node.clientWidth - VIEWPORT_PADDING_PX;
      if (available <= 0) return;
      setScale(Math.min(1, Math.max(MIN_PREVIEW_SCALE, available / PAGE_WIDTH_PX)));
    };
    fit();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", fit);
      return () => window.removeEventListener("resize", fit);
    }
    const observer = new ResizeObserver(fit);
    observer.observe(node);
    return () => observer.disconnect();
  }, [isOpen, isLoadingPreview]);
  const [sheetHeight, setSheetHeight] = useReportFrameHeight(iframeRef, MIN_SHEET_HEIGHT_PX);
  if (!isOpen) return null;
  const busy = isLoadingPreview || isDownloading;
  const pageHeight = PAGE_PAD_TOP_PX + sheetHeight + PAGE_PAD_BOTTOM_PX;
  const typeOptions = [
    { value: ALL_TYPES, label: t("filters.allTypes") },
    ...expenseTypes.map((type) => ({ value: String(type.id), label: type.name })),
  ];
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-overlay/50 backdrop-blur-xs font-sans"
      dir="rtl"
    >
      <div className="w-full max-w-[980px] rounded-modal bg-surface shadow-2xl border border-line overflow-hidden max-h-[94vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-line flex items-center justify-between gap-3 bg-surface shrink-0 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-card bg-accent-subtle text-accent-strong flex items-center justify-center shrink-0">
              <BarChart3 className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-section-title text-content-strong">{t("summary.modalTitle")}</h3>
              <p className="text-caption-text text-content-subtle font-medium">{t("summary.modalSubtitle")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 bg-surface border border-line-strong rounded-input px-2.5 py-1.5">
              <CalendarDays size={15} className="text-content-faint" />
              <DatePicker
                value={month}
                onChange={(date) => date && setMonth(date)}
                calendar={persian}
                locale={persian_af}
                onlyMonthPicker
                format="YYYY/MM"
                calendarPosition="bottom-right"
                portal
                zIndex={9999}
                inputClass="bg-transparent text-xs font-bold text-content outline-none cursor-pointer w-20 text-center font-sans border-0 shadow-none focus:ring-0 p-0"
                containerClassName="w-auto"
              />
            </div>
            <CustomDropdown
              value={typeId}
              onChange={setTypeId}
              options={typeOptions}
              buttonClassName="h-9 px-3 text-xs font-medium text-content-body bg-surface border border-line-strong rounded-input min-w-[150px]"
              width="w-52"
            />
            <button
              type="button"
              onClick={onClose}
              aria-label={t("actions.close", { ns: "common" })}
              className="w-8 h-8 rounded-btn flex items-center justify-center text-content-faint hover:text-content-muted hover:bg-surface-subtle transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div ref={viewportRef} className="flex-1 overflow-auto bg-surface-subtle p-4">
          {isLoadingPreview ? (
            <div className="flex flex-col items-center justify-center gap-3 py-24 text-content-muted">
              <Loader2 className="w-7 h-7 animate-spin text-accent" />
              <span className="text-label-text">{t("summary.loading")}</span>
            </div>
          ) : (
            <div
              className="mx-auto"
              style={{
                width: `${Math.round(PAGE_WIDTH_PX * scale)}px`,
                height: `${Math.round(pageHeight * scale)}px`,
              }}
            >
              <div
                className="bg-surface shadow-lg border border-line-strong rounded-card"
                style={{
                  width: `${PAGE_WIDTH_PX}px`,
                  height: `${pageHeight}px`,
                  padding: `${PAGE_PAD_TOP_PX}px ${PAGE_PAD_X_PX}px ${PAGE_PAD_BOTTOM_PX}px`,
                  boxSizing: "border-box",
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                }}
              >
                <iframe
                  ref={iframeRef}
                  srcDoc={reportHtml}
                  scrolling="no"
                  title={t("summary.iframeTitle")}
                  sandbox="allow-scripts allow-modals"
                  className="bg-surface block"
                  style={{
                    width: `${SHEET_WIDTH_PX}px`,
                    height: `${sheetHeight}px`,
                    border: "none",
                    padding: 0,
                  }}
                />
              </div>
            </div>
          )}
        </div>
        <div className="px-6 py-3.5 bg-surface-muted border-t border-line flex justify-between items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-btn-text font-bold text-content-body bg-surface hover:bg-surface-subtle rounded-btn border border-line-strong transition-colors cursor-pointer"
          >
            {t("actions.close", { ns: "common" })}
          </button>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={downloadPdf}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-surface hover:bg-surface-muted text-content-body border border-line-strong rounded-btn text-btn-text font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>{isDownloading ? t("summary.downloading") : t("summary.downloadPdf")}</span>
            </button>
            <button
              type="button"
              onClick={print}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-accent hover:bg-accent-hover text-content-inverse rounded-btn text-btn-text font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="w-4 h-4" />
              <span>{t("summary.print")}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
