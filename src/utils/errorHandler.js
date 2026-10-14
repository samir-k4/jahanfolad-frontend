/**
 * Safe Error Handler & Sanitizer
 * 
 * Prevents raw SQL queries, database credentials, table/column names,
 * and fatal server traces from leaking into the UI.
 * 
 * Ensures all technical errors are logged to the browser console for developer inspection
 * while showing friendly, localized messages to end users.
 */

const TECHNICAL_PATTERNS = [
  /SQLSTATE/i,
  /QueryException/i,
  /PDOException/i,
  /Unknown column/i,
  /Column not found/i,
  /Connection:\s*mysql/i,
  /SQL:\s*(select|insert|update|delete)/i,
  /Table\s*'.*'\s*doesn't exist/i,
  /Integrity constraint violation/i,
  /Syntax error or access violation/i,
  /Base table or view not found/i,
  /Call to undefined/i,
  /Fatal error/i,
  /Stack trace/i,
];

/**
 * Checks whether an error message or object contains raw database or technical details.
 */
export function isTechnicalError(err) {
  if (!err) return false;
  const str = typeof err === "string" 
    ? err 
    : (err.message || err.debug || err.error || JSON.stringify(err));
  return TECHNICAL_PATTERNS.some((pattern) => pattern.test(str));
}

/**
 * Returns a sanitized user-friendly message for display in UI toasts and forms,
 * and logs technical errors to console.error for developers to fix prior to deployment.
 * 
 * @param {string|object|Error} error - Error string, Error instance, or server JSON response
 * @param {string} fallback - Default friendly message
 * @returns {string} Safe message for UI presentation
 */
export function getCleanErrorMessage(error, fallback = "خطایی در پردازش اطلاعات رخ داده است.") {
  if (!error) return fallback;

  let rawMessage = "";
  if (typeof error === "string") {
    rawMessage = error;
  } else if (error instanceof Error) {
    rawMessage = error.message;
  } else if (typeof error === "object") {
    rawMessage = error.message || error.debug || error.error || "";
  }

  if (isTechnicalError(error) || isTechnicalError(rawMessage)) {
    // Log full details to console for developer review prior to production deployment
    console.error("🚨 [Security Warning: Technical/Database Error Intercepted]:", error);
    return "خطایی در پایگاه داده یا پردازش سیستم رخ داده است. این مورد در کنسول ثبت شد.";
  }

  return rawMessage || fallback;
}
