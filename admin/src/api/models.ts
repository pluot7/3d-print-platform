import apiClient from './client';

// 模型响应
export interface ModelResponse {
  id: number;
  name: string;
  description: string | null;
  category: string;
  status: string;
  file_path: string;
  glb_path: string | null;  // 转换后的 glb 文件路径
  file_size: number;
  file_type: string;
  preview_images: string | null;
  dimensions_x: number | null;
  dimensions_y: number | null;
  dimensions_z: number | null;
  material: string | null;
  layer_height: number | null;
  infill: number | null;
  volume: number | null;  // 体积 cm³
  weight: number | null;  // 重量 g
  base_price: number;
  is_official: boolean;
  is_published: boolean;
  uploader_id: number | null;
  download_count: number;
  view_count: number;
  rating: number;
  created_at: string;
}

export interface ModelListResponse {
  total: number;
  items: ModelResponse[];
}

export interface ModelUpdate {
  name?: string;
  description?: string;
  category?: string;
  material?: string;
  layer_height?: number;
  infill?: number;
  base_price?: number;
  is_published?: boolean;
}

// 获取公开模型列表
export const getModels = async (params?: {
  category?: string;
  official_only?: boolean;
  community_only?: boolean;
  search?: string;
  sort?: string;
  page?: number;
  page_size?: number;
}): Promise<ModelListResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.category) queryParams.append('category', params.category);
  if (params?.official_only) queryParams.append('official_only', 'true');
  if (params?.community_only) queryParams.append('community_only', 'true');
  if (params?.search) queryParams.append('search', params.search);
  if (params?.sort) queryParams.append('sort', params.sort);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.page_size) queryParams.append('page_size', params.page_size.toString());

  const response = await apiClient.get<ModelListResponse>(`/api/models?${queryParams.toString()}`);
  return response.data;
};

// 获取用户自己的模型
export const getMyModels = async (params?: {
  sort?: string;
  page?: number;
  page_size?: number;
}): Promise<ModelListResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.sort) queryParams.append('sort', params.sort);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.page_size) queryParams.append('page_size', params.page_size.toString());

  const response = await apiClient.get<ModelListResponse>(`/api/models/my?${queryParams.toString()}`);
  return response.data;
};

// 获取所有模型（管理员）
export const getAllModels = async (params?: {
  status?: string;
  search?: string;
  page?: number;
  page_size?: number;
}): Promise<ModelListResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.search) queryParams.append('search', params.search);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.page_size) queryParams.append('page_size', params.page_size.toString());

  const response = await apiClient.get<ModelListResponse>(`/api/models/all?${queryParams.toString()}`);
  return response.data;
};

// 获取模型详情
export const getModel = async (id: number): Promise<ModelResponse> => {
  const response = await apiClient.get<ModelResponse>(`/api/models/${id}`);
  return response.data;
};

// 上传模型
export const uploadModel = async (formData: FormData): Promise<ModelResponse> => {
  const response = await apiClient.post<ModelResponse>('/api/models', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// 更新模型
export const updateModel = async (id: number, data: ModelUpdate): Promise<ModelResponse> => {
  const response = await apiClient.put<ModelResponse>(`/api/models/${id}`, data);
  return response.data;
};

// 更新模型状态（管理员审核）
export const updateModelStatus = async (id: number, status: string): Promise<{ message: string; status: string }> => {
  const response = await apiClient.put<{ message: string; status: string }>(`/api/models/${id}/status`, { status });
  return response.data;
};

// 删除模型
export const deleteModel = async (id: number): Promise<{ message: string }> => {
  const response = await apiClient.delete<{ message: string }>(`/api/models/${id}`);
  return response.data;
};