import { useState, useCallback, useEffect } from "react";
import { apiUrl } from "../api";
export default function useExpenseCategories(autoFetch = true) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/categories/expense_category?active_only=1"));
      if (!res.ok) throw new Error("Failed to fetch expense categories");
      const data = await res.json();
      const list = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
      setCategories(list);
      return list;
    } catch (err) {
      console.error("Error fetching expense categories:", err);
      setError(err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (autoFetch) {
      fetchCategories();
    }
  }, [autoFetch, fetchCategories]);
  return { categories, setCategories, loading, error, refetch: fetchCategories };
}
