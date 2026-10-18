import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiList } from "../api";
import { useAuth } from "./AuthContext";
const BranchContext = createContext();
const BRANCHES_QUERY_KEY = ["branches"];
const loadBranches = () => apiList("/branches");
export function BranchProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const {
    data: cachedBranches = [],
    isLoading: isLoadingBranches,
    error,
    refetch,
  } = useQuery({
    queryKey: BRANCHES_QUERY_KEY,
    queryFn: loadBranches,
    enabled: isAuthenticated,
  });
  const branches = isAuthenticated ? cachedBranches : [];
  const [pickedBranch, setPickedBranchState] = useState(() => {
    try {
      return localStorage.getItem("jfc_selected_branch") || "";
    } catch {
      return "";
    }
  });
  useEffect(() => {
    if (!isAuthenticated) {
      queryClient.removeQueries({ queryKey: BRANCHES_QUERY_KEY });
    }
  }, [isAuthenticated, queryClient]);
  useEffect(() => {
    if (error) {
      console.error(error);
    }
  }, [error]);
  const refreshBranches = useCallback(async () => {
    const result = await refetch();
    return result.data || [];
  }, [refetch]);
  const ensureBranches = useCallback(
    () =>
      queryClient.ensureQueryData({
        queryKey: BRANCHES_QUERY_KEY,
        queryFn: loadBranches,
        staleTime: 60_000,
      }),
    [queryClient],
  );
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
  useEffect(() => {
    if (
      pickedBranch &&
      branches.length > 0 &&
      !branches.some((branch) => String(branch.id) === pickedBranch)
    ) {
      setPickedBranch("");
    }
  }, [branches, pickedBranch, setPickedBranch]);
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
      refreshBranches,
      ensureBranches,
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
      refreshBranches,
      ensureBranches,
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
