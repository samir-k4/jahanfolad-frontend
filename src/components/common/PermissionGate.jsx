import { createContext, useContext, useMemo } from "react";
import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { PAGES } from "../../constants/permissions";

/**
 * The permission page the current route belongs to. RequirePage provides it,
 * so anything rendered inside a route can ask "may I edit here?" without
 * repeating the page name at every call site.
 */
const PageContext = createContext(null);

/**
 * Permissions for the page the caller is rendered inside.
 *
 *   const { canCreate, canEdit, canDelete } = usePagePerms();
 *   {canDelete && <DeleteButton />}
 *
 * Pass an explicit page when a component is used outside its own route
 * (a modal mounted at the app root, for example): usePagePerms("employees").
 */
export function usePagePerms(explicitPage) {
  const { can } = useAuth();
  const contextPage = useContext(PageContext);
  const page = explicitPage || contextPage;

  return useMemo(
    () => ({
      page,
      canView: page ? can(page, "view") : true,
      canCreate: page ? can(page, "create") : true,
      canEdit: page ? can(page, "edit") : true,
      canDelete: page ? can(page, "delete") : true,
    }),
    [page, can],
  );
}

/**
 * Renders children only when the user may perform `action` on `page`.
 * Use for buttons: <IfCan page="products" action="delete"><DeleteBtn/></IfCan>
 */
export function IfCan({ page, action = "view", children, fallback = null }) {
  const { can } = useAuth();
  return can(page, action) ? children : fallback;
}

/** A <Link> that disappears entirely when the page is not permitted. */
export function PageLink({ page, children, ...props }) {
  const { can } = useAuth();
  if (page && !can(page)) return null;
  return <Link {...props}>{children}</Link>;
}

/**
 * A nav dropdown that hides itself when none of its pages are visible, so the
 * user never sees an empty menu.
 */
export function NavGroup({ pages = [], children }) {
  const { can } = useAuth();
  const anyVisible = pages.some((page) => can(page));
  if (!anyVisible) return null;
  return children;
}

/** Wraps a route element; refuses the page when the user lacks `view`. */
export function RequirePage({ page, children }) {
  const { can } = useAuth();
  if (!page || can(page)) {
    return <PageContext.Provider value={page}>{children}</PageContext.Provider>;
  }

  const label = PAGES[page]?.label || page;
  return (
    <div
      dir="rtl"
      className="flex flex-col items-center justify-center py-24 px-4 text-center font-sans"
    >
      <div className="w-14 h-14 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mb-4">
        <ShieldAlert size={26} />
      </div>
      <h2 className="text-lg font-bold text-gray-900 mb-1">
        دسترسی به این بخش برای شما مجاز نیست
      </h2>
      <p className="text-sm text-gray-500 max-w-sm">
        برای دسترسی به «{label}» با مدیر سیستم تماس بگیرید.
      </p>
      <Link
        to="/"
        className="mt-5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-colors"
      >
        بازگشت به داشبورد
      </Link>
    </div>
  );
}
