import { ClipboardList, Plus, Search } from "lucide-react";

export default function EmptyModulePage({
  eyebrow,
  title,
  description,
  icon: Icon = ClipboardList,
  actionLabel,
}) {
  return (
    <section className="w-full space-y-4 font-sans" dir="rtl">
      <header className="flex flex-col gap-4 border-b border-line pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-content">{title}</h1>
          <p className="mt-1 text-xs font-medium text-content-subtle">
            {eyebrow} — {description}
          </p>
        </div>
        {actionLabel && (
          <button
            type="button"
            disabled
            className="inline-flex cursor-not-allowed items-center justify-center gap-1.5 rounded-btn border border-line bg-surface-muted px-4 py-2 text-btn-text font-bold text-content-faint"
            title="این بخش به‌زودی فعال می‌شود"
          >
            <Plus size={17} />
            {actionLabel}
          </button>
        )}
      </header>

      <div className="overflow-hidden rounded-table border border-line bg-surface shadow-2xs">
        <div className="flex flex-col items-stretch justify-between gap-3 border-b border-line bg-surface-muted p-3.5 md:flex-row md:items-center">
          <div>
            <h2 className="text-sm font-bold text-content-body">فهرست اطلاعات</h2>
            <p className="mt-1 text-xs text-content-subtle">هنوز اطلاعاتی ثبت نشده است</p>
          </div>
          <div className="relative w-full md:max-w-xs">
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-content-faint" />
            <input
              type="search"
              disabled
              placeholder="جستجو..."
              className="h-10 w-full cursor-not-allowed rounded-input border border-line-strong bg-surface px-3 pr-9 text-xs text-content outline-none placeholder:text-content-faint"
            />
          </div>
        </div>
        <div className="m-3.5 flex min-h-[260px] flex-col items-center justify-center rounded-input border border-dashed border-line bg-surface-muted px-6 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface text-content-faint shadow-2xs ring-1 ring-line">
            <Icon size={29} strokeWidth={1.6} />
          </div>
          <h3 className="text-base font-bold text-content-body">اطلاعاتی برای نمایش وجود ندارد</h3>
          <p className="mt-2 max-w-md text-xs leading-6 text-content-subtle">
            این صفحه برای مدیریت {title} آماده شده است. پس از فعال‌شدن ثبت اطلاعات، موارد ثبت‌شده در این بخش نمایش داده می‌شوند.
          </p>
        </div>
      </div>
    </section>
  );
}
