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

const AFGHAN_PROVINCES = [
  "کابل", "هرات", "بلخ", "ننگرهار", "کندز", "کندهار", "غزنی", "بغلان",
  "تخار", "بدخشان", "فاریاب", "جوزجان", "سرپل", "سمنگان", "پروان",
  "کاپیسا", "پنجشیر", "وردک", "لوگر", "خوست", "پکتیا", "پکتیکا",
  "هلمند", "زابل", "ارزگان", "غور", "بادغیس", "فراه", "نیمروز",
  "دایکندی", "بامیان", "کنر", "لغمان", "نورستان"
];

export default function CustomerCreatePage() {
  const navigate = useNavigate();

  const [customerCode, setCustomerCode] = useState("1001");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phone2, setPhone2] = useState("");
  const [province, setProvince] = useState("کابل");
  const [address, setAddress] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [status, setStatus] = useState("active");
  const [createdBy, setCreatedBy] = useState("مدیریت فروش");
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
      showToast("لطفاً نام و نام خانوادگی مشتری را وارد نمایید.", "error");
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
        status: status,
        created_by: createdBy.trim() || "مدیریت فروش",
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
        throw new Error(resData.message || "خطا در ثبت مشتری");
      }

      showToast("مشتری جدید با موفقیت در سیستم ثبت گردید.");

      setTimeout(() => {
        navigate("/customers");
      }, 1000);
    } catch (err) {
      console.error("Submit customer error:", err);
      showToast(err.message || "خطا در اتصال به سرور", "error");
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
                ثبت پرونده مشتری جدید
              </h1>
              <p className="text-xs text-gray-500">
                ایجاد حساب مشتری، شماره‌های تماس، موقعیت و سقف اعتبار
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
            <span>بازگشت به لیست مشتریان</span>
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
                  <span>مشخصات هویتی و شماره‌های تماس</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>کد مشتری:</span>
                  <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {loadingCode ? "..." : customerCode}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1.5">
                    کد شناسایی مشتری (۴ رقمی) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={customerCode}
                      onChange={(e) => setCustomerCode(e.target.value)}
                      placeholder="مثال: 1001"
                      className="w-full h-[40px] px-3 bg-emerald-50/50 border border-emerald-300 rounded text-xs font-mono font-bold text-emerald-900 focus:outline-none focus:border-emerald-600"
                    />
                    <Hash size={15} className="absolute left-3 top-2.5 text-emerald-600" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1.5">
                    نام و نام خانوادگی مشتری <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: حاجی عبدالمجید یا شرکت ساختمانی کابل"
                    className="w-full h-[40px] px-3 bg-white border border-gray-300 rounded text-xs text-gray-800 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1.5">
                    شماره تماس ۱ (اصلی) <span className="text-rose-500">*</span>
                    <span className="text-[10.5px] font-normal text-emerald-700 mr-1.5">(نمایش در جدول مشتریان)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="مثال: 0799123456"
                      className="w-full h-[40px] px-3 bg-white border border-gray-300 rounded text-xs font-mono text-gray-800 focus:outline-none focus:border-emerald-600 text-left"
                    />
                    <Phone size={15} className="absolute right-3 top-2.5 text-gray-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1.5">
                    شماره تماس ۲ (اختیاری)
                    <span className="text-[10.5px] font-normal text-gray-500 mr-1.5">(نمایش در پروفایل مشتری)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={phone2}
                      onChange={(e) => setPhone2(e.target.value)}
                      placeholder="مثال: 0788123456"
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
                <span>موقعیت جغرافیایی و آدرس</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1.5">
                    ولایت <span className="text-rose-500">*</span>
                    <span className="text-[10.5px] font-normal text-emerald-700 mr-1.5">(نمایش در جدول)</span>
                  </label>
                  <SearchableSelect
                    value={province}
                    onChange={(val) => setProvince(val)}
                    options={AFGHAN_PROVINCES.map((p) => ({ value: p, label: p }))}
                    placeholder="انتخاب ولایت"
                    buttonClassName="w-full h-[40px] px-3 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-800"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-800 mb-1.5">
                    آدرس و موقعیت دقیق (اختیاری)
                    <span className="text-[10.5px] font-normal text-gray-500 mr-1.5">(نمایش در پروفایل)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="مثال: سرک نو، چهارراهی صدارت، مارکیت فولاد، دکان شماره ۱۲"
                    className="w-full p-2.5 bg-white border border-gray-300 rounded-input text-xs text-gray-800 focus:outline-none focus:border-emerald-600 leading-relaxed"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-card shadow-2xs p-5 space-y-4">
              <div className="flex items-center gap-2 text-gray-900 font-bold text-sm border-b border-gray-100 pb-3">
                <FileText size={16} className="text-emerald-600" />
                <span>توضیحات و یادداشت پرونده</span>
              </div>

              <div>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="هرگونه یادداشت اختیاری در مورد سابقه مشتری، نحوه تسویه یا ضمانت..."
                  className="w-full p-2.5 bg-white border border-gray-300 rounded-input text-xs text-gray-800 focus:outline-none focus:border-emerald-600 leading-relaxed"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-gray-200 rounded-card shadow-2xs p-5 space-y-4">
              <div className="flex items-center gap-2 text-gray-900 font-bold text-sm border-b border-gray-100 pb-3">
                <ShieldCheck size={16} className="text-emerald-600" />
                <span>تنظیمات مالی و وضعیت حساب</span>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1.5">
                    سقف اعتبار خرید قرضه ($ دالر)
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
                  <p className="text-[10.5px] text-gray-400 mt-1">حداکثر بدهی مجاز مشتری جهت صدور فاکتور قرضه</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1.5">
                    وضعیت حساب مشتری <span className="text-rose-500">*</span>
                  </label>
                  <CustomDropdown
                    value={status}
                    onChange={(val) => setStatus(val)}
                    options={[
                      { value: "active", label: "فعال (مجاز به انجام معامله)" },
                      { value: "inactive", label: "غیرفعال (مسدود)" },
                    ]}
                    buttonClassName="w-full h-[40px] px-3 bg-white border border-gray-300 rounded text-xs font-bold text-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">
                    کاربر ثبت‌کننده پرونده
                  </label>
                  <input
                    type="text"
                    value={createdBy}
                    onChange={(e) => setCreatedBy(e.target.value)}
                    className="w-full h-[40px] px-3 bg-gray-50 border border-gray-300 rounded text-xs text-gray-700 focus:outline-none focus:border-emerald-600"
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
                  <span>{submitting ? "در حال ثبت پرونده..." : "ثبت و ایجاد پرونده مشتری"}</span>
                </button>

                <Link
                  to="/customers"
                  className="w-full py-2 px-4 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs border border-gray-300 rounded transition-colors flex items-center justify-center gap-1.5"
                >
                  انصراف و بازگشت
                </Link>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
