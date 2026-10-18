import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Edit, Search } from "lucide-react";
import { ProductFormModal } from "../components/products";
import TooltipButton from "../components/common/TooltipButton";
import { formatProductName } from "../utils/productFormat";
import { showToast } from "../utils/toast";
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
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [productsData, categoriesData] = await Promise.all([
        apiList("/products"),
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
          showToast.error(t("messages.deleteError"));
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
      <div className="w-full bg-white rounded-xl border border-gray-200 overflow-hidden shadow-2xs">
        <div className="divide-y divide-gray-200">
          {filteredCategories.map((category) => (
            <div key={category.id} className="bg-white">
              <div className="bg-gray-50 border-b border-gray-200 px-5 py-3 flex items-center justify-between">
                <h3 className="font-bold text-xs text-gray-800">{category.name}</h3>
                <span className="text-[11px] bg-white text-gray-700 font-bold px-2.5 py-0.5 rounded-full border border-gray-200 font-mono">
                  {t("list.productsCount", { count: category.products.length })}
                </span>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 bg-white">
                {category.products.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-xl p-3.5 flex justify-between items-center gap-2 transition-colors shadow-2xs"
                  >
                    <div className="space-y-1 min-w-0">
                      <p className="font-bold text-gray-900 text-xs whitespace-normal break-words" dir="ltr">
                        {formatProductName(product.name)}
                      </p>
                      <p className="text-[11px] font-medium text-gray-500" dir="rtl">
                        {t("list.weightLabel")}{" "}
                        <span className="text-gray-800 font-bold">
                          {product.weight || t("table.emptyValue", { ns: "common" })}
                        </span>
                      </p>
                    </div>
                    {can("products", "edit") && (
                      <TooltipButton
                        icon={<Edit size={14} />}
                        tooltip={t("list.tooltipEdit")}
                        onClick={() => {
                          setEditProduct(product);
                          setFormMode("edit");
                        }}
                        colorClass="text-gray-600 hover:text-gray-900 bg-white hover:bg-gray-100 border border-gray-300"
                      />
                    )}
                  </div>
                ))}
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
    </div>
  );
}
