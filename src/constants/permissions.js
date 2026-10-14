// AUTO-GENERATED from Back-End/config/permissions.php — keep the two in sync.
// Regenerate after editing the PHP config; the keys must match exactly.

export const PAGES = {
    "dashboard": {
        "label": "داشبورد",
        "group": "عمومی",
        "actions": [
            "view"
        ]
    },
    "production": {
        "label": "ثبت تولیدات",
        "group": "تولیدات و گدام",
        "actions": [
            "view",
            "create",
            "edit",
            "delete"
        ]
    },
    "products": {
        "label": "لیست محصولات",
        "group": "تولیدات و گدام",
        "actions": [
            "view",
            "create",
            "edit",
            "delete"
        ]
    },
    "warehouse": {
        "label": "موجودی گدام",
        "group": "تولیدات و گدام",
        "actions": [
            "view",
            "create",
            "edit",
            "delete"
        ]
    },
    "employees": {
        "label": "کارمندان",
        "group": "منابع بشری",
        "actions": [
            "view",
            "create",
            "edit",
            "delete"
        ]
    },
    "attendance": {
        "label": "حاضری",
        "group": "منابع بشری",
        "actions": [
            "view",
            "create",
            "edit",
            "delete"
        ]
    },
    "overtime": {
        "label": "اضافه کاری",
        "group": "منابع بشری",
        "actions": [
            "view",
            "create",
            "edit",
            "delete"
        ]
    },
    "salaries": {
        "label": "معاشات",
        "group": "منابع بشری",
        "actions": [
            "view",
            "create",
            "edit",
            "delete"
        ]
    },
    "treasury": {
        "label": "خزانه‌داری",
        "group": "حسابات",
        "actions": [
            "view",
            "create",
            "edit",
            "delete"
        ]
    },
    "advances": {
        "label": "امانتی مدیران",
        "group": "حسابات",
        "actions": [
            "view",
            "create",
            "edit",
            "delete"
        ]
    },
    "incomes": {
        "label": "دریافتی‌ها",
        "group": "حسابات",
        "actions": [
            "view",
            "create",
            "edit",
            "delete"
        ]
    },
    "expenses": {
        "label": "مصارف",
        "group": "حسابات",
        "actions": [
            "view",
            "create",
            "edit",
            "delete"
        ]
    },
    "customers": {
        "label": "مشتریان",
        "group": "معاملات",
        "actions": [
            "view",
            "create",
            "edit",
            "delete"
        ]
    },
    "sales": {
        "label": "فروش",
        "group": "معاملات",
        "actions": [
            "view",
            "create",
            "edit",
            "delete"
        ]
    },
    "reports": {
        "label": "راپورها",
        "group": "عمومی",
        "actions": [
            "view"
        ]
    },
    "settings": {
        "label": "تنظیمات سیستم",
        "group": "مدیریت",
        "actions": [
            "view",
            "edit"
        ]
    },
    "users": {
        "label": "مدیریت کاربران",
        "group": "مدیریت",
        "actions": [
            "view",
            "create",
            "edit",
            "delete"
        ]
    }
};

export const PAGE_KEYS = Object.keys(PAGES);

export const ACTIONS = [
  { id: "view", label: "مشاهده" },
  { id: "create", label: "ثبت جدید" },
  { id: "edit", label: "ویرایش" },
  { id: "delete", label: "حذف" },
];

/** Pages grouped for display, preserving the order declared in the config. */
export const PAGE_GROUPS = PAGE_KEYS.reduce((groups, key) => {
  const group = PAGES[key].group || "سایر";
  if (!groups[group]) groups[group] = [];
  groups[group].push({ key, ...PAGES[key] });
  return groups;
}, {});

/** An all-false matrix, used as the starting point for a new user. */
export function emptyMatrix() {
  return PAGE_KEYS.reduce((matrix, key) => {
    matrix[key] = PAGES[key].actions.reduce((row, action) => {
      row[action] = false;
      return row;
    }, {});
    return matrix;
  }, {});
}