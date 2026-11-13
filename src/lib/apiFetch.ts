export const TOKEN_STORAGE_KEY = 'epss_session_token';

let interceptorAttempted = false;
let onUnauthorizedCallback: (() => void) | null = null;

const nativeFetch: typeof fetch | null =
  typeof window !== 'undefined' && typeof window.fetch === 'function'
    ? window.fetch.bind(window)
    : typeof globalThis !== 'undefined' && typeof globalThis.fetch === 'function'
      ? globalThis.fetch.bind(globalThis)
      : null;

export function setUnauthorizedHandler(cb: (() => void) | null) {
  onUnauthorizedCallback = cb;
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (!nativeFetch) {
    throw new Error('Fetch API is not available in this runtime.');
  }

  const urlStr =
    typeof input === 'string'
      ? input
      : input instanceof Request
        ? input.url
        : String(input);

  const isApiCall = urlStr.startsWith('/api/v1') || urlStr.includes('/api/v1/');
  if (!isApiCall) {
    return nativeFetch(input, init);
  }

  const token = typeof window !== 'undefined' ? window.localStorage.getItem(TOKEN_STORAGE_KEY) : null;
  const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await nativeFetch(input, {
    ...init,
    headers,
    credentials: 'include'
  });

  const isPublicAuthCall =
    urlStr.includes('/auth/login') ||
    urlStr.includes('/auth/mfa/verify') ||
    urlStr.includes('/auth/webauthn/login') ||
    urlStr.includes('/auth/password-reset') ||
    urlStr.includes('/auth/session') ||
    urlStr.includes('/auth/elevate-mfa');

  if (response.status === 401 && !isPublicAuthCall && onUnauthorizedCallback) {
    onUnauthorizedCallback();
  }

  return response;
}

/**
 * Safely installs an API fetch wrapper without throwing in sandboxes where
 * `window.fetch` is defined as a getter-only or non-configurable property.
 */
export function ensureApiFetchInterceptor(): void {
  if (typeof window === 'undefined' || interceptorAttempted) return;
  interceptorAttempted = true;

  try {
    const desc = Object.getOwnPropertyDescriptor(window, 'fetch');
    if (desc && !desc.configurable) {
      // Host sandbox locked window.fetch; rely on apiFetch & SameSite=None session cookie
      return;
    }
    Object.defineProperty(window, 'fetch', {
      value: apiFetch,
      writable: true,
      enumerable: true,
      configurable: true
    });
  } catch {
    // Host environment prohibits redefining window.fetch; avoid crashing module load
  }
}
