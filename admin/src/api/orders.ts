import apiClient from './client';

// 打印配置
export interface PrintConfig {
  material: string;
  color: string;
  layer_height: number;
  infill: number;
  quantity: number;
  scale?: number;  // 等比例缩放（可选，默认1.0）
}

// 创建订单请求
export interface OrderCreateRequest {
  model_id?: number;
  print_config: PrintConfig;
  recipient_name: string;
  recipient_phone: string;
  shipping_address: string;
  note?: string;
  use_balance?: boolean;  // 是否优先使用余额支付
  use_nova?: boolean;     // 是否使用Nova豆折扣
}

// 订单响应
export interface OrderResponse {
  id: number;
  order_no: string;
  status: string;
  model_id: number | null;
  model_name: string | null;
  note: string | null;
  print_config: Record<string, any> | null;
  model_price: number;
  material_fee: number;
  shipping_fee: number;
  total_price: number;
  recipient_name: string;
  recipient_phone: string;
  shipping_address: string;
  payment_method: string | null;
  tracking_no: string | null;
  nova_coins_used: number | null;
  nova_discount: number | null;
  balance_paid: number | null;
  created_at: string | null;
  paid_at: string | null;
  shipped_at: string | null;
}

// 价格计算请求
export interface PriceCalculateRequest {
  model_id?: number;
  file_size?: number;
  dimensions_x?: number;
  dimensions_y?: number;
  dimensions_z?: number;
  material: string;
  layer_height: number;
  infill: number;
  quantity: number;
  scale?: number;  // 等比例缩放
}

// 价格响应
export interface PriceResponse {
  model_price: number;
  material_fee: number;
  shipping_fee: number;
  total_price: number;
}

// 计算价格
export const calculatePrice = async (data: PriceCalculateRequest): Promise<PriceResponse> => {
  const response = await apiClient.post<PriceResponse>('/api/orders/calculate-price', data);
  return response.data;
};

// 创建订单
export const createOrder = async (data: OrderCreateRequest): Promise<OrderResponse> => {
  const response = await apiClient.post<OrderResponse>('/api/orders', data);
  return response.data;
};

// 获取用户自己的订单
export const getMyOrders = async (params?: {
  status?: string;
  page?: number;
  page_size?: number;
}): Promise<OrderResponse[]> => {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.page_size) queryParams.append('page_size', params.page_size.toString());

  const response = await apiClient.get<OrderResponse[]>(`/api/orders/my?${queryParams.toString()}`);
  return response.data;
};

// 获取所有订单（管理员）
export interface OrderListResponse {
  total: number
  items: OrderResponse[]
}

export const getAllOrders = async (params?: {
  status?: string;
  search?: string;
  page?: number;
  page_size?: number;
}): Promise<OrderListResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.search) queryParams.append('search', params.search);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.page_size) queryParams.append('page_size', params.page_size.toString());

  const response = await apiClient.get<OrderListResponse>(`/api/orders/all?${queryParams.toString()}`);
  return response.data;
};

// 获取订单详情
export const getOrder = async (id: number): Promise<OrderResponse> => {
  const response = await apiClient.get<OrderResponse>(`/api/orders/${id}`);
  return response.data;
};

// 更新订单状态（管理员）
export const updateOrderStatus = async (id: number, status: string, tracking_no?: string): Promise<{ message: string; status: string }> => {
  const body: any = { status };
  if (tracking_no) body.tracking_no = tracking_no;
  const response = await apiClient.put<{ message: string; status: string }>(`/api/orders/${id}/status`, body);
  return response.data;
};

// 取消订单（用户）
export const cancelOrder = async (id: number): Promise<{ message: string }> => {
  const response = await apiClient.put<{ message: string }>(`/api/orders/${id}/cancel`);
  return response.data;
};

// 删除订单（用户）
export const deleteOrder = async (id: number): Promise<{ message: string }> => {
  const response = await apiClient.delete<{ message: string }>(`/api/orders/${id}`);
  return response.data;
};

// ======= 支付 API =======

export interface PayOrderRequest {
  method: 'balance' | 'wechat' | 'alipay';
  use_nova?: boolean;
  nova_coins_override?: number;
}

export interface PayOrderResponse {
  order_id: number;
  order_no: string;
  method: string;
  total_price: number;
  nova_discount: number;
  balance_paid: number;
  remaining: number;
  status: string;  // paid / partial / pending_online
  message: string;
  qr_data?: string;
}

// 支付订单
export const payOrder = async (id: number, data: PayOrderRequest): Promise<PayOrderResponse> => {
  const response = await apiClient.post<PayOrderResponse>(`/api/orders/${id}/pay`, data);
  return response.data;
};

// 模拟确认支付（扫码完成）
export const confirmPayment = async (id: number): Promise<{ message: string; status: string; paid_at: string; transaction_id: string }> => {
  const response = await apiClient.post(`/api/orders/${id}/confirm-pay`);
  return response.data;
};

// 查询支付状态
export const getPaymentStatus = async (id: number): Promise<{
  order_id: number;
  order_no: string;
  status: string;
  total_price: number;
  payment_method: string | null;
  paid_at: string | null;
  nova_coins_used: number | null;
  nova_discount: number | null;
  balance_paid: number | null;
}> => {
  const response = await apiClient.get(`/api/orders/${id}/payment-status`);
  return response.data;
};