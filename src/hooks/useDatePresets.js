import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  getDatePresetRange,
  DEFAULT_DATE_PRESET_KEYS,
  buildPresets,
} from "../utils/datePresets";

export default function useDatePresets(initialPreset = "this_month") {
  const { t } = useTranslation("common");
  const [activePreset, setActivePreset] = useState(initialPreset);
  const initialRange = getDatePresetRange(initialPreset);
  const [fromDate, setFromDate] = useState(initialRange.fromDate);
  const [toDate, setToDate] = useState(initialRange.toDate);

  const applyPreset = useCallback((preset) => {
    setActivePreset(preset);
    if (preset === "custom") {
      return;
    }
    const range = getDatePresetRange(preset);
    setFromDate(range.fromDate);
    setToDate(range.toDate);
  }, []);

  const presets = useMemo(
    () => buildPresets(DEFAULT_DATE_PRESET_KEYS, t),
    [t],
  );
  return {
    activePreset,
    setActivePreset,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    applyPreset,
    presets,
  };
}
