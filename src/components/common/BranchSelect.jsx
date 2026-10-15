import { useMemo } from "react";
import CustomDropdown from "./CustomDropdown";
import SearchableSelect from "./SearchableSelect";
import { useTranslation } from "react-i18next";
import { useBranch } from "../../context/BranchContext";
export default function BranchSelect({
  value,
  onChange,
  includeAll = false,
  allLabel,
  placeholder,
  variant = "dropdown",
  forceShow = false,
  disabled = false,
  icon = null,
  className = "",
  buttonClassName = "",
  width = "w-48",
  align = "right",
  usePortal = true,
}) {
  const { t } = useTranslation("common");
  const { branches, isMultiBranch } = useBranch();
  const resolvedAllLabel = allLabel ?? t("branch.all");
  const resolvedPlaceholder = placeholder ?? t("filters.selectBranch");
  const options = useMemo(() => {
    const branchOptions = branches.map((b) => ({
      value: String(b.id),
      label: b.name,
    }));
    return includeAll
      ? [{ value: "all", label: resolvedAllLabel }, ...branchOptions]
      : branchOptions;
  }, [branches, includeAll, resolvedAllLabel]);
  if (!forceShow && !isMultiBranch) return null;
  if (variant === "searchable") {
    return (
      <SearchableSelect
        options={options}
        value={value ? String(value) : ""}
        onChange={onChange}
        placeholder={resolvedPlaceholder}
        disabled={disabled}
        usePortal={usePortal}
        getOptionLabel={(opt) => opt.label}
        getOptionValue={(opt) => opt.value}
        className={className}
        buttonClassName={buttonClassName}
      />
    );
  }
  return (
    <CustomDropdown
      options={options}
      value={value ? String(value) : ""}
      onChange={onChange}
      placeholder={resolvedPlaceholder}
      disabled={disabled}
      icon={icon}
      usePortal={usePortal}
      className={className}
      buttonClassName={buttonClassName}
      width={width}
      align={align}
    />
  );
}
