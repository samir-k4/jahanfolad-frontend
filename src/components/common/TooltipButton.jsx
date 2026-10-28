import React from "react";

export default function TooltipButton({
  icon,
  iconProps,
  tooltip,
  ariaLabel,
  onClick,
  disabled = false,
  colorClass = "",
  className = "",
  children,
}) {
  const renderIcon = () => {
    if (!icon) return children || null;
    if (React.isValidElement(icon)) return icon;
    if (typeof icon === "function" || (typeof icon === "object" && icon !== null && icon.$$typeof)) {
      const IconComponent = icon;
      return <IconComponent size={15} {...(iconProps || {})} />;
    }
    return children || null;
  };
  return (
    <div className="relative group/tip inline-flex">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel}
        className={`p-1.5 rounded-btn transition-colors cursor-pointer disabled:opacity-40 ${colorClass} ${className}`}
      >
        {renderIcon()}
      </button>
      {tooltip && (
        <div
          className="absolute bottom-full left-0 mb-1.5 hidden group-hover/tip:flex flex-col items-start pointer-events-none z-50 w-max max-w-[14rem] animate-in fade-in zoom-in-95 duration-150"
          dir="rtl"
        >
          <div className="bg-slate-900 text-white text-xs font-bold leading-relaxed text-right whitespace-normal break-words py-1 px-2.5 rounded-tooltip shadow-xl border border-slate-700">
            {tooltip}
          </div>
          <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 -mt-0.5 mr-auto ml-2.5 border-r border-b border-slate-700" />
        </div>
      )}
    </div>
  );
}
