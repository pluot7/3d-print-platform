import apiClient from './client'

export interface AddressData {
  id: number
  user_id: number
  recipient_name: string
  recipient_phone: string
  province: string
  city: string
  district: string
  detail_address: string
  is_default: boolean
  created_at?: string
  updated_at?: string
}

export interface AddressCreateData {
  recipient_name: string
  recipient_phone: string
  province: string
  city: string
  district: string
  detail_address: string
  is_default?: boolean
}

export interface AddressUpdateData {
  recipient_name?: string
  recipient_phone?: string
  province?: string
  city?: string
  district?: string
  detail_address?: string
  is_default?: boolean
}

// 获取所有地址
export const getAddresses = async (): Promise<AddressData[]> => {
  const res = await apiClient.get('/api/addresses')
  return res.data
}

// 新增地址
export const createAddress = async (data: AddressCreateData): Promise<AddressData> => {
  const res = await apiClient.post('/api/addresses', data)
  return res.data
}

// 更新地址
export const updateAddress = async (id: number, data: AddressUpdateData): Promise<AddressData> => {
  const res = await apiClient.put(`/api/addresses/${id}`, data)
  return res.data
}

// 删除地址
export const deleteAddress = async (id: number): Promise<void> => {
  await apiClient.delete(`/api/addresses/${id}`)
}

// 设为默认地址
export const setDefaultAddress = async (id: number): Promise<AddressData> => {
  const res = await apiClient.put(`/api/addresses/${id}/default`)
  return res.data
}
