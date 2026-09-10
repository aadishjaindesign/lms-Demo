export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://lmsbackend.jainscomputer.com/api';

export const fetchApi = async (endpoint, options = {}) => {
  const cleanBase = API_URL.replace(/\/$/, "");
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${cleanBase}${cleanEndpoint}`;
  
  const finalOptions = { ...options };
  
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
  } catch (error) {
    clearTimeout(timeoutId);
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

  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      const isStudent = window.location.pathname.startsWith('/student');
      const targetLogin = isStudent ? '/student/login' : '/';
      
      if (window.location.pathname !== targetLogin) {
        console.error(`
[AUTO LOGOUT DEBUG]
Reason: 401 Unauthorized from API interceptor
HTTP status: 401
Request URL: ${url}
Role: ${isStudent ? 'student' : 'admin'}
Timestamp: ${new Date().toISOString()}
Stack trace: ${new Error().stack}
        `);
        window.location.href = targetLogin;
      }
    }
  }

  return response;
};
