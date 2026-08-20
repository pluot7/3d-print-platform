import apiClient from './client';

// ======= 登录 =======

export interface LoginRequest {
  phone: string;
  password: string;
}

export interface RegisterRequest {
  phone: string;
  password: string;
  code: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: {
    id: number;
    username: string;
    email: string | null;
    phone: string | null;
    role: string;
    full_name: string | null;
    avatar_url: string | null;
    balance: number;
    nova_coins: number;
    is_active: boolean;
    is_verified: boolean;
    created_at: string;
  };
}

// 登录
export const login = async (data: LoginRequest): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>('/api/auth/login', data);
  return response.data;
};

// 注册
export const register = async (data: RegisterRequest): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>('/api/auth/register', data);
  return response.data;
};

// 发送短信验证码
export const sendSmsCode = async (phone: string): Promise<{ message: string; phone_masked: string }> => {
  const response = await apiClient.post('/api/auth/send-code', null, {
    params: { phone },
  });
  return response.data;
};

// 获取当前用户信息
export const getCurrentUser = async (): Promise<any> => {
  const response = await apiClient.get('/api/auth/me');
  return response.data;
};

// 退出登录（前端清除 token）
export const logout = () => {
  localStorage.removeItem('3dprint_token');
  localStorage.removeItem('3dprint_user');
};

// ======= 个人资料 =======

export interface UpdateProfileRequest {
  username?: string;
  full_name?: string;
  avatar_url?: string;
  phone?: string;
  phone_code?: string;
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}

// 修改个人资料
export const updateProfile = async (data: UpdateProfileRequest): Promise<AuthResponse['user']> => {
  const response = await apiClient.put('/api/auth/profile', data);
  return response.data;
};

// 上传头像
export const uploadAvatar = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post('/api/auth/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return `/${response.data.avatar_url}`;
};

// 修改密码
export const changePassword = async (data: ChangePasswordRequest): Promise<{ message: string }> => {
  const response = await apiClient.put('/api/auth/password', data);
  return response.data;
};

// ======= 超级管理员：用户管理 =======

export interface UserItem {
  id: number;
  username: string;
  email: string | null;
  phone: string | null;
  role: string;
  full_name: string | null;
  avatar_url: string | null;
  balance: number;
  nova_coins: number;
  is_active: boolean;
  created_at: string;
}

// 获取所有用户
export const getAllUsers = async (): Promise<UserItem[]> => {
  const response = await apiClient.get<UserItem[]>('/api/auth/users');
  return response.data;
};

// 设置用户角色
export const setUserRole = async (userId: number, role: string): Promise<any> => {
  const response = await apiClient.put(`/api/auth/users/${userId}/role`, null, {
    params: { role },
  });
  return response.data;
};
