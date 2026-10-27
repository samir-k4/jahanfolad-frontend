import  { useState, useEffect, useCallback } from "react";
import { TEXT_FIELD_MAX_LENGTH } from "../constants/treasuryDomain";
import { usePagePerms, DocumentPreviewModal } from "../components/common";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import CustomerIncomeReportModal from "../components/incomes/CustomerIncomeReportModal";
import CustomerIncomeDetailModal from "../components/incomes/CustomerIncomeDetailModal";
import {
  TooltipButton,
  TablePagination,
  CustomDropdown,
  DeleteConfirmationModal,
} from "../components/common";
import useAbortController, { isAbortError } from "../hooks/useAbortController";
import useDebounce from "../hooks/useDebounce";
import {
  Plus,
  FileText,
  Search,
  Trash2,
  RotateCcw,
  Info,
  Edit2,
  Receipt,
} from "lucide-react";
import { getCleanErrorMessage } from "../utils/errorHandler";
import {
  formatNumber as fmt,
  toEnglishDigits,
} from "../utils/dariNumberFormatter";
import { formatDocNumber } from "../utils/formatDocNumber";
import { showToast } from "../utils/toast";
import { apiUrl } from "../api";
import useIncomeCategories from "../hooks/useIncomeCategories";
export default function CustomerReceiptsPage() {
  const nextSignal = useAbortController();
  const navigate = useNavigate();
  const { t } = useTranslation("incomes");
  const { canCreate, canDelete, canEdit } = usePagePerms("incomes");
  const { categories } = useIncomeCategories();
  const [loading, setLoading] = useState(false);
  const [incomes, setIncomes] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
  });
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedCurrencyFilter, setSelectedCurrencyFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 1000);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery]);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedIncomeForDetail, setSelectedIncomeForDetail] = useState(null);
  const [selectedIncomeForVoucher, setSelectedIncomeForVoucher] = useState(null);
  const [incomeToDelete, setIncomeToDelete] = useState(null);
  const fetchIncomes = useCallback(async () => {
    const signal = nextSignal();
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", String(currentPage));
      params.append("per_page", String(perPage));
      if (selectedCategory !== "all") params.append("category_id", selectedCategory);
      if (selectedCurrencyFilter !== "all") params.append("currency", selectedCurrencyFilter);
      if (debouncedSearchQuery.trim()) params.append("search", debouncedSearchQuery.trim());
      const res = await fetch(apiUrl(`/incomes?${params.toString()}`), { signal });
      if (!res.ok) throw new Error("Failed to fetch incomes");
      const data = await res.json();
      setIncomes(data.incomes || []);
      setPagination(data.pagination || {
        current_page: 1,
        last_page: 1,
        per_page: perPage,
        total: 0,
      });
    } catch (err) {
      if (isAbortError(err)) return;
      console.error("Error fetching incomes:", err);
      showToast.error(getCleanErrorMessage(err, t("messages.listError")));
    } finally {
      setLoading(false);
    }
  }, [currentPage, perPage, selectedCategory, selectedCurrencyFilter, debouncedSearchQuery, nextSignal]);
  useEffect(() => {
    fetchIncomes();
  }, [fetchIncomes]);
  const handleConfirmDelete = () => {
    if (!incomeToDelete) return;
    const targetIncome = incomeToDelete;
    setIncomeToDelete(null);
    setIncomes((prev) => prev.filter((item) => item.id !== targetIncome.id));
    const docCode = formatDocNumber(targetIncome.receipt_number, targetIncome.id);
    const label = `سند دریافتی #${docCode} (${targetIncome.payer_name || t("table.customerFallback")}) حذف گردید.`;
    showToast.undo(label, {
      duration: 4000,
      onUndo: () => {
        fetchIncomes();
        showToast.info(t("messages.deleted"));
      },
      onConfirm: async () => {
        try {
          const res = await fetch(apiUrl(`/incomes/${encodeURIComponent(targetIncome.id)}`), {
            method: "DELETE",
            headers: { Accept: "application/json" },
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(getCleanErrorMessage(data, t("messages.deleteError")));
          }
          fetchIncomes();
        } catch (err) {
          console.error("Delete error:", err);
          fetchIncomes();
          showToast.error(getCleanErrorMessage(err, t("messages.deleteError")));
        }
      },
    });
  };
  const handleResetFilters = () => {
    setSelectedCategory("all");
    setSelectedCurrencyFilter("all");
    setSearchQuery("");
    setCurrentPage(1);
  };
  return (
    <div className="w-full space-y-4 font-sans" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-page-title text-gray-900 tracking-tight">{t("navigation.pages.incomes", { ns: "common" })}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          {canCreate && (
            <button
              type="button"
              onClick={() => setIsReportModalOpen(true)}
              className="px-3.5 py-2 text-btn-text font-bold text-gray-700 bg-white border border-gray-300 rounded-btn hover:bg-gray-50 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <FileText size={15} />
              <span>{t("page.report")}</span>
            </button>
          )}
          <Link
            to="/customer-receipts/create"
            className="px-4 py-2 text-btn-text font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-btn transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={16} />
            <span>{t("label.createTitle")}</span>
          </Link>
        </div>
      </div>
      <div className="bg-white p-3.5 rounded-card border border-gray-200 shadow-2xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute right-3 top-2.5 text-gray-400" />
          <input
            type="text"
            maxLength={TEXT_FIELD_MAX_LENGTH}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("filters.searchPlaceholder")}
            className="w-full border border-gray-300 rounded-input pr-9 pl-3 py-1.5 text-body-text placeholder:text-placeholder-text text-gray-800 focus:outline-none focus:border-emerald-600 bg-white"
          />
        </div>
        <CustomDropdown
          value={selectedCategory}
          onChange={(val) => {
            setSelectedCategory(val);
            setCurrentPage(1);
          }}
          options={[
            { value: "all", label: t("filters.allCategories") },
            ...categories.map((cat) => ({ value: String(cat.id), label: cat.name })),
          ]}
          placeholder={t("filters.allCategories")}
          buttonClassName="px-3 py-1.5 text-body-text font-medium text-gray-700 bg-white min-w-[145px]"
          width="w-48"
          align="right"
        />
        <CustomDropdown
          value={selectedCurrencyFilter}
          onChange={(val) => {
            setSelectedCurrencyFilter(val);
            setCurrentPage(1);
          }}
          options={[
            { value: "all", label: t("filters.allCurrencies") },
            { value: "AFN", label: t("currency.AFN") },
            { value: "USD", label: t("currency.USD") },
          ]}
          placeholder={t("filters.allCurrencies")}
          buttonClassName="px-3 py-1.5 text-body-text font-medium text-gray-700 bg-white min-w-[110px]"
          width="w-36"
          align="right"
        />
        {(selectedCategory !== "all" || selectedCurrencyFilter !== "all" || searchQuery) && (
          <TooltipButton
            icon={<RotateCcw size={15} />}
            tooltip={t("filters.reset")}
            onClick={handleResetFilters}
            colorClass="bg-white text-gray-500 hover:text-gray-800 hover:bg-gray-100 border border-gray-300"
          />
        )}
      </div>
      <div className="bg-white rounded-table border border-gray-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-table-cell-text border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-700 border-b border-gray-200 text-table-header-text">
                <th className="p-3 text-center w-12 border-l border-gray-200">#</th>
                <th className="p-3 text-center border-l border-gray-200">{t("table.docNumber")}</th>
                <th className="p-3 text-center border-l border-gray-200">{t("label.date")}</th>
                <th className="p-3 text-right border-l border-gray-200">{t("table.payer")}</th>
                <th className="p-3 text-center border-l border-gray-200">{t("label.category")}</th>
                <th className="p-3 text-center border-l border-gray-200">{t("table.vault")}</th>
                <th className="p-3 text-center border-l border-gray-200">{t("label.amount")}</th>
                <th className="p-3 text-center border-l border-gray-200">{t("table.usdEquivalent")}</th>
                <th className="p-3 border-l border-gray-200">{t("table.notes")}</th>
                <th className="p-3 text-center border-l border-gray-200">{t("table.createdBy", { ns: "common" })}</th>
                <th className="p-3 text-center">{t("table.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={11} className="p-12 text-center text-gray-500 text-table-cell-text">{t("table.loading")}</td>
                </tr>
              ) : incomes.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-12 text-center text-gray-500 text-table-cell-text">{t("table.empty")}</td>
                </tr>
              ) : (
                incomes.map((inc, idx) => {
                  const rowIndex = (pagination.current_page - 1) * pagination.per_page + idx + 1;
                  const docNum = inc.receipt_number || inc.id;
                  return (
                    <tr key={inc.id} className="hover:bg-gray-50/70 transition-colors text-table-cell-text">
                      <td className="p-3 text-center text-gray-500 border-l border-gray-100 font-mono">
                        {rowIndex}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-gray-800 border-l border-gray-100" dir="ltr">
                        {docNum}
                      </td>
                      <td className="p-3 text-center font-mono text-gray-700 border-l border-gray-100 whitespace-nowrap" dir="ltr">
                        {toEnglishDigits(inc.shamsi_date) || "—"}
                      </td>
                      <td className="p-3 font-bold text-gray-900 border-l border-gray-100">
                        <div className="flex items-center gap-1.5">
                          <span>{inc.payer_name || "—"}</span>
                        </div>
                      </td>
                      <td className="p-3 text-center border-l border-gray-100 whitespace-nowrap">
                        <span className="inline-block px-2.5 py-0.5 rounded-badge bg-gray-100 text-gray-700 text-caption-text font-semibold">
                          {inc.category?.name || inc.category_name || t("label.misc")}
                        </span>
                      </td>
                      <td className="p-3 text-center border-l border-gray-100 whitespace-nowrap font-medium text-gray-800">
                        {inc.vault?.name || "—"}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-emerald-700 bg-emerald-50/30 border-l border-gray-100 whitespace-nowrap" dir="ltr">
                        +{fmt(inc.amount)} {inc.currency}
                      </td>
                      <td className="p-3 text-center font-mono text-gray-600 border-l border-gray-100 whitespace-nowrap" dir="ltr">
                        {inc.converted_amount_usd ? `$${fmt(inc.converted_amount_usd)}` : "—"}
                      </td>
                      <td className="p-3 text-gray-700 border-l border-gray-100 text-table-cell-text">
                        {inc.description || inc.title ? (
                          <div className="relative group/note inline-block max-w-[220px]">
                            <span className="block truncate font-medium text-gray-800">
                              {inc.description || inc.title}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="p-3 text-center text-gray-700 border-l border-gray-100 whitespace-nowrap">
                        {inc.created_by?.name || inc.created_by || inc.creator?.name || "—"}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <TooltipButton
                            icon={<Info size={14} />}
                            tooltip={t("table.detailTip")}
                            onClick={() => setSelectedIncomeForDetail(inc)}
                            colorClass="bg-white text-gray-500 border border-gray-300 hover:bg-blue-600 hover:text-white hover:border-blue-600 shadow-2xs"
                          />
                          {canEdit && (
                            <TooltipButton
                              icon={<Edit2 size={13} />}
                              tooltip={t("label.editTitle")}
                              onClick={() =>
                                navigate(`/incomes/create?edit=${encodeURIComponent(inc.id)}`, {
                                  state: { income: inc, returnTo: "/customer-receipts" },
                                })
                              }
                              colorClass="bg-white text-gray-500 border border-gray-300 hover:bg-amber-500 hover:text-white hover:border-amber-500 shadow-2xs"
                            />
                          )}
                          <TooltipButton
                            icon={<FileText size={13} />}
                            tooltip={t("table.voucherTip")}
                            onClick={() => setSelectedIncomeForVoucher(inc)}
                            colorClass="bg-white text-gray-500 border border-gray-300 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 shadow-2xs"
                          />
                          {canDelete && (
                            <TooltipButton
                              icon={<Trash2 size={13} />}
                              tooltip={t("table.deleteTip")}
                              onClick={() => setIncomeToDelete(inc)}
                              colorClass="bg-white text-gray-500 border border-gray-300 hover:bg-rose-600 hover:text-white hover:border-rose-600 shadow-2xs"
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <TablePagination
          currentPage={pagination.current_page}
          lastPage={pagination.last_page}
          total={pagination.total}
          perPage={perPage}
          onPageChange={setCurrentPage}
          onPerPageChange={(newPerPage) => {
            setPerPage(newPerPage);
            setCurrentPage(1);
          }}
          unit={t("table.unit")}
        />
      </div>
      <CustomerIncomeReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />
      <DocumentPreviewModal
        isOpen={!!selectedIncomeForVoucher}
        onClose={() => setSelectedIncomeForVoucher(null)}
        htmlPath={selectedIncomeForVoucher ? `/incomes/${selectedIncomeForVoucher.id}/voucher-html` : ""}
        pdfPath={selectedIncomeForVoucher ? `/incomes/${selectedIncomeForVoucher.id}/voucher-pdf` : ""}
        title={t("common:voucher.receiptTitle")}
        subtitle={selectedIncomeForVoucher ? t("common:voucher.receiptMeta", { doc: formatDocNumber(selectedIncomeForVoucher.receipt_number, selectedIncomeForVoucher.id), payer: selectedIncomeForVoucher.payer_name || "" }) : ""}
        icon={<Receipt className="w-5 h-5" />}
        sheetWidth={560}
      />
      <CustomerIncomeDetailModal
        isOpen={!!selectedIncomeForDetail}
        onClose={() => setSelectedIncomeForDetail(null)}
        income={selectedIncomeForDetail}
        onOpenVoucher={(inc) => setSelectedIncomeForVoucher(inc)}
        onOpenEdit={(inc) =>
          navigate(`/incomes/create?edit=${encodeURIComponent(inc.id)}`, {
            state: { income: inc, returnTo: "/customer-receipts" },
          })
        }
      />
      <DeleteConfirmationModal
        isOpen={!!incomeToDelete}
        onClose={() => setIncomeToDelete(null)}
        onConfirm={handleConfirmDelete}
        itemName={
          incomeToDelete
            ? `سند #${formatDocNumber(incomeToDelete.receipt_number, incomeToDelete.id)} (${incomeToDelete.payer_name || t("table.customerFallback")})`
            : ""
        }
        title={t("delete.title")}
        question={t("delete.question")}
        warning={t("delete.warning")}
      />
    </div>
  );
}
