// 收藏 API

const API_BASE = '/api'

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('3dprint_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export interface FavoriteModelBrief {
  id: number
  name: string
  category?: string | null
  image_url?: string | null
  glb_path?: string | null
  price?: number | null
  status?: string | null
}

export interface FavoriteItem {
  id: number
  model: FavoriteModelBrief
  created_at: string
}

export interface FavoriteListResponse {
  total: number
  items: FavoriteItem[]
}

// 获取收藏列表
export async function getFavorites(page = 1, sort?: string): Promise<FavoriteListResponse> {
  let url = `${API_BASE}/favorites?page=${page}&page_size=20`
  if (sort) url += `&sort=${sort}`
  const res = await fetch(url, { headers: getAuthHeaders() })
  if (!res.ok) throw new Error('获取收藏列表失败')
  return res.json()
}

// 收藏模型
export async function addFavorite(modelId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/favorites/${modelId}`, {
    method: 'POST',
    headers: getAuthHeaders(),
  })
  if (!res.ok) throw new Error('收藏失败')
}

// 取消收藏
export async function removeFavorite(modelId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/favorites/${modelId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
  if (!res.ok) throw new Error('取消收藏失败')
}

// 检查是否已收藏
export async function checkFavorite(modelId: number): Promise<boolean> {
  const res = await fetch(`${API_BASE}/favorites/check/${modelId}`, { headers: getAuthHeaders() })
  if (!res.ok) return false
  const data = await res.json()
  return data.favorited
}

// === 分享相关 ===

export interface MutualFollowInfo {
  is_mutual: boolean
  i_follow: boolean
  they_follow: boolean
}

/** 检查当前登录用户与目标用户是否互相关注 */
export async function checkMutualFollow(userId: number): Promise<MutualFollowInfo> {
  const res = await fetch(`${API_BASE}/users/${userId}/mutual-follow`, { headers: getAuthHeaders() })
  if (!res.ok) throw new Error('检查关注关系失败')
  return res.json()
}

/** 获取模型上传者的用户 ID */
export async function getModelUploader(modelId: number): Promise<number> {
  const res = await fetch(`${API_BASE}/models/${modelId}`, { headers: getAuthHeaders() })
  if (!res.ok) throw new Error('获取模型信息失败')
  const data = await res.json()
  return data.uploader_id
}
