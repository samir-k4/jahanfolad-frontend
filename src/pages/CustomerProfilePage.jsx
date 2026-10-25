import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { escapeHtml as esc } from "../utils/escapeHtml";
import { showToast as appToast } from "../utils/toast";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Printer,
  Edit3,
  FileText,
  Search,
  RefreshCw,
  AlertCircle,
  X,
  Trash2,
  Wallet,
} from "lucide-react";
import useBodyScrollLock from "../hooks/useBodyScrollLock";
import useDebounce from "../hooks/useDebounce";
import useVaults from "../hooks/useVaults";
import useIncomeCategories from "../hooks/useIncomeCategories";
import { apiUrl } from "../api";
import { TooltipButton, SearchableSelect, DeleteConfirmationModal, DocumentPreviewModal, usePagePerms } from "../components/common";
import SalesInvoicePreviewModal from "../components/sales/SalesInvoicePreviewModal";
import CustomerIncomeDetailModal from "../components/incomes/CustomerIncomeDetailModal";
import CustomerIncomeEditModal from "../components/incomes/CustomerIncomeEditModal";
import CustomerOpeningBalanceModal from "../components/customers/CustomerOpeningBalanceModal";
import { toEnglishDigits, formatProductName } from "../utils";

const AFGHAN_PROVINCES = [
  "کابل", "هرات", "بلخ", "ننگرهار", "کندز", "کندهار", "غزنی", "بغلان",
  "تخار", "بدخشان", "فاریاب", "جوزجان", "سرپل", "سمنگان", "پروان",
  "کاپیسا", "پنجشیر", "وردک", "لوگر", "خوست", "پکتیا", "پکتیکا",
  "هلمند", "زابل", "ارزگان", "غور", "بادغیس", "فراه", "نیمروز",
  "دایکندی", "بامیان", "کنر", "لغمان", "نورستان"
];

const creatorName = (creator) =>
  typeof creator === "string" ? creator : creator?.name || creator?.username || "—";

