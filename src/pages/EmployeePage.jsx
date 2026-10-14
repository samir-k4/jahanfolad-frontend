import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiUrl } from "../api";
import { useBranch } from "../context/BranchContext";
import showToast from "../utils/toast";
import {
  EmployeeHeader,
  EmployeeTable,
  EmployeeDeleteModal,
  EmployeeStatusModal,
  EmployeePrintModal,
} from "../components/employee";
import {
  EMPLOYEE_STATUS,
  HANGAR_CATEGORY_KEYWORD,
  isActiveStatus,
  isNailPosition,
  isPackagingPosition,
  isWirePosition,
} from "../constants/employeeDomain";
import { useTranslation } from "react-i18next";

const getEmployeePosition = (emp) => String(emp.job_position?.name || emp.position || "");

const getEmployeeCategory = (emp) => String(emp.job_category?.name || emp.job_category || "").trim();

const downloadFile = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export default function EmployeePage() {
  const { t } = useTranslation("employee");
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedBranch, setSelectedBranch, branches, branchName } = useBranch();
  const [isLoading, setIsLoading] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [isDownloadingForm, setIsDownloadingForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [employeeToToggleStatus, setEmployeeToToggleStatus] = useState(null);
  const toastMessageShownRef = useRef(null);

  useEffect(() => {
    if (location.state?.toastMessage && toastMessageShownRef.current !== location.state.toastMessage) {
      toastMessageShownRef.current = location.state.toastMessage;
      showToast.success(location.state.toastMessage);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  const fetchEmployees = useCallback(async (branchId) => {
    if (!branchId) return;
    setIsLoading(true);
    try {
      const url =
        branchId === "all"
          ? apiUrl("/employees?status=all")
          : apiUrl(`/employees?status=all&branch_id=${branchId}`);
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setEmployees(Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : []);
      } else {
        showToast.error(t("toast.fetchError"));
      }
    } catch {
      showToast.error(t("toast.serverError", { ns: "common" }));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees(selectedBranch || "all");
  }, [selectedBranch, fetchEmployees]);

  const activeBranchObj = useMemo(() => {
    const bId = selectedBranch || "all";
    return { name: branchName(bId) || t("filters.allBranches", { ns: "common" }) };
  }, [selectedBranch, branchName]);

  const stats = useMemo(() => {
    const total = employees.length;
    const active = employees.filter((e) => isActiveStatus(e.status)).length;
    const nailMachineCount = employees.filter((e) => isNailPosition(getEmployeePosition(e))).length;
    const wireCount = employees.filter((e) => isWirePosition(getEmployeePosition(e))).length;
    const packagingCount = employees.filter((e) => isPackagingPosition(getEmployeePosition(e))).length;
    const outsideHangarCount = employees.filter((e) => {
      const cat = getEmployeeCategory(e);
      return cat && !cat.includes(HANGAR_CATEGORY_KEYWORD);
    }).length;
    return { total, active, nailMachineCount, wireCount, packagingCount, outsideHangarCount };
  }, [employees]);

  const handleConfirmDelete = useCallback(async (employeeId) => {
    const target = employeeToDelete || employees.find((e) => e.id === employeeId);
    if (!target) return;
    setShowDeleteModal(false);
    setEmployeeToDelete(null);
    const prevEmployees = [...employees];
    setEmployees((prev) => prev.filter((e) => e.id !== target.id));
    const empName = target.full_name || t("list.paginationUnit");
    showToast.undo(t("toast.deleteSuccess", { name: empName }), {
      duration: 5000,
      description: t("toast.deleteUndoDesc"),
      actionLabel: t("deleteModal.cancelLabel"),
      onUndo: () => {
        setEmployees(prevEmployees);
        showToast.info(t("toast.deleteUndoSuccess", { name: empName }));
      },
      onConfirm: async () => {
        try {
          const res = await fetch(apiUrl(`/employees/${target.id}`), {
            method: "DELETE",
            headers: { Accept: "application/json" },
          });
          if (!res.ok) {
            const data = await res.json().catch(() => null);
            setEmployees(prevEmployees);
            showToast.error(data?.message || t("toast.deleteServerError"));
          }
        } catch {
          setEmployees(prevEmployees);
          showToast.error(t("toast.deleteConnectionError"));
        }
      },
    });
  }, [employeeToDelete, employees]);

  const handleConfirmToggleStatus = useCallback(async (employeeId, newStatus) => {
    try {
      setIsToggling(true);
      const res = await fetch(apiUrl(`/employees/${employeeId}/status`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        showToast.success(t("toast.statusSuccess", { status: newStatus }));
        setShowStatusModal(false);
        setEmployeeToToggleStatus(null);
        setEmployees((prev) => prev.map((e) => (e.id === employeeId ? { ...e, status: newStatus } : e)));
      } else {
        showToast.error(t("toast.statusError"));
      }
    } catch {
      showToast.error(t("toast.serverError", { ns: "common" }));
    } finally {
      setIsToggling(false);
    }
  }, []);

  const handleDirectDownloadBlankForm = useCallback(async () => {
    try {
      setIsDownloadingForm(true);
      showToast.info(t("toast.blankFormDownloading"));
      const branchParam = selectedBranch && selectedBranch !== "all" ? `?branch_id=${selectedBranch}` : "";
      const res = await fetch(apiUrl(`/employee-reports/blank-form-pdf${branchParam}`), {
        method: "GET",
        headers: { Accept: "application/pdf" },
      });
      if (!res.ok) throw new Error(t("toast.errorPdfCreate"));
      const blob = await res.blob();
      const bName = activeBranchObj?.name ? activeBranchObj.name.replace(/\s+/g, "_") : t("hangar.defaultHeadOffice");
      downloadFile(blob, t("printModal.blankFormFilename", { branchName: bName }));
      showToast.success(t("toast.blankFormSuccess"));
    } catch {
      showToast.error(t("toast.blankFormError"));
    } finally {
      setIsDownloadingForm(false);
    }
  }, [selectedBranch, activeBranchObj]);

  const activeBranchId = selectedBranch || "all";

  return (
    <div className="w-full space-y-4 font-sans" dir="rtl">
      <EmployeeHeader
        branches={branches}
        selectedBranch={activeBranchId}
        onBranchChange={setSelectedBranch}
        onOpenCreateModal={() => navigate("/employees/create")}
        onPrintList={() => setShowPrintModal(true)}
        onDownloadBlankForm={handleDirectDownloadBlankForm}
        isDownloadingForm={isDownloadingForm}
        stats={stats}
      />
      <EmployeeTable
        employees={employees}
        isLoading={isLoading}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        positionFilter={positionFilter}
        onPositionFilterChange={setPositionFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onViewProfile={(emp) => navigate(`/employees/${emp.id}`)}
        onEditEmployee={(emp) => navigate(`/employees/${emp.id}/edit`)}
        onToggleStatus={(emp) => {
          setEmployeeToToggleStatus(emp);
          setShowStatusModal(true);
        }}
        onDeleteEmployee={(emp) => {
          setEmployeeToDelete(emp);
          setShowDeleteModal(true);
        }}
      />
      <EmployeePrintModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        branches={branches}
        activeBranchId={selectedBranch}
      />
      <EmployeeStatusModal
        isOpen={showStatusModal}
        onClose={() => {
          setShowStatusModal(false);
          setEmployeeToToggleStatus(null);
        }}
        employee={employeeToToggleStatus}
        onConfirm={handleConfirmToggleStatus}
        isToggling={isToggling}
      />
      <EmployeeDeleteModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setEmployeeToDelete(null);
        }}
        employee={employeeToDelete}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
