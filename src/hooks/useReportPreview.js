import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetchBlob, apiFetchText } from "../api";
import { printReportFrame } from "../utils/reportFrame";
const EMPTY_HEADERS = Object.freeze({});
export default function useReportPreview({
  isOpen,
  htmlPath,
  pdfPath,
  buildPayload,
  fallbackFilename,
  onError,
  method = "POST",
  headers = EMPTY_HEADERS,
}) {
  const [reportHtml, setReportHtml] = useState("");
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const iframeRef = useRef(null);
  const requestIdRef = useRef(0);
  const requestInit = useCallback(
    () => ({
      method,
      ...(method === "GET" ? {} : { body: buildPayload() }),
      headers,
      includeSelectedBranch: false,
    }),
    [method, buildPayload, headers]
  );
  const fetchReportHtml = useCallback(async () => {
    if (!isOpen) return;
    const requestId = ++requestIdRef.current;
    setIsLoadingPreview(true);
    try {
      const html = await apiFetchText(htmlPath, requestInit());
      if (requestIdRef.current === requestId) setReportHtml(html);
    } catch (err) {
      if (requestIdRef.current === requestId) {
        setReportHtml("");
        onError?.(err);
      }
    } finally {
      if (requestIdRef.current === requestId) setIsLoadingPreview(false);
    }
  }, [isOpen, htmlPath, requestInit, onError]);
  useEffect(() => {
    if (isOpen) {
      fetchReportHtml();
    } else {
      requestIdRef.current += 1;
      setReportHtml("");
      setIsLoadingPreview(false);
    }
  }, [isOpen, fetchReportHtml]);
  const print = useCallback(() => {
    printReportFrame(iframeRef.current);
  }, []);
  const downloadPdf = useCallback(async () => {
    setIsDownloading(true);
    let objectUrl;
    try {
      const { blob, filename } = await apiFetchBlob(pdfPath, requestInit());
      objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename || fallbackFilename();
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      onError?.(err);
    } finally {
      if (objectUrl) window.URL.revokeObjectURL(objectUrl);
      setIsDownloading(false);
    }
  }, [pdfPath, requestInit, fallbackFilename, onError]);
  return {
    iframeRef,
    reportHtml,
    isLoadingPreview,
    isDownloading,
    fetchReportHtml,
    print,
    downloadPdf,
  };
}
