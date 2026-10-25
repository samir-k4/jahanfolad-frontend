import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  UserPlus, 
  ArrowRight, 
  Save, 
  User, 
  Phone, 
  MapPin, 
  DollarSign, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Hash, 
  Home, 
  FileText,
} from "lucide-react";
import { SearchableSelect, CustomDropdown } from "../components/common";
import { showToast, toEnglishDigits } from "../utils";
import { apiUrl } from "../api";
import { useTranslation } from "react-i18next";

const AFGHAN_PROVINCES = [
  ["kabul", "کابل"], ["herat", "هرات"], ["balkh", "بلخ"], ["nangarhar", "ننگرهار"],
  ["kunduz", "کندز"], ["kandahar", "کندهار"], ["ghazni", "غزنی"], ["baghlan", "بغلان"],
  ["takhar", "تخار"], ["badakhshan", "بدخشان"], ["faryab", "فاریاب"], ["jawzjan", "جوزجان"],
  ["sar_e_pol", "سرپل"], ["samangan", "سمنگان"], ["parwan", "پروان"], ["kapisa", "کاپیسا"],
  ["panjshir", "پنجشیر"], ["wardak", "وردک"], ["logar", "لوگر"], ["khost", "خوست"],
  ["paktia", "پکتیا"], ["paktika", "پکتیکا"], ["helmand", "هلمند"], ["zabul", "زابل"],
  ["uruzgan", "ارزگان"], ["ghor", "غور"], ["badghis", "بادغیس"], ["farah", "فراه"],
  ["nimroz", "نیمروز"], ["daykundi", "دایکندی"], ["bamyan", "بامیان"], ["kunar", "کنر"],
  ["laghman", "لغمان"], ["nuristan", "نورستان"],
];

