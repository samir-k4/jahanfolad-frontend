import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { TEXT_FIELD_MAX_LENGTH, NOTES_MAX_LENGTH } from "../../constants/treasuryDomain";
import { createPortal } from "react-dom";
import DatePicker from "react-multi-date-picker";
import { DateObject, persian, persian_af } from "../../utils/dateHelpers";
import { 
  X, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Calendar, 
  Clock, 
  FileText, 
  Hash, 
  User, 
  Building2, 
  Wallet,
  Tag,
  Users
} from "lucide-react";
import { SearchableSelect, CustomDropdown, usePagePerms } from "../common";
import { toEnglishDigits } from "../../utils";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import { apiUrl } from "../../api";
import { showToast } from "../../utils/toast";
export default function DepositWithdrawModal({
  isOpen,
  initialType = "deposit",
  onClose,
  onSubmit,
  submitting,
  vaults = [],
}) {
  const { t } = useTranslation("depositsWithdrawals");
  const { canCreate } = usePagePerms("treasury");
  useBodyScrollLock(isOpen);
  const [transactionType, setTransactionType] = useState(initialType);
  const [selectedVaultId, setSelectedVaultId] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [memberId, setMemberId] = useState("");
  const [categories, setCategories] = useState([]);
  const [members, setMembers] = useState([]);
  const categoryOptions = [{ value: "", label: t("depositWithdraw.categoryPlaceholder") }, ...categories.map((c) => ({ value: String(c.id), label: c.name }))];
  const memberOptions = [{ value: "", label: t("depositWithdraw.memberPlaceholder") }, ...members.map((m) => ({ value: String(m.id), label: m.name }))];
  const [referenceNumber, setReferenceNumber] = useState(""); 
  const [partyName, setPartyName] = useState(""); 
  const [amount, setAmount] = useState("");
  const [timeStr, setTimeStr] = useState("");
  const [dateObj, setDateObj] = useState(() => new DateObject({ calendar: persian, locale: persian_af }));
  const [notes, setNotes] = useState("");
  const fetchNextDocNumber = async () => {
    try {
      const res = await fetch(apiUrl("/vault-transactions/next-code"));
      if (res.ok) {
        const json = await res.json();
        if (json.next_code) {
          setDocNumber(String(json.next_code));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };
  const fetchCategories = async (type) => {
    try {
      const queryType = type || transactionType;
      const res = await fetch(apiUrl(`/vault-transaction-categories?type=${encodeURIComponent(queryType)}`));
      if (res.ok) {
        const json = await res.json();
        const list = Array.isArray(json.data) ? json.data : [];
        setCategories(list);
      }
    } catch (err) {
      console.error(err);
    }
  };
  const fetchMembers = async () => {
    try {
      const res = await fetch(apiUrl("/vault-transaction-members"));
      if (res.ok) {
        const json = await res.json();
        setMembers(Array.isArray(json.data) ? json.data : []);
      }
    } catch (err) {
      console.error(err);
    }
  };
  useEffect(() => {
    if (isOpen) {
      setTransactionType(initialType);
      const defaultVaultId = vaults[0]?.id ? String(vaults[0].id) : "";
      setSelectedVaultId(defaultVaultId);
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      setTimeStr(`${hours}:${minutes}`);
      setCategoryId("");
      setMemberId("");
      fetchNextDocNumber();
      fetchCategories(initialType);
      fetchMembers();
      setReferenceNumber("");
      setPartyName("");
      setAmount("");
      setNotes("");
      setDateObj(new DateObject({ calendar: persian, locale: persian_af }));
    }
  }, [isOpen, initialType, vaults]);
  const handleTypeChange = (newType) => {
    setTransactionType(newType);
    setCategoryId("");
    fetchCategories(newType);
  };
  const handleMemberSelect = (selectedId) => {
    setMemberId(selectedId);
    if (selectedId) {
      const found = members.find((m) => String(m.id) === String(selectedId));
      if (found) {
        setPartyName(found.name);
      }
    }
  };
  if (!isOpen) return null;
  const isDeposit = transactionType === "deposit";
  const selectedVault = vaults.find((v) => String(v.id) === String(selectedVaultId)) || vaults[0];
  const vaultCurrency = selectedVault?.currency || "AFN";
  const vaultBalance = Number(selectedVault?.current_balance || 0);
  const handleSubmit = (e) => {
    if (!canCreate) return;
    e.preventDefault();
    if (!categoryId) {
      showToast.error(t("depositWithdraw.categoryRequired"));
      return;
    }
    const gDate = dateObj.toDate();
    const y = gDate.getFullYear();
    const m = String(gDate.getMonth() + 1).padStart(2, "0");
    const d = String(gDate.getDate()).padStart(2, "0");
    const gregDate = `${y}-${m}-${d}`;
    const shamsiDate = toEnglishDigits(dateObj.format("YYYY/MM/DD"));
    const payload = {
      type: transactionType,
      vault_id: selectedVaultId,
      amount: parseFloat(toEnglishDigits(amount)),
      receipt_number: docNumber,
      category_id: categoryId ? Number(categoryId) : null,
      member_id: memberId ? Number(memberId) : null,
      reference_number: referenceNumber,
      transaction_date: gregDate,
      shamsi_date: shamsiDate,
      transaction_time: timeStr,
      paid_by: isDeposit ? (partyName || t("depositWithdraw.defaultPayer")) : (selectedVault?.name || t("party.finance")),
      received_by: isDeposit ? (selectedVault?.name || t("party.cashier")) : (partyName || t("depositWithdraw.defaultReceiver")),
      notes: notes,
    };
    onSubmit(payload);
  };
  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs font-sans" dir="rtl">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-white px-5 py-3.5 flex justify-between items-center border-b border-gray-200">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shadow-2xs ${
              isDeposit ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
            }`}>
              {isDeposit ? (
                <ArrowDownCircle size={18} />
              ) : (
                <ArrowUpCircle size={18} />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                {isDeposit ? t("depositWithdraw.titleDeposit") : t("depositWithdraw.titleWithdraw")}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          <div className="flex rounded-sm bg-gray-100 p-1 border border-gray-200">
            <button
              type="button"
              onClick={() => handleTypeChange("deposit")}
              className={`flex-1 py-2 text-xs font-bold rounded-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                isDeposit
                  ? "bg-emerald-700 text-white shadow-2xs"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/60"
              }`}
            >
              <ArrowDownCircle size={15} />{t("txDetail.typeDeposit")}</button>
            <button
              type="button"
              onClick={() => handleTypeChange("withdraw")}
              className={`flex-1 py-2 text-xs font-bold rounded-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                !isDeposit
                  ? "bg-rose-700 text-white shadow-2xs"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/60"
              }`}
            >
              <ArrowUpCircle size={15} />{t("txDetail.typeWithdraw")}</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-gray-50 p-3 rounded-sm border border-gray-200">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                <Hash size={13} className="text-slate-700" />{t("depositWithdraw.docNumber")}</label>
              <input
                type="text"
                maxLength={4}
                required
                value={docNumber}
                onChange={(e) => setDocNumber(toEnglishDigits(e.target.value))}
                className="w-full bg-white border border-gray-300 rounded-sm px-3 py-1.5 text-xs text-slate-900 font-mono font-bold outline-none focus:border-slate-800 text-center"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                <Calendar size={13} className="text-slate-700" />{t("transfer.date")}</label>
              <DatePicker
                value={dateObj}
                onChange={setDateObj}
                calendar={persian}
                locale={persian_af}
                format="YYYY/MM/DD"
                inputClass="w-full text-center bg-white border border-gray-300 rounded-sm px-3 py-1.5 text-xs text-gray-900 outline-none focus:border-slate-800 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                <Clock size={13} className="text-slate-700" />{t("depositWithdraw.time")}</label>
              <input
                type="text"
                maxLength={TEXT_FIELD_MAX_LENGTH}
                value={timeStr}
                onChange={(e) => setTimeStr(toEnglishDigits(e.target.value))}
                className="w-full bg-white border border-gray-300 rounded-sm px-3 py-1.5 text-xs text-slate-900 font-mono text-center outline-none focus:border-slate-800"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1 flex items-center gap-1">
              <Wallet size={14} className="text-slate-700" />
              {isDeposit ? t("depositWithdraw.toVault") : t("depositWithdraw.fromVault")}
            </label>
            <SearchableSelect
              value={selectedVaultId}
              onChange={(val) => setSelectedVaultId(val)}
              options={vaults}
              getOptionLabel={(v) => t("depositWithdraw.vaultOption", { account: v.account_number || `00${v.id}`, name: v.name, balance: Number(v.current_balance || 0).toLocaleString("en-US"), currency: v.currency })}
              getOptionValue={(v) => String(v.id)}
              placeholder={t("depositWithdraw.vaultPlaceholder")}
              searchPlaceholder={t("depositWithdraw.vaultSearch")}
              buttonClassName="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs font-semibold text-gray-900 outline-none hover:border-gray-400"
              usePortal={true}
            />
            <div className="flex items-center justify-between text-3xs mt-1 px-1 text-gray-600">
              <span>{t("depositWithdraw.currentBalance")}</span>
              <span className="font-mono font-bold text-slate-800" dir="ltr">
                {vaultBalance.toLocaleString("en-US")} {vaultCurrency}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1 flex items-center gap-1">
                <Tag size={13} className="text-slate-700" />{t("depositWithdraw.category")}<span className="text-rose-600">*</span>
              </label>
              <CustomDropdown
                value={categoryId}
                onChange={(val) => setCategoryId(val)}
                options={categoryOptions}
                buttonClassName="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs font-medium text-gray-900 outline-none focus:border-slate-800"
                width="w-full"
                usePortal
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1 flex items-center gap-1">
                <Users size={13} className="text-slate-700" />{t("depositWithdraw.member")}<span className="text-gray-400 font-normal text-3xs">{t("depositWithdraw.optional")}</span>
              </label>
              <CustomDropdown
                value={memberId}
                onChange={(val) => handleMemberSelect(val)}
                options={memberOptions}
                buttonClassName="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs font-medium text-gray-900 outline-none focus:border-slate-800"
                width="w-full"
                usePortal
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1 flex items-center gap-1">
                <User size={13} className="text-slate-700" />
                {isDeposit ? t("depositWithdraw.payerLabel") : t("depositWithdraw.sourceVault")}
              </label>
              <input
                type="text"
                maxLength={TEXT_FIELD_MAX_LENGTH}
                required={isDeposit}
                value={isDeposit ? partyName : (selectedVault?.name || "")}
                disabled={!isDeposit}
                placeholder={t("depositWithdraw.payerPlaceholder")}
                onChange={(e) => isDeposit && setPartyName(e.target.value)}
                className={`w-full border rounded-sm px-3 py-2 text-xs outline-none focus:border-slate-800 ${
                  isDeposit ? "bg-white border-gray-300 text-gray-900 font-medium" : "bg-gray-100 border-gray-200 text-gray-600 font-bold cursor-not-allowed"
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1 flex items-center gap-1">
                <Building2 size={13} className="text-slate-700" />
                {isDeposit ? t("depositWithdraw.targetVault") : t("depositWithdraw.receiverLabel")}
              </label>
              <input
                type="text"
                maxLength={TEXT_FIELD_MAX_LENGTH}
                required={!isDeposit}
                value={!isDeposit ? partyName : (selectedVault?.name || "")}
                disabled={isDeposit}
                placeholder={t("depositWithdraw.receiverPlaceholder")}
                onChange={(e) => !isDeposit && setPartyName(e.target.value)}
                className={`w-full border rounded-sm px-3 py-2 text-xs outline-none focus:border-slate-800 ${
                  !isDeposit ? "bg-white border-gray-300 text-gray-900 font-medium" : "bg-gray-100 border-gray-200 text-gray-600 font-bold cursor-not-allowed"
                }`}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1">
                {t("depositWithdraw.amountLabel", { currency: vaultCurrency })}
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="1"
                  required
                  dir="ltr"
                  onFocus={(e) => e.target.select()}
                  onWheel={(e) => e.target.blur()}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-sm px-3 py-2 text-base text-gray-900 font-mono font-bold outline-none focus:border-slate-800"
                />
                <span className="absolute left-3 top-2.5 text-xs font-bold text-gray-500 font-mono">
                  {vaultCurrency}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1 flex items-center gap-1">
                <FileText size={13} className="text-slate-700" />{t("depositWithdraw.reference")}</label>
              <input
                type="text"
                maxLength={TEXT_FIELD_MAX_LENGTH}
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(toEnglishDigits(e.target.value))}
                placeholder={t("depositWithdraw.referencePlaceholder")}
                className="w-full bg-white border border-gray-300 rounded-sm px-3 py-2 text-xs font-mono font-medium outline-none focus:border-slate-800"
                dir="ltr"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1">{t("depositWithdraw.notes")}</label>
            <textarea maxLength={NOTES_MAX_LENGTH}
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("depositWithdraw.notesPlaceholder")}
              className="w-full bg-white border border-gray-300 rounded-sm px-3 py-2 text-xs text-gray-900 outline-none focus:border-slate-800 resize-none"
            />
          </div>
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 rounded-sm transition-colors cursor-pointer"
            >{t("actions.cancel")}</button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-5 py-2 text-xs font-bold text-white rounded-sm shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                isDeposit ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
              }`}
            >
              {isDeposit ? (
                <>
                  <ArrowDownCircle size={15} />
                  {submitting ? t("depositWithdraw.submittingDeposit") : t("depositWithdraw.submitDeposit")}
                </>
              ) : (
                <>
                  <ArrowUpCircle size={15} />
                  {submitting ? t("depositWithdraw.submittingWithdraw") : t("depositWithdraw.submitWithdraw")}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
