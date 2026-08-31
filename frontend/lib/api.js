export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const fetchApi = async (endpoint, options = {}) => {
  const url = `${API_URL}${endpoint}`;
  
  const finalOptions = { ...options };
  
  // ensure credentials is set to 'include' for CORS cookies
  finalOptions.credentials = 'include';

  const response = await fetch(url, finalOptions);

  if (response.status === 401 || response.status === 403) {
    if (typeof window !== 'undefined') {
      if (window.location.pathname.startsWith('/student')) {
        if (window.location.pathname !== '/student/login') {
          window.location.href = '/student/login';
        }
      } else {
        if (window.location.pathname !== '/') {
          window.location.href = '/';
        }
      }
    }
  }

  return response;
};
