// Maps a URL path to the permission page it belongs to. Longest prefix wins,
export const PATH_TO_PAGE = [
  ["/production", "production"],
  ["/products", "products"],
  ["/godam", "warehouse"],
  ["/employees", "employees"],
  ["/attendance", "attendance"],
  ["/overtime", "overtime"],
  ["/salaries", "salaries"],
  ["/salary", "salaries"],
  ["/treasury", "treasury"],
  ["/vaults", "treasury"],
  ["/vault", "treasury"],
  ["/deposits-withdrawals", "treasury"],
  ["/transfers", "treasury"],
  ["/transactions/deposits-withdrawals", "treasury"],
  ["/manager-advances", "advances"],
  ["/incomes", "incomes"],
  ["/customer-receipts", "incomes"],
  ["/customer-loans", "customers"],
  ["/customers", "customers"],
  ["/sales", "sales"],
  ["/expenses", "expenses"],
  ["/reports", "reports"],
  ["/settings/users", "users"],
  ["/settings", "settings"],
];

/** Which permission page does this path belong to? "/" is the dashboard. */
export function pageForPath(pathname) {
  const path = (pathname || "/").split("?")[0];
  if (path === "/") return "dashboard";

  let best = null;
  for (const [prefix, page] of PATH_TO_PAGE) {
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      if (!best || prefix.length > best.prefix.length) {
        best = { prefix, page };
      }
    }
  }
  return best?.page ?? null;
}
