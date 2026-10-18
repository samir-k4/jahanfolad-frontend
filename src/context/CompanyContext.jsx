import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiUrl } from "../api";
import { useAuth } from "./AuthContext";

const DEFAULT_COMPANY_SETTINGS = {
  company_name: "شرکت تولیدی جهان فولاد",
  company_tagline: "تولیدکننده انواع میخ‌های صنعتی و سیم‌های ساختمانی با کیفیت برتر",
  company_about: "تولید و عرضه مستقیم انواع میخ‌های صنعتی، نجاری و سیم‌های ساختمانی و صنعتی با استانداردهای بین‌المللی",
  company_phone: "+93 799 000 111 / +93 700 222 333",
  company_email: "info@jahanfolad.af",
  company_address: "افغانستان، هرات، شهرک صنعتی فاز ۲، خیابان صنعت ۵",
  company_website: "www.jahanfolad.af",
  company_logo: null,
  company_logo_size: 80,
  default_currency: "AFN",
  print_voucher_footer: "سند فوق صرفاً با مهر و امضای مدیریت مالی و گیرنده وجه دارای اعتبار رسمی می‌باشد.",
};

const CompanyContext = createContext(null);
const COMPANY_SETTINGS_QUERY_KEY = ["company-settings"];

function readCachedSettings() {
  try {
    const cached = localStorage.getItem("jfc_company_settings");
    if (!cached) return undefined;

    const cachedSettings = JSON.parse(cached);
    if (
      !cachedSettings ||
      typeof cachedSettings !== "object" ||
      Array.isArray(cachedSettings)
    ) {
      return undefined;
    }

    if ("company_logo_base64" in cachedSettings) {
      delete cachedSettings.company_logo_base64;
      localStorage.setItem("jfc_company_settings", JSON.stringify(cachedSettings));
    }

    return cachedSettings;
  } catch (err) {
    console.error("Failed to read cached company settings:", err);
    return undefined;
  }
}

export function CompanyProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [cachedSettings] = useState(readCachedSettings);
  const settingsQuery = useQuery({
    queryKey: COMPANY_SETTINGS_QUERY_KEY,
    queryFn: async () => {
      const data = await fetch(apiUrl("/settings/general")).then((response) => {
        if (!response.ok) {
          throw new Error(`Company settings request failed (${response.status}).`);
        }
        return response.json();
      });
      if (!data?.settings || typeof data.settings !== "object" || Array.isArray(data.settings)) {
        throw new Error("Company settings response has an invalid format.");
      }
      return data.settings;
    },
    enabled: isAuthenticated,
    initialData: cachedSettings,
    initialDataUpdatedAt: 0,
    staleTime: 5 * 60_000,
  });
  const settings = {
    ...DEFAULT_COMPANY_SETTINGS,
    ...(settingsQuery.data || cachedSettings || {}),
  };
  const loading = settingsQuery.isFetching;
  const settingsLoaded = settingsQuery.isFetched;

  useEffect(() => {
    if (settingsQuery.error) {
      console.error("Error fetching general company settings:", settingsQuery.error);
    }
  }, [settingsQuery.error]);
  useEffect(() => {
    if (!settingsQuery.isFetched || !settingsQuery.data) return;
    try {
      localStorage.setItem(
        "jfc_company_settings",
        JSON.stringify({ ...DEFAULT_COMPANY_SETTINGS, ...settingsQuery.data }),
      );
    } catch (err) {
      console.error("Failed to cache company settings:", err);
    }
  }, [settingsQuery.data, settingsQuery.isFetched]);

  const syncSettingsToStateAndCache = useCallback(
    (newSettings) => {
      const merged = {
        ...DEFAULT_COMPANY_SETTINGS,
        ...(queryClient.getQueryData(COMPANY_SETTINGS_QUERY_KEY) || cachedSettings || {}),
        ...newSettings,
      };
      queryClient.setQueryData(COMPANY_SETTINGS_QUERY_KEY, merged);
      try {
        localStorage.setItem("jfc_company_settings", JSON.stringify(merged));
      } catch (err) {
        console.error("Failed to cache company settings:", err);
      }
      return merged;
    },
    [cachedSettings, queryClient],
  );

  const fetchSettings = useCallback(async () => {
    const result = await settingsQuery.refetch();
    if (result.error) {
      console.error("Error fetching general company settings:", result.error);
    }
  }, [settingsQuery.refetch]);

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
        settingsLoaded,
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
