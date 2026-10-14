import { useCallback, useEffect, useRef } from "react";
export const isAbortError = (err) => err?.name === "AbortError";
export default function useAbortController() {
  const controllerRef = useRef(null);
  useEffect(() => () => controllerRef.current?.abort(), []);
  return useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = new AbortController();
    return controllerRef.current.signal;
  }, []);
}
