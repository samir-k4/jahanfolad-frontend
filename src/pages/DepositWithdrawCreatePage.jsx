import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useSearchParams, useParams, useLocation } from "react-router-dom";
import DatePicker from "react-multi-date-picker";
import { DateObject, persian, persian_af } from "../utils/dateHelpers";
import {
  ArrowRight,
  Save,
  AlertTriangle,
  RotateCcw,
  X,
} from "lucide-react";
import { SearchableSelect, CustomDropdown, usePagePerms } from "../components/common";
import { toEnglishDigits } from "../utils/dariNumberFormatter";
import { showToast } from "../utils/toast";
import { apiUrl } from "../api";
import {
} from "../components/treasury/treasuryHelpers";
import { CURRENCY, MEMBER_ROLE, RECEIPT_TYPE } from "../constants/treasuryDomain";
import { useTranslation } from "react-i18next";
const getNow12Hour = () => {
  const now = new Date();
  const rawH = now.getHours();
  const m = String(now.getMinutes()).padStart(2, "0");
  const p = rawH >= 12 ? "PM" : "AM";
  const h12 = rawH % 12 || 12;
  return {
    time: `${String(h12).padStart(2, "0")}:${m}`,
    period: p,
  };
};
export default function DepositWithdrawCreatePage() {
  const { t } = useTranslation("depositsWithdrawals");
  const memberRoleOptions = Object.values(MEMBER_ROLE).map((value) => ({ value, label: t(`memberRole.${value}`) }));
  const paymentMethodOptions = Object.values(RECEIPT_TYPE).map((value) => ({ value, label: t(`receiptType.${value}`) }));
  const currencyOptions = [CURRENCY.AFN, CURRENCY.USD].map((value) => ({ value, label: t(`currency.${value}`) }));
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { id } = useParams();
  const location = useLocation();
  const isEditMode = Boolean(id);
  const { canCreate, canEdit } = usePagePerms("treasury");
  const canSubmit = isEditMode ? canEdit : canCreate;
  const editTxFromState = location.state?.tx;
  const initialTypeFromUrl = searchParams.get("type");
  const [transactionType, setTransactionType] = useState(
    initialTypeFromUrl === "withdraw" ? "withdraw" : "deposit"
  );
  const [vaults, setVaults] = useState([]);
  const [categories, setCategories] = useState([]);
  const [members, setMembers] = useState([]);
  const [loadingVaults, setLoadingVaults] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [docNumber, setDocNumber] = useState("");
  const [dateObj, setDateObj] = useState(
    () => new DateObject({ calendar: persian, locale: persian_af })
  );
  const initialTime = useMemo(() => getNow12Hour(), []);
  const [timeStr, setTimeStr] = useState(initialTime.time);
  const [timePeriod, setTimePeriod] = useState(initialTime.period);
  const [selectedVaultId, setSelectedVaultId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);
  const [partyName, setPartyName] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedHandler, setSelectedHandler] = useState("");
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("partner");
  const [newMemberPhone, setNewMemberPhone] = useState("");
  const [savingMember, setSavingMember] = useState(false);
  const [currency, setCurrency] = useState("AFN");
  const [amount, setAmount] = useState("");
  const [exchangeRate, setExchangeRate] = useState("70.00");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [description, setDescription] = useState("");
  const isDeposit = transactionType === "deposit";
  const categoryOptions = useMemo(() => {
    const filtered = categories.filter((c) => {
      if (isDeposit) return c.type === "deposit" || c.type === "both";
      return c.type === "withdraw" || c.type === "both";
    });
    return filtered.map((c) => ({
      value: String(c.id),
      label: c.name,
      raw: c,
    }));
  }, [categories, isDeposit]);
  const availableCurrencyOptions = useMemo(() => {
    if (vaults.length > 0) {
      const distinct = Array.from(new Set(vaults.map((v) => v.currency).filter(Boolean)));
      if (distinct.length > 0) {
        return distinct.map((c) => {
          const found = currencyOptions.find((item) => item.value === c);
          return found || { value: c, label: c };
        });
      }
    }
    return currencyOptions;
  }, [vaults]);
  useEffect(() => {
    if (!isEditMode) {
      fetch(apiUrl("/vault-transactions/next-code"))
        .then((res) => res.json())
        .then((json) => {
          if (json.next_code) {
            setDocNumber(String(json.next_code));
          }
        })
        .catch(() => {});
    }
  }, [isEditMode]);
  useEffect(() => {
    if (initialTypeFromUrl === "withdraw" || initialTypeFromUrl === "deposit") {
      setTransactionType(initialTypeFromUrl);
    }
  }, [initialTypeFromUrl]);
  useEffect(() => {
    if (!isEditMode) return;
    const populateForm = (tx) => {
      const isDep = ["deposit", "transfer_in", "exchange_in"].includes(tx.transaction_type);
      setTransactionType(isDep ? "deposit" : "withdraw");
      if (tx.vault_id) setSelectedVaultId(String(tx.vault_id));
      if (tx.receipt_number) setDocNumber(String(tx.receipt_number));
      if (tx.category_id) setSelectedCategoryId(String(tx.category_id));
      if (tx.member_id) setSelectedMemberId(String(tx.member_id));
      if (tx.currency) setCurrency(tx.currency);
      if (tx.amount) setAmount(String(tx.amount));
      if (tx.exchange_rate) setExchangeRate(String(tx.exchange_rate));
      if (tx.receipt_type) setPaymentMethod(tx.receipt_type);
      if (tx.reference_number) setReferenceNumber(tx.reference_number);
      if (tx.notes) setDescription(tx.notes);
      const pName = isDep ? (tx.paid_by || tx.party_name || "") : (tx.received_by || tx.party_name || "");
      if (pName) setPartyName(pName);
      if (tx.shamsi_date) {
        const parts = tx.shamsi_date.split("/").map(Number);
        if (parts.length === 3) {
          setDateObj(new DateObject({ calendar: persian, locale: persian_af, year: parts[0], month: parts[1], day: parts[2] }));
        }
      }
      if (tx.transaction_time) {
        const clean = tx.transaction_time.replace(/ب\.ظ|ق\.ظ|AM|PM/gi, "").trim();
        setTimeStr(clean);
        setTimePeriod(tx.transaction_time.includes(t("timeSuffix.pm")) || tx.transaction_time.includes("PM") ? "PM" : "AM");
      }
    };
    if (editTxFromState) {
      populateForm(editTxFromState);
    } else {
      fetch(apiUrl(`/vault-transactions/${id}`))
        .then((res) => res.json())
        .then((json) => {
          if (json.data) populateForm(json.data);
        })
        .catch((err) => {
          console.error(err);
          showToast.error(t("messages.loadTxFailed"));
        });
    }
  }, [id, isEditMode, editTxFromState]);
  useEffect(() => {
    const fetchData = async () => {
      setLoadingVaults(true);
      try {
        const [vRes, cRes, mRes, eRes] = await Promise.all([
          fetch(apiUrl("/vaults")),
          fetch(apiUrl("/vault-transaction-categories")),
          fetch(apiUrl("/vault-transaction-members")),
          fetch(apiUrl("/employees?per_page=200&status=active")),
        ]);
        if (vRes.ok) {
          const vJson = await vRes.json();
          const vList = Array.isArray(vJson.data) ? vJson.data : (Array.isArray(vJson) ? vJson : []);
          setVaults(vList);
          if (vList.length > 0 && !selectedVaultId && !isEditMode) {
            setSelectedVaultId(String(vList[0].id));
            setCurrency(vList[0].currency || "AFN");
          }
        }
        let catList = [];
        if (cRes.ok) {
          const cJson = await cRes.json();
          catList = Array.isArray(cJson.data) ? cJson.data : [];
          setCategories(catList);
        }
        let memList = [];
        if (mRes.ok) {
          const mJson = await mRes.json();
          memList = Array.isArray(mJson.data) ? mJson.data : [];
        }
        let empList = [];
        if (eRes.ok) {
          const eJson = await eRes.json();
          empList = Array.isArray(eJson.data) ? eJson.data : (Array.isArray(eJson) ? eJson : []);
        }
        const combinedMembers = [...memList];
        empList.forEach((emp) => {
          const fullName = `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || emp.name;
          const exists = combinedMembers.some((m) => m.name === fullName);
          if (!exists) {
            combinedMembers.push({
              id: `emp-${emp.id}`,
              name: fullName,
              member_type: "employee",
              phone: emp.phone || "",
              is_employee: true,
            });
          }
        });
        setMembers(combinedMembers);
      } catch (err) {
        showToast.error(t("messages.loadFormFailed"));
      } finally {
        setLoadingVaults(false);
      }
    };
    fetchData();
  }, []);
  useEffect(() => {
    if (selectedCategoryId && categoryOptions.length > 0) {
      const currentExists = categoryOptions.some((opt) => opt.value === String(selectedCategoryId));
      if (!currentExists) {
        setSelectedCategoryId("");
      }
    }
  }, [categoryOptions, selectedCategoryId]);
  useEffect(() => {
    if (selectedMemberId && members.length > 0 && !selectedHandler) {
      const found = members.find((m) => String(m.id) === String(selectedMemberId));
      if (found) {
        setSelectedHandler(found.name);
      }
    }
  }, [selectedMemberId, members, selectedHandler]);
  useEffect(() => {
    if (selectedHandler && members.length > 0 && !selectedMemberId) {
      const found = members.find((m) => m.name === selectedHandler);
      if (found) {
        setSelectedMemberId(String(found.id));
      }
    }
  }, [selectedHandler, members, selectedMemberId]);
  const handleTypeSwitch = (type) => {
    setTransactionType(type);
    setSearchParams({ type });
  };
  const selectedVault = useMemo(() => {
    return vaults.find((v) => String(v.id) === String(selectedVaultId)) || null;
  }, [vaults, selectedVaultId]);
  const selectedCategoryObj = useMemo(() => {
    return categories.find((c) => String(c.id) === String(selectedCategoryId)) || null;
  }, [categories, selectedCategoryId]);
  const memberOptions = useMemo(() => {
    const list = members.map((m) => ({
      id: String(m.id),
      name: m.name,
      title: m.member_type === "partner" ? t("memberTitle.partner") : m.member_type === "employee" ? t("memberTitle.employee") : m.member_type === "sarafi" ? t("memberTitle.sarafi") : "",
    }));
    return [
      { id: "", name: t("form.noMember"), title: "" },
      ...list,
    ];
  }, [members]);
  const handleVaultChange = (val) => {
    setSelectedVaultId(val);
    const chosen = vaults.find((v) => String(v.id) === String(val));
    if (chosen?.currency) {
      setCurrency(chosen.currency);
    }
  };
  const handleMemberChange = (val) => {
    if (!val || val === t("form.noMember")) {
      setSelectedMemberId("");
      setSelectedHandler("");
      return;
    }
    const found = members.find((m) => m.name === val || String(m.id) === String(val));
    if (found) {
      setSelectedMemberId(String(found.id));
      setSelectedHandler(found.name);
    } else {
      setSelectedMemberId("");
      setSelectedHandler("");
    }
  };
  const vaultCurrency = selectedVault?.currency || "AFN";
  const currentBalance = Number(selectedVault?.current_balance || 0);
  const numAmount = parseFloat(toEnglishDigits(amount)) || 0;
  const numRate = parseFloat(toEnglishDigits(exchangeRate)) || 1;
  const isCurrencyMismatch = currency !== vaultCurrency;
  const convertedVaultAmount = useMemo(() => {
    if (!isCurrencyMismatch) return numAmount;
    if (numRate <= 0) return 0;
    if (vaultCurrency === "USD" && currency === "AFN") {
      return Number((numAmount / numRate).toFixed(2));
    }
    if (vaultCurrency === "AFN" && currency === "USD") {
      return Number((numAmount * numRate).toFixed(2));
    }
    return numAmount;
  }, [isCurrencyMismatch, vaultCurrency, currency, numAmount, numRate]);
  const expectedNewBalance = useMemo(() => {
    if (isDeposit) {
      return Number((currentBalance + convertedVaultAmount).toFixed(2));
    }
    return Number((currentBalance - convertedVaultAmount).toFixed(2));
  }, [isDeposit, currentBalance, convertedVaultAmount]);
  const isInsufficientFunds = !isDeposit && convertedVaultAmount > currentBalance;
  const handleAmountChange = (e) => {
    const raw = e.target.value.replace(/,/g, "");
    setAmount(toEnglishDigits(raw));
  };
  const handleResetForm = () => {
    fetch(apiUrl("/vault-transactions/next-code"))
      .then((res) => res.json())
      .then((json) => {
        if (json.next_code) setDocNumber(String(json.next_code));
      })
      .catch(() => {});
    setDateObj(new DateObject({ calendar: persian, locale: persian_af }));
    const curTime = getNow12Hour();
    setTimeStr(curTime.time);
    setTimePeriod(curTime.period);
    setPartyName("");
    setAmount("");
    setReferenceNumber("");
    setDescription("");
    if (selectedVault) {
      setCurrency(selectedVault.currency || "AFN");
    }
    setSelectedCategoryId("");
    setSelectedMemberId("");
    setSelectedHandler("");
  };
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      showToast.error(t("messages.categoryNameRequired"));
      return;
    }
    setSavingCategory(true);
    try {
      const res = await fetch(apiUrl("/vault-transaction-categories"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: trimmed,
          type: isDeposit ? "deposit" : "withdraw",
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || t("messages.categoryCreateFailed"));
      }
      const created = json.data;
      setCategories((prev) => [...prev, created]);
      setSelectedCategoryId(String(created.id));
      setNewCategoryName("");
      setIsCategoryModalOpen(false);
      showToast.success(t("messages.categoryCreated"));
    } catch (err) {
      showToast.error(err.message || t("messages.categorySaveFailed"));
    } finally {
      setSavingCategory(false);
    }
  };
  const handleCreateMember = async (e) => {
    e.preventDefault();
    const name = newMemberName.trim();
    if (!name) {
      showToast.error(t("messages.memberNameRequired"));
      return;
    }
    setSavingMember(true);
    try {
      const res = await fetch(apiUrl("/vault-transaction-members"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: name,
          member_type: newMemberRole,
          phone: newMemberPhone.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || t("messages.memberSaveFailed"));
      }
      showToast.success(t("messages.memberCreated"));
      const createdMem = json.data;
      setMembers((prev) => [createdMem, ...prev]);
      setSelectedMemberId(String(createdMem.id));
      setSelectedHandler(createdMem.name);
      setNewMemberName("");
      setNewMemberPhone("");
      setIsMemberModalOpen(false);
    } catch (err) {
      showToast.error(err.message || t("messages.memberCreateFailed"));
    } finally {
      setSavingMember(false);
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (!selectedVaultId) {
      showToast.error(t("messages.vaultRequired"));
      return;
    }
    if (!selectedCategoryId) {
      showToast.error(t("messages.categoryRequired"));
      return;
    }
    if (!partyName.trim()) {
      showToast.error(t("messages.partyRequired"));
      return;
    }
    if (numAmount <= 0) {
      showToast.error(t("messages.amountInvalid"));
      return;
    }
    if (isCurrencyMismatch && numRate <= 0) {
      showToast.error(t("messages.rateInvalid"));
      return;
    }
    if (isInsufficientFunds) {
      showToast.error(t("messages.insufficientBalance"));
      return;
    }
    const gDate = dateObj.toDate();
    const y = gDate.getFullYear();
    const m = String(gDate.getMonth() + 1).padStart(2, "0");
    const d = String(gDate.getDate()).padStart(2, "0");
    const gregDate = `${y}-${m}-${d}`;
    const shamsiDate = toEnglishDigits(dateObj.format("YYYY/MM/DD"));
    const categoryTitle = selectedCategoryObj?.name || (isDeposit ? t("defaults.depositCategory") : t("defaults.withdrawCategory"));
    const handlerPerson = selectedHandler.trim();
    const beneficiaryPerson = partyName.trim();
    const noteDetails = [
      description.trim(),
      t("note.category", { value: categoryTitle }),
      t("note.party", { value: beneficiaryPerson }),
      handlerPerson ? t("note.member", { value: handlerPerson }) : null,
    ].filter(Boolean).join(" - ");
    const formatted12Hour = `${timeStr} ${timePeriod === "PM" ? t("timeSuffix.pm") : t("timeSuffix.am")}`;
    const numMemberId = !selectedMemberId || String(selectedMemberId).startsWith("emp-") ? null : (parseInt(selectedMemberId, 10) || null);
    const numCategoryId = parseInt(selectedCategoryId, 10) || null;
    const payload = {
      type: transactionType,
      vault_id: selectedVaultId,
      category_id: numCategoryId,
      member_id: numMemberId,
      amount: numAmount,
      currency: currency,
      exchange_rate: isCurrencyMismatch ? numRate : 1.0,
      receipt_number: docNumber,
      receipt_type: paymentMethod,
      reference_type: "direct",
      reference_id: 0,
      reference_number: referenceNumber,
      transaction_date: gregDate,
      shamsi_date: shamsiDate,
      transaction_time: formatted12Hour,
      paid_by: isDeposit ? beneficiaryPerson : (handlerPerson || selectedVault?.name || t("defaults.financeManagement")),
      received_by: isDeposit ? (handlerPerson || selectedVault?.name || t("defaults.cashier")) : beneficiaryPerson,
      created_by: handlerPerson || null,
      notes: noteDetails,
    };
    setSubmitting(true);
    try {
      if (isEditMode) {
        const res = await fetch(apiUrl(`/vault-transactions/${id}`), {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        });
        const resData = await res.json();
        if (!res.ok) {
          throw new Error(resData.message || t("messages.updateFailed"));
        }
        showToast.success(resData.message || t("messages.updated"));
        navigate("/deposits-withdrawals");
        return;
      }
      const endpoint = isDeposit ? apiUrl("/vaults/deposit") : apiUrl("/vaults/withdraw");
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.message || t("messages.saveFailed"));
      }
      showToast.success(resData.message || t("messages.saved"));
      navigate("/deposits-withdrawals");
    } catch (err) {
      showToast.error(err.message || t("messages.operationFailed"));
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="space-y-6 pb-16 font-sans" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 font-medium mb-1">
            <Link to="/treasury" className="hover:text-gray-800 transition-colors">
              {t("breadcrumb.treasury")}
            </Link>
            <span>›</span>
            <Link to="/deposits-withdrawals" className="hover:text-gray-800 transition-colors">
              {t("breadcrumb.depositsWithdrawals")}
            </Link>
            <span>›</span>
            <span className="text-gray-800 font-bold">
              {isEditMode ? t("form.editDocTitle", { number: docNumber }) : (isDeposit ? t("form.newDeposit") : t("form.newWithdraw"))}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              {isEditMode
                ? t("form.titleEdit")
                : isDeposit
                ? t("form.titleDeposit")
                : t("form.titleWithdraw")}
            </h1>
            <span
              className={`px-2.5 py-0.5 text-xs font-black rounded-full border ${
                isDeposit
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-rose-50 text-rose-700 border-rose-200"
              }`}
            >
              {isEditMode ? t("form.editInfo") : (isDeposit ? t("form.increaseBalance") : t("form.decreaseBalance"))}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate("/deposits-withdrawals")}
            className="px-4 py-2 text-btn-text font-bold text-gray-700 bg-white border border-gray-300 rounded-btn hover:bg-gray-50 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowRight size={16} />
            <span>{t("form.backToDepositsWithdrawals")}</span>
          </button>
        </div>
      </div>
      <div className="bg-white p-1.5 rounded-xl border border-gray-200 shadow-2xs flex items-center gap-1.5 max-w-md">
        <button
          type="button"
          onClick={() => handleTypeSwitch("deposit")}
          className={`flex-1 py-2.5 px-4 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
            isDeposit
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <span>{t("form.depositType")}</span>
        </button>
        <button
          type="button"
          onClick={() => handleTypeSwitch("withdraw")}
          className={`flex-1 py-2.5 px-4 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
            !isDeposit
              ? "bg-rose-600 text-white shadow-xs"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <span>{t("form.withdrawType")}</span>
        </button>
      </div>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-card border border-gray-200 shadow-2xs p-5 space-y-4">
            <div className="border-b border-gray-100 pb-2.5">
              <span className="text-xs font-bold text-gray-800">
                {t("form.sectionDocument")}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-label-text font-bold text-gray-700 mb-1.5">
                  {t("form.docNumber")}
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={docNumber}
                  onChange={(e) => setDocNumber(toEnglishDigits(e.target.value))}
                  className="w-full bg-white border border-gray-300 rounded-input px-3 py-2 text-body-text text-slate-900 font-mono font-bold outline-none focus:border-slate-800 text-center"
                />
              </div>
              <div>
                <label className="block text-label-text font-bold text-gray-700 mb-1.5">
                  {t("form.docDate")}
                </label>
                <DatePicker
                  value={dateObj}
                  onChange={setDateObj}
                  calendar={persian}
                  locale={persian_af}
                  format="YYYY/MM/DD"
                  inputClass="w-full text-center bg-white border border-gray-300 rounded-input px-3 py-2 text-body-text text-gray-900 outline-none focus:border-slate-800 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-label-text font-bold text-gray-700 mb-1.5">
                  {t("form.recordTime")}
                </label>
                <div className="flex items-center gap-1.5" dir="ltr">
                  <input
                    type="text"
                    value={timeStr}
                    onChange={(e) => setTimeStr(toEnglishDigits(e.target.value))}
                    placeholder="12:00"
                    className="w-full bg-white border border-gray-300 rounded-input px-2.5 py-2 text-body-text text-slate-900 font-mono text-center outline-none focus:border-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setTimePeriod((prev) => (prev === "AM" ? "PM" : "AM"))}
                    className="px-2.5 py-2 text-xs font-bold rounded-input border border-gray-300 bg-gray-50 hover:bg-gray-100 text-slate-800 transition-colors cursor-pointer select-none shrink-0"
                  >
                    {timePeriod === "AM" ? t("timeSuffix.am") : t("timeSuffix.pm")}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-card border border-gray-200 shadow-2xs p-5 space-y-4">
            <div className="border-b border-gray-100 pb-2.5">
              <span className="text-xs font-bold text-gray-800">
                {t("form.sectionParties")}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-label-text font-bold text-gray-800 mb-1.5">
                  {t("form.vault")}
                </label>
                <SearchableSelect
                  value={selectedVaultId}
                  onChange={handleVaultChange}
                  options={vaults}
                  getOptionLabel={(v) => `${v.name} (${v.currency})`}
                  getOptionValue={(v) => String(v.id)}
                  placeholder={t("form.vaultPlaceholder")}
                  searchPlaceholder={t("form.vaultSearch")}
                  buttonClassName="w-full bg-white border border-gray-300 rounded-input px-3 py-2 text-body-text font-semibold text-gray-900 outline-none hover:border-gray-400"
                  usePortal={true}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-label-text font-bold text-gray-800">
                    {isDeposit ? t("form.categoryDeposit") : t("form.categoryWithdraw")} <span className="text-rose-600">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCategoryModalOpen(true)}
                    className="text-xs font-bold text-slate-700 hover:text-slate-900 bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded flex items-center gap-1 transition-colors cursor-pointer"
                    title={t("form.addCategory")}
                  >
                    <span>{t("form.newCategory")}</span>
                  </button>
                </div>
                <CustomDropdown
                  options={categoryOptions}
                  value={selectedCategoryId}
                  onChange={(val) => setSelectedCategoryId(val)}
                  placeholder={isDeposit ? t("form.categoryPlaceholderDeposit") : t("form.categoryPlaceholderWithdraw")}
                  className="w-full"
                  buttonClassName="w-full h-10 px-3 py-2 text-body-text font-medium text-gray-900 border-gray-300 rounded-input justify-between"
                  usePortal={true}
                />
              </div>
              <div>
                <label className="block text-label-text font-bold text-gray-800 mb-1.5">
                  {t("form.party")} <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  placeholder={
                    selectedCategoryObj?.name === t("defaults.withdrawCategory") || selectedCategoryObj?.name === t("defaults.depositCategory")
                      ? t("form.partyPlaceholderPartner")
                      : selectedCategoryObj?.name === t("defaults.sarafiSettlement") || selectedCategoryObj?.name === t("defaults.sarafiSend")
                      ? t("form.partyPlaceholderSarafi")
                      : t("form.partyPlaceholder")
                  }
                  className="w-full bg-white border border-gray-300 rounded-input px-3 py-2 text-body-text outline-none focus:border-slate-800"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-label-text font-bold text-gray-800">
                    {t("form.member")} <span className="text-gray-400 font-normal text-xs">{t("form.optional")}</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    {selectedHandler && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedHandler("");
                          setSelectedMemberId("");
                        }}
                        className="text-xs font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded flex items-center gap-1 transition-colors cursor-pointer"
                        title={t("form.clearMember")}
                      >
                        <X size={13} />
                        <span>{t("form.clearSelection")}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsMemberModalOpen(true)}
                      className="text-xs font-bold text-slate-700 hover:text-slate-900 bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded flex items-center gap-1 transition-colors cursor-pointer"
                      title={t("form.addMember")}
                    >
                      <span>{t("form.newMember")}</span>
                    </button>
                  </div>
                </div>
                <SearchableSelect
                  value={selectedHandler}
                  onChange={handleMemberChange}
                  options={memberOptions}
                  getOptionLabel={(m) => m.name + (m.title ? ` (${m.title})` : "")}
                  getOptionValue={(m) => m.name}
                  placeholder={t("form.memberPlaceholder")}
                  searchPlaceholder={t("form.memberSearch")}
                  buttonClassName="w-full bg-white border border-gray-300 rounded-input px-3 py-2 text-body-text font-medium text-gray-900 outline-none hover:border-gray-400"
                  usePortal={true}
                />
              </div>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 px-1 text-gray-600 border-t border-gray-100">
              <span>{t("form.currentBalance")}</span>
              <span className="font-mono font-bold text-slate-800" dir="ltr">
                {currentBalance.toLocaleString("en-US")} {vaultCurrency}
              </span>
            </div>
          </div>
          <div className="bg-white rounded-card border border-gray-200 shadow-2xs p-5 space-y-4">
            <div className="border-b border-gray-100 pb-2.5">
              <span className="text-xs font-bold text-gray-800">
                {t("form.sectionFinance")}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-label-text font-bold text-gray-800 mb-1.5">
                  {t("form.currency")}
                </label>
                <CustomDropdown
                  options={availableCurrencyOptions}
                  value={currency}
                  onChange={(val) => setCurrency(val)}
                  className="w-full"
                  buttonClassName="w-full h-10 px-3 py-2.5 text-body-text font-bold text-gray-900 border-gray-300 rounded-input justify-between"
                  usePortal={true}
                />
              </div>
              <div>
                <label className="block text-label-text font-bold text-gray-800 mb-1.5">
                  {t("form.amountLabel", { currency })}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="0"
                    value={amount ? Number(amount).toLocaleString("en-US") : ""}
                    onChange={handleAmountChange}
                    className="w-full bg-white border border-gray-300 rounded-input pr-3 pl-14 py-2.5 text-base font-bold font-mono text-gray-900 outline-none focus:border-slate-800"
                  />
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-gray-500 font-mono">
                    {currency}
                  </span>
                </div>
              </div>
              {isCurrencyMismatch && (
                <div className="sm:col-span-2 bg-amber-50/70 border border-amber-200 rounded-lg p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-amber-900">
                      {t("form.exchangeRate")}
                    </label>
                    <span className="text-3xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                      {t("form.currencyMismatch")}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={exchangeRate}
                      onChange={(e) => setExchangeRate(e.target.value)}
                      placeholder={t("form.exchangeExample")}
                      className="w-full bg-white border border-amber-300 rounded-input px-3 py-2 text-body-text font-mono font-bold text-gray-900 outline-none focus:border-amber-500"
                    />
                    <div className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                      <span>{t("form.equivalentInVault")}</span>
                      <span className="font-mono text-sm font-black text-amber-900" dir="ltr">
                        {convertedVaultAmount.toLocaleString("en-US")} {vaultCurrency}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-label-text font-bold text-gray-700 mb-1.5">
                  {t("form.paymentMethod")}
                </label>
                <CustomDropdown
                  options={paymentMethodOptions}
                  value={paymentMethod}
                  onChange={(val) => setPaymentMethod(val)}
                  className="w-full"
                  buttonClassName="w-full h-10 px-3 py-2 text-body-text text-gray-800 border-gray-300 rounded-input justify-between"
                  usePortal={true}
                />
              </div>
              <div>
                <label className="block text-label-text font-bold text-gray-700 mb-1.5">
                  {t("form.reference")}
                </label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(toEnglishDigits(e.target.value))}
                  placeholder={t("form.optionalShort")}
                  className="w-full bg-white border border-gray-300 rounded-input px-3 py-2 text-body-text outline-none focus:border-slate-800 font-mono"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-label-text font-bold text-gray-700 mb-1.5">
                  {t("form.notes")}
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("form.notesPlaceholder")}
                  className="w-full bg-white border border-gray-300 rounded-input p-3 text-body-text outline-none focus:border-slate-800 resize-none"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-white rounded-card border border-gray-200 shadow-2xs p-5 space-y-4 sticky top-4">
            <div className="border-b border-gray-100 pb-2.5">
              <span className="text-xs font-bold text-gray-800">
                {t("form.summary")}
              </span>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200/80 space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-medium">{t("form.vault")}</span>
                <span className="font-bold text-slate-800 truncate max-w-[160px]">
                  {selectedVault?.name || t("form.notSelected")}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-medium">{t("form.currentBalanceShort")}</span>
                <span className="font-mono font-bold text-slate-800" dir="ltr">
                  {currentBalance.toLocaleString("en-US")} {vaultCurrency}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-medium">{t("form.category")}</span>
                <span className="font-bold text-slate-800 truncate max-w-[160px]">
                  {selectedCategoryObj?.name || (isDeposit ? t("defaults.depositCategory") : t("defaults.withdrawCategory"))}
                </span>
              </div>
              {partyName.trim() && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-medium">{t("form.partyShort")}</span>
                  <span className="font-bold text-slate-800 truncate max-w-[160px]">
                    {partyName.trim()}
                  </span>
                </div>
              )}
              {selectedHandler && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-medium">{t("form.memberShort")}</span>
                  <span className="font-bold text-slate-800 truncate max-w-[160px]">
                    {selectedHandler}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-medium">{t("form.amountShort")}</span>
                <span className="font-mono font-bold text-slate-800" dir="ltr">
                  {numAmount.toLocaleString("en-US")} {currency}
                </span>
              </div>
              {isCurrencyMismatch && (
                <div className="flex justify-between items-center text-xs bg-amber-50 p-1.5 rounded border border-amber-200">
                  <span className="text-amber-800 font-medium">{t("form.equivalentInVault")}</span>
                  <span className="font-mono font-bold text-amber-900" dir="ltr">
                    {convertedVaultAmount.toLocaleString("en-US")} {vaultCurrency}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center text-xs border-t border-slate-200 pt-2">
                <span className="text-gray-500 font-medium">
                  {isDeposit ? t("form.summaryIncrease") : t("form.summaryDecrease")}
                </span>
                <span
                  className={`font-mono font-bold ${
                    isDeposit ? "text-emerald-700" : "text-rose-700"
                  }`}
                  dir="ltr"
                >
                  {convertedVaultAmount.toLocaleString("en-US")} {vaultCurrency}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-slate-200 pt-2 bg-white p-2 rounded-md border">
                <span className="font-bold text-gray-800">{t("form.balanceAfter")}</span>
                <span
                  className={`font-mono font-black text-sm ${
                    expectedNewBalance < 0 ? "text-rose-600" : "text-slate-900"
                  }`}
                  dir="ltr"
                >
                  {expectedNewBalance.toLocaleString("en-US")} {vaultCurrency}
                </span>
              </div>
            </div>
            {isInsufficientFunds && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-rose-800 text-xs font-medium">
                <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                <span>
                  {t("form.insufficientFunds", { amount: convertedVaultAmount.toLocaleString("en-US"), currency: vaultCurrency, balance: currentBalance.toLocaleString("en-US") })}
                </span>
              </div>
            )}
            <div className="space-y-2 pt-2">
              <button
                type="submit"
                disabled={submitting || isInsufficientFunds || numAmount <= 0 || !canSubmit}
                className={`w-full py-3 px-4 text-btn-text font-bold text-white rounded-btn transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer ${
                  isDeposit
                    ? "bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300"
                    : "bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300"
                } disabled:cursor-not-allowed`}
              >
                <Save size={16} />
                <span>
                  {submitting
                    ? (isEditMode ? t("form.savingEdit") : t("form.saving"))
                    : isEditMode
                    ? t("form.saveChanges")
                    : isDeposit
                    ? t("form.confirmDeposit")
                    : t("form.confirmWithdraw")}
                </span>
              </button>
              <button
                type="button"
                onClick={() => isEditMode ? navigate("/deposits-withdrawals") : handleResetForm()}
                className="w-full py-2 px-4 text-btn-text font-bold text-gray-600 hover:bg-gray-100 rounded-btn transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isEditMode ? <ArrowRight size={15} /> : <RotateCcw size={15} />}
                <span>{isEditMode ? t("form.cancelAndReturn") : t("form.resetForm")}</span>
              </button>
            </div>
          </div>
        </div>
      </form>
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-sans" dir="rtl">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 space-y-4 border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <span className="text-sm font-bold text-gray-900">
                {isDeposit ? t("form.addDepositCategory") : t("form.addWithdrawCategory")}
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsCategoryModalOpen(false);
                  setNewCategoryName("");
                }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateCategory} className="space-y-3.5">
              <div>
                <label className="block text-label-text font-bold text-gray-700 mb-1">
                  {t("form.categoryName")}
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder={isDeposit ? t("form.categoryExampleDeposit") : t("form.categoryExampleWithdraw")}
                  className="w-full bg-white border border-gray-300 rounded-input px-3 py-2 text-body-text outline-none focus:border-slate-800"
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={savingCategory}
                  className="flex-1 py-2.5 px-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>{savingCategory ? t("form.creating") : t("form.addAndSelect")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCategoryModalOpen(false);
                    setNewCategoryName("");
                  }}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  {t("form.cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isMemberModalOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-sans" dir="rtl">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <span className="text-sm font-bold text-gray-900">
                {t("form.addMember")}
              </span>
              <button
                type="button"
                onClick={() => setIsMemberModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateMember} className="space-y-3.5">
              <div>
                <label className="block text-label-text font-bold text-gray-700 mb-1">
                  {t("form.fullName")}
                </label>
                <input
                  type="text"
                  required
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder={t("form.fullNameExample")}
                  className="w-full bg-white border border-gray-300 rounded-input px-3 py-2 text-body-text outline-none focus:border-slate-800"
                />
              </div>
              <div>
                <label className="block text-label-text font-bold text-gray-700 mb-1">
                  {t("form.memberType")}
                </label>
                <CustomDropdown
                    value={newMemberRole}
                    onChange={setNewMemberRole}
                    options={memberRoleOptions}
                    buttonClassName="w-full bg-surface border border-line-strong rounded-input px-3 py-2 text-body-text outline-none focus:border-accent"
                    width="w-full"
                    usePortal
                  />
              </div>
              <div>
                <label className="block text-label-text font-bold text-gray-700 mb-1">
                  {t("form.phoneOptional")}
                </label>
                <input
                  type="text"
                  value={newMemberPhone}
                  onChange={(e) => setNewMemberPhone(toEnglishDigits(e.target.value))}
                  placeholder={t("form.phoneExample")}
                  className="w-full bg-white border border-gray-300 rounded-input px-3 py-2 text-body-text font-mono outline-none focus:border-slate-800"
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={savingMember}
                  className="flex-1 py-2.5 px-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Save size={15} />
                  <span>{savingMember ? t("form.saving") : t("form.saveAndSelect")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsMemberModalOpen(false)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  {t("form.cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
