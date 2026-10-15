import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  UserPlus,
  Edit3,
  User,
  Briefcase,
  CreditCard,
  Phone,
  MapPin,
  Camera,
  UserCheck,
  ChevronLeft,
  ArrowRight,
  Home,
  Users,
  Save,
  Loader2,
} from "lucide-react";
import DatePicker from "react-multi-date-picker";
import { formatToGregorian, toAfghanDate, persian, persian_af } from "../utils/dateHelpers";
import { CustomDropdown, SearchableSelect } from "../components/common";
import { PROVINCE_OPTIONS } from "../constants/provinces";
import showToast from "../utils/toast";
import useEmployees from "../hooks/useEmployees";
import { useBranch } from "../context/BranchContext";
import { JOB_CATEGORY } from "../constants/attendanceDomain";
import { useTranslation } from "react-i18next";
const INITIAL_FORM_DATA = {
  fullName: "",
  fatherName: "",
  employeeCode: "",
  phone: "",
  introducedBy: "",
  branchId: "",
  jobCategory: "",
  jobCategoryId: "",
  position: "",
  jobPositionId: "",
  customPosition: "",
  salary: "",
  hourlyRate: "",
  joiningDateObject: null,
  province: "",
  photo: "",
};
const PERSIAN_DIGITS = "\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669";
const NAME_BLOCKED = /[^\p{L}\p{M}\u200C\s.'-]/gu;
const TITLE_BLOCKED = /[^\p{L}\p{M}\p{N}\u200C\s.'\-/]/gu;
const MAX_TEXT_LENGTH = 100;
const MAX_PHONE_LENGTH = 15;
const MAX_AMOUNT_LENGTH = 12;
const PHONE_PATTERN = /^\d{9,15}$/;
const MIN_NAME_LENGTH = 3;
const MIN_TITLE_LENGTH = 2;
const toLatinDigits = (value) =>
  String(value).replace(/[\u06F0-\u06F9\u0660-\u0669]/g, (digit) => String(PERSIAN_DIGITS.indexOf(digit) % 10));
const sanitizeName = (value) =>
  String(value).replace(NAME_BLOCKED, "").replace(/\s{2,}/g, " ").slice(0, MAX_TEXT_LENGTH);
const sanitizeTitle = (value) =>
  String(value).replace(TITLE_BLOCKED, "").replace(/\s{2,}/g, " ").slice(0, MAX_TEXT_LENGTH);
const sanitizePhone = (value) => toLatinDigits(value).replace(/\D/g, "").slice(0, MAX_PHONE_LENGTH);
const sanitizeAmount = (value) =>
  toLatinDigits(value).replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1").slice(0, MAX_AMOUNT_LENGTH);
const CARD = "bg-white rounded-card border border-gray-200 shadow-2xs p-4 space-y-3.5";
const INPUT =
  "w-full h-10 bg-white border border-gray-300 focus:border-slate-800 rounded-input px-3 text-body-text text-gray-900 placeholder:text-gray-400 outline-none transition-colors";
const INPUT_WITH_ICON = `${INPUT} pr-9`;
const SELECT_BTN =
  "w-full h-10 bg-white border border-gray-300 rounded-input px-3 text-label-text text-gray-900 font-medium";
const SectionTitle = ({ icon: Icon, title }) => (
  <div className="flex items-center gap-2 border-b border-gray-100 pb-2.5">
    <span className="w-7 h-7 rounded-btn bg-gray-100 text-gray-600 flex items-center justify-center shrink-0">
      <Icon size={15} />
    </span>
    <h3 className="text-base font-bold text-gray-900">{title}</h3>
  </div>
);
const IconField = ({ icon: Icon, children }) => (
  <div className="relative flex items-center">
    <Icon size={15} className="text-gray-400 absolute right-3 pointer-events-none" />
    {children}
  </div>
);
export default function EmployeeFormPage() {
  const { t } = useTranslation("employee");
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { branches, isMultiBranch, singleBranchId } = useBranch();
  const {
    categories,
    positions,
    isLoading: isLoadingRemote,
    isSubmitting,
    fetchEmployee,
    saveEmployee,
  } = useEmployees();
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [isFetchingEmp, setIsFetchingEmp] = useState(false);
  const updateField = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);
  useEffect(() => {
    if (!isMultiBranch && singleBranchId) {
      setFormData((prev) => (prev.branchId ? prev : { ...prev, branchId: singleBranchId }));
    }
  }, [isMultiBranch, singleBranchId]);
  const branchOptions = useMemo(() => {
    return branches.map((b) => ({
      value: String(b.id),
      label: `${b.name} (${b.location || "کابل"})`,
    }));
  }, [branches]);
  const categoryOptions = useMemo(() => {
    return categories.map((c) => ({
      value: String(c.id),
      label: c.name,
      rawName: c.name,
    }));
  }, [categories]);
  const filteredPositions = useMemo(() => {
    if (!formData.jobCategoryId && !formData.jobCategory) return [];
    return positions.filter((p) => {
      if (formData.jobCategoryId && p.job_category_id) {
        return String(p.job_category_id) === String(formData.jobCategoryId);
      }
      if (formData.jobCategory && p.jobCategory?.name) {
        return p.jobCategory.name === formData.jobCategory;
      }
      return true;
    });
  }, [positions, formData.jobCategoryId, formData.jobCategory]);
  const positionOptions = useMemo(() => {
    const opts = filteredPositions.map((p) => ({
      value: String(p.id),
      label: p.name,
      rawName: p.name,
    }));
    opts.push({
      value: "custom",
      label: t("form.positionOther"),
      rawName: t("form.positionOther"),
    });
    return opts;
  }, [filteredPositions]);
  useEffect(() => {
    if (isEdit && id) {
      setIsFetchingEmp(true);
      fetchEmployee(id)
        .then((emp) => {
          if (emp) {
            const catId = emp.job_category_id ? String(emp.job_category_id) : "";
            const catName = emp.jobCategory?.name || emp.job_category || "";
            const posId = emp.job_position_id ? String(emp.job_position_id) : "";
            const posName = emp.jobPosition?.name || emp.position || "";
            let isPreset = false;
            if (posId) {
              isPreset = positions.some((p) => String(p.id) === String(posId));
            } else if (posName) {
              isPreset = positions.some((p) => p.name === posName);
            }
            setFormData({
              fullName: emp.full_name || "",
              fatherName: emp.father_name || "",
              employeeCode: emp.employee_ID || "",
              phone: emp.phone || "",
              introducedBy: emp.introduced_by || "",
              branchId: emp.branch_id ? String(emp.branch_id) : "",
              jobCategoryId: catId,
              jobCategory: catName,
              jobPositionId: isPreset ? posId : "custom",
              position: isPreset ? posName : (posName ? t("form.positionOther") : ""),
              customPosition: isPreset ? "" : posName,
              salary: emp.salary !== undefined && emp.salary !== null ? String(emp.salary) : "",
              hourlyRate: emp.hourly_rate !== undefined && emp.hourly_rate !== null ? String(emp.hourly_rate) : "",
              joiningDateObject: emp.joining_date ? toAfghanDate(emp.joining_date) : null,
              province: emp.province || "",
              photo: emp.photo || "",
            });
          } else {
            showToast.error(t("errors.notFound"));
          }
        })
        .catch(() => {
          showToast.error(t("errors.fetch"));
        })
        .finally(() => setIsFetchingEmp(false));
    }
  }, [isEdit, id, fetchEmployee, positions]);
  const handleCategoryChange = (val) => {
    const selectedObj = categories.find((c) => String(c.id) === String(val));
    const catName = selectedObj ? selectedObj.name : "";
    setFormData((prev) => ({
      ...prev,
      jobCategoryId: val,
      jobCategory: catName,
      jobPositionId: "",
      position: "",
      customPosition: "",
      hourlyRate: catName === JOB_CATEGORY.HANGAR ? prev.hourlyRate : "",
    }));
  };
  const handlePositionChange = (val) => {
    if (val === "custom") {
      setFormData((prev) => ({
        ...prev,
        jobPositionId: "custom",
        position: t("form.positionOther"),
      }));
      return;
    }
    const posObj = positions.find((p) => String(p.id) === String(val));
    setFormData((prev) => ({
      ...prev,
      jobPositionId: val,
      position: posObj ? posObj.name : "",
      customPosition: "",
    }));
  };
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast.warning(t("errors.photoSize"));
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        updateField("photo", reader.result);
      };
      reader.readAsDataURL(file);
    }
  };
  const isHangarWorker = formData.jobCategory === JOB_CATEGORY.HANGAR;
  const isCustomPosition =
    formData.jobPositionId === "custom" || formData.position === t("form.positionOther");
  const firstValidationError = () => {
    if (sanitizeName(formData.fullName).trim().length < MIN_NAME_LENGTH) return t("errors.fullNameInvalid");
    if (sanitizeName(formData.fatherName).trim().length < MIN_NAME_LENGTH) return t("errors.fatherNameInvalid");
    if (isMultiBranch && !formData.branchId) return t("errors.branchRequired");
    if (!formData.jobCategoryId) return t("errors.categoryRequired");
    if (!formData.jobPositionId) return t("errors.positionRequired");
    if (isCustomPosition && sanitizeTitle(formData.customPosition).trim().length < MIN_TITLE_LENGTH)
      return t("errors.customPositionRequired");
    if (!formData.province) return t("errors.provinceRequired");
    if (formData.salary === "" || Number(formData.salary) < 0) return t("errors.salaryRequired");
    if (isHangarWorker && (formData.hourlyRate === "" || Number(formData.hourlyRate) <= 0))
      return t("errors.hourlyRateRequired");
    if (!formData.joiningDateObject) return t("errors.joiningDateRequired");
    if (formData.phone && !PHONE_PATTERN.test(formData.phone)) return t("errors.phoneInvalid");
    if (formData.introducedBy && sanitizeName(formData.introducedBy).trim().length < MIN_NAME_LENGTH)
      return t("errors.introducerInvalid");
    return null;
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = firstValidationError();
    if (validationError) {
      showToast.error(validationError);
      return;
    }
    const payload = {
      full_name: sanitizeName(formData.fullName).trim(),
      father_name: sanitizeName(formData.fatherName).trim(),
      phone: formData.phone ? sanitizePhone(formData.phone) : null,
      introduced_by: formData.introducedBy ? sanitizeName(formData.introducedBy).trim() : null,
      branch_id: formData.branchId ? Number(formData.branchId) : null,
      job_category_id: Number(formData.jobCategoryId),
      job_position_id: isCustomPosition ? null : Number(formData.jobPositionId),
      position: isCustomPosition ? sanitizeTitle(formData.customPosition).trim() : null,
      salary: Number(formData.salary),
      hourly_rate: isHangarWorker ? Number(formData.hourlyRate) : 0,
      joining_date: formatToGregorian(formData.joiningDateObject),
      province: formData.province,
      photo: formData.photo || null,
    };
    const res = await saveEmployee(payload, isEdit ? id : null);
    if (res.success) {
      navigate("/employees", {
        state: {
          toastMessage: isEdit ? t("success.edit") : t("success.create"),
          selectedBranch: formData.branchId || localStorage.getItem("jfc_selected_branch") || "all",
        },
      });
    } else {
      showToast.error(res.message || t("errors.save"));
    }
  };
  const goBackToList = () =>
    navigate("/employees", {
      state: { selectedBranch: localStorage.getItem("jfc_selected_branch") || "all" },
    });
  const isPageLoading = isFetchingEmp || (isEdit && isLoadingRemote);
  return (
    <div className="w-full space-y-4 font-sans" dir="rtl">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-caption-text font-bold text-gray-500">
        <Link to="/" className="hover:text-gray-900 transition-colors flex items-center gap-1">
          <Home size={13} />
          <span>{t("page.breadcrumbHome")}</span>
        </Link>
        <ChevronLeft size={13} className="text-gray-400" />
        <Link to="/employees" className="hover:text-gray-900 transition-colors flex items-center gap-1">
          <Users size={13} />
          <span>{t("page.breadcrumb")}</span>
        </Link>
        <ChevronLeft size={13} className="text-gray-400" />
        <span className="text-gray-900">
          {isEdit
            ? t("form.breadcrumbEdit")
            : t("navigation.pages.employeeCreate", { ns: "common" })}
        </span>
      </nav>
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 border-b border-gray-200 pb-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              {isEdit ? t("form.titleEdit") : t("form.titleCreate")}
            </h1>
            {isEdit && formData.employeeCode && (
              <span
                className="font-mono text-caption-text font-bold text-gray-700 bg-gray-100 px-2.5 py-0.5 rounded-badge border border-gray-200"
                dir="ltr"
              >
                {formData.employeeCode}
              </span>
            )}
          </div>
          <p className="text-caption-text text-gray-500 font-medium mt-1">{t("form.subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={goBackToList}
          className="inline-flex items-center gap-1.5 bg-white hover:bg-gray-50 text-gray-700 font-bold px-3.5 py-2 rounded-btn border border-gray-300 transition-colors text-btn-text cursor-pointer shadow-2xs shrink-0"
        >
          <ArrowRight size={15} />
          <span>{t("form.backToList")}</span>
        </button>
      </div>
      {isPageLoading ? (
        <div className={`${CARD} p-16 flex flex-col items-center justify-center gap-3`}>
          <Loader2 size={30} className="animate-spin text-slate-800" />
          <span className="text-body-text font-bold text-gray-600">{t("form.loading")}</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className={CARD}>
            <SectionTitle icon={isEdit ? Edit3 : UserPlus} title={t("form.cardPersonal")} />
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <div className="relative group w-24 h-24 rounded-input border-2 border-dashed border-gray-300 hover:border-slate-800 bg-gray-50 flex items-center justify-center overflow-hidden transition-colors">
                  {formData.photo ? (
                    <>
                      <img src={formData.photo} alt={t("form.photoLabel")} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-caption-text font-bold">
                        {t("form.photoChange")}
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-2 text-gray-500 group-hover:text-slate-800">
                      <Camera size={20} className="mx-auto mb-1 text-gray-400" />
                      <span className="text-caption-text block font-bold">{t("form.photoLabel")}</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
                {formData.photo && (
                  <button
                    type="button"
                    onClick={() => updateField("photo", "")}
                    className="text-caption-text text-rose-600 hover:text-rose-700 font-bold cursor-pointer"
                  >
                    {t("form.photoDelete")}
                  </button>
                )}
              </div>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <IconField icon={User}>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => updateField("fullName", sanitizeName(e.target.value))}
                    placeholder={t("form.fullName")}
                    className={INPUT_WITH_ICON}
                  />
                </IconField>
                <IconField icon={User}>
                  <input
                    type="text"
                    value={formData.fatherName}
                    onChange={(e) => updateField("fatherName", sanitizeName(e.target.value))}
                    placeholder={t("form.fatherName")}
                    className={INPUT_WITH_ICON}
                  />
                </IconField>
                <IconField icon={Phone}>
                  <input
                    type="text"
                    dir="ltr"
                    value={formData.phone}
                    onChange={(e) => updateField("phone", sanitizePhone(e.target.value))}
                    placeholder={`${t("form.phone")} ${t("form.optionalSuffix")}`}
                    className={`${INPUT_WITH_ICON} text-right font-mono`}
                  />
                </IconField>
                <IconField icon={MapPin}>
                  <SearchableSelect
                    value={formData.province}
                    onChange={(val) => updateField("province", val)}
                    options={PROVINCE_OPTIONS}
                    placeholder={t("form.province")}
                    searchPlaceholder={t("form.searchProvince")}
                    buttonClassName={`${SELECT_BTN} pr-9`}
                  />
                </IconField>
                <IconField icon={CreditCard}>
                  <div className="w-full h-10 bg-gray-50 border border-gray-300 rounded-input pr-9 pl-2.5 text-body-text text-gray-500 flex items-center justify-between">
                    <span>{isEdit && formData.employeeCode ? formData.employeeCode : t("form.employeeCodeAuto")}</span>
                    <span className="text-caption-text text-gray-500 bg-white px-1.5 py-0.5 rounded-badge border border-gray-200 leading-none">
                      {t("form.badgeSystem")}
                    </span>
                  </div>
                </IconField>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className={CARD}>
              <SectionTitle icon={Briefcase} title={t("form.cardJob")} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {isMultiBranch && (
                  <SearchableSelect
                    value={formData.branchId}
                    onChange={(val) => updateField("branchId", val)}
                    options={branchOptions}
                    placeholder={t("form.branch")}
                    searchPlaceholder={t("form.searchBranch")}
                    buttonClassName={SELECT_BTN}
                  />
                )}
                <CustomDropdown
                  value={formData.jobCategoryId}
                  onChange={handleCategoryChange}
                  options={categoryOptions}
                  placeholder={t("form.jobCategory")}
                  buttonClassName={SELECT_BTN}
                  width="w-full"
                  align="right"
                />
                <SearchableSelect
                  value={formData.jobPositionId}
                  onChange={handlePositionChange}
                  disabled={!formData.jobCategoryId && !formData.jobCategory}
                  options={positionOptions}
                  placeholder={
                    formData.jobCategoryId || formData.jobCategory
                      ? t("form.jobPosition")
                      : t("form.jobPositionWait")
                  }
                  searchPlaceholder={t("form.searchJobPosition")}
                  buttonClassName={`${SELECT_BTN} disabled:bg-gray-50 disabled:text-gray-400`}
                />
                {isCustomPosition && (
                  <input
                    type="text"
                    value={formData.customPosition}
                    onChange={(e) => updateField("customPosition", sanitizeTitle(e.target.value))}
                    placeholder={t("form.customPosition")}
                    className={INPUT}
                  />
                )}
                <IconField icon={UserCheck}>
                  <input
                    type="text"
                    value={formData.introducedBy}
                    onChange={(e) => updateField("introducedBy", sanitizeName(e.target.value))}
                    placeholder={`${t("form.introducer")} ${t("form.optionalSuffix")}`}
                    className={INPUT_WITH_ICON}
                  />
                </IconField>
              </div>
            </div>
            <div className={CARD}>
              <SectionTitle icon={CreditCard} title={t("form.cardPay")} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative flex items-center">
                  <input
                    type="number"
                    min="0"
                    dir="ltr"
                    onFocus={(e) => e.target.select()}
                    onWheel={(e) => e.target.blur()}
                    value={formData.salary}
                    onChange={(e) => updateField("salary", sanitizeAmount(e.target.value))}
                    placeholder={t("form.salary")}
                    className={`${INPUT} pl-12 font-mono font-bold`}
                  />
                  <span className="absolute left-3 text-caption-text font-bold text-gray-500 pointer-events-none">
                    {t("company.currency", { ns: "common" })}
                  </span>
                </div>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    disabled={!isHangarWorker}
                    min="0"
                    dir="ltr"
                    onFocus={(e) => e.target.select()}
                    onWheel={(e) => e.target.blur()}
                    value={isHangarWorker ? formData.hourlyRate : ""}
                    onChange={(e) => updateField("hourlyRate", sanitizeAmount(e.target.value))}
                    placeholder={isHangarWorker ? t("form.hourlyRate") : t("form.hourlyRateLocked")}
                    className={`${INPUT} pl-14 font-mono font-bold disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed`}
                  />
                  <span className="absolute left-3 text-caption-text font-bold text-gray-400 pointer-events-none">
                    {t("form.hourlyUnit")}
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <DatePicker
                    value={formData.joiningDateObject}
                    onChange={(val) => updateField("joiningDateObject", val)}
                    calendar={persian}
                    locale={persian_af}
                    calendarPosition="bottom-right"
                    className="rmdp-steel"
                    containerClassName="w-full"
                    containerStyle={{ width: "100%" }}
                    style={{ width: "100%" }}
                    placeholder={t("form.joiningDate")}
                    inputClass={`${INPUT} cursor-pointer`}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className={`${CARD} flex flex-col sm:flex-row justify-between items-center gap-3 space-y-0`}>
            <button
              type="button"
              onClick={goBackToList}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-5 py-2 text-btn-text font-bold text-gray-700 bg-white hover:bg-gray-50 rounded-btn border border-gray-300 transition-colors cursor-pointer shadow-2xs"
            >
              {t("form.cancelAndBack")}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 px-7 rounded-btn transition-colors disabled:opacity-50 text-btn-text cursor-pointer shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>{t("actions.saving", { ns: "common" })}</span>
                </>
              ) : (
                <>
                  <Save size={15} />
                  <span>{isEdit ? t("form.submitEdit") : t("form.submitCreate")}</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
