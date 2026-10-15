import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { printReportFrame, REPORT_FRAME_MIN_HEIGHT, useReportFrameHeight } from "../../utils/reportFrame";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  Printer,
  X,
  Search,
  Eye,
  Download,
  Loader2,
  RotateCw,
  ZoomIn,
  ZoomOut,
  SlidersHorizontal,
  CheckSquare,
  Square,
} from "lucide-react";
import DatePicker from "react-multi-date-picker";
import { persian, persian_af } from "../../utils/dateHelpers";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useDatePresets from "../../hooks/useDatePresets";
import { CustomDropdown, FilterPresetButtons } from "../common";
import { toEnglishDigits } from "../../utils/dariNumberFormatter";
import { presetLabel } from "../../utils/datePresets";
import { apiUrl } from "../../api";
const PANEL = "rounded-card border border-line bg-surface-muted/40 p-3.5 space-y-3";
const PANEL_TITLE = "text-label-text font-bold text-content-strong";
function FilterSection({ title, badge, children }) {
  return (
    <section className={PANEL}>
      <div className="flex items-center justify-between gap-2">
        <span className={PANEL_TITLE}>{title}</span>
        {badge && (
          <span className="text-caption-text text-content-muted bg-surface border border-line px-2.5 py-0.5 rounded-badge font-mono shrink-0">
            {badge}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}
export default function ExpenseReportModal({ isOpen, onClose, expenseType = null, vaults = [] }) {
  useBodyScrollLock(isOpen);
  const { t: tx } = useTranslation("expenses");
  const sourceOptions = [
    { value: "all", label: tx("reportModal.allSources") },
    { value: "vault_direct", label: tx("reportModal.vaultDirect") },
    { value: "manager_advance", label: tx("reportModal.advanceSource") },
  ];
  const sortOptions = [
    { value: "date_desc", label: tx("reportModal.sortDateDesc") },
    { value: "date_asc", label: tx("reportModal.sortDateAsc") },
    { value: "amount_desc", label: tx("reportModal.sortAmountDesc") },
    { value: "amount_asc", label: tx("reportModal.sortAmountAsc") },
    { value: "category", label: tx("reportModal.sortCategory") },
  ];
  const {
    activePreset,
    setActivePreset,
    fromDate: fromDateObj,
    setFromDate: setFromDateObj,
    toDate: toDateObj,
    setToDate: setToDateObj,
    applyPreset,
    presets,
  } = useDatePresets("all");
  const [categoryScope, setCategoryScope] = useState("all");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [categorySearch, setCategorySearch] = useState("");
  const [categories, setCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [paymentSource, setPaymentSource] = useState("all");
  const [filterCurrency, setFilterCurrency] = useState("all");
  const [filterVault, setFilterVault] = useState("all");
  const [sortBy, setSortBy] = useState("date_desc");
  const [reportTitle, setReportTitle] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [zoomScale, setZoomScale] = useState(1.0);
    const [reportHtml, setReportHtml] = useState("");
  const iframeRef = useRef(null);
  const [iframeHeight, setIframeHeight] = useReportFrameHeight(iframeRef, REPORT_FRAME_MIN_HEIGHT, 35);
  const typeSlug = expenseType?.slug || null;
  const defaultTitle = expenseType ? tx("reportModal.typeTitle", { name: expenseType.name }) : tx("reportModal.generalTitle");
  useEffect(() => {
    if (!isOpen) return;
    applyPreset("all");
    setIsExpanded(false);
    setZoomScale(1.0);
    setIframeHeight(793.7);
    setReportHtml("");
    setCategoryScope("all");
    setSelectedCategoryIds([]);
    setCategorySearch("");
    setReportTitle(defaultTitle);
    const loadCategories = async () => {
      try {
        setIsLoadingCategories(true);
        const qs = typeSlug ? `?expense_type=${encodeURIComponent(typeSlug)}` : "";
        const res = await fetch(apiUrl(`/categories/expense_category${qs}`));
        if (!res.ok) throw new Error("failed");
        const json = await res.json();
        setCategories(Array.isArray(json) ? json : []);
      } catch (err) {
        console.error(err);
        setCategories([]);
      } finally {
        setIsLoadingCategories(false);
      }
    };
    loadCategories();
  }, [isOpen, applyPreset, typeSlug, defaultTitle]);
  const visibleCategories = useMemo(() => {
    const q = categorySearch.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => (c.name || "").toLowerCase().includes(q));
  }, [categories, categorySearch]);
  const noCategorySelected = categoryScope === "selected" && selectedCategoryIds.length === 0;
  const categoryBadge =
    categoryScope === "all" ? tx("reportModal.allCategories") : tx("reportModal.selectedCategories", { count: selectedCategoryIds.length });
  const dateBadge = activePreset === "custom" ? tx("reportModal.customRange") : presetLabel(presets, activePreset);
  const toggleCategory = (id) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  const getReportParams = useCallback(() => {
    const params = new URLSearchParams();
    if (typeSlug) params.append("expense_type", typeSlug);
    if (activePreset !== "all") {
      if (fromDateObj) {
        params.append("from_date", toEnglishDigits(fromDateObj.format("YYYY/MM/DD")));
      }
      if (toDateObj) {
        params.append("to_date", toEnglishDigits(toDateObj.format("YYYY/MM/DD")));
      }
    }
    if (categoryScope === "selected" && selectedCategoryIds.length > 0) {
      params.append("category_ids", selectedCategoryIds.join(","));
    }
    if (paymentSource !== "all") params.append("payment_source", paymentSource);
    if (filterCurrency !== "all") params.append("currency", filterCurrency);
    if (filterVault !== "all") params.append("vault_id", filterVault);
    if (sortBy !== "date_desc") params.append("sort", sortBy);
    if (reportTitle.trim()) params.append("report_title", reportTitle.trim());
    return params;
  }, [
    typeSlug,
    activePreset,
    fromDateObj,
    toDateObj,
    categoryScope,
    selectedCategoryIds,
    paymentSource,
    filterCurrency,
    filterVault,
    sortBy,
    reportTitle,
  ]);
  const fetchReportHtml = useCallback(async () => {
    try {
      setIsLoadingPreview(true);
      const params = getReportParams();
      params.append("t", Date.now().toString());
      const res = await fetch(`${apiUrl("/expenses/report-html")}?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load report preview");
      const html = await res.text();
      setReportHtml(html);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingPreview(false);
    }
  }, [getReportParams]);
  if (!isOpen) return null;
  const handleOpenPreview = () => {
    setIsExpanded(true);
    fetchReportHtml();
  };
  const handlePrint = () => {
    printReportFrame(iframeRef.current);
  };
  const handleDownloadPdf = async () => {
    try {
      setIsDownloading(true);
      const params = getReportParams();
      params.append("t", Date.now().toString());
      const res = await fetch(`${apiUrl("/expenses/report-pdf")}?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to generate PDF");
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${(reportTitle.trim() || defaultTitle).replace(/\s+/g, "_")}_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDownloading(false);
    }
  };
  const vaultOptions = [
    { value: "all", label: tx("reportModal.allAccounts") },
    ...vaults.map((v) => ({ value: String(v.id), label: `${v.name} (${v.currency})` })),
  ];
  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-overlay/50 backdrop-blur-xs font-sans animate-in fade-in duration-150"
      dir="rtl"
    >
      <div
        className={`bg-surface border border-line rounded-modal shadow-2xl overflow-hidden flex flex-col transition-all duration-200 ${
          isExpanded ? "w-full max-w-[1300px] h-[95vh]" : "w-full max-w-4xl h-[82vh] max-h-[82vh]"
        }`}
      >
        {!isExpanded ? (
          <>
            <div className="bg-surface px-5 py-3.5 flex justify-between items-center border-b border-line">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-btn bg-surface-muted border border-line text-content-muted flex items-center justify-center shrink-0">
                  <Printer size={17} />
                </div>
                <div>
                  <h3 className="text-section-title font-bold text-content-strong">
                    {tx("reportModal.filterTitle")}
                  </h3>
                  <p className="text-caption-text text-content-subtle">
                    {expenseType ? expenseType.name : tx("reportModal.allTypes")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-content-faint hover:text-content-muted hover:bg-surface-subtle p-1.5 rounded-btn transition-colors cursor-pointer"
                aria-label={tx("reportModal.close")}
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden p-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:h-full">
                <div className="space-y-3.5 lg:min-h-0 lg:overflow-y-auto lg:pl-1">
                  {expenseType && (
                    <div className="flex items-center gap-1.5 text-caption-text text-content-subtle">
                      <span>{tx("reportModal.reportType")}</span>
                      <span className="font-bold text-content-body">{expenseType.name}</span>
                    </div>
                  )}
                  <div>
                    <label className="block text-label-text font-bold text-content-body mb-1.5">
                      {tx("reportModal.headerTitle")}
                    </label>
                    <input
                      type="text"
                      value={reportTitle}
                      onChange={(e) => setReportTitle(e.target.value)}
                      placeholder={defaultTitle}
                      className="w-full border border-line-strong rounded-badge px-3 py-2 text-body-text font-semibold text-content-strong focus:outline-none focus:border-line-bold bg-surface"
                    />
                  </div>
                  <FilterSection title={tx("reportModal.timeRange")} badge={dateBadge}>
                    <FilterPresetButtons
                      presets={presets}
                      activeKey={activePreset}
                      onChange={(key) => applyPreset(key)}
                      buttonClassName="px-3 py-1.5 rounded-btn text-caption-text"
                    />
                    {activePreset !== "all" && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-caption-text font-bold text-content-muted mb-1">
                            {tx("reportModal.fromDate")}
                          </label>
                          <DatePicker
                            value={fromDateObj}
                            onChange={(d) => {
                              setActivePreset("custom");
                              setFromDateObj(d);
                            }}
                            calendar={persian}
                            locale={persian_af}
                            calendarPosition="bottom-right"
                            containerClassName="w-full"
                            inputClass="w-full border border-line-strong rounded-badge px-3 py-1.5 text-body-text font-bold font-mono text-content-strong focus:outline-none focus:border-accent bg-surface text-center cursor-pointer shadow-2xs"
                          />
                        </div>
                        <div>
                          <label className="block text-caption-text font-bold text-content-muted mb-1">
                            {tx("reportModal.toDate")}
                          </label>
                          <DatePicker
                            value={toDateObj}
                            onChange={(d) => {
                              setActivePreset("custom");
                              setToDateObj(d);
                            }}
                            calendar={persian}
                            locale={persian_af}
                            calendarPosition="bottom-right"
                            containerClassName="w-full"
                            inputClass="w-full border border-line-strong rounded-badge px-3 py-1.5 text-body-text font-bold font-mono text-content-strong focus:outline-none focus:border-accent bg-surface text-center cursor-pointer shadow-2xs"
                          />
                        </div>
                      </div>
                    )}
                  </FilterSection>
                  <FilterSection title={tx("reportModal.otherFilters")}>
                    <div className="grid grid-cols-2 gap-2.5">
                      <CustomDropdown
                        value={paymentSource}
                        onChange={(val) => setPaymentSource(val)}
                        options={sourceOptions}
                        icon={<span className="text-caption-text text-content-faint shrink-0">{tx("reportModal.sourceLabel")}</span>}
                        buttonClassName="w-full h-[38px] px-2.5 text-body-text rounded-badge"
                        width="w-full"
                        usePortal={true}
                      />
                      <CustomDropdown
                        value={filterCurrency}
                        onChange={(val) => setFilterCurrency(val)}
                        options={[
                          { value: "all", label: tx("reportModal.allCurrencies") },
                          { value: "AFN", label: tx("reportModal.onlyAfn") },
                          { value: "USD", label: tx("reportModal.onlyUsd") },
                          { value: "IRR", label: tx("reportModal.onlyIrr") },
                        ]}
                        icon={<span className="text-caption-text text-content-faint shrink-0">{tx("reportModal.currencyLabel")}</span>}
                        buttonClassName="w-full h-[38px] px-2.5 text-body-text rounded-badge"
                        width="w-full"
                        usePortal={true}
                      />
                      <CustomDropdown
                        value={filterVault}
                        onChange={(val) => setFilterVault(val)}
                        options={vaultOptions}
                        icon={<span className="text-caption-text text-content-faint shrink-0">{tx("reportModal.accountLabel")}</span>}
                        buttonClassName="w-full h-[38px] px-2.5 text-body-text rounded-badge"
                        width="w-full"
                        usePortal={true}
                      />
                      <CustomDropdown
                        value={sortBy}
                        onChange={(val) => setSortBy(val)}
                        options={sortOptions}
                        icon={<span className="text-caption-text text-content-faint shrink-0">{tx("reportModal.sortLabel")}</span>}
                        buttonClassName="w-full h-[38px] px-2.5 text-body-text rounded-badge"
                        width="w-full"
                        usePortal={true}
                      />
                    </div>
                  </FilterSection>
                </div>
                <section className="flex flex-col min-h-0 lg:h-full rounded-card border border-line bg-surface overflow-hidden">
                  <div className="px-4 py-3 border-b border-line bg-surface-muted/60 flex flex-wrap items-center justify-between gap-2 shrink-0">
                    <span className={PANEL_TITLE}>{tx("reportModal.categoryScope")}</span>
                    <span className="text-caption-text text-content-muted bg-surface border border-line px-2.5 py-0.5 rounded-badge font-mono shrink-0">
                      {categoryBadge}
                    </span>
                  </div>
                  <div className="px-3 py-2.5 border-b border-line-soft shrink-0 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCategoryScope("all")}
                      className={`flex-1 py-1.5 px-3 rounded-btn border text-btn-text font-medium transition-colors cursor-pointer ${
                        categoryScope === "all"
                          ? "bg-accent text-content-inverse border-accent font-bold"
                          : "bg-surface text-content-body border-line-strong hover:bg-surface-muted"
                      }`}
                    >
                      {tx("reportModal.allCategories")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCategoryScope("selected")}
                      className={`flex-1 py-1.5 px-3 rounded-btn border text-btn-text font-medium transition-colors cursor-pointer ${
                        categoryScope === "selected"
                          ? "bg-accent text-content-inverse border-accent font-bold"
                          : "bg-surface text-content-body border-line-strong hover:bg-surface-muted"
                      }`}
                    >
                      {tx("reportModal.manualCategory")}
                    </button>
                  </div>
                  {categoryScope === "selected" && (
                    <div className="px-3 py-2.5 border-b border-line-soft shrink-0">
                      <div className="relative">
                        <Search
                          size={14}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-content-faint"
                        />
                        <input
                          type="text"
                          value={categorySearch}
                          onChange={(e) => setCategorySearch(e.target.value)}
                          placeholder={tx("reportModal.categorySearch")}
                          className="w-full border border-line rounded-badge pr-8 pl-3 py-1.5 text-body-text text-content outline-none focus:border-line-bold transition-colors bg-surface"
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex-1 min-h-[160px] overflow-y-auto divide-y divide-line-soft">
                    {categoryScope === "all" ? (
                      <p className="text-center text-body-text text-content-subtle py-10 px-4">
                        {tx("reportModal.allCategoriesNote")}
                      </p>
                    ) : isLoadingCategories ? (
                      <div className="py-10 text-center text-content-faint text-caption-text">
                        <Loader2 size={16} className="animate-spin mx-auto mb-1" />
                        {tx("reportModal.loadingCategories")}
                      </div>
                    ) : visibleCategories.length === 0 ? (
                      <div className="py-10 text-center text-content-faint text-caption-text font-bold">
                        {tx("reportModal.noCategoriesFound")}
                      </div>
                    ) : (
                      visibleCategories.map((cat) => {
                        const checked = selectedCategoryIds.includes(cat.id);
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => toggleCategory(cat.id)}
                            className="w-full flex items-center gap-2 px-3.5 py-2.5 text-right hover:bg-surface-muted transition-colors cursor-pointer"
                          >
                            {checked ? (
                              <CheckSquare size={15} className="text-accent shrink-0" />
                            ) : (
                              <Square size={15} className="text-content-faint shrink-0" />
                            )}
                            <span
                              className={`text-body-text ${
                                checked ? "font-bold text-content-strong" : "text-content-body"
                              }`}
                            >
                              {cat.name}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                  {noCategorySelected && (
                    <div className="px-3.5 py-2 border-t border-line-soft shrink-0">
                      <span className="text-caption-text text-danger-text font-bold">
                        {tx("reportModal.selectOneCategory")}
                      </span>
                    </div>
                  )}
                </section>
              </div>
            </div>
            <div className="px-5 py-4 bg-surface-muted border-t border-line flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-line-strong text-content-body text-btn-text font-medium rounded-btn cursor-pointer hover:bg-surface-subtle transition-colors"
              >
                {tx("actions.cancel", { ns: "common" })}
              </button>
              <button
                type="button"
                onClick={handleOpenPreview}
                disabled={noCategorySelected}
                className="px-5 py-2 bg-accent hover:bg-accent-hover text-content-inverse text-btn-text font-bold rounded-btn cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Eye size={16} />
                <span>{tx("reportModal.showPreview")}</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="bg-surface px-5 py-3.5 border-b border-line flex flex-wrap items-center justify-between gap-3 shrink-0 text-content-body font-sans">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-btn bg-surface-muted border border-line text-content-muted flex items-center justify-center shrink-0">
                  <Printer size={17} />
                </div>
                <div>
                  <h3 className="text-section-title text-content-strong font-bold">
                    {tx("reportModal.previewTitle", { title: reportTitle.trim() || defaultTitle })}
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="px-3 py-2 bg-surface hover:bg-surface-muted text-content-body text-btn-text font-bold rounded-btn border border-line-strong flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                >
                  <SlidersHorizontal size={14} />
                  <span>{tx("reportModal.changeFilters")}</span>
                </button>
                <div className="flex items-center gap-1 bg-surface-subtle border border-line rounded-btn px-2 py-1 text-caption-text text-content-body">
                  <button
                    type="button"
                    onClick={() => setZoomScale((s) => Math.max(0.5, Number((s - 0.05).toFixed(2))))}
                    className="p-1 hover:text-content-strong hover:bg-surface-strong/70 rounded-btn transition-colors cursor-pointer"
                    aria-label={tx("reportModal.zoomOut")}
                  >
                    <ZoomOut size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomScale(1.0)}
                    className="px-1.5 py-0.5 text-caption-text font-bold text-content-body hover:text-content-strong transition-colors cursor-pointer"
                  >
                    {Math.round(zoomScale * 100)}%
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomScale((s) => Math.min(1.4, Number((s + 0.05).toFixed(2))))}
                    className="p-1 hover:text-content-strong hover:bg-surface-strong/70 rounded-btn transition-colors cursor-pointer"
                    aria-label={tx("reportModal.zoomIn")}
                  >
                    <ZoomIn size={14} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={fetchReportHtml}
                  className="p-2 bg-surface hover:bg-surface-muted text-content-muted hover:text-content-strong rounded-btn border border-line-strong transition-colors cursor-pointer shadow-2xs"
                  aria-label={tx("reportModal.reload")}
                >
                  <RotateCw size={15} className={isLoadingPreview ? "animate-spin text-accent-strong" : ""} />
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isDownloading}
                  className="px-4 py-2 border border-line-strong text-content-body hover:bg-surface-subtle text-btn-text font-medium rounded-btn flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isDownloading ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Download size={15} />
                  )}
                  <span>{isDownloading ? tx("reportModal.generatingPdf") : tx("reportModal.savePdf")}</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={isLoadingPreview}
                  className="px-4 py-2 bg-accent hover:bg-accent-hover text-content-inverse text-btn-text font-bold rounded-btn flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Printer size={15} />
                  <span>{tx("reportModal.printReport")}</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-content-faint hover:text-content-muted hover:bg-surface-subtle p-1.5 rounded-btn transition-colors cursor-pointer"
                  aria-label={tx("reportModal.close")}
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 sm:p-6 flex justify-center items-start bg-surface-strong/60 relative">
              {isLoadingPreview && (
                <div className="absolute inset-0 flex items-center justify-center bg-surface/70 z-10 backdrop-blur-xs">
                  <div className="flex items-center gap-2 bg-surface border border-line px-4 py-2.5 rounded-card shadow-xl text-content-strong text-btn-text font-bold">
                    <Loader2 size={18} className="animate-spin text-accent-strong" />
                    <span>{tx("reportModal.loadingPreview")}</span>
                  </div>
                </div>
              )}
              <div
                className="relative shrink-0 mx-auto shadow-2xl rounded-card bg-surface border border-line-strong overflow-hidden"
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
                  title={tx("reportModal.previewFrameTitle")}
                  className="bg-surface border-none block rounded-card pointer-events-auto"
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
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
