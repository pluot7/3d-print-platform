import apiClient from './client';

export interface CartItemResponse {
  id: number;
  user_id: number;
  model_id: number;
  material: string;
  color: string;
  layer_height: number;
  infill: number;
  quantity: number;
  scale: number;
  created_at: string | null;

  // 展平模型信息
  model_name: string | null;
  model_price: number | null;
  model_glb_path: string | null;
  model_weight: number | null;
  model_dimensions_x: number | null;
  model_dimensions_y: number | null;
  model_dimensions_z: number | null;
}

export interface CartItemListResponse {
  total: number;
  items: CartItemResponse[];
}

export interface CartItemCreateRequest {
  model_id: number;
  material?: string;
  color?: string;
  layer_height?: number;
  infill?: number;
  quantity?: number;
  scale?: number;
}

export interface CartItemUpdateRequest {
  quantity?: number;
  scale?: number;
  material?: string;
  color?: string;
  layer_height?: number;
}

// 获取购物车
export const getCartItems = async (): Promise<CartItemListResponse> => {
  const response = await apiClient.get<CartItemListResponse>('/api/cart');
  return response.data;
};

// 添加到购物车
export const addToCart = async (data: CartItemCreateRequest): Promise<CartItemResponse> => {
  const response = await apiClient.post<CartItemResponse>('/api/cart', data);
  return response.data;
};

// 更新购物车项目
export const updateCartItem = async (id: number, data: CartItemUpdateRequest): Promise<CartItemResponse> => {
  const response = await apiClient.put<CartItemResponse>(`/api/cart/${id}`, data);
  return response.data;
};

// 删除购物车项目
export const removeCartItem = async (id: number): Promise<void> => {
  await apiClient.delete(`/api/cart/${id}`);
};

// 清空购物车
export const clearCart = async (): Promise<void> => {
  await apiClient.delete('/api/cart');
};
