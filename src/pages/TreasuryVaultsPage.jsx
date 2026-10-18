import React, { useState, useEffect, useCallback } from "react";
import { showToast } from "../utils/toast";
import { Receipt } from "lucide-react";
import useDatePresets from "../hooks/useDatePresets";
import { toEnglishDigits } from "../utils/dariNumberFormatter";
import VaultsTable from "../components/treasury/VaultsTable";
import TransactionFilters from "../components/treasury/TransactionFilters";
import TransactionLedger from "../components/treasury/TransactionLedger";
import VaultCreateModal from "../components/treasury/VaultCreateModal";
import VaultExchangeModal from "../components/treasury/VaultExchangeModal";
import DepositWithdrawModal from "../components/treasury/DepositWithdrawModal";
import TransactionReportModal from "../components/treasury/TransactionReportModal";
import { DocumentPreviewModal, usePagePerms } from "../components/common";
import useAbortController, { isAbortError } from "../hooks/useAbortController";
import useDebounce from "../hooks/useDebounce";
import { apiUrl } from "../api";
import { formatDocNumber } from "../components/treasury/treasuryHelpers";
import { useTranslation } from "react-i18next";
export default function TreasuryVaultsPage() {
  const nextSignal = useAbortController();
  const { t } = useTranslation("treasury");
  const { canCreate } = usePagePerms("treasury");
  const [vaults, setVaults] = useState([]);
  const [vaultsLoading, setVaultsLoading] = useState(false);
  const [advancesSummary, setAdvancesSummary] = useState({
    total_open_afn: 0,
    total_open_usd: 0,
    open_advances_count: 0,
  });
  const {
    activePreset: filterPreset,
    setActivePreset: setFilterPreset,
    fromDate: filterStartDate,
    setFromDate: setFilterStartDate,
    toDate: filterEndDate,
    setToDate: setFilterEndDate,
    applyPreset: handlePresetChange,
  } = useDatePresets("current_month");
  const [selectedVaultFilter, setSelectedVaultFilter] = useState("all");
  const [selectedCurrencyFilter, setSelectedCurrencyFilter] = useState("all");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("all");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 1000);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(false);
  const [paginationMeta, setPaginationMeta] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
    from: 0,
    to: 0,
  });
  const [activeModal, setActiveModal] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [voucherTx, setVoucherTx] = useState(null);
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);
  const fetchVaults = useCallback(async () => {
    setVaultsLoading(true);
    try {
      const res = await fetch(apiUrl("/vaults"));
      const json = await res.json();
      setVaults(json.data || []);
    } catch (err) {
      console.error("Error loading vaults:", err);
    } finally {
      setVaultsLoading(false);
    }
  }, []);
  const fetchAdvancesSummary = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/manager-advances/summary"));
      if (res.ok) {
        const json = await res.json();
        setAdvancesSummary(
          json.summary || { total_open_afn: 0, total_open_usd: 0, open_advances_count: 0 }
        );
      }
    } catch (err) {
      console.error("Error loading manager advances summary:", err);
    }
  }, []);
  const fetchTransactions = useCallback(async (page = 1) => {
    const signal = nextSignal();
    setTxLoading(true);
    try {
      const params = new URLSearchParams({ page, per_page: perPage });
      if (filterStartDate) params.append("from_date", toEnglishDigits(filterStartDate.format("YYYY/MM/DD")));
      if (filterEndDate)   params.append("to_date",   toEnglishDigits(filterEndDate.format("YYYY/MM/DD")));
      if (selectedVaultFilter !== "all") params.append("vault_id", selectedVaultFilter);
      if (selectedCurrencyFilter !== "all") params.append("currency", selectedCurrencyFilter);
      if (selectedTypeFilter !== "all") params.append("type", selectedTypeFilter);
      if (selectedCategoryFilter !== "all") params.append("category_id", selectedCategoryFilter);
      if (debouncedSearchTerm.trim()) params.append("search", debouncedSearchTerm.trim());
      const res = await fetch(apiUrl(`/vault-transactions?${params}`), { signal });
      if (res.ok) {
        const json = await res.json();
        setTransactions(json.data || []);
        setPaginationMeta({
          current_page: json.current_page || 1,
          last_page:    json.last_page    || 1,
          per_page:     json.per_page     || perPage,
          total:        json.total        || 0,
          from:         json.from         || 0,
          to:           json.to           || 0,
        });
        setCurrentPage(json.current_page || 1);
      }
    } catch (err) {
      if (isAbortError(err)) return;
      console.error("Error loading transactions:", err);
    } finally {
      setTxLoading(false);
    }
  }, [filterStartDate, filterEndDate, selectedVaultFilter, selectedCurrencyFilter, selectedTypeFilter, selectedCategoryFilter, debouncedSearchTerm, perPage]);
  useEffect(() => {
    fetchVaults();
    fetchAdvancesSummary();
  }, [fetchVaults, fetchAdvancesSummary, nextSignal]);
  useEffect(() => {
    fetchTransactions(currentPage);
  }, [fetchTransactions, currentPage]);
  const handleModalSubmit = async (modalType, payload) => {
    let endpoint = "";
    if (modalType === "new_vault")  endpoint = apiUrl("/vaults");
    if (modalType === "exchange")   endpoint = apiUrl("/vaults/exchange");
    if (modalType === "deposit")    endpoint = apiUrl("/vaults/deposit");
    if (modalType === "withdraw")   endpoint = apiUrl("/vaults/withdraw");
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.message || t("messages.operationFailed"));
    showToast.success(resData.message || t("toast.successGeneric", { ns: "common" }));
    setActiveModal(null);
    fetchVaults();
    fetchTransactions(currentPage);
  };
  return (
    <div className="space-y-3.5 pb-6 font-sans" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">{t("page.title")}</h1>
          </div>
          <p className="text-subtitle text-gray-500 font-medium mt-1">{t("page.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setShowReportModal(true)}
            className="px-4 py-2 text-btn-text font-bold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <span>{t("page.report")}</span>
          </button>
          {canCreate && (
          <button
            type="button"
            onClick={() => setActiveModal("new_vault")}
            className="px-4 py-2 text-btn-text font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <span>{t("page.newVault")}</span>
          </button>
          )}
        </div>
      </div>
      <VaultsTable
        vaults={vaults}
        loading={vaultsLoading}
        onOpenModal={(modalType) => setActiveModal(modalType)}
        onVaultDeleted={fetchVaults}
        managerAdvancesSummary={advancesSummary}
      />
      <div className="space-y-1.5">
        <TransactionFilters
          filterPreset={filterPreset}
          filterStartDate={filterStartDate}
          filterEndDate={filterEndDate}
          selectedVaultFilter={selectedVaultFilter}
          selectedCurrencyFilter={selectedCurrencyFilter}
          selectedTypeFilter={selectedTypeFilter}
          selectedCategoryFilter={selectedCategoryFilter}
          searchTerm={searchTerm}
          vaults={vaults}
          loading={txLoading}
          total={paginationMeta.total}
          onPresetChange={handlePresetChange}
          onStartDateChange={(date) => { setFilterPreset("custom"); setFilterStartDate(date); }}
          onEndDateChange={(date)   => { setFilterPreset("custom"); setFilterEndDate(date); }}
          onVaultChange={setSelectedVaultFilter}
          onCurrencyChange={setSelectedCurrencyFilter}
          onTypeChange={(t) => { setSelectedTypeFilter(t); setCurrentPage(1); }}
          onCategoryChange={(c) => { setSelectedCategoryFilter(c); setCurrentPage(1); }}
          onSearchChange={setSearchTerm}
          onRefresh={() => fetchTransactions(currentPage)}
          onOpenReportModal={() => setShowReportModal(true)}
        />
        <TransactionLedger
          transactions={transactions}
          loading={txLoading}
          paginationMeta={paginationMeta}
          perPage={perPage}
          onPageChange={fetchTransactions}
          onPerPageChange={(n) => { setPerPage(n); setCurrentPage(1); }}
          onPrint={setVoucherTx}
          onTransactionUpdated={() => fetchTransactions(currentPage)}
          onTransactionDeleted={() => {
            fetchTransactions(currentPage);
            fetchVaults();
          }}
        />
      </div>
      <VaultCreateModal
        isOpen={activeModal === "new_vault"}
        onClose={() => setActiveModal(null)}
        onSubmit={(data) => handleModalSubmit("new_vault", data)}
      />
      <VaultExchangeModal
        isOpen={activeModal === "exchange"}
        onClose={() => setActiveModal(null)}
        onSubmit={(data) => handleModalSubmit("exchange", data)}
        vaults={vaults}
      />
      <DepositWithdrawModal
        isOpen={["deposit", "withdraw"].includes(activeModal)}
        initialType={activeModal || "deposit"}
        onClose={() => setActiveModal(null)}
        onSubmit={(data) => handleModalSubmit(activeModal, data)}
        vaults={vaults}
      />
      <TransactionReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        vaults={vaults}
      />
      <DocumentPreviewModal
        isOpen={Boolean(voucherTx)}
        onClose={() => setVoucherTx(null)}
        htmlPath={voucherTx ? `/vault-transactions/${voucherTx.id}/voucher-html` : ""}
        pdfPath={voucherTx ? `/vault-transactions/${voucherTx.id}/voucher-pdf` : ""}
        title={t("common:voucher.transactionTitle")}
        subtitle={voucherTx ? t("common:voucher.transactionMeta", { doc: formatDocNumber(voucherTx.receipt_number, voucherTx.id), vault: voucherTx.vault?.name || "" }) : ""}
        icon={<Receipt className="w-5 h-5" />}
      />
    </div>
  );
}
