import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search, X, Check } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = "",
  searchPlaceholder = "",
  noResultsText = "",
  disabled = false,
  getOptionLabel = (opt) =>
    opt && typeof opt === "object"
      ? opt.label ?? opt.name ?? String(opt)
      : String(opt ?? ""),
  getOptionValue = (opt) =>
    opt && typeof opt === "object" ? opt.value ?? opt.id ?? opt : opt,
  className = "",
  buttonClassName = "",
  menuClassName = "",
  searchValue,
  onSearchChange,
  loading = false,
  renderOption,
  usePortal = false,
}) {
  const { t } = useTranslation("common");
  const [isOpen, setIsOpen] = useState(false);
  const [internalSearchTerm, setInternalSearchTerm] = useState("");
  const searchTerm = searchValue !== undefined ? searchValue : internalSearchTerm;
  const containerRef = useRef(null);
  const menuRef = useRef(null);
  const searchInputRef = useRef(null);
  const [coords, setCoords] = useState(null);

  const handleSearchChange = (val) => {
    if (searchValue === undefined) {
      setInternalSearchTerm(val);
    }
    onSearchChange?.(val);
  };

  const updatePosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < 260 && rect.top > 260;
    const viewportPadding = Math.min(8, window.innerWidth / 2);
    const menuWidth = Math.min(
      Math.max(rect.width, 240),
      window.innerWidth - viewportPadding * 2,
    );
    const left = Math.min(
      Math.max(rect.left, viewportPadding),
      window.innerWidth - menuWidth - viewportPadding,
    );
    setCoords({
      top: openUp ? "auto" : `${rect.bottom + 4}px`,
      bottom: openUp ? `${window.innerHeight - rect.top + 4}px` : "auto",
      left: `${left}px`,
      width: `${menuWidth}px`,
    });
  };

  useEffect(() => {
    if (isOpen && usePortal) {
      updatePosition();
      const handleCloseOnScroll = (e) => {
        if (menuRef.current && menuRef.current.contains(e.target)) return;
        setIsOpen(false);
        handleSearchChange("");
      };
      window.addEventListener("scroll", handleCloseOnScroll, true);
      window.addEventListener("resize", handleCloseOnScroll);
      return () => {
        window.removeEventListener("scroll", handleCloseOnScroll, true);
        window.removeEventListener("resize", handleCloseOnScroll);
      };
    }
  }, [isOpen, usePortal]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const inContainer = containerRef.current && containerRef.current.contains(event.target);
      const inMenu = menuRef.current && menuRef.current.contains(event.target);
      if (!inContainer && !inMenu) {
        setIsOpen(false);
        handleSearchChange("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const selectedOption = useMemo(() => {
    if (value === null || value === undefined || value === "") return null;
    return (
      options.find(
        (opt) => String(getOptionValue(opt)) === String(value),
      ) || null
    );
  }, [options, value, getOptionValue]);

  const filteredOptions = useMemo(() => {
    if (onSearchChange) return options;
    if (!searchTerm.trim()) return options;
    const term = searchTerm.replace(/\u200E/g, "").toLowerCase().trim();
    return options.filter((opt) => {
      const label = String(getOptionLabel(opt))
        .replace(/\u200E/g, "")
        .toLowerCase();
      return label.includes(term);
    });
  }, [options, searchTerm, onSearchChange, getOptionLabel]);

  const handleSelect = (opt) => {
    const val = getOptionValue(opt);
    onChange?.(val, opt);
    setIsOpen(false);
    handleSearchChange("");
  };

  const menuContent = (
    <div
      ref={menuRef}
      dir="rtl"
      style={
        usePortal && coords
          ? {
              position: "fixed",
              top: coords.top,
              bottom: coords.bottom,
              left: coords.left,
              width: coords.width,
              zIndex: 99999,
            }
          : undefined
      }
      className={`${
        usePortal ? "" : "absolute z-50 w-full mt-1"
      } bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in-50 duration-150 ${menuClassName}`}
    >
      <div className="p-2 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
        <Search size={14} className="text-gray-400 shrink-0" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full bg-white border border-gray-300 rounded-lg py-1.5 px-2.5 text-xs placeholder:text-gray-400 text-gray-800 focus:border-emerald-600 outline-none"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => handleSearchChange("")}
            className="text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
          >
            <X size={14} />
          </button>
        )}
      </div>
      <div className="max-h-60 overflow-y-auto divide-y divide-gray-50">
        {loading ? (
          <div className="p-3 text-center text-xs text-gray-400">
            {t("search.loading")}
          </div>
        ) : filteredOptions.length === 0 ? (
          <div className="p-3 text-center text-xs text-gray-400">
            {noResultsText || t("search.noResults")}
          </div>
        ) : (
          filteredOptions.map((opt, idx) => {
            const optVal = getOptionValue(opt);
            const isSelected = String(optVal) === String(value);
            return (
              <button
                key={
                  optVal !== undefined &&
                  optVal !== null &&
                  optVal !== ""
                    ? String(optVal)
                    : idx
                }
                type="button"
                onClick={() => handleSelect(opt)}
                className={`w-full text-right px-3.5 py-2.5 text-xs transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                  isSelected
                    ? "bg-emerald-50 font-bold text-emerald-900"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <div className="flex-1 text-right overflow-hidden">
                  {renderOption ? (
                    renderOption(opt, isSelected)
                  ) : (
                    <span className="block truncate">{getOptionLabel(opt)}</span>
                  )}
                </div>
                {isSelected && (
                  <Check
                    size={14}
                    className="text-emerald-600 shrink-0 mr-1"
                  />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div
      ref={containerRef}
      className={`relative ${className || "w-full"}`}
      dir="rtl"
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            if (!isOpen && usePortal) {
              updatePosition();
            }
            setIsOpen((prev) => !prev);
          }
        }}
        className={`w-full flex items-center justify-between border rounded-lg transition-colors cursor-pointer outline-none ${
          disabled
            ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
            : isOpen
              ? "bg-white text-gray-900 border-slate-800 ring-1 ring-slate-800"
              : "bg-white text-gray-800 border-gray-300 hover:border-gray-400 focus:border-slate-800"
        } ${buttonClassName || "h-10 px-3 text-xs"}`}
      >
        <span
          className={`truncate block text-right flex-1 ${
            !selectedOption ? "text-gray-400" : "text-gray-800 font-medium"
          }`}
        >
          {selectedOption ? getOptionLabel(selectedOption) : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 transition-transform duration-150 mr-1.5 ${
            disabled ? "text-gray-300" : "text-gray-500"
          } ${isOpen ? "rotate-180 text-slate-800" : ""}`}
        />
      </button>

      {isOpen && !disabled && (
        usePortal && coords ? createPortal(menuContent, document.body) : (!usePortal && menuContent)
      )}
    </div>
  );
}
