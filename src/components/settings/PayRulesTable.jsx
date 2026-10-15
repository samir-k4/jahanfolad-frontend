import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, RefreshCw, Save } from "lucide-react";
import { apiFetch, apiList } from "../../api";
import { CustomDropdown } from "../common";
import { showToast } from "../../utils";
const PAY_MODE = { DAILY: "daily", MONTHLY: "monthly" };
const MONTH_BASIS = { FIXED: "fixed_30", ACTUAL: "actual" };
const UNRECORDED = { PRESENT: "present", ABSENT: "absent" };
const RULE_FIELDS = [
  "pay_mode",
  "month_basis",
  "paid_leave",
  "paid_sick_leave",
  "unrecorded_day",
  "overtime_eligible",
  "payout_receiver",
];
const TH_CLASS = "p-3 rounded-none text-table-header-text font-bold text-gray-700 whitespace-normal break-words";
const TD_CLASS = "p-3 rounded-none text-table-cell-text text-gray-800";
const DROPDOWN_BTN_CLASS =
  "w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-input text-label-text font-bold text-gray-800";
const SAVE_BTN_CLASS =
  "px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-btn-text font-bold rounded-btn inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";
const normalize = (category) => ({
  pay_mode: category.pay_mode || PAY_MODE.DAILY,
  month_basis: category.month_basis || MONTH_BASIS.ACTUAL,
  paid_leave: Boolean(category.paid_leave),
  paid_sick_leave: Boolean(category.paid_sick_leave),
  unrecorded_day: category.unrecorded_day || UNRECORDED.PRESENT,
  overtime_eligible: Boolean(category.overtime_eligible),
  payout_receiver: Boolean(category.payout_receiver),
});
const isDirty = (category, draft) =>
  RULE_FIELDS.some((field) => normalize(category)[field] !== draft[field]);
