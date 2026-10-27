import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function ProductDetailsModal({ product, onClose }) {
  const { t } = useTranslation("products");

  if (!product) return null;

  const isActive = product.is_active !== false;
  const unit = product.category?.unit || "کارتن";
  const stockUnit =
    product.weight_type === "variable" ? "کیلوگرم" : unit;
  const details = [
    [t("details.name"), product.name],
    [t("details.category"), product.category?.name || "—"],
    [t("details.unit"), unit],
    [
      t("details.weightType"),
      t(`insertModal.weightTypes.${product.weight_type === "variable" ? "variable" : "fixed"}`),
    ],
    [
      t("insertModal.weightFieldLabel"),
      product.weight_type === "variable"
        ? t("insertModal.weightTypes.variable")
        : product.weight || "—",
    ],
    [
      t("details.lowStockThreshold"),
      `${product.low_stock_threshold ?? 10} ${stockUnit}`,
    ],
    [
      t("details.status"),
      isActive ? t("details.active") : t("details.inactive"),
    ],
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
      dir="rtl"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-details-title"
        className="w-full max-w-lg overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2
            id="product-details-title"
            className="text-base font-bold text-gray-900"
          >
            {t("details.title")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            aria-label={t("common:actions.close")}
            title={t("common:actions.close")}
          >
            <X size={18} />
          </button>
        </div>
        <dl className="divide-y divide-gray-100 px-5 py-2">
          {details.map(([label, value]) => (
            <div
              key={label}
              className="grid grid-cols-2 gap-3 py-3 text-sm"
            >
              <dt className="font-semibold text-gray-600">{label}</dt>
              <dd className="font-bold text-gray-900">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>,
    document.body,
  );
}
