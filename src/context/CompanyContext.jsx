import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiUrl } from "../api";

const DEFAULT_COMPANY_SETTINGS = {
  company_name: "شرکت تولیدی جهان فولاد",
  company_tagline: "تولیدکننده انواع میخ‌های صنعتی و سیم‌های ساختمانی با کیفیت برتر",
  company_about: "تولید و عرضه مستقیم انواع میخ‌های صنعتی، نجاری و سیم‌های ساختمانی و صنعتی با استانداردهای بین‌المللی",
  company_phone: "+93 799 000 111 / +93 700 222 333",
  company_email: "info@jahanfolad.af",
  company_address: "افغانستان، هرات، شهرک صنعتی فاز ۲، خیابان صنعت ۵",
  company_logo: null,
  company_logo_size: 80,
  default_currency: "AFN",
  print_voucher_footer: "سند فوق صرفاً با مهر و امضای مدیریت مالی و گیرنده وجه دارای اعتبار رسمی می‌باشد.",
};

const CompanyContext = createContext(null);

export function CompanyProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    try {
      const cached = localStorage.getItem("jfc_company_settings");
      if (cached) {
        return { ...DEFAULT_COMPANY_SETTINGS, ...JSON.parse(cached) };
      }
    } catch {
      // ignore
    }
    return DEFAULT_COMPANY_SETTINGS;
  });

  const [loading, setLoading] = useState(false);

  const syncSettingsToStateAndCache = (newSettings) => {
    setSettings((prev) => {
      const merged = { ...prev, ...newSettings };
      try {
        localStorage.setItem("jfc_company_settings", JSON.stringify(merged));
      } catch (e) {
        console.error("Failed to cache company settings:", e);
      }
      return merged;
    });
  };

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/settings/general"));
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          syncSettingsToStateAndCache(data.settings);
        }
      }
    } catch (err) {
      console.error("Error fetching general company settings:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Upload logo (supports File object or base64 string)
  const updateLogo = async (fileOrBase64) => {
    try {
      let res;
      if (fileOrBase64 instanceof File) {
        const formData = new FormData();
        formData.append("logo", fileOrBase64);
        res = await fetch(apiUrl("/settings/logo"), {
          method: "POST",
          body: formData,
        });
      } else if (typeof fileOrBase64 === "string") {
        res = await fetch(apiUrl("/settings/logo"), {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ logo_base64: fileOrBase64 }),
        });
      } else {
        throw new Error("نوع فایل لوگو نامعتبر است.");
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "خطا در بارگذاری لوگو");

      syncSettingsToStateAndCache({ company_logo: data.logo_url });
      return data;
    } catch (err) {
      console.error("Failed to update logo:", err);
      throw err;
    }
  };

  // Remove logo
  const removeLogo = async () => {
    try {
      const res = await fetch(apiUrl("/settings/logo"), {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "خطا در حذف لوگو");

      syncSettingsToStateAndCache({ company_logo: null });
      return data;
    } catch (err) {
      console.error("Failed to remove logo:", err);
      throw err;
    }
  };

  // Save logo size (px)
  const saveLogoSize = async (size) => {
    const numSize = Number(size) || 80;
    syncSettingsToStateAndCache({ company_logo_size: numSize });
    try {
      await fetch(apiUrl("/settings/general"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ settings: { company_logo_size: numSize } }),
      });
    } catch (err) {
      console.error("Failed to persist logo size:", err);
    }
  };

  return (
    <CompanyContext.Provider
      value={{
        settings,
        loading,
        fetchSettings,
        updateLogo,
        removeLogo,
        saveLogoSize,
        syncSettingsToStateAndCache,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error("useCompany must be used within a CompanyProvider");
  }
  return context;
}
