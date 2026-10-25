import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Edit2, Info, Plus, RefreshCw, Tag, Trash2, X } from "lucide-react";
import { apiFetch, apiList } from "../../api";
import { showToast } from "../../utils/toast";

const API_PATH = "/settings/vault-transaction-categories";
const INPUT_CLASS =
  "w-full px-3 py-2 bg-white border border-gray-300 rounded-input text-body-text text-gray-900 outline-none focus:border-slate-800 transition-colors";

export default function VaultTransactionCategoriesManager({ canEdit, searchTerm }) {
  const { t } = useTranslation("settings");
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [form, setForm] = useState({ name: "", type: "both", description: "" });

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      setCategories(await apiList(API_PATH));
    } catch (error) {
      showToast.error(error.message || t("categories.vaultTransactions.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const filteredCategories = useMemo(() => {
    const term = searchTerm.trim().toLocaleLowerCase();
    if (!term) return categories;
    return categories.filter((category) =>
      [category.name, category.description]
        .filter(Boolean)
        .some((value) => value.toLocaleLowerCase().includes(term)),
    );
  }, [categories, searchTerm]);

  const openCreateForm = () => {
    setEditingCategory(null);
    setForm({ name: "", type: "both", description: "" });
    setFormOpen(true);
  };

  const openEditForm = (category) => {
    setEditingCategory(category);
    setForm({
      name: category.name || "",
      type: category.type || "both",
      description: category.description || "",
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    if (saving) return;
    setFormOpen(false);
    setEditingCategory(null);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) {
      showToast.error(t("categories.vaultTransactions.nameRequired"));
      return;
    }

    setSaving(true);
    try {
      const data = await apiFetch(
        editingCategory ? `${API_PATH}/${editingCategory.id}` : API_PATH,
        {
          method: editingCategory ? "PUT" : "POST",
          body: {
            name,
            type: form.type,
            description: form.description.trim() || null,
          },
        },
      );
      showToast.success(data.message || t("categories.vaultTransactions.saved"));
      setFormOpen(false);
      setEditingCategory(null);
      await loadCategories();
    } catch (error) {
      showToast.error(error.message || t("categories.vaultTransactions.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category) => {
    if (
      !window.confirm(
        t("categories.vaultTransactions.confirmDelete", { name: category.name }),
      )
    ) {
      return;
    }

    try {
      const data = await apiFetch(`${API_PATH}/${category.id}`, { method: "DELETE" });
      showToast.success(data.message || t("categories.vaultTransactions.deleted"));
      await loadCategories();
    } catch (error) {
      showToast.error(error.message || t("categories.vaultTransactions.deleteError"));
    }
  };

  const typeLabel = (type) =>
    type === "both"
      ? t("navigation.pages.depositsWithdrawals", { ns: "common" })
      : t(`categories.vaultTransactions.type.${type}`, {
          defaultValue: type,
        });
  const typeBadgeClass = (type) => {
    if (type === "deposit") return "bg-emerald-50 text-emerald-800 ring-emerald-200";
    if (type === "withdraw") return "bg-amber-50 text-amber-800 ring-amber-200";
    return "bg-slate-100 text-slate-700 ring-slate-200";
  };

  return (
    <div className="space-y-4 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-900">
            {t("categories.vaultTransactions.managerTitle")}
          </h3>
          <p className="mt-1 text-caption-text text-gray-500">
            {t("categories.vaultTransactions.managerSubtitle")}
          </p>
        </div>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <span className="whitespace-nowrap rounded-full bg-gray-100 px-3 py-1.5 text-caption-text font-semibold text-gray-600">
            {t("categories.vaultTransactions.count", { count: filteredCategories.length })}
          </span>
          {canEdit && (
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center justify-center gap-1.5 rounded-btn bg-slate-800 px-4 py-2 text-btn-text font-bold text-white shadow-sm transition-colors hover:bg-slate-900"
          >
            <Plus size={16} />
            <span>{t("categories.vaultTransactions.add")}</span>
          </button>
          )}
        </div>
      </div>

      <div className="flex items-start gap-2.5 rounded-lg border border-amber-200/80 bg-amber-50/70 px-3.5 py-3 text-caption-text leading-6 text-amber-900">
        <Info size={16} className="mt-1 shrink-0 text-amber-700" />
        <p>{t("categories.vaultTransactions.automaticCategoryNote")}</p>
      </div>

      {formOpen && (
        <form
          onSubmit={handleSave}
          className="space-y-4 rounded-card border border-slate-200 bg-white p-4 shadow-2xs sm:p-5"
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-bold text-gray-900">
              {editingCategory
                ? t("categories.vaultTransactions.editTitle")
                : t("categories.vaultTransactions.addTitle")}
            </h3>
            <button
              type="button"
              onClick={closeForm}
              disabled={saving}
              aria-label={t("categories.vaultTransactions.close")}
              className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-50"
            >
              <X size={18} />
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1.5 text-caption-text font-semibold text-gray-700">
              <span>{t("categories.vaultTransactions.name")}</span>
              <input
                autoFocus
                required
                maxLength={100}
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                className={INPUT_CLASS}
              />
            </label>
            <label className="space-y-1.5 text-caption-text font-semibold text-gray-700">
              <span>{t("categories.vaultTransactions.direction")}</span>
              <select
                value={form.type}
                onChange={(event) =>
                  setForm((current) => ({ ...current, type: event.target.value }))
                }
                className={INPUT_CLASS}
              >
                {["deposit", "withdraw", "both"].map((type) => (
                  <option key={type} value={type}>
                    {typeLabel(type)}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 text-caption-text font-semibold text-gray-700 md:col-span-2">
              <span>{t("categories.vaultTransactions.description")}</span>
              <textarea
                maxLength={500}
                rows={2}
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                className={INPUT_CLASS}
              />
            </label>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={closeForm}
              disabled={saving}
              className="rounded-btn border border-gray-300 bg-white px-3.5 py-2 text-btn-text font-bold text-gray-700 disabled:opacity-50"
            >
              {t("categories.vaultTransactions.cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-btn bg-slate-800 px-4 py-2 text-btn-text font-bold text-white disabled:opacity-50"
            >
              {saving ? t("action.saving") : t("categories.vaultTransactions.save")}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="py-12 text-center text-gray-400">
          <RefreshCw size={24} className="mx-auto mb-2 animate-spin" />
          <p className="text-caption-text">{t("categories.loading")}</p>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="rounded-card border border-dashed border-gray-300 bg-gray-50/60 px-4 py-12 text-center">
          <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white text-gray-400 shadow-sm ring-1 ring-gray-200">
            <Tag size={20} />
          </span>
          <p className="font-bold text-gray-700">
            {categories.length === 0
              ? t("categories.vaultTransactions.empty")
              : t("categories.vaultTransactions.noSearchResults")}
          </p>
          {categories.length === 0 && canEdit && (
            <button
              type="button"
              onClick={openCreateForm}
              className="mt-4 inline-flex items-center gap-1.5 rounded-btn border border-gray-300 bg-white px-3.5 py-2 text-btn-text font-bold text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Plus size={15} />
              {t("categories.vaultTransactions.add")}
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {filteredCategories.map((category) => (
              <article
                key={category.id}
                className="rounded-card border border-gray-200 bg-white p-3.5 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <h4 className="min-w-0 break-words font-bold text-gray-900">{category.name}</h4>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-caption-text font-semibold ring-1 ring-inset ${typeBadgeClass(category.type)}`}
                  >
                    {typeLabel(category.type)}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap break-words text-caption-text leading-5 text-gray-600">
                  {category.description || t("placeholder.dash")}
                </p>
                {canEdit && (
                  <div className="mt-3 flex justify-end gap-2 border-t border-gray-100 pt-3">
                    <button
                      type="button"
                      onClick={() => openEditForm(category)}
                      className="inline-flex items-center gap-1.5 rounded-btn border border-gray-300 bg-white px-3 py-1.5 text-caption-text font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      <Edit2 size={14} />
                      {t("categories.vaultTransactions.edit")}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(category)}
                      className="inline-flex items-center gap-1.5 rounded-btn border border-rose-200 bg-white px-3 py-1.5 text-caption-text font-semibold text-rose-700 hover:bg-rose-50"
                    >
                      <Trash2 size={14} />
                      {t("categories.vaultTransactions.delete")}
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-card border border-gray-200 md:block">
            <table className="w-full min-w-[680px] border-collapse text-right">
              <thead className="bg-gray-50 text-caption-text font-bold text-gray-600">
                <tr>
                  <th className="px-4 py-3">{t("categories.vaultTransactions.name")}</th>
                  <th className="px-4 py-3">{t("categories.vaultTransactions.direction")}</th>
                  <th className="px-4 py-3">{t("categories.vaultTransactions.description")}</th>
                  {canEdit && <th className="px-4 py-3 text-center">{t("categories.col.actions")}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white text-sm">
                {filteredCategories.map((category) => (
                  <tr key={category.id} className="transition-colors hover:bg-gray-50/70">
                    <td className="px-4 py-3 font-semibold text-gray-900">{category.name}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-caption-text font-semibold ring-1 ring-inset ${typeBadgeClass(category.type)}`}
                      >
                        {typeLabel(category.type)}
                      </span>
                    </td>
                    <td className="max-w-sm px-4 py-3 text-gray-600">
                      <span className="line-clamp-2 whitespace-pre-wrap break-words">
                        {category.description || t("placeholder.dash")}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            title={t("categories.vaultTransactions.edit")}
                            aria-label={t("categories.vaultTransactions.edit")}
                            onClick={() => openEditForm(category)}
                            className="rounded-lg border border-gray-300 bg-white p-2 text-gray-500 transition-colors hover:border-amber-300 hover:text-amber-700"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            type="button"
                            title={t("categories.vaultTransactions.delete")}
                            aria-label={t("categories.vaultTransactions.delete")}
                            onClick={() => handleDelete(category)}
                            className="rounded-lg border border-gray-300 bg-white p-2 text-gray-500 transition-colors hover:border-rose-300 hover:text-rose-600"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
