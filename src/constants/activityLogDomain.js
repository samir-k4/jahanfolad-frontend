// Colours for the event badge in the system-transactions log. The event keys
// are the ones in Back-End/config/activity_log.php.
export const EVENT_TONES = {
  created: "positive",
  paid: "positive",
  settled: "positive",
  updated: "accent",
  status_changed: "accent",
  transferred: "accent",
  exchanged: "accent",
  reopened: "notice",
  password_changed: "notice",
  password_reset: "notice",
  permissions_changed: "notice",
  deleted: "danger",
  cancelled: "danger",
  reversed: "danger",
  login_failed: "danger",
  locked: "danger",
  access_denied: "danger",
  login: "neutral",
  logout: "neutral",
  printed: "neutral",
  exported: "neutral",
};

export const TONE_CLASSES = {
  positive: "bg-positive-soft text-positive-text border-positive-line",
  accent: "bg-accent-subtle text-accent-strong border-accent-line",
  notice: "bg-notice-soft text-notice-text border-notice-line",
  danger: "bg-danger-soft text-danger-text border-danger-line",
  neutral: "bg-surface-subtle text-content-body border-line",
};

export const eventToneClass = (event) => TONE_CLASSES[EVENT_TONES[event] || "neutral"];

export const STATUS_TONES = {
  success: "positive",
  failed: "danger",
  denied: "notice",
};

export const DEFAULT_PER_PAGE = 25;
export const PER_PAGE_OPTIONS = [25, 50, 100];

export const formatAmount = (amount, currency) =>
  amount === null || amount === undefined
    ? null
    : `${Number(amount).toLocaleString("en-US")}${currency ? ` ${currency}` : ""}`;
