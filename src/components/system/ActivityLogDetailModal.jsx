import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { apiFetch } from "../../api";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import { isAbortError } from "../../hooks/useAbortController";
import { formatAfghanDateTime, formatAfghanDisplay, toAfghanDate } from "../../utils/dateHelpers";
import { eventToneClass, STATUS_TONES, TONE_CLASSES } from "../../constants/activityLogDomain";

const BADGE = "inline-flex items-center px-2 py-0.5 rounded-badge border text-caption-text font-bold whitespace-nowrap";
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/;

export const ActivityStatusBadge = ({ status, t }) =>
  status && status !== "success" ? (
    <span className={`${BADGE} ${TONE_CLASSES[STATUS_TONES[status] || "neutral"]}`}>{t(`status.${status}`)}</span>
  ) : null;

// Dates are stored in the database's own format; show them the way the rest of the app does.
function readableDate(value) {
  if (DATE_ONLY.test(value)) return formatAfghanDisplay(toAfghanDate(value));
  if (DATE_TIME.test(value)) {
    const hasZone = /(Z|[+-]\d{2}:?\d{2})$/.test(value);
    return formatAfghanDateTime(new Date(value.replace(" ", "T") + (hasZone ? "" : "Z")));
  }
  return null;
}

function ValueCell({ value, t }) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-content-faint">{t("emptyValue")}</span>;
  }
  if (typeof value === "boolean") return t(value ? "detail.yes" : "detail.no");
  if (typeof value === "object") {
    return (
      <pre className="text-caption-text font-mono whitespace-pre-wrap break-all text-left" dir="ltr">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }
  const text = String(value);
  const date = readableDate(text);
  if (date) return <span dir="ltr" className="font-mono">{date}</span>;
  return <span className="break-words whitespace-pre-line">{text}</span>;
}

const SectionHeading = ({ children }) => (
  <div className="px-5 py-3 bg-surface-muted border-y border-line text-label-text text-content-body">{children}</div>
);

export default function ActivityLogDetailModal({ logId, onClose }) {
  const { t } = useTranslation("systemTransactions");
  const [state, setState] = useState({ loading: true, error: false, log: null, related: [] });
  useBodyScrollLock(Boolean(logId));

  useEffect(() => {
    if (!logId) return undefined;
    const controller = new AbortController();
    setState({ loading: true, error: false, log: null, related: [] });

    apiFetch(`/activity-logs/${logId}`, { signal: controller.signal })
      .then((body) => setState({ loading: false, error: false, log: body.data, related: body.related || [] }))
      .catch((err) => {
        if (!isAbortError(err)) setState({ loading: false, error: true, log: null, related: [] });
      });

    return () => controller.abort();
  }, [logId]);

  if (!logId) return null;

  const { loading, error, log, related } = state;
  const empty = t("emptyValue");
  const alsoChanged = log?.meta?.also_changed || [];

  // The description already says what was done, where, to which record and for how much,
  // so the summary only adds who, when and from where. Rows with nothing to show are left out.
  const rows = log
    ? [
        [t("detail.time"), <span key="time" dir="ltr" className="font-mono">{formatAfghanDateTime(log.occurred_at)}</span>],
        [
          t("detail.user"),
          <span key="user">
            {log.user_name || empty}
            {log.user_role && <span className="mr-2 text-caption-text text-content-subtle">({log.user_role})</span>}
          </span>,
        ],
        [
          t("detail.description"),
          <span key="description" className="flex flex-wrap items-center gap-1.5">
            <span className={`${BADGE} ${eventToneClass(log.event)}`}>{log.event_label}</span>
            <ActivityStatusBadge status={log.status} t={t} />
            <span>{log.description}</span>
          </span>,
        ],
        log.branch_name ? [t("detail.branch"), log.branch_name] : null,
        log.ip_address ? [t("detail.ip"), <span key="ip" dir="ltr" className="font-mono">{log.ip_address}</span>] : null,
      ].filter(Boolean)
    : [];

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-overlay/50 font-sans" dir="rtl">
      <div className="bg-surface rounded-modal shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-line">
        <div className="px-5 py-3.5 border-b border-line shrink-0">
          <h3 className="text-section-title font-bold text-content-strong">{t("detail.title")}</h3>
        </div>

        <div className="overflow-y-auto min-h-0">
          {loading && <p className="p-10 text-center text-content-subtle text-body-text">{t("detail.loading")}</p>}
          {error && <p className="p-10 text-center text-danger-text text-body-text">{t("detail.loadFailed")}</p>}

          {log && (
            <>
              <dl className="divide-y divide-line-soft">
                {rows.map(([label, value]) => (
                  <div key={label} className="flex flex-col gap-1 px-5 py-2.5 text-table-cell-text sm:grid sm:grid-cols-4 sm:gap-3">
                    <dt className="text-content-subtle font-medium">{label}</dt>
                    <dd className="sm:col-span-3 text-content break-words whitespace-normal">{value}</dd>
                  </div>
                ))}
              </dl>

              {log.changes?.length > 0 && (
                <>
                  <SectionHeading>{t("detail.changesTitle")}</SectionHeading>
                  <table className="w-full text-right border-collapse text-table-cell-text">
                    <thead>
                      <tr className="bg-surface-muted border-b border-line text-table-header-text text-content-body">
                        <th className="px-4 py-2 border-l border-line">{t("detail.field")}</th>
                        <th className="px-4 py-2 border-l border-line">{t("detail.before")}</th>
                        <th className="px-4 py-2">{t("detail.after")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line-soft">
                      {log.changes.map((change) => (
                        <tr key={change.field} className="align-top">
                          <td className="px-4 py-2 border-l border-line font-bold text-content-body whitespace-nowrap">
                            {change.label}
                          </td>
                          <td className="px-4 py-2 border-l border-line bg-danger-soft/40">
                            <ValueCell value={change.old} t={t} />
                          </td>
                          <td className="px-4 py-2 bg-positive-soft/50">
                            <ValueCell value={change.new} t={t} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              {related.length > 0 && (
                <>
                  <SectionHeading>{t("detail.relatedTitle")}</SectionHeading>
                  <ul className="divide-y divide-line-soft">
                    {related.map((row) => (
                      <li key={row.id} className="px-5 py-2.5 text-table-cell-text flex flex-wrap items-center gap-2">
                        <span className={`${BADGE} ${eventToneClass(row.event)}`}>{row.event_label}</span>
                        <span className="text-content">{row.description}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {alsoChanged.length > 0 && (
                <>
                  <SectionHeading>{t("detail.alsoChangedTitle")}</SectionHeading>
                  <ul className="divide-y divide-line-soft">
                    {alsoChanged.map((item) => (
                      <li key={`${item.type}-${item.id}-${item.event}`} className="px-5 py-2.5 text-table-cell-text flex flex-wrap items-center gap-2">
                        <span className={`${BADGE} ${eventToneClass(item.event)}`}>{item.event_label || item.event}</span>
                        <span className="text-content-subtle">{item.type_label}</span>
                        <span className="text-content">{item.label}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </div>

        <div className="px-5 py-3 border-t border-line bg-surface-muted shrink-0 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 text-btn-text font-bold text-content-body bg-surface border border-line-strong rounded-btn hover:bg-surface-subtle cursor-pointer"
          >
            {t("actions.close")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
