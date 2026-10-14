#!/usr/bin/env node
/**
 * check-i18n.cjs
 * ---------------
 * Phase 4 CI safeguard — detects:
 *   1. Duplicate values within a single namespace file (same Persian string → multiple keys).
 *   2. Values that appear in both a domain file AND common.json (should live in common only).
 *   3. Remaining ATTENDANCE_LABELS / EMPLOYEE_LABELS / etc. imports in .jsx/.js files
 *      (indicates incomplete migration).
 *
 * Exit code 0 = clean, exit code 1 = violations found.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const LOCALES_DIR = path.resolve(__dirname, "../src/locales/fa");
const SRC_DIR = path.resolve(__dirname, "../src");

// ── helpers ──────────────────────────────────────────────────────────────────

function flattenJson(obj, prefix = "") {
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (Array.isArray(v)) {
      result[key] = JSON.stringify(v);
    } else if (v && typeof v === "object") {
      Object.assign(result, flattenJson(v, key));
    } else {
      result[key] = String(v);
    }
  }
  return result;
}

function loadNamespace(filename) {
  const filepath = path.join(LOCALES_DIR, filename);
  if (!fs.existsSync(filepath)) return {};
  return JSON.parse(fs.readFileSync(filepath, "utf8"));
}

// ── 1. Intra-file duplicate values ───────────────────────────────────────────

function checkIntraDuplicates(namespace, flat) {
  const valueMap = {};
  for (const [key, value] of Object.entries(flat)) {
    if (!valueMap[value]) valueMap[value] = [];
    valueMap[value].push(key);
  }

  // Only flag if 3+ keys share the same value — 2 occurrences can be legitimate
  // (e.g., a label used as both a column header and a form label in different sections).
  const dupes = Object.entries(valueMap).filter(([, keys]) => keys.length > 2);
  if (dupes.length === 0) return [];

  return dupes.map(([value, keys]) =>
    `  [${namespace}] duplicate value "${value}"\n    keys: ${keys.join(", ")}`
  );
}

// ── 2. Values shared between domain files and common.json ────────────────────

// Short/generic UI tokens that are acceptable in multiple namespaces
const ALLOWED_CROSS_DUPLICATES = new Set([
  "#", "—", "AFN", "PDF",
  "حذف", "بستن", "انصراف", "ویرایش", "ذخیره", "تایید",
  "وضعیت", "عملیات", "توضیحات", "تاریخ",
  "در حال حذف...", "در حال ذخیره...", "در حال تولید PDF...",
  "بستن پنجره", "دانلود PDF", "به‌روزرسانی",
  "جستجو...", "موردی یافت نشد",
  // Semantic category constants — used both as comparison values and display labels
  "کارمند زیر هنگر", "کارمند عمومی", "کارمند نمایندگی",
  // Tooltip/UI text that legitimately appears in many PDF/preview modals
  "بزرگ‌نمایی", "کوچک‌نمایی", "بارگذاری مجدد پیش‌نمایش",
  // Branch selector — same placeholder used across all feature pages
  "انتخاب نمایندگی...",
]);


function checkCrossNamespaceDuplicates(commonFlat, allNamespaces) {
  const violations = [];
  const commonValues = new Set(Object.values(commonFlat));

  for (const [ns, flat] of Object.entries(allNamespaces)) {
    if (ns === "common") continue;
    for (const [key, value] of Object.entries(flat)) {
      if (ALLOWED_CROSS_DUPLICATES.has(value)) continue;
      if (value.length < 10) continue; // ignore very short generic strings
      if (commonValues.has(value)) {
        violations.push(
          `  [${ns}.${key}] value "${value}" already exists in common.json — extract to common`
        );
      }
    }
  }
  return violations;
}

// ── 3. Residual label-constant imports ───────────────────────────────────────

const LEGACY_PATTERNS = [
  /ATTENDANCE_LABELS/,
  /EMPLOYEE_LABELS/,
  /PRODUCTION_LABELS/,
  /PRODUCTION_MESSAGES/,
  /WAREHOUSE_LABELS/,
  /WAREHOUSE_MESSAGES/,
  /PRODUCT_LABELS/,
  /PRODUCT_MESSAGES/,
  /SALES_LABELS/,
];

function checkResidualImports() {
  const violations = [];
  const files = execSync(
    `find "${SRC_DIR}" -type f \\( -name "*.jsx" -o -name "*.js" \\) ! -path "*/node_modules/*" ! -path "*/locales/*" ! -path "*/constants/*"`,
    { encoding: "utf8" }
  )
    .trim()
    .split("\n")
    .filter(Boolean);

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    for (const pattern of LEGACY_PATTERNS) {
      if (pattern.test(content)) {
        violations.push(`  ${path.relative(SRC_DIR, file)}: still imports ${pattern.source}`);
        break;
      }
    }
  }
  return violations;
}

// ── main ─────────────────────────────────────────────────────────────────────

const namespaceFiles = fs
  .readdirSync(LOCALES_DIR)
  .filter((f) => f.endsWith(".json"));

const allNamespaces = {};
for (const file of namespaceFiles) {
  const ns = file.replace(".json", "");
  allNamespaces[ns] = flattenJson(loadNamespace(file));
}

const commonFlat = allNamespaces["common"] || {};

let allViolations = [];

for (const [ns, flat] of Object.entries(allNamespaces)) {
  allViolations = allViolations.concat(checkIntraDuplicates(ns, flat));
}

allViolations = allViolations.concat(
  checkCrossNamespaceDuplicates(commonFlat, allNamespaces)
);

allViolations = allViolations.concat(checkResidualImports());

if (allViolations.length === 0) {
  console.log("✅  i18n check passed — no duplicates or residual imports found.");
  process.exit(0);
} else {
  console.error(`❌  i18n check failed — ${allViolations.length} violation(s):\n`);
  allViolations.forEach((v) => console.error(v));
  process.exit(1);
}
