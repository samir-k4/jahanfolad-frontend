import React, { useState, useEffect } from "react";
import { isActiveEmployee, isOutsideHangarEmployee } from "../../constants/advanceDomain";
import { useTranslation } from "react-i18next";
import { TEXT_FIELD_MAX_LENGTH, NOTES_MAX_LENGTH } from "../../constants/treasuryDomain";
import { createPortal } from "react-dom";
import { ArrowDownLeft, X, CheckCircle2, AlertCircle, Loader2, UserCheck, UserPlus } from "lucide-react";
import DatePicker from "react-multi-date-picker";
import { DateObject, persian, persian_af } from "../../utils/dateHelpers";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useVaults from "../../hooks/useVaults";
import useExpenseCategories from "../../hooks/useExpenseCategories";
import { usePagePerms } from "../common";
import { apiUrl } from "../../api";
import SearchableSelect from "../common/SearchableSelect";
import { toEnglishDigits } from "../../utils";
import { exceedsBalance } from "../../utils/vaultBalance";
const fmt = (n) => Number(n || 0).toLocaleString("en-US");
export default function ManagerAdvanceCreateModal({
  isOpen,
  onClose,
  onSuccess,
  vaults: propVaults = [],
  employees: propEmployees = [],
}) {
  const { t } = useTranslation("advances");
  const { canCreate } = usePagePerms("advances");
  useBodyScrollLock(isOpen);
  const { vaults: hookVaults } = useVaults(propVaults.length === 0);
  const { categories: expenseCategories } = useExpenseCategories();
  const vaults = propVaults.length > 0 ? propVaults : hookVaults;
  const [internalEmployees, setInternalEmployees] = useState([]);
  const employees = propEmployees && propEmployees.length > 0 ? propEmployees : internalEmployees;
  const [receiverType, setReceiverType] = useState("employee");
  const [formData, setFormData] = useState({
    employee_id: "",
    receiver_name: "",
    vault_id: "",
    amount: "",
    currency: "AFN",
    purpose: "",
    notes: "",
  });
  const [dateObj, setDateObj] = useState(
    () => new DateObject({ calendar: persian, locale: persian_af })
  );
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  useEffect(() => {
    if (isOpen && (!propEmployees || propEmployees.length === 0)) {
      fetch(apiUrl("/employees"))
        .then((res) => res.json())
        .then((data) => {
          const list = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
          const activeList = list.filter(isActiveEmployee);
          setInternalEmployees(activeList.length > 0 ? activeList : list);
        })
        .catch(() => {});
    }
  }, [isOpen, propEmployees]);
  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage("");
    setFieldErrors({});
    setDateObj(new DateObject({ calendar: persian, locale: persian_af }));
    const initialVault = vaults.length > 0 ? vaults[0] : null;
    setFormData({
      employee_id: "",
      receiver_name: "",
      vault_id: initialVault ? String(initialVault.id) : "",
      amount: "",
      currency: initialVault ? initialVault.currency : "AFN",
      purpose: "",
      notes: "",
    });
    setReceiverType("employee");
  }, [isOpen, vaults]);
  if (!isOpen) return null;
  const handleVaultChange = (vaultId) => {
    const selected = vaults.find((v) => String(v.id) === String(vaultId));
    setFieldErrors((prev) => ({ ...prev, vault_id: null }));
    setFormData((prev) => ({
      ...prev,
      vault_id: vaultId,
      currency: selected?.currency || "AFN",
    }));
  };
  const handleEmployeeSelect = (empId) => {
    const emp = eligibleEmployees.find((e) => String(e.id) === String(empId));
    setFieldErrors((prev) => ({ ...prev, receiver_name: null }));
    setFormData((prev) => ({
      ...prev,
      employee_id: empId,
      receiver_name: emp ? (emp.full_name || emp.name) : "",
    }));
  };
  const validate = () => {
    const errs = {};
    if (!formData.receiver_name.trim()) {
      errs.receiver_name = receiverType === "employee" ? t("create.employeeRequired") : t("create.receiverRequired");
    }
    if (!formData.vault_id) {
      errs.vault_id = t("create.vaultRequired");
    }
    const numAmount = parseFloat(toEnglishDigits(formData.amount));
    if (!formData.amount || isNaN(numAmount) || numAmount <= 0) {
      errs.amount = t("create.amountRequired");
    } else {
      const selectedVault = vaults.find((v) => String(v.id) === String(formData.vault_id));
      if (selectedVault && exceedsBalance(selectedVault, Number(selectedVault.current_balance || 0), numAmount)) {
        errs.amount = `مبلغ امانت از موجودی صندوق (${fmt(selectedVault.current_balance)} ${selectedVault.currency}) بیشتر است.`;
      }
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };
  const handleSubmit = async (e) => {
    if (!canCreate) return;
    if (e && e.preventDefault) e.preventDefault();
    setErrorMessage("");
    if (!validate()) {
      setErrorMessage(t("create.fixErrors"));
      return;
    }
    setSubmitting(true);
    try {
      const jsDate = typeof dateObj?.toDate === "function" ? dateObj.toDate() : new Date();
      const gregDate = `${jsDate.getFullYear()}-${String(jsDate.getMonth() + 1).padStart(2, "0")}-${String(jsDate.getDate()).padStart(2, "0")}`;
      const shamsiDate = typeof dateObj?.format === "function"
        ? toEnglishDigits(dateObj.format("YYYY/MM/DD"))
        : toEnglishDigits(String(dateObj || ""));
      const payload = {
        employee_id: receiverType === "employee" && formData.employee_id ? parseInt(formData.employee_id) : null,
        receiver_name: formData.receiver_name.trim(),
        vault_id: parseInt(formData.vault_id),
        amount: parseFloat(toEnglishDigits(formData.amount)),
        currency: formData.currency,
        issue_date: gregDate,
        shamsi_date: shamsiDate,
        purpose: formData.purpose ? formData.purpose.trim() : null,
        notes: formData.notes.trim() || null,
      };
      const res = await fetch(apiUrl("/manager-advances"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.message || t("create.createError"));
      }
      if (onSuccess) onSuccess(resData);
      onClose();
    } catch (err) {
      setErrorMessage(err.message || t("toast.serverError", { ns: "common" }));
    } finally {
      setSubmitting(false);
    }
  };
  const vaultOptions = vaults.map((v) => ({
    value: String(v.id),
    label: `[${v.account_number || `00${v.id}`}] ${v.name} — موجودی: ${fmt(v.current_balance)} ${v.currency}`,
  }));
  const employeeCategory = (emp) => String(
    emp?.jobCategory?.name ||
    emp?.job_category?.name ||
    (typeof emp?.job_category === "string" ? emp.job_category : "") ||
    ""
  ).trim();
  const eligibleEmployees = employees.filter((emp) => emp && isOutsideHangarEmployee(employeeCategory(emp)));
  const employeeOptions = eligibleEmployees.map((emp) => {
    const position =
      emp.jobPosition?.name ||
      emp.job_position?.name ||
      (typeof emp.position === "string" ? emp.position : "") ||
      employeeCategory(emp) ||
      t("create.employeeFallback");
    const idBadge = emp.employee_ID ? `[${emp.employee_ID}] ` : "";
    const name = emp.full_name || emp.name || t("create.employeeFallback");
    return {
      value: String(emp.id),
      label: `${idBadge}${name} (${position})`,
    };
  });
  const purposeOptions = [
    { value: "", label: "انتخاب هدف برداشت..." },
    ...expenseCategories.map((cat) => ({
      value: cat.name,
      label: cat.name,
    })),
  ];
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs font-sans"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg rounded-modal shadow-2xl overflow-hidden font-sans flex flex-col max-h-[92vh] border border-gray-200 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-btn bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <ArrowDownLeft size={18} />
            </div>
            <div>
              <h3 className="text-section-title text-gray-900">{t("label.newAdvance")}</h3>
              <p className="text-caption-text text-gray-500">{t("create.subtitle")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-btn cursor-pointer transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        {errorMessage && (
          <div className="mx-5 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-input text-caption-text font-medium flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} noValidate className="p-5 space-y-4 overflow-y-auto flex-1">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-label-text font-bold text-gray-700">{t("label.receiver")}<span className="text-rose-600">*</span>
              </label>
              <div className="flex items-center bg-gray-100 p-0.5 rounded-btn text-caption-text font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setReceiverType("employee");
                    setFormData((prev) => ({ ...prev, receiver_name: "", employee_id: "" }));
                    setFieldErrors((prev) => ({ ...prev, receiver_name: null }));
                  }}
                  className={`px-2.5 py-1 rounded-btn transition-colors flex items-center gap-1 cursor-pointer ${
                    receiverType === "employee"
                      ? "bg-white text-gray-900 shadow-2xs"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <UserCheck size={13} />
                  <span>{t("create.systemEmployee")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReceiverType("custom");
                    setFormData((prev) => ({ ...prev, receiver_name: "", employee_id: "" }));
                    setFieldErrors((prev) => ({ ...prev, receiver_name: null }));
                  }}
                  className={`px-2.5 py-1 rounded-btn transition-colors flex items-center gap-1 cursor-pointer ${
                    receiverType === "custom"
                      ? "bg-white text-gray-900 shadow-2xs"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <UserPlus size={13} />
                  <span>{t("label.external")}</span>
                </button>
              </div>
            </div>
            {receiverType === "employee" ? (
              <SearchableSelect
                options={employeeOptions}
                value={formData.employee_id}
                onChange={handleEmployeeSelect}
                placeholder={t("create.employeePlaceholder")}
                searchPlaceholder={t("create.employeeSearch")}
                noResultsText={t("create.employeeEmpty")}
                usePortal={true}
                buttonClassName={`w-full border rounded-input px-3 py-2 text-body-text font-medium bg-white outline-none ${
                  fieldErrors.receiver_name
                    ? "border-rose-500 bg-rose-50/30 focus:border-rose-600"
                    : "border-gray-300 focus:border-slate-800"
                }`}
              />
            ) : (
              <input
                type="text"
                maxLength={TEXT_FIELD_MAX_LENGTH}
                placeholder={t("create.receiverPlaceholder")}
                value={formData.receiver_name}
                onChange={(e) => {
                  setFieldErrors((prev) => ({ ...prev, receiver_name: null }));
                  setFormData((prev) => ({ ...prev, receiver_name: e.target.value }));
                }}
                className={`w-full border rounded-input px-3 py-2 text-body-text font-medium focus:outline-none transition-colors ${
                  fieldErrors.receiver_name
                    ? "border-rose-500 bg-rose-50/30 focus:border-rose-600"
                    : "border-gray-300 focus:border-slate-800"
                }`}
              />
            )}
            {fieldErrors.receiver_name && (
              <p className="text-caption-text font-bold text-rose-600 mt-1 flex items-center gap-1">
                <AlertCircle size={13} />
                <span>{fieldErrors.receiver_name}</span>
              </p>
            )}
          </div>
          <div>
            <label className="block text-label-text font-bold text-gray-700 mb-1.5">{t("create.vault")}<span className="text-rose-600">*</span>
            </label>
            <SearchableSelect
              options={vaultOptions}
              value={formData.vault_id}
              onChange={handleVaultChange}
              placeholder={t("create.vaultPlaceholder")}
              searchPlaceholder={t("create.vaultSearch")}
              usePortal={true}
              buttonClassName={`w-full border rounded-input px-3 py-2 text-body-text font-medium bg-white outline-none ${
                fieldErrors.vault_id
                  ? "border-rose-500 bg-rose-50/30 focus:border-rose-600"
                  : "border-gray-300 focus:border-slate-800"
              }`}
            />
            {fieldErrors.vault_id && (
              <p className="text-caption-text font-bold text-rose-600 mt-1 flex items-center gap-1">
                <AlertCircle size={13} />
                <span>{fieldErrors.vault_id}</span>
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-label-text font-bold text-gray-700 mb-1.5">
                مبلغ امانت ({formData.currency}) <span className="text-rose-600">*</span>
              </label>
              <input
                type="number"
                step="any"
                min="0"
                dir="ltr"
                placeholder="0"
                value={formData.amount}
                onFocus={(e) => e.target.select()}
                onWheel={(e) => e.target.blur()}
                onChange={(e) => {
                  setFieldErrors((prev) => ({ ...prev, amount: null }));
                  setFormData({ ...formData, amount: e.target.value });
                }}
                className={`w-full border rounded-input px-3 py-2 text-body-text font-bold focus:outline-none font-mono transition-colors ${
                  fieldErrors.amount
                    ? "border-rose-500 bg-rose-50/30 focus:border-rose-600"
                    : "border-gray-300 focus:border-slate-800"
                }`}
              />
              {fieldErrors.amount && (
                <p className="text-caption-text font-bold text-rose-600 mt-1 flex items-center gap-1">
                  <AlertCircle size={13} />
                  <span>{fieldErrors.amount}</span>
                </p>
              )}
            </div>
            <div>
              <label className="block text-label-text font-bold text-gray-700 mb-1.5">{t("create.date")}<span className="text-rose-600">*</span>
              </label>
              <DatePicker
                value={dateObj}
                onChange={setDateObj}
                calendar={persian}
                locale={persian_af}
                format="YYYY/MM/DD"
                inputClass="w-full border border-gray-300 rounded-input px-3 py-2 text-body-text font-mono focus:outline-none focus:border-slate-800"
                containerStyle={{ width: "100%" }}
              />
            </div>
          </div>
          <div>
            <label className="block text-label-text font-bold text-gray-700 mb-1.5">{t("label.purpose")}</label>
            <SearchableSelect
              options={purposeOptions}
              value={formData.purpose}
              onChange={(val) => setFormData({ ...formData, purpose: val })}
              placeholder={t("create.purposePlaceholder")}
              searchPlaceholder={t("create.purposeSearch")}
              usePortal={true}
              buttonClassName="w-full border border-gray-300 rounded-input px-3 py-2 text-body-text font-medium bg-white focus:border-slate-800"
            />
          </div>
          <div>
            <label className="block text-label-text font-bold text-gray-700 mb-1.5">{t("create.notes")}</label>
            <textarea maxLength={NOTES_MAX_LENGTH}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              placeholder={t("create.notesPlaceholder")}
              className="w-full border border-gray-300 rounded-input px-3 py-2 text-body-text focus:outline-none focus:border-slate-800 resize-none"
            />
          </div>
          <div className="flex gap-2.5 pt-2 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 rounded-btn text-btn-text font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >{t("create.cancel")}</button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-btn text-btn-text font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{t("create.submitting")}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>{t("create.submit")}</span>
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
