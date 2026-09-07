export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://lms-backend-9y8d.onrender.com/api';

export const fetchApi = async (endpoint, options = {}) => {
  const url = `${API_URL}${endpoint}`;
  
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

  const response = await fetch(url, finalOptions);

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
