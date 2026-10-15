import  { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Search, X, Loader2 } from "lucide-react";
import TooltipButton from "./TooltipButton";
import { useTranslation } from "react-i18next";

export default function SearchableInput({
  value = null,
  searchValue = "",
  onSearchChange,
  options = [],
  onSelect,
  onClear,
  loading = false,
  placeholder,
  noResultsText,
  getOptionLabel = (opt) => opt?.name || String(opt || ""),
  getOptionValue = (opt) => opt?.id || opt,
  renderOption = null,
  renderSelected = null,
  usePortal = true,
  className = "",
  inputClassName = "",
  disabled = false,
}) {
  const { t } = useTranslation("common");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const menuRef = useRef(null);
  const [coords, setCoords] = useState(null);

  const updatePosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < 260 && rect.top > 260;
    setCoords({
      top: openUp ? "auto" : `${rect.bottom + 4}px`,
      bottom: openUp ? `${window.innerHeight - rect.top + 4}px` : "auto",
      left: `${rect.left}px`,
      right: `${window.innerWidth - rect.right}px`,
      width: `${rect.width}px`,
    });
  };

  useEffect(() => {
    if (isOpen && usePortal) {
      updatePosition();
      const handleCloseOnScroll = (e) => {
        if (menuRef.current && menuRef.current.contains(e.target)) return;
        setIsOpen(false);
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
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    onSearchChange?.(val);
    if (!isOpen && val.trim().length > 0) {
      if (usePortal) updatePosition();
      setIsOpen(true);
    }
  };

  const handleSelect = (opt) => {
    onSelect?.(opt);
    setIsOpen(false);
    onSearchChange?.("");
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onClear?.();
    setIsOpen(false);
    onSearchChange?.("");
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const showDropdown = isOpen && searchValue.trim().length > 0;

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
              right: coords.right,
              width: coords.width,
              zIndex: 99999,
            }
          : undefined
      }
      className={`${
        usePortal ? "" : "absolute z-50 w-full mt-1"
      } bg-white border border-gray-200 rounded-card shadow-xl overflow-hidden animate-in fade-in-50 duration-150 max-h-64 flex flex-col`}
    >
      {loading && options.length > 0 && (
        <div className="py-2 px-3 bg-emerald-50/50 border-b border-emerald-100/60 flex items-center justify-center gap-2 text-[11px] text-emerald-800 font-medium">
          <Loader2 size={13} className="animate-spin text-emerald-600" />
          <span>{t("search.loading")}</span>
        </div>
      )}
      <div className="overflow-y-auto divide-y divide-gray-50 flex-1">
        {loading && options.length === 0 ? (
          <div className="py-5 px-3 flex items-center justify-center gap-2 text-xs text-gray-500">
            <Loader2 size={16} className="animate-spin text-emerald-600" />
            <span>{t("search.loading")}</span>
          </div>
        ) : options.length === 0 ? (
          <div className="py-5 px-3 text-center text-xs text-gray-400">
            {noResultsText || t("search.noResults")}
          </div>
        ) : (
          options.map((opt) => {
            const optVal = getOptionValue(opt);
            return (
              <button
                key={String(optVal)}
                type="button"
                onClick={() => handleSelect(opt)}
                className="w-full text-right px-3 py-2.5 hover:bg-emerald-50/70 transition-colors cursor-pointer block border-b border-gray-50 last:border-0"
              >
                {renderOption ? (
                  renderOption(opt)
                ) : (
                  <span className="text-xs text-gray-800 font-medium">
                    {getOptionLabel(opt)}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className={`relative w-full ${className}`} dir="rtl">
      {value ? (
        <div
          className={`w-full h-[40px] px-3 bg-white border border-emerald-500/80 ring-1 ring-emerald-500/20 rounded-input flex items-center justify-between gap-2 shadow-2xs ${
            disabled ? "opacity-60 pointer-events-none" : ""
          }`}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {renderSelected ? (
              renderSelected(value)
            ) : (
              <span className="text-xs font-bold text-gray-900 truncate">
                {getOptionLabel(value)}
              </span>
            )}
          </div>
          {!disabled && (
            <TooltipButton
              onClick={handleClear}
              tooltip={t("search.changeSelection")}
              className="p-1 hover:bg-rose-50 text-gray-400 hover:text-rose-600 rounded-btn transition-colors cursor-pointer shrink-0"
            >
              <X size={15} />
            </TooltipButton>
          )}
        </div>
      ) : (
        <div className="relative w-full">
          <input
            ref={inputRef}
            type="text"
            disabled={disabled}
            value={searchValue}
            onChange={handleInputChange}
            onFocus={() => {
              if (searchValue.trim().length > 0) {
                if (usePortal) updatePosition();
                setIsOpen(true);
              }
            }}
            placeholder={placeholder || t("search.placeholder")}
            className={`w-full h-[40px] pr-8 pl-3 bg-white border border-gray-300 rounded-input text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all ${inputClassName}`}
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
            {loading ? (
              <Loader2 size={15} className="animate-spin text-emerald-600" />
            ) : (
              <Search size={15} />
            )}
          </div>
          {searchValue && (
            <button
              type="button"
              onClick={() => {
                onSearchChange?.("");
                setIsOpen(false);
                inputRef.current?.focus();
              }}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {showDropdown && (
        usePortal && coords
          ? createPortal(menuContent, document.body)
          : (!usePortal && menuContent)
      )}
    </div>
  );
}
