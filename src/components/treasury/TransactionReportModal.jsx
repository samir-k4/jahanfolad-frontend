import { useState, useEffect, useRef, useMemo } from "react";
import { printReportFrame } from "../../utils/reportFrame";
import { createPortal } from "react-dom";
import {
  FileText,
  X,
  Printer,
  Download,
  Calendar,
  Loader2,
  SlidersHorizontal,
  ZoomIn,
  ZoomOut,
  Eye,
} from "lucide-react";
import DatePicker from "react-multi-date-picker";
import { DateObject, persian, persian_af } from "../../utils/dateHelpers";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import { CustomDropdown, SearchableSelect } from "../common";
import { useTranslation } from "react-i18next";
import { apiUrl } from "../../api";
import { showToast } from "../../utils/toast";
import { getCleanErrorMessage } from "../../utils/errorHandler";
import { toEnglishDigits } from "../../utils";
const PRESET_OPTION_KEYS = [
  ["today", "datePreset.today", "common"],
  ["last_7_days", "datePreset.last_7_days", "common"],
  ["current_month", "datePreset.current_month", "common"],
  ["last_30_days", "datePreset.last_30_days", "common"],
  ["all", "report.allDocs"],
];
export default function TransactionReportModal({
  isOpen,
  onClose,
  vaults = [],
  namespace = "treasury",
}) {
  const { t } = useTranslation(namespace);
  const PRESET_OPTIONS = useMemo(
    () => PRESET_OPTION_KEYS.map(([key, label, ns]) => ({
      key,
      label: t(label, ns ? { ns } : undefined),
    })),
    [t]
  );
  useBodyScrollLock(isOpen);
  const [viewMode, setViewMode] = useState("filters");
  const [zoomScale, setZoomScale] = useState(1.0);
  const [activePreset, setActivePreset] = useState("current_month");
  const [startDate, setStartDate] = useState(() => {
    const d = new DateObject({ calendar: persian, locale: persian_af });
    d.setDay(1);
    return d;
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new DateObject({ calendar: persian, locale: persian_af });
    const days =
      d.month.length ||
      (d.month.number <= 6 ? 31 : d.month.number <= 11 ? 30 : 29);
    d.setDay(days);
    return d;
  });
  const [selectedVault, setSelectedVault] = useState("all");
  const [selectedCurrency, setSelectedCurrency] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [categories, setCategories] = useState([]);
  const showDateRange = activePreset === "all" || activePreset === "custom";
  const [reportHtml, setReportHtml] = useState("");
  const [reportQueryParams, setReportQueryParams] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const iframeRef = useRef(null);
  useEffect(() => {
    if (isOpen) {
      setViewMode("filters");
      setActivePreset("current_month");
      setZoomScale(1.0);
      const dStart = new DateObject({ calendar: persian, locale: persian_af });
      dStart.setDay(1);
      const dEnd = new DateObject({ calendar: persian, locale: persian_af });
      const days =
        dEnd.month.length ||
        (dEnd.month.number <= 6 ? 31 : dEnd.month.number <= 11 ? 30 : 29);
      dEnd.setDay(days);
      setStartDate(dStart);
      setEndDate(dEnd);
      fetch(apiUrl("/vault-transaction-categories"))
        .then((res) => res.json())
        .then((data) => {
          if (data && Array.isArray(data.data)) {
            setCategories(data.data);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);
  if (!isOpen) return null;
  const handlePreset = (preset) => {
    setActivePreset(preset);
    if (preset === "today") {
      const t = new DateObject({ calendar: persian, locale: persian_af });
      setStartDate(t);
      setEndDate(new DateObject(t));
    } else if (preset === "last_7_days") {
      const t = new DateObject({ calendar: persian, locale: persian_af });
      setStartDate(new DateObject(t).subtract(6, "days"));
      setEndDate(t);
    } else if (preset === "last_30_days") {
      const t = new DateObject({ calendar: persian, locale: persian_af });
      setStartDate(new DateObject(t).subtract(29, "days"));
      setEndDate(t);
    } else if (preset === "current_month") {
      const s = new DateObject({ calendar: persian, locale: persian_af });
      s.setDay(1);
      const e = new DateObject({ calendar: persian, locale: persian_af });
      const days =
        e.month.length ||
        (e.month.number <= 6 ? 31 : e.month.number <= 11 ? 30 : 29);
      e.setDay(days);
      setStartDate(s);
      setEndDate(e);
    } else if (preset === "all") {
      setStartDate(null);
      setEndDate(null);
    }
  };
  const handleFetchReportData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("preset", activePreset);
      if (startDate) {
        params.append("from_date", toEnglishDigits(startDate.format("YYYY/MM/DD")));
      }
      if (endDate) {
        params.append("to_date", toEnglishDigits(endDate.format("YYYY/MM/DD")));
      }
      if (selectedVault !== "all") {
        params.append("vault_id", selectedVault);
      }
      if (selectedCurrency !== "all") {
        params.append("currency", selectedCurrency);
      }
      if (selectedType !== "all") {
        params.append("type", selectedType);
      }
      if (selectedCategory !== "all") {
        params.append("category_id", selectedCategory);
      }
      const queryStr = params.toString();
      const res = await fetch(apiUrl(`/vault-transactions/report-html?${queryStr}`));
      if (!res.ok) throw new Error("Failed to load report from server");
      const html = await res.text();
      setReportHtml(html);
      setReportQueryParams(queryStr);
      setViewMode("preview");
    } catch (err) {
      console.error(err);
      showToast.error(getCleanErrorMessage(err, t("messages.reportLoadError")));
    } finally {
      setLoading(false);
    }
  };
  const handlePrint = () => {
    printReportFrame(iframeRef.current);
  };
  const handleDownloadPdf = async () => {
    try {
      setIsDownloading(true);
      const pdfUrl = apiUrl(`/vault-transactions/report-pdf?${reportQueryParams}`);
      const res = await fetch(pdfUrl);
      if (!res.ok) throw new Error("Failed to generate PDF from server");
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      const dateStr = startDate ? startDate.format("YYYY-MM-DD") : "all";
      link.download = t("report.fileName", { date: dateStr }) + ".pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error(err);
      showToast.error(getCleanErrorMessage(err, t("messages.reportPdfError")));
    } finally {
      setIsDownloading(false);
    }
  };
  const vaultOptions = [
    { value: "all", label: t("report.allVaults") },
    ...vaults.map((v) => ({
      value: String(v.id),
      label: `${v.name} (${v.currency})`,
    })),
  ];
  const currencyOptions = [
    { value: "all", label: t("filters.allCurrencies") },
    ...Array.from(new Set(vaults.map((v) => v.currency).filter(Boolean))).map((cur) => ({
      value: cur,
      label: cur === "AFN" ? t("currency.AFN") : cur === "USD" ? t("currency.USD") : cur,
    })),
  ];
  const categoryOptions = [
    { value: "all", label: t("report.allCategories") },
    ...categories.map((c) => ({
      value: String(c.id),
      label: c.name,
    })),
  ];
  const typeOptions = [
    { value: "all", label: t("report.allTypes") },
    { value: "deposit", label: t("report.onlyDeposits") },
    { value: "withdrawal", label: t("report.onlyWithdrawals") },
    { value: "transfer", label: t("report.onlyTransfers") },
    { value: "exchange", label: t("report.onlyExchange") },
    { value: "expense", label: t("report.onlyExpenses") },
  ];
  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs font-sans"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {viewMode === "filters" ? (
        <div className="bg-white w-full max-w-2xl max-h-[92vh] rounded-modal shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 border border-gray-200">
          <div className="bg-white px-5 py-3.5 flex justify-between items-center border-b border-gray-200">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-btn bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shadow-2xs">
                <Printer size={18} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">{t("report.filterTitle")}</h3>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded-btn transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
          <div className="p-6 overflow-y-auto space-y-4 text-xs">
            <div>
              <label className="block font-medium text-gray-800 mb-1.5 flex items-center gap-1.5">
                <Calendar size={14} className="text-slate-700" />
                <span>{t("report.range")}</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_OPTIONS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handlePreset(item.key)}
                    className={`px-3 py-1.5 rounded-btn text-xs font-medium transition-all cursor-pointer border ${
                      activePreset === item.key
                        ? "bg-slate-800 text-white border-slate-800 shadow-2xs"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            {showDateRange && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">{t("report.fromDate")}</label>
                <DatePicker
                  value={startDate}
                  onChange={(val) => {
                    setStartDate(val);
                    setActivePreset("custom");
                  }}
                  calendar={persian}
                  locale={persian_af}
                  format="YYYY/MM/DD"
                  inputClass="w-full bg-white border border-gray-300 rounded-btn px-3 py-1.5 text-xs text-gray-900 font-mono outline-none focus:border-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">{t("report.toDate")}</label>
                <DatePicker
                  value={endDate}
                  onChange={(val) => {
                    setEndDate(val);
                    setActivePreset("custom");
                  }}
                  calendar={persian}
                  locale={persian_af}
                  format="YYYY/MM/DD"
                  inputClass="w-full bg-white border border-gray-300 rounded-btn px-3 py-1.5 text-xs text-gray-900 font-mono outline-none focus:border-slate-800"
                />
              </div>
            </div>}
            <div className="border-t border-gray-100 pt-4 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
              <div className="min-w-0">
                <label className="block text-xs font-medium text-gray-700 mb-1">{t("report.vault")}</label>
                <SearchableSelect
                  options={vaultOptions}
                  value={selectedVault}
                  onChange={(val) => setSelectedVault(val)}
                  placeholder={t("report.allVaultsOption")}
                  searchPlaceholder={t("report.vaultSearch")}
                  buttonClassName="w-full bg-white border border-gray-300 rounded-btn px-3 py-2 text-xs font-normal text-gray-900 outline-none hover:border-gray-400"
                  usePortal={true}
                />
              </div>
                <div className="min-w-0">
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t("vaultCreate.currencyLabel")}</label>
                  <CustomDropdown
                    options={currencyOptions}
                    value={selectedCurrency}
                    onChange={(val) => setSelectedCurrency(val)}
                    buttonClassName="w-full px-3 py-2 text-xs font-normal"
                  />
                </div>
                <div className="min-w-0">
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t("report.type")}</label>
                  <CustomDropdown
                    options={typeOptions}
                    value={selectedType}
                    onChange={(val) => setSelectedType(val)}
                    buttonClassName="w-full px-3 py-2 text-xs font-normal"
                  />
                </div>
                <div className="min-w-0">
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t("report.category")}</label>
                  <CustomDropdown
                    options={categoryOptions}
                    value={selectedCategory}
                    onChange={(val) => setSelectedCategory(val)}
                    buttonClassName="w-full px-3 py-2 text-xs font-normal"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3 border-t border-gray-200 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 rounded-btn transition-colors cursor-pointer"
            >{t("actions.cancel")}</button>
            <button
              type="button"
              onClick={handleFetchReportData}
              disabled={loading}
              className="px-5 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-btn shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{t("report.preparing")}</span>
                </>
              ) : (
                <>
                  <Eye size={16} />
                  <span>{t("report.showPreview")}</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white w-[98vw] max-w-[1450px] h-[95vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-white text-slate-900 px-5 py-3 flex items-center justify-between border-b border-slate-200 select-none shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-btn bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <FileText size={17} />
              </div>
              <div>
                <h3 className="text-section-title font-bold text-slate-900 tracking-wide">{t("report.officialPreview")}</h3>
                <span className="text-[11px] text-slate-500">{t("report.format")}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center bg-slate-800 rounded-btn border border-slate-700 p-0.5 mr-2">
                <button
                  type="button"
                  onClick={() => setZoomScale((z) => Math.max(0.6, z - 0.1))}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors cursor-pointer"
                >
                  <ZoomOut size={15} />
                </button>
                <span className="px-2 text-xs font-mono text-slate-300 select-none">
                  {Math.round(zoomScale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomScale((z) => Math.min(1.5, z + 0.1))}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors cursor-pointer"
                >
                  <ZoomIn size={15} />
                </button>
              </div>
              <button
                type="button"
                onClick={() => setViewMode("filters")}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-btn text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <SlidersHorizontal size={14} />
                <span>{t("report.changeFilters")}</span>
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-btn text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Printer size={14} />
                <span>{t("report.print")}</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isDownloading}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-btn text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isDownloading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Download size={14} />
                )}
                <span>{t("report.download")}</span>
              </button>
              <div className="w-px h-6 bg-slate-700 mx-1"></div>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-btn transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>
          <div className="flex-1 bg-slate-200/80 p-4 sm:p-6 overflow-auto flex justify-center items-start">
            <div
              className="bg-white shadow-2xl rounded-sm transition-transform duration-100 origin-top overflow-hidden border border-gray-300"
              style={{
                width: "297mm",
                minHeight: "210mm",
                transform: `scale(${zoomScale})`,
                marginBottom: `${(zoomScale - 1) * 250}px`,
              }}
            >
              <iframe
                ref={iframeRef}
                title={t("report.previewTitle")}
                srcDoc={reportHtml}
                sandbox="allow-scripts allow-modals"
                className="w-full border-none"
                style={{
                  width: "297mm",
                  height: "210mm",
                  display: "block",
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
