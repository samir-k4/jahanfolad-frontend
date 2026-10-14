import { useState, useCallback, useEffect } from "react";
import { apiUrl } from "../api";
export default function useExpenseTypes(autoFetch = true) {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fetchTypes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/categories/expense_type?active_only=1"));
      if (!res.ok) throw new Error("Failed to fetch expense types");
      const data = await res.json();
      const list = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
      setTypes(list);
      return list;
    } catch (err) {
      console.error("Error fetching expense types:", err);
      setError(err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (autoFetch) {
      fetchTypes();
    }
  }, [autoFetch, fetchTypes]);
  return { types, loading, error, refetch: fetchTypes };
}
