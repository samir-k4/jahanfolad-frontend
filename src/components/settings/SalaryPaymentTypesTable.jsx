import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Lock, Plus, RefreshCw, Save, ToggleLeft, ToggleRight, Trash2, X } from "lucide-react";
import { apiFetch, apiList } from "../../api";
import { CustomDropdown, TooltipButton } from "../common";
import { showToast } from "../../utils";
const DOMAIN = "salary_payment_type";
const SCOPE = { DURING_MONTH: "during_month", MONTHLY: "monthly" };
const NAME_MAX = 150;
const DESCRIPTION_MAX = 500;
const TH_CLASS = "p-3 rounded-none text-table-header-text font-bold text-gray-700 whitespace-normal break-words";
const TD_CLASS = "p-3 rounded-none text-table-cell-text text-gray-800";
const INPUT_CLASS =
  "w-full px-3 py-2 bg-white border border-gray-300 rounded-input text-label-text text-gray-900 outline-none focus:border-slate-800 transition-colors";
const PRIMARY_BTN_CLASS =
  "px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-btn-text font-bold rounded-btn inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";
const SECONDARY_BTN_CLASS =
  "px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 text-btn-text font-bold rounded-btn border border-gray-300 inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer";
const ACTION_REST = "bg-white border border-gray-200 text-gray-500";
const emptyDraft = () => ({ name: "", description: "", scope: SCOPE.DURING_MONTH });
export default function SalaryPaymentTypesTable({ canEdit = false }) {
  const { t } = useTranslation("settings");
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(emptyDraft());
  const [creating, setCreating] = useState(false);
  const scopeOptions = useMemo(
    () => [
      { value: SCOPE.DURING_MONTH, label: t("paymentTypes.scope.duringMonth") },
      { value: SCOPE.MONTHLY, label: t("paymentTypes.scope.monthly") },
    ],
    [t],
  );
  const scopeLabel = (scope) =>
    scope === SCOPE.MONTHLY ? t("paymentTypes.scope.monthly") : t("paymentTypes.scope.duringMonth");
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTypes(await apiList(`/categories/${DOMAIN}`));
    } catch (err) {
      showToast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const closeForm = () => {
    setEditing(null);
    setCreating(false);
    setDraft(emptyDraft());
  };
  const startCreate = () => {
    setEditing(null);
    setCreating(true);
    setDraft(emptyDraft());
  };
  const startEdit = (type) => {
    setCreating(false);
    setEditing(type);
    setDraft({
      name: type.name || "",
      description: type.description || "",
      scope: type.scope || SCOPE.DURING_MONTH,
    });
  };
  const submit = async (event) => {
    event.preventDefault();
    const name = draft.name.trim();
    if (!name) return;
    setBusyId(editing?.id ?? "new");
    try {
      const body = {
        name,
        description: draft.description.trim() || null,
        scope: draft.scope,
        is_active: editing ? editing.is_active : true,
      };
      const data = editing
        ? await apiFetch(`/categories/${DOMAIN}/${editing.id}`, { method: "PUT", body })
        : await apiFetch(`/categories/${DOMAIN}`, { method: "POST", body });
      showToast.success(data?.message || "");
      closeForm();
      await load();
    } catch (err) {
      showToast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };
  const toggle = async (type) => {
    setBusyId(type.id);
    try {
      const data = await apiFetch(`/categories/${DOMAIN}/${type.id}/toggle`, { method: "POST" });
      showToast.success(data?.message || "");
      await load();
    } catch (err) {
      showToast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };
  const remove = async (type) => {
    setBusyId(type.id);
    try {
      const data = await apiFetch(`/categories/${DOMAIN}/${type.id}`, { method: "DELETE" });
      showToast.success(data?.message || "");
      await load();
    } catch (err) {
      showToast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };
  return (
    <div className="p-4 space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-caption-text text-gray-500 whitespace-normal break-words">
          {t("paymentTypes.hint")}
        </p>
        {canEdit && !creating && !editing ? (
          <button type="button" onClick={startCreate} className={`${PRIMARY_BTN_CLASS} shrink-0`}>
            <Plus size={15} />
            <span>{t("paymentTypes.add")}</span>
          </button>
        ) : null}
      </div>
      {creating || editing ? (
        <form
          onSubmit={submit}
          className="p-3.5 bg-gray-50/70 rounded-card border border-gray-200 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
        >
          <div>
            <label className="block text-label-text font-bold text-gray-800 mb-1">
              {t("paymentTypes.col.name")}
            </label>
            <input
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              maxLength={NAME_MAX}
              autoFocus
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className="block text-label-text font-bold text-gray-800 mb-1">
              {t("paymentTypes.col.scope")}
            </label>
            <CustomDropdown
              value={draft.scope}
              onChange={(value) => setDraft({ ...draft, scope: value })}
              options={scopeOptions}
              disabled={Boolean(editing?.is_locked)}
              buttonClassName={INPUT_CLASS}
              className="w-full"
              usePortal
              width="w-56"
            />
          </div>
          <div>
            <label className="block text-label-text font-bold text-gray-800 mb-1">
              {t("paymentTypes.col.description")}
            </label>
            <input
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              maxLength={DESCRIPTION_MAX}
              className={INPUT_CLASS}
            />
          </div>
          <div className="flex items-center gap-2">
            <button type="submit" disabled={!draft.name.trim() || busyId !== null} className={PRIMARY_BTN_CLASS}>
              <Save size={15} />
              <span>{t("paymentTypes.save")}</span>
            </button>
            <button type="button" onClick={closeForm} className={SECONDARY_BTN_CLASS}>
              <X size={15} />
              <span>{t("paymentTypes.cancel")}</span>
            </button>
          </div>
        </form>
      ) : null}
      {loading ? (
        <p className="py-10 text-center text-label-text text-gray-500">{t("paymentTypes.loading")}</p>
      ) : types.length === 0 ? (
        <p className="py-10 text-center text-label-text text-gray-500">{t("paymentTypes.empty")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-200">
                <th className={TH_CLASS}>{t("paymentTypes.col.name")}</th>
                <th className={TH_CLASS}>{t("paymentTypes.col.scope")}</th>
                <th className={TH_CLASS}>{t("paymentTypes.col.description")}</th>
                <th className={`${TH_CLASS} text-center`}>{t("paymentTypes.col.status")}</th>
                <th className={`${TH_CLASS} w-36 text-center`}>{t("table.actions", { ns: "common" })}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {types.map((type) => (
                <tr key={type.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className={TD_CLASS}>
                    <span className="font-bold text-gray-900 whitespace-normal break-words">{type.name}</span>
                    {type.is_locked ? (
                      <Lock size={13} className="inline-block mr-1.5 text-gray-400 align-middle" />
                    ) : null}
                  </td>
                  <td className={TD_CLASS}>
                    <span className="whitespace-normal break-words">{scopeLabel(type.scope)}</span>
                  </td>
                  <td className={`${TD_CLASS} text-gray-600 whitespace-normal break-words`}>
                    {type.description || "—"}
                  </td>
                  <td className={`${TD_CLASS} text-center`}>
                    <button
                      type="button"
                      onClick={() => toggle(type)}
                      disabled={!canEdit || type.is_locked || busyId === type.id}
                      className="inline-flex items-center gap-1.5 cursor-pointer font-bold disabled:cursor-not-allowed"
                    >
                      {type.is_active ? (
                        <>
                          <ToggleRight size={18} className="text-emerald-600" />
                          <span className="text-caption-text font-bold text-emerald-700">
                            {t("paymentTypes.active")}
                          </span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft size={18} className="text-gray-400" />
                          <span className="text-caption-text text-gray-400">
                            {t("paymentTypes.inactive")}
                          </span>
                        </>
                      )}
                    </button>
                  </td>
                  <td className={`${TD_CLASS} text-center`}>
                    <div className="flex items-center justify-center gap-1.5">
                      {busyId === type.id ? (
                        <RefreshCw size={15} className="animate-spin text-gray-400" />
                      ) : null}
                      <TooltipButton
                        icon={<Save size={15} />}
                        tooltip={t("paymentTypes.edit")}
                        onClick={() => startEdit(type)}
                        disabled={!canEdit}
                        colorClass={`${ACTION_REST} hover:bg-gray-50 hover:text-gray-800`}
                      />
                      <TooltipButton
                        icon={<Trash2 size={15} />}
                        tooltip={t("paymentTypes.delete")}
                        onClick={() => remove(type)}
                        disabled={!canEdit || type.is_locked}
                        colorClass={`${ACTION_REST} hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200`}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
