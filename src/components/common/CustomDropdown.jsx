import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";

export default function CustomDropdown({
  trigger,
  options = [],
  value,
  onChange,
  placeholder = "انتخاب...",
  icon = null,
  header = null,
  align = "left",
  width = "w-56",
  disabled = false,
  className = "",
  buttonClassName = "",
  menuClassName = "",
  usePortal = false,
  children,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const menuRef = useRef(null);
  const [coords, setCoords] = useState(null);

  const updatePosition = () => {
    if (!dropdownRef.current) return;
    const rect = dropdownRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < 220 && rect.top > 220;
    setCoords({
      top: openUp ? "auto" : `${rect.bottom + 4}px`,
      bottom: openUp ? `${window.innerHeight - rect.top + 4}px` : "auto",
      left: align === "left" ? `${rect.left}px` : "auto",
      right: align === "right" ? `${window.innerWidth - rect.right}px` : "auto",
      minWidth: `${rect.width}px`,
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
      const inDropdown = dropdownRef.current && dropdownRef.current.contains(event.target);
      const inMenu = menuRef.current && menuRef.current.contains(event.target);
      if (!inDropdown && !inMenu) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const selectedOption = useMemo(() => {
    if (value === null || value === undefined) return null;
    return (
      options.find((opt) => {
        const optVal =
          opt && typeof opt === "object" ? (opt.value ?? opt.id) : opt;
        return String(optVal) === String(value);
      }) || null
    );
  }, [options, value]);

  const getOptionLabel = (opt) => {
    if (!opt) return "";
    if (typeof opt === "object") {
      return opt.label ?? opt.name ?? String(opt.value ?? opt.id ?? "");
    }
    return String(opt);
  };

  const getOptionValue = (opt) => {
    if (opt && typeof opt === "object") {
      return opt.value ?? opt.id ?? opt;
    }
    return opt;
  };

  const handleSelect = (opt) => {
    if (opt?.disabled) return;
    if (opt?.onClick) {
      opt.onClick();
    } else {
      const val = getOptionValue(opt);
      onChange?.(val, opt);
    }
    setIsOpen(false);
  };

  const toggle = () => {
    if (!disabled) setIsOpen((prev) => !prev);
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
              right: coords.right,
              minWidth: coords.minWidth,
              zIndex: 99999,
            }
          : undefined
      }
      className={`${
        usePortal
          ? ""
          : `absolute ${align === "right" ? "right-0" : "left-0"} mt-1.5 ${width}`
      } bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden font-sans animate-in fade-in zoom-in-95 duration-100 ${menuClassName}`}
    >
      {header && (
        <div className="px-3.5 py-2 bg-gray-50 border-b border-gray-200 text-caption-text font-bold text-gray-500">
          {header}
        </div>
      )}

      {children ? (
        children
      ) : (
        <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
          {options.map((opt, idx) => {
            if (opt?.divider) {
              return (
                <div key={`div-${idx}`} className="border-b border-gray-100 my-1" />
              );
            }

            const optVal = getOptionValue(opt);
            const isSelected =
              value !== undefined &&
              value !== null &&
              String(optVal) === String(value);

            return (
              <button
                key={optVal !== undefined && optVal !== null ? String(optVal) : idx}
                type="button"
                disabled={opt?.disabled}
                onClick={() => handleSelect(opt)}
                className={`w-full text-right px-4 py-2.5 text-table-cell-text flex items-center justify-between transition-colors ${
                  opt?.disabled
                    ? "text-gray-300 cursor-not-allowed bg-gray-50/50"
                    : opt?.danger
                      ? "text-rose-600 hover:bg-rose-50 cursor-pointer"
                      : isSelected
                        ? "bg-slate-50 font-bold text-slate-900"
                        : "text-gray-700 hover:bg-gray-50 cursor-pointer"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {opt?.icon && <span className="shrink-0">{opt.icon}</span>}
                  <span className="truncate">{getOptionLabel(opt)}</span>
                  {opt?.badge !== undefined && opt?.badge !== null && (
                    <span className="text-[11px] font-mono px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                      {opt.badge}
                    </span>
                  )}
                </div>
                {isSelected && (
                  <Check size={15} className="text-slate-800 shrink-0 mr-2" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div
      ref={dropdownRef}
      className={`relative inline-block ${className}`}
      dir="rtl"
    >
      {typeof trigger === "function" ? (
        trigger({ isOpen, selectedOption, toggle })
      ) : trigger ? (
        <div onClick={toggle} className="cursor-pointer">
          {trigger}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={toggle}
          className={`inline-flex items-center justify-between gap-2 border rounded-lg transition-colors text-right outline-none ${
            disabled
              ? "bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed"
              : isOpen
                ? "bg-white text-gray-900 border-slate-800 ring-1 ring-slate-800 shadow-xs"
                : "bg-white text-gray-800 border-gray-300 hover:border-gray-400 focus:border-slate-800 cursor-pointer shadow-xs"
          } ${buttonClassName || "px-3.5 py-2 text-table-cell-text font-medium"}`}
        >
          <div className="flex items-center gap-1.5 truncate">
            {icon && <span className="shrink-0">{icon}</span>}
            <span
              className={`truncate ${
                !selectedOption && value === undefined
                  ? "text-gray-400"
                  : "text-gray-800 font-medium"
              }`}
            >
              {selectedOption ? getOptionLabel(selectedOption) : placeholder}
            </span>
            {selectedOption?.badge !== undefined && selectedOption?.badge !== null && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200 shrink-0">
                {selectedOption.badge}
              </span>
            )}
          </div>
          <ChevronDown
            size={14}
            className={`text-gray-500 shrink-0 transition-transform duration-150 ${
              isOpen ? "rotate-180 text-slate-800" : ""
            }`}
          />
        </button>
      )}

      {isOpen && (usePortal && coords ? createPortal(menuContent, document.body) : (!usePortal && menuContent))}
    </div>
  );
}
