import React from "react";
import { toEnglishDigits } from "../../utils";
const NOT_DECIMAL = /[^0-9.]/g;
const NOT_INTEGER = /[^0-9]/g;
const SEPARATORS = /[,\u060C\u066B\u066C]/g;
const sanitize = (raw, decimals) => {
  const text = toEnglishDigits(raw);
  if (!decimals) return text.replace(NOT_INTEGER, "");
  const cleaned = text.replace(SEPARATORS, ".").replace(NOT_DECIMAL, "");
  const parts = cleaned.split(".");
  return parts.length <= 1 ? cleaned : `${parts.shift()}.${parts.join("")}`;
};
const normalize = (text, min, max) => {
  if (text === "" || text === ".") return "";
  const value = Number(text);
  if (!Number.isFinite(value)) return "";
  if (min !== undefined && value < Number(min)) return String(min);
  if (max !== undefined && value > Number(max)) return String(max);
  return String(value);
};
export default function NumberField({
  value,
  onChange,
  decimals = false,
  min,
  max,
  onBlur,
  onFocus,
  dir = "ltr",
  ...rest
}) {
  const handleChange = (event) => onChange?.(sanitize(event.target.value, decimals));
  const handleBlur = (event) => {
    const settled = normalize(sanitize(event.target.value, decimals), min, max);
    if (settled !== String(value ?? "")) onChange?.(settled);
    onBlur?.(event);
  };
  const handleFocus = (event) => {
    event.target.select();
    onFocus?.(event);
  };
  return (
    <input
      {...rest}
      dir={dir}
      type="text"
      inputMode={decimals ? "decimal" : "numeric"}
      autoComplete="off"
      value={value ?? ""}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
    />
  );
}
