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

export default function CustomerCreatePage({ sellerMode = false }) {
  const navigate = useNavigate();
  const { t } = useTranslation("customers");

  const [customerCode, setCustomerCode] = useState("1001");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phone2, setPhone2] = useState("");
  const [province, setProvince] = useState("کابل");
  const [address, setAddress] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [openingBalanceDirection, setOpeningBalanceDirection] = useState(
    sellerMode ? "company_owes" : "customer_owes",
  );
  const [openingBalanceCurrency, setOpeningBalanceCurrency] = useState("AFN");
  const [openingBalanceAfn, setOpeningBalanceAfn] = useState("");
  const [openingBalanceUsd, setOpeningBalanceUsd] = useState("");
  const [hasOpeningBalance, setHasOpeningBalance] = useState(false);
  const [status, setStatus] = useState("active");
  const [notes, setNotes] = useState("");
  const [isRepresentative, setIsRepresentative] = useState(false);
  const [representativeResponsible, setRepresentativeResponsible] = useState("");
  const [representativeNotes, setRepresentativeNotes] = useState("");

  const [loadingCode, setLoadingCode] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const accent = sellerMode
    ? {
      soft: "bg-rose-50 text-rose-700 border-rose-200",
      text: "text-rose-600",
      code: "text-rose-700 bg-rose-50 border-rose-200",
      codeInput: "bg-rose-50/50 border border-rose-300 text-rose-900 focus:border-rose-600",
      focus: "focus:border-rose-600",
      hint: "text-rose-700",
      selected: "border-rose-500 bg-rose-50 text-rose-800",
      radio: "accent-rose-600",
      button: "bg-rose-600 hover:bg-rose-700",
    }
    : {
      soft: "bg-emerald-50 text-emerald-700 border-emerald-200",
      text: "text-emerald-600",
      code: "text-emerald-700 bg-emerald-50 border-emerald-200",
      codeInput: "bg-emerald-50/50 border border-emerald-300 text-emerald-900 focus:border-emerald-600",
      focus: "focus:border-emerald-600",
      hint: "text-emerald-700",
      selected: "border-emerald-500 bg-emerald-50 text-emerald-800",
      radio: "accent-emerald-600",
      button: "bg-emerald-600 hover:bg-emerald-700",
    };

  useEffect(() => {
    const fetchNextCode = async () => {
      setLoadingCode(true);
      try {
        const res = await fetch(apiUrl(sellerMode ? "/suppliers/next-code" : "/customers/next-code"));
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
  }, [sellerMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      showToast(t("createPage.nameRequired"), "error");
      return;
    }


    setSubmitting(true);

    try {
      const payload = {
        ...(sellerMode ? {} : { customer_code: customerCode.trim() }),
        name: name.trim(),
        phone: toEnglishDigits(phone.trim()),
        ...(sellerMode ? {} : { phone2: phone2.trim() ? toEnglishDigits(phone2.trim()) : null }),
        province: province,
        address: address.trim() || null,
        ...(!sellerMode ? { credit_limit: creditLimit ? parseFloat(toEnglishDigits(creditLimit)) : 0.00 } : {}),
        opening_balance_direction: hasOpeningBalance ? openingBalanceDirection : (sellerMode ? "company_owes" : "customer_owes"),
        opening_balance_currency: hasOpeningBalance ? openingBalanceCurrency : "AFN",
        opening_balance_afn: hasOpeningBalance && openingBalanceCurrency !== "USD" && openingBalanceAfn
          ? parseFloat(toEnglishDigits(openingBalanceAfn))
          : 0,
        opening_balance_usd: hasOpeningBalance && openingBalanceCurrency !== "AFN" && openingBalanceUsd
          ? parseFloat(toEnglishDigits(openingBalanceUsd))
          : 0,
        status: status,
        notes: notes.trim() || null,
        ...(!sellerMode ? {
          is_representative: isRepresentative,
          representative_responsible: isRepresentative ? representativeResponsible.trim() || null : null,
          representative_notes: isRepresentative ? representativeNotes.trim() || null : null,
        } : {}),
        ...(!sellerMode ? {
        } : {}),
      };

      const res = await fetch(apiUrl(sellerMode ? "/suppliers" : "/customers"), {
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

      showToast(sellerMode ? "فروشنده با موفقیت ثبت شد." : t("messages.created"));

      setTimeout(() => {
        navigate(sellerMode ? "/sellers" : "/customers");
      }, 1000);
    } catch (err) {
      console.error(sellerMode ? "Submit seller error:" : "Submit customer error:", err);
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
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center border shadow-2xs ${accent.soft}`}>
              <UserPlus size={19} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                {sellerMode ? "ثبت فروشنده جدید" : t("createPage.title")}
              </h1>
              <p className="text-xs text-gray-500">
                {sellerMode ? "مشخصات فروشنده و طرف حساب شرکت را ثبت کنید" : t("createPage.subtitle")}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to={sellerMode ? "/sellers" : "/customers"}
            className="px-3.5 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowRight size={15} />
            <span>{sellerMode ? "بازگشت به فهرست فروشندگان" : t("createPage.backToList")}</span>
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white border border-gray-200 rounded-card shadow-2xs p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
                  <User size={16} className={accent.text} />
                  <span>{t("createPage.identityHeading")}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{t("form.code")}</span>
                  <span className={`font-mono font-bold px-2 py-0.5 rounded border ${accent.code}`}>
                    {loadingCode ? "..." : customerCode}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1.5">
                    {sellerMode ? "کد فروشنده" : t("createPage.customerCode")} <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      readOnly={sellerMode}
                      value={customerCode}
                      onChange={(e) => setCustomerCode(e.target.value)}
                      placeholder={sellerMode ? "کد فروشنده" : t("createPage.customerCodePlaceholder")}
                      className={`w-full h-[40px] px-3 rounded text-xs font-mono font-bold focus:outline-none ${
                        sellerMode
                          ? "bg-gray-100 border border-gray-300 text-gray-600 cursor-not-allowed"
                          : accent.codeInput
                      }`}
                    />
                    <Hash size={15} className={`absolute left-3 top-2.5 ${accent.text}`} />
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
                    placeholder={sellerMode ? "نام فروشنده" : t("createPage.namePlaceholder")}
                    className={`w-full h-[40px] px-3 bg-white border border-gray-300 rounded text-xs text-gray-800 focus:outline-none ${accent.focus}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1.5">
                    {t("form.phone")} <span className="text-rose-500">*</span>
                    <span className={`text-[10.5px] font-normal mr-1.5 ${accent.hint}`}>{t("createPage.phoneTableHint")}</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={sellerMode ? "شماره تماس" : t("createPage.phonePlaceholder")}
                      className={`w-full h-[40px] px-3 bg-white border border-gray-300 rounded text-xs font-mono text-gray-800 focus:outline-none text-left ${accent.focus}`}
                    />
                    <Phone size={15} className="absolute right-3 top-2.5 text-gray-400" />
                  </div>
                </div>

                {!sellerMode && <div>
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
                      className={`w-full h-[40px] px-3 bg-white border border-gray-300 rounded text-xs font-mono text-gray-800 focus:outline-none text-left ${accent.focus}`}
                    />
                    <Phone size={15} className="absolute right-3 top-2.5 text-gray-400" />
                  </div>
                </div>}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-card shadow-2xs p-5 space-y-4">
              <div className="flex items-center gap-2 text-gray-900 font-bold text-sm border-b border-gray-100 pb-3">
                <MapPin size={16} className={accent.text} />
                <span>{t("createPage.locationHeading")}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1.5">
                    {t("form.province")} <span className="text-rose-500">*</span>
                    <span className={`text-[10.5px] font-normal mr-1.5 ${accent.hint}`}>{t("createPage.provinceTableHint")}</span>
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
                    placeholder={sellerMode ? "آدرس" : t("createPage.addressPlaceholder")}
                    className={`w-full p-2.5 bg-white border border-gray-300 rounded-input text-xs text-gray-800 focus:outline-none leading-relaxed ${accent.focus}`}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-card shadow-2xs p-5 space-y-4">
              <div className="flex items-center gap-2 text-gray-900 font-bold text-sm border-b border-gray-100 pb-3">
                <FileText size={16} className={accent.text} />
                <span>{t("createPage.notesHeading")}</span>
              </div>

              <div>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={sellerMode ? "یادداشت" : t("createPage.notesPlaceholder")}
                  className={`w-full p-2.5 bg-white border border-gray-300 rounded-input text-xs text-gray-800 focus:outline-none leading-relaxed ${accent.focus}`}
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-gray-200 rounded-card shadow-2xs p-5 space-y-4">
              <div className="flex items-center gap-2 text-gray-900 font-bold text-sm border-b border-gray-100 pb-3">
                <ShieldCheck size={16} className={accent.text} />
                <span>{t("createPage.accountSettingsHeading")}</span>
              </div>

              <div className="space-y-4 text-xs">
                {!sellerMode && (
                  <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                    <label className="flex cursor-pointer items-center gap-2 font-bold text-amber-900">
                      <input type="checkbox" checked={isRepresentative} onChange={(event) => setIsRepresentative(event.target.checked)} className="h-4 w-4 accent-amber-600" />
                      <span>نماینده</span>
                    </label>
                    {isRepresentative && (
                      <div className="space-y-3 border-t border-amber-200 pt-3">
                        <label className="block">
                          <span className="mb-1 block font-bold text-gray-800">مسؤول</span>
                          <input type="text" value={representativeResponsible} onChange={(event) => setRepresentativeResponsible(event.target.value)} className="h-9 w-full rounded-input border border-gray-300 bg-white px-3 text-xs focus:border-amber-600 focus:outline-none" />
                        </label>
                        <label className="block">
                          <span className="mb-1 block font-bold text-gray-800">توضیحات نمایندگی</span>
                          <textarea rows={2} value={representativeNotes} onChange={(event) => setRepresentativeNotes(event.target.value)} className="w-full rounded-input border border-gray-300 bg-white px-3 py-2 text-xs leading-relaxed focus:border-amber-600 focus:outline-none" />
                        </label>
                      </div>
                    )}
                  </div>
                )}
                {!sellerMode && <div>
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
                      className={`w-full h-[40px] px-3 bg-white border border-gray-300 rounded text-xs font-mono font-bold text-gray-900 focus:outline-none text-left ${accent.focus}`}
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-bold">$ USD</span>
                  </div>
                  <p className="text-[10.5px] text-gray-400 mt-1">{t("createPage.creditLimitHint")}</p>
                </div>}

                <label className={`flex cursor-pointer items-center gap-2 rounded border px-3 py-2 text-[10px] font-bold transition-colors ${hasOpeningBalance ? accent.selected : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}>
                  <input
                    type="checkbox"
                    checked={hasOpeningBalance}
                    onChange={(event) => setHasOpeningBalance(event.target.checked)}
                    className={`h-3.5 w-3.5 ${accent.radio}`}
                  />
                  <span>{sellerMode ? "فروشنده با حساب" : "فعال‌سازی بیلانس افتتاحیه"}</span>
                </label>

                {hasOpeningBalance && <div className="border-t border-gray-100 pt-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <fieldset>
                      <legend className="block text-[10px] font-bold text-gray-700 mb-1.5">
                        {sellerMode ? "وضعیت حساب" : t("createPage.openingBalance.directionLabel")}
                      </legend>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          {
                            value: "customer_owes",
                            label: sellerMode ? "قرضدار" : t("createPage.openingBalance.customerOwes"),
                          },
                          {
                            value: "company_owes",
                            label: sellerMode ? "طلبکار" : t("createPage.openingBalance.companyOwes"),
                          },
                        ].map((option) => (
                          <label
                            key={option.value}
                            className={`inline-flex items-center gap-1.5 rounded border px-2 py-1.5 text-[10px] cursor-pointer transition-colors ${
                              openingBalanceDirection === option.value
                                ? accent.selected
                                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            <input
                              type="radio"
                              name="openingBalanceDirection"
                              value={option.value}
                              checked={openingBalanceDirection === option.value}
                              onChange={() => setOpeningBalanceDirection(option.value)}
                              className={`h-3 w-3 ${accent.radio}`}
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
                                ? accent.selected
                                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            <input
                              type="radio"
                              name="openingBalanceCurrency"
                              value={option.value}
                              checked={openingBalanceCurrency === option.value}
                              onChange={() => setOpeningBalanceCurrency(option.value)}
                              className={`h-3 w-3 ${accent.radio}`}
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
                          className={`w-full h-[40px] px-3 bg-white border border-gray-300 rounded text-xs font-mono font-bold text-gray-900 focus:outline-none text-left ${accent.focus}`}
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
                          className={`w-full h-[40px] px-3 bg-white border border-gray-300 rounded text-xs font-mono font-bold text-gray-900 focus:outline-none text-left ${accent.focus}`}
                        />
                      </div>
                    )}
                  </div>
                  <p className="text-[10.5px] text-gray-400">
                    {t("createPage.openingBalance.hint")}
                  </p>
                </div>}

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
                  className={`w-full py-2.5 px-4 ${accent.button} text-white font-bold text-xs rounded transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50`}
                >
                  <Save size={15} />
                  <span>
                    {submitting ? t("createPage.submitting") : t("createPage.submit")}
                  </span>
                </button>

                <Link
                  to={sellerMode ? "/sellers" : "/customers"}
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
