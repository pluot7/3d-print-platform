import apiClient from './client';

// 余额信息
export interface BalanceResponse {
  balance: number;
  nova_coins: number;
}

// 充值请求
export interface RechargeRequest {
  amount: number;
  payment_method?: string;
}

// Nova豆折扣预览
export interface NovaDiscountResponse {
  nova_coins_owned: number;
  nova_coins_usable: number;
  discount_amount: number;
  final_amount: number;
}

// 获取余额和Nova豆
export const getBalance = async (): Promise<BalanceResponse> => {
  const response = await apiClient.get<BalanceResponse>('/api/wallet/balance');
  return response.data;
};

// 充值
export const recharge = async (amount: number, payment_method: string = 'alipay'): Promise<{ message: string; amount: number; balance: number }> => {
  const response = await apiClient.post<{ message: string; amount: number; balance: number }>('/api/wallet/recharge', { amount, payment_method });
  return response.data;
};

// 预览Nova豆折扣
export const calculateNovaDiscount = async (total_price: number): Promise<NovaDiscountResponse> => {
  const response = await apiClient.get<NovaDiscountResponse>(`/api/wallet/calculate-nova-discount?total_price=${total_price}`);
  return response.data;
};
