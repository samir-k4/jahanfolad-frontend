import { useState, useCallback, useEffect } from "react";
import { apiUrl } from "../api";

export default function useVaults(autoFetch = true) {
  const [vaults, setVaults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchVaults = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/vaults"));
      if (!res.ok) throw new Error("Failed to fetch vaults");
      const data = await res.json();
      const list = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
      setVaults(list);
      return list;
    } catch (err) {
      console.error("Error fetching vaults:", err);
      setError(err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchVaults();
    }
  }, [autoFetch, fetchVaults]);

  return { vaults, setVaults, loading, error, refetch: fetchVaults };
}
