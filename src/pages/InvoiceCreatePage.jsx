import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_af from "../utils/persian_af";
import { 
  ArrowRight, 
  Plus, 
  Trash2, 
  Save, 
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  Loader2
} from "lucide-react";
import { SearchableSelect, CustomDropdown, SearchableInput } from "../components/common";
import { useBranch } from "../context/BranchContext";
import useDebounce from "../hooks/useDebounce";
import { getCleanErrorMessage } from "../utils/errorHandler";
import {
  toEnglishDigits,
  formatNumber as fmt,
} from "../utils/dariNumberFormatter";
import { formatProductName, formatProductOption } from "../utils/productFormat";
import { showToast } from "../utils/toast";
import { apiFetch, apiList, apiUrl } from "../api";
import TooltipButton from "../components/common/TooltipButton";
const parseWeightKg = (weightStr) => {
  if (!weightStr) return 0;
  const match = String(toEnglishDigits(weightStr)).match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : 0;
};
const SALES_SCALE_OPTIONS = [
  { value: "تن", label: "تن (Ton)", type: "ton" },
  { value: "کیلوگرم", label: "کیلوگرم (KG)", type: "kg" },
  { value: "کارتن / بسته", label: "کارتن / بسته", type: "pack" },
  { value: "دانه / عدد", label: "دانه / عدد", type: "unit" },
  { value: "بندل", label: "بندل", type: "bundle" },
  { value: "متر", label: "متر", type: "meter" },
];
const WEIGHT_SCALES = ["تن", "کیلوگرم"];
export default function InvoiceCreatePage() {
  const navigate = useNavigate();
  const { id: editInvoiceId } = useParams();
  const isEditMode = Boolean(editInvoiceId);
  const [initialLoading, setInitialLoading] = useState(isEditMode);
  const [productsList, setProductsList] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const {
    branches: branchesList,
    isMultiBranch,
    isLoadingBranches,
    singleBranchId,
  } = useBranch();
  const [customers, setCustomers] = useState([]);
  const [vaults, setVaults] = useState([]);
  const [branchInventories, setBranchInventories] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState(() => String(Math.floor(1000 + Math.random() * 9000)));
  const [dateObj, setDateObj] = useState(() => new DateObject({ calendar: persian, locale: persian_af }));
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerId, setCustomerId] = useState("");
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const debouncedCustomerSearch = useDebounce(customerSearchQuery, 1000);
  const isSearchingCustomers = 
    loadingCustomers || 
    (customerSearchQuery.trim().length > 0 && customerSearchQuery.trim() !== debouncedCustomerSearch.trim());
  const [currency, setCurrency] = useState("USD");
  const [vaultId, setVaultId] = useState("");
  const [items, setItems] = useState([
    {
      id: null,
      client_key: Date.now(),
      product_id: "",
      product_name: "",
      product_obj: null,
      branch_id: "",
      branch_name: "",
      stock: 0,
      quantity: "1",
      first_scale: "",
      first_scale_kg: 0,
      total_weight: "",
      total_weight_kg: 0,
      sales_scale: "تن",
      billable_quantity: 0.025,
      unit_price: "",
      total: 0,
      original_quantity: 0,
      original_product_id: "",
      original_branch_id: "",
    },
  ]);
  const [discount, setDiscount] = useState("0");
  const [paidAmount, setPaidAmount] = useState("0");
  const [hasTransport, setHasTransport] = useState(false);
  const [driverName, setDriverName] = useState("");
  const [truckPlate, setTruckPlate] = useState("");
  const [notes, setNotes] = useState("");
  const [dispatchedQtyByItemId, setDispatchedQtyByItemId] = useState({});
  const isVariableWeight = (it) =>
    (it.product_obj ||
      productsList.find((product) => String(product.id) === String(it.product_id)))
      ?.weight_type === "variable";
  const getRequiredStock = (it) => {
    if (isVariableWeight(it)) return Number(it.total_weight_kg) || 0;
    return Number(toEnglishDigits(it.quantity)) || 0;
  };
  const getBonusStock = (it) => {
    if (
      it.original_product_id &&
      it.original_branch_id &&
      String(it.original_product_id) === String(it.product_id) &&
      String(it.original_branch_id) === String(it.branch_id)
    ) {
      if (isVariableWeight(it)) return Number(it.original_total_weight_kg) || 0;
      return Number(it.original_quantity) || 0;
    }
    return 0;
  };
  const hasStockError = useMemo(() => {
    return items.some((it) => {
      if (!it.product_id || !it.branch_id) return false;
      const qty = getRequiredStock(it);
      const availableStock = (Number(it.stock) || 0) + getBonusStock(it);
      return qty > availableStock;
    });
  }, [items, productsList]);
  useEffect(() => {
    apiList("/products")
      .then(setProductsList)
      .catch(() => {});
    apiList("/product-categories")
      .then(setCategoriesList)
      .catch(() => {});
    apiFetch("/vaults")
      .then((d) => {
        const list = d.data || [];
        setVaults(list);
        if (list.length > 0) {
          const match = list.find((v) => v.currency === "USD") || list[0];
          setVaultId(String(match.id));
        }
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    let active = true;
    const query = debouncedCustomerSearch.trim();
    if (!query) {
      setCustomers([]);
      setLoadingCustomers(false);
      return;
    }
    const fetchCustomers = async () => {
      setLoadingCustomers(true);
      try {
        const url = apiUrl(`/customers?search=${encodeURIComponent(query)}&per_page=20`);
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
          if (active) {
            setCustomers(list);
          }
        }
      } catch (err) {
        console.error("Error fetching customers:", err);
      } finally {
        if (active) setLoadingCustomers(false);
      }
    };
    fetchCustomers();
    return () => {
      active = false;
    };
  }, [debouncedCustomerSearch]);
  const fetchBranchStock = useCallback(async (branchId) => {
    if (!branchId || branchInventories[branchId]) return;
    try {
      const inventories = await apiList(
        `/inventories?${new URLSearchParams({ branch_id: String(branchId) })}`,
      );
      {
        const map = {};
        inventories.forEach((inv) => {
          map[inv.product_id] = inv.current_stock;
        });
        setBranchInventories((prev) => ({ ...prev, [branchId]: map }));
      }
    } catch (e) {
      console.error("Error fetching branch stock:", e);
    }
  }, [branchInventories]);
  useEffect(() => {
    if (branchesList.length > 0) fetchBranchStock(branchesList[0].id);
  }, [branchesList, fetchBranchStock]);
  useEffect(() => {
    if (isLoadingBranches || isMultiBranch || !singleBranchId) return;

    const branch = branchesList[0];
    setItems((prev) => {
      let changed = false;
      const next = prev.map((item) => {
        if (item.branch_id) return item;
        changed = true;
        return {
          ...item,
          branch_id: singleBranchId,
          branch_name: branch?.name || "",
          stock: branchInventories[singleBranchId]?.[item.product_id] ?? item.stock,
        };
      });
      return changed ? next : prev;
    });
  }, [
    branchInventories,
    branchesList,
    isLoadingBranches,
    isMultiBranch,
    singleBranchId,
  ]);
  useEffect(() => {
    setItems((prev) => prev.map((it) => {
      if (it.branch_id && it.product_id && branchInventories[it.branch_id]) {
        const stock = branchInventories[it.branch_id][it.product_id] ?? 0;
        if (stock !== it.stock) return { ...it, stock };
      }
      return it;
    }));
  }, [branchInventories]);
  useEffect(() => {
    if (!isEditMode) return;
    let active = true;
    (async () => {
      try {
        const res = await apiFetch(`/sales-invoices/${editInvoiceId}`);
        const inv = res.data;
        if (!active || !inv) return;

        setInvoiceNumber(inv.invoice_number || "");
        if (inv.shamsi_date) {
          try {
            setDateObj(new DateObject({
              calendar: persian,
              locale: persian_af,
              date: toEnglishDigits(inv.shamsi_date),
              format: "YYYY/MM/DD",
            }));
          } catch (e) {
            console.error("Failed to parse invoice date:", e);
          }
        }
        if (inv.customer) {
          setSelectedCustomer(inv.customer);
          setCustomerId(String(inv.customer.id));
        } else if (inv.customer_id) {
          setSelectedCustomer({ id: inv.customer_id, name: inv.customer_name });
          setCustomerId(String(inv.customer_id));
        }
        setCurrency(inv.currency || "USD");
        setVaultId(inv.vault_id ? String(inv.vault_id) : "");
        setDiscount(String(inv.discount ?? "0"));
        setPaidAmount(String(inv.paid_amount ?? "0"));
        setNotes(inv.notes || "");
        setHasTransport(Boolean(inv.driver_name || inv.truck_plate));
        setDriverName(inv.driver_name || "");
        setTruckPlate(inv.truck_plate || "");

        const invItems = inv.items || [];
        if (invItems.length > 0) {
          setItems(invItems.map((item) => ({
            id: item.id,
            client_key: `existing-${item.id}`,
            product_id: item.product_id ? String(item.product_id) : "",
            product_name: item.product_name || "",
            product_obj: null,
            branch_id: item.branch_id ? String(item.branch_id) : "",
            branch_name: item.branch_name || "",
            stock: 0,
            quantity: String(item.quantity),
            first_scale: item.first_scale || "",
            first_scale_kg: parseWeightKg(item.first_scale),
            total_weight: item.total_weight_kg
              ? String(
                  Number(item.total_weight_kg) /
                    (item.sales_scale === "تن" ? 1000 : 1),
                )
              : "",
            total_weight_kg: Number(item.total_weight_kg) || 0,
            sales_scale: item.sales_scale || "تن",
            billable_quantity: parseFloat(item.billable_quantity) || 0,
            unit_price: String(item.unit_price),
            total: parseFloat(item.total_price) || 0,
            original_quantity: parseFloat(item.quantity) || 0,
            original_total_weight_kg: Number(item.total_weight_kg) || 0,
            original_product_id: item.product_id ? String(item.product_id) : "",
            original_branch_id: item.branch_id ? String(item.branch_id) : "",
          })));
          invItems.forEach((item) => {
            if (item.branch_id) fetchBranchStock(item.branch_id);
          });
        }

        try {
          const dispatchRes = await apiFetch(`/sales-invoices/${editInvoiceId}/dispatches`);
          const map = {};
          (dispatchRes.items || []).forEach((it) => {
            map[it.id] = it.dispatched_quantity || 0;
          });
          if (active) setDispatchedQtyByItemId(map);
        } catch (e) {
          console.error("Failed to load dispatch summary for invoice:", e);
        }
      } catch (err) {
        showToast.error(getCleanErrorMessage(err));
        navigate("/sales/invoices");
      } finally {
        if (active) setInitialLoading(false);
      }
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editInvoiceId, isEditMode]);
  const recalculateItem = (item) => {
    const qty = parseFloat(toEnglishDigits(item.quantity)) || 0;
    const pkgKg = item.first_scale_kg || parseWeightKg(item.first_scale);
    const variableWeight = isVariableWeight(item);
    const enteredWeight = parseFloat(toEnglishDigits(item.total_weight)) || 0;
    const totalKg = variableWeight
      ? enteredWeight * (item.sales_scale === "تن" ? 1000 : 1)
      : qty * pkgKg;
    let billableQty = 0;
    if (variableWeight) {
      billableQty = item.sales_scale === "تن" ? totalKg / 1000 : totalKg;
    } else if (item.sales_scale === "تن") {
      billableQty = totalKg / 1000;
    } else if (item.sales_scale === "کیلوگرم") {
      billableQty = totalKg;
    } else {
      billableQty = qty;
    }
    const price = parseFloat(toEnglishDigits(item.unit_price)) || 0;
    const total = billableQty * price;
    return {
      ...item,
      total_weight_kg: variableWeight ? totalKg : 0,
      billable_quantity: billableQty,
      total: total,
    };
  };
  const getProductCategoryName = useCallback((prod) => {
    if (!prod) return "";
    if (prod.category?.name) return prod.category.name;
    if (prod.category_name) return prod.category_name;
    if (typeof prod.category === "string") return prod.category;
    if (prod.category_id && categoriesList.length > 0) {
      const found = categoriesList.find((c) => String(c.id) === String(prod.category_id));
      if (found) return found.name;
    }
    return "";
  }, [categoriesList]);
  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    const previousItem = newItems[index];
    let item = { ...previousItem, [field]: value };
    if (field === "sales_scale" && isVariableWeight(previousItem)) {
      const oldAmount = parseFloat(toEnglishDigits(previousItem.total_weight)) || 0;
      const kilograms = oldAmount * (previousItem.sales_scale === "تن" ? 1000 : 1);
      item.total_weight = String(kilograms / (value === "تن" ? 1000 : 1) || "");
    }
    if (field === "product_id") {
      const prod = productsList.find((p) => String(p.id) === String(value));
      if (prod) {
        const catName = getProductCategoryName(prod);
        const cleanName = formatProductName(prod, catName);
        const pkgWeight = prod.weight || "";
        item.product_obj = prod;
        item.product_name = cleanName;
        if (prod.weight_type === "variable") {
          item.quantity = "";
          item.first_scale = "";
          item.first_scale_kg = 0;
          item.total_weight = "";
          item.total_weight_kg = 0;
          item.sales_scale = "تن";
        } else {
          item.first_scale = pkgWeight;
          item.first_scale_kg = parseWeightKg(pkgWeight);
          item.total_weight = "";
          item.total_weight_kg = 0;
          if (!item.quantity) item.quantity = "1";
        }
        if (item.branch_id && branchInventories[item.branch_id]) {
          item.stock = branchInventories[item.branch_id][prod.id] || 0;
        }
      } else {
        item.product_obj = null;
        item.product_name = "";
        item.first_scale = "";
        item.first_scale_kg = 0;
        item.total_weight = "";
        item.total_weight_kg = 0;
        item.stock = 0;
      }
    }
    if (field === "branch_id") {
      const branch = branchesList.find((b) => String(b.id) === String(value));
      item.branch_name = branch ? branch.name : "";
      if (value) {
        fetchBranchStock(value);
        if (item.product_id && branchInventories[value]) {
          item.stock = branchInventories[value][item.product_id] || 0;
        }
      }
    }
    if (item.branch_id && item.product_id && branchInventories[item.branch_id]) {
      item.stock = branchInventories[item.branch_id][item.product_id] || 0;
    }
    item = recalculateItem(item);
    newItems[index] = item;
    setItems(newItems);
  };
  const handleAddItem = () => {
    const defaultBranchId = branchesList[0]?.id ? String(branchesList[0].id) : "";
    const defaultBranchName = branchesList[0]?.name || "";
    const newItem = recalculateItem({
      id: null,
      client_key: Date.now(),
      product_id: "",
      product_name: "",
      product_obj: null,
      branch_id: defaultBranchId,
      branch_name: defaultBranchName,
      stock: 0,
      quantity: "1",
      first_scale: "",
      first_scale_kg: 0,
      total_weight: "",
      total_weight_kg: 0,
      sales_scale: "تن",
      billable_quantity: 0.025,
      unit_price: "",
      total: 0,
      original_quantity: 0,
      original_product_id: "",
      original_branch_id: "",
    });
    setItems([...items, newItem]);
  };
  const handleRemoveItem = (index) => {
    if (items.length <= 1) return;
    const target = items[index];
    if (target.id && (dispatchedQtyByItemId[target.id] || 0) > 0) {
      showToast.error("این قلم قابل حذف نیست، چون بخشی از آن قبلاً طی حواله خروجی گدام تحویل شده است.");
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };
  const subtotal = useMemo(() => {
    return items.reduce((acc, it) => acc + (parseFloat(it.total) || 0), 0);
  }, [items]);
  const numDiscount = parseFloat(toEnglishDigits(discount)) || 0;
  const grandTotal = Math.max(0, subtotal - numDiscount);
  const numPaid = parseFloat(toEnglishDigits(paidAmount)) || 0;
  const remainingBalance = Math.max(0, grandTotal - numPaid);
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (submitting) return;
    if (!selectedCustomer) {
      showToast.error("لطفاً مشتری را از لیست انتخاب کنید.");
      return;
    }
    const invalidItems = items.filter((it) => {
      if (!it.product_name || !it.unit_price) return true;
      if (isVariableWeight(it)) {
        return !(Number(toEnglishDigits(it.total_weight)) > 0) ||
          !WEIGHT_SCALES.includes(it.sales_scale);
      }
      return !(Number(toEnglishDigits(it.quantity)) > 0);
    });
    if (invalidItems.length > 0) {
      showToast.error("لطفاً برای محصولات با وزن متغیر وزن کل و واحد، و برای محصولات با وزن ثابت تعداد و قیمت را تکمیل کنید.");
      return;
    }
    if (items.some((item) => item.product_id && !isVariableWeight(item) && parseWeightKg(item.first_scale) <= 0)) {
      showToast.error("وزن بسته محصول مشخص نیست؛ لطفاً وزن محصول را در فهرست محصولات تکمیل کنید.");
      return;
    }
    const missingBranch = isMultiBranch && items.find((it) => it.product_id && !it.branch_id);
    if (missingBranch) {
      showToast.error("لطفاً برای تمام ردیف‌های کالا، گدام مربوطه را انتخاب کنید.");
      return;
    }
    if (hasStockError) {
      return;
    }
    setSubmitting(true);
    try {
      const shamsiDateStr = dateObj ? toEnglishDigits(dateObj.format("YYYY/MM/DD")) : "";
      const payload = {
        invoice_number: invoiceNumber.trim(),
        customer_id: parseInt(selectedCustomer.id, 10),
        customer_name: selectedCustomer.name,
        shamsi_date: shamsiDateStr,
        currency: currency,
        subtotal: subtotal,
        discount: numDiscount,
        total_amount: grandTotal,
        paid_amount: numPaid,
        remaining_amount: remainingBalance,
        vault_id: numPaid > 0 && vaultId ? parseInt(vaultId, 10) : null,
        driver_name: hasTransport ? driverName.trim() : null,
        truck_plate: hasTransport ? truckPlate.trim() : null,
        notes: notes.trim(),
        items: items.map((it) => ({
          id: it.id || null,
          product_id: it.product_id ? parseInt(it.product_id, 10) : null,
          product_name: it.product_name,
          branch_id: it.branch_id ? parseInt(it.branch_id, 10) : null,
          branch_name: it.branch_name,
          quantity: isVariableWeight(it) ? null : parseFloat(toEnglishDigits(it.quantity)) || 0,
          first_scale: it.first_scale,
          sales_scale: it.sales_scale,
          total_weight_kg: isVariableWeight(it) ? Number(it.total_weight_kg) || 0 : null,
          billable_quantity: parseFloat(it.billable_quantity) || 0,
          unit_price: parseFloat(toEnglishDigits(it.unit_price)) || 0,
          total: parseFloat(it.total) || 0,
        })),
      };

      if (isEditMode) {
        const resData = await apiFetch(`/sales-invoices/${editInvoiceId}`, {
          method: "PUT",
          body: payload,
        });
        showToast.success(resData.message || "فاکتور با موفقیت ویرایش شد.");
        navigate("/sales/invoices");
      } else {
        const resData = await apiFetch("/sales-invoices", {
          method: "POST",
          body: payload,
        });
        navigate("/sales/invoices", {
          state: {
            newInvoice: resData.data,
            justCreated: true,
          },
        });
      }
    } catch (err) {
      showToast.error(getCleanErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="w-full space-y-6 font-sans text-gray-800 relative" dir="rtl">
      {(submitting || initialLoading) && (
        <div className="fixed inset-0 z-[200] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-200">
          <div className="flex flex-col items-center gap-3 p-6 bg-white rounded-2xl shadow-xl border border-gray-100">
            <Loader2 size={38} className="animate-spin text-emerald-600" />
            <span className="text-sm font-bold text-gray-800">
              {initialLoading ? "در حال بارگذاری اطلاعات فاکتور..." : "در حال ثبت و انتقال به لیست فاکتورها..."}
            </span>
          </div>
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">
            {isEditMode ? `ویرایش فاکتور فروش شماره ${invoiceNumber}` : "صدور فاکتور جدید فروش"}
          </h1>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            to="/sales/invoices"
            className="px-3.5 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowRight size={15} />
            <span>بازگشت به لیست فاکتورها</span>
          </Link>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 bg-gray-50/80 rounded-t-xl">
            <div className="flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center font-mono">
                ۱
              </span>
              <span className="text-gray-900 font-bold text-sm">
                مشخصات اصلی فاکتور و خریدار
              </span>
            </div>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="col-span-1">
                <label className="block text-xs font-bold text-gray-800 mb-1.5">
                  شماره فاکتور <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full h-[40px] px-3 bg-white border border-gray-300 rounded-lg text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-slate-800 text-center"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-bold text-gray-800 mb-1.5">
                  تاریخ صدور فاکتور <span className="text-rose-500">*</span>
                </label>
                <DatePicker
                  value={dateObj}
                  onChange={setDateObj}
                  calendar={persian}
                  locale={persian_af}
                  calendarPosition="bottom-right"
                  inputClass="w-full h-[40px] px-3 bg-white border border-gray-300 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-slate-800 cursor-pointer font-sans text-center"
                  containerClassName="w-full"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-bold text-gray-800 mb-1.5">
                  انتخاب مشتری <span className="text-rose-500">*</span>
                </label>
                <SearchableInput
                  className="w-full"
                  usePortal={true}
                  value={selectedCustomer}
                  searchValue={customerSearchQuery}
                  onSearchChange={setCustomerSearchQuery}
                  options={customers}
                  loading={isSearchingCustomers}
                  onSelect={(cust) => {
                    setSelectedCustomer(cust);
                    setCustomerId(cust ? String(cust.id) : "");
                  }}
                  onClear={() => {
                    setSelectedCustomer(null);
                    setCustomerId("");
                    setCustomerSearchQuery("");
                  }}
                  placeholder="جستجوی نام یا کد مشتری..."
                  noResultsText="مشتری با این مشخصات یافت نشد."
                  getOptionValue={(c) => String(c?.id || "")}
                  renderOption={(c) => (
                    <div className="flex items-center justify-between gap-2 text-xs py-0.5">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-700 text-[10px] font-mono font-bold rounded-md shrink-0">
                          {c.customer_code || `C-${c.id}`}
                        </span>
                        <span className="font-bold text-gray-900">{c.name}</span>
                        {c.company_name && (
                          <span className="text-gray-500 text-[11px]">
                            ({c.company_name})
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  renderSelected={(c) => (
                    <div className="flex items-center gap-1.5 text-xs truncate">
                      <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold rounded-md shrink-0">
                        {c.customer_code || `C-${c.id}`}
                      </span>
                      <span className="font-bold text-gray-900 truncate">{c.name}</span>
                      {c.company_name && (
                        <span className="text-gray-500 text-[11px] truncate">
                          ({c.company_name})
                        </span>
                      )}
                    </div>
                  )}
                />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-bold text-gray-800 mb-1.5">
                  واحد پولی فاکتور <span className="text-rose-500">*</span>
                </label>
                <CustomDropdown
                  options={[
                    { value: "USD", label: "دالر (USD)" },
                    { value: "AFN", label: "افغانی (AFN)" },
                  ]}
                  value={currency}
                  onChange={(val) => setCurrency(val)}
                  usePortal={true}
                  buttonClassName="w-full h-[40px] px-3 text-xs font-bold"
                  width="w-full"
                  align="right"
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-2xs overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 bg-gray-50/80">
            <div className="flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center font-mono">
                ۲
              </span>
              <span className="text-gray-900 font-bold text-sm">
                اقلام و محصولات فاکتور
              </span>
            </div>
            <span className="px-2.5 py-0.5 bg-white text-gray-700 font-bold text-xs rounded-md border border-gray-200 shadow-2xs">
              {items.length} قلم محصول
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200 text-[11px]">
                  <th className="px-2 py-2.5 text-center w-8 border-l border-gray-200">#</th>
                  <th className="px-2.5 py-2.5 border-l border-gray-200 min-w-[200px]">نام محصول</th>
                  <th className="px-2 py-2.5 border-l border-gray-200 min-w-[115px]">گدام</th>
                  <th className="px-2 py-2.5 border-l border-gray-200 text-center w-[65px]">موجودی</th>
                  <th className="px-2 py-2.5 border-l border-gray-200 text-center w-[75px]">تعداد</th>
                  <th className="px-2 py-2.5 border-l border-gray-200 text-center min-w-[100px]">وزن بسته / وزن کل</th>
                  <th className="px-2 py-2.5 border-l border-gray-200 text-center min-w-[100px]">واحد وزن / فروش</th>
                  <th className="px-2 py-2.5 border-l border-gray-200 text-center min-w-[90px]">مقدار نهایی</th>
                  <th className="px-2 py-2.5 border-l border-gray-200 text-center min-w-[95px]">قیمت واحد</th>
                  <th className="px-2.5 py-2.5 border-l border-gray-200 text-center min-w-[105px]">مجموع ({currency})</th>
                  <th className="px-1.5 py-2.5 text-center w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {items.map((it, idx) => {
                  const variableWeight = isVariableWeight(it);
                  const qtyNum = getRequiredStock(it);
                  const bonusStock = getBonusStock(it);
                  const stockNum = (Number(it.stock) || 0) + bonusStock;
                  const isOverStock = Boolean(it.product_id && it.branch_id && qtyNum > stockNum);
                  const dispatchedQty = it.id ? (dispatchedQtyByItemId[it.id] || 0) : 0;
                  return (
                    <tr key={it.client_key} className={`transition-colors ${isOverStock ? "bg-rose-50/40 hover:bg-rose-50/60" : "hover:bg-gray-50/70"}`}>
                      <td className="px-2 py-1.5 text-center text-gray-500 font-mono font-bold border-l border-gray-200">
                        {idx + 1}
                      </td>
                      <td className="px-2 py-1.5 border-l border-gray-200">
                        <SearchableSelect
                          usePortal={true}
                          options={productsList}
                          value={it.product_id ? String(it.product_id) : ""}
                          onChange={(val) => handleItemChange(idx, "product_id", val)}
                          placeholder="انتخاب کالا..."
                          searchPlaceholder="جستجوی نام یا کد..."
                          noResultsText="کالایی یافت نشد"
                          getOptionLabel={(p) => formatProductOption(p, "", getProductCategoryName(p))}
                          getOptionValue={(p) => String(p?.id || "")}
                          buttonClassName="h-[36px] px-2 text-xs font-bold"
                          className="w-full min-w-[190px]"
                          renderOption={(p) => (
                            <div className="flex items-center justify-between gap-1.5 text-xs py-0.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                {p.code && (
                                  <span className="font-mono text-[10px] bg-gray-100 px-1 py-0.5 rounded text-gray-600 shrink-0">
                                    {p.code}
                                  </span>
                                )}
                                <span className="font-bold text-gray-900 truncate">
                                  {formatProductName(p, getProductCategoryName(p))}
                                </span>
                              </div>
                              {p.weight_type === "variable" ? (
                                <span className="text-amber-700 text-[10px] font-bold shrink-0">متغیر</span>
                              ) : p.weight ? (
                                <span className="text-gray-500 text-[10px] font-mono shrink-0">
                                  {p.weight}
                                </span>
                              ) : null}
                            </div>
                          )}
                        />
                      </td>
                      <td className="px-2 py-1.5 border-l border-gray-200">
                        {isMultiBranch ? (
                          <CustomDropdown
                            usePortal={true}
                            options={branchesList.map((b) => ({ value: String(b.id), label: b.name }))}
                            value={it.branch_id ? String(it.branch_id) : ""}
                            onChange={(val) => handleItemChange(idx, "branch_id", val)}
                            placeholder="انتخاب گدام"
                            buttonClassName="w-full h-[36px] px-2 text-xs font-medium"
                            width="w-44"
                            align="right"
                            className="w-full min-w-[110px]"
                          />
                        ) : (
                          <span className="w-full h-[36px] px-2 flex items-center text-xs font-medium text-gray-700">
                            {it.branch_name || "—"}
                          </span>
                        )}
                      </td>
                      <td className={`px-2 py-1.5 text-center border-l border-gray-200 ${isOverStock ? "bg-rose-100/60" : "bg-gray-50/40"}`}>
                        <span className={`font-mono font-bold text-xs ${isOverStock ? "text-rose-700 font-black" : stockNum > 0 ? "text-emerald-700" : "text-gray-400"}`} dir="ltr">
                          {fmt(stockNum)}
                        </span>
                      </td>
                      <td className="px-1.5 py-1.5 border-l border-gray-200 w-[80px]">
                        {variableWeight ? (
                          <span className="h-[36px] flex items-center justify-center text-gray-400">—</span>
                        ) : (
                          <>
                            <input
                              type="number"
                              step="1"
                              min="1"
                              required
                              dir="ltr"
                              value={it.quantity}
                              onFocus={(e) => e.target.select()}
                              onWheel={(e) => e.target.blur()}
                              onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                              className={`w-full h-[36px] rounded-lg px-2 text-xs font-mono font-bold text-center transition-all ${
                                isOverStock
                                  ? "bg-rose-50 border-2 border-rose-500 text-rose-700 focus:outline-none focus:ring-1 focus:ring-rose-400"
                                  : "bg-white border border-gray-300 text-gray-900 focus:outline-none focus:border-slate-800"
                              }`}
                            />
                            {dispatchedQty > 0 && (
                              <div className="mt-1 text-[10px] font-bold text-amber-700 text-center whitespace-nowrap">
                                حداقل: {dispatchedQty} (خارج‌شده)
                              </div>
                            )}
                          </>
                        )}
                      </td>
                      <td className="px-2 py-1.5 border-l border-gray-200">
                        {variableWeight ? (
                          <input
                            type="number"
                            step="0.001"
                            min="0.001"
                            required
                            dir="ltr"
                            value={it.total_weight}
                            onFocus={(e) => e.target.select()}
                            onWheel={(e) => e.target.blur()}
                            onChange={(e) => handleItemChange(idx, "total_weight", e.target.value)}
                            aria-label="وزن کل محصول"
                            placeholder="وزن کل"
                            className={`w-full h-[36px] rounded-lg px-2 text-xs font-mono font-bold text-center ${
                              isOverStock
                                ? "bg-rose-50 border-2 border-rose-500 text-rose-700"
                                : "bg-white border border-gray-300 text-gray-900"
                            }`}
                          />
                        ) : (
                          <input
                            type="text"
                            value={it.first_scale || ""}
                            placeholder={it.product_id ? "وزن ثبت نشده" : "—"}
                            readOnly
                            aria-label="وزن بسته محصول"
                            title="وزن بسته از مشخصات محصول گرفته می‌شود و قابل تغییر نیست"
                            className="w-full h-[36px] bg-gray-100 border border-gray-200 rounded-lg px-2 text-xs font-mono font-bold text-center text-gray-600 cursor-not-allowed"
                          />
                        )}
                      </td>
                      <td className="px-2 py-1.5 border-l border-gray-200">
                        <CustomDropdown
                          usePortal={true}
                          options={SALES_SCALE_OPTIONS
                            .filter((opt) => !variableWeight || WEIGHT_SCALES.includes(opt.value))
                            .map((opt) => ({ value: opt.value, label: opt.label }))}
                          value={it.sales_scale}
                          onChange={(val) => handleItemChange(idx, "sales_scale", val)}
                          buttonClassName="w-full h-[36px] px-2 text-xs font-bold text-center"
                          width="w-36"
                          align="right"
                          className="w-full min-w-[95px]"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-center border-l border-gray-200 bg-gray-50/40">
                        <div className="flex items-center justify-center gap-1 font-mono font-bold text-gray-900 text-xs" dir="ltr">
                          <span>
                            {it.sales_scale === "تن"
                              ? Number(it.billable_quantity || 0).toFixed(3)
                              : fmt(it.billable_quantity || 0)}
                          </span>
                          <span className="text-[10px] text-gray-500 font-sans">{it.sales_scale}</span>
                        </div>
                      </td>
                      <td className="px-1.5 py-1.5 border-l border-gray-200 min-w-[95px]">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          required
                          dir="ltr"
                          value={it.unit_price}
                          onFocus={(e) => e.target.select()}
                          onWheel={(e) => e.target.blur()}
                          onChange={(e) => handleItemChange(idx, "unit_price", e.target.value)}
                          className="w-full h-[36px] bg-white border border-gray-300 rounded-lg px-2 text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-slate-800 text-center"
                        />
                      </td>
                      <td className="px-2.5 py-1.5 text-center border-l border-gray-200 font-mono font-bold text-gray-900 bg-gray-50/30 text-xs" dir="ltr">
                        {fmt(it.total || 0)}
                      </td>
                      <td className="px-1.5 py-1.5 text-center w-8">
                        <TooltipButton
                          icon={Trash2}
                          tooltip={dispatchedQty > 0 ? "این قلم قبلاً از گدام خارج شده و قابل حذف نیست" : "حذف سطر"}
                          disabled={items.length <= 1 || dispatchedQty > 0}
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-btn transition-colors cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="bg-gray-50/70 px-4 py-3 border-t border-gray-200 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleAddItem}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1.5 active:scale-95"
            >
              <Plus size={15} />
              <span>افزودن سطر جدید</span>
            </button>
            {hasStockError && (
              <div className="flex items-center gap-1.5 text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg text-xs font-bold animate-in fade-in duration-150">
                <AlertCircle size={14} className="shrink-0" />
                <span>موجودی این کالا در گدام کافی نمی‌باشد.</span>
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-xl shadow-2xs overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 bg-gray-50/80">
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center font-mono">
                  ۳
                </span>
                <span className="text-gray-900 font-bold text-sm">
                  مشخصات ترانسپورت و بارگیری
                </span>
              </div>
              <button
                type="button"
                onClick={() => setHasTransport(!hasTransport)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                  hasTransport
                    ? "bg-gray-900 text-white border-gray-900 shadow-2xs"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100 shadow-2xs"
                }`}
              >
                {hasTransport ? (
                  <>
                    <ToggleRight size={16} className="text-emerald-400" />
                    <span>غیرفعال‌سازی ترانسپورت</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft size={16} className="text-gray-400" />
                    <span>فعال‌سازی ترانسپورت</span>
                  </>
                )}
              </button>
            </div>
            <div className="p-5 space-y-4">
              {hasTransport ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5 bg-gray-50/70 border border-gray-200 rounded-lg animate-in fade-in duration-200">
                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1.5">نام راننده :</label>
                    <input
                      type="text"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      className="w-full h-[38px] bg-white border border-gray-300 rounded-lg px-3 text-xs text-gray-900 focus:outline-none focus:border-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1.5">نمبر پلیت موتر :</label>
                    <input
                      type="text"
                      value={truckPlate}
                      onChange={(e) => setTruckPlate(e.target.value)}
                      className="w-full h-[38px] bg-white border border-gray-300 rounded-lg px-3 text-xs text-gray-900 font-mono focus:outline-none focus:border-slate-800 text-center"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-gray-50 border border-dashed border-gray-200 rounded-lg text-center text-xs text-gray-500 font-medium">
                  مشخصات ترانسپورت در این فاکتور غیرفعال است (در صورت نیاز دکمه فعال‌سازی را فشار دهید).
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1.5">توضیحات و یادداشت فاکتور:</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="یادداشت‌های مربوط به فاکتور، شرایط تحویل یا پرداخت..."
                  className="w-full bg-white border border-gray-300 rounded-lg p-3 text-xs text-gray-900 focus:outline-none focus:border-slate-800 leading-relaxed"
                />
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl shadow-2xs overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 bg-gray-50/80">
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center font-mono">
                  ۴
                </span>
                <span className="text-gray-900 font-bold text-sm">
                  خلاصه محاسبات مالی و تسویه فاکتور
                </span>
              </div>
            </div>
            <div className="p-5 space-y-3.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-gray-50 font-bold text-gray-800">
                <span className="text-gray-600">مجموع ناخالص اقلام:</span>
                <span className="font-mono text-sm" dir="ltr">
                  {fmt(subtotal)} {currency === 'USD' ? '$' : '؋'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 py-1 border-b border-gray-50">
                <label className="text-gray-700 font-bold">مبلغ تخفیف:</label>
                <div className="relative w-44">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={discount}
                    onFocus={(e) => e.target.select()}
                    onWheel={(e) => e.target.blur()}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="w-full h-[36px] bg-white border border-gray-300 rounded-lg px-3 text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-slate-800 text-left"
                    dir="ltr"
                  />
                  <span className="absolute right-3 top-2.5 text-[11px] font-bold text-gray-400 font-mono">
                    {currency}
                  </span>
                </div>
              </div>
              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
                <span className="font-bold text-gray-900 text-sm">مجموع قابل پرداخت فاکتور:</span>
                <span className="font-mono text-base font-black text-gray-900" dir="ltr">
                  {fmt(grandTotal)} {currency === 'USD' ? '$' : '؋'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 pt-1">
                <label className="text-emerald-900 font-bold">مبلغ دریافتی نقد :</label>
                <div className="relative w-44">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={paidAmount}
                    onFocus={(e) => e.target.select()}
                    onWheel={(e) => e.target.blur()}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className="w-full h-[38px] bg-white border-2 border-emerald-600 rounded-lg px-3 text-xs font-mono font-bold text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-200 text-left"
                    dir="ltr"
                  />
                  <span className="absolute right-3 top-2.5 text-[11px] font-bold text-emerald-700 font-mono">
                    {currency}
                  </span>
                </div>
              </div>
              {numPaid > 0 && vaults.length > 0 && (
                <div className="flex items-center justify-between gap-3 pt-1">
                  <label className="text-xs font-bold text-gray-700">صندوق دریافت وجه نقد:</label>
                  <CustomDropdown
                    usePortal={true}
                    options={vaults.map((v) => ({
                      value: String(v.id),
                      label: `${v.name} (${v.currency})`,
                    }))}
                    value={vaultId ? String(vaultId) : ""}
                    onChange={(val) => setVaultId(val)}
                    placeholder="انتخاب صندوق..."
                    buttonClassName="w-full h-[38px] px-3 text-xs font-bold"
                    width="w-56"
                    align="right"
                    className="w-56"
                  />
                </div>
              )}
              <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-lg flex items-center justify-between">
                <span className="font-bold text-rose-900 text-xs">باقی :</span>
                <span className="font-mono text-base font-black text-rose-800" dir="ltr">
                  {fmt(remainingBalance)} {currency === 'USD' ? '$' : '؋'}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <Link
            to="/sales/invoices"
            className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-bold border border-gray-300 transition-colors cursor-pointer shadow-2xs"
          >
            انصراف
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
          >
            <Save size={15} />
            <span>
              {submitting
                ? (isEditMode ? "در حال ذخیره تغییرات..." : "در حال ثبت فاکتور...")
                : (isEditMode ? "ذخیره تغییرات فاکتور" : "ثبت نهایی فاکتور")}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}