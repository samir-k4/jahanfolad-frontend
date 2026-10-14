// Global Automatic Persian/Dari to English Digits Converter
// تبدیل اتوماتیک و سراسری اعداد کیبورد دری/فارسی (۰ ۱ ۲ ۳ ۴ ۵ ۶ ۷ ۸ ۹) به اعداد انگلیسی (0-9)

export const persianDigitMap = {
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
  "٫": ".",
};

export { toEnglishDigits } from "./dariNumberFormatter";

/**
 * Helper to update React controlled inputs correctly.
 */
export function setNativeInputValue(element, value) {
  if (!element) return;
  const valueSetter = Object.getOwnPropertyDescriptor(element, "value")?.set;
  const prototype = Object.getPrototypeOf(element);
  const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;

  if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
    prototypeValueSetter.call(element, value);
  } else if (valueSetter) {
    valueSetter.call(element, value);
  } else {
    element.value = value;
  }

  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

/**
 * Initialize global event listeners on document to intercept and translate
 * Persian/Dari keyboard digits in real-time for ALL inputs in the application.
 */
export function initPersianDigitsAutoConverter() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  // 1. Keydown Interceptor: Handles direct keypresses (especially in <input type="number">)
  document.addEventListener(
    "keydown",
    (e) => {
      const target = e.target;
      if (
        !target ||
        (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA" && !target.isContentEditable)
      ) {
        return;
      }

      // Ignore special shortcut combinations (e.g. Ctrl+C, Cmd+V, Alt+...)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key;
      if (persianDigitMap[key] !== undefined) {
        e.preventDefault();
        e.stopPropagation();
        const engDigit = persianDigitMap[key];

        const isNumberInput = target.tagName === "INPUT" && target.type === "number";

        if (isNumberInput) {
          // type="number" doesn't allow document.execCommand or selectionStart in some browsers
          const currentVal = target.value || "";
          const newVal = currentVal + engDigit;
          setNativeInputValue(target, newVal);
        } else {
          // Text / Tel / Textarea inputs support execCommand or standard cursor insertion
          let inserted = false;
          try {
            if (document.execCommand) {
              inserted = document.execCommand("insertText", false, engDigit);
            }
          } catch {}

          if (!inserted) {
            try {
              const start = target.selectionStart ?? target.value.length;
              const end = target.selectionEnd ?? target.value.length;
              const val = target.value || "";
              const newVal = val.slice(0, start) + engDigit + val.slice(end);
              setNativeInputValue(target, newVal);
              target.setSelectionRange?.(start + 1, start + 1);
            } catch {
              setNativeInputValue(target, (target.value || "") + engDigit);
            }
          }
        }
      }
    },
    true // Capture phase to intercept before native browser blocker
  );

  // 2. Paste Interceptor: Automatically translates pasted Persian/Dari numbers
  document.addEventListener(
    "paste",
    (e) => {
      const target = e.target;
      if (
        !target ||
        (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA" && !target.isContentEditable)
      ) {
        return;
      }

      const clipboardData = e.clipboardData || window.clipboardData;
      if (!clipboardData) return;

      const text = clipboardData.getData("text");
      if (!text || !/[۰-۹٠-٩٫]/.test(text)) return;

      e.preventDefault();
      const convertedText = toEnglishDigits(text);

      const isNumberInput = target.tagName === "INPUT" && target.type === "number";
      if (isNumberInput) {
        setNativeInputValue(target, convertedText);
      } else {
        let inserted = false;
        try {
          if (document.execCommand) {
            inserted = document.execCommand("insertText", false, convertedText);
          }
        } catch {}

        if (!inserted) {
          try {
            const start = target.selectionStart ?? target.value.length;
            const end = target.selectionEnd ?? target.value.length;
            const val = target.value || "";
            const newVal = val.slice(0, start) + convertedText + val.slice(end);
            setNativeInputValue(target, newVal);
            target.setSelectionRange?.(start + convertedText.length, start + convertedText.length);
          } catch {
            setNativeInputValue(target, (target.value || "") + convertedText);
          }
        }
      }
    },
    true
  );

  // 3. Fallback Input Event Interceptor: Cleans any residual Persian digits
  document.addEventListener(
    "input",
    (e) => {
      const target = e.target;
      if (
        !target ||
        (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA")
      ) {
        return;
      }

      if (target.type === "number") return; // type="number" value can't contain non-ASCII

      const val = target.value;
      if (val && /[۰-۹٠-٩٫]/.test(val)) {
        const converted = toEnglishDigits(val);
        if (converted !== val) {
          try {
            const start = target.selectionStart;
            const end = target.selectionEnd;
            setNativeInputValue(target, converted);
            if (start !== null && end !== null) {
              target.setSelectionRange?.(start, end);
            }
          } catch {
            setNativeInputValue(target, converted);
          }
        }
      }
    },
    true
  );
}

export default initPersianDigitsAutoConverter;
