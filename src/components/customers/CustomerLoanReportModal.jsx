import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { printReportFrame, REPORT_FRAME_MIN_HEIGHT, useReportFrameHeight } from "../../utils/reportFrame";
import { createPortal } from "react-dom";
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
} from "lucide-react";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import { CustomDropdown } from "../common";
import { apiUrl } from "../../api";

export default function CustomerLoanReportModal({ isOpen, onClose }) {
  useBodyScrollLock(isOpen);

  const [customerScope, setCustomerScope] = useState("all");
  const [selectedCustomerIds, setSelectedCustomerIds] = useState([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);

  const [filterCurrency, setFilterCurrency] = useState("all");
  const [filterStatus, setFilterStatus] = useState("has_debt");
  const [filterProvince, setFilterProvince] = useState("all");
  const [minBalance, setMinBalance] = useState("");
  const [hideInactive, setHideInactive] = useState(false);
  const [sortBy, setSortBy] = useState("balance_desc");

  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [zoomScale, setZoomScale] = useState(1.0);
    const [reportHtml, setReportHtml] = useState("");
  const iframeRef = useRef(null);
  const [iframeHeight, setIframeHeight] = useReportFrameHeight(iframeRef, REPORT_FRAME_MIN_HEIGHT, 35);

  useEffect(() => {
    if (!isOpen) return;

    setIsExpanded(false);
    setZoomScale(1.0);
    setIframeHeight(793.7);
    setReportHtml("");

    const loadCustomers = async () => {
      try {
        setIsLoadingCustomers(true);
        const res = await fetch(apiUrl("/customers?per_page=1000"));
        if (!res.ok) throw new Error("failed");
        const json = await res.json();
        setCustomers(Array.isArray(json.data) ? json.data : []);
      } catch (err) {
        console.error(err);
        setCustomers([]);
      } finally {
        setIsLoadingCustomers(false);
      }
    };

    loadCustomers();
  }, [isOpen]);

  const provinceOptions = useMemo(() => {
    const unique = [...new Set(customers.map((c) => c.province).filter(Boolean))].sort();
    return [
      { value: "all", label: "همه ولایات" },
      ...unique.map((p) => ({ value: p, label: p })),
    ];
  }, [customers]);

  const visibleCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        (c.name || "").toLowerCase().includes(q) ||
        String(c.customer_code || "").includes(q) ||
        String(c.phone || "").includes(q)
    );
  }, [customers, customerSearch]);

  // "selected" scope with an empty selection would fall through to "all" on the
  // server, so block the preview instead of silently reporting every customer.
  const noCustomerSelected =
    customerScope === "selected" && selectedCustomerIds.length === 0;

  const toggleCustomer = (id) => {
    setSelectedCustomerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const getReportParams = useCallback(() => {
    const params = new URLSearchParams();

    if (customerScope === "selected" && selectedCustomerIds.length > 0) {
      params.append("customer_ids", selectedCustomerIds.join(","));
    }

    if (filterCurrency !== "all") params.append("currency", filterCurrency);
    if (filterStatus !== "all") params.append("status", filterStatus);
    if (filterProvince !== "all") params.append("province", filterProvince);
    if (String(minBalance).trim() !== "") params.append("min_balance", String(minBalance).trim());
    if (hideInactive) params.append("hide_inactive", "1");
    if (sortBy !== "balance_desc") params.append("sort", sortBy);

    return params;
  }, [
    customerScope,
    selectedCustomerIds,
    filterCurrency,
    filterStatus,
    filterProvince,
    minBalance,
    hideInactive,
    sortBy,
  ]);

  const fetchReportHtml = useCallback(async () => {
    try {
      setIsLoadingPreview(true);
      const params = getReportParams();
      params.append("t", Date.now().toString());
      const res = await fetch(`${apiUrl("/customer-loans/report-html")}?${params.toString()}`);
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
      const res = await fetch(`${apiUrl("/customer-loans/report-pdf")}?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to generate PDF");

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `گزارش_قرضداری_مشتریان_${Date.now()}.pdf`;
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

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs font-sans animate-in fade-in duration-150"
      dir="rtl"
    >
      <div
        className={`bg-white border border-gray-200 rounded-modal shadow-2xl overflow-hidden flex flex-col transition-all duration-200 ${
          isExpanded ? "w-full max-w-[1300px] h-[95vh]" : "w-full max-w-2xl max-h-[92vh]"
        }`}
      >
        {!isExpanded ? (
          <>
            <div className="bg-white px-5 py-3.5 flex justify-between items-center border-b border-gray-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-btn bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shadow-2xs">
                  <Printer size={18} />
                </div>
                <div>
                  <h3 className="text-section-title font-bold text-gray-900">
                    فیلتر و استخراج گزارش قرضداری مشتریان
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded-btn transition-colors cursor-pointer"
                aria-label="بستن"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">

              <div className="p-3.5 bg-gray-50 border border-gray-200/70 rounded-card space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-label-text font-bold text-gray-800 whitespace-nowrap">شمول مشتریان</span>
                  <CustomDropdown
                    value={customerScope}
                    onChange={(val) => setCustomerScope(val)}
                    options={[
                      { value: "all", label: "همه مشتریان" },
                      { value: "selected", label: "لیست انتخابی" },
                    ]}
                    buttonClassName="w-48 h-[34px] px-2.5 text-caption-text rounded-input"
                    width="w-48"
                    usePortal={true}
                  />
                </div>

                {customerScope === "selected" && (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search size={14} className="absolute right-3 top-2.5 text-gray-400" />
                      <input
                        type="text"
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        placeholder="جستجو در نام، کد یا شماره تماس..."
                        className="w-full border border-gray-300 rounded-input pr-8 pl-3 py-1.5 text-body-text text-gray-800 focus:outline-none focus:border-emerald-600 bg-white"
                      />
                    </div>

                    <div className="flex items-center justify-between text-caption-text">
                      <span className="text-gray-600 font-medium">
                        {selectedCustomerIds.length > 0
                          ? `${selectedCustomerIds.length} مشتری انتخاب شده`
                          : "هیچ مشتری انتخاب نشده است"}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedCustomerIds(visibleCustomers.map((c) => c.id))}
                          className="text-emerald-700 hover:text-emerald-800 font-bold cursor-pointer"
                        >
                          انتخاب همه
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          type="button"
                          onClick={() => setSelectedCustomerIds([])}
                          className="text-gray-500 hover:text-gray-700 font-bold cursor-pointer"
                        >
                          پاک کردن
                        </button>
                      </div>
                    </div>

                    <div className="max-h-44 overflow-y-auto border border-gray-200 rounded-card bg-white divide-y divide-gray-100">
                      {isLoadingCustomers ? (
                        <div className="p-4 text-center text-caption-text text-gray-500">
                          در حال دریافت لیست مشتریان...
                        </div>
                      ) : visibleCustomers.length === 0 ? (
                        <div className="p-4 text-center text-caption-text text-gray-500">
                          مشتری یافت نشد.
                        </div>
                      ) : (
                        visibleCustomers.map((c) => {
                          const checked = selectedCustomerIds.includes(c.id);
                          return (
                            <label
                              key={c.id}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-right hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleCustomer(c.id)}
                                className="shrink-0 w-4 h-4 accent-emerald-600 cursor-pointer"
                              />
                              <span className="text-body-text font-bold text-gray-800 truncate">
                                {c.name}
                              </span>
                              <span
                                className="text-caption-text font-mono text-gray-500 mr-auto shrink-0"
                                dir="ltr"
                              >
                                {c.customer_code || "—"}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 bg-gray-50 border border-gray-200/70 rounded-card space-y-2.5">
                <span className="text-label-text font-bold text-gray-800">فیلترهای تکمیلی</span>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <CustomDropdown
                    value={filterCurrency}
                    onChange={(val) => setFilterCurrency(val)}
                    options={[
                      { value: "all", label: "همه ارزها (AFN / USD)" },
                      { value: "AFN", label: "فقط افغانی (AFN)" },
                      { value: "USD", label: "فقط دالر (USD)" },
                    ]}
                    buttonClassName="w-full h-[34px] px-2.5 text-caption-text rounded-input"
                    width="w-full"
                    usePortal={true}
                  />

                  <CustomDropdown
                    value={filterStatus}
                    onChange={(val) => setFilterStatus(val)}
                    options={[
                      { value: "all", label: "همه طرف حساب‌ها" },
                      { value: "has_debt", label: "فقط قرضدار ها" },
                      { value: "has_credit", label: "فقط طلبکار ها" },
                      { value: "cleared", label: "فقط تسویه‌شده‌ها" },
                    ]}
                    buttonClassName="w-full h-[34px] px-2.5 text-caption-text rounded-input"
                    width="w-full"
                    usePortal={true}
                  />

                  <CustomDropdown
                    value={filterProvince}
                    onChange={(val) => setFilterProvince(val)}
                    options={provinceOptions}
                    buttonClassName="w-full h-[34px] px-2.5 text-caption-text rounded-input"
                    width="w-full"
                    usePortal={true}
                  />

                  <input
                    type="number"
                    value={minBalance}
                    onChange={(e) => setMinBalance(e.target.value)}
                    placeholder="حداقل مانده (اختیاری)"
                    dir="ltr"
                    className="w-full h-[34px] border border-gray-300 rounded-input px-3 text-caption-text font-mono text-gray-800 focus:outline-none focus:border-emerald-600 bg-white"
                  />

                  <CustomDropdown
                    value={sortBy}
                    onChange={(val) => setSortBy(val)}
                    options={[
                      { value: "balance_desc", label: "بیشترین مانده قرض" },
                      { value: "balance_asc", label: "کمترین مانده قرض" },
                      { value: "name", label: "نام مشتری (الفبا)" },
                      { value: "code", label: "کد مشتری" },
                    ]}
                    buttonClassName="w-full h-[34px] px-2.5 text-caption-text rounded-input"
                    width="w-full"
                    usePortal={true}
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hideInactive}
                    onChange={() => setHideInactive((v) => !v)}
                    className="w-4 h-4 accent-emerald-600 cursor-pointer"
                  />
                  <span className="text-caption-text font-medium text-gray-700">
                    حذف مشتریان با مانده صفر از راپور
                  </span>
                </label>
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-btn-text font-bold text-gray-700 bg-white border border-gray-300 rounded-btn hover:bg-gray-100 transition-colors cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleOpenPreview}
                disabled={noCustomerSelected}
                title={noCustomerSelected ? "حداقل یک مشتری را انتخاب کنید" : undefined}
                className="px-5 py-2 text-btn-text font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-btn transition-colors shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Eye size={16} />
                <span>مشاهده و پیش‌نمایش راپور</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white px-5 py-3.5 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 shrink-0 text-gray-800 font-sans">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-btn bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shadow-2xs">
                  <Printer size={18} />
                </div>
                <div>
                  <h3 className="text-section-title text-gray-900 font-bold">
                    پیش‌نمایش گزارش قرضداری مشتریان
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 text-btn-text font-bold rounded-btn border border-gray-300 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                >
                  <SlidersHorizontal size={14} />
                  <span>تغییر فیلترها</span>
                </button>

                <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-btn px-2 py-1 text-caption-text text-gray-700">
                  <button
                    type="button"
                    onClick={() => setZoomScale((s) => Math.max(0.5, Number((s - 0.05).toFixed(2))))}
                    className="p-1 hover:text-gray-900 hover:bg-gray-200/70 rounded-btn transition-colors cursor-pointer"
                    aria-label="کوچک‌نمایی"
                  >
                    <ZoomOut size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomScale(1.0)}
                    className="px-1.5 py-0.5 text-caption-text font-bold text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
                  >
                    {Math.round(zoomScale * 100)}%
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomScale((s) => Math.min(1.4, Number((s + 0.05).toFixed(2))))}
                    className="p-1 hover:text-gray-900 hover:bg-gray-200/70 rounded-btn transition-colors cursor-pointer"
                    aria-label="بزرگ‌نمایی"
                  >
                    <ZoomIn size={14} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={fetchReportHtml}
                  className="p-2 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900 rounded-btn border border-gray-300 transition-colors cursor-pointer shadow-2xs"
                  aria-label="بارگذاری مجدد پیش‌نمایش"
                >
                  <RotateCw size={15} className={isLoadingPreview ? "animate-spin text-slate-700" : ""} />
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isDownloading}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-btn-text font-bold rounded-btn shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isDownloading ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Download size={15} />
                  )}
                  <span>{isDownloading ? "در حال تولید PDF..." : "ذخیره سند (PDF)"}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={isLoadingPreview}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-btn-text font-bold rounded-btn flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
                >
                  <Printer size={15} />
                  <span>چاپ راپور</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-btn transition-colors cursor-pointer"
                  aria-label="بستن"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 sm:p-6 flex justify-center items-start bg-slate-100/90 relative">
              {isLoadingPreview && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10 backdrop-blur-xs">
                  <div className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2.5 rounded-card shadow-xl text-gray-800 text-btn-text font-bold">
                    <Loader2 size={18} className="animate-spin text-slate-800" />
                    <span>در حال دریافت پیش‌نمایش راپور از سرور...</span>
                  </div>
                </div>
              )}

              <div
                className="relative shrink-0 mx-auto shadow-2xl rounded-card bg-white border border-gray-300 overflow-hidden"
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
                  title="پیش‌نمایش گزارش قرضداری مشتریان"
                  className="bg-white border-none block rounded-card pointer-events-auto"
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
