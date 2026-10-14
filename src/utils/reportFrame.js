import { useEffect, useState } from "react";

export const REPORT_FRAME_MIN_HEIGHT = 793.7;

export const printReportFrame = (iframe) => {
  iframe?.contentWindow?.postMessage("print", "*");
};

export const useReportFrameHeight = (iframeRef, minHeight = REPORT_FRAME_MIN_HEIGHT, offset = 8) => {
  const [height, setHeight] = useState(minHeight);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.type !== "report-height") return;
      const measured = Number(event.data.height);
      if (Number.isFinite(measured) && measured > 0) {
        setHeight(Math.max(minHeight, measured + offset));
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [iframeRef, minHeight, offset]);

  return [height, setHeight];
};
