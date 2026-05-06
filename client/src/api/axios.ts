import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      const publicPaths = ['/login', '/signup', '/forgot-password', '/reset-password'];
      const isPublic = publicPaths.some((p) => window.location.pathname.startsWith(p));
      if (!isPublic && localStorage.getItem('token') !== null) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
