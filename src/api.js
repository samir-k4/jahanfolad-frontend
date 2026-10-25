const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export function apiUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${normalizedPath}`;
}

/**
 * Thrown when the server answers with a non-2xx status.
 * `status` lets callers branch (e.g. on 422); `data` carries the parsed body.
 * `message` is the server's own message when it sent one, so existing
 * `err.message || FALLBACK` call sites keep working unchanged.
 */
export class ApiError extends Error {
  constructor(message, status, data) {
    super(message ?? '');
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * The session token is NOT kept here any more: the server sends it in an
 * httpOnly cookie that no script on this page can read, so there is nothing for
 * an injected script to steal. This key only exists to wipe what older versions
 * of the app left behind.
 */
const LEGACY_TOKEN_KEY = 'jfc_auth_token';
/** Shared between tabs, so activity in one tab keeps the others alive too. */
export const ACTIVITY_STORAGE_KEY = 'jfc_last_activity';
/** Why the last session ended, read once by the login screen. */
export const SESSION_END_KEY = 'jfc_session_end';
/** Marks a request as coming from this app; the api refuses cookie writes without it. */
const APP_REQUEST_HEADER = 'X-Requested-With';
const APP_REQUEST_VALUE = 'XMLHttpRequest';

function dropLegacyToken() {
  try {
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  } catch {
    /* nothing to clean up */
  }
}

export function markActivity(at = Date.now()) {
  try {
    localStorage.setItem(ACTIVITY_STORAGE_KEY, String(at));
  } catch {
    /* storage disabled — the server side timeout still applies */
  }
}

export function getLastActivity() {
  try {
    const stored = Number(localStorage.getItem(ACTIVITY_STORAGE_KEY));
    return Number.isFinite(stored) && stored > 0 ? stored : null;
  } catch {
    return null;
  }
}

export function clearActivity() {
  try {
    localStorage.removeItem(ACTIVITY_STORAGE_KEY);
  } catch {
    /* nothing to clear */
  }
}

export function setSessionEndReason(reason) {
  try {
    sessionStorage.setItem(SESSION_END_KEY, reason);
  } catch {
    /* the login screen simply shows no reason */
  }
}

export function takeSessionEndReason() {
  try {
    const reason = sessionStorage.getItem(SESSION_END_KEY);
    if (reason) sessionStorage.removeItem(SESSION_END_KEY);
    return reason;
  } catch {
    return null;
  }
}

/**
 * When our api was last called. The server slides its own idle clock on every
 * request, so this is what tells the session hook whether a keep-alive ping is
 * needed while the user works inside a form without saving anything.
 */
let lastRequestAt = 0;

export function getLastRequestAt() {
  return lastRequestAt;
}

/**
 * Listeners notified when the server rejects our token, so the app can drop
 * the session and show the login screen. AuthContext subscribes to this.
 */
const unauthorizedListeners = new Set();

export function onUnauthorized(listener) {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

function handleUnauthorized(path) {
  // the login endpoint answering 401/419 is a failed sign-in, not an expired session
  if (path.startsWith('/login')) return;
  // without an activity stamp nobody was signed in here, so this is a first
  // visit rather than a session that ended: say nothing on the login screen
  const hadSession = getLastActivity() !== null;
  clearActivity();
  if (hadSession) setSessionEndReason('expired');
  unauthorizedListeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* a broken listener must not break the request that triggered it */
    }
  });
}

function buildInit({ method = 'GET', body, signal, accept, headers } = {}) {
  const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
  let selectedBranch = "";
  try {
    selectedBranch = localStorage.getItem("jfc_selected_branch") || "";
  } catch {
    selectedBranch = "";
  }
  return {
    method,
    credentials: 'include',
    headers: {
      Accept: accept || 'application/json',
      ...(isWrite ? { [APP_REQUEST_HEADER]: APP_REQUEST_VALUE } : {}),
      ...(selectedBranch ? { "X-Branch-Id": selectedBranch } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    ...(signal ? { signal } : {}),
  };
}

async function rawFetch(path, options) {
  lastRequestAt = Date.now();
  const res = await fetch(apiUrl(path), buildInit(options));
  if (res.status === 401 || res.status === 419) handleUnauthorized(path);
  return res;
}

function filenameFromResponse(res) {
  const disposition = res.headers.get('Content-Disposition');
  if (!disposition || !disposition.includes('filename')) return null;
  const encoded = /filename\*=\s*(?:UTF-8|utf-8)''([^;\n]+)/.exec(disposition);
  if (encoded?.[1]) {
    try {
      return decodeURIComponent(encoded[1].trim());
    } catch {
      return encoded[1].trim();
    }
  }
  const match = /filename\s*=\s*((['"]).*?\2|[^;\n]*)/.exec(disposition);
  if (!match?.[1]) return null;
  const raw = match[1].replace(/['"]/g, '');
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/**
 * JSON request. Returns the parsed body *as-is* — no unwrapping — so callers
 * that need sibling keys such as `message` or `batch` still get them.
 */
export async function apiFetch(path, options = {}) {
  const res = await rawFetch(path, options);
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(data?.message, res.status, data);
  return data;
}

/**
 * Collection request. Normalises the three shapes this API returns
 * (`[...]`, `{ data: [...] }`, `{ data: [...], ...meta }`) down to one array.
 */
export async function apiList(path, options = {}) {
  const body = await apiFetch(path, options);
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  return [];
}

/** Single-resource request that unwraps Laravel's `{ data: {...} }` envelope. */
export async function apiItem(path, options = {}) {
  const body = await apiFetch(path, options);
  return body?.data ?? body;
}

/** HTML request, for the report preview iframes. */
export async function apiFetchText(path, options = {}) {
  const res = await rawFetch(path, { accept: 'text/html', ...options });
  if (!res.ok) throw new ApiError(null, res.status, null);
  return res.text();
}

/**
 * Binary request, for PDF downloads. Returns the blob together with the
 * filename the server suggested via Content-Disposition (null if it did not).
 */
export async function apiFetchBlob(path, options = {}) {
  const res = await rawFetch(path, { accept: 'application/pdf', ...options });
  if (!res.ok) throw new ApiError(null, res.status, null);
  return { blob: await res.blob(), filename: filenameFromResponse(res) };
}

/* ---------------------------------------------------------------------------
 * Global auth interceptor
 *
 * 119 call sites across the app still use `fetch(apiUrl(...))` directly. Rather
 * than rewrite each one (high risk, no security benefit over this), we wrap
 * window.fetch once so every request to OUR api sends the session cookie,
 * negotiates JSON and reacts to a 401 the same way apiFetch does. Write
 * requests also carry the app marker required by the API; GETs omit it to
 * avoid unnecessary cross-origin preflights.
 *
 * Only requests whose URL resolves inside API_BASE are touched, so nothing is
 * attached to a third-party host. Converting call sites to apiFetch is still
 * worth doing for error handling and response unwrapping — but it is a code
 * quality task now, not a security one.
 * ------------------------------------------------------------------------- */

function isOurApiUrl(rawUrl) {
  try {
    const resolved = new URL(String(rawUrl), window.location.origin);
    const base = new URL(API_BASE, window.location.origin);
    if (resolved.origin !== base.origin) return false;
    return (
      resolved.pathname === base.pathname ||
      resolved.pathname.startsWith(`${base.pathname}/`)
    );
  } catch {
    return false;
  }
}

let interceptorInstalled = false;

export function installAuthInterceptor() {
  if (interceptorInstalled || typeof window === 'undefined' || !window.fetch) {
    return;
  }
  interceptorInstalled = true;
  dropLegacyToken();

  const nativeFetch = window.fetch.bind(window);

  /**
   * A request that states no preference is negotiated as JSON, so an expired
   * session comes back as a 401 we can act on instead of a redirect or an error
   * page. A caller that asked for html or pdf keeps what it asked for.
   */
  const applyDefaults = (headers, method) => {
    if (
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase()) &&
      !headers.has(APP_REQUEST_HEADER)
    ) {
      headers.set(APP_REQUEST_HEADER, APP_REQUEST_VALUE);
    }
    const accept = (headers.get('Accept') || '').trim();
    if (accept === '' || accept === '*/*') {
      headers.set('Accept', 'application/json');
    }
    return headers;
  };

  window.fetch = async function patchedFetch(input, init) {
    const url = input instanceof Request ? input.url : String(input);

    if (!isOurApiUrl(url)) {
      return nativeFetch(input, init);
    }

    lastRequestAt = Date.now();
    let response;

    if (input instanceof Request) {
      // clone so the caller's Request stays usable
      const method = (init?.method || input.method).toUpperCase();
      const headers = applyDefaults(new Headers(input.headers), method);
      response = await nativeFetch(new Request(input, { headers, credentials: 'include' }), init);
    } else {
      const nextInit = { ...(init || {}) };
      const method = (nextInit.method || 'GET').toUpperCase();
      nextInit.method = method;
      nextInit.headers = applyDefaults(new Headers(nextInit.headers || {}), method);
      nextInit.credentials = nextInit.credentials || 'include';
      response = await nativeFetch(input, nextInit);
    }

    if (response.status === 401 || response.status === 419) {
      const path = new URL(url, window.location.origin).pathname;
      handleUnauthorized(path.replace(new URL(API_BASE, window.location.origin).pathname, ''));
    }

    return response;
  };
}
