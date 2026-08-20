import client from './client'
export interface MaterialData {
  id: number
  name_zh: string
  name_en: string
  price_per_gram: number
  density: number
  description: string | null
  pros: string | null
  cons: string | null
  icon: string | null
  is_active: boolean
  sort_order: number
}

export interface MaterialListResponse {
  total: number
  items: MaterialData[]
}

// 获取启用的材料列表（公开）
export async function getMaterials(): Promise<MaterialListResponse> {
  const { data } = await client.get<MaterialListResponse>('/api/materials')
  return data
}

// 获取所有材料（管理员）
export async function getAllMaterials(): Promise<MaterialListResponse> {
  const { data } = await client.get<MaterialListResponse>('/api/materials/all')
  return data
}

// 更新材料（管理员）
export async function updateMaterial(id: number, body: {
  name_zh?: string
  name_en?: string
  price_per_gram?: number
  density?: number
  is_active?: boolean
  description?: string
  pros?: string
  cons?: string
  icon?: string
}): Promise<MaterialData> {
  const { data } = await client.put<MaterialData>(`/api/materials/${id}`, body)
  return data
}

// 创建材料（管理员）
export async function createMaterial(body: {
  name_zh: string
  name_en: string
  price_per_gram: number
  density?: number
  description?: string
  pros?: string
  cons?: string
  icon?: string
  sort_order?: number
}): Promise<MaterialData> {
  const { data } = await client.post<MaterialData>('/api/materials', body)
  return data
}

// 删除材料（管理员）
export async function deleteMaterial(id: number): Promise<void> {
  await client.delete(`/api/materials/${id}`)
}
