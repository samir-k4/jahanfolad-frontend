
export default function FilterPresetButtons({
  presets = [],
  activeKey,
  onChange,
  buttonClassName = "px-3 py-1.5 rounded-pill text-caption-text",
  className = "flex flex-wrap items-center gap-2",
}) {
  return (
    <div className={className}>
      {presets.map((p) => {
        const isActive = activeKey === p.key;

        return (
          <button
            key={p.key}
            type="button"
            onClick={() => onChange?.(p.key)}
            className={`${buttonClassName} transition-colors cursor-pointer border ${
              isActive
                ? "bg-slate-800 text-white border-slate-800 font-bold shadow-2xs"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 font-medium"
            }`}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
