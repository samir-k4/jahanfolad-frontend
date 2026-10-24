import React, { useEffect, useState } from "react";
import { toast, Toaster } from "sonner";
import "sonner/dist/styles.css";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  RotateCcw,
} from "lucide-react";

const TOAST_TYPES = {
  success: {
    icon: CheckCircle2,
    mainBg: "bg-emerald-800",
    border: "border-emerald-700",
    shadow: "shadow-emerald-950/40",
    iconBg: "bg-emerald-900/60 border-emerald-600/50",
    iconColor: "text-emerald-100",
    textColor: "text-white",
    descColor: "text-emerald-100/80",
    barTrack: "bg-emerald-950/60",
    barColor: "bg-emerald-300",
    closeBtn: "text-emerald-200 hover:text-white hover:bg-emerald-700/60",
  },
  error: {
    icon: AlertCircle,
    mainBg: "bg-rose-800",
    border: "border-rose-700",
    shadow: "shadow-rose-950/40",
    iconBg: "bg-rose-900/60 border-rose-600/50",
    iconColor: "text-rose-100",
    textColor: "text-white",
    descColor: "text-rose-100/80",
    barTrack: "bg-rose-950/60",
    barColor: "bg-rose-300",
    closeBtn: "text-rose-200 hover:text-white hover:bg-rose-700/60",
  },
  warning: {
    icon: AlertTriangle,
    mainBg: "bg-amber-800",
    border: "border-amber-700",
    shadow: "shadow-amber-950/40",
    iconBg: "bg-amber-900/60 border-amber-600/50",
    iconColor: "text-amber-100",
    textColor: "text-white",
    descColor: "text-amber-100/80",
    barTrack: "bg-amber-950/60",
    barColor: "bg-amber-300",
    closeBtn: "text-amber-200 hover:text-white hover:bg-amber-700/60",
  },
  info: {
    icon: Info,
    mainBg: "bg-sky-800",
    border: "border-sky-700",
    shadow: "shadow-sky-950/40",
    iconBg: "bg-sky-900/60 border-sky-600/50",
    iconColor: "text-sky-100",
    textColor: "text-white",
    descColor: "text-sky-100/80",
    barTrack: "bg-sky-950/60",
    barColor: "bg-sky-300",
    closeBtn: "text-sky-200 hover:text-white hover:bg-sky-700/60",
  },
};

function ToastCard({ id, type, message, description, duration, action, spawnedAt }) {
  const config = TOAST_TYPES[type] || TOAST_TYPES.info;
  const IconComponent = config.icon;
  const [progressWidth, setProgressWidth] = useState("100%");

  useEffect(() => {
    setProgressWidth("100%");
    const timer = setTimeout(() => {
      setProgressWidth("0%");
    }, 40);
    return () => clearTimeout(timer);
  }, [spawnedAt]);

  return (
    <div
      dir="rtl"
      className={`relative flex flex-col ${config.mainBg} ${config.textColor} rounded-card border ${config.border} shadow-2xl ${config.shadow} overflow-hidden min-w-[320px] max-w-[440px] w-full font-sans select-none pointer-events-auto`}
    >
      <div className="p-3.5 flex items-center gap-3">
        <div
          className={`p-1.5 rounded-btn border ${config.iconBg} ${config.iconColor} shrink-0`}
        >
          <IconComponent size={18} />
        </div>

        <div className="flex-1 min-w-0 pr-0.5">
          <div className="text-sm font-bold leading-snug">
            {message}
          </div>
          {description && (
            <div className={`text-xs ${config.descColor} mt-0.5 leading-relaxed`}>
              {description}
            </div>
          )}
        </div>

        {action && (
          <button
            type="button"
            onClick={() => {
              if (action.onClick) action.onClick();
              toast.dismiss(id);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-btn bg-white/20 hover:bg-white/30 active:scale-95 text-white font-bold text-xs tracking-wide border border-white/30 transition-all cursor-pointer shrink-0 shadow-xs"
          >
            <RotateCcw size={12} className="shrink-0" />
            <span>{action.label || "لغو"}</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => toast.dismiss(id)}
          className={`p-1 rounded-btn transition-colors cursor-pointer shrink-0 -ml-1 ${config.closeBtn}`}
        >
          <X size={15} />
        </button>
      </div>

      {/* Dynamic Animated Progress Bar */}
      <div className={`h-1 ${config.barTrack} w-full overflow-hidden`}>
        <div
          className={`h-full ${config.barColor}`}
          style={{
            width: progressWidth,
            transition: `width ${duration}ms linear`,
          }}
        />
      </div>
    </div>
  );
}

const toastKey = (type, message, description) => {
  const text = typeof message === "string" ? message : JSON.stringify(message);
  const desc = typeof description === "string" ? description : "";
  return `${type}::${text}::${desc}`;
};

const spawnCustomToast = (type, message, options = {}) => {
  const isOptionsObject = typeof options === "object" && options !== null;
  const defaultDuration = isOptionsObject && options.action ? 4000 : 5000;
  const duration =
    typeof options === "number" ? options : (isOptionsObject && options.duration) || defaultDuration;
  const description = isOptionsObject ? options.description : undefined;
  const action = isOptionsObject ? options.action : undefined;
  const id = (isOptionsObject && options.id) || toastKey(type, message, description);
  const spawnedAt = Date.now();

  return toast.custom(
    (t) => (
      <ToastCard
        id={t}
        type={type}
        message={message}
        description={description}
        duration={duration}
        action={action}
        spawnedAt={spawnedAt}
      />
    ),
    { duration, id }
  );
};

export const showToast = (typeOrMsg, maybeMsgOrOpts, maybeOpts) => {
  if (["success", "error", "warning", "info"].includes(typeOrMsg)) {
    return spawnCustomToast(typeOrMsg, maybeMsgOrOpts, maybeOpts);
  }
  return spawnCustomToast("info", typeOrMsg, maybeMsgOrOpts);
};

showToast.success = (message, options) =>
  spawnCustomToast("success", message, options);
showToast.error = (message, options) =>
  spawnCustomToast("error", message, options);
showToast.warning = (message, options) =>
  spawnCustomToast("warning", message, options);
showToast.info = (message, options) =>
  spawnCustomToast("info", message, options);
showToast.dismiss = (id) => toast.dismiss(id);


let undoSequence = 0;

showToast.undo = (
  message,
  { onUndo, onConfirm, duration = 4000, description, actionLabel = "لغو" } = {}
) => {
  let isUndone = false;
  let confirmTimer = null;

  const handleUndo = () => {
    isUndone = true;
    if (confirmTimer) clearTimeout(confirmTimer);
    if (onUndo) onUndo();
  };

  confirmTimer = setTimeout(() => {
    if (!isUndone && onConfirm) {
      onConfirm();
    }
  }, duration);

  return spawnCustomToast("warning", message, {
    duration,
    description,
    id: `undo::${undoSequence++}`,
    action: {
      label: actionLabel,
      onClick: handleUndo,
    },
  });
};

export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      dir="rtl"
      toastOptions={{
        unstyled: true,
        className: "pointer-events-auto font-sans",
      }}
      gap={10}
      offset="20px"
    />
  );
}

export default showToast;
