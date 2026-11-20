let apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://lmsoffline.jainscomputer.com/api';

if (typeof window !== 'undefined') {
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  // Force the production backend URL if the app is hosted live but the env variable was baked as localhost
  if (!isLocalhost && (apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1'))) {
    apiUrl = 'https://lmsoffline.jainscomputer.com/api';
  }
}

export const API_URL = apiUrl;
export const ADMIN_BASE_PATH = '/portal-mgmt-hq-8x9q2/admin';
export const ADMIN_LOGIN_PATH = `${ADMIN_BASE_PATH}/login`;
// Public by design (it ships in the JS bundle): it only hides the admin API from scanners.
// Admin access is protected by the admin login (JWT + session) on the backend.
export const ADMIN_GATEWAY_TOKEN =process.env.NEXT_PUBLIC_ADMIN_GATEWAY_TOKEN || 'portal-mgmt-hq-8x9q2-gateway-secure';

// ---------------------------------------------------------------------------
// Client-side In-Flight Deduplication & Memory Cache for Student Portal GET APIs
// ---------------------------------------------------------------------------
const apiCache = new Map();
const inFlightRequests = new Map();
const DEFAULT_CACHE_TTL = 25000; // 25 seconds cache

export const clearApiCache = (pattern) => {
  if (!pattern) {
    apiCache.clear();
    return;
  }
  for (const key of apiCache.keys()) {
    if (key.includes(pattern)) {
      apiCache.delete(key);
    }
  }
};

const makeClonedResponse = (data, status = 200, statusText = 'OK') => {
  return new Response(JSON.stringify(data), {
    status,
    statusText,
    headers: {
      'Content-Type': 'application/json',
      'X-Cache': 'HIT',
    },
  });
};

export const fetchApi = async (endpoint, options = {}) => {
  const cleanBase = API_URL.replace(/\/$/, "");
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${cleanBase}${cleanEndpoint}`;
  
  const finalOptions = { ...options };
  const method = (finalOptions.method || 'GET').toUpperCase();

  // If a mutation occurs (POST, PUT, DELETE, PATCH), clear cache to prevent stale data
  if (method !== 'GET') {
    clearApiCache();
  }

  // Determine if this GET request can be cached and deduplicated
  const isCacheableGet = method === 'GET' && 
    !finalOptions.skipCache && 
    !finalOptions.noCache &&
    !cleanEndpoint.includes('.m3u8') && 
    !cleanEndpoint.includes('/videos/') &&
    !cleanEndpoint.includes('/playback-url') &&
    (cleanEndpoint.startsWith('/student/') || cleanEndpoint.startsWith('/courses'));

  const cacheKey = `${url}`;

  // 1. Cache HIT check
  if (isCacheableGet && apiCache.has(cacheKey)) {
    const entry = apiCache.get(cacheKey);
    if (Date.now() - entry.timestamp < (finalOptions.ttl || DEFAULT_CACHE_TTL)) {
      return makeClonedResponse(entry.data, entry.status, entry.statusText);
    } else {
      apiCache.delete(cacheKey);
    }
  }

  // 2. In-flight request deduplication check
  if (isCacheableGet && inFlightRequests.has(cacheKey)) {
    try {
      const shared = await inFlightRequests.get(cacheKey);
      if (shared && shared.ok) {
        return makeClonedResponse(shared.data, shared.status, shared.statusText);
      }
    } catch (e) {
      // In-flight request failed, fallback to direct fetch
    }
  }

  let inFlightResolver = null;
  if (isCacheableGet) {
    const flightPromise = new Promise((resolve) => {
      inFlightResolver = resolve;
    });
    inFlightRequests.set(cacheKey, flightPromise);
  }

  // ensure credentials is set to 'include' for CORS cookies
  finalOptions.credentials = 'include';

  // Fallback for mobile: attach token from localStorage if available
  if (typeof window !== 'undefined') {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        finalOptions.headers = {
          ...finalOptions.headers,
          'Authorization': `Bearer ${token}`
        };
      }
    } catch (e) {
      console.warn("localStorage access denied or unavailable", e);
    }

    // Attach secure Admin Gateway token for admin actions
    const isAdminEndpoint = cleanEndpoint.startsWith('/admin') || 
                            cleanEndpoint.startsWith('/students') || 
                            cleanEndpoint === '/auth/admin-login' ||
                            cleanEndpoint.startsWith('/courses') && (finalOptions.method && finalOptions.method !== 'GET');
    const isInAdminPortal = window.location.pathname.includes('/portal-mgmt-hq-8x9q2/admin');

    if (isAdminEndpoint || isInAdminPortal) {
      finalOptions.headers = {
        ...finalOptions.headers,
        'x-admin-gateway-token': ADMIN_GATEWAY_TOKEN
      };
    }
  }

  // Timeout logic (120000ms = 2 minutes default for large uploads)
  const timeoutMs = finalOptions.timeout || 120000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  finalOptions.signal = controller.signal;

  let response;
  try {
    response = await fetch(url, finalOptions);
    clearTimeout(timeoutId);

    if (isCacheableGet) {
      inFlightRequests.delete(cacheKey);
      if (response.ok) {
        try {
          const cloned = response.clone();
          const jsonData = await cloned.json();
          apiCache.set(cacheKey, {
            timestamp: Date.now(),
            data: jsonData,
            status: response.status,
            statusText: response.statusText,
          });
          if (inFlightResolver) {
            inFlightResolver({ ok: true, data: jsonData, status: response.status, statusText: response.statusText });
          }
        } catch (e) {
          if (inFlightResolver) inFlightResolver({ ok: false });
        }
      } else {
        if (inFlightResolver) inFlightResolver({ ok: false });
      }
    }
  } catch (error) {
    clearTimeout(timeoutId);
    if (isCacheableGet) {
      inFlightRequests.delete(cacheKey);
      if (inFlightResolver) inFlightResolver({ ok: false });
    }
    if (error.name === 'AbortError') {
      console.error(`[API] Request to ${url} timed out after ${timeoutMs}ms`);
      // Return a simulated response so callers don't crash
      return new Response(JSON.stringify({ error: "Request timed out" }), {
        status: 408,
        statusText: "Request Timeout"
      });
    }
    throw error;
  }

  if (response.status === 401 || response.status === 403) {
    if (typeof window !== 'undefined') {
      let isSessionConflict = false;
      let body = {};
      try {
        body = (await response.clone().json()) || {};
        if (body.message === 'SESSION_CONFLICT') {
          isSessionConflict = true;
        }
      } catch (e) {}

      if (isSessionConflict) {
        window.dispatchEvent(new Event('session_conflict'));
        return response; // Let the modal handle logout and redirect
      }

      // A 403 is usually a business rule (e.g. "Access denied" to one course, ACCESS_EXPIRED),
      // not a dead session. Only log out for 403s that mean the account itself can't be used.
      if (response.status === 403) {
        const msg = `${body.message || ''} ${body.error || ''}`.toLowerCase();
        const isAccountLevel = /blocked|inactive|forbidden: (student|admin) access required/.test(msg);
        if (!isAccountLevel) return response;
      }

      const isStudent = window.location.pathname.startsWith('/student');
      const targetLogin = isStudent ? '/student/login' : ADMIN_LOGIN_PATH;
      
      const currentPath = window.location.pathname.replace(/\/$/, '');
      // Several parallel requests can fail at once; redirect only once.
      if (currentPath !== targetLogin && !window.__lmsAuthRedirecting) {
        window.__lmsAuthRedirecting = true;
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`[AUTH] ${response.status} on ${url} — redirecting to ${targetLogin}`);
        }
        try { localStorage.removeItem('token'); } catch (e) {}
        window.location.replace(targetLogin);
      }
    }
  }

  return response;
};
