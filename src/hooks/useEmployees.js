import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { apiUrl } from "../api";
import showToast from "../utils/toast";
export default function useEmployees() {
  const { t } = useTranslation("employee");
  const [categories, setCategories] = useState([]);
  const [positions, setPositions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const fetchJobCategories = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/categories/job_category?active_only=true"));
      if (!res.ok) throw new Error("Failed to fetch job categories");
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setCategories(list);
      return list;
    } catch (err) {
      console.error(err);
      showToast.error(t("errors.categories"));
      return [];
    }
  }, [t]);
  const fetchJobPositions = useCallback(async (categoryId = null) => {
    try {
      const url = categoryId
        ? apiUrl(`/categories/job_position?active_only=true&job_category_id=${categoryId}`)
        : apiUrl("/categories/job_position?active_only=true");
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch job positions");
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setPositions(list);
      return list;
    } catch (err) {
      console.error(err);
      showToast.error(t("errors.positions"));
      return [];
    }
  }, [t]);
  const fetchEmployee = useCallback(async (id) => {
    if (!id) return null;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl(`/employees/${id}`));
      if (!res.ok) throw new Error("Employee not found");
      const data = await res.json();
      const emp = data?.employee || data;
      return emp;
    } catch (err) {
      setError(err.message);
      console.error(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);
  const saveEmployee = useCallback(async (payload, id = null) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const url = id ? apiUrl(`/employees/${id}`) : apiUrl("/employees");
      const method = id ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const fieldErrors = data?.errors ? Object.values(data.errors).flat() : [];
        throw new Error(fieldErrors[0] || data?.message || "Failed to save employee");
      }
      return { success: true, data };
    } catch (err) {
      setError(err.message);
      return { success: false, message: err.message };
    } finally {
      setIsSubmitting(false);
    }
  }, []);
  useEffect(() => {
    fetchJobCategories();
    fetchJobPositions();
  }, [fetchJobCategories, fetchJobPositions]);
  return {
    categories,
    positions,
    isLoading,
    isSubmitting,
    error,
    fetchJobCategories,
    fetchJobPositions,
    fetchEmployee,
    saveEmployee,
  };
}