export default function CustomerCreatePage() {
  const navigate = useNavigate();
  const { t } = useTranslation("customers");

  const [customerCode, setCustomerCode] = useState("1001");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phone2, setPhone2] = useState("");
  const [province, setProvince] = useState("کابل");
  const [address, setAddress] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [openingBalanceDirection, setOpeningBalanceDirection] = useState("customer_owes");
  const [openingBalanceCurrency, setOpeningBalanceCurrency] = useState("AFN");
  const [openingBalanceAfn, setOpeningBalanceAfn] = useState("");
  const [openingBalanceUsd, setOpeningBalanceUsd] = useState("");
  const [status, setStatus] = useState("active");
  const [notes, setNotes] = useState("");

  const [loadingCode, setLoadingCode] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchNextCode = async () => {
      setLoadingCode(true);
      try {
        const res = await fetch(apiUrl("/customers/next-code"));
        if (res.ok) {
          const data = await res.json();
          if (data.next_code) {
            setCustomerCode(data.next_code);
          }
        }
      } catch (err) {
        console.error("Fetch code error:", err);
      } finally {
        setLoadingCode(false);
      }
    };

    fetchNextCode();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      showToast(t("createPage.nameRequired"), "error");
      return;
    }


    setSubmitting(true);

    try {
      const payload = {
        customer_code: customerCode.trim(),
        name: name.trim(),
        phone: toEnglishDigits(phone.trim()),
        phone2: phone2.trim() ? toEnglishDigits(phone2.trim()) : null,
        province: province,
        address: address.trim() || null,
        credit_limit: creditLimit ? parseFloat(toEnglishDigits(creditLimit)) : 0.00,
        opening_balance_direction: openingBalanceDirection,
        opening_balance_currency: openingBalanceCurrency,
        opening_balance_afn: openingBalanceCurrency !== "USD" && openingBalanceAfn
          ? parseFloat(toEnglishDigits(openingBalanceAfn))
          : null,
        opening_balance_usd: openingBalanceCurrency !== "AFN" && openingBalanceUsd
          ? parseFloat(toEnglishDigits(openingBalanceUsd))
          : null,
        status: status,
        notes: notes.trim() || null,
      };

      const res = await fetch(apiUrl("/customers"), {
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

      showToast(t("messages.created"));

      setTimeout(() => {
        navigate("/customers");
      }, 1000);
    } catch (err) {
      console.error("Submit customer error:", err);
      showToast(err.message || t("createPage.connectionError"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-16 font-sans text-gray-800" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shadow-2xs">
              <UserPlus size={19} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                {t("createPage.title")}
              </h1>
              <p className="text-xs text-gray-500">
                {t("createPage.subtitle")}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/customers"
            className="px-3.5 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowRight size={15} />
            <span>{t("createPage.backToList")}</span>
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white border border-gray-200 rounded-card shadow-2xs p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
                  <User size={16} className="text-emerald-600" />
                  <span>{t("createPage.identityHeading")}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{t("form.code")}</span>
                  <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {loadingCode ? "..." : customerCode}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1.5">
                    {t("createPage.customerCode")} <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={customerCode}
                      onChange={(e) => setCustomerCode(e.target.value)}
                      placeholder={t("createPage.customerCodePlaceholder")}
                      className="w-full h-[40px] px-3 bg-emerald-50/50 border border-emerald-300 rounded text-xs font-mono font-bold text-emerald-900 focus:outline-none focus:border-emerald-600"
                    />
                    <Hash size={15} className="absolute left-3 top-2.5 text-emerald-600" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1.5">
                    {t("form.name")} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("createPage.namePlaceholder")}
                    className="w-full h-[40px] px-3 bg-white border border-gray-300 rounded text-xs text-gray-800 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1.5">
                    {t("form.phone")} <span className="text-rose-500">*</span>
                    <span className="text-[10.5px] font-normal text-emerald-700 mr-1.5">{t("createPage.phoneTableHint")}</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={t("createPage.phonePlaceholder")}
                      className="w-full h-[40px] px-3 bg-white border border-gray-300 rounded text-xs font-mono text-gray-800 focus:outline-none focus:border-emerald-600 text-left"
                    />
                    <Phone size={15} className="absolute right-3 top-2.5 text-gray-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1.5">
                    {t("form.phone2")}
                    <span className="text-[10.5px] font-normal text-gray-500 mr-1.5">{t("createPage.phoneProfileHint")}</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={phone2}
                      onChange={(e) => setPhone2(e.target.value)}
                      placeholder={t("createPage.phone2Placeholder")}
                      className="w-full h-[40px] px-3 bg-white border border-gray-300 rounded text-xs font-mono text-gray-800 focus:outline-none focus:border-emerald-600 text-left"
                    />
                    <Phone size={15} className="absolute right-3 top-2.5 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-card shadow-2xs p-5 space-y-4">
              <div className="flex items-center gap-2 text-gray-900 font-bold text-sm border-b border-gray-100 pb-3">
                <MapPin size={16} className="text-emerald-600" />
                <span>{t("createPage.locationHeading")}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1.5">
                    {t("form.province")} <span className="text-rose-500">*</span>
                    <span className="text-[10.5px] font-normal text-emerald-700 mr-1.5">{t("createPage.provinceTableHint")}</span>
                  </label>
                  <SearchableSelect
                    value={province}
                    onChange={(val) => setProvince(val)}
                    options={AFGHAN_PROVINCES.map(([key, value]) => ({
                      value,
                      label: key === "kabul"
                        ? t("company.defaultLocation", { ns: "common" })
                        : t(`provinces.${key}`, { ns: "common" }),
                    }))}
                    placeholder={t("createPage.provincePlaceholder")}
                    buttonClassName="w-full h-[40px] px-3 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-800"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-800 mb-1.5">
                    {t("form.address")}
                    <span className="text-[10.5px] font-normal text-gray-500 mr-1.5">{t("createPage.profileHint")}</span>
                  </label>
                  <textarea
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder={t("createPage.addressPlaceholder")}
                    className="w-full p-2.5 bg-white border border-gray-300 rounded-input text-xs text-gray-800 focus:outline-none focus:border-emerald-600 leading-relaxed"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-card shadow-2xs p-5 space-y-4">
              <div className="flex items-center gap-2 text-gray-900 font-bold text-sm border-b border-gray-100 pb-3">
                <FileText size={16} className="text-emerald-600" />
                <span>{t("createPage.notesHeading")}</span>
              </div>

              <div>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("createPage.notesPlaceholder")}
                  className="w-full p-2.5 bg-white border border-gray-300 rounded-input text-xs text-gray-800 focus:outline-none focus:border-emerald-600 leading-relaxed"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-gray-200 rounded-card shadow-2xs p-5 space-y-4">
              <div className="flex items-center gap-2 text-gray-900 font-bold text-sm border-b border-gray-100 pb-3">
                <ShieldCheck size={16} className="text-emerald-600" />
                <span>{t("createPage.accountSettingsHeading")}</span>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1.5">
                    {t("form.creditLimit")}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      dir="ltr"
                      onFocus={(e) => e.target.select()}
                      onWheel={(e) => e.target.blur()}
                      value={creditLimit}
                      onChange={(e) => setCreditLimit(e.target.value)}
                      placeholder="0.00"
                      className="w-full h-[40px] px-3 bg-white border border-gray-300 rounded text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-emerald-600 text-left"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-bold">$ USD</span>
                  </div>
                  <p className="text-[10.5px] text-gray-400 mt-1">{t("createPage.creditLimitHint")}</p>
                </div>

                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <fieldset>
                      <legend className="block text-[10px] font-bold text-gray-700 mb-1.5">
                        {t("createPage.openingBalance.directionLabel")}
                      </legend>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { value: "customer_owes", label: t("createPage.openingBalance.customerOwes") },
                          { value: "company_owes", label: t("createPage.openingBalance.companyOwes") },
                        ].map((option) => (
                          <label
                            key={option.value}
                            className={`inline-flex items-center gap-1.5 rounded border px-2 py-1.5 text-[10px] cursor-pointer transition-colors ${
                              openingBalanceDirection === option.value
                                ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            <input
                              type="radio"
                              name="openingBalanceDirection"
                              value={option.value}
                              checked={openingBalanceDirection === option.value}
                              onChange={() => setOpeningBalanceDirection(option.value)}
                              className="h-3 w-3 accent-emerald-600"
                            />
                            <span>{option.label}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>

                    <fieldset>
                      <legend className="block text-[10px] font-bold text-gray-700 mb-1.5">
                        {t("createPage.openingBalance.currencyLabel")}
                      </legend>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { value: "AFN", label: t("createPage.openingBalance.afn") },
                          { value: "USD", label: t("createPage.openingBalance.usd") },
                          { value: "both", label: t("createPage.openingBalance.both") },
                        ].map((option) => (
                          <label
                            key={option.value}
                            className={`inline-flex items-center gap-1.5 rounded border px-2 py-1.5 text-[10px] cursor-pointer transition-colors ${
                              openingBalanceCurrency === option.value
                                ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            <input
                              type="radio"
                              name="openingBalanceCurrency"
                              value={option.value}
                              checked={openingBalanceCurrency === option.value}
                              onChange={() => setOpeningBalanceCurrency(option.value)}
                              className="h-3 w-3 accent-emerald-600"
                            />
                            <span>{option.label}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  </div>

                  <div className={`grid gap-3 ${openingBalanceCurrency === "both" ? "grid-cols-2" : "grid-cols-1"}`}>
                    {openingBalanceCurrency !== "USD" && (
                      <div>
                        <label className="block text-xs font-bold text-gray-800 mb-1.5">
                          {t("createPage.openingBalance.amountAfn")}
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          dir="ltr"
                          value={openingBalanceAfn}
                          onChange={(e) => setOpeningBalanceAfn(e.target.value)}
                          placeholder="0.00"
                          className="w-full h-[40px] px-3 bg-white border border-gray-300 rounded text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-emerald-600 text-left"
                        />
                      </div>
                    )}
                    {openingBalanceCurrency !== "AFN" && (
                      <div>
                        <label className="block text-xs font-bold text-gray-800 mb-1.5">
                          {t("createPage.openingBalance.amountUsd")}
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          dir="ltr"
                          value={openingBalanceUsd}
                          onChange={(e) => setOpeningBalanceUsd(e.target.value)}
                          placeholder="0.00"
                          className="w-full h-[40px] px-3 bg-white border border-gray-300 rounded text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-emerald-600 text-left"
                        />
                      </div>
                    )}
                  </div>
                  <p className="text-[10.5px] text-gray-400">
                    {t("createPage.openingBalance.hint")}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1.5">
                    {t("form.status")} <span className="text-rose-500">*</span>
                  </label>
                  <CustomDropdown
                    value={status}
                    onChange={(val) => setStatus(val)}
                    options={[
                      { value: "active", label: t("createPage.activeStatus") },
                      { value: "inactive", label: t("createPage.inactiveStatus") },
                    ]}
                    buttonClassName="w-full h-[40px] px-3 bg-white border border-gray-300 rounded text-xs font-bold text-gray-800"
                  />
                </div>

              </div>

              <div className="pt-3 space-y-2 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save size={15} />
                  <span>
                    {submitting ? t("createPage.submitting") : t("createPage.submit")}
                  </span>
                </button>

                <Link
                  to="/customers"
                  className="w-full py-2 px-4 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs border border-gray-300 rounded transition-colors flex items-center justify-center gap-1.5"
                >
                  {t("createPage.cancel")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
