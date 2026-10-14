import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  apiFetch,
  clearActivity,
  markActivity,
  onUnauthorized,
  setSessionEndReason,
} from "../api";
import useSessionTimeout from "../hooks/useSessionTimeout";
import SessionTimeoutModal from "../components/common/SessionTimeoutModal";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // idle window, warning lead time and hard deadline, all decided by the server
  const [session, setSession] = useState(null);
  // The token lives in an httpOnly cookie now, so the app cannot look at it:
  // it always asks the server once who it is before deciding what to show.
  const [isRestoring, setIsRestoring] = useState(true);

  const clearSession = useCallback(() => {
    clearActivity();
    setUser(null);
    setSession(null);
  }, []);

  // Restore a session from the cookie the browser holds
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { user: me, session: policy } = await apiFetch("/me");
        if (!cancelled) {
          setUser(me);
          setSession(policy ?? null);
        }
      } catch {
        if (!cancelled) clearSession();
      } finally {
        if (!cancelled) setIsRestoring(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  // Any request answering 401 means the token is gone or expired
  useEffect(() => onUnauthorized(() => clearSession()), [clearSession]);

  const login = useCallback(async (email, password) => {
    // 1. Perform the mandatory CSRF handshake
    // We strip '/api' from the VITE_API_URL because the sanctum route sits at the root domain
    const baseUrl = (import.meta.env.VITE_API_URL || "").replace(
      /\/api\/?$/,
      "",
    );

    await fetch(`${baseUrl}/sanctum/csrf-cookie`, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    });

    // 2. Send the login credentials
    const result = await apiFetch("/login", {
      method: "POST",
      body: { email, password, device_name: "web" },
    });

    markActivity();
    setUser(result.user);
    setSession(result.session ?? null);
    return result.user;
  }, []);

  const logout = useCallback(
    async (reason = null) => {
      // onClick={logout} would hand us a click event, so only a real reason counts
      if (typeof reason === "string" && reason) setSessionEndReason(reason);
      try {
        await apiFetch("/logout", { method: "POST" });
      } catch {
        /* revoking server-side is best effort; the local session goes either way */
      }
      clearSession();
    },
    [clearSession],
  );

  const refreshUser = useCallback(async () => {
    const { user: me, session: policy } = await apiFetch("/me");
    setUser(me);
    setSession(policy ?? null);
    return me;
  }, []);

  const { secondsLeft, keepAlive } = useSessionTimeout({
    enabled: Boolean(user),
    idleSeconds: session?.idle_seconds,
    warnSeconds: session?.warn_seconds,
    expiresAt: session?.expires_at,
    onExpire: (reason) => logout(reason),
  });

  /**
   * May the current user do `action` on `page`?
   *   can("warehouse")            -> may they open the warehouse page
   *   can("warehouse", "delete")  -> may they delete there
   *
   * Mirrors User::hasPermission() on the server: the super admin bypasses the
   * matrix, and any write right implies being able to view the page. The
   * server enforces this too — this only decides what the UI shows.
   */
  const can = useCallback(
    (page, action = "view") => {
      if (!user) return false;
      if (user.is_super_admin) return true;

      const row = user.permissions?.[page];
      if (!row) return false;
      if (typeof row === "boolean") return action === "view" ? row : false;

      if (action === "view") {
        return Boolean(row.view || row.create || row.edit || row.delete);
      }
      return Boolean(row[action]);
    },
    [user],
  );

  const value = useMemo(
    () => ({
      user,
      isRestoring,
      isAuthenticated: Boolean(user),
      mustChangePassword: Boolean(user?.must_change_password),
      login,
      logout,
      refreshUser,
      can,
    }),
    [user, isRestoring, login, logout, refreshUser, can],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <SessionTimeoutModal
        secondsLeft={secondsLeft}
        onStay={keepAlive}
        onLogout={() => logout()}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