const RuleCheckbox = ({ checked, onChange, label, disabled }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    disabled={disabled}
    aria-pressed={checked}
    aria-label={label}
    className={`w-6 h-6 rounded-input border flex items-center justify-center transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
      checked
        ? "bg-slate-800 border-slate-800 text-white"
        : "bg-white border-gray-300 text-transparent hover:border-gray-400"
    }`}
  >
    <Check size={14} />
  </button>
);
export default function PayRulesTable({ canEdit = false }) {
  const { t } = useTranslation("settings");
  const [categories, setCategories] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const payModeOptions = useMemo(
    () => [
      { value: PAY_MODE.DAILY, label: t("payRules.payMode.daily") },
      { value: PAY_MODE.MONTHLY, label: t("payRules.payMode.monthly") },
    ],
    [t],
  );
  const basisOptions = useMemo(
    () => [
      { value: MONTH_BASIS.FIXED, label: t("payRules.basis.fixed") },
      { value: MONTH_BASIS.ACTUAL, label: t("payRules.basis.actual") },
    ],
    [t],
  );
  const unrecordedOptions = useMemo(
    () => [
      { value: UNRECORDED.PRESENT, label: t("payRules.unrecorded.present") },
      { value: UNRECORDED.ABSENT, label: t("payRules.unrecorded.absent") },
    ],
    [t],
  );
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await apiList("/categories/job_category");
      setCategories(list);
      setDrafts(Object.fromEntries(list.map((category) => [category.id, normalize(category)])));
    } catch (err) {
      showToast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const setField = (id, field, value) =>
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  const save = async (category) => {
    const draft = drafts[category.id];
    if (!draft) return;
    setSavingId(category.id);
    try {
      const data = await apiFetch(`/categories/job_category/${category.id}`, {
        method: "PUT",
        body: {
          name: category.name,
          description: category.description ?? null,
          is_active: category.is_active ?? true,
          ...draft,
        },
      });
      const saved = data?.data || { ...category, ...draft };
      setCategories((prev) => prev.map((row) => (row.id === category.id ? saved : row)));
      setDrafts((prev) => ({ ...prev, [category.id]: normalize(saved) }));
      showToast.success(t("payRules.saved", { name: category.name }));
    } catch (err) {
      showToast.error(err.message);
      setDrafts((prev) => ({ ...prev, [category.id]: normalize(category) }));
    } finally {
      setSavingId(null);
    }
  };
  return (
    <div className="p-4 space-y-3">
      <p className="text-caption-text text-gray-500 whitespace-normal break-words">
        {t("payRules.formula")}
      </p>
      {loading ? (
        <p className="py-10 text-center text-label-text text-gray-500">{t("payRules.loading")}</p>
      ) : categories.length === 0 ? (
        <p className="py-10 text-center text-label-text text-gray-500">{t("payRules.empty")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-200">
                <th className={TH_CLASS}>{t("payRules.col.category")}</th>
                <th className={`${TH_CLASS} text-center`}>{t("payRules.col.payMode")}</th>
                <th className={`${TH_CLASS} text-center`}>{t("payRules.col.basis")}</th>
                <th className={`${TH_CLASS} text-center`}>{t("payRules.col.unrecorded")}</th>
                <th className={`${TH_CLASS} text-center`}>{t("payRules.col.paidLeave")}</th>
                <th className={`${TH_CLASS} text-center`}>{t("payRules.col.paidSick")}</th>
                <th className={`${TH_CLASS} text-center`}>{t("payRules.col.overtime")}</th>
                <th className={`${TH_CLASS} text-center`}>{t("payRules.col.payoutReceiver")}</th>
                <th className={`${TH_CLASS} w-36 text-center`}>{t("table.actions", { ns: "common" })}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {categories.map((category) => {
                const draft = drafts[category.id] || normalize(category);
                const dirty = isDirty(category, draft);
                return (
                  <tr key={category.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className={TD_CLASS}>
                      <span className="font-bold text-gray-900 whitespace-normal break-words">
                        {category.name}
                      </span>
                    </td>
                    <td className={`${TD_CLASS} text-center min-w-[9rem]`}>
                      <CustomDropdown
                        value={draft.pay_mode}
                        onChange={(value) => setField(category.id, "pay_mode", value)}
                        options={payModeOptions}
                        disabled={!canEdit}
                        buttonClassName={DROPDOWN_BTN_CLASS}
                        className="w-full"
                        usePortal
                        width="w-44"
                      />
                    </td>
                    <td className={`${TD_CLASS} text-center min-w-[10rem]`}>
                      <CustomDropdown
                        value={draft.month_basis}
                        onChange={(value) => setField(category.id, "month_basis", value)}
                        options={basisOptions}
                        disabled={!canEdit}
                        buttonClassName={DROPDOWN_BTN_CLASS}
                        className="w-full"
                        usePortal
                        width="w-52"
                      />
                    </td>
                    <td className={`${TD_CLASS} text-center min-w-[10rem]`}>
                      <CustomDropdown
                        value={draft.unrecorded_day}
                        onChange={(value) => setField(category.id, "unrecorded_day", value)}
                        options={unrecordedOptions}
                        disabled={!canEdit}
                        buttonClassName={DROPDOWN_BTN_CLASS}
                        className="w-full"
                        usePortal
                        width="w-52"
                      />
                    </td>
                    <td className={`${TD_CLASS} text-center`}>
                      <div className="flex justify-center">
                        <RuleCheckbox
                          checked={draft.paid_leave}
                          onChange={(value) => setField(category.id, "paid_leave", value)}
                          label={t("payRules.col.paidLeave")}
                          disabled={!canEdit}
                        />
                      </div>
                    </td>
                    <td className={`${TD_CLASS} text-center`}>
                      <div className="flex justify-center">
                        <RuleCheckbox
                          checked={draft.paid_sick_leave}
                          onChange={(value) => setField(category.id, "paid_sick_leave", value)}
                          label={t("payRules.col.paidSick")}
                          disabled={!canEdit}
                        />
                      </div>
                    </td>
                    <td className={`${TD_CLASS} text-center`}>
                      <div className="flex justify-center">
                        <RuleCheckbox
                          checked={draft.overtime_eligible}
                          onChange={(value) => setField(category.id, "overtime_eligible", value)}
                          label={t("payRules.col.overtime")}
                          disabled={!canEdit}
                        />
                      </div>
                    </td>
                    <td className={`${TD_CLASS} text-center`}>
                      <div className="flex justify-center">
                        <RuleCheckbox
                          checked={draft.payout_receiver}
                          onChange={(value) => setField(category.id, "payout_receiver", value)}
                          label={t("payRules.col.payoutReceiver")}
                          disabled={!canEdit}
                        />
                      </div>
                    </td>
                    <td className={`${TD_CLASS} text-center`}>
                      <button
                        type="button"
                        onClick={() => save(category)}
                        disabled={!canEdit || !dirty || savingId === category.id}
                        className={SAVE_BTN_CLASS}
                      >
                        {savingId === category.id ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <Save size={14} />
                        )}
                        <span>{t("branches.save")}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
