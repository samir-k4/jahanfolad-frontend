import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { showToast as appToast } from "../utils/toast";
import { usePagePerms } from "../components/common";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiUrl } from "../api";
import {
  User,
  Briefcase,
  Building2,
  Calendar,
  CreditCard,
  Phone,
  MapPin,
  Camera,
  UserCheck,
  ChevronLeft,
  ArrowRight,
  Home,
  Users,
  CheckCircle2,
  AlertCircle,
  Edit,
  Trash2,
  Printer,
  Copy,
  Check,
  Clock,
  UserMinus,
  Save,
} from "lucide-react";
import {
  EmployeeDeleteModal,
  EmployeeStatusModal,
} from "../components/employee";
import { isActiveStatus } from "../constants/employeeDomain";

const safeText = (val, fallback = "—") => {
  if (val === null || val === undefined || val === "") return fallback;
  if (typeof val === "object") return val.name || val.title || val.description || fallback;
  return String(val);
};

export default function EmployeeProfilePage() {
  const { t } = useTranslation("employee");
  const { canDelete, canEdit } = usePagePerms("employees");
  const navigate = useNavigate();
  const { id } = useParams();

  const [employee, setEmployee] = useState(null);
  const [stats, setStats] = useState(null);
  const [isLoadingEmployee, setIsLoadingEmployee] = useState(true);
  const [copiedId, setCopiedId] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const showToast = (type, message) => {
    (appToast[type] || appToast.info)(message);
  };

  const fetchEmployeeData = async () => {
    try {
      setIsLoadingEmployee(true);
      const res = await fetch(apiUrl(`/employees/${id}`));
      if (res.ok) {
        const json = await res.json();
        setEmployee(json.employee || json);
        if (json.stats) {
          setStats(json.stats);
        }
      } else {
        showToast("error", t("toast.fetchError"));
      }
    } catch {
      showToast("error", t("toast.serverError", { ns: "common" }));
    } finally {
      setIsLoadingEmployee(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchEmployeeData();
    }
  }, [id]);

  const handleCopyCode = () => {
    if (employee?.employee_ID) {
      navigator.clipboard.writeText(employee.employee_ID);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleConfirmDelete = async (employeeId) => {
    try {
      const res = await fetch(apiUrl(`/employees/${employeeId}`), {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        navigate("/employees", {
          state: { toastMessage: t("toast.deleteSuccess", { name: employee?.full_name }) },
        });
      } else {
        const data = await res.json().catch(() => null);
        showToast("error", data?.message || t("toast.deleteServerError"));
      }
    } catch {
      showToast("error", t("toast.deleteConnectionError"));
    }
  };

  const handleConfirmToggleStatus = async (employeeId, newStatus) => {
    try {
      setIsToggling(true);
      const res = await fetch(apiUrl(`/employees/${employeeId}/status`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        showToast("success", t("toast.statusSuccess", { status: newStatus }));
        setShowStatusModal(false);
        setEmployee((prev) => (prev ? { ...prev, status: newStatus } : prev));
      } else {
        showToast("error", t("toast.statusError"));
      }
    } catch {
      showToast("error", t("toast.serverError", { ns: "common" }));
    } finally {
      setIsToggling(false);
    }
  };

  const isActive = isActiveStatus(employee?.status);

  return (
    <div className="w-full space-y-4 pb-20 font-sans" dir="rtl">
      <div className="flex items-center justify-between text-sm text-gray-600 font-bold">
        <nav aria-label="Breadcrumb" className="flex items-center space-x-2 space-x-reverse">
          <Link to="/" className="hover:text-slate-900 transition-colors flex items-center space-x-1 space-x-reverse">
            <Home size={15} />
            <span>{t("page.breadcrumbHome")}</span>
          </Link>
          <ChevronLeft size={15} className="text-gray-400" />
          <Link to="/employees" className="text-gray-600 hover:text-slate-900 transition-colors flex items-center space-x-1 space-x-reverse">
            <Users size={15} />
            <span>{t("page.breadcrumb")}</span>
          </Link>
          <ChevronLeft size={15} className="text-gray-400" />
          <span className="text-slate-900 font-bold bg-slate-100 px-2.5 py-0.5 rounded-badge border border-slate-200">
            {t("profile.breadcrumb")} ({safeText(employee?.full_name, t("profile.loading"))})
          </span>
        </nav>
      </div>
      <div className="bg-white border border-gray-200 rounded-card p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-2xs">
        <div className="flex items-center space-x-3 space-x-reverse">
          <div className="p-2 bg-slate-100 text-slate-800 border border-slate-200 rounded-btn">
            <User size={20} />
          </div>
          <div>
            <div className="flex items-center space-x-2.5 space-x-reverse">
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                {safeText(employee?.full_name, t("profile.title"))}
              </h1>
              {employee?.employee_ID && (
                <span
                  onClick={handleCopyCode}
                  className="font-mono text-xs font-bold text-slate-700 bg-gray-100 px-2.5 py-0.5 rounded-badge border border-gray-300 cursor-pointer hover:bg-gray-200 transition-colors flex items-center space-x-1 space-x-reverse"
                  dir="ltr"
                >
                  <span>{safeText(employee.employee_ID)}</span>
                  {copiedId ? <Check size={12} className="text-emerald-700" /> : <Copy size={12} />}
                </span>
              )}
              {employee?.status && (
                <span
                  className={`px-2.5 py-0.5 rounded-badge text-xs font-bold ${
                    isActive
                      ? "bg-emerald-800 text-white"
                      : "bg-rose-800 text-white"
                  }`}
                >
                  {safeText(employee.status)}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {t("profile.subtitle")}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <button
              type="button"
              onClick={() => navigate(`/employees/${id}/edit`)}
              className="flex items-center space-x-1.5 space-x-reverse bg-slate-800 hover:bg-slate-900 text-white font-bold px-3.5 py-2 rounded-btn transition-colors text-base cursor-pointer shadow-xs"
            >
              <Edit size={16} />
              <span>{t("profile.editButton")}</span>
            </button>
          )}
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center space-x-1.5 space-x-reverse bg-white hover:bg-gray-50 text-gray-700 font-bold px-3.5 py-2 rounded-btn border border-gray-300 transition-colors text-base cursor-pointer shadow-2xs"
          >
            <Printer size={16} />
            <span>{t("actions.print", { ns: "common" })}</span>
          </button>
          <button
            type="button"
            onClick={() =>
              navigate("/employees", {
                state: { selectedBranch: localStorage.getItem("jfc_selected_branch") || "all" },
              })
            }
            className="flex items-center space-x-1.5 space-x-reverse bg-white hover:bg-gray-50 text-gray-700 font-bold px-4 py-2 rounded-btn border border-gray-300 transition-colors text-base cursor-pointer shadow-2xs"
          >
            <ArrowRight size={16} />
            <span>{t("form.backToList")}</span>
          </button>
        </div>
      </div>

      {isLoadingEmployee ? (
        <div className="p-16 text-center text-gray-500 font-bold bg-white rounded-card border border-gray-200 flex flex-col items-center justify-center space-y-3 shadow-2xs">
          <div className="w-8 h-8 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
          <span className="text-base text-gray-600">{t("form.loading")}</span>
        </div>
      ) : !employee ? (
        <div className="p-16 text-center text-gray-500 font-bold bg-white rounded-card border border-gray-200 flex flex-col items-center justify-center space-y-3 shadow-2xs">
          <AlertCircle size={32} className="text-rose-600" />
          <p className="text-base font-bold text-gray-800">{t("errors.notFound")}</p>
          <button
            onClick={() => navigate("/employees")}
            className="text-base text-slate-800 hover:underline font-bold"
          >
            {t("form.backToList")}
          </button>
        </div>
      ) : (
        /* ==================== PROFILE BODY ==================== */
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* CARD 1: مشخصات فردی و هویتی */}
            <div className="bg-white rounded-card p-5 border border-gray-200 space-y-3.5 shadow-2xs">
              <div className="flex items-center space-x-2 space-x-reverse border-b border-gray-100 pb-2.5">
                <div className="w-7 h-7 rounded-btn bg-slate-100 text-slate-800 flex items-center justify-center font-bold">
                  <User size={16} />
                </div>
                <h3 className="text-base font-bold text-gray-900">{t("profile.personalHeading")}</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2 relative flex items-center">
                  <User size={16} className="text-gray-400 absolute right-3 pointer-events-none" />
                  <div className="w-full h-10 bg-gray-50 border border-gray-300 rounded-input pr-9 pl-3.5 text-base font-bold text-gray-900 flex items-center">
                    {safeText(employee.full_name)}
                  </div>
                </div>
                <div className="relative flex items-center">
                  <User size={16} className="text-gray-400 absolute right-3 pointer-events-none" />
                  <div className="w-full h-10 bg-gray-50 border border-gray-300 rounded-input pr-9 pl-3.5 text-base text-gray-800 flex items-center">
                    <span className="text-gray-400 text-xs ml-1">{t("profile.fatherNamePrefix")}</span>
                    <span className="font-bold">{safeText(employee.father_name)}</span>
                  </div>
                </div>
                <div className="relative flex items-center">
                  <CreditCard size={16} className="text-gray-400 absolute right-3 pointer-events-none" />
                  <div className="w-full h-10 bg-gray-50 border border-gray-300 rounded-input pr-9 pl-2.5 text-base text-gray-900 font-mono font-bold flex items-center justify-between" dir="ltr">
                    <span>{safeText(employee.employee_ID)}</span>
                    <span className="text-xs text-gray-500 bg-white px-1.5 py-0.5 rounded-badge border border-gray-200 font-sans leading-none">
                      {t("form.badgeSystem")}
                    </span>
                  </div>
                </div>
                <div className="relative flex items-center">
                  <Phone size={16} className="text-gray-400 absolute right-3 pointer-events-none" />
                  <div className="w-full h-10 bg-gray-50 border border-gray-300 rounded-input pr-9 pl-3.5 text-base text-gray-900 font-mono flex items-center" dir="ltr">
                    <span className="font-bold">{safeText(employee.phone, t("list.notRegistered"))}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 2: شغل، سازمان و معرف */}
            <div className="bg-white rounded-card p-5 border border-gray-200 space-y-3.5 shadow-2xs">
              <div className="flex items-center space-x-2 space-x-reverse border-b border-gray-100 pb-2.5">
                <div className="w-7 h-7 rounded-btn bg-slate-100 text-slate-800 flex items-center justify-center font-bold">
                  <Briefcase size={16} />
                </div>
                <h3 className="text-base font-bold text-gray-900">{t("form.sectionJob")}</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative flex items-center">
                  <Building2 size={16} className="text-gray-400 absolute right-3 pointer-events-none" />
                  <div className="w-full h-10 bg-gray-50 border border-gray-300 rounded-input pr-9 pl-3.5 text-base font-bold text-gray-900 flex items-center">
                    {safeText(employee.branch, t("list.notRegistered"))} {typeof employee.branch === "object" && employee.branch?.location ? `(${employee.branch.location})` : ""}
                  </div>
                </div>
                <div className="relative flex items-center">
                  <Briefcase size={16} className="text-gray-400 absolute right-3 pointer-events-none" />
                  <div className="w-full h-10 bg-gray-50 border border-gray-300 rounded-input pr-9 pl-3.5 text-base font-bold text-slate-800 flex items-center">
                    {safeText(employee.job_category || employee.jobCategory, t("list.defaultPosition"))}
                  </div>
                </div>
                <div className="sm:col-span-2 relative flex items-center">
                  <Briefcase size={16} className="text-gray-400 absolute right-3 pointer-events-none" />
                  <div className="w-full h-10 bg-gray-50 border border-gray-300 rounded-input pr-9 pl-3.5 text-base font-bold text-gray-900 flex items-center">
                    <span className="text-gray-400 text-xs ml-1.5 font-normal">{t("form.jobPosition")}:</span>
                    <span>{safeText(employee.position || employee.jobPosition, t("list.defaultPosition"))}</span>
                  </div>
                </div>
                <div className="sm:col-span-2 relative flex items-center">
                  <UserCheck size={16} className="text-gray-400 absolute right-3 pointer-events-none" />
                  <div className="w-full h-10 bg-gray-50 border border-gray-300 rounded-input pr-9 pl-3.5 text-base text-gray-800 flex items-center">
                    <span className="text-gray-400 text-xs ml-1.5 font-normal">{t("form.introducer")}:</span>
                    <span className="font-bold text-gray-800">
                      {safeText(employee.introduced_by, t("list.notRegistered"))}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 3: معاش، تاریخ شمولیت و وضعیت */}
            <div className="bg-white rounded-card p-5 border border-gray-200 space-y-3.5 shadow-2xs">
              <div className="flex items-center space-x-2 space-x-reverse border-b border-gray-100 pb-2.5">
                <div className="w-7 h-7 rounded-btn bg-slate-100 text-slate-800 flex items-center justify-center font-bold">
                  <CreditCard size={16} />
                </div>
                <h3 className="text-base font-bold text-gray-900">{t("form.sectionFinance")}</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative flex items-center">
                  <CreditCard size={16} className="text-gray-400 absolute right-3 pointer-events-none" />
                  <div className="w-full h-10 bg-gray-50 border border-gray-300 rounded-input pr-9 pl-12 text-base font-mono font-bold text-slate-900 flex items-center" dir="ltr">
                    <span>{Number(employee.salary || 0).toLocaleString("en-US")}</span>
                  </div>
                  <span className="absolute left-3 text-xs font-bold text-gray-500 font-sans pointer-events-none">
                    {t("company.currency", { ns: "common" })}
                  </span>
                </div>
                <div className="relative flex items-center">
                  <CreditCard size={16} className="text-gray-400 absolute right-3 pointer-events-none" />
                  <div className="w-full h-10 bg-gray-50 border border-gray-300 rounded-input pr-9 pl-14 text-base font-mono font-bold text-slate-900 flex items-center" dir="ltr">
                    <span>{Number(employee.hourly_rate || 50).toLocaleString("en-US")}</span>
                  </div>
                  <span className="absolute left-3 text-xs font-bold text-gray-500 font-sans pointer-events-none">
                    {t("form.hourlyUnit")}
                  </span>
                </div>
                <div className="relative flex items-center">
                  <Calendar size={16} className="text-gray-400 absolute right-3 pointer-events-none" />
                  <div className="w-full h-10 bg-gray-50 border border-gray-300 rounded-input pr-9 pl-3.5 text-base text-gray-900 font-mono font-bold flex items-center" dir="ltr">
                    <span>{safeText(employee.joining_date)}</span>
                  </div>
                </div>
                <div className="relative flex items-center">
                  <div className="w-full h-10 bg-gray-50 border border-gray-300 rounded-input px-3.5 text-base font-bold flex items-center justify-between">
                    <span className="text-gray-500 text-xs font-normal">{t("form.employeeStatus")}:</span>
                    <span className={isActive ? "text-emerald-800" : "text-rose-800"}>
                      {safeText(employee.status)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 4: سکونت و عکس پرسونل */}
            <div className="bg-white rounded-card p-5 border border-gray-200 space-y-3.5 shadow-2xs">
              <div className="flex items-center space-x-2 space-x-reverse border-b border-gray-100 pb-2.5">
                <div className="w-7 h-7 rounded-btn bg-slate-100 text-slate-800 flex items-center justify-center font-bold">
                  <MapPin size={16} />
                </div>
                <h3 className="text-base font-bold text-gray-900">{t("form.sectionLocationPhoto")}</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                <div className="text-center flex flex-col items-center">
                  <div className="w-24 h-24 rounded-input border-2 border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden">
                    {employee.photo ? (
                      <img
                        src={employee.photo}
                        alt={safeText(employee.full_name)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-700 text-white flex items-center justify-center text-3xl font-black">
                        {safeText(employee.full_name)?.charAt(0) || t("profile.initialFallback")}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 font-bold mt-1">
                    {t("form.photoLabel")}
                  </span>
                </div>
                <div className="sm:col-span-2 space-y-2.5">
                  <div className="relative flex items-center">
                    <MapPin size={16} className="text-gray-400 absolute right-3 pointer-events-none" />
                    <div className="w-full h-10 bg-gray-50 border border-gray-300 rounded-input pr-9 pl-3.5 text-base text-gray-900 font-bold flex items-center">
                      <span className="text-gray-500 text-xs ml-1 font-normal">{t("form.province")}:</span>
                      <span>{safeText(employee.province, t("list.notRegistered"))}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 5: خلاصه کارکرد و حاضری ماه جاری */}
            <div className="sm:col-span-2 bg-white rounded-card p-5 border border-gray-200 space-y-3.5 shadow-2xs">
              <div className="flex items-center space-x-2 space-x-reverse border-b border-gray-100 pb-2.5">
                <div className="w-7 h-7 rounded-btn bg-slate-100 text-slate-800 flex items-center justify-center font-bold">
                  <Clock size={16} />
                </div>
                <h3 className="text-base font-bold text-gray-900">{t("page.subtitle")}</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-gray-50 border border-gray-200 rounded-input p-3.5 text-center shadow-2xs">
                  <span className="text-sm text-gray-700 font-bold block mb-1">{t("profile.statPresent")}</span>
                  <span className="text-xl font-bold text-slate-900 font-mono">
                    {stats?.present_days ?? 0}{" "}
                    <span className="text-sm font-normal">{t("profile.unitDay")}</span>
                  </span>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-input p-3.5 text-center shadow-2xs">
                  <span className="text-sm text-gray-700 font-bold block mb-1">{t("profile.statAbsent")}</span>
                  <span className="text-xl font-bold text-rose-800 font-mono">
                    {stats?.absent_days ?? 0}{" "}
                    <span className="text-sm font-normal">{t("profile.unitDay")}</span>
                  </span>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-input p-3.5 text-center shadow-2xs">
                  <span className="text-sm text-gray-700 font-bold block mb-1">{t("profile.statOvertime")}</span>
                  <span className="text-xl font-bold text-slate-900 font-mono">
                    {stats?.total_overtime_hours ?? 0}{" "}
                    <span className="text-sm font-normal">{t("profile.unitHour")}</span>
                  </span>
                </div>
              </div>
            </div>

          </div>

          <div className="bg-white rounded-card p-4 border border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-3 print:hidden shadow-2xs">
            <button
              type="button"
              onClick={() =>
                navigate("/employees", {
                  state: { selectedBranch: localStorage.getItem("jfc_selected_branch") || "all" },
                })
              }
              className="w-full sm:w-auto px-5 py-2 text-base font-bold text-gray-700 hover:bg-gray-100 rounded-btn transition-colors cursor-pointer border border-gray-300 bg-white shadow-2xs"
            >
              {t("form.backToList")}
            </button>
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => setShowStatusModal(true)}
                className={`w-full sm:w-auto flex items-center justify-center space-x-1.5 space-x-reverse font-bold py-2 px-4 rounded-btn transition-colors text-base cursor-pointer border shadow-xs ${
                  isActive
                    ? "bg-amber-800 hover:bg-amber-900 text-white border-amber-800"
                    : "bg-emerald-800 hover:bg-emerald-900 text-white border-emerald-800"
                }`}
              >
                {isActive ? <UserMinus size={16} /> : <UserCheck size={16} />}
                <span>{isActive ? t("statusModal.deactivate") : t("statusModal.activate")}</span>
              </button>
              {canDelete && (
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="w-full sm:w-auto flex items-center justify-center space-x-1.5 space-x-reverse bg-rose-800 hover:bg-rose-900 text-white font-bold py-2 px-4 rounded-btn transition-colors text-base cursor-pointer shadow-xs"
                >
                  <Trash2 size={16} />
                  <span>{t("profile.deleteButton")}</span>
                </button>
              )}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => navigate(`/employees/${id}/edit`)}
                  className="w-full sm:w-auto flex items-center justify-center space-x-1.5 space-x-reverse bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 px-7 rounded-btn transition-colors text-base cursor-pointer shadow-xs"
                >
                  <Edit size={16} />
                  <span>{t("profile.editButton")}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <EmployeeStatusModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        employee={employee}
        onConfirm={handleConfirmToggleStatus}
        isToggling={isToggling}
      />
      <EmployeeDeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        employee={employee}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
