import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Edit, Edit2, Eye, Search, Trash2 } from "lucide-react";
import {
  ProductCategoryFormModal,
  ProductDetailsModal,
  ProductFormModal,
} from "../components/products";
import TooltipButton from "../components/common/TooltipButton";
import { formatProductName } from "../utils/productFormat";
import { showToast } from "../utils/toast";
import { getCleanErrorMessage } from "../utils/errorHandler";
import { apiFetch, apiList } from "../api";
import { useAuth } from "../context/AuthContext";
import useDebounce from "../hooks/useDebounce";
const includes = (value, term) =>
  String(value ?? "").toLowerCase().includes(term);
export default function ProductsList() {
  const { t } = useTranslation("products");
  const { can } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [formMode, setFormMode] = useState(null);
  const [editProduct, setEditProduct] = useState(null);
  const [editCategory, setEditCategory] = useState(null);
  const [detailsProduct, setDetailsProduct] = useState(null);
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [productsData, categoriesData] = await Promise.all([
        apiList("/products?include_inactive=true"),
        apiList("/product-categories"),
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (err) {
      setError(t("messages.fetchProductsError"));
      showToast.error(t("messages.fetchProductsError"));
    } finally {
      setLoading(false);
    }
  }, [t]);
  useEffect(() => {
    loadData();
  }, [loadData]);
  const closeForm = () => {
    setFormMode(null);
    setEditProduct(null);
  };
  const handleSaved = () => {
    closeForm();
    loadData();
  };
  const handleCategorySaved = () => {
    setEditCategory(null);
    loadData();
  };
  const handleToggleActive = async (product) => {
    const isActive = product.is_active !== false;
    const nextIsActive = !isActive;
    try {
      await apiFetch(`/products/${product.id}`, {
        method: "PATCH",
        body: { is_active: nextIsActive },
      });
      setProducts((current) =>
        current.map((item) =>
          item.id === product.id ? { ...item, is_active: nextIsActive } : item,
        ),
      );
      setDetailsProduct((current) =>
        current?.id === product.id
          ? { ...current, is_active: nextIsActive }
          : current,
      );
      showToast.success(
        t(nextIsActive ? "messages.activateSuccess" : "messages.deactivateSuccess"),
      );
    } catch (err) {
      showToast.error(
        getCleanErrorMessage(err, t("messages.updateStatusError")),
      );
    }
  };
  const handleDeleteProduct = (target) => {
    if (!target) return;
    closeForm();
    const formattedName = formatProductName(target.name);
    setProducts((prev) => prev.filter((p) => p.id !== target.id));
    showToast.undo(t("messages.deleteUndo", { name: formattedName }), {
      duration: 4000,
      onUndo: () => {
        loadData();
        showToast.info(t("messages.deleteCancelled", { name: formattedName }));
      },
      onConfirm: async () => {
        try {
          await apiFetch(`/products/${target.id}`, { method: "DELETE" });
        } catch (err) {
          const stockLocations = err?.data?.stock_by_branch;
          const stockDetails = Array.isArray(stockLocations)
            ? stockLocations
                .map(({ branch_name, quantity }) =>
                  t("messages.deleteBlockedStockLocation", {
                    branch: branch_name,
                    quantity,
                  }),
                )
                .join("، ")
            : "";
          const hiddenStockDetails = err?.data?.has_unlisted_stock
            ? t("messages.deleteBlockedUnlistedStock")
            : "";
          const errorMessage = getCleanErrorMessage(err, t("messages.deleteError"));
          showToast.error(
            [errorMessage, stockDetails, hiddenStockDetails]
              .filter(Boolean)
              .join(" "),
          );
        } finally {
          loadData();
        }
      },
    });
  };
  const filteredCategories = useMemo(() => {
    const term = debouncedSearchTerm.trim().toLowerCase();
    return categories
      .map((category) => {
        const categoryProducts = products.filter(
          (p) => p.category_id === category.id,
        );
        const matched = term
          ? categoryProducts.filter(
              (p) =>
                includes(p.name, term) ||
                includes(category.name, term) ||
                includes(category.unit, term) ||
                includes(p.weight, term),
            )
          : categoryProducts;
        return { ...category, products: matched };
      })
      .filter((category) => category.products.length > 0);
  }, [categories, products, debouncedSearchTerm]);
  if (loading) {
    return (
      <div
        className="p-16 text-center text-gray-500 font-medium font-sans text-sm"
        dir="rtl"
      >
        {t("list.loading")}
      </div>
    );
  }
  if (error) {
    return (
      <div
        className="p-16 text-center text-rose-600 font-bold font-sans text-sm"
        dir="rtl"
      >
        {t("list.fetchErrorPrefix")} {error}
      </div>
    );
  }
  return (
    <div className="w-full space-y-4 font-sans" dir="rtl">
      <div className="w-full flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">
            {t("page.title")}
          </h1>
          <p className="text-xs text-gray-500 font-medium mt-1">
            {t("page.subtitle")}
          </p>
        </div>
        {can("products", "create") && (
          <button
            type="button"
            onClick={() => setFormMode("create")}
            className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={16} />
            <span>{t("list.addProductButton")}</span>
          </button>
        )}
      </div>
      <div className="w-full bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={15} className="absolute right-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder={t("list.searchPlaceholder")}
            className="w-full border border-gray-300 rounded-lg pr-9 pl-3 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-emerald-600 bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <div className="w-full bg-white rounded-xl border border-gray-200 shadow-2xs">
        <div className="divide-y divide-gray-200">
          {filteredCategories.map((category) => (
            <div key={category.id} className="bg-white">
              <div className="bg-gray-50 border-b border-gray-200 px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-xs text-gray-800">{category.name}</h3>
                  <span className="text-[11px] bg-white text-gray-700 font-semibold px-2.5 py-0.5 rounded-lg border border-gray-200">
                    {t("list.categoryUnitLabel")}: {category.unit || "کارتن"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] bg-white text-gray-700 font-bold px-2.5 py-0.5 rounded-full border border-gray-200 font-mono">
                    {t("list.productsCount", { count: category.products.length })}
                  </span>
                  {can("products", "edit") && (
                    <TooltipButton
                      icon={<Edit size={14} />}
                      tooltip={t("list.tooltipEditCategory")}
                      onClick={() => setEditCategory(category)}
                      colorClass="text-gray-600 hover:text-gray-900 bg-white hover:bg-gray-100 border border-gray-300"
                    />
                  )}
                </div>
              </div>
              <div className="overflow-x-auto bg-white">
                <table className="w-full min-w-[980px] text-right border-collapse" dir="rtl">
                  <thead>
                    <tr className="bg-white text-gray-600 text-table-header-text border-b border-gray-200">
                      <th className="p-3.5 w-14 text-center border-l border-gray-200">
                        {t("list.colIndex")}
                      </th>
                      <th className="p-3.5 border-l border-gray-200">
                        {t("list.colProduct")}
                      </th>
                      <th className="p-3.5 text-center border-l border-gray-200">
                        {t("insertModal.weightFieldLabel")}
                      </th>
                      <th className="p-3.5 text-center border-l border-gray-200">
                        {t("list.colUnit")}
                      </th>
                      <th className="p-3.5 text-center border-l border-gray-200">
                        {t("list.colThreshold")}
                      </th>
                      <th className="p-3.5 text-center border-l border-gray-200">
                        {t("list.colStatus")}
                      </th>
                      <th className="p-3.5 text-center">
                        {t("list.colActions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-table-cell-text">
                    {category.products.map((product, index) => {
                      const isActive = product.is_active !== false;
                      const unit = category.unit || "کارتن";
                      const stockUnit =
                        product.weight_type === "variable" ? "کیلوگرم" : unit;
                      return (
                        <tr
                          key={product.id}
                          className={`hover:bg-gray-50/70 ${
                            isActive ? "" : "bg-gray-50/60 text-gray-500"
                          }`}
                        >
                          <td className="p-3.5 text-center font-mono text-gray-500 border-l border-gray-100">
                            {index + 1}
                          </td>
                          <td className="p-3.5 font-bold text-gray-900 border-l border-gray-100">
                            {formatProductName(product.name)}
                          </td>
                          <td className="p-3.5 text-center font-mono border-l border-gray-100">
                            {product.weight_type === "variable"
                              ? t("insertModal.weightTypes.variable")
                              : product.weight || t("table.emptyValue", { ns: "common" })}
                          </td>
                          <td className="p-3.5 text-center border-l border-gray-100">
                            {unit}
                          </td>
                          <td className="p-3.5 text-center border-l border-gray-100">
                            <span className="inline-flex items-center gap-1 font-mono" dir="rtl">
                              <span dir="ltr">{product.low_stock_threshold ?? 10}</span>
                              <span className="text-[10px] font-sans">{stockUnit}</span>
                            </span>
                          </td>
                          <td className="p-3.5 text-center border-l border-gray-100">
                            {can("products", "edit") ? (
                              <button
                                type="button"
                                onClick={() => handleToggleActive(product)}
                                title={t(isActive ? "list.deactivateButton" : "list.activateButton")}
                                className={`inline-flex items-center space-x-1 space-x-reverse rounded-badge px-2 py-0.5 text-[11px] font-medium transition-colors ${
                                  isActive ? "text-emerald-800" : "text-rose-800"
                                }`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    isActive ? "bg-emerald-600" : "bg-rose-600"
                                  }`}
                                />
                                <span>
                                  {t(isActive ? "list.activeStatus" : "list.inactiveStatus")}
                                </span>
                              </button>
                            ) : (
                              <span
                                className={`inline-flex items-center space-x-1 space-x-reverse rounded-badge px-2 py-0.5 text-[11px] font-medium ${
                                  isActive ? "text-emerald-800" : "text-rose-800"
                                }`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    isActive ? "bg-emerald-600" : "bg-rose-600"
                                  }`}
                                />
                                <span>
                                  {t(isActive ? "list.activeStatus" : "list.inactiveStatus")}
                                </span>
                              </span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center justify-center space-x-1 space-x-reverse">
                              <TooltipButton
                                tooltip={t("list.detailsButton")}
                                onClick={() =>
                                  setDetailsProduct({ ...product, category })
                                }
                                className="w-7 h-7 flex items-center justify-center bg-white hover:bg-slate-800 hover:text-white text-gray-600 rounded-btn border border-gray-300 transition-colors cursor-pointer !p-0 shadow-2xs"
                                icon={<Eye size={13} />}
                              />
                              {can("products", "edit") && (
                                <TooltipButton
                                  tooltip={t("list.tooltipEdit")}
                                  onClick={() => {
                                    setEditProduct(product);
                                    setFormMode("edit");
                                  }}
                                  className="w-7 h-7 flex items-center justify-center bg-white hover:bg-slate-800 hover:text-white text-gray-600 rounded-btn border border-gray-300 transition-colors cursor-pointer !p-0 shadow-2xs"
                                  icon={<Edit2 size={13} />}
                                />
                              )}
                              {can("products", "delete") && (
                                <TooltipButton
                                  tooltip={t("editModal.deleteButton")}
                                  onClick={() => handleDeleteProduct(product)}
                                  className="w-7 h-7 flex items-center justify-center bg-white hover:bg-rose-700 hover:text-white text-gray-600 rounded-btn border border-gray-300 transition-colors cursor-pointer !p-0 shadow-2xs"
                                  icon={<Trash2 size={13} />}
                                />
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          {filteredCategories.length === 0 && (
            <div className="w-full text-center p-12 bg-white">
              <p className="text-xs font-bold text-gray-700">
                {t("list.emptyTitle")}
              </p>
              <p className="text-[11px] text-gray-500 mt-1">
                {t("list.emptyDescription")}
              </p>
            </div>
          )}
        </div>
      </div>
      <ProductFormModal
        mode={formMode === "edit" ? "edit" : "create"}
        isOpen={Boolean(formMode)}
        onClose={closeForm}
        product={editProduct}
        categories={categories}
        onSaved={handleSaved}
        onDelete={can("products", "delete") ? handleDeleteProduct : undefined}
      />
      <ProductCategoryFormModal
        isOpen={Boolean(editCategory)}
        category={editCategory}
        onClose={() => setEditCategory(null)}
        onSaved={handleCategorySaved}
      />
      <ProductDetailsModal
        product={detailsProduct}
        onClose={() => setDetailsProduct(null)}
      />
    </div>
  );
}
