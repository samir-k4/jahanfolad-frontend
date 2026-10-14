import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, LogOut, Monitor } from "lucide-react";
import { apiFetch } from "../../api";
import { showToast } from "../../utils/toast";
import { formatAfghanDateTime } from "../../utils/dateHelpers";
export default function ActiveSessionsPanel() {
  const { t } = useTranslation("common");
  const [sessions, setSessions] = useState([]);
  const [maxSessions, setMaxSessions] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch("/profile/sessions");
      setSessions(Array.isArray(data?.data) ? data.data : []);
      setMaxSessions(data?.max_sessions ?? null);
    } catch (err) {
      showToast.error(err?.message || t("sessions.loadFailed"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);
  useEffect(() => {
    load();
  }, [load]);
  const closeOthers = async () => {
    setIsClosing(true);
    try {
      const data = await apiFetch("/profile/logout-others", { method: "POST" });
      showToast.success(data?.message || t("sessions.closed"));
      load();
    } catch (err) {
      showToast.error(err?.message || t("sessions.closeFailed"));
    } finally {
      setIsClosing(false);
    }
  };
  const others = sessions.filter((row) => !row.is_current).length;
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-2xs p-5 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <Monitor size={15} className="text-gray-500" />
          {t("sessions.title")}
          {maxSessions ? (
            <span className="text-caption-text font-medium text-gray-400">
              {t("sessions.limit", { count: maxSessions })}
            </span>
          ) : null}
        </h2>
        {others > 0 && (
          <button
            type="button"
            onClick={closeOthers}
            disabled={isClosing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 rounded-btn text-btn-text font-bold cursor-pointer disabled:opacity-70"
          >
            {isClosing ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
            <span>{t("sessions.closeOthers")}</span>
          </button>
        )}
      </div>
      {isLoading ? (
        <p className="text-caption-text text-gray-500 font-medium">{t("sessions.loading")}</p>
      ) : sessions.length === 0 ? (
        <p className="text-caption-text text-gray-500 font-medium">{t("sessions.empty")}</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {sessions.map((row) => (
            <li key={row.id} className="py-2.5 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-table-cell-text font-bold text-gray-900 flex items-center gap-2">
                  <span dir="ltr">{row.device_name || t("sessions.unknownDevice")}</span>
                  {row.is_current && (
                    <span className="px-2 py-0.5 rounded-badge bg-emerald-50 border border-emerald-200 text-caption-text font-bold text-emerald-800">
                      {t("sessions.current")}
                    </span>
                  )}
                </p>
                <p className="text-caption-text text-gray-500 font-medium">
                  {t("sessions.lastUsed")}: {row.last_used_at ? formatAfghanDateTime(row.last_used_at) : "—"}
                </p>
              </div>
              <p className="text-caption-text text-gray-400 font-medium whitespace-nowrap">
                {t("sessions.signedIn")}: {row.created_at ? formatAfghanDateTime(row.created_at) : "—"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
