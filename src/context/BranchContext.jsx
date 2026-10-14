import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiList } from "../api";
import { useAuth } from "./AuthContext";
const BranchContext = createContext();
export function BranchProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [branches, setBranches] = useState([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [pickedBranch, setPickedBranchState] = useState(() => {
    try {
      return localStorage.getItem("jfc_selected_branch") || "";
    } catch {
      return "";
    }
  });
  const fetchBranches = useCallback(async () => {
    try {
      setIsLoadingBranches(true);
      const data = await apiList("/branches");
      setBranches(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingBranches(false);
    }
  }, []);
  useEffect(() => {
    if (isAuthenticated) {
      fetchBranches();
    } else {
      setBranches([]);
    }
  }, [isAuthenticated, fetchBranches]);
  const isMultiBranch = branches.length > 1;
  const singleBranchId = branches.length === 1 ? String(branches[0].id) : "";
  const setPickedBranch = useCallback((branchId) => {
    const val = branchId || "";
    setPickedBranchState(val);
    try {
      if (val) {
        localStorage.setItem("jfc_selected_branch", val);
      } else {
        localStorage.removeItem("jfc_selected_branch");
      }
    } catch (e) {
      console.error(e);
    }
  }, []);
  const selectedBranch = isMultiBranch ? pickedBranch : singleBranchId;
  const setSelectedBranch = useCallback(
    (branchId) => {
      if (!isMultiBranch) return;
      setPickedBranch(branchId);
    },
    [isMultiBranch, setPickedBranch],
  );
  const onSwitchBranch = useCallback(() => {
    if (!isMultiBranch) return;
    setPickedBranch("");
  }, [isMultiBranch, setPickedBranch]);
  const branchName = useCallback(
    (branchId) => {
      if (!branchId || branchId === "all") return "";
      return branches.find((b) => String(b.id) === String(branchId))?.name || "";
    },
    [branches],
  );
  const needsBranchGate = isMultiBranch && !pickedBranch;
  const value = useMemo(
    () => ({
      branches,
      isLoadingBranches,
      isMultiBranch,
      singleBranchId,
      selectedBranch,
      setSelectedBranch,
      onSwitchBranch,
      branchName,
      needsBranchGate,
      refreshBranches: fetchBranches,
    }),
    [
      branches,
      isLoadingBranches,
      isMultiBranch,
      singleBranchId,
      selectedBranch,
      setSelectedBranch,
      onSwitchBranch,
      branchName,
      needsBranchGate,
      fetchBranches,
    ],
  );
  return (
    <BranchContext.Provider value={value}>{children}</BranchContext.Provider>
  );
}
export function useBranch() {
  const context = useContext(BranchContext);
  if (!context) {
    throw new Error("useBranch must be used within a BranchProvider");
  }
  return context;
}