export default function CustomerProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [customer, setCustomer] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [statement, setStatement] = useState([]);
  const [summary, setSummary] = useState([]);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("statement");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    phone2: "",
    province: "کابل",
    address: "",
    credit_limit: "0",
    status: "active",
    notes: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [selectedIncomeForDetail, setSelectedIncomeForDetail] = useState(null);
  const [selectedIncomeForEdit, setSelectedIncomeForEdit] = useState(null);
  const [selectedIncomeForVoucher, setSelectedIncomeForVoucher] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showStatementPdf, setShowStatementPdf] = useState(false);
  const [showOpeningBalanceModal, setShowOpeningBalanceModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { vaults } = useVaults();
  const { categories } = useIncomeCategories();
  const { canEdit } = usePagePerms("customers");
  const openingBalanceEntries = useMemo(
    () => statement.filter((item) => item.reference_type === "opening_balance"),
    [statement],
  );
  const hasOpeningBalance = openingBalanceEntries.some(
    (item) => Number(item.debit || 0) > 0 || Number(item.credit || 0) > 0,
  );

  const showToast = (message, type = "success") => {
    // delegates to the shared toast in utils/toast so every page looks the same
    (appToast[type] || appToast.info)(message);
  };

  useBodyScrollLock(editing || !!viewingInvoice || showOpeningBalanceModal);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const endpoint = deleteTarget.type === "invoice"
        ? `/sales-invoices/${deleteTarget.record.id}`
        : `/incomes/${deleteTarget.record.id}`;
      const res = await fetch(apiUrl(endpoint), {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      const resData = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(resData.message || "خطا در حذف سند");

      showToast(resData.message || "سند با موفقیت حذف گردید.");
      setDeleteTarget(null);
      fetchCustomerData();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchCustomerData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/customers/${id}`));
      if (!res.ok) throw new Error("خطا در بارگذاری اطلاعات مشتری");
      const json = await res.json();
      
      const cust = json.data || null;
      setCustomer(cust);
      setInvoices(json.invoices || []);
      setReceipts(json.receipts || []);
      setStatement(json.statement || []);
      if (json.summary) {
        setSummary(Array.isArray(json.loans) ? json.loans : (json.summary.by_currency || []));
      }

      if (cust) {
        setEditForm({
          name: cust.name || "",
          phone: cust.phone || "",
          phone2: cust.phone2 || "",
          province: cust.province || "کابل",
          address: cust.address || "",
          credit_limit: String(cust.credit_limit || "0"),
          status: cust.status || "active",
          notes: cust.notes || "",
        });
      }
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCustomerData();
  }, [fetchCustomerData]);

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim()) {
      showToast("نام مشتری نمی‌تواند خالی باشد.", "error");
      return;
    }
    if (!editForm.phone.trim()) {
      showToast("شماره تماس مشتری الزامی است.", "error");
      return;
    }

    setSavingEdit(true);
    try {
      const payload = {
        name: editForm.name.trim(),
        phone: toEnglishDigits(editForm.phone.trim()),
        phone2: editForm.phone2 && editForm.phone2.trim() ? toEnglishDigits(editForm.phone2.trim()) : null,
        province: editForm.province,
        address: editForm.address && editForm.address.trim() ? editForm.address.trim() : null,
        credit_limit: parseFloat(toEnglishDigits(editForm.credit_limit)) || 0,
        status: editForm.status,
        notes: editForm.notes && editForm.notes.trim() ? editForm.notes.trim() : null,
      };

      const res = await fetch(apiUrl(`/customers/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.message || "خطا در ویرایش اطلاعات مشتری");

      showToast("اطلاعات مشتری با موفقیت بروزرسانی شد.");
      setEditing(false);
      fetchCustomerData();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSavingEdit(false);
    }
  };

  const filteredStatement = statement.filter((s) => {
    if (!debouncedSearchQuery) return true;
    return (
      (s.tx_number && s.tx_number.toLowerCase().includes(debouncedSearchQuery.toLowerCase())) ||
      (s.description && s.description.includes(debouncedSearchQuery)) ||
      (s.type && s.type.includes(debouncedSearchQuery))
    );
  });

  const filteredInvoices = invoices.filter((inv) => {
    if (!debouncedSearchQuery) return true;
    return (
      String(inv.invoice_number).toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      (inv.sale_type && inv.sale_type.includes(debouncedSearchQuery)) ||
      (inv.target_account && inv.target_account.includes(debouncedSearchQuery)) ||
      (inv.created_by && inv.created_by.includes(debouncedSearchQuery)) ||
      (inv.notes && inv.notes.includes(debouncedSearchQuery))
    );
  });

  const filteredReceipts = receipts.filter((rcp) => {
    if (!debouncedSearchQuery) return true;
    return (
      (rcp.doc_number && String(rcp.doc_number).toLowerCase().includes(debouncedSearchQuery.toLowerCase())) ||
      (rcp.description && rcp.description.includes(debouncedSearchQuery)) ||
      (rcp.receipt_type && rcp.receipt_type.includes(debouncedSearchQuery))
    );
  });

  const handlePrintStatementRow = (item) => {
    const w = window.open("", "_blank");
    const isLoan = item.sign === "+" || (item.debit && Number(item.debit) > 0);
    const rawAmt = Number(item.amount || (isLoan ? item.debit : item.credit) || 0);
    const isDollar = item.currency === "USD" || item.currency === "$" || item.currency === "دالر";

    w.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="fa">
      <head>
        <meta charset="utf-8">
        <title>سند حسابی - ${esc(item.tx_number || "")}</title>
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          body { font-family: Tahoma, sans-serif; direction: rtl; padding: 10px; font-size: 11.5px; color: #1e293b; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #334155; padding-bottom: 8px; margin-bottom: 12px; }
          .info-box { display: flex; flex-direction: column; gap: 6px; background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px 14px; border-radius: 3px; margin-bottom: 12px; }
          .info-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #cbd5e1; padding-bottom: 4px; }
          .amount-box { margin-top: 10px; text-align: center; font-family: monospace; font-size: 18px; font-weight: bold; border: 1.5px solid #0f172a; padding: 8px; color: ${isLoan ? "#b91c1c" : "#15803d"}; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h2 style="margin:0;font-size:16px;color:#0f172a">شرکت تولیدی جهان فولاد</h2>
            <div style="font-size:11px;font-weight:bold;margin-top:3px">سند تفصیلی حساب مشتری</div>
          </div>
          <div style="text-align:left;font-family:monospace" dir="ltr">
            <span style="border:1.5px solid #0f172a;padding:2px 8px;font-weight:bold;font-size:13px">${esc(item.tx_number || "—")}</span><br/>
            <span>تاریخ: ${esc(item.date || "—")}</span>
          </div>
        </div>
        <div class="info-box">
          <div class="info-row"><strong>حساب:</strong> <span>${esc(item.account || "طلبات")}</span></div>
          <div class="info-row"><strong>نوعیت:</strong> <span>${esc(item.type || "—")}</span></div>
          <div class="info-row"><strong>توضیحات:</strong> <span>${esc(item.description || "—")}</span></div>
        </div>
        <div class="amount-box" dir="ltr">${isLoan ? "+" : "-"} ${esc(rawAmt.toLocaleString())} ${esc(isDollar ? "$" : "؋")}</div>
        <script>window.onload=function(){window.print();}<\/script>
      </body>
      </html>
    `);
    w.document.close();
  };


  if (loading) {
    return (
      <div className="p-12 text-center text-gray-500 font-sans min-h-[60vh] flex flex-col items-center justify-center">
        <RefreshCw size={26} className="animate-spin text-slate-700 mb-3" />
        <p className="text-xs font-bold">در حال بارگذاری پروفایل و صورت حساب مشتری...</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-8 text-center text-gray-700 font-sans">
        <AlertCircle size={36} className="text-rose-600 mx-auto mb-2" />
        <p className="text-sm font-bold">مشتری مورد نظر یافت نشد.</p>
        <Link to="/customers" className="mt-4 inline-block px-4 py-2 bg-slate-800 text-white rounded-btn text-xs font-bold">
          بازگشت به لیست مشتریان
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3.5 font-sans" dir="rtl">

      <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
        <Link to="/" className="hover:text-slate-900">خانه</Link>
        <span className="text-gray-300">/</span>
        <Link to="/customers" className="hover:text-slate-900">مشتریان</Link>
        <span className="text-gray-300">/</span>
        <span className="text-slate-800 font-bold">{customer.name}</span>
      </div>

      <div className="bg-white border border-gray-200 rounded-card shadow-2xs">
        <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-black text-gray-900">{customer.name}</h1>
            <span className="font-mono text-xs text-slate-700 px-2 py-0.5 rounded-badge border border-slate-200">
              {customer.customer_code}
            </span>
            <span className={`px-2 py-0.5 rounded-badge text-xs font-bold border ${
              customer.status === "active"
                ? " text-emerald-700"
                : " text-gray-600 "
            }`}>
              {customer.status === "active" ? "فعال" : "غیرفعال"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowStatementPdf(true)}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-btn text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <Printer size={14} className="text-slate-600" />
              <span>راپور جزییات</span>
            </button>

            {canEdit && (
              <button
                type="button"
                onClick={() => setShowOpeningBalanceModal(true)}
                className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-btn text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <Wallet size={14} />
                <span>{hasOpeningBalance ? "ویرایش بیلانس افتتاحیه" : "ثبت بیلانس افتتاحیه"}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setEditing(true)}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-btn text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <Edit3 size={14} className="text-slate-600" />
              <span>ویرایش اطلاعات</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 border-t border-gray-100 p-4">
          <div className="lg:col-span-7 flex flex-col justify-center">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-gray-100">
              <div className="space-y-1">
                <span className="text-3xs font-bold text-gray-600 block">نام و تخلص:</span>
                <span className="font-bold text-gray-900 text-sm truncate block">{customer.name}</span>
              </div>

              <div className="space-y-1 sm:pr-3 pt-2 sm:pt-0">
                <span className="text-3xs font-bold text-gray-600 block">شماره تماس ۱:</span>
                <span className="font-mono font-bold text-gray-800" dir="ltr">{customer.phone || "—"}</span>
              </div>

              <div className="space-y-1 sm:pr-3 pt-2 sm:pt-0">
                <span className="text-3xs font-bold text-gray-600 block">شماره تماس ۲:</span>
                <span className="font-mono font-bold text-gray-800" dir="ltr">{customer.phone2 || "—"}</span>
              </div>

              <div className="space-y-1 sm:pr-3 pt-2 sm:pt-0">
                <span className="text-3xs font-bold text-gray-600 block">ولایت و موقعیت آدرس:</span>
                <span className="text-gray-700 truncate block">{customer.province ? `${customer.province} - ` : ""}{customer.address || "آدرس ثبت نشده"}</span>
              </div>

            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col justify-between sm:border-r sm:border-gray-100 sm:pr-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>خلاصه حساب مشتری</span>
              </span>
            </div>

            <div className="border border-gray-200 rounded-table overflow-hidden text-xs">
              <table className="w-full text-center border-collapse">
                <thead>
                  <tr className="bg-slate-100/90 text-slate-800 font-bold border-b border-gray-200">
                    <th className="py-1.5 px-3 border-l border-gray-200">واحد پول</th>
                    <th className="py-1.5 px-3 border-l border-gray-200">مانده حساب</th>
                    <th className="py-1.5 px-3">پرداختی</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.length ? summary.map((loan) => (
                    <tr key={loan.currency} className="divide-x divide-x-reverse divide-gray-200 font-mono font-bold text-sm bg-gray-50/50">
                      <td className="py-2 px-3 text-slate-900 font-bold">{loan.currency}</td>
                      <td className={`py-2 px-3 font-black ${Number(loan.current_balance || 0) > 0 ? "text-rose-700" : "text-emerald-700"}`}>
                        <div>{Math.abs(Number(loan.current_balance || 0)).toLocaleString()}</div>
                        <span className="text-[10px] font-sans">
                          {Number(loan.current_balance || 0) > 0 ? "بدهکار" : Number(loan.current_balance || 0) < 0 ? "بستانکار / پیش‌پرداخت" : "تسویه"}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-emerald-700 font-black">
                        {Number(loan.total_paid || 0).toLocaleString()}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={3} className="py-3 px-3 text-center text-gray-500">حسابی ثبت نشده است</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-card shadow-2xs overflow-hidden">
      <div className="bg-gray-50/80 px-3 py-2 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-1 space-x-reverse">
          <button
            type="button"
            onClick={() => setActiveTab("statement")}
            className={`px-3.5 py-1.5 rounded-btn text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "statement"
                ? "bg-slate-800 text-white shadow-2xs"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <span>صورت حساب</span>
            <span className={`px-1.5 py-0.2 text-3xs font-mono rounded-full mr-1 ${
              activeTab === "statement" ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
            }`}>
              {statement.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("invoices")}
            className={`px-3.5 py-1.5 rounded-btn text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "invoices"
                ? "bg-slate-800 text-white shadow-2xs"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <span>فاکتورها</span>
            <span className={`px-1.5 py-0.2 text-3xs font-mono rounded-full mr-1 ${
              activeTab === "invoices" ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
            }`}>
              {invoices.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("receipts")}
            className={`px-3.5 py-1.5 rounded-btn text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "receipts"
                ? "bg-slate-800 text-white shadow-2xs"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <span>رسید ها</span>
            <span className={`px-1.5 py-0.2 text-3xs font-mono rounded-full mr-1 ${
              activeTab === "receipts" ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
            }`}>
              {receipts.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-1 max-w-xs">
          {activeTab === "invoices" && (
            <Link
              to="/sales/invoices/create"
              className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-btn text-xs font-bold shadow-2xs whitespace-nowrap"
            >
              صدور فاکتور جدید
            </Link>
          )}

          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-input pr-8 pl-3 py-1 text-xs text-gray-900 outline-none focus:border-slate-800"
            />
            <Search size={14} className="absolute right-2.5 top-2 text-gray-400" />
          </div>

          <TooltipButton
            icon={<Printer size={14} />}
            tooltip="چاپ کارکرد"
            onClick={() => setShowStatementPdf(true)}
            colorClass="bg-gray-100 hover:bg-slate-800 hover:text-white text-gray-700 border border-gray-300"
          />
        </div>
      </div>

      {activeTab === "statement" && (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/90 text-slate-800 font-bold border-b border-slate-300">
                  <th className="px-3 py-2 text-center w-10 border-l border-slate-200">#</th>
                  <th className="px-3 py-2 border-l border-slate-200 text-center w-24">شماره ترانزکشن</th>
                  <th className="px-3 py-2 border-l border-slate-200 text-center w-24">حساب</th>
                  <th className="px-3.5 py-2 border-l border-slate-200">توضیحات</th>
                  <th className="px-3 py-2 border-l border-slate-200 text-center w-18">واحد پول</th>
                  <th className="px-3 py-2 border-l border-slate-200 text-center w-20">نرخ دالر</th>
                  <th className="px-3 py-2 border-l border-slate-200 text-center w-32">نوعیت</th>
                  <th className="px-3.5 py-2 border-l border-slate-200 text-center w-32" dir="ltr">مبلغ</th>
                  <th className="px-3 py-2 border-l border-slate-200 text-center w-22">تاریخ</th>
                  <th className="px-3 py-2 border-l border-slate-200 text-center">{t("table.createdBy", { ns: "common" })}</th>
                  <th className="px-3 py-2 text-center w-36">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStatement.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-10 text-gray-500">
                      گردش حسابی برای این مشتری ثبت نشده است.
                    </td>
                  </tr>
                ) : (
                  filteredStatement.map((item, idx) => {
                    const isLoan = item.sign === "+" || (item.debit && Number(item.debit) > 0);
                    const rawAmt = Number(item.amount || (isLoan ? item.debit : item.credit) || 0);
                    const isDollar = item.currency === "USD" || item.currency === "$" || item.currency === "دالر";
                    const currSign = isDollar ? "$" : "؋";
                    const typeLabel = isLoan && item.invoice_number
                      ? `فاکتور (${String(item.invoice_number).slice(-4)})`
                      : (item.type || (isLoan ? "فاکتور فروش" : "دریافتی مشتری"));
                    const linkedInvoice = item.reference_type === "sales_invoice"
                      ? invoices.find((inv) => inv.id === item.reference_id)
                      : null;
                    const linkedIncome = item.reference_type === "income"
                      ? receipts.find((rcp) => rcp.id === item.reference_id)
                      : null;

                    return (
                      <tr key={item.id || idx} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-3 py-2.5 text-center text-gray-500 font-mono border-l border-gray-200">
                          {idx + 1}
                        </td>

                        <td className="px-3 py-2.5 text-center font-mono font-bold text-gray-900 border-l border-gray-200">
                          {item.tx_number || "—"}
                        </td>

                        <td className="px-3 py-2.5 text-center font-medium text-slate-800 border-l border-gray-200">
                          {item.account || "طلبات"}
                        </td>

                        <td className="px-3.5 py-2.5 text-gray-700 whitespace-normal break-words max-w-[280px] border-l border-gray-200">
                          {item.description || "—"}
                        </td>

                        <td className="px-3 py-2.5 text-center font-mono font-bold text-gray-800 border-l border-gray-200">
                          {item.currency || "USD"}
                        </td>

                        <td className="px-3 py-2.5 text-center font-mono text-gray-600 border-l border-gray-200">
                          {item.exchange_rate ? Number(item.exchange_rate).toLocaleString() : "1.00"}
                        </td>

                        <td className="px-3 py-2.5 text-center border-l border-gray-200">
                          <span className="px-2 py-0.5 rounded-xs font-bold text-3xs bg-gray-100 text-gray-700 border border-gray-200">
                            {typeLabel}
                          </span>
                        </td>

                        <td className="px-3.5 py-2.5 text-center font-mono font-black border-l border-gray-200" dir="ltr">
                          <span
                            className={`inline-flex items-center justify-center gap-1 font-mono font-black ${
                              isLoan ? "text-rose-700" : "text-emerald-700"
                            }`}
                          >
                            <span>{isLoan ? "+" : "-"} {rawAmt.toLocaleString()}</span>
                            <span className="text-xs font-bold font-sans">
                              {currSign}
                            </span>
                          </span>
                        </td>

                        <td className="px-3 py-2.5 text-center font-mono text-gray-600 border-l border-gray-200">
                          {item.date || "—"}
                        </td>

                        <td className="px-3 py-2.5 text-center text-gray-700 border-l border-gray-200 whitespace-nowrap">
                          {creatorName(
                            item.created_by ||
                              linkedInvoice?.created_by ||
                              linkedIncome?.created_by ||
                              linkedIncome?.creator
                          )}
                        </td>

                        <td className="px-3 py-2.5 text-center min-w-[150px]">
                          {linkedInvoice ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <TooltipButton
                                onClick={() => setViewingInvoice(linkedInvoice)}
                                tooltip="جزییات فاکتور"
                                className="p-1.5 bg-white hover:bg-gray-100 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-btn shadow-2xs transition-all cursor-pointer inline-flex items-center justify-center"
                              >
                                <FileText size={14} />
                              </TooltipButton>

                              <TooltipButton
                                onClick={() => navigate(`/sales/invoices/${linkedInvoice.id}/edit`)}
                                tooltip="ویرایش فاکتور"
                                className="p-1.5 bg-white hover:bg-gray-100 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-btn shadow-2xs transition-all cursor-pointer inline-flex items-center justify-center"
                              >
                                <Edit3 size={14} />
                              </TooltipButton>

                              <TooltipButton
                                onClick={() => setDeleteTarget({ type: "invoice", record: linkedInvoice })}
                                tooltip="حذف فاکتور"
                                className="p-1.5 bg-white hover:bg-red-600 hover:text-white text-red-600 border border-gray-300 rounded-btn shadow-2xs transition-all cursor-pointer inline-flex items-center justify-center"
                              >
                                <Trash2 size={14} />
                              </TooltipButton>
                            </div>
                          ) : linkedIncome ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <TooltipButton
                                onClick={() => setSelectedIncomeForDetail(linkedIncome)}
                                tooltip="جزییات رسید"
                                className="p-1.5 bg-white hover:bg-gray-100 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-btn shadow-2xs transition-all cursor-pointer inline-flex items-center justify-center"
                              >
                                <FileText size={14} />
                              </TooltipButton>

                              <TooltipButton
                                onClick={() => setSelectedIncomeForEdit(linkedIncome)}
                                tooltip="ویرایش رسید"
                                className="p-1.5 bg-white hover:bg-gray-100 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-btn shadow-2xs transition-all cursor-pointer inline-flex items-center justify-center"
                              >
                                <Edit3 size={14} />
                              </TooltipButton>

                              <TooltipButton
                                onClick={() => setDeleteTarget({ type: "income", record: linkedIncome })}
                                tooltip="حذف رسید"
                                className="p-1.5 bg-white hover:bg-red-600 hover:text-white text-red-600 border border-gray-300 rounded-btn shadow-2xs transition-all cursor-pointer inline-flex items-center justify-center"
                              >
                                <Trash2 size={14} />
                              </TooltipButton>
                            </div>
                          ) : (
                            <TooltipButton
                              onClick={() => handlePrintStatementRow(item)}
                              tooltip="چاپ این سطر"
                              className="p-1.5 bg-white hover:bg-gray-100 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-btn shadow-2xs transition-all cursor-pointer inline-flex items-center justify-center"
                            >
                              <Printer size={14} />
                            </TooltipButton>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
      )}

      {activeTab === "invoices" && (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/90 text-slate-800 font-bold border-b border-slate-300">
                  <th className="px-3 py-2 text-center w-10 border-l border-slate-200">#</th>
                  <th className="px-3 py-2 border-l border-slate-200 text-center w-24">شماره فاکتور</th>
                  <th className="px-3 py-2 border-l border-slate-200 text-center w-24">نوعیت فروش</th>
                  <th className="px-3 py-2 border-l border-slate-200 text-center w-28">حساب</th>
                  <th className="px-3 py-2 border-l border-slate-200 text-center w-22">تاریخ</th>
                  <th className="px-3 py-2 border-l border-slate-200 text-center w-24">ثبت‌کننده</th>
                  <th className="px-3 py-2 border-l border-slate-200 text-center w-18">واحد پول</th>
                  <th className="px-3.5 py-2 border-l border-slate-200 text-center w-28" dir="ltr">مبلغ فاکتور</th>
                  <th className="px-3.5 py-2 border-l border-slate-200">توضیحات</th>
                  <th className="px-3 py-2 text-center w-36">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-10 text-gray-500">
                      هیچ فاکتوری برای این مشتری ثبت نشده است.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv, idx) => {
                    const clean4Digits = String(inv.invoice_number).replace(/[^0-9]/g, "").slice(-4) || inv.invoice_number;

                    return (
                      <tr key={inv.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-3 py-2.5 text-center text-gray-500 font-mono border-l border-gray-200">{idx + 1}</td>
                        
                        <td className="px-3 py-2.5 text-center font-mono font-black text-slate-900 text-sm border-l border-gray-200 bg-slate-50/40">
                          {clean4Digits}
                        </td>

                        <td className="px-3 py-2.5 text-center text-gray-700 border-l border-gray-200">
                          {inv.sale_type || "فاکتور"}
                        </td>

                        <td className="px-3 py-2.5 text-center text-gray-700 border-l border-gray-200">
                          {inv.target_account || "طلبات"}
                        </td>

                        <td className="px-3 py-2.5 text-center font-mono text-gray-600 border-l border-gray-200">
                          {toEnglishDigits(inv.shamsi_date) || "—"}
                        </td>

                        <td className="px-3 py-2.5 text-center text-gray-700 font-medium border-l border-gray-200">
                          {inv.created_by || "—"}
                        </td>

                        <td className="px-3 py-2.5 text-center font-mono text-gray-800 font-bold border-l border-gray-200">
                          {inv.currency || "AFN"}
                        </td>

                        <td className="px-3.5 py-2.5 text-center font-mono font-black text-gray-900 border-l border-gray-200" dir="ltr">
                          <span className="inline-flex items-center justify-center gap-1">
                            <span>{Number(inv.total_amount).toLocaleString()}</span>
                            <span className={`text-xs font-bold ${
                              inv.currency === "USD" || inv.currency === "$" || inv.currency === "دالر"
                                ? "text-emerald-700 font-sans"
                                : "text-slate-600 font-sans"
                            }`}>
                              {inv.currency === "USD" || inv.currency === "$" || inv.currency === "دالر" ? "$" : "؋"}
                            </span>
                          </span>
                        </td>

                        <td className="px-3.5 py-2.5 text-gray-700 whitespace-normal break-words max-w-[220px] border-l border-gray-200">
                          {inv.notes}
                        </td>

                        <td className="px-3 py-2.5 text-center min-w-[150px]">
                          <div className="flex items-center justify-center gap-1.5">
                            <TooltipButton
                              onClick={() => setViewingInvoice(inv)}
                              tooltip="جزییات فاکتور"
                              className="p-1.5 bg-white hover:bg-gray-100 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-btn shadow-2xs transition-all cursor-pointer inline-flex items-center justify-center"
                            >
                              <FileText size={14} />
                            </TooltipButton>

                            <TooltipButton
                              onClick={() => navigate(`/sales/invoices/${inv.id}/edit`)}
                              tooltip="ویرایش فاکتور"
                              className="p-1.5 bg-white hover:bg-gray-100 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-btn shadow-2xs transition-all cursor-pointer inline-flex items-center justify-center"
                            >
                              <Edit3 size={14} />
                            </TooltipButton>

                            <TooltipButton
                              onClick={() => setDeleteTarget({ type: "invoice", record: inv })}
                              tooltip="حذف فاکتور"
                              className="p-1.5 bg-white hover:bg-red-600 hover:text-white text-red-600 border border-gray-300 rounded-btn shadow-2xs transition-all cursor-pointer inline-flex items-center justify-center"
                            >
                              <Trash2 size={14} />
                            </TooltipButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
      )}

      {activeTab === "receipts" && (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/90 text-slate-800 font-bold border-b border-slate-300">
                  <th className="px-3 py-2 text-center w-12 border-l border-slate-200">#</th>
                  <th className="px-3 py-2 border-l border-slate-200 text-center w-28">شماره سند / رسید</th>
                  <th className="px-3 py-2 border-l border-slate-200 text-center w-24">تاریخ</th>
                  <th className="px-3.5 py-2 border-l border-slate-200">شرح و بابت</th>
                  <th className="px-3 py-2 border-l border-slate-200 text-center w-28">نوعیت دریافت</th>
                  <th className="px-3.5 py-2 border-l border-slate-200 text-left" dir="ltr">مبلغ دریافتی</th>
                  <th className="px-3 py-2 border-l border-slate-200 text-center">{t("table.createdBy", { ns: "common" })}</th>
                  <th className="px-3 py-2 text-center w-36">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredReceipts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-gray-500">
                      هیچ رسیدی برای این مشتری ثبت نشده است.
                    </td>
                  </tr>
                ) : (
                  filteredReceipts.map((rcp, idx) => (
                    <tr key={rcp.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-3 py-2.5 text-center text-gray-500 font-mono border-l border-gray-200">{idx + 1}</td>
                      <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-900 border-l border-gray-200">
                        {rcp.doc_number || rcp.receipt_number || rcp.id}
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono text-gray-600 border-l border-gray-200">
                        {toEnglishDigits(rcp.shamsi_date) || "—"}
                      </td>
                      <td className="px-3.5 py-2.5 text-gray-800 border-l border-gray-200">
                        {rcp.notes || rcp.description || "دریافتی از مشتری"}
                      </td>
                      <td className="px-3 py-2.5 text-center border-l border-gray-200">
                        <span className="px-2 py-0.5 rounded-badge font-bold text-3xs bg-gray-100 text-gray-800 border border-gray-300">
                          {rcp.receipt_type || "حواله / نقدی"}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-left font-mono font-bold text-emerald-700 text-sm border-l border-gray-200" dir="ltr">
                        {Number(rcp.amount).toLocaleString()} {rcp.currency}
                      </td>
                      <td className="px-3 py-2.5 text-center text-gray-700 border-l border-gray-200 whitespace-nowrap">
                        {creatorName(rcp.created_by || rcp.creator)}
                      </td>
                      <td className="px-3 py-2.5 text-center min-w-[150px]">
                        <div className="flex items-center justify-center gap-1.5">
                          <TooltipButton
                            onClick={() => setSelectedIncomeForDetail(rcp)}
                            tooltip="جزییات رسید"
                            className="p-1.5 bg-white hover:bg-gray-100 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-btn shadow-2xs transition-all cursor-pointer inline-flex items-center justify-center"
                          >
                            <FileText size={14} />
                          </TooltipButton>

                          <TooltipButton
                            onClick={() => setSelectedIncomeForEdit(rcp)}
                            tooltip="ویرایش رسید"
                            className="p-1.5 bg-white hover:bg-gray-100 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-btn shadow-2xs transition-all cursor-pointer inline-flex items-center justify-center"
                          >
                            <Edit3 size={14} />
                          </TooltipButton>

                          <TooltipButton
                            onClick={() => setDeleteTarget({ type: "income", record: rcp })}
                            tooltip="حذف رسید"
                            className="p-1.5 bg-white hover:bg-red-600 hover:text-white text-red-600 border border-gray-300 rounded-btn shadow-2xs transition-all cursor-pointer inline-flex items-center justify-center"
                          >
                            <Trash2 size={14} />
                          </TooltipButton>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
      )}
      </div>

      {viewingInvoice && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs font-sans" dir="rtl">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white px-5 py-3.5 flex items-center justify-between border-b border-gray-200">
              <div>
                <h3 className="text-base font-bold text-gray-900">جزییات فاکتور</h3>
                <p className="text-xs text-gray-500 font-mono" dir="ltr">
                  #{String(viewingInvoice.invoice_number).replace(/[^0-9]/g, "").slice(-4) || viewingInvoice.invoice_number}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingInvoice(null)}
                className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs max-h-[85vh] overflow-y-auto">
              <div className="bg-gray-50 p-3 rounded-card border border-gray-200 flex items-center justify-between">
                <div>
                  <span className="text-gray-500 block text-3xs">خریدار:</span>
                  <span className="text-sm font-bold text-gray-900">{viewingInvoice.customer_name || customer?.name}</span>
                </div>
                <div className="text-left font-mono font-bold text-slate-800">
                  {toEnglishDigits(viewingInvoice.shamsi_date)}
                </div>
              </div>

              <div className="border border-gray-200 rounded-table overflow-hidden">
                <table className="w-full text-right border-collapse">
                  <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                    <tr>
                      <th className="p-2">اقلام کالا</th>
                      <th className="p-2 text-center">مقدار / واحد</th>
                      <th className="p-2 text-left" dir="ltr">مجموع ({viewingInvoice.currency})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(viewingInvoice.items || []).map((it, i) => (
                      <tr key={i}>
                        <td className="p-2 font-medium text-gray-900">{formatProductName(it.product_name)}</td>
                        <td className="p-2 text-center text-gray-700" dir="ltr">
                          {Number(it.billable_quantity || it.quantity).toLocaleString()} {it.sales_scale || "تن"}
                        </td>
                        <td className="p-2 text-left font-mono font-bold text-gray-900" dir="ltr">
                          {Number(it.total_price).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-gray-50 p-3 rounded-card border border-gray-200 space-y-1.5">
                <div className="flex justify-between font-bold text-gray-900">
                  <span>مجموع کل فاکتور:</span>
                  <span className="font-mono" dir="ltr">{Number(viewingInvoice.total_amount).toLocaleString()} {viewingInvoice.currency}</span>
                </div>
                <div className="flex justify-between font-semibold text-emerald-700">
                  <span>مبلغ پرداخت شده:</span>
                  <span className="font-mono" dir="ltr">{Number(viewingInvoice.paid_amount).toLocaleString()} {viewingInvoice.currency}</span>
                </div>
                <div className="flex justify-between font-bold text-rose-700 border-t border-gray-200 pt-1.5">
                  <span>مانده حساب طلب:</span>
                  <span className="font-mono" dir="ltr">{Number(viewingInvoice.remaining_amount).toLocaleString()} {viewingInvoice.currency}</span>
                </div>
              </div>

              <div className="flex justify-between pt-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => { setViewingInvoice(null); setPreviewInvoice(viewingInvoice); }}
                  className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-btn text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer size={14} />
                  <span>چاپ فاکتور</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingInvoice(null)}
                  className="px-4 py-1.5 bg-slate-800 text-white rounded-btn text-xs font-bold cursor-pointer"
                >
                  بستن
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {previewInvoice && (
        <SalesInvoicePreviewModal
          isOpen={!!previewInvoice}
          onClose={() => setPreviewInvoice(null)}
          invoice={previewInvoice}
        />
      )}

      <CustomerIncomeDetailModal
        isOpen={!!selectedIncomeForDetail}
        onClose={() => setSelectedIncomeForDetail(null)}
        income={selectedIncomeForDetail}
        onOpenVoucher={(inc) => setSelectedIncomeForVoucher(inc)}
        onOpenEdit={(inc) => setSelectedIncomeForEdit(inc)}
      />

      <CustomerIncomeEditModal
        isOpen={!!selectedIncomeForEdit}
        onClose={() => setSelectedIncomeForEdit(null)}
        income={selectedIncomeForEdit}
        vaults={vaults}
        categories={categories}
        onSuccess={() => {
          setSelectedIncomeForEdit(null);
          fetchCustomerData();
        }}
      />

      <CustomerOpeningBalanceModal
        isOpen={showOpeningBalanceModal}
        onClose={() => setShowOpeningBalanceModal(false)}
        customerId={id}
        openingBalances={openingBalanceEntries}
        onSuccess={() => {
          setShowOpeningBalanceModal(false);
          fetchCustomerData();
        }}
      />

      <DocumentPreviewModal
        isOpen={!!selectedIncomeForVoucher}
        onClose={() => setSelectedIncomeForVoucher(null)}
        htmlPath={selectedIncomeForVoucher ? `/incomes/${selectedIncomeForVoucher.id}/voucher-html` : ""}
        pdfPath={selectedIncomeForVoucher ? `/incomes/${selectedIncomeForVoucher.id}/voucher-pdf` : ""}
        title="رسید دریافتی"
        subtitle={selectedIncomeForVoucher ? `#${selectedIncomeForVoucher.receipt_number || selectedIncomeForVoucher.id}` : ""}
        icon={<FileText size={18} />}
        sheetWidth={560}
      />

      <DocumentPreviewModal
        isOpen={showStatementPdf}
        onClose={() => setShowStatementPdf(false)}
        htmlPath={`/customers/${id}/statement-html`}
        pdfPath={`/customers/${id}/statement-pdf`}
        title="صورت حساب تفصیلی مشتری"
        subtitle={customer?.name || ""}
        icon={<Printer size={18} />}
        sheetWidth={794}
        fitToWidth
      />

      <DeleteConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        itemName={
          deleteTarget?.type === "invoice"
            ? `فاکتور شماره ${deleteTarget.record.invoice_number}`
            : deleteTarget?.type === "income"
            ? `رسید شماره ${deleteTarget.record.receipt_number || deleteTarget.record.id}`
            : ""
        }
        title={deleteTarget?.type === "invoice" ? "تایید حذف فاکتور" : "تایید حذف رسید"}
        question={deleteTarget?.type === "invoice" ? "آیا از حذف این فاکتور مطمئن هستید؟" : "آیا از حذف این رسید مطمئن هستید؟"}
        warning={
          deleteTarget?.type === "invoice"
            ? "با حذف فاکتور، اسناد و تراکنش‌های مربوطه لغو خواهند شد."
            : "با حذف رسید، موجودی صندوق و حساب مشتری اصلاح خواهد شد."
        }
        loading={isDeleting}
      />

      {editing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs font-sans" dir="rtl">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white px-5 py-3.5 flex items-center justify-between border-b border-gray-200">
              <div>
                <h3 className="text-base font-bold text-gray-900">ویرایش اطلاعات مشتری</h3>
                <p className="text-xs text-gray-500 font-mono" dir="ltr">
                  #{customer.customer_code}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-gray-800 mb-1">
                  نام کامل مشتری: <span className="text-rose-600 font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs font-bold text-gray-900 outline-none focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-800 mb-1">
                    شماره تماس ۱ (اصلی): <span className="text-rose-600 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    dir="ltr"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-gray-900 outline-none focus:border-emerald-600 text-right"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-800 mb-1">
                    شماره تماس ۲ (اختیاری):
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={editForm.phone2}
                    onChange={(e) => setEditForm({ ...editForm, phone2: e.target.value })}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-gray-900 outline-none focus:border-emerald-600 text-right"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-800 mb-1">ولایت:</label>
                  <SearchableSelect
                    value={editForm.province}
                    onChange={(val) => setEditForm({ ...editForm, province: val })}
                    options={AFGHAN_PROVINCES.map((p) => ({ value: p, label: p }))}
                    placeholder="انتخاب ولایت"
                    usePortal={true}
                    buttonClassName="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-800 mb-1">سقف مجاز اعتبار ($ دالر):</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={editForm.credit_limit}
                    onChange={(e) => setEditForm({ ...editForm, credit_limit: e.target.value })}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-gray-900 outline-none focus:border-emerald-600 text-right"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-800 mb-1">آدرس دقیق:</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-800 mb-1">توضیحات و یادداشت:</label>
                <textarea
                  rows={2}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 outline-none focus:border-emerald-600 leading-relaxed"
                />
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="text-xs font-bold text-gray-700">وضعیت حساب:</label>
                <label className="flex items-center gap-1.5 cursor-pointer font-bold text-emerald-800 text-xs">
                  <input
                    type="radio"
                    name="modal_status"
                    value="active"
                    checked={editForm.status === "active"}
                    onChange={() => setEditForm({ ...editForm, status: "active" })}
                  />
                  <span>فعال</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer font-bold text-gray-600 text-xs">
                  <input
                    type="radio"
                    name="modal_status"
                    value="inactive"
                    checked={editForm.status === "inactive"}
                    onChange={() => setEditForm({ ...editForm, status: "inactive" })}
                  />
                  <span>غیرفعال</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
                >
                  <span>{savingEdit ? "در حال ذخیره..." : "ذخیره تغییرات"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
