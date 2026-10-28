import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PER_PAGE_OPTIONS } from "../../constants/activityLogDomain";

const BUTTON =
  "h-8 px-3 inline-flex items-center gap-1 text-xs font-bold text-content-body bg-surface border border-line-strong rounded-btn transition-colors cursor-pointer hover:bg-surface-subtle disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-surface";

/**
 * Previous / next pager. The log API answers with "is there another page"
 * rather than a row count (counting a log that only grows is slow), so this
 * cannot show "page x of y" the way TablePagination does.
 */
export default function ActivityLogPager({ page, hasMore, perPage, onPageChange, onPerPageChange, disabled }) {
  const { t } = useTranslation("systemTransactions");
  const { t: tc } = useTranslation("common");

  return (
    <div
      className="p-3 border-t border-line bg-surface-muted flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-content-muted"
      dir="rtl"
    >
      <label className="flex items-center gap-2">
        <span className="font-medium">{tc("pagination.perPageLabel")}</span>
        <select
          value={perPage}
          onChange={(event) => onPerPageChange(Number(event.target.value))}
          className="h-8 px-2 bg-surface border border-line-strong rounded-input text-xs outline-none focus:border-accent cursor-pointer"
        >
          {PER_PAGE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className={BUTTON}
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronRight size={14} />
          {t("pager.previous")}
        </button>
        <span className="min-w-20 text-center font-bold text-content-body">{t("pager.page", { page })}</span>
        <button
          type="button"
          className={BUTTON}
          disabled={disabled || !hasMore}
          onClick={() => onPageChange(page + 1)}
        >
          {t("pager.next")}
          <ChevronLeft size={14} />
        </button>
      </div>
    </div>
  );
}
