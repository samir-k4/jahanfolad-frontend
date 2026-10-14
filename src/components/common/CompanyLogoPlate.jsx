import React from "react";
import { useCompany } from "../../context/CompanyContext";
import { apiUrl } from "../../api";

/**
 * An uploaded logo is stored as a direct URL into the backend's public folder,
 * which is served without CORS headers. Because the <img> below is marked
 * crossOrigin (so it stays usable on a canvas for client-side PDFs), loading
 * that URL fails and the placeholder takes over. The API exposes the same file
 * with Access-Control-Allow-Origin, so route every file-backed logo through it.
 * The stored filename carries an upload timestamp and doubles as a cache key.
 */
function resolveLogoSrc(logo) {
  if (!logo) return null;
  if (typeof logo !== "string") return logo;
  if (logo.startsWith("data:")) return logo;

  const fileName = logo.split("/").pop() || "";
  return `${apiUrl("/settings/logo-image")}?v=${encodeURIComponent(fileName)}`;
}

/**
 * CompanyLogoPlate
 * Standard logo plate component for Reports, Vouchers, Invoices, and Modals.
 * - If custom logo is uploaded: displays the image cleanly with proper scaling.
 * - If no logo uploaded: displays the professional dark & golden emblem placeholder.
 * - Dynamically inherits company_logo_size from System Settings if height/width props are omitted!
 */
export default function CompanyLogoPlate({
  logo,
  companyName = "شرکت تولیدی جهان فولاد",
  height,
  width,
  className = "",
  style = {},
}) {
  let globalSettings = null;
  try {
    const companyContext = useCompany();
    globalSettings = companyContext?.settings;
  } catch {
    // If rendered outside CompanyProvider, fallback cleanly
  }

  // Fallback to dynamic system setting (company_logo_size) or default to 80px
  const configuredSize = Number(globalSettings?.company_logo_size) || 80;
  const effectiveHeight = height !== undefined && height !== null ? height : configuredSize;
  const effectiveWidth = width !== undefined && width !== null ? width : configuredSize;
  const isCompact = effectiveHeight < 60;

  const logoSrc = resolveLogoSrc(logo);

  if (logoSrc) {
    return (
      <div
        className={`inline-flex items-center justify-center ${className}`}
        style={{
          width: `${effectiveWidth}px`,
          height: `${effectiveHeight}px`,
          minWidth: `${effectiveWidth}px`,
          minHeight: `${effectiveHeight}px`,
          maxWidth: "100%",
          ...style,
        }}
        dir="ltr"
      >
        <img
          src={logoSrc}
          crossOrigin="anonymous"
          alt={companyName || "لوگوی شرکت"}
          style={{
            width: `${effectiveWidth}px`,
            height: `${effectiveHeight}px`,
            minWidth: `${effectiveWidth}px`,
            minHeight: `${effectiveHeight}px`,
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
            display: "block",
          }}
          onError={(e) => {
            e.currentTarget.style.display = "none";
            const fallback = e.currentTarget.nextElementSibling;
            if (fallback) fallback.style.display = "flex";
          }}
        />
        <div
          style={{
            display: "none",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: `${effectiveWidth}px`,
            height: `${effectiveHeight}px`,
            minWidth: `${effectiveWidth}px`,
            minHeight: `${effectiveHeight}px`,
            background: "#0f172a",
            color: "#fff",
            padding: isCompact ? "4px 8px" : "12px",
            borderRadius: isCompact ? "4px" : "8px",
            border: "1.5px solid #334155",
            boxSizing: "border-box",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: isCompact ? "20px" : "40px",
              height: isCompact ? "20px" : "40px",
              background: "#f59e0b",
              borderRadius: isCompact ? "3px" : "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "900",
              fontSize: isCompact ? "11px" : "18px",
              color: "#000",
              marginBottom: isCompact ? "0" : "6px",
            }}
          >
            JF
          </div>
          <span
            style={{
              fontSize: isCompact ? "11px" : "13px",
              fontWeight: "900",
              letterSpacing: "0.5px",
              color: "#f8fafc",
            }}
          >
            {companyName?.toUpperCase() || "JAHAN FOLAD"}
          </span>
        </div>
      </div>
    );
  }

  // Fallback Placeholder Plate (Dark Emblem with Golden Badge)
  if (isCompact) {
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          background: "#0f172a",
          color: "#fff",
          padding: "5px 10px",
          borderRadius: "4px",
          border: "1.5px solid #334155",
          ...style,
        }}
        className={className}
        dir="ltr"
      >
        <div
          style={{
            width: "20px",
            height: "20px",
            background: "#f59e0b",
            borderRadius: "3px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "900",
            fontSize: "11px",
            color: "#000",
          }}
        >
          JF
        </div>
        <span
          style={{
            fontSize: "11px",
            fontWeight: "900",
            letterSpacing: "0.5px",
            color: "#f8fafc",
          }}
        >
          {companyName?.toUpperCase() || "JAHAN FOLAD"}
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: `${effectiveWidth}px`,
        height: `${effectiveHeight}px`,
        minWidth: `${effectiveWidth}px`,
        minHeight: `${effectiveHeight}px`,
        background: "#0f172a",
        color: "#fff",
        padding: "10px",
        borderRadius: "8px",
        border: "1.5px solid #334155",
        boxSizing: "border-box",
        textAlign: "center",
        ...style,
      }}
      className={className}
      dir="ltr"
    >
      <div
        style={{
          width: effectiveHeight >= 120 ? "54px" : "36px",
          height: effectiveHeight >= 120 ? "54px" : "36px",
          background: "#f59e0b",
          borderRadius: "6px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: "900",
          fontSize: effectiveHeight >= 120 ? "22px" : "15px",
          color: "#000",
          marginBottom: "6px",
        }}
      >
        JF
      </div>
      <span
        style={{
          fontSize: effectiveHeight >= 120 ? "13px" : "11px",
          fontWeight: "900",
          letterSpacing: "0.5px",
          color: "#f8fafc",
        }}
      >
        {companyName?.toUpperCase() || "JAHAN FOLAD"}
      </span>
    </div>
  );
}

/**
 * Generates raw HTML string for iframe printing and downloadable PDFs
 */
export function getCompanyLogoHtml(logo, companyName = "شرکت تولیدی جهان فولاد", height = 80, width = 80) {
  if (logo) {
    return `<div style="display:inline-flex;align-items:center;justify-content:center;width:${width}px;height:${height}px;min-width:${width}px;min-height:${height}px;text-align:left;" dir="ltr">
      <img src="${logo}" alt="${companyName || 'Logo'}" style="width:${width}px;height:${height}px;min-width:${width}px;min-height:${height}px;object-fit:contain;display:block;" />
    </div>`;
  }

  return `<div style="display:inline-flex;flex-direction:column;align-items:center;justify-content:center;width:${width}px;height:${height}px;min-width:${width}px;min-height:${height}px;background:#0f172a;color:#fff;border-radius:8px;border:2px solid #334155;padding:10px;box-sizing:border-box;text-align:center;" dir="ltr">
    <div style="width:36px;height:36px;background:#f59e0b;border-radius:6px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:15px;color:#000;margin-bottom:6px;">JF</div>
    <span style="font-size:12px;font-weight:900;letter-spacing:0.5px;color:#f8fafc;">${companyName?.toUpperCase() || 'JAHAN FOLAD'}</span>
  </div>`;
}
