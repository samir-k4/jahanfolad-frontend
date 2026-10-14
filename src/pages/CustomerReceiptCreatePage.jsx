import React, { useState, useEffect, useMemo, useRef } from "react";
import { TEXT_FIELD_MAX_LENGTH, NOTES_MAX_LENGTH } from "../constants/treasuryDomain";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_af from "../utils/persian_af";
import {
  ArrowRight,
  Save,
  Search,
  Check,
  FileText,
  CheckCircle2,
  ChevronDown,
  X,
} from "lucide-react";
import { SearchableSelect, CustomDropdown, DocumentPreviewModal, usePagePerms } from "../components/common";
import { useTranslation } from "react-i18next";
import { Receipt } from "lucide-react";
import useDebounce from "../hooks/useDebounce";
import { getCleanErrorMessage } from "../utils/errorHandler";
import {
  toEnglishDigits,
  formatNumber as fmt,
} from "../utils/dariNumberFormatter";
import { showToast } from "../utils/toast";
import { apiUrl } from "../api";
import { INCOME_TYPE, INCOME_TYPE_IDS, INCOME_TYPE_KEYS, balanceState } from "../constants/incomeDomain";
export default function CustomerReceiptCreatePage() {
  const { t } = useTranslation("incomes");
  const incomeTypes = useMemo(
    () =>
      INCOME_TYPE_IDS.map((id) => ({
        id,
        name: t(`incomeType.${INCOME_TYPE_KEYS[id]}`),
        short: t(`incomeType.${INCOME_TYPE_KEYS[id]}Short`),
      })),
    [t]
  );
  const { canCreate } = usePagePerms("incomes");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedCustomerId = searchParams.get("customer_id");
  const [customers, setCustomers] = useState([]);
  const [vaults, setVaults] = useState([]);
  const [loadingResources, setLoadingResources] = useState(true);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState(() => String(Math.floor(1000 + Math.random() * 9000)));
  const [dateObj, setDateObj] = useState(() => new DateObject({ calendar: persian, locale: persian_af }));
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const debouncedCustomerSearch = useDebounce(customerSearchQuery, 1000);
  const [customerLoanDetails, setCustomerLoanDetails] = useState(null);
  const [loadingCustomerLoan, setLoadingCustomerLoan] = useState(false);
  const [selectedType, setSelectedType] = useState(INCOME_TYPE.INVOICE);
  const [typeSearchQuery, setTypeSearchQuery] = useState("");
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const typeDropdownRef = useRef(null);
  const [selectedVaultId, setSelectedVaultId] = useState("");
  const [vaultSearchQuery, setVaultSearchQuery] = useState("");
  const [isVaultDropdownOpen, setIsVaultDropdownOpen] = useState(false);
  const vaultDropdownRef = useRef(null);
  const [currency, setCurrency] = useState("USD");
  const [exchangeRate, setExchangeRate] = useState("70.00");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [receivedBy, setReceivedBy] = useState(t("create.defaultReceiver"));
  const [createdReceiptData, setCreatedReceiptData] = useState(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [voucherReceipt, setVoucherReceipt] = useState(null);
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(e.target)) {
        setIsTypeDropdownOpen(false);
      }
      if (vaultDropdownRef.current && !vaultDropdownRef.current.contains(e.target)) {
        setIsVaultDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  useEffect(() => {
    const fetchVaults = async () => {
      setLoadingResources(true);
      try {
        const vRes = await fetch(apiUrl("/vaults"));
        if (vRes.ok) {
          const vData = await vRes.json();
          const vList = Array.isArray(vData.data) ? vData.data : (Array.isArray(vData) ? vData : []);
          setVaults(vList);
          const customerVault = vList.find((v) => 
            (v.name && v.name.includes(t("label.customerIncome"))) ||
            (v.name && v.name.includes(t("create.defaultShort")))
          );
          if (customerVault) {
            setSelectedVaultId(String(customerVault.id));
          } else if (vList.length > 0) {
            setSelectedVaultId(String(vList[0].id));
          }
        }
      } catch (err) {
        console.error("Error fetching vaults:", err);
      } finally {
        setLoadingResources(false);
      }
    };
    fetchVaults();
  }, []);
  useEffect(() => {
    let active = true;
    const fetchCustomers = async () => {
      setLoadingCustomers(true);
      try {
        const query = debouncedCustomerSearch.trim();
        const url = query
          ? apiUrl(`/customers?search=${encodeURIComponent(query)}&per_page=50`)
          : apiUrl("/customers?per_page=100");
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
          if (active) {
            setCustomers(list);
            if (preselectedCustomerId && !selectedCustomer) {
              const found = list.find((c) => String(c.id) === String(preselectedCustomerId));
              if (found) setSelectedCustomer(found);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching customers:", err);
      } finally {
        if (active) setLoadingCustomers(false);
      }
    };
    fetchCustomers();
    return () => {
      active = false;
    };
  }, [debouncedCustomerSearch, preselectedCustomerId]);
  useEffect(() => {
    if (!selectedCustomer?.id) {
      setCustomerLoanDetails([]);
      return;
    }
    let active = true;
    const fetchCustomerLoan = async () => {
      setLoadingCustomerLoan(true);
      try {
        const res = await fetch(apiUrl(`/customers/${encodeURIComponent(selectedCustomer.id)}`));
        if (res.ok) {
          const json = await res.json();
          if (active) {
            setCustomerLoanDetails(Array.isArray(json.loans) ? json.loans : (json.loan ? [json.loan] : []));
          }
        }
      } catch (err) {
        console.error("Error fetching customer loan details:", err);
      } finally {
        if (active) setLoadingCustomerLoan(false);
      }
    };
    fetchCustomerLoan();
    return () => {
      active = false;
    };
  }, [selectedCustomer?.id]);
  const matchingLoan = useMemo(() => {
    const loans = Array.isArray(customerLoanDetails) ? customerLoanDetails : [];
    return loans.find((l) => l.currency === currency) || loans[0] || null;
  }, [customerLoanDetails, currency]);
  const customerBalance = matchingLoan?.current_balance !== undefined
    ? parseFloat(matchingLoan.current_balance) || 0
    : 0;
  const accountCurrency = matchingLoan?.currency || currency || "USD";
  const accountCurrencySymbol = accountCurrency === "USD" ? "$" : "؋";
  const filteredTypes = useMemo(() => {
    if (!typeSearchQuery.trim()) return incomeTypes;
    const q = typeSearchQuery.trim().toLowerCase();
    return incomeTypes.filter((t) => t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q));
  }, [typeSearchQuery]);
  const filteredVaults = useMemo(() => {
    if (!vaultSearchQuery.trim()) return vaults;
    const q = vaultSearchQuery.trim().toLowerCase();
    return vaults.filter((v) => {
      const name = String(v.name || "").toLowerCase();
      const curr = String(v.currency || "").toLowerCase();
      return name.includes(q) || curr.includes(q);
    });
  }, [vaults, vaultSearchQuery]);
  const currentVault = useMemo(() => {
    return vaults.find((v) => String(v.id) === String(selectedVaultId));
  }, [vaults, selectedVaultId]);
  const numAmount = parseFloat(toEnglishDigits(amount)) || 0;
  const numRate = parseFloat(toEnglishDigits(exchangeRate)) || 1;
  const isAfn = currency === "AFN";
  const calculatedUsd = useMemo(() => {
    if (!isAfn) return numAmount;
    if (numRate > 0) {
      return (numAmount / numRate).toFixed(2);
    }
    return 0;
  }, [isAfn, numAmount, numRate]);
  const handleSubmit = async (e) => {
    if (!canCreate) return;
    e.preventDefault();
    if (submitting) return;
    if (!selectedCustomer && !customerSearchQuery.trim()) {
      showToast.error(t("create.customerRequired"));
      return;
    }
    if (!selectedVaultId) {
      showToast.error(t("create.vaultRequired"));
      return;
    }
    if (numAmount <= 0) {
      showToast.error(t("create.amountRequired"));
      return;
    }
    if (isAfn && numRate <= 0) {
      showToast.error(t("create.rateRequired"));
      return;
    }
    setSubmitting(true);
    try {
      const payerName = selectedCustomer 
        ? selectedCustomer.name 
        : customerSearchQuery.trim();
      const shamsiDateStr = dateObj ? dateObj.format("YYYY/MM/DD") : "";
      const payload = {
        vault_id: parseInt(selectedVaultId, 10),
        payer_name: payerName,
        customer_id: selectedCustomer ? selectedCustomer.id : null,
        amount: numAmount,
        currency: currency,
        exchange_rate: isAfn ? numRate : 1.0,
        category_name: selectedType,
        receipt_number: receiptNumber.trim() || String(Math.floor(1000 + Math.random() * 9000)),
        shamsi_date: shamsiDateStr,
        title: `دریافتی ${selectedType} — ${payerName}`,
        description: description.trim() || `دریافت وجه بابت ${selectedType} از طرف ${payerName}`,
        received_by: receivedBy.trim() || t("create.defaultReceiver"),
      };
      const res = await fetch(apiUrl("/incomes"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      const resData = await res.json();
      if (!res.ok) {
        const cleanMsg = getCleanErrorMessage(resData, t("create.createError"));
        throw new Error(cleanMsg);
      }
      showToast.success(t("create.created"));
      setCreatedReceiptData({
        ...payload,
        id: resData.data?.id || receiptNumber,
        docNum: resData.data?.receipt_number || receiptNumber,
        customer: selectedCustomer,
        vaultName: currentVault?.name || t("create.defaultVault"),
        calculatedUsd: calculatedUsd,
      });
      setIsSuccessModalOpen(true);
    } catch (err) {
      console.error("Submit income error:", err);
      showToast.error(getCleanErrorMessage(err, t("create.connectionError")));
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="w-full space-y-4 font-sans text-gray-800" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">{t("label.createTitle")}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            to="/incomes"
            className="px-3.5 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-btn hover:bg-gray-50 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowRight size={15} />
            <span>{t("create.back")}</span>
          </Link>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white border border-gray-200 rounded-card shadow-2xs p-5 space-y-5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <span className="text-gray-900 font-bold text-sm">{t("create.sectionParty")}</span>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{t("create.docNumber")}</span>
                  <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-badge border border-emerald-200">
                    {receiptNumber}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1.5">{t("create.customer")}<span className="text-rose-500">*</span>
                  </label>
                  <SearchableSelect
                    options={customers}
                    value={selectedCustomer ? String(selectedCustomer.id) : ""}
                    onChange={(val, opt) => setSelectedCustomer(opt || null)}
                    placeholder={t("create.customerPlaceholder")}
                    searchPlaceholder={t("create.customerSearch")}
                    noResultsText={t("create.customerEmpty")}
                    searchValue={customerSearchQuery}
                    onSearchChange={setCustomerSearchQuery}
                    loading={loadingCustomers}
                    getOptionLabel={(c) => {
                      if (!c) return "";
                      const code = c.customer_code || `C-${c.id}`;
                      return `${c.name} (${code})`;
                    }}
                    getOptionValue={(c) => String(c?.id || "")}
                    buttonClassName="h-[40px] px-3 text-xs"
                    renderOption={(c) => (
                      <div className="flex items-center gap-2 overflow-hidden text-xs">
                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-700 text-[10px] font-mono font-bold rounded-badge shrink-0">
                          {c.customer_code || `C-${c.id}`}
                        </span>
                        <span className="font-bold truncate text-gray-900">{c.name}</span>
                        {c.company_name && (
                          <span className="text-gray-400 text-[11px] truncate">
                            ({c.company_name})
                          </span>
                        )}
                      </div>
                    )}
                  />
                  {selectedCustomer && (
                    <div className="mt-2 p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-btn flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold rounded-badge shrink-0">
                          {selectedCustomer.customer_code || `C-${selectedCustomer.id}`}
                        </span>
                        <span className="font-bold text-gray-900 truncate">
                          {selectedCustomer.name}
                          {selectedCustomer.company_name && (
                            <span className="text-gray-500 font-normal text-[11px] mr-1">
                              ({selectedCustomer.company_name})
                            </span>
                          )}
                        </span>
                      </div>
                      <span className="text-emerald-800 font-bold text-[10px] bg-white px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                        {selectedCustomer.loan_account || t("create.tradeReceivables")}
                      </span>
                    </div>
                  )}
                </div>
                <div className="relative" ref={typeDropdownRef}>
                  <label className="block text-xs font-bold text-gray-800 mb-1.5">{t("create.type")}<span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div
                      onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                      className={`w-full h-[40px] px-3 bg-white border rounded-btn text-xs flex items-center justify-between cursor-pointer transition-colors ${
                        isTypeDropdownOpen ? "border-emerald-600 ring-1 ring-emerald-600" : "border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      <span className="font-bold text-gray-900">{selectedType}</span>
                      <ChevronDown size={16} className={`text-gray-400 transition-transform ${isTypeDropdownOpen ? "rotate-180" : ""}`} />
                    </div>
                    {isTypeDropdownOpen && (
                      <div className="absolute top-full right-0 left-0 mt-1 bg-white border border-gray-200 rounded-card shadow-xl z-50 overflow-hidden animate-in fade-in-50 duration-150">
                        <div className="p-2 border-b border-gray-100 bg-gray-50">
                          <input
                            type="text"
                            maxLength={TEXT_FIELD_MAX_LENGTH}
                            autoFocus
                            value={typeSearchQuery}
                            onChange={(e) => setTypeSearchQuery(e.target.value)}
                            placeholder={t("create.typeSearch")}
                            className="w-full bg-white border border-gray-300 rounded-btn px-2.5 py-1 text-xs text-gray-800 focus:outline-none focus:border-emerald-600"
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto divide-y divide-gray-50">
                          {filteredTypes.map((t) => {
                            const isSelected = selectedType === t.id;
                            return (
                              <div
                                key={t.id}
                                onClick={() => {
                                  setSelectedType(t.id);
                                  setIsTypeDropdownOpen(false);
                                }}
                                className={`p-2.5 px-3 flex items-center justify-between cursor-pointer text-xs transition-colors ${
                                  isSelected ? "bg-emerald-50 text-emerald-900 font-bold" : "hover:bg-gray-50 text-gray-800"
                                }`}
                              >
                                <span>{t.name}</span>
                                {isSelected && <Check size={14} className="text-emerald-600" />}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="relative" ref={vaultDropdownRef}>
                  <label className="block text-xs font-bold text-gray-800 mb-1.5">{t("create.vault")}<span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div
                      onClick={() => setIsVaultDropdownOpen(!isVaultDropdownOpen)}
                      className={`w-full h-[40px] px-3 bg-white border rounded-btn text-xs flex items-center justify-between cursor-pointer transition-colors ${
                        isVaultDropdownOpen ? "border-emerald-600 ring-1 ring-emerald-600" : "border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="font-bold text-gray-900 truncate">
                          {currentVault ? currentVault.name : t("create.vaultPlaceholder")}
                        </span>
                        {currentVault && (
                          <span className="text-[11px] text-gray-500 font-mono shrink-0">
                            ({currentVault.currency})
                          </span>
                        )}
                      </div>
                      <ChevronDown size={16} className={`text-gray-400 shrink-0 transition-transform ${isVaultDropdownOpen ? "rotate-180" : ""}`} />
                    </div>
                    {isVaultDropdownOpen && (
                      <div className="absolute top-full right-0 left-0 mt-1 bg-white border border-gray-200 rounded-card shadow-xl z-50 overflow-hidden animate-in fade-in-50 duration-150">
                        <div className="p-2 border-b border-gray-100 bg-gray-50">
                          <input
                            type="text"
                            maxLength={TEXT_FIELD_MAX_LENGTH}
                            autoFocus
                            value={vaultSearchQuery}
                            onChange={(e) => setVaultSearchQuery(e.target.value)}
                            placeholder={t("create.vaultSearch")}
                            className="w-full bg-white border border-gray-300 rounded-btn px-2.5 py-1 text-xs text-gray-800 focus:outline-none focus:border-emerald-600"
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto divide-y divide-gray-50">
                          {filteredVaults.length === 0 ? (
                            <div className="p-3 text-center text-xs text-gray-400">{t("create.vaultEmpty")}</div>
                          ) : (
                            filteredVaults.map((v) => {
                              const isSelected = String(selectedVaultId) === String(v.id);
                              return (
                                <div
                                  key={v.id}
                                  onClick={() => {
                                    setSelectedVaultId(String(v.id));
                                    setIsVaultDropdownOpen(false);
                                  }}
                                  className={`p-2.5 px-3 flex items-center justify-between cursor-pointer text-xs transition-colors ${
                                    isSelected ? "bg-emerald-50 text-emerald-900 font-bold" : "hover:bg-gray-50 text-gray-800"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <span className="font-bold truncate">{v.name}</span>
                                    <span className="px-1.5 py-0.2 bg-gray-100 text-gray-600 font-mono text-[10px] rounded-badge">
                                      {v.currency}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="font-mono text-[11px] text-gray-500">
                                      موجودی: {fmt(v.current_balance)} {v.currency === 'USD' ? '$' : '؋'}
                                    </span>
                                    {isSelected && <Check size={14} className="text-emerald-600" />}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1.5">{t("create.date")}<span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <DatePicker
                      value={dateObj}
                      onChange={setDateObj}
                      calendar={persian}
                      locale={persian_af}
                      calendarPosition="bottom-right"
                      inputClass="w-full h-[40px] px-3 bg-white border border-gray-300 rounded-btn text-xs text-gray-800 focus:outline-none focus:border-emerald-600 cursor-pointer font-sans"
                      containerClassName="w-full"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1.5">{t("label.currency")}<span className="text-rose-500">*</span>
                  </label>
                  <CustomDropdown
                    value={currency}
                    onChange={(val) => setCurrency(val)}
                    options={[
                      { value: "USD", label: t("create.usdOption") },
                      { value: "AFN", label: t("create.afnOption") },
                    ]}
                    buttonClassName="w-full h-[40px] px-3 bg-white border border-gray-300 rounded-btn text-xs font-bold text-gray-800"
                  />
                </div>
                {isAfn ? (
                  <div className="animate-in fade-in duration-200">
                    <label className="block text-xs font-bold text-emerald-800 mb-1.5">{t("create.rate")}<span className="text-rose-500">*</span>
                      <span className="text-[11px] font-normal text-gray-500 mr-2">{t("create.rateHint")}</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        dir="ltr"
                        onFocus={(e) => e.target.select()}
                        onWheel={(e) => e.target.blur()}
                        value={exchangeRate}
                        onChange={(e) => setExchangeRate(e.target.value)}
                        placeholder={t("create.ratePlaceholder")}
                        className="w-full h-[40px] px-3 bg-emerald-50/50 border border-emerald-300 rounded-btn text-xs font-mono font-bold text-emerald-900 focus:outline-none focus:border-emerald-600"
                      />
                      <span className="absolute left-3 top-2.5 text-xs text-emerald-700 font-bold">
                        AFN / USD
                      </span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5">{t("create.receiver")}</label>
                    <input
                      type="text"
                      maxLength={TEXT_FIELD_MAX_LENGTH}
                      value={receivedBy}
                      onChange={(e) => setReceivedBy(e.target.value)}
                      placeholder={t("create.receiverPlaceholder")}
                      className="w-full h-[40px] px-3 bg-white border border-gray-300 rounded-btn text-xs text-gray-800 focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-card shadow-2xs p-5 space-y-5">
              <div className="border-b border-gray-100 pb-3">
                <span className="text-gray-900 font-bold text-sm">{t("create.sectionAmount")}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1.5">{t("label.amount")}<span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      required
                      dir="ltr"
                      onFocus={(e) => e.target.select()}
                      onWheel={(e) => e.target.blur()}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full h-[44px] px-3 bg-white border-2 border-emerald-600 rounded-btn text-sm font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-200 text-left"
                    />
                    <span className="absolute right-3 top-3 text-xs font-bold text-emerald-700">
                      {currency === "USD" ? t("create.usdShort") : t("create.afnShort")}
                    </span>
                  </div>
                  {numAmount > 0 && (
                    <div className="mt-1.5 text-[11px] text-gray-500 font-medium">{t("create.amountLabel")}<span className="font-bold text-emerald-800">{fmt(numAmount)}</span> {currency === "USD" ? t("currency.USD") : t("currency.AFN")}
                    </div>
                  )}
                </div>
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-btn flex flex-col justify-center h-[76px]">
                  <div className="text-xs text-gray-500 font-medium flex items-center justify-between">
                    <span>{t("create.usdTotal")}</span>
                    {isAfn && (
                      <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-badge font-bold">{t("create.usdHint")}</span>
                    )}
                  </div>
                  <div className="text-lg font-mono font-bold text-emerald-700 mt-1 flex items-center gap-1">
                    <span>$</span>
                    <span>{fmt(calculatedUsd)}</span>
                    <span className="text-xs text-gray-500 font-normal">USD</span>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-800 mb-1.5">{t("create.notes")}</label>
                  <textarea maxLength={NOTES_MAX_LENGTH}
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t("create.notesPlaceholder")}
                    className="w-full p-3 bg-white border border-gray-300 rounded-btn text-xs text-gray-800 focus:outline-none focus:border-emerald-600 leading-relaxed resize-none"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-4 space-y-6">
            {selectedCustomer && (
              <div className="bg-white border border-gray-200 rounded-card shadow-2xs p-5 space-y-4 animate-in fade-in-50 duration-200">
                <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                  <span className="text-gray-900 font-bold text-sm">{t("create.sectionBalance")}</span>
                  <span className="text-[11px] font-mono font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-badge">
                    {selectedCustomer.customer_code || `C-${selectedCustomer.id}`}
                  </span>
                </div>
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
                    <span className="text-gray-500">{t("create.balanceCustomer")}</span>
                    <span className="font-bold text-gray-900 truncate max-w-[170px]">
                      {selectedCustomer.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
                    <span className="text-gray-500">{t("create.balanceCurrency")}</span>
                    <span className="font-bold text-gray-800">
                      {accountCurrency === "USD" ? t("create.usdLong") : t("create.afnLong")}
                    </span>
                  </div>
                  <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-btn space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-amber-900 font-bold">
                      <span>{t("create.balanceAmount")}</span>
                      <span className="font-bold text-[10px] px-2 py-0.5 rounded-badge bg-amber-100 text-amber-800">
                        {loadingCustomerLoan ? t("balance.loading") : t(`balance.${balanceState(customerBalance)}`)}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between pt-1">
                      <span className="text-lg font-mono font-bold text-amber-900">
                        {loadingCustomerLoan ? "..." : fmt(Math.abs(customerBalance))}
                      </span>
                      <span className="font-bold text-xs text-amber-800 font-mono">
                        {accountCurrencySymbol} {accountCurrency}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="bg-white border border-gray-200 rounded-card shadow-2xs p-5 space-y-4 sticky top-6">
              <div className="border-b border-gray-100 pb-3">
                <span className="text-gray-900 font-bold text-sm">{t("create.sectionSummary")}</span>
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
                  <span className="text-gray-500">{t("create.summaryDoc")}</span>
                  <span className="font-mono font-bold text-gray-800">{receiptNumber}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
                  <span className="text-gray-500">{t("create.summaryParty")}</span>
                  <span className="font-bold text-gray-900 truncate max-w-[180px]">
                    {selectedCustomer
                      ? `${selectedCustomer.name} (${selectedCustomer.customer_code || `C-${selectedCustomer.id}`})`
                      : (customerSearchQuery || "—")}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
                  <span className="text-gray-500">{t("create.summaryType")}</span>
                  <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-badge border border-emerald-200">
                    {selectedType}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
                  <span className="text-gray-500">{t("create.summaryVault")}</span>
                  <span className="font-bold text-gray-800 truncate max-w-[150px]">
                    {currentVault?.name || t("create.defaultVault")}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
                  <span className="text-gray-500">{t("label.currencyLabel")}</span>
                  <span className="font-bold text-gray-800">
                    {currency === "USD" ? t("create.usdLong") : t("create.afnLong")}
                  </span>
                </div>
                {isAfn && (
                  <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
                    <span className="text-gray-500">{t("create.summaryRate")}</span>
                    <span className="font-mono font-bold text-emerald-700">{exchangeRate}</span>
                  </div>
                )}
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-btn space-y-1">
                  <div className="flex items-center justify-between text-xs text-emerald-900 font-bold">
                    <span>{t("create.summaryAmount")}</span>
                    <span className="font-mono text-sm">
                      {fmt(numAmount)} {currency === "USD" ? "$" : "؋"}
                    </span>
                  </div>
                  {isAfn && (
                    <div className="flex items-center justify-between text-[11px] text-emerald-700">
                      <span>{t("create.summaryUsd")}</span>
                      <span className="font-mono font-bold">${fmt(calculatedUsd)} USD</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="pt-3 space-y-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-btn transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <span>{t("label.saving")}</span>
                  ) : (
                    <>
                      <Save size={15} />
                      <span>{t("create.submit")}</span>
                    </>
                  )}
                </button>
                <Link
                  to="/incomes"
                  className="w-full py-2 px-4 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs border border-gray-300 rounded-btn transition-colors flex items-center justify-center gap-1.5"
                >
                  <X size={14} />
                  <span>{t("label.cancel")}</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </form>
      {isSuccessModalOpen && createdReceiptData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-modal shadow-2xl max-w-md w-full p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-emerald-600 border-b border-gray-100 pb-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">{t("create.successTitle")}</h3>
                <p className="text-xs text-gray-500 font-mono">
                  شماره سند: {createdReceiptData.docNum}
                </p>
              </div>
            </div>
            <div className="p-3.5 bg-gray-50 rounded-btn border border-gray-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">{t("create.summaryParty")}</span>
                <span className="font-bold text-gray-900">{createdReceiptData.payer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t("create.successAmount")}</span>
                <span className="font-bold text-emerald-700 font-mono text-sm">
                  {fmt(createdReceiptData.amount)} {createdReceiptData.currency === 'USD' ? '$' : '؋'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t("create.successVault")}</span>
                <span className="font-medium text-gray-800">{createdReceiptData.vaultName}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVoucherReceipt(createdReceiptData)}
                className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-btn transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <FileText size={15} />
                <span>{t("create.printReceipt")}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSuccessModalOpen(false);
                  navigate("/incomes");
                }}
                className="py-2 px-4 bg-white hover:bg-gray-100 text-gray-800 font-semibold text-xs rounded-btn border border-gray-300 transition-colors cursor-pointer"
              >{t("create.viewList")}</button>
            </div>
          </div>
        </div>
      )}
    <DocumentPreviewModal
        isOpen={Boolean(voucherReceipt)}
        onClose={() => setVoucherReceipt(null)}
        htmlPath={voucherReceipt ? `/incomes/${voucherReceipt.id}/voucher-html` : ""}
        pdfPath={voucherReceipt ? `/incomes/${voucherReceipt.id}/voucher-pdf` : ""}
        title={t("common:voucher.receiptTitle")}
        subtitle={voucherReceipt ? t("common:voucher.receiptMeta", { doc: voucherReceipt.docNum, payer: voucherReceipt.payer_name || "" }) : ""}
        icon={<Receipt className="w-5 h-5" />}
      />
    </div>
  );
}
