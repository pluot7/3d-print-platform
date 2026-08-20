import axios from 'axios';

// API 走 vite proxy（开发时）/ 同域（部署时）
export const API_BASE_URL = '';

// 创建 axios 实例
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 自动添加 token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('3dprint_token') || localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 防止多个401并发时重复跳转
let isRedirecting = false;

// 响应拦截器 - 处理错误
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 清除本地认证信息（兼容新旧key）
      localStorage.removeItem('3dprint_token');
      localStorage.removeItem('3dprint_user');
      localStorage.removeItem('token');
      localStorage.removeItem('3dprint_auth_user');
      
      // 避免重复跳转
      if (!isRedirecting && !window.location.pathname.includes('/login')) {
        isRedirecting = true;
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
