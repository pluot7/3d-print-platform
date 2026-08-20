import axios from 'axios';

export const API_BASE_URL = '';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器：用管理后台独立的 token key
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('3dprint_admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器：401 跳转管理后台登录页
let isRedirecting = false;
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('3dprint_admin_token');
      localStorage.removeItem('3dprint_admin_user');
      if (!isRedirecting && !window.location.pathname.includes('/login')) {
        isRedirecting = true;
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
